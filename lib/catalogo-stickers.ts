// Catálogo de los stickers ilustrados de la historia: tres grupos de WebP con alfa en public/stickers/<grupo>/<id>.webp (nuestro propio
// host, mismo origen: el lienzo de exportación no se ensucia). Los que llevan datos variables (precio, «Últimas N») siguen dibujándose
// en lib/dibujo-stickers-historia.ts. Lógica pura, sin pantalla.

const BASICOS = [
  ["nuevo", "¡Nuevo!"], ["agotado", "Agotado"], ["volvio", "¡Volvió!"], ["mas-vendido", "Más vendido"], ["recien-llegado", "Recién llegado"],
  ["por-encargo", "Por encargo"], ["pidelo-ya", "Pídelo ya"], ["nuevos-colores", "Nuevos colores"], ["edicion-limitada", "Edición limitada"],
  ["envio-disponible", "Envío disponible"], ["favorito-de-la-casa", "Favorito de la casa"], ["preguntame", "Pregúntame"],
] as const;
const TEMPORADAS = [
  ["viernes-negro", "Viernes negro"], ["cyber-lunes", "Cyber lunes"], ["feliz-navidad", "Feliz Navidad"], ["feliz-ano-nuevo", "Feliz Año Nuevo"],
  ["dia-de-reyes", "Día de Reyes"], ["te-amo", "Te amo"], ["dia-de-las-madres", "Día de las madres"], ["dia-de-los-padres", "Día de los padres"],
  ["regreso-a-clases", "Regreso a clases"], ["rebajas-de-verano", "Rebajas de verano"], ["halloween", "Halloween"], ["independencia", "Independencia"],
] as const;
const MARCA = [
  ["aaah-corazon", "Aaah con corazón"], ["aaah", "Aaah"], ["deslizapp", "deslizapp"], ["hecho-con-deslizapp", "Hecho con deslizapp"],
  ["pidelo-en-mi-catalogo", "Pídelo en mi catálogo"], ["desliza-y-pide", "Desliza y pide"], ["te-lo-guardo", "Te lo guardo"],
  ["ya-disponible", "Ya disponible"], ["mira-mas", "Mira más"],
] as const;

export type IdGrupoSticker = "basicos" | "temporadas" | "marca";
/** Un sticker ilustrado (archivo WebP). */
export type IdStickerImagen = (typeof BASICOS)[number][0] | (typeof TEMPORADAS)[number][0] | (typeof MARCA)[number][0];
/** El único sticker dibujado con datos del producto: «Últimas N». */
export type IdStickerDibujado = "ultimas";
export type IdSticker = IdStickerImagen | IdStickerDibujado;

export type GrupoSticker = {
  id: IdGrupoSticker;
  nombre: string;
  /** Todos gratis por ahora. Un grupo de pago se marca con `gratis: false`; los cobros no están construidos. */
  gratis: boolean;
  stickers: readonly { id: IdStickerImagen; nombre: string }[];
};

const lista = (t: readonly (readonly [IdStickerImagen, string])[]) => t.map(([id, nombre]) => ({ id, nombre }));

export const GRUPOS_STICKERS: readonly GrupoSticker[] = [
  { id: "basicos", nombre: "Básicos", gratis: true, stickers: lista(BASICOS) },
  { id: "temporadas", nombre: "Temporadas", gratis: true, stickers: lista(TEMPORADAS) },
  { id: "marca", nombre: "Marca", gratis: true, stickers: lista(MARCA) },
];

/** Un grupo se puede usar si es gratis (más adelante, o si la tienda lo compró). */
export const grupoDisponible = (g: Pick<GrupoSticker, "gratis">): boolean => g.gratis;

export const esStickerImagen = (id: string): id is IdStickerImagen => GRUPOS_STICKERS.some((g) => g.stickers.some((s) => s.id === id));

export const grupoDeSticker = (id: IdStickerImagen): GrupoSticker => GRUPOS_STICKERS.find((g) => g.stickers.some((s) => s.id === id))!;

/** Dónde vive el archivo, desde la raíz del sitio. */
export const urlStickerImagen = (id: IdStickerImagen): string => `/stickers/${grupoDeSticker(id).id}/${id}.webp`;

export const NOMBRES_STICKERS_IMAGEN = Object.fromEntries(GRUPOS_STICKERS.flatMap((g) => g.stickers.map((s) => [s.id, s.nombre]))) as Record<IdStickerImagen, string>;
