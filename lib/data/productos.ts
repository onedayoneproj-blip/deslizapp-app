import type { CambiosProducto, NuevoProducto, Producto } from "../types";
import type { DB } from "./db";

/** Productos de una tienda, del más nuevo al más viejo. */
export function productosDeTienda(db: DB, tiendaId: string): Producto[] {
  return db.productos.filter((p) => p.tiendaId === tiendaId).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export function productoDeTienda(db: DB, tiendaId: string, id: string): Producto | null {
  return db.productos.find((p) => p.id === id && p.tiendaId === tiendaId) ?? null;
}

export function insertarProducto(db: DB, tiendaId: string, datos: NuevoProducto, id: string, ahora: string) {
  const producto: Producto = { ...datos, id, tiendaId, creadoEn: ahora, actualizadoEn: ahora };
  return { db: { ...db, productos: [...db.productos, producto] }, producto };
}

export function modificarProducto(db: DB, tiendaId: string, id: string, cambios: CambiosProducto, ahora: string) {
  const actual = productoDeTienda(db, tiendaId, id);
  if (!actual) throw new Error("Ese producto no es de esta tienda.");
  const producto: Producto = { ...actual, ...cambios, actualizadoEn: ahora };
  return { db: { ...db, productos: db.productos.map((p) => (p.id === id ? producto : p)) }, producto };
}
