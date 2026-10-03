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
