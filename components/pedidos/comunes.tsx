import type { EstadoPedido } from "@/lib/types";

/** Etiqueta de estado (docs/04-pantallas.md): Nuevo Mandarina, Por despachar Rosa, Despachado Verde, Cancelado arena. */
export const ESTADO_PEDIDO: Record<EstadoPedido, { texto: string; clase: string }> = {
  nuevo: { texto: "Nuevo", clase: "bg-mandarina text-bosque-oscuro" },
  por_despachar: { texto: "Por despachar", clase: "bg-rosa text-bosque" },
  despachado: { texto: "Despachado", clase: "bg-bosque text-papel" },
  cancelado: { texto: "Cancelado", clase: "bg-arena text-suave" },
};

export function ChipEstado({ estado }: { estado: EstadoPedido }) {
  const { texto, clase } = ESTADO_PEDIDO[estado];
  return <span className={`shrink-0 rounded-full px-2.5 py-[3px] text-xs font-extrabold ${clase}`}>{texto}</span>;
}
