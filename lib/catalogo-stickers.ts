// Catálogo de los stickers ilustrados de la historia: tres grupos de WebP con alfa en public/stickers/<grupo>/<id>.webp (nuestro propio
// host, mismo origen: el lienzo de exportación no se ensucia). Los que llevan datos variables (precio, «Últimas N») siguen dibujándose
// en lib/dibujo-stickers-historia.ts. Además, una tienda puede tener stickers propios (public/stickers/tiendas/<slug>/<id>.webp), que solo
// ella ve: se declaran en `tiendas.personalizacion.stickers_propios`. Lógica pura, sin pantalla.

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

export type IdGrupoSticker = "basicos" | "temporadas" | "marca" | "tienda";
/** Un sticker ilustrado de los grupos de todas las tiendas (archivo WebP). */
export type IdStickerFijo = (typeof BASICOS)[number][0] | (typeof TEMPORADAS)[number][0] | (typeof MARCA)[number][0];
/** Un sticker propio de una tienda: `tienda:<slug>/<id>` (el slug va dentro para que ninguna tienda pueda usar el de otra). */
export type IdStickerPropio = `tienda:${string}/${string}`;
/** Un sticker ilustrado (archivo WebP). */
export type IdStickerImagen = IdStickerFijo | IdStickerPropio;
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

/** Slug e id de un sticker propio: minúsculas, números y guiones sueltos (nada de `/`, `..` ni mayúsculas en una ruta). */
const SEGURO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const esSegmentoSeguro = (v: unknown): v is string => typeof v === "string" && v.length <= 60 && SEGURO.test(v);

/** Los stickers propios que una tienda puede declarar como máximo. */
export const MAX_STICKERS_PROPIOS = 24;

/** El id de un sticker propio, o null si el slug o el id no son seguros. */
export const idStickerPropio = (slug: unknown, id: unknown): IdStickerPropio | null =>
  esSegmentoSeguro(slug) && esSegmentoSeguro(id) ? `tienda:${slug}/${id}` : null;

/** Slug e id de un id propio (con la misma validación), o null si no lo es. */
function partesPropio(id: string): { slug: string; id: string } | null {
  const m = /^tienda:([^/]+)\/([^/]+)$/.exec(id);
  return m && esSegmentoSeguro(m[1]) && esSegmentoSeguro(m[2]) ? { slug: m[1], id: m[2] } : null;
}

export const esStickerPropio = (id: string): id is IdStickerPropio => partesPropio(id) != null;

export const esStickerImagen = (id: string): id is IdStickerImagen =>
  esStickerPropio(id) || GRUPOS_STICKERS.some((g) => g.stickers.some((s) => s.id === id));

const grupoDeSticker = (id: IdStickerFijo): GrupoSticker => GRUPOS_STICKERS.find((g) => g.stickers.some((s) => s.id === id))!;

/** Dónde vive el archivo, desde la raíz del sitio. */
export function urlStickerImagen(id: IdStickerImagen): string {
  const propio = partesPropio(id);
  return propio ? `/stickers/tiendas/${propio.slug}/${propio.id}.webp` : `/stickers/${grupoDeSticker(id as IdStickerFijo).id}/${id}.webp`;
}

export const NOMBRES_STICKERS_IMAGEN = Object.fromEntries(GRUPOS_STICKERS.flatMap((g) => g.stickers.map((s) => [s.id, s.nombre]))) as Record<IdStickerFijo, string>;

const MAX_NOMBRE_GRUPO = 18;

/**
 * El grupo «De {tienda}» con los stickers que la tienda declara en `personalizacion.stickers_propios` (`[{ id, nombre }]`), o null si no
 * declara ninguno válido. Los ids que no cumplen el formato, los repetidos y lo que sobra del máximo se ignoran. No mira si los archivos
 * existen: la pantalla esconde el que no cargue.
 */
export function grupoStickersDeTienda(tienda: { slug: string; nombre: string; personalizacion?: Record<string, unknown> | null }): GrupoSticker | null {
  const lista = tienda.personalizacion?.stickers_propios;
  if (!Array.isArray(lista) || !esSegmentoSeguro(tienda.slug)) return null;
  const vistos = new Set<string>();
  const stickers: { id: IdStickerImagen; nombre: string }[] = [];
  for (const e of lista) {
    if (stickers.length >= MAX_STICKERS_PROPIOS) break;
    const item = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
    const id = idStickerPropio(tienda.slug, item.id);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    const nombre = typeof item.nombre === "string" ? item.nombre.trim().slice(0, 40) : "";
    stickers.push({ id, nombre: nombre || String(item.id).replace(/-/g, " ") });
  }
  if (!stickers.length) return null;
  const nombre = tienda.nombre.trim();
  const corto = nombre.length > MAX_NOMBRE_GRUPO ? `${nombre.slice(0, MAX_NOMBRE_GRUPO - 1).trimEnd()}…` : nombre;
  return { id: "tienda", nombre: corto ? `De ${corto}` : "De tu tienda", gratis: true, stickers };
}
