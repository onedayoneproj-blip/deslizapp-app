import type { PedidoConItems, SolicitudPedido } from "./types";

/** Trabajo pendiente, no ventas: solo Nuevos y solicitudes vigentes de la tienda. */
export function pendientesPedidos(
  pedidos: PedidoConItems[], solicitudes: SolicitudPedido[], tiendaId: string, ahora: number,
) {
  const nuevos = pedidos.filter((p) => p.tiendaId === tiendaId && p.estado === "nuevo").length;
  const porRegistrar = solicitudes.filter((s) => s.tiendaId === tiendaId && !s.pedidoId && !s.descartadaEn && Date.parse(s.venceEn) > ahora).length;
  return { nuevos, porRegistrar, total: nuevos + porRegistrar };
}

export function textoPendientes({ nuevos, porRegistrar }: { nuevos: number; porRegistrar: number }) {
  return `${nuevos} ${nuevos === 1 ? "pedido registrado nuevo" : "pedidos registrados nuevos"} y ${porRegistrar} ${porRegistrar === 1 ? "solicitud del catálogo por registrar" : "solicitudes del catálogo por registrar"}`;
}
