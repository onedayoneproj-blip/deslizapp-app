// Búsqueda de productos para armar pedidos: por nombre o colección, sin distinguir acentos ni mayúsculas.

import { contieneTodas, palabras, sinAcentos } from "./texto";
import { precioConPromo } from "./promos";
import type { PedidoConItems, Producto, Promo, Variante } from "./types";

/** Unidades vendidas por producto (pedidos no cancelados). */
export function unidadesVendidas(pedidos: PedidoConItems[]): Map<string, number> {
  const unidades = new Map<string, number>();
  for (const p of pedidos) {
    if (p.estado === "cancelado") continue;
    for (const i of p.items) unidades.set(i.productoId, (unidades.get(i.productoId) ?? 0) + i.cantidad);
  }
  return unidades;
}

/** Las variantes que se pueden pedir de un producto (activas); vacío si no tiene opciones. */
export const variantesActivas = (p: Producto): Variante[] => (p.variantes ?? []).filter((v) => v.activa);

/**
 * Cuánto se puede agregar de un producto (o de una de sus variantes) a un pedido: su stock, o 99 si no se lleva la cuenta. Una
 * línea que llegó por encargo (desde el catálogo, docs/12) no mira el stock.
 */
export function cantidadMaxima(p: Producto, v: Variante | null = null, porEncargo = false) {
  const stock = v ? v.stock : p.stock;
  return stock === null || porEncargo ? 99 : Math.max(0, stock);
}

/** Se puede agregar a un pedido: visible y con stock (o por encargo); con opciones, alguna variante que lo tenga. */
export function sePuedeAgregar(p: Producto) {
  if (!p.activo) return false;
  const activas = variantesActivas(p);
  return activas.length > 0 ? activas.some((v) => cantidadMaxima(p, v) > 0) : cantidadMaxima(p) > 0;
}

/** La llave de una línea de "+ Pedido": el producto, o "producto:variante". */
export const claveLinea = (productoId: string, varianteId?: string | null) => (varianteId ? `${productoId}:${varianteId}` : productoId);

/** El producto y la variante de una llave (null si ya no existen). */
export function deClaveLinea(productos: Producto[], clave: string): { producto: Producto; variante: Variante | null } | null {
  const [productoId, varianteId] = clave.split(":");
  const producto = productos.find((p) => p.id === productoId);
  if (!producto) return null;
  if (!varianteId) return { producto, variante: null };
  const variante = producto.variantes?.find((v) => v.id === varianteId);
  return variante ? { producto, variante } : null;
}

/** El precio de hoy de un producto o de una variante (el suyo si lo tiene), con la promo vigente. */
export const precioDeLinea = (p: Producto, v: Variante | null, promos: Promo[]) =>
  precioConPromo({ ...p, precio: v?.precio ?? p.precio }, promos);

/**
 * Productos que coinciden con lo escrito (en el nombre o en la colección) y, si se elige, con la colección.
 * Orden: los que se pueden agregar primero (con lo escrito: los que empiezan igual; sin texto: los más
 * vendidos, luego por nombre), después los agotados y al final los ocultos.
 */
export function buscarProductos(
  productos: Producto[],
  consulta: string,
  coleccion: string | null,
  vendidas: Map<string, number>,
): Producto[] {
  const q = palabras(consulta);
  const grupo = (p: Producto) => (!p.activo ? 2 : sePuedeAgregar(p) ? 0 : 1);
  return productos
    .filter((p) => (coleccion === null || p.categoria === coleccion) && (q.length === 0 || contieneTodas(`${p.nombre} ${p.categoria ?? ""}`, q)))
    .sort(
      (a, b) =>
        grupo(a) - grupo(b) ||
        (q.length ? Number(sinAcentos(b.nombre).startsWith(q[0]!)) - Number(sinAcentos(a.nombre).startsWith(q[0]!)) : 0) ||
        (vendidas.get(b.id) ?? 0) - (vendidas.get(a.id) ?? 0) ||
        a.nombre.localeCompare(b.nombre, "es"),
    );
}
