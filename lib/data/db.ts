// El "almacén" de la demo: la forma de los datos en memoria y cómo se arma desde el seed.
// Nada fuera de lib/data/ importa este archivo.

import { MARCA_NEUTRA } from "../marca";
import type { Cliente, EventoAaah, Pedido, PedidoItem, Producto, Promo, Tienda, Usuario } from "../types";
import {
  aCliente,
  aEventoAaah,
  aPedido,
  aPedidoItem,
  aProducto,
  aPromo,
  aTienda,
  aUsuario,
  type AjusteFecha,
  type FilaCliente,
  type FilaEventoAaah,
  type FilaPedido,
  type FilaPedidoItem,
  type FilaProducto,
  type FilaPromo,
  type FilaTienda,
  type FilaUsuario,
} from "./filas";

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

/**
 * Migración suave de lo guardado en localStorage: datos de versiones anteriores sin campos nuevos
 * (ej. `nota` de clientes) siguen funcionando, con esos campos en su valor vacío. No hace falta reiniciar.
 */
export function migrar(db: DB): DB {
  return {
    ...db,
    clientes: db.clientes.map((c) => ({ ...c, nota: c.nota ?? null })),
    // Promos guardadas antes del límite de usos y la pausa
    promos: db.promos.map((p) => ({ ...p, limiteUsos: p.limiteUsos ?? null, pausada: p.pausada ?? false })),
    // Mi marca: tiendas guardadas antes de que existiera, con la paleta neutra (nunca el verde de Deslizapp)
    tiendas: db.tiendas.map((t) => ({
      ...t,
      marcaColorPrincipal: t.marcaColorPrincipal ?? MARCA_NEUTRA.principal,
      marcaColorAcento: t.marcaColorAcento ?? MARCA_NEUTRA.acento,
      marcaEstilo: t.marcaEstilo ?? MARCA_NEUTRA.estilo,
      urlCatalogo: t.urlCatalogo ?? null,
    })),
  };
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
