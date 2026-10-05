"use client";

import { useEffect, useRef, useState } from "react";
import { catalogoParaAviso, enlaceAviso, mensajeYaLlego, resumenEspera } from "@/lib/avisos";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { textoDeVariante } from "@/lib/inventario-catalogo";
import { formatearTelefono } from "@/lib/telefono";
import type { AvisoLlegada, Producto } from "@/lib/types";
import { IconoCheck, IconoPersona, IconoWhatsApp } from "../iconos";
import { Avatar, Aviso, Boton, Etiqueta, Tarjeta, useToastUI } from "../ui";

/** "18095550142" → "+18095550142" (como lo entiende formatearTelefono). */
const conMas = (t: string) => (t.startsWith("+") ? t : `+${t}`);

type EstadoFila = "abriendo" | "marcando" | "avisado" | "fallo";

/**
 * "Ya llegó" (tablero Producto «Inventario»): una fila por persona que espera, con "Avisar" (abre WhatsApp con el mensaje y
 * el enlace al producto). `modo`: "llego" al reponer; "espera" desde "N esperan" (la lista de espera).
 * - Solo se ofrece "Avisar" si ESA variante (o el producto) tiene stock: reponer M · Negro no avisa a quien espera S · Blanco.
 * - Se marca como avisado al VOLVER de WhatsApp (abrirlo no prueba que se envió: por eso dice "Avisado", nunca "Entregado").
 *   Si WhatsApp no se abrió, no se marca nada. Si marcar falla, la fila queda pendiente con "Reintentar", que solo vuelve a
 *   marcar (no reabre WhatsApp).
 * - Sin enlace del catálogo publicado, lo dice: el mensaje va sin enlace (nunca uno inventado).
 */
export function TarjetaYaLlego(props: { producto: Producto; avisos: AvisoLlegada[]; modo?: "llego" | "espera" }) {
  const { getProducto } = useData();
  const { tiendaId } = useTiendaActiva();
  const actual = useConsulta(`producto-avisos:${tiendaId}:${props.producto.id}`, () => getProducto(tiendaId, props.producto.id), true);
  if (actual.error) return <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: actual.reintentar }}>No pudimos comprobar las existencias. Reintenta la lectura antes de avisar.</Aviso>;
  if (!actual.data && actual.cargando) return <p role="status" className="py-3 text-texto-secundario">Comprobando las existencias…</p>;
  if (!actual.data) return <Aviso>Este producto ya no está en tu tienda.</Aviso>;
  return <ContenidoYaLlego {...props} producto={actual.data} />;
}

function ContenidoYaLlego({ producto, avisos, modo = "llego" }: { producto: Producto; avisos: AvisoLlegada[]; modo?: "llego" | "espera" }) {
  const { marcarAvisado } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { mostrarToast } = useToastUI();
  const [estados, setEstados] = useState<Map<string, EstadoFila>>(new Map());
  const [enCamino, setEnCamino] = useState<string | null>(null);
  const marcando = useRef(new Set<string>());
  const poner = (id: string, e: EstadoFila | null) =>
    setEstados((m) => {
      const n = new Map(m);
      if (e) n.set(id, e);
      else n.delete(id);
      return n;
    });

  const marcar = async (id: string) => {
    if (marcando.current.has(id)) return;
    marcando.current.add(id);
    poner(id, "marcando");
    try {
      await marcarAvisado(tiendaId, [id]);
      poner(id, "avisado");
    } catch (e) {
      poner(id, "fallo");
      mostrarToast(mensajeDeError(e, "No pudimos marcarlo como avisado. Toca Reintentar."));
    } finally { marcando.current.delete(id); }
  };
  const marcarRef = useRef(marcar);
  useEffect(() => {
    marcarRef.current = marcar;
  });

  // Al volver de WhatsApp (la pestaña vuelve a verse o recupera el foco), se marca como avisado.
  useEffect(() => {
    if (!enCamino) return;
    let marcada = false;
    const volver = () => {
      if (marcada || document.visibilityState !== "visible") return;
      marcada = true;
      setEnCamino(null);
      void marcarRef.current(enCamino);
    };

    window.addEventListener("focus", volver);
    document.addEventListener("visibilitychange", volver);
    return () => {
  
      window.removeEventListener("focus", volver);
      document.removeEventListener("visibilitychange", volver);
    };
  }, [enCamino]);

  const variantes = new Set(avisos.map((a) => a.varianteId));
  const unaVariante = variantes.size === 1 ? [...variantes][0] : null;
  const varianteDe = (id: string | null) => {
    const v = id ? producto.variantes?.find((x) => x.id === id) : undefined;
    return v ? textoDeVariante(producto.opciones, v.valores) : null;
  };
  const hayDe = (varianteId: string | null) => {
    if (!producto.activo) return false;
    const stock = varianteId ? producto.variantes?.find((v) => v.id === varianteId && v.activa)?.stock : producto.stock;
    return stock === null || (stock ?? 0) > 0;
  };
  const que = unaVariante ? `${producto.nombre} ${varianteDe(unaVariante)}` : producto.nombre;
  const n = resumenEspera(avisos, tiendaId).personas;
  const urlCatalogo = catalogoParaAviso(tienda?.urlCatalogo ?? null);

  const avisar = (a: AvisoLlegada) => {
    const texto = mensajeYaLlego({ nombre: a.nombre, producto: producto.nombre, variante: varianteDe(a.varianteId), urlCatalogo, slug: producto.slug });
    // Sin "noopener" en las opciones para poder saber si se abrió (con él window.open siempre da null); se corta igual.
    const ventana = window.open(enlaceAviso(a.telefono, texto), "_blank");
    if (!ventana) {
      mostrarToast("No se pudo abrir WhatsApp. Inténtalo otra vez.");
      return;
    }
    ventana.opener = null;
    poner(a.id, "abriendo");
    setEnCamino(a.id);
  };

  return (
    <Tarjeta>
      <p className="font-mano text-mano text-atencion-texto">{modo === "llego" ? "Ya llegó" : "Lista de espera"}</p>
      <p className="mt-1 font-display text-titulo-seccion text-texto">
        {modo === "llego" ? `Repusiste ${que}. ` : ""}
        {n === 1 ? `1 persona espera ${modo === "llego" ? "" : que}`.trim() + "." : `${n} personas esperan${modo === "llego" ? "" : ` ${que}`}.`}
      </p>
      {!urlCatalogo && (
        <p className="mt-2 text-secundario text-texto-secundario">Tu catálogo todavía no tiene enlace publicado: el mensaje va sin el enlace al producto.</p>
      )}
      <ul className="mt-3 flex flex-col">
        {avisos.map((a) => {
          const estado = a.avisadoEn ? "avisado" : estados.get(a.id);
          const hay = hayDe(a.varianteId);
          const telefono = formatearTelefono(conMas(a.telefono));
          return (
            <li key={a.id} className="flex min-h-15 items-center gap-3 border-t border-linea py-2 first:border-t-0">
              {a.nombre ? (
                <Avatar nombre={a.nombre} />
              ) : (
                <span aria-hidden="true" className="grid size-(--alto-avatar) shrink-0 place-items-center rounded-full bg-superficie-hundida text-texto-secundario">
                  <IconoPersona tamano={20} strokeWidth={2.2} />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-destacado text-texto">{a.nombre ?? telefono}</span>
                <span className="truncate text-secundario text-texto-secundario">
                  {a.nombre ? telefono : "Sin nombre"}
                  {!unaVariante && varianteDe(a.varianteId) ? ` · ${varianteDe(a.varianteId)}` : ""}
                </span>
              </span>
              {estado === "avisado" ? (
                <Etiqueta tono="exito" icono={<IconoCheck tamano={14} strokeWidth={3} />}>
                  Avisado
                </Etiqueta>
              ) : estado === "fallo" || estado === "marcando" ? (
                <Boton jerarquia="secundario" tamano="compacto" cargando={estado === "marcando"} onClick={() => void marcar(a.id)} aria-label={`Reintentar marcar como avisado a ${a.nombre ?? telefono}`}>
                  {estado === "marcando" ? "Marcando" : "Reintentar"}
                </Boton>
              ) : !hay ? (
                <Etiqueta>{!producto.activo ? "Oculto del catálogo" : "Sigue agotado"}</Etiqueta>
              ) : (
                <Boton jerarquia="secundario" tamano="compacto" icono={<IconoWhatsApp tamano={18} />} deshabilitado={enCamino !== null || estado === "abriendo"} onClick={() => avisar(a)}>
                  Avisar
                </Boton>
              )}
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}
