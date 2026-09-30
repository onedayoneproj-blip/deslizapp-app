"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NOTAS_MAX } from "@/lib/data/tiendas";
import { enlaceCatalogo } from "@/lib/enlace-catalogo";
import type { Tienda } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoEnlaceExterno } from "../iconos";

/**
 * Revisión del catálogo (estado "revisar"): ver la vista previa, publicarlo (RPC `publicar_catalogo`) o pedir cambios (RPC
 * `pedir_cambios_catalogo`, notas de 1 a 500 caracteres). Es "grande" porque tiene un campo de texto (HANDOFF.md).
 */
export function HojaRevisarCatalogo({
  abierta,
  alCerrar,
  tienda,
  alPublicar,
  alPedirCambios,
}: {
  abierta: boolean;
  alCerrar: () => void;
  tienda: Pick<Tienda, "urlCatalogo">;
  alPublicar: () => Promise<void>;
  alPedirCambios: (notas: string) => Promise<void>;
}) {
  const enlace = enlaceCatalogo(tienda.urlCatalogo);
  const [pidiendo, setPidiendo] = useState(false);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);

  const correr = async (accion: () => Promise<void>) => {
    if (enviando) return;
    setEnviando(true);
    try {
      await accion();
    } finally {
      setEnviando(false);
    }
  };
  // El foco va al campo en el MISMO toque que lo muestra: así el teclado del iPhone abre bien (HANDOFF.md).
  const abrirNotas = () => {
    flushSync(() => setPidiendo(true));
    campo.current?.focus({ preventScroll: true });
  };
  const listas = notas.trim().length > 0 && notas.length <= NOTAS_MAX;

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Revisa tu catálogo" altura="grande">
      <div className="flex flex-col gap-3">
        {enlace ? (
          <a
            href={enlace.href}
            target="_blank"
            rel="noopener noreferrer"
            className="tocable flex min-h-14 items-center gap-3 rounded-[20px] border border-linea bg-white px-4 py-2.5 text-bosque"
          >
            <span className="min-w-0 grow">
              <span className="block text-[12px] font-bold tracking-wider text-suave uppercase">Vista previa</span>
              <span className="block truncate text-[15px]">
                <b>{enlace.dominio}</b>
                <span className="text-suave">{enlace.resto}</span>
              </span>
            </span>
            <IconoEnlaceExterno tamano={20} className="shrink-0" />
          </a>
        ) : (
          <p className="rounded-[18px] bg-mandarina/20 px-4 py-3 text-[14px] font-semibold">
            Todavía no tenemos el enlace de tu catálogo, así que no se puede publicar. Escríbenos y lo conectamos.
          </p>
        )}

        <button
          type="button"
          onClick={() => correr(alPublicar)}
          disabled={enviando || !enlace}
          className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
        >
          Publicar mi catálogo
        </button>

        {!pidiendo && (
          <button
            type="button"
            onClick={abrirNotas}
            disabled={enviando}
            className="tocable flex h-12 items-center justify-center rounded-full border-[1.5px] border-bosque bg-white text-[15px] font-extrabold text-bosque"
          >
            Pedir cambios
          </button>
        )}
        {pidiendo && (
          <div className="flex flex-col gap-2 rounded-[20px] border border-linea bg-white p-3.5">
            <label className="flex flex-col gap-1.5 text-[13.5px] font-bold">
              ¿Qué quieres cambiar?
              <textarea
                ref={campo}
                value={notas}
                onChange={(e) => setNotas(e.target.value.slice(0, NOTAS_MAX))}
                rows={4}
                maxLength={NOTAS_MAX}
                placeholder="Ej: cambia la foto de portada y sube el precio de Kiara."
                className="w-full min-w-0 resize-none rounded-2xl border-[1.5px] border-borde bg-white p-3 text-base font-normal text-bosque outline-none focus:border-bosque"
              />
              <span className="self-end text-[12px] font-semibold text-suave" aria-live="polite">
                {notas.length}/{NOTAS_MAX}
              </span>
            </label>
            <button
              type="button"
              onClick={() => correr(() => alPedirCambios(notas))}
              disabled={enviando || !listas}
              className="tocable h-12 rounded-full bg-bosque text-[15px] font-extrabold text-papel disabled:opacity-50"
            >
              Enviar cambios
            </button>
            <button type="button" onClick={() => setPidiendo(false)} disabled={enviando} className="tocable h-11 text-[14px] font-extrabold text-bosque">
              Mejor no
            </button>
          </div>
        )}
      </div>
    </Hoja>
  );
}
