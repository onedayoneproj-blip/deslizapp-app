import type { EstadoPedido } from "@/lib/types";
import { Etiqueta, type TonoEtiqueta } from "../ui";

/** Etiqueta de estado (docs/09 §11): Nuevo = atención (pide acción), Despachado = éxito; Por despachar y Cancelado, neutras (los distingue el texto). */
export const ESTADO_PEDIDO: Record<EstadoPedido, { texto: string; tono: TonoEtiqueta }> = {
  nuevo: { texto: "Nuevo", tono: "atencion" },
  por_despachar: { texto: "Por despachar", tono: "neutro" },
  despachado: { texto: "Despachado", tono: "exito" },
  cancelado: { texto: "Cancelado", tono: "neutro" },
};

export function ChipEstado({ estado }: { estado: EstadoPedido }) {
  const { texto, tono } = ESTADO_PEDIDO[estado];
  return <Etiqueta tono={tono}>{texto}</Etiqueta>;
}
