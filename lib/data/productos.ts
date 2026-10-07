import { limpiarFotosPorValor } from "../presentaciones";
import type { CambiosProducto, Medio, NuevoProducto, OpcionProducto, Producto, Variante } from "../types";
import type { DB } from "./db";
import { DatosInvalidos } from "./errores";
import { detallesValidos, rubrosDeTienda } from "../rubros";
export { sumarStock } from "./inventario";
import { ordenarVariantes, slugDesdeTexto } from "./filas";

/** Las variantes de un producto (activas e inactivas), en su orden. */
export const variantesDe = (db: DB, productoId: string): Variante[] => ordenarVariantes(db.variantes.filter((v) => v.productoId === productoId));

/** El producto con sus variantes, como lo devuelve Supabase. */
export const conVariantes = (db: DB, p: Producto): Producto => ({ ...p, variantes: variantesDe(db, p.id) });

/** El tipo del producto debe ser uno de los que vende la tienda (trigger `productos_rubro`). */
function validarTipo(db: DB, p: Producto) {
  if (p.rubro != null && !rubrosDeTienda(db.tiendas.find((t) => t.id === p.tiendaId) ?? { rubro: "general" }).includes(p.rubro)) {
    throw new DatosInvalidos("Ese tipo de producto no es de tu tienda.");
  }
}

/**
 * Las reglas de la base para lo del catálogo conectado (constraints de productos y triggers productos_medios /
 * productos_detalles), con el mismo mensaje que da la app cuando la base lo rechaza. Lanza DatosInvalidos.
 */
export function validarCatalogo(db: DB, p: Producto) {
  const videos = p.medios.filter((m) => m.tipo === "video");
  // (El largo de la URL no se mira: en la demo las fotos viven como data: URL; en Supabase se suben y la URL es corta.)
  const medioMalo = p.medios.some((m) => !m.url || (m.tipo === "video" && (!Number.isInteger(m.duracionS) || m.duracionS < 1 || m.duracionS > 30)));
  if (p.medios.length > 10 || videos.length > 2 || medioMalo) throw new DatosInvalidos("Hasta 10 fotos y videos, y máximo 2 videos de 30 segundos.");
  const rubro = db.tiendas.find((t) => t.id === p.tiendaId)?.rubro;
  if (!rubro || !detallesValidos(rubro, p.detalles, p.tipo === "servicio")) throw new DatosInvalidos("Algún detalle no sirve para este tipo de producto. Revísalo.");
  validarTipo(db, p);
  if (p.encargoTexto !== null && (p.encargoTexto.length < 1 || p.encargoTexto.length > 40)) throw new DatosInvalidos("El tiempo de encargo va en hasta 40 caracteres.");
  if (p.tipo === "servicio" && (p.stock !== null || p.porEncargo)) throw new DatosInvalidos("Un servicio no lleva stock.");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) || p.slug.length > 40) throw new DatosInvalidos("El enlace va en minúsculas, números y guiones (hasta 40).");
  if (db.productos.some((x) => x.tiendaId === p.tiendaId && x.id !== p.id && x.slug === p.slug)) throw new DatosInvalidos("Ese enlace ya lo usa otro de tus productos. Prueba otro.");
}

/** Productos de una tienda, del más nuevo al más viejo. */
export function productosDeTienda(db: DB, tiendaId: string, incluirEliminados = false): Producto[] {
  return db.productos
    .filter((p) => p.tiendaId === tiendaId && (incluirEliminados || !p.eliminadoEn))
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    .map((p) => conVariantes(db, p));
}

export function productoDeTienda(db: DB, tiendaId: string, id: string): Producto | null {
  const p = db.productos.find((p) => p.id === id && p.tiendaId === tiendaId);
  return p ? conVariantes(db, p) : null;
}

/** El primer slug libre de la tienda: "parade", "parade-2"… (como `public.slug_libre`). */
export function slugLibre(db: DB, tiendaId: string, texto: string, excepto: string | null = null): string {
  const base = slugDesdeTexto(texto);
  const usados = new Set(db.productos.filter((p) => p.tiendaId === tiendaId && p.id !== excepto).map((p) => p.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base.slice(0, 40 - String(n).length - 1).replace(/-+$/, "")}-${n}`;
  return slug;
}

/** Las fotos de `fotos` como medios, conservando los videos en su lugar (lo que hace el trigger `productos_medios`). */
export function mediosDesdeFotos(fotos: string[], retocada: boolean, antes: Medio[] = []): Medio[] {
  const nuevas: Medio[] = fotos.map((url, i) => ({ tipo: "foto", url, retocada: i === 0 && retocada }));
  const resultado: Medio[] = [];
  let f = 0;
  for (const m of antes) {
    if (m.tipo === "video") resultado.push(m);
    else if (f < nuevas.length) resultado.push(nuevas[f++]!);
  }
  return [...resultado, ...nuevas.slice(f)];
}

/** Medios → fotos y foto_retocada (la otra mitad de la sincronía). */
export function fotosDesdeMedios(medios: Medio[]): { fotos: string[]; fotoRetocada: boolean } {
  const fotos = medios.filter((m): m is Extract<Medio, { tipo: "foto" }> => m.tipo === "foto");
  return { fotos: fotos.map((m) => m.url), fotoRetocada: fotos[0]?.retocada ?? false };
}

export function insertarProducto(db: DB, tiendaId: string, datos: NuevoProducto, id: string, ahora: string) {
  const medios = datos.medios ?? mediosDesdeFotos(datos.fotos, datos.fotoRetocada);
  const producto: Producto = {
    ...datos,
    ...(datos.medios ? fotosDesdeMedios(datos.medios) : {}),
    id,
    tiendaId,
    creadoEn: ahora,
    actualizadoEn: ahora,
    slug: datos.slug ?? slugLibre(db, tiendaId, datos.nombre),
    tipo: datos.tipo ?? "producto",
    medios,
    detalles: datos.detalles ?? {},
    opciones: datos.opciones ?? [],
    porEncargo: datos.porEncargo ?? false,
    encargoTexto: datos.encargoTexto ?? null,
  };
  validarCatalogo(db, producto);
  return { db: { ...db, productos: [...db.productos, producto] }, producto: conVariantes(db, producto) };
}

export function modificarProducto(db: DB, tiendaId: string, id: string, cambios: CambiosProducto, ahora: string) {
  const actual = db.productos.find((p) => p.id === id && p.tiendaId === tiendaId);
  if (!actual) throw new Error("Ese producto no es de esta tienda.");
  if (actual.eliminadoEn) throw new DatosInvalidos("Este producto fue eliminado. Su historial se conserva.");
  let producto: Producto = { ...actual, ...cambios, actualizadoEn: ahora } as Producto;
  delete producto.variantes;
  if (cambios.rubro !== undefined) validarTipo(db, producto);
  if (cambios.medios) producto = { ...producto, ...fotosDesdeMedios(cambios.medios) };
  else if (cambios.fotos || cambios.fotoRetocada !== undefined) producto = { ...producto, medios: mediosDesdeFotos(producto.fotos, producto.fotoRetocada, actual.medios) };
  // Como el trigger de la base: la foto de un color solo vale mientras su foto y su valor sigan en el producto.
  producto = { ...producto, fotosPorValor: limpiarFotosPorValor(producto.fotosPorValor, producto.opciones, producto.medios) };
  if (cambios.slug !== undefined && db.productos.some((p) => p.tiendaId === tiendaId && p.id !== id && p.slug === cambios.slug)) {
    throw new DatosInvalidos("Ese enlace ya lo usa otro de tus productos. Prueba otro.");
  }
  return { db: { ...db, productos: db.productos.map((p) => (p.id === id ? producto : p)) }, producto: conVariantes(db, producto) };
}

/** "M · Arena": los valores en el orden de los ejes (como `public.texto_variante`). */
export function textoVariante(opciones: OpcionProducto[], valores: Record<string, string>): string {
  return opciones.filter((o) => o.nombre in valores).map((o) => valores[o.nombre]).join(" · ");
}
