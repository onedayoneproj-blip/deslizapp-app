"use client";

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
}: {
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
