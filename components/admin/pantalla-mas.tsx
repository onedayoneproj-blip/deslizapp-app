"use client";

import { useCallback, useEffect, useState } from "react";
import type { EnlaceTiendaNueva } from "@/lib/admin/tipos";
import { useAdmin } from "@/lib/data/admin/provider";
import { textoVence, urlUnirse } from "@/lib/equipo";
import { Boton, Campo, Etiqueta, Tarjeta } from "@/components/ui";
import { EstadoAdmin } from "./estado";

const ESTADO: Record<EnlaceTiendaNueva["estado"], { texto: string; tono: "neutro" | "exito" | "atencion" }> = {
  activo: { texto: "Sin abrir", tono: "atencion" },
  aprobado: { texto: "Abierto, sin tienda", tono: "atencion" },
  usado: { texto: "Tienda creada", tono: "exito" },
  cancelado: { texto: "Cancelado", tono: "neutro" },
  vencido: { texto: "Venció", tono: "neutro" },
};

const fecha = (v: string) => new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", day: "numeric", month: "short" }).format(new Date(v));

/** Más: por ahora, Invitaciones (enlaces de tienda nueva). Lo demás de Más sigue en preparación. */
export function PantallaMas() {
  return (
    <>
      <h1 className="font-display text-titulo-pantalla font-bold text-bosque">Más</h1>
      <Invitaciones />
      <Tarjeta className="mt-6 p-5">
        <p className="font-display text-destacado font-bold">Muy pronto</p>
        <p className="mt-1 text-texto-secundario">Planes, funciones nuevas, novedades, salud, registro y quién entra al admin.</p>
      </Tarjeta>
    </>
  );
}

function Invitaciones() {
  const fuente = useAdmin();
  const [lista, setLista] = useState<EnlaceTiendaNueva[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const leer = useCallback(async () => {
    setError(null);
    try {
      setLista(await fuente.enlacesTiendaNueva());
    } catch {
      setError("No pudimos cargar las invitaciones.");
    }
  }, [fuente]);
  useEffect(() => {
    const id = window.setTimeout(() => void leer(), 0);
    return () => window.clearTimeout(id);
  }, [leer]);

  const crear = async () => {
    setAviso(null);
    try {
      setCodigo(await fuente.crearEnlaceTiendaNueva(nota.trim() || null));
      setNota("");
      await leer();
    } catch {
      setAviso("No se pudo crear el enlace. Revisa la nota (hasta 40 letras) e inténtalo otra vez.");
    }
  };
  const cancelar = async (id: string) => {
    setAviso(null);
    try {
      await fuente.cancelarEnlaceTienda(id);
      await leer();
    } catch {
      setAviso("Ese enlace ya no se puede cancelar.");
      await leer();
    }
  };
  const url = codigo ? urlUnirse(window.location.origin, codigo) : null;
  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Enlace copiado.");
    } catch {
      setAviso("No se pudo copiar. Mantén presionado el enlace para copiarlo.");
    }
  };
  const compartir = async () => {
    if (!url) return;
    const texto = `Te invito a abrir tu tienda en Deslizapp. Entra con tu cuenta de Google desde este enlace (sirve una vez): ${url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: texto });
      } catch {
        // Cerró el menú de compartir.
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section aria-labelledby="mas-invitaciones" className="mt-4" data-invitaciones="">
      <h2 id="mas-invitaciones" className="font-display text-titulo-hoja font-bold text-bosque">Invitaciones</h2>
      <p className="mt-1 text-texto-secundario">Mientras sea beta, una tienda nueva se abre solo con un enlace tuyo. Sirve una vez y vence en 7 días.</p>
      <Tarjeta className="mt-3 flex flex-col gap-3 p-4">
        <Campo etiqueta="Para quién (opcional)" placeholder="Para Rosa" value={nota} maxLength={40} enterKeyHint="done" onChange={(e) => setNota(e.target.value)} />
        <Boton onClick={crear}>Crear enlace de tienda</Boton>
      </Tarjeta>
      {url && (
        <Tarjeta className="mt-3 border-2 border-accion p-4" data-enlace-tienda-nuevo="">
          <p className="font-bold">Tu enlace está listo. Se muestra solo esta vez.</p>
          <p className="mt-2 rounded-radio-m bg-superficie-hundida px-3 py-2 text-secundario break-all select-all">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Boton tamano="compacto" onClick={compartir}>Compartir</Boton>
            <Boton tamano="compacto" jerarquia="secundario" onClick={copiar}>Copiar</Boton>
            <Boton tamano="compacto" jerarquia="terciario" onClick={() => setCodigo(null)}>Listo</Boton>
          </div>
        </Tarjeta>
      )}
      {aviso && <p role="status" className="mt-2 text-secundario font-bold">{aviso}</p>}
      <div className="mt-3"><EstadoAdmin cargando={!lista && !error} error={error} reintentar={() => void leer()} /></div>
      {lista && lista.length === 0 && <p className="mt-3 text-texto-secundario">Todavía no creaste enlaces.</p>}
      {lista && lista.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {lista.map((l) => (
            <li key={l.id}>
              <Tarjeta className="p-3.5" data-enlace-tienda={l.estado}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold">{l.nota ?? "Sin nota"}</span>
                  <Etiqueta tono={ESTADO[l.estado].tono}>{ESTADO[l.estado].texto}</Etiqueta>
                </div>
                <p className="mt-1 text-secundario text-texto-secundario">
                  Creado el {fecha(l.creadoEn)}
                  {l.estado === "activo" ? ` · ${textoVence(l.venceEn)}` : ""}
                  {l.correo ? ` · lo abrió ${l.nombre ? `${l.nombre} (${l.correo})` : l.correo}` : ""}
                  {l.tiendaCreada ? ` · ${l.tiendaCreada}` : ""}
                </p>
                {l.estado === "activo" && (
                  <Boton className="mt-1 -ml-2" jerarquia="terciario" tono="peligro" tamano="compacto" onClick={() => cancelar(l.id)}>Cancelar</Boton>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
