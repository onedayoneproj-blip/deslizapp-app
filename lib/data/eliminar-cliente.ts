import type { DB } from "./db";

/** Borra el contacto y conserva o elimina su historial según la elección explícita. */
export function eliminarClienteDeDB(db: DB, tiendaId: string, id: string, borrarPedidos = false): DB {
  const actual = db.clientes.find((c) => c.id === id && c.tiendaId === tiendaId);
  if (!actual) throw new Error("contacto_no_encontrado");
  const pedidosDelCliente = new Set(db.pedidos.filter((p) => p.clienteId === id && p.tiendaId === tiendaId).map((p) => p.id));
  return {
    ...db,
    clientes: db.clientes.filter((c) => !(c.id === id && c.tiendaId === tiendaId)),
    pedidos: borrarPedidos
      ? db.pedidos.filter((p) => !pedidosDelCliente.has(p.id))
      : db.pedidos.map((p) => (p.clienteId === id && p.tiendaId === tiendaId ? { ...p, clienteId: null } : p)),
    pedidoItems: borrarPedidos ? db.pedidoItems.filter((i) => !pedidosDelCliente.has(i.pedidoId)) : db.pedidoItems,
    abonos: borrarPedidos ? db.abonos.filter((a) => !pedidosDelCliente.has(a.pedidoId)) : db.abonos,
  };
}
