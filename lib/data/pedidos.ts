import type { Cliente, EstadoPedido, OrigenPedido, Pedido, PedidoConItems, PedidoItem } from "../types";
import type { AjusteFecha, DB } from "./db";

export type FilaPedido = {
  id: string;
  tienda_id: string;
  cliente_id: string | null;
  origen: string;
  estado: string;
  total: number;
  codigo_promo: string | null;
  creado_en: string;
  despachado_en: string | null;
};

export type FilaPedidoItem = {
  id: string;
  pedido_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
};

export function aPedido(f: FilaPedido, fecha: AjusteFecha): Pedido {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    clienteId: f.cliente_id,
    origen: f.origen as OrigenPedido,
    estado: f.estado as EstadoPedido,
    total: f.total,
    codigoPromo: f.codigo_promo,
    creadoEn: fecha(f.creado_en),
    despachadoEn: f.despachado_en == null ? null : fecha(f.despachado_en),
  };
}

export function aPedidoItem(f: FilaPedidoItem): PedidoItem {
  return {
    id: f.id,
    pedidoId: f.pedido_id,
    productoId: f.producto_id,
    nombreProducto: f.nombre_producto,
    cantidad: f.cantidad,
    precioUnitario: f.precio_unitario,
  };
}

function conItems(db: DB, pedido: Pedido): PedidoConItems {
  return { ...pedido, items: db.pedidoItems.filter((i) => i.pedidoId === pedido.id) };
}

/** Pedidos de una tienda con sus ítems, del más reciente al más viejo. */
export function pedidosDeTienda(db: DB, tiendaId: string): PedidoConItems[] {
  return db.pedidos
    .filter((p) => p.tiendaId === tiendaId)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
    .map((p) => conItems(db, p));
}

export function pedidoDeTienda(db: DB, tiendaId: string, id: string): PedidoConItems | null {
  const pedido = db.pedidos.find((p) => p.id === id && p.tiendaId === tiendaId);
  return pedido ? conItems(db, pedido) : null;
}

// ---- Simulación de un pedido que "llega del catálogo" (el catálogo real aún no está conectado) ----

const NOMBRES_NUEVOS = [
  "Daniela Rosario",
  "Kelvin Batista",
  "Nicole Jiménez",
  "Starlin Féliz",
  "Gabriela Núñez",
  "José Manuel Cruz",
  "Laura Encarnación",
  "Rafael Durán",
];

type Azar = () => number;

function elegir<T>(lista: T[], azar: Azar): T {
  return lista[Math.floor(azar() * lista.length)]!;
}

/**
 * Crea un pedido `nuevo` con origen `catalogo`, con 1–3 productos activos al azar de la tienda.
 * La mitad de las veces lo hace un cliente del catálogo que ya existe; la otra, uno nuevo.
 */
export function insertarPedidoSimulado(db: DB, tiendaId: string, azar: Azar, nuevoId: () => string, ahora: string) {
  const disponibles = db.productos.filter((p) => p.tiendaId === tiendaId && p.activo);
  if (disponibles.length === 0) throw new Error("No hay productos activos para armar un pedido.");

  const cantidadProductos = Math.min(disponibles.length, 1 + Math.floor(azar() * 3));
  const elegidos = [...disponibles].sort(() => azar() - 0.5).slice(0, cantidadProductos);

  const pedidoId = nuevoId();
  const items: PedidoItem[] = elegidos.map((p) => ({
    id: nuevoId(),
    pedidoId,
    productoId: p.id,
    nombreProducto: p.nombre,
    cantidad: azar() < 0.2 ? 2 : 1,
    precioUnitario: p.precio,
  }));

  const delCatalogo = db.clientes.filter((c) => c.tiendaId === tiendaId && c.origen === "catalogo");
  let clientes = db.clientes;
  let cliente: Cliente;
  if (delCatalogo.length > 0 && azar() < 0.5) {
    const existente = elegir(delCatalogo, azar);
    cliente = { ...existente, pedidosCount: existente.pedidosCount + 1 };
    clientes = clientes.map((c) => (c.id === cliente.id ? cliente : c));
  } else {
    const usados = new Set(db.clientes.filter((c) => c.tiendaId === tiendaId).map((c) => c.nombre));
    const libres = NOMBRES_NUEVOS.filter((n) => !usados.has(n));
    const nombre = libres.length > 0 ? elegir(libres, azar) : `${elegir(NOMBRES_NUEVOS, azar)} (${usados.size + 1})`;
    cliente = {
      id: nuevoId(),
      tiendaId,
      nombre,
      telefono: `+1809555${String(Math.floor(azar() * 10000)).padStart(4, "0")}`,
      origen: "catalogo",
      primerPedidoEn: ahora,
      pedidosCount: 1,
    };
    clientes = [...clientes, cliente];
  }

  const pedido: Pedido = {
    id: pedidoId,
    tiendaId,
    clienteId: cliente.id,
    origen: "catalogo",
    estado: "nuevo",
    total: items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0),
    codigoPromo: null,
    creadoEn: ahora,
    despachadoEn: null,
  };

  return {
    db: { ...db, pedidos: [...db.pedidos, pedido], pedidoItems: [...db.pedidoItems, ...items], clientes },
    pedido: { ...pedido, items } satisfies PedidoConItems,
    cliente,
  };
}
