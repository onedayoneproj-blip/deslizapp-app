// Búsqueda de productos para armar pedidos: por nombre o colección, sin distinguir acentos ni mayúsculas.

import { contieneTodas, palabras, sinAcentos } from "./texto";
import type { PedidoConItems, Producto } from "./types";

/** Unidades vendidas por producto (pedidos no cancelados). */
export function unidadesVendidas(pedidos: PedidoConItems[]): Map<string, number> {
  const unidades = new Map<string, number>();
  for (const p of pedidos) {
    if (p.estado === "cancelado") continue;
    for (const i of p.items) unidades.set(i.productoId, (unidades.get(i.productoId) ?? 0) + i.cantidad);
  }
  return unidades;
}

/** Cuánto se puede agregar de un producto a un pedido: su stock, o 99 si no se lleva la cuenta. */
export const cantidadMaxima = (p: Producto) => (p.stock === null ? 99 : Math.max(0, p.stock));

/** Se puede agregar a un pedido (visible y con stock). */
export const sePuedeAgregar = (p: Producto) => p.activo && cantidadMaxima(p) > 0;

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
  const grupo = (p: Producto) => (!p.activo ? 2 : p.stock === 0 ? 1 : 0);
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
