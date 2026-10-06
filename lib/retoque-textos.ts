// Los textos del retoque Beta, en un solo lugar y sin dependencias de React (se prueban con node: tests/retoque-textos.test.mjs).
// La voz manda (docs/11): cortos, en tú, sin tecnicismos.

import { CREDITOS_POR_RETOQUE, TIEMPO_RETOQUE_TEXTO } from "./config";

/** En la ficha, bajo el título de la foto. */
export const textoFichaRetoque = (creditos: number = CREDITOS_POR_RETOQUE) => `Se retoca con tu marca como guía. Cuesta ${creditos} créditos.`;

/** En el taller, mientras la foto está en proceso. */
export const textoEnTaller = (creditos: number = CREDITOS_POR_RETOQUE) =>
  `Tu foto está en proceso, con tu marca como guía. Reservamos ${creditos} créditos; se cobran cuando esté lista.`;

/** El remate en Caveat de «En el taller». */
export const REMATE_TALLER = "Hecho con criterio de marca.";

/** La tostada al mandar una foto. */
export const avisoFotoEnProceso = (creditos: number = CREDITOS_POR_RETOQUE) =>
  `Tu foto está en proceso. Reservamos ${creditos} créditos; se cobran cuando esté lista.`;

/** El tiempo estimado, o null si todavía no se fija (no se muestra nada). */
export function tiempoRetoque(texto: string = TIEMPO_RETOQUE_TEXTO): string | null {
  const t = texto.trim();
  return t ? t : null;
}
