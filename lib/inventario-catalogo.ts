// Salud del inventario de los productos VISIBLES del catálogo (dona de la lista y hoja "Tu inventario").
// Puro, con pruebas en tests/inventario-catalogo.test.mjs.

import { STOCK_BAJO } from "./config.ts";

export type ProductoInventario = {
  activo: boolean;
  stock: number | null;
  /** Con opciones: los ejes y las variantes (el stock vive en ellas; `stock` es la suma). */
  opciones?: { nombre: string; valores: string[] }[];
  variantes?: { id?: string; valores: Record<string, string>; stock: number | null; activa: boolean }[];
};

const activasDe = (p: ProductoInventario) => (p.variantes ?? []).filter((v) => v.activa);

/**
 * El stock que cuenta para la salud (docs/12 §2): sin variantes, el del producto. Con variantes: 0 (agotado) si todas están en 0;
 * el menor entre 1 y 2 (queda 1 o 2) si alguna tiene 1 o 2; si no, la suma. Si alguna variante no lleva control, null.
 */
export function stockParaSalud(p: ProductoInventario): number | null {
  const activas = activasDe(p);
  if (activas.length === 0) return p.stock;
  if (activas.some((v) => v.stock === null)) return null;
  if (activas.every((v) => v.stock === 0)) return 0;
  const bajas = activas.filter((v) => v.stock! > 0 && v.stock! <= STOCK_BAJO).map((v) => v.stock!);
  if (bajas.length > 0) return Math.min(...bajas);
  return activas.reduce((s, v) => s + v.stock!, 0);
}

/** El texto de una variante en el orden de los ejes ("L · Arena"). */
export const textoDeVariante = (opciones: { nombre: string }[] | undefined, valores: Record<string, string>) =>
  (opciones ?? []).map((o) => valores[o.nombre]).filter(Boolean).join(" · ") || Object.values(valores).join(" · ");

/**
 * La situación corta de las variantes, para la segunda línea del inventario (tablero «Inventario»): lo agotado va resaltado
 * ("50 ml agotado", "L · Arena agotada", "3 agotadas") y después "queda 1 de 100 ml" o "11 en total". null si no tiene variantes
 * o si no hay nada que contar (sin control de stock).
 */
export function situacionVariantes(p: ProductoInventario): { resaltado: string | null; resto: string } | null {
  const activas = activasDe(p);
  if (activas.length === 0 || activas.some((v) => v.stock === null)) return null;
  const total = activas.reduce((s, v) => s + v.stock!, 0);
  const agotadas = activas.filter((v) => v.stock === 0);
  const quedan = activas.filter((v) => v.stock! > 0 && v.stock! <= STOCK_BAJO);
  // "Talla" es femenino (L agotada); "Tamaño", "Color", "Sabor"… masculinos (50 ml agotado).
  const femenino = /a$/i.test(p.opciones?.[0]?.nombre ?? "");
  const resaltado =
    agotadas.length === 0
      ? null
      : agotadas.length > 2
        ? `${agotadas.length} agotadas`
        : `${agotadas.map((v) => textoDeVariante(p.opciones, v.valores)).join(" y ")} ${agotadas.length === 1 ? (femenino ? "agotada" : "agotado") : femenino ? "agotadas" : "agotados"}`;
  const resto =
    quedan.length === 1 && agotadas.length <= 1
      ? `queda${quedan[0]!.stock === 1 ? "" : "n"} ${quedan[0]!.stock} de ${textoDeVariante(p.opciones, quedan[0]!.valores)}`
      : `${total} en total`;
  return { resaltado, resto };
}

/** Etiqueta de la tarjeta: conserva el total, y con variantes señala las que están bajas o agotadas. */
export function etiquetaStock(p: ProductoInventario): { texto: string; tono: "neutro" | "exito" | "atencion" | "fuerte" } {
  const activas = activasDe(p);
  const sinControl = activas.length ? activas.some(v => v.stock === null) : p.stock === null;
  if (sinControl) return { texto: "Sin control de stock", tono: "neutro" };
  const total = activas.length ? activas.reduce((n,v) => n + v.stock!, 0) : p.stock!;
  if (total === 0) return { texto: "Agotado", tono: "fuerte" };
  const bajas = activas.length ? activas.some(v => v.stock! <= STOCK_BAJO) : total <= STOCK_BAJO;
  const variantes = situacionVariantes(p);
  const detalle = variantes && (variantes.resaltado || /de /.test(variantes.resto))
    ? [variantes.resaltado, /de /.test(variantes.resto) ? variantes.resto : null].filter(Boolean).join(" · ") : null;
  return { texto: `${total} en stock${detalle ? ` · ${detalle}` : ""}`, tono: bajas ? "atencion" : "exito" };
}

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
    const stock = stockParaSalud(p);
    if (stock === null || stock > STOCK_BAJO) conStock++;
    else if (stock > 0) quedan++;
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
  const agotados = productos.filter((p) => stockParaSalud(p) === 0);
  const vendidos = agotados
    .filter((p) => ventas.get(p.id)?.ultima)
    .sort((a, b) => porUltimaVenta(ventas.get(a.id)!, ventas.get(b.id)!) || alfabetico(a, b))
    .map((p) => linea(p, true));
  const sinVentas = agotados
    .filter((p) => !ventas.get(p.id)?.ultima)
    .sort(alfabetico)
    .map((p) => linea(p, false));
  // Se están acabando: les queda 1 o 2, o (con variantes) alguna ya se agotó aunque haya de otras.
  const parcial = (p: P) => activasDe(p).some((v) => v.stock === 0) && stockParaSalud(p) !== 0;
  const seAcaban = productos
    .filter((p) => {
      const s = stockParaSalud(p);
      return p.activo && s !== null && ((s > 0 && s <= STOCK_BAJO) || parcial(p));
    })
    .sort((a, b) => (stockParaSalud(a) ?? 0) - (stockParaSalud(b) ?? 0) || alfabetico(a, b))
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

/** Una fila de "Por reponer": el producto, o una de sus variantes (con variantes, se repone por variante). */
export type LineaReponer<P> = LineaPorReponer<P> & {
  /** Lo que identifica la fila (y lo marcado): el id del producto, o "producto:variante". */
  clave: string;
  varianteId: string | null;
  varianteTexto: string | null;
  /** El stock de la fila (el de la variante, si la hay). */
  stock: number | null;
};

/**
 * Las filas para reponer: un producto sin variantes es una fila; uno con variantes, una fila por cada variante agotada o con 1
 * o 2 (las agotadas primero). Una variante agotada de un producto preseleccionado viene marcada, de a 1.
 */
export function lineasDeReposicion<P extends ProductoBase>(lineas: LineaPorReponer<P>[]): LineaReponer<P>[] {
  return lineas.flatMap((l): LineaReponer<P>[] => {
    const activas = activasDe(l.producto).filter((v) => v.stock !== null && v.stock <= STOCK_BAJO && v.id);
    if (activasDe(l.producto).length === 0 || activas.length === 0) {
      return [{ ...l, clave: l.producto.id, varianteId: null, varianteTexto: null, stock: l.producto.stock }];
    }
    return activas
      .sort((a, b) => a.stock! - b.stock!)
      .map((v) => ({
        ...l,
        clave: `${l.producto.id}:${v.id}`,
        varianteId: v.id!,
        varianteTexto: textoDeVariante(l.producto.opciones, v.valores),
        stock: v.stock,
        sugerida: 1,
        preseleccionado: l.preseleccionado && v.stock === 0,
      }));
  });
}

/** Lo que viene marcado al abrir "Por reponer" (por clave de fila): los vendidos y agotados, con su cantidad sugerida. */
export function seleccionInicial<P extends ProductoBase>(r: PorReponer<P>): Record<string, number> {
  const marcados: Record<string, number> = {};
  for (const l of lineasDeReposicion([...r.vendidos, ...r.sinVentas, ...r.seAcaban])) {
    if (l.preseleccionado) marcados[l.clave] = l.sugerida;
  }
  return marcados;
}

/** El producto de una clave de "Por reponer" ("producto:variante" → "producto"). */
export const productoDeClave = (clave: string) => clave.split(":")[0]!;

/** La lectura del momento junto a la dona de "Tu inventario": título y línea secundaria (la línea puede faltar). */
export function lecturaInventario(s: Pick<SaludInventario, "quedan" | "agotados">): { titulo: string; linea: string | null } {
  const titulo = s.quedan === 0 ? "Todo con buen stock" : s.quedan === 1 ? "1 se está acabando" : `${s.quedan} se están acabando`;
  const linea = s.agotados === 0 ? null : s.agotados === 1 ? "1 ya se agotó" : `${s.agotados} ya se agotaron`;
  return { titulo, linea };
}

/** Porcentaje entero de `parte` sobre `total` (0 si no hay total). */
export const porcentajeDe = (parte: number, total: number) => (total > 0 ? Math.round((100 * parte) / total) : 0);
