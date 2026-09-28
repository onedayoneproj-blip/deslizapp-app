import type { Cliente, OrigenPedido } from "../types";
import type { AjusteFecha, DB } from "./db";

export type FilaCliente = {
  id: string;
  tienda_id: string;
  nombre: string;
  telefono: string | null;
  origen: string;
  primer_pedido_en: string;
  pedidos_count: number;
};

export function aCliente(f: FilaCliente, fecha: AjusteFecha): Cliente {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    nombre: f.nombre,
    telefono: f.telefono,
    origen: f.origen as OrigenPedido,
    primerPedidoEn: fecha(f.primer_pedido_en),
    pedidosCount: f.pedidos_count,
  };
}

/** Clientes de una tienda, en orden alfabético. */
export function clientesDeTienda(db: DB, tiendaId: string): Cliente[] {
  return db.clientes.filter((c) => c.tiendaId === tiendaId).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function clienteDeTienda(db: DB, tiendaId: string, id: string): Cliente | null {
  return db.clientes.find((c) => c.id === id && c.tiendaId === tiendaId) ?? null;
}
