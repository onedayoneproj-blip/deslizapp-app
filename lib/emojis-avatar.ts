// Lógica del selector de emojis del avatar: tono de piel, validación de «un solo emoji» y los usados hace poco.
// Los datos (categorías y emojis) están en `emojis-avatar-datos.ts`.

import { MAX_EMOJI } from "./avatar-cliente";

export { CATEGORIAS_EMOJI } from "./emojis-avatar-datos";
export type { CategoriaEmoji, EmojiAvatar } from "./emojis-avatar-datos";

/** Tonos de piel (modificadores Fitzpatrick); `""` = el amarillo de siempre. */
export const TONOS_PIEL = [
  { id: "", nombre: "Sin tono", muestra: "🟡" },
  { id: "\u{1F3FB}", nombre: "Tono claro", muestra: "\u{1F3FB}" },
  { id: "\u{1F3FC}", nombre: "Tono medio claro", muestra: "\u{1F3FC}" },
  { id: "\u{1F3FD}", nombre: "Tono medio", muestra: "\u{1F3FD}" },
  { id: "\u{1F3FE}", nombre: "Tono medio oscuro", muestra: "\u{1F3FE}" },
  { id: "\u{1F3FF}", nombre: "Tono oscuro", muestra: "\u{1F3FF}" },
] as const;

/** El emoji con ese tono de piel: el modificador va justo después del primer carácter (antes de ZWJ y de la variante de texto). */
export function conTono(emoji: string, tono: string): string {
  if (!tono) return emoji;
  const [primero, ...resto] = Array.from(emoji);
  if (!primero) return emoji;
  // La variante de texto (U+FE0F) pegada al primer carácter sobra con el modificador (✌️ → ✌🏻)
  if (resto[0] === "\uFE0F") resto.shift();
  return primero + tono + resto.join("");
}

const SOLO_UN_EMOJI = /^(?:\p{Regional_Indicator}{2}|[#*0-9]️?⃣|\p{Extended_Pictographic}[️\p{Emoji_Modifier}]?(?:‍\p{Extended_Pictographic}[️\p{Emoji_Modifier}]?)*)$/u;

/** Cuántos «caracteres» (grafemas) ve una persona en el texto: un emoji con tono o con ZWJ cuenta como uno. */
function grafemas(texto: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(texto)).length;
  }
  return Array.from(texto).length;
}

export type ResultadoEmoji = { ok: true; emoji: string } | { ok: false; error: string };

/**
 * Comprueba que un texto sea UN solo emoji del sistema (también con tono de piel, secuencias ZWJ, banderas y teclas) y quepa en los
 * `MAX_EMOJI` caracteres de la base; rechaza texto normal, varios emojis o vacío con un mensaje claro. Hoy sirve para descartar valores raros
 * guardados en «Usados hace poco» (no hay campo para escribir emojis: la web no puede abrir solo el teclado de emojis).
 */
export function validarEmoji(texto: string): ResultadoEmoji {
  const limpio = texto.trim();
  if (limpio === "") return { ok: false, error: "Escribe o pega un emoji." };
  if (limpio.length > MAX_EMOJI) return { ok: false, error: "Ese emoji es muy largo. Elige otro." };
  if (grafemas(limpio) !== 1) return { ok: false, error: "Escribe un solo emoji." };
  if (!SOLO_UN_EMOJI.test(limpio)) return { ok: false, error: "Eso no es un emoji. Usa el teclado de emojis de tu teléfono." };
  return { ok: true, emoji: limpio };
}

/** Los usados hace poco: el nuevo va primero, sin repetir, hasta `max`. */
export function conReciente(lista: readonly string[], emoji: string, max = 12): string[] {
  return [emoji, ...lista.filter((e) => e !== emoji)].slice(0, max);
}

const CLAVE_RECIENTES = "deslizapp-emojis-recientes-v1";
const CLAVE_TONO = "deslizapp-tono-piel-v1";

export function leerRecientes(): string[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]") as unknown;
    return Array.isArray(guardado) ? guardado.filter((e): e is string => typeof e === "string" && validarEmoji(e).ok).slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function guardarReciente(emoji: string) {
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(conReciente(leerRecientes(), emoji)));
  } catch {
    // Sin almacenamiento: no se recuerdan
  }
}

export function leerTonoPiel(): string {
  try {
    const t = localStorage.getItem(CLAVE_TONO) ?? "";
    return TONOS_PIEL.some((x) => x.id === t) ? t : "";
  } catch {
    return "";
  }
}

export function guardarTonoPiel(tono: string) {
  try {
    localStorage.setItem(CLAVE_TONO, tono);
  } catch {
    // Sin almacenamiento: no se recuerda
  }
}
