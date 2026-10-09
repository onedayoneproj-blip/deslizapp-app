// "Despachar pedido" con un cambio de pago pendiente ("Cambiar a crédito" elegido en la hoja, sin guardar todavía).
// En la base, despachar (RPC `despachar_pedido`) y cambiar el pago (update de `pedidos`) son dos operaciones; aquí se hacen como
// una sola para quien usa la app: primero el pago, luego el despacho, y si despachar falla se devuelve el pago a como estaba.

import type { DatosPago } from "../credito";
import type { PedidoConItems } from "../types";

type Operaciones = {
  cambiarPagoPedido(tiendaId: string, id: string, datos: DatosPago): Promise<PedidoConItems>;
  despacharPedido(tiendaId: string, id: string): Promise<{ pedido: PedidoConItems; agotados: string[] }>;
};

/** Los datos que devuelven el pedido a su pago de antes (solo hay un cambio pendiente si no tenía abonos). */
export function pagoOriginal(pedido: Pick<PedidoConItems, "pagoModo" | "pagoFechaAcordada">): DatosPago {
  return pedido.pagoModo === "credito" ? { pagoModo: "credito", pagoFechaAcordada: pedido.pagoFechaAcordada } : { pagoModo: "contado" };
}

/**
 * Aplica `pago` y despacha. Si el pago no se puede guardar, no se despacha. Si despachar falla, el pago vuelve a como estaba
 * (`antes`) y se relanza el error de despachar, así el pedido no queda a medias (a crédito sin despachar).
 */
export async function despacharConPago(
  datos: Operaciones,
  tiendaId: string,
  pedido: Pick<PedidoConItems, "id" | "pagoModo" | "pagoFechaAcordada">,
  pago: DatosPago | null,
) {
  if (!pago) return datos.despacharPedido(tiendaId, pedido.id);
  await datos.cambiarPagoPedido(tiendaId, pedido.id, pago);
  try {
    return await datos.despacharPedido(tiendaId, pedido.id);
  } catch (error) {
    await datos.cambiarPagoPedido(tiendaId, pedido.id, pagoOriginal(pedido)).catch(() => undefined);
    throw error;
  }
}
