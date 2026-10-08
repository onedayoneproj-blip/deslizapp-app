// Stickers de la historia (versión corta): cuáles se ofrecen, cuáles vienen marcados, el texto de «Últimas N» y dónde van por defecto.
// Lógica pura, sin pantalla: se prueba en tests/stickers-historia.test.mjs. El dibujo está en lib/dibujo-stickers-historia.ts.

import type { Producto } from "./types";

export type IdSticker = "nuevo" | "ultimas" | "aaah";
export const IDS_STICKERS: readonly IdSticker[] = ["nuevo", "ultimas", "aaah"];

/** Un sticker puesto en la historia: centro en fracción del ancho y del alto de la imagen, y tamaño (1 = el de base). */
export type StickerPuesto = { id: IdSticker; x: number; y: number; k: number; texto: string };

export const DIAS_NUEVO = 7;
export const STOCK_ULTIMAS = 3;
export const K_STICKER_MIN = 0.6;
export const K_STICKER_MAX = 2;

export const NOMBRE_STICKER: Record<IdSticker, string> = { nuevo: "Nuevo", ultimas: "Últimas unidades", aaah: "Aaah de deslizapp" };
/** Inclinación de cada uno, en grados (la misma en la hoja, en «Ajustar foto» y en la imagen). */
export const INCLINACION_STICKER: Record<IdSticker, number> = { nuevo: -8, ultimas: -5, aaah: -6 };
/** Dónde queda cada uno por defecto: arriba, sin tapar la tarjeta de abajo ni el centro de la foto. */
export const POSICION_STICKER: Record<IdSticker, { x: number; y: number }> = {
  nuevo: { x: 0.22, y: 0.11 },
  ultimas: { x: 0.7, y: 0.1 },
  aaah: { x: 0.78, y: 0.24 },
};

const MS_DIA = 86_400_000;

/** El producto se creó hace `DIAS_NUEVO` días o menos. */
export function esNuevo(producto: Pick<Producto, "creadoEn">, ahora: Date = new Date()): boolean {
  const t = Date.parse(producto.creadoEn);
  if (!Number.isFinite(t)) return false;
  const dias = (ahora.getTime() - t) / MS_DIA;
  return dias >= -1 && dias <= DIAS_NUEVO;
}

/** Las unidades que quedan, si se sabe (número entero mayor que cero); null si no hay número. */
export function unidadesQueQuedan(producto: Pick<Producto, "stock">): number | null {
  const s = producto.stock;
  return typeof s === "number" && Number.isFinite(s) && s >= 1 ? Math.floor(s) : null;
}

/** «Últimas N» con el stock real; sin número, «Últimas unidades». */
export const textoUltimas = (n: number | null): string => (n == null ? "Últimas unidades" : n === 1 ? "Última unidad" : `Últimas ${n}`);

/** «Últimas N» no se ofrece con el producto agotado ni por encargo. */
export const ofreceUltimas = (producto: Pick<Producto, "stock" | "porEncargo">): boolean => !producto.porEncargo && producto.stock !== 0;

/** Cuáles se ofrecen en la hoja, en orden. */
export function stickersOfrecidos(producto: Pick<Producto, "stock" | "porEncargo">): IdSticker[] {
  return IDS_STICKERS.filter((id) => id !== "ultimas" || ofreceUltimas(producto));
}

/** Cuáles vienen marcados de entrada: «¡Nuevo!» con el producto de 7 días o menos; «Últimas N» con 1 a 3 unidades. */
export function stickersSugeridos(producto: Pick<Producto, "creadoEn" | "stock" | "porEncargo">, ahora: Date = new Date()): IdSticker[] {
  const ids: IdSticker[] = [];
  if (esNuevo(producto, ahora)) ids.push("nuevo");
  const n = unidadesQueQuedan(producto);
  if (ofreceUltimas(producto) && n != null && n <= STOCK_ULTIMAS) ids.push("ultimas");
  return ids;
}

/** El texto que lleva cada sticker para este producto. */
export const textoSticker = (id: IdSticker, producto: Pick<Producto, "stock">): string =>
  id === "nuevo" ? "¡Nuevo!" : id === "ultimas" ? textoUltimas(unidadesQueQuedan(producto)) : "aaah";

/** Un sticker en su lugar por defecto. */
export const stickerPorDefecto = (id: IdSticker, producto: Pick<Producto, "stock">): StickerPuesto => ({
  id, ...POSICION_STICKER[id], k: 1, texto: textoSticker(id, producto),
});

/** Los stickers marcados de entrada, en sus lugares por defecto. */
export const stickersIniciales = (producto: Pick<Producto, "creadoEn" | "stock" | "porEncargo">, ahora: Date = new Date()): StickerPuesto[] =>
  stickersSugeridos(producto, ahora).map((id) => stickerPorDefecto(id, producto));

/** Poner o quitar un sticker (al tocarlo en la hoja). Al ponerlo vuelve a su lugar por defecto. */
export function alternarSticker(lista: StickerPuesto[], id: IdSticker, producto: Pick<Producto, "stock">): StickerPuesto[] {
  return lista.some((s) => s.id === id) ? lista.filter((s) => s.id !== id) : [...lista, stickerPorDefecto(id, producto)];
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Deja el sticker dentro de la imagen (el centro nunca sale del cuadro) y con un tamaño razonable. */
export function limitarSticker(s: StickerPuesto): StickerPuesto {
  const num = (v: number, defecto: number) => (Number.isFinite(v) ? v : defecto);
  return { ...s, x: entre(num(s.x, 0.5), 0.05, 0.95), y: entre(num(s.y, 0.2), 0.04, 0.96), k: entre(num(s.k, 1), K_STICKER_MIN, K_STICKER_MAX) };
}

/** Arrastrar: `dx` y `dy` en los píxeles del marco donde se ve la imagen. */
export const moverSticker = (s: StickerPuesto, dx: number, dy: number, marco: { ancho: number; alto: number }): StickerPuesto =>
  limitarSticker({ ...s, x: s.x + dx / marco.ancho, y: s.y + dy / marco.alto });
