"use client";

import type { VentasProducto } from "@/lib/inventario-catalogo";
import type { Producto } from "@/lib/types";

export function VistaHacerEspacio(props: { productos: Producto[]; ventas: Map<string, VentasProducto>; enReposicion: Record<string, number> | null; alTerminar: () => void }) {
  void props;
  return null;
}
