"use client";

import { useId } from "react";
import { clases, FOCO } from "./comunes";

/**
 * Interruptor (docs/09 §6): enciende o apaga algo (Visible en el catálogo, Por encargo). 54×32, perilla que se desliza con
 * transform; encendido = `accion`, apagado = `borde-campo`. Área de toque de 44 px. Deshabilitado al 40 %: si lo tocan así,
 * `alTocarBloqueado` puede explicar por qué (mejor que apagarlo sin decir nada).
 */
export function Interruptor({
  encendido,
  alCambiar,
  etiqueta,
  deshabilitado = false,
  alTocarBloqueado,
  id,
}: {
  id?: string;
  encendido: boolean;
  alCambiar: (valor: boolean) => void;
  /** Nombre accesible ("Visible en el catálogo"). */
  etiqueta: string;
  deshabilitado?: boolean;
  /** Qué pasa si lo tocan bloqueado (ej. avisar por qué). */
  alTocarBloqueado?: () => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      aria-disabled={deshabilitado}
      onClick={() => (deshabilitado ? alTocarBloqueado?.() : alCambiar(!encendido))}
      className={clases(
        "tocable relative flex h-8 w-[54px] shrink-0 rounded-full p-1 before:absolute before:-inset-x-1 before:-inset-y-[6px] before:content-['']",
        FOCO,
        encendido ? "bg-accion" : "bg-borde-campo",
        deshabilitado && "opacity-40",
      )}
    >
      <span
        className="h-6 w-6 rounded-full bg-superficie ring-1 ring-linea transition-transform duration-(--mov-normal) ease-(--curva-salida)"
        style={{ transform: encendido ? "translateX(22px)" : "none" }}
      />
    </button>
  );
}

/**
 * Fila con interruptor (crear producto, prototipo v4: «Es por encargo, no llevo stock»): una fila blanca de 52 px, `radio-m`,
 * contorno `linea`, con el texto en `cuerpo` extra negrita a la izquierda y el `Interruptor` a la derecha. Toda la fila prende y
 * apaga (el texto es la etiqueta del interruptor).
 */
export function FilaInterruptor({ texto, detalle, encendido, alCambiar }: { texto: string; detalle?: string; encendido: boolean; alCambiar: (valor: boolean) => void }) {
  const id = useId();
  return (
    <div className={clases("flex items-center gap-2.5 rounded-radio-m border border-linea bg-superficie pr-3 pl-3.5", detalle ? "h-14" : "h-13")} data-fila-interruptor="">
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-col text-cuerpo font-extrabold text-texto">
        {texto}
        {detalle && <span className="text-[0.8125rem] leading-4 font-normal text-texto-secundario">{detalle}</span>}
      </label>
      <Interruptor id={id} encendido={encendido} alCambiar={alCambiar} etiqueta={texto} />
    </div>
  );
}
