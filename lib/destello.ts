// Un aviso de una sola vez entre pantallas: "señala los pasos del pedido cuando abra su detalle". Vive en memoria (no en la
// dirección) para no ensuciar la URL; se consume al usarlo.

let pedidoPendiente: string | null = null;

/** El editor lo pide antes de volver al detalle del pedido. */
export function pedirDestelloDePasos(pedidoId: string) {
  pedidoPendiente = pedidoId;
}

/** El detalle lo consume al abrirse: true una sola vez para ese pedido. */
export function consumirDestelloDePasos(pedidoId: string): boolean {
  if (pedidoPendiente !== pedidoId) return false;
  pedidoPendiente = null;
  return true;
}
