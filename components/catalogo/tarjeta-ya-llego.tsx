"use client";

import { useEffect, useRef, useState } from "react";
import { enlaceAviso, mensajeYaLlego } from "@/lib/avisos";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { textoDeVariante } from "@/lib/inventario-catalogo";
import { formatearTelefono } from "@/lib/telefono";
import type { AvisoLlegada, Producto } from "@/lib/types";
import { IconoCheck, IconoPersona, IconoWhatsApp } from "../iconos";
import { Avatar, Boton, Etiqueta, Tarjeta, useToastUI } from "../ui";

/** "18095550142" → "+18095550142" (como lo entiende formatearTelefono). */
const conMas = (t: string) => (t.startsWith("+") ? t : `+${t}`);

/**
 * "Ya llegó" (tablero Producto «Inventario»): al reponer algo que alguien esperaba, una fila por persona con "Avisar" (abre
 * WhatsApp con el mensaje y el enlace al producto). Al volver de WhatsApp la fila pasa a "Avisado" y se marca en la base.
 */
export function TarjetaYaLlego({ producto, avisos }: { producto: Producto; avisos: AvisoLlegada[] }) {
  const { marcarAvisado } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { mostrarToast } = useToastUI();
  const [avisados, setAvisados] = useState<Set<string>>(new Set());
  const [enCamino, setEnCamino] = useState<string | null>(null);
  const marcando = useRef(false);

  // Al volver de WhatsApp (la pestaña vuelve a verse o recupera el foco), la fila queda como avisada.
  useEffect(() => {
    if (!enCamino) return;
    const volver = () => {
      if (document.visibilityState !== "visible") return;
      setAvisados((s) => new Set(s).add(enCamino));
      setEnCamino(null);
    };
    const tiempo = window.setTimeout(volver, 1500);
    window.addEventListener("focus", volver);
    document.addEventListener("visibilitychange", volver);
    return () => {
      window.clearTimeout(tiempo);
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
  const que = unaVariante ? `${producto.nombre} ${varianteDe(unaVariante)}` : producto.nombre;
  const n = avisos.length;

  const avisar = async (a: AvisoLlegada) => {
    const texto = mensajeYaLlego({ nombre: a.nombre, producto: producto.nombre, variante: varianteDe(a.varianteId), urlCatalogo: tienda?.urlCatalogo ?? null, slug: producto.slug });
    window.open(enlaceAviso(a.telefono, texto), "_blank", "noopener,noreferrer");
    setEnCamino(a.id);
    if (marcando.current) return;
    marcando.current = true;
    try {
      await marcarAvisado(tiendaId, [a.id]);
    } catch (e) {
      mostrarToast(mensajeDeError(e, "No pudimos marcarlo como avisado. Inténtalo otra vez."));
      setEnCamino(null);
    } finally {
      marcando.current = false;
    }
  };

  return (
    <Tarjeta>
      <p className="font-mano text-mano text-atencion-texto">Ya llegó</p>
      <p className="mt-1 font-display text-titulo-seccion text-texto">
        Repusiste {que}. {n === 1 ? "1 persona lo espera." : `${n} personas lo esperan.`}
      </p>
      <ul className="mt-3 flex flex-col">
        {avisos.map((a) => {
          const listo = avisados.has(a.id);
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
              {listo ? (
                <Etiqueta tono="exito" icono={<IconoCheck tamano={14} strokeWidth={3} />}>
                  Avisado
                </Etiqueta>
              ) : (
                <Boton jerarquia="secundario" tamano="compacto" icono={<IconoWhatsApp tamano={18} />} deshabilitado={enCamino === a.id} onClick={() => void avisar(a)}>
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
