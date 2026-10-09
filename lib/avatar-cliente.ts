// Avatar de un cliente: iniciales por defecto, o un emoji con un color de fondo de la marca (solo emoji, nunca fotos).
// Se guarda en `clientes.avatar_emoji` y `clientes.avatar_color`.

export type ColorAvatar = "crema" | "rosa" | "dorado" | "menta" | "durazno";

/** Los 5 colores de fondo (referencias/cliente-nuevo-nota). `crema` es el de partida. */
export const COLORES_AVATAR: { id: ColorAvatar; nombre: string; hex: string }[] = [
  { id: "crema", nombre: "Crema", hex: "#F2E9DA" },
  { id: "rosa", nombre: "Rosa", hex: "#F4C6D4" },
  { id: "dorado", nombre: "Dorado", hex: "#F3E2B3" },
  { id: "menta", nombre: "Menta", hex: "#CFE3D8" },
  { id: "durazno", nombre: "Durazno", hex: "#FAD3C2" },
];

/** Los emojis de la cuadrícula (la primera casilla, «Aa», es volver a las iniciales). */
export const EMOJIS_AVATAR = [
  "👩🏽", "👱🏽‍♀️", "👩🏾‍🦱", "🧔🏽", "👵🏽", "💅🏽", "👗", "👠", "💄", "🌸", "🌺", "💖",
  "🦋", "🐱", "🍓", "☕", "🎀", "💎", "👑", "🌴", "⭐", "🌙", "🛍️",
] as const;

export const hexDeColor = (color: ColorAvatar | null | undefined) => COLORES_AVATAR.find((c) => c.id === color)?.hex ?? null;

export const esColorAvatar = (valor: unknown): valor is ColorAvatar => COLORES_AVATAR.some((c) => c.id === valor);

/** Emoji limpio: texto corto o null (vacío = iniciales). */
export function limpiarEmoji(emoji: string | null | undefined): string | null {
  const limpio = (emoji ?? "").trim();
  return limpio === "" || limpio.length > 16 ? null : limpio;
}

export type AvatarDeCliente = { avatarEmoji?: string | null; avatarColor?: ColorAvatar | null };
