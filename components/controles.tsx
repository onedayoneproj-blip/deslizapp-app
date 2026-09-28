"use client";

import type { ReactNode } from "react";

/** Chip seleccionable (filtros, colecciones): verde lleno si está elegido, blanco con borde si no. */
export function Chip({
  elegido,
  onClick,
  children,
  alto = 38,
}: {
  elegido: boolean;
  onClick: () => void;
  children: ReactNode;
  alto?: 38 | 40;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={elegido}
      style={{ height: alto }}
      className={`shrink-0 rounded-full border-[1.5px] px-3.5 text-sm font-bold whitespace-nowrap transition-colors ${
        elegido ? "border-bosque bg-bosque text-papel" : "border-borde bg-white text-bosque"
      }`}
    >
      {children}
    </button>
  );
}

/** Interruptor (switch) de 54×32 como el del prototipo. */
export function Interruptor({
  encendido,
  alCambiar,
  etiqueta,
  deshabilitado = false,
  alTocarBloqueado,
}: {
  encendido: boolean;
  alCambiar: (valor: boolean) => void;
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
      className={`flex h-8 w-[54px] shrink-0 rounded-full p-1 transition-colors ${
        deshabilitado ? "bg-[#d9cdb8]" : encendido ? "bg-bosque" : "bg-apagado"
      } ${encendido ? "justify-end" : "justify-start"}`}
    >
      <span className="h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]" />
    </button>
  );
}
