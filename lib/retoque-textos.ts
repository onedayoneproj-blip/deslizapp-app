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

// ── Retoque opcional al subir la foto (el interruptor «Retocar esta foto» de la ficha) ──────────────────────────────

export const TITULO_RETOCAR_ESTA = "Retocar esta foto";
/** Debajo del interruptor encendido: es solo una intención hasta guardar. */
export const TEXTO_SE_MANDA_AL_GUARDAR = "Se manda al taller cuando guardes.";
export const MOTIVO_SIN_CREDITOS = "Te faltan créditos para esta.";
export const MOTIVO_SOLO_MIRAR = "Solo mirar: aquí no se manda nada al taller.";

/** Lo que se suma a la tostada de «Guardado» cuando fotos marcadas pasaron al taller. */
export const avisoFotosEnElTaller = (n: number, porFoto: number = CREDITOS_POR_RETOQUE) =>
  n === 1 ? `Tu foto está en el taller: reservamos ${porFoto} créditos.` : `Tus ${n} fotos están en el taller: reservamos ${n * porFoto} créditos.`;

/** Si el producto se guardó pero alguna foto no pudo pasar al taller (el producto nunca se pierde por eso). */
export const avisoFotosSinTaller = (fallaron: number, total: number) =>
  total === 1
    ? "No pudimos mandar la foto al taller. Toca la foto y «Retocar»."
    : fallaron === total
      ? "No pudimos mandar las fotos al taller. Toca cada una y «Retocar»."
      : `${total - fallaron} de ${total} fotos están en el taller. Para el resto, toca la foto y «Retocar».`;

/** La tostada final: lo de siempre al guardar y, si hubo fotos marcadas, cómo les fue en el taller. */
export function avisoGuardadoConRetoques(base: string, marcadas: number, enviadas: number, porFoto: number = CREDITOS_POR_RETOQUE): string {
  if (marcadas === 0) return base;
  const fallaron = marcadas - enviadas;
  const taller = enviadas > 0 && fallaron === 0 ? avisoFotosEnElTaller(enviadas, porFoto) : avisoFotosSinTaller(fallaron, marcadas);
  return `${base} ${taller}`;
}
