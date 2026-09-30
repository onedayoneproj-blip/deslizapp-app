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

let filtroDebenPendiente = false;

/** Inicio pide abrir Clientes con el filtro "Deben". */
export function pedirClientesQueDeben() {
  filtroDebenPendiente = true;
}

/** ¿Hay un pedido pendiente de abrir "Deben"? (No lo consume: Clientes lo mira al armarse y lo consume al montarse.) */
export function hayClientesQueDeben(): boolean {
  return filtroDebenPendiente;
}

/** Clientes lo consume al abrirse: true una sola vez. */
export function consumirClientesQueDeben(): boolean {
  const pedido = filtroDebenPendiente;
  filtroDebenPendiente = false;
  return pedido;
}

let revisionPendiente = false;

/** Inicio pide abrir la revisión del catálogo al llegar a la pestaña Catálogo. */
export function pedirRevisionDelCatalogo() {
  revisionPendiente = true;
}

/** La pestaña Catálogo lo consume al abrirse: true una sola vez. */
export function consumirRevisionDelCatalogo(): boolean {
  const pedida = revisionPendiente;
  revisionPendiente = false;
  return pedida;
}
