// El "almacén" de la demo: la forma de los datos en memoria y cómo se arma desde el seed.
// Nada fuera de lib/data/ importa este archivo.

import type { Cliente, EventoAaah, Pedido, PedidoItem, Producto, Promo, Tienda, Usuario } from "../types";
import { aCliente, type FilaCliente } from "./clientes";
import { aPedido, aPedidoItem, type FilaPedido, type FilaPedidoItem } from "./pedidos";
import { aProducto, type FilaProducto } from "./productos";
import { aPromo, type FilaPromo } from "./promos";
import { aEventoAaah, type FilaEventoAaah } from "./resumen";
import { aTienda, aUsuario, type FilaTienda, type FilaUsuario } from "./tiendas";

import seedClientes from "./seed/clientes.json";
import seedEventos from "./seed/eventos_aaah.json";
import seedMeta from "./seed/meta.json";
import seedPedidoItems from "./seed/pedido_items.json";
import seedPedidos from "./seed/pedidos.json";
import seedProductos from "./seed/productos.json";
import seedPromos from "./seed/promos.json";
import seedTiendas from "./seed/tiendas.json";
import seedUsuarios from "./seed/usuarios.json";

export type DB = {
  tiendas: Tienda[];
  usuarios: Usuario[];
  productos: Producto[];
  pedidos: Pedido[];
  pedidoItems: PedidoItem[];
  clientes: Cliente[];
  promos: Promo[];
  eventosAaah: EventoAaah[];
};

/** Corrige una fecha del seed para que la demo siempre se sienta "de esta semana". */
export type AjusteFecha = (iso: string) => string;

/**
 * Arma la base de la demo desde lib/data/seed/*.json.
 * Las fechas del seed están escritas respecto a `meta.fecha_referencia`; aquí se desplazan
 * para que esa referencia sea "ahora" (si no, en un mes la semana del Resumen estaría vacía).
 */
export function construirDesdeSeed(ahora: number = Date.now()): DB {
  const desfase = ahora - Date.parse(seedMeta.fecha_referencia);
  const fecha: AjusteFecha = (iso) => new Date(Date.parse(iso) + desfase).toISOString();

  return {
    tiendas: (seedTiendas as FilaTienda[]).map((f) => aTienda(f, fecha)),
    usuarios: (seedUsuarios as FilaUsuario[]).map(aUsuario),
    productos: (seedProductos as FilaProducto[]).map((f) => aProducto(f, fecha)),
    pedidos: (seedPedidos as FilaPedido[]).map((f) => aPedido(f, fecha)),
    pedidoItems: (seedPedidoItems as FilaPedidoItem[]).map(aPedidoItem),
    clientes: (seedClientes as FilaCliente[]).map((f) => aCliente(f, fecha)),
    promos: (seedPromos as FilaPromo[]).map((f) => aPromo(f, fecha)),
    eventosAaah: (seedEventos as FilaEventoAaah[]).map((f) => aEventoAaah(f, fecha)),
  };
}

/** Comprobación mínima de que lo guardado en localStorage tiene la forma esperada. */
export function esDB(valor: unknown): valor is DB {
  if (!valor || typeof valor !== "object") return false;
  const db = valor as Record<string, unknown>;
  return ["tiendas", "usuarios", "productos", "pedidos", "pedidoItems", "clientes", "promos", "eventosAaah"].every((k) =>
    Array.isArray(db[k]),
  );
}

/** UUID v4. `crypto.randomUUID` solo existe en contextos seguros (https / localhost). */
export function nuevoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
