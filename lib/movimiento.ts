// Sistema de movimiento: la misma fuente de verdad que los tokens de app/globals.css
// (--mov-*, --curva-*, --desplazar-*). Reglas en docs/08-movimiento.md.
//
// Aquí solo va lo que se usa desde JS (hojas, barra, números).
// Si cambias un valor, cámbialo también en globals.css.

export const DURACION = {
  /** Excepción aprobada: luz de Tu próxima jugada; no afecta a hojas ni formularios. */
  jugadaPulso: 520,
  jugadaTransicion: 480,
  /** Arco de dona al aparecer (referencias/donas). */
  dona: 1000,
  /** Toques, cambios de color, salidas. */
  rapida: 150,
  /** Casi todo: aparecer, deslizar indicadores, números. */
  normal: 250,
  /** Entradas de pantalla y hojas. */
  entrada: 350,
} as const;

export const CURVA = {
  /** Salida suave: arranca rápido y se posa (la de iOS). */
  salida: "cubic-bezier(.2,.8,.2,1)",
  /** Para lo que se va: acelera hacia afuera. */
  entrada: "cubic-bezier(.4,0,1,1)",
} as const;

/** Resorte para gestos (selector de la barra). Rígido y casi crítico: rebote apenas perceptible. */
export const RESORTE = {
  rigidez: 620,
  amortiguacion: 2 * Math.sqrt(620) * 0.8,
} as const;

/** true si hay un campo de texto con el foco (el teclado está abierto o abriéndose). */
export function hayCampoConFoco(): boolean {
  if (typeof document === "undefined") return false;
  const a = document.activeElement;
  return a instanceof HTMLElement && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable);
}

/** true si la persona pidió reducir el movimiento (solo en el navegador). */
export function menosMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
