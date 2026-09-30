// Conversión entre las filas de la base (snake_case, como en supabase/migrations/ y docs/03) y los tipos de la
// app (camelCase, lib/types.ts). SOLO aquí se traducen los nombres: las pantallas nunca ven una fila.
// Sin imports de valores (solo tipos): se prueba directo con Node (tests/datos.test.mjs).

import type { EstiloMarca } from "../marca";
import type {
  CambiosProducto,
  Cliente,
  EstadoCatalogo,
  EstadoPedido,
  EstadoPromo,
  EstadoTienda,
  EventoAaah,
  NuevoProducto,
  OrigenPedido,
  Pedido,
  PedidoItem,
  Plan,
  Producto,
  Promo,
  RolUsuario,
  Tienda,
  TipoPromo,
  Usuario,
} from "../types";

/** Corrige una fecha al leerla (la demo desplaza las del seed para que sean "de esta semana"). */
export type AjusteFecha = (iso: string) => string;
const igual: AjusteFecha = (iso) => iso;

// ---------------------------------------------------------------------------
// Filas (lo que devuelve la base)
// ---------------------------------------------------------------------------

export type FilaTienda = {
  id: string;
  slug: string;
  nombre: string;
  logo_url: string | null;
  plan: string;
  limite_productos: number;
  creditos_retoque: number;
  creditos_retoque_mensuales: number;
  creado_en: string;
  marca_color_principal: string;
  marca_color_acento: string;
  marca_estilo: string;
  url_catalogo: string | null;
  // Pueden faltar en el seed viejo (defectos: 'activa' y 'sin')
  estado?: string;
  catalogo_estado?: string;
  catalogo_paso?: number | null;
  catalogo_notas_cambios?: string | null;
  catalogo_solicitado_en?: string | null;
  catalogo_publicado_en?: string | null;
};

export type FilaUsuario = { id: string; tienda_id: string; email: string; nombre: string; rol: string };

export type FilaProducto = {
  id: string;
  tienda_id: string;
  nombre: string;
  precio: number;
  fotos: string[];
  foto_retocada: boolean;
  categoria: string | null;
  activo: boolean;
  destacado: boolean;
  stock: number | null;
  likes: number;
  creado_en: string;
  actualizado_en: string;
};

export type FilaCliente = {
  id: string;
  tienda_id: string;
  nombre: string;
  telefono: string | null;
  origen: string;
  primer_pedido_en: string;
  pedidos_count: number;
  nota: string | null;
};

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

/** Pedido con sus ítems embebidos (`select("*, pedido_items(*)")`). */
export type FilaPedidoConItems = FilaPedido & { pedido_items?: FilaPedidoItem[] | null };

export type FilaPromo = {
  id: string;
  tienda_id: string;
  tipo: string;
  nombre: string;
  /** NOT NULL en la base (solo porcentaje, 1–90). El seed viejo lo traía como null posible. */
  valor_porcentaje: number | null;
  codigo: string | null;
  coleccion: string | null;
  producto_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  /** Solo promos de código; null = sin límite. Puede faltar en el seed viejo. */
  limite_usos?: number | null;
  pausada?: boolean;
};

export type FilaEventoAaah = { id: string; tienda_id: string; producto_id: string; creado_en: string };

// ---------------------------------------------------------------------------
// Fila → app
// ---------------------------------------------------------------------------

export function aTienda(f: FilaTienda, fecha: AjusteFecha = igual): Tienda {
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    logoUrl: f.logo_url,
    plan: f.plan as Plan,
    limiteProductos: f.limite_productos,
    creditosRetoque: f.creditos_retoque,
    creditosRetoqueMensuales: f.creditos_retoque_mensuales,
    creadoEn: fecha(f.creado_en),
    marcaColorPrincipal: f.marca_color_principal,
    marcaColorAcento: f.marca_color_acento,
    marcaEstilo: f.marca_estilo as EstiloMarca,
    urlCatalogo: f.url_catalogo,
    estado: (f.estado ?? "activa") as EstadoTienda,
    catalogoEstado: (f.catalogo_estado ?? "sin") as EstadoCatalogo,
    catalogoPaso: f.catalogo_paso ?? null,
    catalogoNotasCambios: f.catalogo_notas_cambios ?? null,
    catalogoSolicitadoEn: f.catalogo_solicitado_en ?? null,
    catalogoPublicadoEn: f.catalogo_publicado_en ?? null,
  };
}

export function aUsuario(f: FilaUsuario): Usuario {
  return { id: f.id, tiendaId: f.tienda_id, email: f.email, nombre: f.nombre, rol: f.rol as RolUsuario };
}

export function aProducto(f: FilaProducto, fecha: AjusteFecha = igual): Producto {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    nombre: f.nombre,
    precio: f.precio,
    fotos: f.fotos ?? [],
    fotoRetocada: f.foto_retocada,
    categoria: f.categoria,
    activo: f.activo,
    destacado: f.destacado,
    stock: f.stock,
    likes: f.likes,
    creadoEn: fecha(f.creado_en),
    actualizadoEn: fecha(f.actualizado_en),
  };
}

export function aCliente(f: FilaCliente, fecha: AjusteFecha = igual): Cliente {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    nombre: f.nombre,
    telefono: f.telefono,
    origen: f.origen as OrigenPedido,
    primerPedidoEn: fecha(f.primer_pedido_en),
    nota: f.nota,
  };
}

export function aPedido(f: FilaPedido, fecha: AjusteFecha = igual): Pedido {
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

export function aPedidoConItems(f: FilaPedidoConItems) {
  return { ...aPedido(f), items: (f.pedido_items ?? []).map(aPedidoItem) };
}

export function aPromo(f: FilaPromo, fecha: AjusteFecha = igual): Promo {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    tipo: f.tipo as TipoPromo,
    nombre: f.nombre,
    valorPorcentaje: f.valor_porcentaje,
    codigo: f.codigo,
    coleccion: f.coleccion,
    productoId: f.producto_id,
    fechaInicio: fecha(f.fecha_inicio),
    fechaFin: f.fecha_fin == null ? null : fecha(f.fecha_fin),
    estado: f.estado as EstadoPromo,
    limiteUsos: f.limite_usos ?? null,
    pausada: f.pausada ?? false,
  };
}

export function aEventoAaah(f: FilaEventoAaah, fecha: AjusteFecha = igual): EventoAaah {
  return { id: f.id, tiendaId: f.tienda_id, productoId: f.producto_id, creadoEn: fecha(f.creado_en) };
}

// ---------------------------------------------------------------------------
// App → fila (lo que se envía a la base). Nunca se envían columnas que calcula la base:
// `numero` del pedido, `pedidos_count`, `likes`, `actualizado_en`, `creditos_retoque`, plan ni límites.
// ---------------------------------------------------------------------------

/** Producto nuevo. Sin `likes` (lo cuenta la base desde eventos_aaah) ni fechas (las pone la base). */
export function filaProductoNuevo(tiendaId: string, d: NuevoProducto) {
  return {
    tienda_id: tiendaId,
    nombre: d.nombre,
    precio: d.precio,
    fotos: d.fotos,
    foto_retocada: d.fotoRetocada,
    categoria: d.categoria,
    activo: d.activo,
    destacado: d.destacado,
    stock: d.stock,
  };
}

/** Solo las columnas que llegan en `cambios` (un `update` parcial). `likes` nunca se escribe. */
export function filaCambiosProducto(c: CambiosProducto) {
  const fila: Partial<Record<"nombre" | "precio" | "fotos" | "foto_retocada" | "categoria" | "activo" | "destacado" | "stock", unknown>> = {};
  if (c.nombre !== undefined) fila.nombre = c.nombre;
  if (c.precio !== undefined) fila.precio = c.precio;
  if (c.fotos !== undefined) fila.fotos = c.fotos;
  if (c.fotoRetocada !== undefined) fila.foto_retocada = c.fotoRetocada;
  if (c.categoria !== undefined) fila.categoria = c.categoria;
  if (c.activo !== undefined) fila.activo = c.activo;
  if (c.destacado !== undefined) fila.destacado = c.destacado;
  if (c.stock !== undefined) fila.stock = c.stock;
  return fila;
}

/** "Mi marca": lo único de la tienda que la tienda puede editar (además del nombre). */
export function filaMarca(d: { logoUrl: string | null; principal: string; acento: string; estilo: EstiloMarca; urlCatalogo: string | null }) {
  return {
    logo_url: d.logoUrl,
    marca_color_principal: d.principal.toUpperCase(),
    marca_color_acento: d.acento.toUpperCase(),
    marca_estilo: d.estilo,
    url_catalogo: d.urlCatalogo,
  };
}

/** Cliente nuevo: el teléfono ya va normalizado ("+18095550142"). `pedidos_count` lo mantiene la base. */
export function filaClienteNuevo(tiendaId: string, d: { nombre: string; telefono: string | null; nota: string | null; origen: OrigenPedido }) {
  return { tienda_id: tiendaId, nombre: d.nombre, telefono: d.telefono, nota: d.nota, origen: d.origen };
}

/** Pedido nuevo: SIN `numero` (lo asigna la base: el mayor de la tienda + 1). */
export function filaPedidoNuevo(
  tiendaId: string,
  d: { clienteId: string | null; origen: OrigenPedido; estado: EstadoPedido; total: number; codigoPromo: string | null },
) {
  return { tienda_id: tiendaId, cliente_id: d.clienteId, origen: d.origen, estado: d.estado, total: d.total, codigo_promo: d.codigoPromo };
}

export function filaPedidoItem(pedidoId: string, i: { productoId: string; nombreProducto: string; cantidad: number; precioUnitario: number }) {
  return { pedido_id: pedidoId, producto_id: i.productoId, nombre_producto: i.nombreProducto, cantidad: i.cantidad, precio_unitario: i.precioUnitario };
}

/** Promo (nueva o editada). `valor_porcentaje` es NOT NULL y el código va en MAYÚSCULAS (así lo exige la base). */
export function filaPromo(tiendaId: string, p: Omit<Promo, "id" | "tiendaId">) {
  return {
    tienda_id: tiendaId,
    tipo: p.tipo,
    nombre: p.nombre,
    valor_porcentaje: Number(p.valorPorcentaje),
    codigo: p.tipo === "codigo" && p.codigo ? p.codigo.trim().toUpperCase() : null,
    coleccion: p.tipo === "coleccion" ? p.coleccion : null,
    producto_id: p.tipo === "producto" ? p.productoId : null,
    fecha_inicio: p.fechaInicio,
    fecha_fin: p.fechaFin,
    estado: p.estado,
    limite_usos: p.tipo === "codigo" ? p.limiteUsos : null,
    pausada: p.pausada,
  };
}
