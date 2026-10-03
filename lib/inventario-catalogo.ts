// Salud del inventario de los productos VISIBLES del catálogo (dona de la lista y hoja "Tu inventario").
// Puro, con pruebas en tests/inventario-catalogo.test.mjs.

import { STOCK_BAJO } from "./config.ts";

export type ProductoInventario = { activo: boolean; stock: number | null };

export type SaludInventario = {
  /** Con 3 o más unidades, o sin control de stock. */
  conStock: number;
  /** Les queda 1 o 2 (STOCK_BAJO). */
  quedan: number;
  /** Stock en 0. */
  agotados: number;
  /** Visibles que se pueden vender: con stock + quedan 1 o 2. */
  disponibles: number;
  /** Todos los visibles. */
  total: number;
};

/** Cuenta los productos visibles por salud de stock. Los ocultos no entran. */
export function saludDelInventario(productos: ProductoInventario[]): SaludInventario {
  let conStock = 0;
  let quedan = 0;
  let agotados = 0;
  for (const p of productos) {
    if (!p.activo) continue;
    if (p.stock === null || p.stock > STOCK_BAJO) conStock++;
    else if (p.stock > 0) quedan++;
    else agotados++;
  }
  return { conStock, quedan, agotados, disponibles: conStock + quedan, total: conStock + quedan + agotados };
}

/** "9 disponibles · 6 agotados" (sin agotados: "9 disponibles"). */
export function textoSalud(s: Pick<SaludInventario, "disponibles" | "agotados">): string {
  const disponibles = `${s.disponibles} ${s.disponibles === 1 ? "disponible" : "disponibles"}`;
  if (s.agotados === 0) return disponibles;
  return `${disponibles} · ${s.agotados} ${s.agotados === 1 ? "agotado" : "agotados"}`;
}

/** Nombre accesible de la dona: "9 productos disponibles: 9 por agotarse, 6 agotados. Ver tu inventario". */
export function etiquetaSalud(s: SaludInventario): string {
  const partes = [
    s.quedan > 0 ? `${s.quedan} por agotarse` : "",
    s.agotados > 0 ? `${s.agotados} ${s.agotados === 1 ? "agotado" : "agotados"}` : "",
  ].filter(Boolean);
  const base = `${s.disponibles} ${s.disponibles === 1 ? "producto disponible" : "productos disponibles"}`;
  return `${partes.length ? `${base}: ${partes.join(", ")}` : base}. Ver tu inventario`;
}

// ---------------------------------------------------------------------------
// Ventas, "Por reponer" y "Hacer espacio"
// ---------------------------------------------------------------------------

/** Ventana (días) para "sin movimiento" y para la cantidad sugerida al reponer. */
export const DIAS_SIN_MOVIMIENTO = 30;
const DIA_MS = 86_400_000;

type PedidoVenta = { estado: string; despachadoEn: string | null; creadoEn: string; items: { productoId: string; cantidad: number }[] };

export type VentasProducto = {
  /** ISO de la última venta (pedido despachado), o null si nunca se vendió. */
  ultima: string | null;
  /** Unidades vendidas en los últimos 30 días. */
  vendidas30: number;
};

/** Lo vendido de cada producto, a partir de los pedidos despachados. */
export function ventasPorProducto(pedidos: PedidoVenta[], ahora: number): Map<string, VentasProducto> {
  const desde = ahora - DIAS_SIN_MOVIMIENTO * DIA_MS;
  const mapa = new Map<string, VentasProducto>();
  for (const pedido of pedidos) {
    if (pedido.estado !== "despachado") continue;
    const cuando = pedido.despachadoEn ?? pedido.creadoEn;
    const ms = Date.parse(cuando);
    if (!Number.isFinite(ms)) continue;
    for (const item of pedido.items) {
      const v = mapa.get(item.productoId) ?? { ultima: null, vendidas30: 0 };
      if (v.ultima === null || ms > Date.parse(v.ultima)) v.ultima = cuando;
      if (ms >= desde) v.vendidas30 += item.cantidad;
      mapa.set(item.productoId, v);
    }
  }
  return mapa;
}

const SIN_VENTAS: VentasProducto = { ultima: null, vendidas30: 0 };
const alfabetico = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, "es");
/** Más reciente primero; sin ventas al final. */
const porUltimaVenta = (a: VentasProducto, b: VentasProducto) => (b.ultima ? Date.parse(b.ultima) : 0) - (a.ultima ? Date.parse(a.ultima) : 0);

type ProductoBase = ProductoInventario & { id: string; nombre: string };

export type LineaPorReponer<P> = {
  producto: P;
  ultimaVenta: string | null;
  /** Cantidad a pedir si se marca: lo vendido en 30 días (mínimo 1). */
  sugerida: number;
  /** Se marca de entrada: vendidos y agotados. */
  preseleccionado: boolean;
};

export type PorReponer<P> = {
  /** Agotados que ya se vendieron, del más reciente al más viejo. */
  vendidos: LineaPorReponer<P>[];
  /** Agotados que nunca se vendieron. */
  sinVentas: LineaPorReponer<P>[];
  /** Visibles a los que les queda 1 o 2 (los que se están acabando), de menos a más. */
  seAcaban: LineaPorReponer<P>[];
};

/**
 * Qué conviene reponer. Todos los agotados (visibles u ocultos) y, de los visibles, los que quedan en 1 o 2. Los productos sin
 * control de stock no entran. Orden: vendidos y agotados (última venta más reciente primero), agotados sin ventas y al final
 * los que se están acabando. Preseleccionados: los vendidos y agotados, con lo que se vendió en 30 días (mínimo 1).
 */
export function porReponer<P extends ProductoBase>(productos: P[], ventas: Map<string, VentasProducto>): PorReponer<P> {
  const linea = (producto: P, preseleccionado: boolean): LineaPorReponer<P> => {
    const v = ventas.get(producto.id) ?? SIN_VENTAS;
    return { producto, ultimaVenta: v.ultima, sugerida: Math.max(1, v.vendidas30), preseleccionado };
  };
  const agotados = productos.filter((p) => p.stock === 0);
  const vendidos = agotados
    .filter((p) => ventas.get(p.id)?.ultima)
    .sort((a, b) => porUltimaVenta(ventas.get(a.id)!, ventas.get(b.id)!) || alfabetico(a, b))
    .map((p) => linea(p, true));
  const sinVentas = agotados
    .filter((p) => !ventas.get(p.id)?.ultima)
    .sort(alfabetico)
    .map((p) => linea(p, false));
  const seAcaban = productos
    .filter((p) => p.activo && p.stock !== null && p.stock > 0 && p.stock <= STOCK_BAJO)
    .sort((a, b) => a.stock! - b.stock! || alfabetico(a, b))
    .map((p) => linea(p, false));
  return { vendidos, sinVentas, seAcaban };
}

/** El mensaje para el proveedor (se comparte con la hoja nativa o por WhatsApp). */
export function mensajeReposicion(lineas: { cantidad: number; nombre: string }[]): string {
  const filas = lineas.map((l) => `• ${l.cantidad} ${l.nombre}`);
  return ["¡Hola! Para reponer:", ...filas, "¿Me confirmas precio y cuándo llegan? ¡Gracias!"].join("\n");
}

export type CandidatosEspacio<P> = {
  /** Visibles con stock 0: se ocultan de entrada, salvo los que se van a reponer. */
  agotados: { producto: P; ultimaVenta: string | null; marcado: boolean; porReponer: boolean }[];
  /** Visibles con stock que no se venden hace 30 días (o nunca): sin marcar. */
  sinMoverse: { producto: P; ultimaVenta: string | null }[];
};

/** Productos que se pueden ocultar para hacer lugar en el plan. `enReposicion`: ids marcados en "Por reponer" en esta sesión. */
export function candidatosAEspacio<P extends ProductoBase>(
  productos: P[],
  ventas: Map<string, VentasProducto>,
  ahora: number,
  enReposicion: ReadonlySet<string> = new Set(),
): CandidatosEspacio<P> {
  const corte = ahora - DIAS_SIN_MOVIMIENTO * DIA_MS;
  const visibles = productos.filter((p) => p.activo);
  const agotados = visibles
    .filter((p) => p.stock === 0)
    .sort((a, b) => porUltimaVenta(ventas.get(a.id) ?? SIN_VENTAS, ventas.get(b.id) ?? SIN_VENTAS) || alfabetico(a, b))
    .map((producto) => ({
      producto,
      ultimaVenta: ventas.get(producto.id)?.ultima ?? null,
      marcado: !enReposicion.has(producto.id),
      porReponer: enReposicion.has(producto.id),
    }));
  const sinMoverse = visibles
    .filter((p) => p.stock !== null && p.stock > 0 && !(Date.parse(ventas.get(p.id)?.ultima ?? "") >= corte))
    .sort((a, b) => a.stock! - b.stock! || alfabetico(a, b))
    .map((producto) => ({ producto, ultimaVenta: ventas.get(producto.id)?.ultima ?? null }));
  return { agotados, sinMoverse };
}

/** Productos "sin movimiento" para la tarjeta de atención (visibles con stock y sin ventas en 30 días). */
export const sinMovimiento = <P extends ProductoBase>(productos: P[], ventas: Map<string, VentasProducto>, ahora: number) =>
  candidatosAEspacio(productos, ventas, ahora).sinMoverse;

/** Lo que viene marcado al abrir "Por reponer": los vendidos y agotados, con su cantidad sugerida. */
export function seleccionInicial(r: PorReponer<{ id: string }>): Record<string, number> {
  const marcados: Record<string, number> = {};
  for (const l of [...r.vendidos, ...r.sinVentas, ...r.seAcaban]) {
    if (l.preseleccionado) marcados[l.producto.id] = l.sugerida;
  }
  return marcados;
}
