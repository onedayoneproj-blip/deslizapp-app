// Reglas de promos que no dependen de dónde vienen los datos (sirven hoy y con Supabase).

import type { EstadoPromo, Producto, Promo } from "./types";

/**
 * Estado real de una promo en un momento dado: se calcula por fechas, salvo que el dueño
 * la haya terminado a mano (`estado = 'terminada'` guardado manda sobre las fechas).
 */
export function estadoPromo(promo: Promo, ahora: Date = new Date()): EstadoPromo {
  if (promo.estado === "terminada") return "terminada";
  const t = ahora.getTime();
  if (promo.fechaFin && Date.parse(promo.fechaFin) < t) return "terminada";
  if (Date.parse(promo.fechaInicio) > t) return "programada";
  return "activa";
}

export type PrecioConPromo = {
  /** Precio que paga el cliente hoy. */
  precio: number;
  /** Precio de lista, si hay descuento (para mostrarlo tachado). */
  precioAntes: number | null;
  /** Porcentaje aplicado, si hay descuento. */
  porcentaje: number | null;
};

/**
 * Precio de un producto con la mejor promo activa por colección (su categoría) o por producto.
 * Los códigos no cuentan aquí: se aplican al total del pedido.
 */
export function precioConPromo(producto: Producto, promos: Promo[], ahora: Date = new Date()): PrecioConPromo {
  let mejor = 0;
  for (const promo of promos) {
    if (promo.tiendaId !== producto.tiendaId || !promo.valorPorcentaje) continue;
    if (estadoPromo(promo, ahora) !== "activa") continue;
    const aplica =
      (promo.tipo === "coleccion" && promo.coleccion != null && promo.coleccion === producto.categoria) ||
      (promo.tipo === "producto" && promo.productoId === producto.id);
    if (aplica && promo.valorPorcentaje > mejor) mejor = promo.valorPorcentaje;
  }
  if (mejor === 0) return { precio: producto.precio, precioAntes: null, porcentaje: null };
  return {
    precio: producto.precio - Math.round((producto.precio * mejor) / 100),
    precioAntes: producto.precio,
    porcentaje: mejor,
  };
}
