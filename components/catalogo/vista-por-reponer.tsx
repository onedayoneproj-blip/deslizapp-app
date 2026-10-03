"use client";

import type { VentasProducto } from "@/lib/inventario-catalogo";
import type { Producto } from "@/lib/types";

export function VistaPorReponer(props: { productos: Producto[]; ventas: Map<string, VentasProducto>; marcados: Record<string, number> | null; alCambiarMarcados: (m: Record<string, number> | null) => void; alTerminar: () => void }) {
  void props;
  return null;
}
