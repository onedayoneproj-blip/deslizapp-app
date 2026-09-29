import { estadoPromo, precioConPromo } from "../promos";
import type { Cliente, EstadoPedido, OrigenPedido, Pedido, PedidoConItems, PedidoItem, Promo } from "../types";
import { normalizarTelefonoDO } from "../telefono";
import { clientePorTelefono } from "./clientes";
import type { AjusteFecha, DB } from "./db";

export type FilaPedido = {
  id: string;
  tienda_id: string;
  numero: number;
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
    numero: f.numero,
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

/** Siguiente número de pedido de la tienda (#1043 después de #1042). En Supabase: secuencia por tienda. */
export function siguienteNumeroPedido(db: DB, tiendaId: string): number {
  const numeros = db.pedidos.filter((p) => p.tiendaId === tiendaId).map((p) => p.numero);
  return numeros.length > 0 ? Math.max(...numeros) + 1 : 1001;
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
    // Snapshot del precio que vio el cliente, ya con la promo de colección/producto vigente
    precioUnitario: precioConPromo(p, db.promos, new Date(ahora)).precio,
  }));

  const delCatalogo = db.clientes.filter((c) => c.tiendaId === tiendaId && c.origen === "catalogo");
  let clientes = db.clientes;
  let cliente: Cliente;
  if (delCatalogo.length > 0 && azar() < 0.5) {
    cliente = elegir(delCatalogo, azar);
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
    };
    clientes = [...clientes, cliente];
  }

  const pedido: Pedido = {
    id: pedidoId,
    tiendaId,
    numero: siguienteNumeroPedido(db, tiendaId),
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

// ---- Cambios de estado ----

/** Un producto del pedido no tiene stock para despacharlo (nunca se deja el stock en negativo). */
export class StockInsuficiente extends Error {
  constructor(
    public productoId: string,
    public producto: string,
    public disponibles: number,
    public necesarios: number,
  ) {
    super(`No alcanza el stock de ${producto}: hay ${disponibles}, se necesitan ${necesarios}.`);
  }
}

function pedidoParaCambiar(db: DB, tiendaId: string, id: string): Pedido {
  const pedido = db.pedidos.find((p) => p.id === id && p.tiendaId === tiendaId);
  if (!pedido) throw new Error("Ese pedido no es de esta tienda.");
  return pedido;
}

function reemplazarPedido(db: DB, pedido: Pedido): DB {
  return { ...db, pedidos: db.pedidos.map((p) => (p.id === pedido.id ? pedido : p)) };
}

/** Confirmar (nuevo → por_despachar) o cancelar (nuevo / por_despachar → cancelado). */
export function cambiarEstadoPedido(db: DB, tiendaId: string, id: string, estado: "por_despachar" | "cancelado") {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  const permitido = estado === "por_despachar" ? actual.estado === "nuevo" : actual.estado === "nuevo" || actual.estado === "por_despachar";
  if (!permitido) throw new Error("Ese pedido ya no puede cambiar a ese estado.");
  const pedido: Pedido = { ...actual, estado };
  return { db: reemplazarPedido(db, pedido), pedido: conItems(db, pedido) };
}

/**
 * Despacha un pedido por_despachar: registra `despachadoEn` y descuenta el stock de cada producto
 * según la cantidad. `stock = null` no se descuenta. Si algún producto no alcanza, lanza
 * StockInsuficiente y no cambia nada. Devuelve los nombres de los productos que quedaron en 0.
 */
export function despacharPedido(db: DB, tiendaId: string, id: string, ahora: string) {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (actual.estado !== "por_despachar") throw new Error("Solo se despachan pedidos que están por despachar.");
  const items = db.pedidoItems.filter((i) => i.pedidoId === id);

  // Suma por producto (un pedido podría repetir el mismo producto en dos líneas).
  const necesarios = new Map<string, number>();
  for (const i of items) necesarios.set(i.productoId, (necesarios.get(i.productoId) ?? 0) + i.cantidad);

  const agotados: string[] = [];
  const productos = db.productos.map((p) => {
    const cantidad = necesarios.get(p.id);
    if (cantidad === undefined || p.tiendaId !== tiendaId || p.stock === null) return p;
    if (p.stock < cantidad) throw new StockInsuficiente(p.id, p.nombre, p.stock, cantidad);
    if (p.stock - cantidad === 0) agotados.push(p.nombre);
    return { ...p, stock: p.stock - cantidad, actualizadoEn: ahora };
  });

  const pedido: Pedido = { ...actual, estado: "despachado", despachadoEn: ahora };
  return { db: { ...reemplazarPedido(db, pedido), productos }, pedido: conItems(db, pedido), agotados };
}

// ---- Pedido manual ----

export type DatosPedidoManual = {
  /** Cliente que ya existe… */
  clienteId?: string;
  /** …o uno nuevo. */
  clienteNuevo?: { nombre: string; telefono: string };
  items: { productoId: string; cantidad: number }[];
  /** Código de promo que usó el cliente (opcional). */
  codigo?: string;
};

/** La promo de tipo código vigente que coincide con lo escrito (sin importar mayúsculas), si hay. */
export function buscarCodigoPromo(promos: Promo[], tiendaId: string, codigo: string, ahora: Date = new Date()): Promo | null {
  const limpio = codigo.trim().toUpperCase();
  if (!limpio) return null;
  return (
    promos.find(
      (p) => p.tiendaId === tiendaId && p.tipo === "codigo" && p.codigo?.toUpperCase() === limpio && estadoPromo(p, ahora) === "activa",
    ) ?? null
  );
}

/** Descuento (en pesos) de un código sobre un subtotal. */
export const descuentoDeCodigo = (promo: Promo | null, subtotal: number) =>
  promo?.valorPorcentaje ? Math.round((subtotal * promo.valorPorcentaje) / 100) : 0;

/**
 * Crea un pedido manual directo en `por_despachar`, con el siguiente número de la tienda.
 * Los precios son los de hoy (con promo de colección o de producto) y el código, si es válido,
 * se descuenta del total.
 */
export function insertarPedidoManual(db: DB, tiendaId: string, datos: DatosPedidoManual, nuevoId: () => string, ahora: string) {
  const lineas = datos.items.filter((i) => i.cantidad > 0);
  if (lineas.length === 0) throw new Error("El pedido necesita al menos un producto.");

  const pedidoId = nuevoId();
  const items: PedidoItem[] = lineas.map((l) => {
    const producto = db.productos.find((p) => p.id === l.productoId && p.tiendaId === tiendaId);
    if (!producto) throw new Error("Ese producto no es de esta tienda.");
    return {
      id: nuevoId(),
      pedidoId,
      productoId: producto.id,
      nombreProducto: producto.nombre,
      cantidad: l.cantidad,
      precioUnitario: precioConPromo(producto, db.promos, new Date(ahora)).precio,
    };
  });
  const subtotal = items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0);
  const promo = datos.codigo ? buscarCodigoPromo(db.promos, tiendaId, datos.codigo, new Date(ahora)) : null;

  let clientes = db.clientes;
  let cliente: Cliente;
  if (datos.clienteId) {
    const existente = db.clientes.find((c) => c.id === datos.clienteId && c.tiendaId === tiendaId);
    if (!existente) throw new Error("Ese cliente no es de esta tienda.");
    cliente = existente;
  } else if (datos.clienteNuevo?.nombre.trim()) {
    const telefono = normalizarTelefonoDO(datos.clienteNuevo.telefono) ?? (datos.clienteNuevo.telefono.replace(/[^\d+]/g, "") || null);
    const mismo = clientePorTelefono(db, tiendaId, telefono);
    // Si ese WhatsApp ya es de un cliente de la tienda, el pedido es de esa persona (no se duplica).
    cliente = mismo ?? {
      id: nuevoId(),
      tiendaId,
      nombre: datos.clienteNuevo.nombre.trim(),
      telefono,
      origen: "manual",
      primerPedidoEn: ahora,
    };
    if (!mismo) clientes = [...clientes, cliente];
  } else {
    throw new Error("El pedido necesita un cliente.");
  }

  const pedido: Pedido = {
    id: pedidoId,
    tiendaId,
    numero: siguienteNumeroPedido(db, tiendaId),
    clienteId: cliente.id,
    origen: "manual",
    estado: "por_despachar",
    total: subtotal - descuentoDeCodigo(promo, subtotal),
    codigoPromo: promo?.codigo ?? null,
    creadoEn: ahora,
    despachadoEn: null,
  };
  return { db: { ...db, pedidos: [...db.pedidos, pedido], pedidoItems: [...db.pedidoItems, ...items], clientes }, pedido: { ...pedido, items } satisfies PedidoConItems, cliente };
}
