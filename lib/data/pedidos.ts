import { conPago, resolverPago, type AbonoInicial, type DatosPago } from "../credito";
import { buscarCodigoPromo, precioConPromo, type ContextoCodigo } from "../promos";
import type { Abono, Cliente, EstadoPedido, Pedido, PedidoConItems, PedidoItem, Producto, Promo, Variante } from "../types";
import { nuevoId as nuevoIdItem, type DB } from "./db";
import { DatosInvalidos, UsarVariante, PedidoConAbonos, PedidoNoDeshacible, PedidoNoEditable, SoloCancelados, StockInsuficiente } from "./errores";
import { ordenarAbonos } from "./filas";
import { sumarStock, textoVariante } from "./productos";

export { StockInsuficiente };

/** Los abonos de un pedido, del más viejo al más nuevo. */
export const abonosDePedido = (db: DB, pedidoId: string): Abono[] => ordenarAbonos(db.abonos.filter((a) => a.pedidoId === pedidoId));

function conItems(db: DB, pedido: Pedido): PedidoConItems {
  return { ...conPago(pedido, abonosDePedido(db, pedido.id)), items: db.pedidoItems.filter((i) => i.pedidoId === pedido.id) };
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
  const items: PedidoItem[] = elegidos.map((p) => {
    // Un producto con variantes llega con una de ellas
    const activas = db.variantes.filter((v) => v.productoId === p.id && v.activa);
    const variante = activas.length > 0 ? elegir(activas, azar) : null;
    const base = variante?.precio ?? p.precio;
    return {
      id: nuevoId(),
      pedidoId,
      productoId: p.id,
      nombreProducto: p.nombre,
      cantidad: azar() < 0.2 ? 2 : 1,
      // Snapshot del precio que vio el cliente, ya con la promo de colección/producto vigente
      precioUnitario: precioConPromo({ ...p, precio: base }, db.promos, new Date(ahora)).precio,
      varianteId: variante?.id ?? null,
      varianteTexto: variante ? textoVariante(p.opciones, variante.valores) : null,
      porEncargo: false,
    };
  });

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
      nota: null,
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
    pagoModo: "contado",
    pagoFechaAcordada: null,
  };

  return {
    db: { ...db, pedidos: [...db.pedidos, pedido], pedidoItems: [...db.pedidoItems, ...items], clientes },
    pedido: { ...conPago(pedido, []), items } satisfies PedidoConItems,
    cliente,
  };
}

// ---- Cambios de estado ----

function pedidoParaCambiar(db: DB, tiendaId: string, id: string): Pedido {
  const pedido = db.pedidos.find((p) => p.id === id && p.tiendaId === tiendaId);
  if (!pedido) throw new Error("Ese pedido no es de esta tienda.");
  return pedido;
}

function reemplazarPedido(db: DB, pedido: Pedido): DB {
  return { ...db, pedidos: db.pedidos.map((p) => (p.id === pedido.id ? pedido : p)) };
}

/**
 * Cambios de estado que no tocan el stock, con los estados desde los que se permiten. Hacia adelante: confirmar
 * (nuevo → por_despachar) y cancelar (nuevo / por_despachar → cancelado). Hacia atrás: volver a Recibido
 * (por_despachar → nuevo) y reabrir (cancelado → nuevo). Despachar y deshacer el despacho mueven stock y van aparte.
 */
export const DESDE_PARA: Record<"nuevo" | "por_despachar" | "cancelado", EstadoPedido[]> = {
  nuevo: ["por_despachar", "cancelado"],
  por_despachar: ["nuevo"],
  cancelado: ["nuevo", "por_despachar"],
};

export function cambiarEstadoPedido(db: DB, tiendaId: string, id: string, estado: "nuevo" | "por_despachar" | "cancelado") {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (!DESDE_PARA[estado].includes(actual.estado)) throw new Error("Ese pedido ya no puede cambiar a ese estado.");
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
  const r = moverStockDemo(db, tiendaId, db.pedidoItems.filter((i) => i.pedidoId === id), -1, ahora);
  const pedido: Pedido = { ...actual, estado: "despachado", despachadoEn: ahora };
  return { db: { ...reemplazarPedido(db, pedido), productos: r.productos, variantes: r.variantes }, pedido: conItems(db, pedido), agotados: r.agotados };
}

/**
 * Deshace un despacho: el pedido vuelve a por_despachar sin `despachadoEn` y cada producto (o variante) con stock controlado
 * recupera lo que se descontó. Lo mismo que hace la RPC `deshacer_despacho` en Supabase.
 */
export function deshacerDespacho(db: DB, tiendaId: string, id: string, ahora: string) {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (actual.estado !== "despachado") throw new PedidoNoDeshacible();
  const r = moverStockDemo(db, tiendaId, db.pedidoItems.filter((x) => x.pedidoId === id), 1, ahora);
  const pedido: Pedido = { ...actual, estado: "por_despachar", despachadoEn: null };
  return { db: { ...reemplazarPedido(db, pedido), productos: r.productos, variantes: r.variantes }, pedido: conItems(db, pedido) };
}

type LineaStock = { productoId: string; cantidad: number; varianteId?: string | null; porEncargo?: boolean };

/**
 * Mueve el stock de unas líneas (-1 descuenta y valida, +1 devuelve), como `public.mover_stock_items`: por variante cuando la
 * línea la trae, por producto si no; un item por encargo no toca el stock. `stock = null` no se mueve. Si algo no alcanza
 * lanza StockInsuficiente (nombrando la variante) y no cambia nada. `agotados`: lo que quedó en 0.
 */
export function moverStockDemo(db: DB, tiendaId: string, lineas: LineaStock[], signo: 1 | -1, ahora: string) {
  const porVariante = new Map<string, number>();
  const porProducto = new Map<string, number>();
  for (const l of lineas) {
    if (l.porEncargo) continue;
    if (l.varianteId) porVariante.set(l.varianteId, (porVariante.get(l.varianteId) ?? 0) + l.cantidad);
    else porProducto.set(l.productoId, (porProducto.get(l.productoId) ?? 0) + l.cantidad);
  }
  const agotados: string[] = [];
  const tocados = new Set<string>();
  const variantes = db.variantes.map((v) => {
    const cantidad = porVariante.get(v.id);
    if (cantidad === undefined || v.stock === null) return v;
    const producto = db.productos.find((p) => p.id === v.productoId && p.tiendaId === tiendaId);
    if (!producto) return v;
    const nombre = `${producto.nombre} · ${textoVariante(producto.opciones, v.valores)}`;
    if (signo < 0 && v.stock < cantidad) throw new StockInsuficiente(nombre, producto.id, v.stock, cantidad);
    const stock = v.stock + signo * cantidad;
    if (signo < 0 && stock === 0) agotados.push(nombre);
    tocados.add(v.productoId);
    return { ...v, stock };
  });
  const productos = db.productos.map((p) => {
    if (tocados.has(p.id)) return { ...sumarStock(p, variantes), actualizadoEn: ahora };
    const cantidad = porProducto.get(p.id);
    if (cantidad === undefined || p.tiendaId !== tiendaId || p.stock === null) return p;
    if (signo < 0 && p.stock < cantidad) throw new StockInsuficiente(p.nombre, p.id, p.stock, cantidad);
    if (signo < 0 && p.stock - cantidad === 0) agotados.push(p.nombre);
    return { ...p, stock: p.stock + signo * cantidad, actualizadoEn: ahora };
  });
  return { productos, variantes, agotados };
}

// ---- Código de descuento de un pedido abierto ----

export const MENSAJE_CODIGO_MALO = "Ese descuento ya no se puede usar (no existe, está pausado, vencido o agotado). Elige otro o quítalo.";

/**
 * Recalcula un pedido con `codigo` (o sin código, con null): los precios unitarios salen de `precioConPromo` (la misma
 * función que usa "+ Pedido", con la promo de colección o de producto vigente) y el total es el subtotal menos el
 * descuento del código. El subtotal NO incluye el código. Lanza DatosInvalidos si el código no existe o no está activo.
 */
export function recalcularConCodigo(
  items: PedidoItem[],
  productos: Producto[],
  promos: Promo[],
  tiendaId: string,
  codigo: string | null,
  ahora: Date,
  ctx: ContextoCodigo,
  /** Las variantes de la tienda (la demo las guarda aparte); si no, las de cada producto. */
  variantes?: Variante[],
) {
  const limpio = codigo?.trim() ?? "";
  const promo = limpio ? buscarCodigoPromo(promos, tiendaId, limpio, ctx, ahora) : null;
  if (limpio && !promo) throw new DatosInvalidos(MENSAJE_CODIGO_MALO);
  const nuevos = items.map((i) => {
    const producto = productos.find((p) => p.id === i.productoId && p.tiendaId === tiendaId);
    if (!producto) return i;
    const variante = i.varianteId ? (variantes ?? producto.variantes ?? []).find((v) => v.id === i.varianteId) : undefined;
    return { ...i, precioUnitario: precioConPromo({ ...producto, precio: variante?.precio ?? producto.precio }, promos, ahora).precio };
  });
  const subtotal = nuevos.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0);
  return { items: nuevos, total: subtotal - descuentoDeCodigo(promo, subtotal), codigoPromo: promo?.codigo ?? null };
}

/** Solo mientras el pedido no está despachado ni cancelado. */
export function puedeEditarCodigo(estado: EstadoPedido) {
  return estado === "nuevo" || estado === "por_despachar";
}

const MENSAJE_CODIGO_BLOQUEADO = "El código solo se cambia antes de despachar. Usa «Volver al paso anterior» y luego edítalo.";

/** Aplica, cambia (o quita, con null) el código de un pedido `nuevo` o `por_despachar`. */
export function aplicarCodigoAlPedido(db: DB, tiendaId: string, id: string, codigo: string | null, ahora: string) {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (!puedeEditarCodigo(actual.estado)) throw new DatosInvalidos(MENSAJE_CODIGO_BLOQUEADO);
  const r = recalcularConCodigo(db.pedidoItems.filter((i) => i.pedidoId === id), db.productos, db.promos, tiendaId, codigo, new Date(ahora), {
    pedidos: db.pedidos,
    pedido: actual,
    clienteId: actual.clienteId,
  }, db.variantes);
  const pedido: Pedido = { ...actual, total: r.total, codigoPromo: r.codigoPromo };
  const porId = new Map(r.items.map((i) => [i.id, i]));
  return {
    db: { ...reemplazarPedido(db, pedido), pedidoItems: db.pedidoItems.map((i) => porId.get(i.id) ?? i) },
    pedido: { ...conPago(pedido, abonosDePedido(db, id)), items: r.items } satisfies PedidoConItems,
  };
}

// ---- Pedido manual ----

export type DatosPedidoManual = {
  /** Cliente de la tienda (si es nuevo, se crea antes con `crearCliente`). */
  clienteId: string;
  items: LineaPedida[];
  /** Código de promo que usó el cliente (opcional). */
  codigo?: string;
  /**
   * "Es una venta que ya hice": entra directo como `despachado` con esta fecha (creación y despacho). El stock solo
   * baja si `descontarStock` (la venta pudo ser anterior a cargar el inventario).
   */
  ventaPasada?: { fecha: string; descontarStock: boolean };
} & DatosPago;

/** Descuento (en pesos) de un código sobre un subtotal. */
export const descuentoDeCodigo = (promo: Promo | null, subtotal: number) =>
  promo?.valorPorcentaje ? Math.round((subtotal * promo.valorPorcentaje) / 100) : 0;

/**
 * Crea un pedido manual directo en `por_despachar`, con el siguiente número de la tienda.
 * Los precios son los de hoy (con promo de colección o de producto) y el código, si es válido,
 * se descuenta del total.
 */
export type LineaCalculada = Omit<PedidoItem, "id" | "pedidoId">;

/** Lo que se pide de un producto: con variantes, cuál ("Talla M · Negro"); `porEncargo` no mueve stock al despachar. */
export type LineaPedida = { productoId: string; cantidad: number; varianteId?: string | null; porEncargo?: boolean };

/**
 * Las líneas de un pedido con los precios de hoy (`precioConPromo`: promo de colección o de producto vigente) y el total
 * con el código, si es válido. Es la única cuenta de "+ Pedido" y de "Editar pedido", en la demo y en Supabase.
 */
export function calcularLineas(
  productos: Producto[],
  promos: Promo[],
  tiendaId: string,
  pedidas: LineaPedida[],
  codigo: string | undefined,
  ahora: Date,
  ctx: ContextoCodigo,
  /** Las variantes de la tienda (la demo las guarda aparte); si no, las de cada producto. */
  variantes?: Variante[],
) {
  const lineas = pedidas.filter((i) => i.cantidad > 0);
  if (lineas.length === 0) throw new DatosInvalidos("El pedido necesita al menos un producto.");
  const items: LineaCalculada[] = lineas.map((l) => {
    const producto = productos.find((p) => p.id === l.productoId && p.tiendaId === tiendaId);
    if (!producto || producto.eliminadoEn) throw new DatosInvalidos("Un producto del pedido ya no está disponible. Revisa sus artículos.");
    const suyas = (variantes ?? producto.variantes ?? []).filter((v) => v.productoId === producto.id);
    const variante = l.varianteId ? suyas.find((v) => v.id === l.varianteId) : undefined;
    if (l.varianteId && !variante) throw new DatosInvalidos("Esa opción ya no existe. Elige otra.");
    // Un producto con opciones entra con la suya (como el trigger pedido_items_validar).
    if (!variante && suyas.some((v) => v.activa)) throw new UsarVariante();
    return {
      productoId: producto.id,
      nombreProducto: producto.nombre,
      cantidad: l.cantidad,
      precioUnitario: precioConPromo({ ...producto, precio: variante?.precio ?? producto.precio }, promos, ahora).precio,
      varianteId: variante?.id ?? null,
      varianteTexto: variante ? textoVariante(producto.opciones, variante.valores) : null,
      porEncargo: Boolean(l.porEncargo),
    };
  });
  const subtotal = items.reduce((suma, i) => suma + i.precioUnitario * i.cantidad, 0);
  const promo = codigo ? buscarCodigoPromo(promos, tiendaId, codigo, ctx, ahora) : null;
  return { items, subtotal, promo, total: subtotal - descuentoDeCodigo(promo, subtotal) };
}

/**
 * Cómo queda el pago de un pedido de `total` (misma cuenta en la demo y en Supabase: `resolverPago`). Lanza DatosInvalidos si lo
 * que dio ahora no sirve. Un abono inicial igual al total deja el pedido de contado y no registra ningún abono.
 */
export function pagoDelPedido(total: number, datos: DatosPago) {
  const r = resolverPago(total, datos);
  if (r.error !== null) throw new DatosInvalidos(r.error);
  return r.resuelto;
}

/** El abono inicial de un pedido recién creado o pasado a crédito. */
function abonoInicial(pedido: Pedido, a: AbonoInicial, id: string, fecha: string): Abono {
  return { id, tiendaId: pedido.tiendaId, pedidoId: pedido.id, monto: a.monto, metodo: a.metodo, fecha, nota: null, creadoEn: fecha };
}

function fechaNoFutura(fecha: string, ahora: string) {
  if (Number.isNaN(Date.parse(fecha)) || Date.parse(fecha) > Date.parse(ahora)) throw new DatosInvalidos("Esa fecha no sirve: elige un día que ya pasó.");
}

/** Si la fecha es anterior al primer pedido del cliente, ese es ahora su primer pedido. */
function conPrimerPedido(cliente: Cliente, fecha: string | undefined): Cliente {
  return fecha && fecha < cliente.primerPedidoEn ? { ...cliente, primerPedidoEn: fecha } : cliente;
}

function clienteDeLaTienda(db: DB, tiendaId: string, id: string): Cliente {
  const cliente = db.clientes.find((c) => c.id === id && c.tiendaId === tiendaId);
  if (!cliente) throw new DatosInvalidos("Ese cliente ya no existe en tu tienda.");
  return cliente;
}

export function insertarPedidoManual(db: DB, tiendaId: string, datos: DatosPedidoManual, nuevoId: () => string, ahora: string) {
  const c = calcularLineas(db.productos, db.promos, tiendaId, datos.items, datos.codigo, new Date(ahora), { pedidos: db.pedidos, clienteId: datos.clienteId }, db.variantes);
  const cliente = clienteDeLaTienda(db, tiendaId, datos.clienteId);
  const venta = datos.ventaPasada;
  if (venta) fechaNoFutura(venta.fecha, ahora);
  // Venta pasada con "Descontar del stock": igual que despachar, nunca deja el stock en negativo.
  const { productos, variantes } = venta?.descontarStock ? moverStockDemo(db, tiendaId, c.items, -1, ahora) : db;

  const pago = pagoDelPedido(c.total, datos);

  const pedidoId = nuevoId();
  const items: PedidoItem[] = c.items.map((i) => ({ id: nuevoId(), pedidoId, ...i }));
  const pedido: Pedido = {
    id: pedidoId,
    tiendaId,
    numero: siguienteNumeroPedido(db, tiendaId),
    clienteId: cliente.id,
    origen: "manual",
    estado: venta ? "despachado" : "por_despachar",
    total: c.total,
    codigoPromo: c.promo?.codigo ?? null,
    creadoEn: venta?.fecha ?? ahora,
    despachadoEn: venta?.fecha ?? null,
    pagoModo: pago.pagoModo,
    pagoFechaAcordada: pago.pagoFechaAcordada,
  };
  // Primero se crea el pedido a crédito y después el abono inicial (si hay), con la fecha de la venta.
  const abonos = pago.abono ? [abonoInicial(pedido, pago.abono, nuevoId(), venta?.fecha ?? ahora)] : [];
  const clienteFinal = conPrimerPedido(cliente, venta?.fecha);
  const clientes = clienteFinal === cliente ? db.clientes : db.clientes.map((x) => (x.id === cliente.id ? clienteFinal : x));
  return {
    db: { ...db, pedidos: [...db.pedidos, pedido], pedidoItems: [...db.pedidoItems, ...items], abonos: [...db.abonos, ...abonos], productos, variantes, clientes },
    pedido: { ...conPago(pedido, abonos), items } satisfies PedidoConItems,
    cliente: clienteFinal,
  };
}

/**
 * Cambia solo el pago de un pedido (por ejemplo "Cambiar a crédito" desde el detalle): modo, fecha acordada y, si hay, lo que
 * dio ahora. Un cancelado no se toca. Con abonos, no puede pasar a contado (`PedidoConAbonos`).
 */
export function cambiarPagoDePedido(db: DB, tiendaId: string, id: string, datos: DatosPago, nuevoId: () => string, ahora: string) {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (actual.estado === "cancelado") throw new PedidoNoEditable();
  const pago = pagoAlEditar(actual, actual.total, db.abonos.some((a) => a.pedidoId === id), datos);
  const pedido: Pedido = { ...actual, pagoModo: pago.pagoModo, pagoFechaAcordada: pago.pagoFechaAcordada };
  const nuevos = pago.abono ? [abonoInicial(pedido, pago.abono, nuevoId(), ahora)] : [];
  const dbFinal: DB = { ...reemplazarPedido(db, pedido), abonos: [...db.abonos, ...nuevos] };
  return { db: dbFinal, pedido: conItems(dbFinal, pedido) };
}

export type DatosEdicionPedido = {
  clienteId: string;
  /** Solo `nuevo` y `por_despachar`: reemplazan los productos (los precios se recalculan). */
  items?: LineaPedida[];
  codigo?: string;
  /** `nuevo` / `por_despachar`: "Es una venta que ya hice" (pasa a despachado con esa fecha). */
  ventaPasada?: { fecha: string; descontarStock: boolean };
  /** `despachado`: la nueva fecha de la venta (creación y despacho). */
  fecha?: string;
} & DatosPago;

/**
 * Cómo queda el pago al editar. Sin `pagoModo` no cambia nada. Con abonos, no puede pasar a contado (`PedidoConAbonos`) y no se
 * registra otro abono inicial (solo cambia la fecha acordada). Sin abonos, igual que al crear.
 */
export function pagoAlEditar(actual: Pedido, total: number, tieneAbonos: boolean, datos: DatosPago) {
  if (datos.pagoModo === undefined) return { pagoModo: actual.pagoModo, pagoFechaAcordada: actual.pagoFechaAcordada, abono: null };
  if (tieneAbonos) {
    if (datos.pagoModo !== "credito") throw new PedidoConAbonos();
    const r = pagoDelPedido(total, { pagoModo: "credito", pagoFechaAcordada: datos.pagoFechaAcordada });
    return { pagoModo: "credito" as const, pagoFechaAcordada: r.pagoFechaAcordada, abono: null };
  }
  return pagoDelPedido(total, datos);
}

/**
 * Edita un pedido (mismo id y número), igual que la RPC `editar_pedido`: en `despachado` solo cliente y fecha; en `nuevo` y
 * `por_despachar` todo (ítems, total, código, y "ya hecho" con su fecha y stock opcional); un cancelado no se edita.
 */
export function modificarPedido(db: DB, tiendaId: string, id: string, datos: DatosEdicionPedido, ahora: string) {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (actual.estado === "cancelado") throw new PedidoNoEditable();
  const cliente = clienteDeLaTienda(db, tiendaId, datos.clienteId);

  const tieneAbonos = db.abonos.some((a) => a.pedidoId === id);

  if (actual.estado === "despachado") {
    if (datos.fecha) fechaNoFutura(datos.fecha, ahora);
    const pago = pagoAlEditar(actual, actual.total, tieneAbonos, datos);
    const pedido: Pedido = {
      ...actual,
      clienteId: cliente.id,
      ...(datos.fecha ? { creadoEn: datos.fecha, despachadoEn: datos.fecha } : {}),
      pagoModo: pago.pagoModo,
      pagoFechaAcordada: pago.pagoFechaAcordada,
    };
    const nuevos = pago.abono ? [abonoInicial(pedido, pago.abono, nuevoIdItem(), datos.fecha ?? ahora)] : [];
    const clienteFinal = conPrimerPedido(cliente, datos.fecha);
    const dbFinal = { ...reemplazarPedido(db, pedido), abonos: [...db.abonos, ...nuevos], clientes: db.clientes.map((c) => (c.id === cliente.id ? clienteFinal : c)) };
    return { db: dbFinal, pedido: conItems(dbFinal, pedido), cliente: clienteFinal };
  }

  const c = calcularLineas(db.productos, db.promos, tiendaId, datos.items ?? [], datos.codigo, new Date(ahora), { pedidos: db.pedidos, pedido: actual, clienteId: datos.clienteId ?? actual.clienteId }, db.variantes);
  if (datos.codigo?.trim() && !c.promo) throw new DatosInvalidos(MENSAJE_CODIGO_MALO);
  const venta = datos.ventaPasada;
  if (venta) fechaNoFutura(venta.fecha, ahora);
  const { productos, variantes } = venta?.descontarStock ? moverStockDemo(db, tiendaId, c.items, -1, ahora) : db;

  const pago = pagoAlEditar(actual, c.total, tieneAbonos, datos);
  const items: PedidoItem[] = c.items.map((i) => ({ id: nuevoIdItem(), pedidoId: id, ...i }));
  const pedido: Pedido = {
    ...actual,
    clienteId: cliente.id,
    total: c.total,
    codigoPromo: c.promo?.codigo ?? null,
    pagoModo: pago.pagoModo,
    pagoFechaAcordada: pago.pagoFechaAcordada,
    ...(venta ? { estado: "despachado" as const, creadoEn: venta.fecha, despachadoEn: venta.fecha } : {}),
  };
  const nuevos = pago.abono ? [abonoInicial(pedido, pago.abono, nuevoIdItem(), venta?.fecha ?? ahora)] : [];
  const clienteFinal = conPrimerPedido(cliente, venta?.fecha);
  const dbFinal: DB = {
    ...reemplazarPedido(db, pedido),
    pedidoItems: [...db.pedidoItems.filter((i) => i.pedidoId !== id), ...items],
    abonos: [...db.abonos, ...nuevos],
    productos,
    variantes,
    clientes: db.clientes.map((x) => (x.id === cliente.id ? clienteFinal : x)),
  };
  return { db: dbFinal, pedido: conItems(dbFinal, pedido), cliente: clienteFinal };
}

/** Borra un pedido cancelado (y sus productos). Los números no se reutilizan: quedan huecos. */
export function quitarPedido(db: DB, tiendaId: string, id: string) {
  const actual = pedidoParaCambiar(db, tiendaId, id);
  if (actual.estado !== "cancelado") throw new SoloCancelados();
  return { ...db, pedidos: db.pedidos.filter((p) => p.id !== id), pedidoItems: db.pedidoItems.filter((i) => i.pedidoId !== id) };
}
