// Stickers de la historia (versión corta): cuáles se ofrecen, cuáles vienen marcados, el texto de «Últimas N» y dónde van por defecto.
// Lógica pura, sin pantalla: se prueba en tests/stickers-historia.test.mjs. El dibujo está en lib/dibujo-stickers-historia.ts.

import { GRUPOS_STICKERS, NOMBRES_STICKERS_IMAGEN, grupoDisponible, type GrupoSticker, type IdSticker } from "./catalogo-stickers";
import type { Producto } from "./types";

export type { IdSticker } from "./catalogo-stickers";
/** En el orden de la hoja: «Últimas N» (dibujado) abre los básicos y luego van los ilustrados. */
export const IDS_STICKERS: readonly IdSticker[] = ["ultimas", ...GRUPOS_STICKERS.flatMap((g) => g.stickers.map((s) => s.id))];

/** Un sticker puesto en la historia: centro en fracción del ancho y del alto de la imagen, tamaño (1 = el de base) y giro en grados. */
export type StickerPuesto = { id: IdSticker; x: number; y: number; k: number; r: number; texto: string };

export const DIAS_NUEVO = 7;
export const STOCK_ULTIMAS = 3;
export const K_STICKER_MIN = 0.6;
export const K_STICKER_MAX = 2;


export const NOMBRE_STICKER: Record<IdSticker, string> = { ...NOMBRES_STICKERS_IMAGEN, ultimas: "Últimas unidades" };
/** Inclinación con que entra cada uno, en grados. Los ilustrados ya traen su propia gracia: entran derechos. */
export const INCLINACION_STICKER: Record<IdSticker, number> = { ...(Object.fromEntries(Object.keys(NOMBRES_STICKERS_IMAGEN).map((id) => [id, 0])) as Record<IdSticker, number>), ultimas: -5 };
/** Dónde van los que se ponen, en orden: arriba, sin tapar la tarjeta de abajo ni el centro de la foto. */
export const POSICIONES_STICKER: readonly { x: number; y: number }[] = [
  { x: 0.24, y: 0.12 }, { x: 0.74, y: 0.12 }, { x: 0.24, y: 0.28 }, { x: 0.74, y: 0.28 }, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.36 },
];

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

/** Los grupos de la hoja con sus stickers: «Últimas N» va primero en «Básicos» cuando se ofrece. */
export type GrupoOfrecido = { id: GrupoSticker["id"]; nombre: string; disponible: boolean; ids: IdSticker[] };
export function gruposOfrecidos(producto: Pick<Producto, "stock" | "porEncargo">): GrupoOfrecido[] {
  return GRUPOS_STICKERS.map((g, i) => ({
    id: g.id,
    nombre: g.nombre,
    disponible: grupoDisponible(g),
    ids: [...(i === 0 && ofreceUltimas(producto) ? (["ultimas"] as IdSticker[]) : []), ...g.stickers.map((s) => s.id)],
  }));
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
  id === "ultimas" ? textoUltimas(unidadesQueQuedan(producto)) : NOMBRE_STICKER[id];

/** El primer lugar de `POSICIONES_STICKER` que no tiene ya un sticker encima (si todos están, vuelve al primero). */
export function posicionLibre(puestos: readonly Pick<StickerPuesto, "x" | "y">[]): { x: number; y: number } {
  const ocupado = (p: { x: number; y: number }) => puestos.some((s) => Math.abs(s.x - p.x) < 0.1 && Math.abs(s.y - p.y) < 0.07);
  return POSICIONES_STICKER.find((p) => !ocupado(p)) ?? POSICIONES_STICKER[0]!;
}

/** Un sticker en el primer lugar libre (`puestos`: los que ya están). */
export const stickerPorDefecto = (id: IdSticker, producto: Pick<Producto, "stock">, puestos: readonly StickerPuesto[] = []): StickerPuesto => ({
  id, ...posicionLibre(puestos), k: 1, r: INCLINACION_STICKER[id], texto: textoSticker(id, producto),
});

/** Los stickers marcados de entrada, en sus lugares por defecto. */
export const stickersIniciales = (producto: Pick<Producto, "creadoEn" | "stock" | "porEncargo">, ahora: Date = new Date()): StickerPuesto[] =>
  stickersSugeridos(producto, ahora).reduce<StickerPuesto[]>((l, id) => [...l, stickerPorDefecto(id, producto, l)], []);

/** Poner o quitar un sticker (al tocarlo en la hoja). Al ponerlo entra en el primer lugar libre. */
export function alternarSticker(lista: StickerPuesto[], id: IdSticker, producto: Pick<Producto, "stock">): StickerPuesto[] {
  return lista.some((s) => s.id === id) ? lista.filter((s) => s.id !== id) : [...lista, stickerPorDefecto(id, producto, lista)];
}

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** El giro en el rango (-180, 180]. */
export const normalizarGiro = (r: number): number => {
  const v = ((((r + 180) % 360) + 360) % 360) - 180;
  return v === -180 ? 180 : v;
};

/** Deja el sticker dentro de la imagen (el centro nunca sale del cuadro), con un tamaño razonable y el giro normalizado. */
export function limitarSticker(s: StickerPuesto): StickerPuesto {
  const num = (v: number, defecto: number) => (Number.isFinite(v) ? v : defecto);
  return {
    ...s,
    x: entre(num(s.x, 0.5), 0.05, 0.95),
    y: entre(num(s.y, 0.2), 0.04, 0.96),
    k: entre(num(s.k, 1), K_STICKER_MIN, K_STICKER_MAX),
    r: normalizarGiro(num(s.r, INCLINACION_STICKER[s.id])),
  };
}

/** Arrastrar: `dx` y `dy` en los píxeles del marco donde se ve la imagen. */
export const moverSticker = (s: StickerPuesto, dx: number, dy: number, marco: { ancho: number; alto: number }): StickerPuesto =>
  limitarSticker({ ...s, x: s.x + dx / marco.ancho, y: s.y + dy / marco.alto });
