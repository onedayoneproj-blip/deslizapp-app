// Conversión entre las filas de la base (snake_case, como en supabase/migrations/ y docs/03) y los tipos de la
// app (camelCase, lib/types.ts). SOLO aquí se traducen los nombres: las pantallas nunca ven una fila.
// Sin imports de valores (solo tipos): se prueba directo con Node (tests/datos.test.mjs).

import type { EstiloMarca } from "../marca";
import type { Detalles, Rubro } from "../rubros";
import type {
  CambiosProducto,
  Abono,
  AvisoLlegada,
  CatalogoPublico,
  Cliente,
  Disponibilidad,
  ItemSolicitud,
  Medio,
  OpcionProducto,
  OpinionProducto,
  SolicitudPedido,
  Variante,
  VistaSolicitud,
  EstadoCatalogo,
  EstadoPedido,
  EnvioJugada,
  EstadoPromo,
  EstadoTienda,
  EventoAaah,
  MetodoAbono,
  NuevoProducto,
  OrigenPedido,
  PagoModo,
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
  personalizacion?: Record<string, unknown>;
  whatsapp?: string | null;
  instagram?: string | null;
  descripcion?: string | null;
  nombre_vendedora?: string | null;
  foto_perfil_url?: string | null;
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
  rubro?: string;
  rubros?: string[];
};

export type FilaUsuario = { id: string; tienda_id: string; email: string; nombre: string; rol: string };

export type FilaProducto = {
  eliminado_en?: string | null;
  orden?: number | null;
  opiniones?: OpinionProducto[];
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
  // Catálogo conectado. Pueden faltar en el seed viejo (se derivan de nombre y fotos).
  slug?: string;
  tipo?: string;
  medios?: FilaMedio[];
  detalles?: Detalles;
  opciones?: OpcionProducto[];
  fotos_por_valor?: Record<string, Record<string, string>>;
  por_encargo?: boolean;
  encargo_texto?: string | null;
  rubro?: string | null;
  /** Embebidas con `select("*, producto_variantes(*)")`. */
  producto_variantes?: FilaVariante[] | null;
};

export type FilaMedio =
  | { tipo: "foto"; url: string; retocada: boolean }
  | { tipo: "video"; url: string; portada?: string | null; duracion_s: number };

export type FilaVariante = {
  id: string;
  tienda_id: string;
  producto_id: string;
  valores: Record<string, string>;
  stock: number | null;
  precio: number | null;
  activa: boolean;
  orden: number;
};

export type FilaItemSolicitud = {
  producto_id: string;
  variante_id: string | null;
  nombre: string;
  variante_texto: string | null;
  foto: string | null;
  precio_unitario: number;
  cantidad: number;
  por_encargo: boolean;
};

export type FilaSolicitud = {
  id: string;
  tienda_id: string;
  codigo: string;
  items: FilaItemSolicitud[];
  codigo_promo: string | null;
  descuento: number;
  total: number;
  creada_en: string;
  vence_en: string;
  pedido_id: string | null;
  descartada_en: string | null;
};

export type FilaAviso = {
  id: string;
  tienda_id: string;
  producto_id: string;
  variante_id: string | null;
  telefono: string;
  nombre: string | null;
  creado_en: string;
  avisado_en: string | null;
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
  /** Ventas a crédito. Pueden faltar en el seed viejo (= contado). */
  pago_modo?: string;
  pago_fecha_acordada?: string | null;
};

export type FilaAbono = {
  id: string;
  tienda_id: string;
  pedido_id: string;
  monto: number;
  metodo: string;
  fecha: string;
  nota: string | null;
  creado_en: string;
};

export type FilaPedidoItem = {
  id: string;
  pedido_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  // Variantes y encargos. Pueden faltar en el seed viejo.
  variante_id?: string | null;
  variante_texto?: string | null;
  por_encargo?: boolean;
};

/** Pedido con sus ítems y abonos embebidos (`select("*, pedido_items(*), abonos(*)")`). */
export type FilaPedidoConItems = FilaPedido & { pedido_items?: FilaPedidoItem[] | null; abonos?: FilaAbono[] | null };

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
  /** Código personal (solo para ese cliente). Puede faltar en el seed viejo. */
  cliente_id?: string | null;
};

export type FilaEnvioJugada = {
  id: string;
  tienda_id: string;
  cliente_id: string;
  jugada: string;
  tipo: string;
  promo_id: string | null;
  producto_ids: string[] | null;
  enviado_en: string;
};

export type FilaEventoAaah = { id: string; tienda_id: string; producto_id: string; creado_en: string };

// ---------------------------------------------------------------------------
// Fila → app
// ---------------------------------------------------------------------------

export function aTienda(f: FilaTienda, fecha: AjusteFecha = igual): Tienda {
  return {
    personalizacion: f.personalizacion ?? {},
    whatsapp: f.whatsapp ?? null,
    instagram: f.instagram ?? null,
    descripcion: f.descripcion ?? null,
    nombreVendedora: f.nombre_vendedora ?? null,
    fotoPerfilUrl: f.foto_perfil_url ?? null,
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
    rubro: (f.rubro ?? "general") as Rubro,
    rubros: rubrosDe((f.rubro ?? "general") as Rubro, (f.rubros ?? []) as Rubro[]),
  };
}

/** El principal primero y sin repetir (igual que `rubrosDeTienda` de lib/rubros.ts, que aquí no se importa para que filas.ts siga siendo solo tipos). */
const rubrosDe = (rubro: Rubro, rubros: Rubro[]): Rubro[] => [...new Set([rubro, ...rubros])];

export function aUsuario(f: FilaUsuario): Usuario {
  return { id: f.id, tiendaId: f.tienda_id, email: f.email, nombre: f.nombre, rol: f.rol as RolUsuario };
}

export function aProducto(f: FilaProducto, fecha: AjusteFecha = igual): Producto {
  return {
    eliminadoEn: f.eliminado_en ?? null,
    id: f.id,
    tiendaId: f.tienda_id,
    nombre: f.nombre,
    precio: f.precio,
    fotos: f.fotos ?? [],
    rubro: (f.rubro as Rubro | null | undefined) ?? null,
    fotoRetocada: f.foto_retocada,
    categoria: f.categoria,
    activo: f.activo,
    destacado: f.destacado,
    stock: f.stock,
    likes: f.likes,
    creadoEn: fecha(f.creado_en),
    actualizadoEn: fecha(f.actualizado_en),
    orden: f.orden ?? null,
    opiniones: f.opiniones ?? [],
    slug: f.slug ?? slugDesdeTexto(f.nombre),
    tipo: f.tipo === "servicio" ? "servicio" : "producto",
    medios: f.medios ? f.medios.map(aMedio) : (f.fotos ?? []).map((url, i) => ({ tipo: "foto" as const, url, retocada: i === 0 && f.foto_retocada })),
    detalles: f.detalles ?? {},
    opciones: f.opciones ?? [],
    fotosPorValor: f.fotos_por_valor ?? {},
    porEncargo: f.por_encargo ?? false,
    encargoTexto: f.encargo_texto ?? null,
    ...(f.producto_variantes ? { variantes: ordenarVariantes(f.producto_variantes.map(aVariante)) } : {}),
  };
}

/** La misma regla que `public.slug_desde_texto`: minúsculas, sin tildes, guiones, ≤ 40. */
export function slugDesdeTexto(texto: string): string {
  const base = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "producto";
}

export function aMedio(m: FilaMedio): Medio {
  return m.tipo === "video" ? { tipo: "video", url: m.url, portada: m.portada ?? null, duracionS: m.duracion_s } : { tipo: "foto", url: m.url, retocada: m.retocada };
}

export function filaMedio(m: Medio): FilaMedio {
  return m.tipo === "video" ? { tipo: "video", url: m.url, portada: m.portada, duracion_s: m.duracionS } : { tipo: "foto", url: m.url, retocada: m.retocada };
}

export function aVariante(f: FilaVariante): Variante {
  return { id: f.id, productoId: f.producto_id, valores: f.valores, stock: f.stock, precio: f.precio, activa: f.activa, orden: f.orden };
}

export const ordenarVariantes = (v: Variante[]) => [...v].sort((a, b) => a.orden - b.orden);

export function aItemSolicitud(f: FilaItemSolicitud): ItemSolicitud {
  return {
    productoId: f.producto_id,
    varianteId: f.variante_id ?? null,
    nombre: f.nombre,
    varianteTexto: f.variante_texto ?? null,
    foto: f.foto ?? null,
    precioUnitario: f.precio_unitario,
    cantidad: f.cantidad,
    porEncargo: f.por_encargo ?? false,
  };
}

export function aSolicitud(f: FilaSolicitud): SolicitudPedido {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    codigo: f.codigo,
    items: (f.items ?? []).map(aItemSolicitud),
    codigoPromo: f.codigo_promo,
    descuento: f.descuento,
    total: f.total,
    creadaEn: f.creada_en,
    venceEn: f.vence_en,
    pedidoId: f.pedido_id,
    descartadaEn: f.descartada_en,
  };
}

/** La respuesta de `ver_solicitud`. */
export type FilaVistaSolicitud = {
  id: string | null;
  codigo: string;
  tienda: {
    nombre: string;
    slug: string;
    logo_url: string | null;
    foto_perfil_url: string | null;
    whatsapp: string | null;
    nombre_vendedora?: string | null;
    rubro?: string | null;
  };
  items: FilaItemSolicitud[];
  descuento: number;
  total: number;
  creada_en: string;
  vence_en: string;
  estado: string;
  despachado_en?: string | null;
  es_mi_tienda: boolean;
};

export function aVistaSolicitud(f: FilaVistaSolicitud): VistaSolicitud {
  return {
    id: f.id ?? null,
    codigo: f.codigo,
    tienda: {
      nombre: f.tienda.nombre,
      slug: f.tienda.slug,
      logoUrl: f.tienda.logo_url,
      fotoPerfilUrl: f.tienda.foto_perfil_url,
      whatsapp: f.tienda.whatsapp,
      nombreVendedora: f.tienda.nombre_vendedora ?? null,
      rubro: (f.tienda.rubro as Rubro | null | undefined) ?? null,
    },
    items: (f.items ?? []).map(aItemSolicitud),
    descuento: f.descuento,
    total: f.total,
    creadaEn: f.creada_en,
    venceEn: f.vence_en,
    estado: f.estado as VistaSolicitud["estado"],
    despachadoEn: f.despachado_en ?? null,
    esMiTienda: f.es_mi_tienda,
  };
}

export function aAviso(f: FilaAviso): AvisoLlegada {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    productoId: f.producto_id,
    varianteId: f.variante_id,
    telefono: f.telefono,
    nombre: f.nombre,
    creadoEn: f.creado_en,
    avisadoEn: f.avisado_en,
  };
}

/** La respuesta de `catalogo_publico`. */
export type FilaCatalogoPublico = {
  tienda: {
    desde: string;
    ventas: number | null;
    slug: string;
    nombre: string;
    logo_url: string | null;
    foto_perfil_url: string | null;
    marca_color_principal: string;
    marca_color_acento: string;
    marca_estilo: string;
    personalizacion: Record<string, unknown> | null;
    whatsapp: string | null;
    instagram: string | null;
    descripcion: string | null;
    nombre_vendedora: string | null;
    rubro: string;
    rubros?: string[];
  };
  productos: {
    orden: number | null;
    opiniones: OpinionProducto[];
    id: string;
    slug: string;
    nombre: string;
    tipo: string;
    rubro?: string | null;
    categoria: string | null;
    precio: number;
    precio_promo: number | null;
    promo: { nombre: string; porcentaje: number } | null;
    medios: FilaMedio[];
    detalles: Detalles;
    opciones: OpcionProducto[];
    likes: number;
    disponibilidad: string;
    quedan: number | null;
    encargo_texto: string | null;
    fotos_por_valor?: Record<string, Record<string, string>> | null;
    variantes: { id: string; valores: Record<string, string>; precio: number; precio_promo: number | null; disponibilidad: string; quedan: number | null }[];
  }[];
};

export function aCatalogoPublico(f: FilaCatalogoPublico): CatalogoPublico {
  const t = f.tienda;
  return {
    tienda: {
      desde: t.desde,
      ventas: t.ventas ?? null,
      slug: t.slug,
      nombre: t.nombre,
      logoUrl: t.logo_url,
      fotoPerfilUrl: t.foto_perfil_url,
      marcaColorPrincipal: t.marca_color_principal,
      marcaColorAcento: t.marca_color_acento,
      marcaEstilo: t.marca_estilo as EstiloMarca,
      personalizacion: t.personalizacion ?? {},
      whatsapp: t.whatsapp,
      instagram: t.instagram,
      descripcion: t.descripcion,
      nombreVendedora: t.nombre_vendedora,
      rubro: (t.rubro ?? "general") as Rubro,
      rubros: rubrosDe((t.rubro ?? "general") as Rubro, (t.rubros ?? []) as Rubro[]),
    },
    productos: (f.productos ?? []).map((p) => ({
      orden: p.orden ?? null,
      opiniones: p.opiniones ?? [],
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      tipo: p.tipo === "servicio" ? "servicio" : "producto",
      rubro: (p.rubro ?? t.rubro ?? "general") as Rubro,
      categoria: p.categoria,
      precio: p.precio,
      precioPromo: p.precio_promo ?? null,
      promo: p.promo ?? null,
      medios: (p.medios ?? []).map(aMedio),
      detalles: p.detalles ?? {},
      opciones: p.opciones ?? [],
      fotosPorValor: p.fotos_por_valor ?? {},
      likes: p.likes,
      disponibilidad: p.disponibilidad as Disponibilidad,
      quedan: p.quedan ?? null,
      encargoTexto: p.encargo_texto ?? null,
      variantes: (p.variantes ?? []).map((v) => ({
        id: v.id,
        valores: v.valores,
        precio: v.precio,
        precioPromo: v.precio_promo ?? null,
        disponibilidad: v.disponibilidad as Disponibilidad,
        quedan: v.quedan ?? null,
      })),
    })),
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
    pagoModo: f.pago_modo === "credito" ? "credito" : "contado",
    pagoFechaAcordada: f.pago_fecha_acordada ?? null,
  };
}

export function aAbono(f: FilaAbono, fecha: AjusteFecha = igual): Abono {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    pedidoId: f.pedido_id,
    monto: f.monto,
    metodo: f.metodo as MetodoAbono,
    fecha: fecha(f.fecha),
    nota: f.nota,
    creadoEn: fecha(f.creado_en),
  };
}

/** Los abonos de más viejo a más nuevo. */
export const ordenarAbonos = (abonos: Abono[]) => [...abonos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn.localeCompare(b.creadoEn));

export function aPedidoItem(f: FilaPedidoItem): PedidoItem {
  return {
    id: f.id,
    pedidoId: f.pedido_id,
    productoId: f.producto_id,
    nombreProducto: f.nombre_producto,
    cantidad: f.cantidad,
    precioUnitario: f.precio_unitario,
    varianteId: f.variante_id ?? null,
    varianteTexto: f.variante_texto ?? null,
    porEncargo: f.por_encargo ?? false,
  };
}

/**
 * Pedido con sus ítems y abonos. El estado de pago (`pagado`, `saldo`) lo agrega `conPago` de lib/credito.ts (la única cuenta,
 * igual en la demo y en Supabase); aquí no se importa para que este archivo siga sin imports de valores.
 */
export function aPedidoConItems(f: FilaPedidoConItems) {
  return { ...aPedido(f), items: (f.pedido_items ?? []).map(aPedidoItem), abonos: ordenarAbonos((f.abonos ?? []).map((a) => aAbono(a))) };
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
    clienteId: f.cliente_id ?? null,
  };
}

export function aEnvioJugada(f: FilaEnvioJugada): EnvioJugada {
  return {
    id: f.id,
    tiendaId: f.tienda_id,
    clienteId: f.cliente_id,
    jugada: f.jugada as EnvioJugada["jugada"],
    tipo: f.tipo as EnvioJugada["tipo"],
    promoId: f.promo_id,
    productoIds: f.producto_ids ?? [],
    enviadoEn: f.enviado_en,
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
    // Lo del catálogo conectado solo si viene: si no, la base pone slug, tipo y medios (desde fotos)
    ...(d.slug !== undefined ? { slug: d.slug } : {}),
    ...(d.tipo !== undefined ? { tipo: d.tipo } : {}),
    ...(d.medios !== undefined ? { medios: d.medios.map(filaMedio) } : {}),
    ...(d.detalles !== undefined ? { detalles: d.detalles } : {}),
    ...(d.porEncargo !== undefined ? { por_encargo: d.porEncargo } : {}),
    ...(d.encargoTexto !== undefined ? { encargo_texto: d.encargoTexto } : {}),
    ...(d.rubro !== undefined ? { rubro: d.rubro } : {}),
  };
}

/** Solo las columnas que llegan en `cambios` (un `update` parcial). `likes` nunca se escribe. */
export function filaCambiosProducto(c: CambiosProducto) {
  type Columna = "nombre" | "precio" | "fotos" | "foto_retocada" | "categoria" | "activo" | "destacado" | "stock" | "slug" | "tipo" | "medios" | "detalles" | "por_encargo" | "encargo_texto" | "rubro";
  const fila: Partial<Record<Columna, unknown>> = {};
  if (c.nombre !== undefined) fila.nombre = c.nombre;
  if (c.precio !== undefined) fila.precio = c.precio;
  if (c.fotos !== undefined) fila.fotos = c.fotos;
  if (c.fotoRetocada !== undefined) fila.foto_retocada = c.fotoRetocada;
  if (c.categoria !== undefined) fila.categoria = c.categoria;
  if (c.activo !== undefined) fila.activo = c.activo;
  if (c.destacado !== undefined) fila.destacado = c.destacado;
  if (c.stock !== undefined) fila.stock = c.stock;
  // Las opciones (ejes de variantes) solo cambian con guardarVariantes
  if (c.slug !== undefined) fila.slug = c.slug;
  if (c.tipo !== undefined) fila.tipo = c.tipo;
  if (c.medios !== undefined) fila.medios = c.medios.map(filaMedio);
  if (c.detalles !== undefined) fila.detalles = c.detalles;
  if (c.porEncargo !== undefined) fila.por_encargo = c.porEncargo;
  if (c.encargoTexto !== undefined) fila.encargo_texto = c.encargoTexto;
  if (c.rubro !== undefined) fila.rubro = c.rubro;
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
  d: {
    clienteId: string | null;
    origen: OrigenPedido;
    estado: EstadoPedido;
    total: number;
    codigoPromo: string | null;
    pagoModo?: PagoModo;
    pagoFechaAcordada?: string | null;
  },
) {
  return {
    tienda_id: tiendaId,
    cliente_id: d.clienteId,
    origen: d.origen,
    estado: d.estado,
    total: d.total,
    codigo_promo: d.codigoPromo,
    pago_modo: d.pagoModo ?? "contado",
    pago_fecha_acordada: d.pagoModo === "credito" ? (d.pagoFechaAcordada ?? null) : null,
  };
}

export function filaPedidoItem(
  pedidoId: string,
  i: { productoId: string; nombreProducto: string; cantidad: number; precioUnitario: number; varianteId?: string | null; porEncargo?: boolean },
) {
  return {
    pedido_id: pedidoId,
    producto_id: i.productoId,
    nombre_producto: i.nombreProducto,
    cantidad: i.cantidad,
    precio_unitario: i.precioUnitario,
    // variante_texto lo pone la base
    ...(i.varianteId ? { variante_id: i.varianteId } : {}),
    ...(i.porEncargo ? { por_encargo: true } : {}),
  };
}

/**
 * Promo (nueva o editada). `valor_porcentaje` es NOT NULL y el código va en MAYÚSCULAS (así lo exige la base). `cliente_id` NO va aquí:
 * solo lo pone `crear_codigo_cliente`, y editar una promo desde Promos nunca lo cambia ni lo borra.
 */
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
