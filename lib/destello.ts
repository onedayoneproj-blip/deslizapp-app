// Avisos de una sola vez entre pantallas. Viven en memoria (no en la dirección) para no ensuciar la URL; se consumen al usarlos.

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
