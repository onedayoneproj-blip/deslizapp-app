"use client";

import type { ReactNode } from "react";
import { IconoCheck, IconoMas } from "../iconos";
import { clases, FOCO } from "./comunes";

/**
 * Cosa elegible (docs/09 §16.5): un rectángulo de esquinas poco redondeadas (`radio-m`, no píldora) para elegir "qué cambia de una a
 * otra" (Color, Tamaño). Alto 52. Sin elegir: `superficie-hundida` con «+» a la derecha. Elegida: `accion` con letra `sobre-accion` y
 * check. Apagada (ya hay dos): 40 %, sin toque. Se cambia al instante, sin animar. Va en una cuadrícula de dos columnas.
 * Los valores de esa cosa (Dorado, Grande) NO usan esto: son `Opcion` (píldora menta).
 */
export function CosaElegible({ elegida, deshabilitada = false, onClick, children }: { elegida: boolean; deshabilitada?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={elegida}
      disabled={deshabilitada}
      onClick={onClick}
      className={clases(
        "tocable flex h-13 min-w-0 items-center justify-between gap-2 rounded-radio-m px-3.5 text-cuerpo font-extrabold disabled:opacity-40",
        FOCO,
        elegida ? "bg-accion text-sobre-accion" : "bg-superficie-hundida text-texto",
      )}
    >
      <span className="truncate">{children}</span>
      {elegida ? <IconoCheck tamano={18} strokeWidth={3.2} /> : <IconoMas tamano={18} strokeWidth={2.6} />}
    </button>
  );
}
