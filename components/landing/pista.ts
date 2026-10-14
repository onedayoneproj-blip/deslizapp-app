// Ventanas de animación de la landing. Cada elemento animado recibe aquí sus variables CSS (--ea/--eb: cuándo entra;
// --sa/--sb: cuándo sale; --x0/--y0/--s0: desde dónde entra; --x1/--y1/--s1: hacia dónde sale). El CSS
// (components/landing/landing.css, clases .pista, .mueve, .presiona) las combina con --p, el progreso que escribe el scroll.
// Así React pinta una vez y el scroll solo cambia una variable.

import type { CSSProperties } from "react";

type Ventana = readonly [number, number];

export type Pista = {
  entra?: Ventana;
  sale?: Ventana;
  x0?: string;
  y0?: string;
  s0?: number;
  x1?: string;
  y1?: string;
  s1?: number;
};

export function pista({ entra, sale, x0, y0, s0, x1, y1, s1 }: Pista, extra?: CSSProperties): CSSProperties {
  const v: Record<string, string | number> = {};
  if (entra) [v["--ea"], v["--eb"]] = entra;
  if (sale) [v["--sa"], v["--sb"]] = sale;
  if (x0) v["--x0"] = x0;
  if (y0) v["--y0"] = y0;
  if (s0 !== undefined) v["--s0"] = s0;
  if (x1) v["--x1"] = x1;
  if (y1) v["--y1"] = y1;
  if (s1 !== undefined) v["--s1"] = s1;
  return { ...v, ...extra } as CSSProperties;
}

/** Visible solo entre dos instantes (para textos y números que se reemplazan): aparece y desaparece rápido. */
export function entre(desde: number, hasta: number, borde = 0.04): CSSProperties {
  return pista({ entra: [desde - borde, desde], sale: [hasta, hasta + borde] });
}
