// El catálogo conectado en la demo: variantes, catálogo público, solicitudes, aaahs y avisos, con las mismas reglas que las
// migraciones 20261004123742 y 20261004124138 (supabase/migrations/). Funciones puras sobre la DB de la demo.

import { conPago } from "../credito";
import { estadoPromo, precioConPromo } from "../promos";
import { normalizarTelefonoDO } from "../telefono";
import type {
  AjusteInventario,
  AvisoLlegada,
  CatalogoPublico,
  Cliente,
  Disponibilidad,
  ItemSolicitud,
  OpcionProducto,
  Pedido,
  PedidoConItems,
  PedidoItem,
  Producto,
  Promo,
  SolicitudPedido,
  Tienda,
  Variante,
  VistaSolicitud,
} from "../types";
import type { DB } from "./db";
import {
  CatalogoNoDisponible,
  ClienteDuplicado,
  CodigoNoValido,
  DatosInvalidos,
  DemasiadosIntentos,
  ProductoNoDisponible,
} from "./errores";
import type { DatosRegistrarSolicitud, DatosVariante, LineaCarrito, SolicitudCreada } from "./fuente";
import { siguienteNumeroPedido } from "./pedidos";
import { conVariantes, sumarStock, textoVariante, variantesDe } from "./productos";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const LETRAS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** hay (sin control o más de 3) · quedan (1 a 3) · agotado · por_encargo (como `public.disponibilidad`). */
export function disponibilidad(stock: number | null, porEncargo: boolean): Disponibilidad {
  if (stock === null || stock > 3) return "hay";
  if (stock >= 1) return "quedan";
  return porEncargo ? "por_encargo" : "agotado";
}

/** "8095550142" o "+1 809 555 0142" → "18095550142" (como `public.telefono_do`); null si no es dominicano. */
export function telefonoDO(texto: string | null): string | null {
  const n = texto ? normalizarTelefonoDO(texto) : null;
  return n ? n.slice(1) : null;
}

/** 10 caracteres sin ambigüedad (sin I, O, 0, 1). */
function codigoSolicitud(db: DB): string {
  for (;;) {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const codigo = Array.from(bytes, (b) => LETRAS_CODIGO[b % 32]).join("");
    if (!db.solicitudes.some((s) => s.codigo === codigo)) return codigo;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Variantes
// ---------------------------------------------------------------------------------------------------------------------

function opcionesValidas(opciones: OpcionProducto[]): boolean {
  if (opciones.length > 2) return false;
  const nombres = new Set<string>();
  for (const o of opciones) {
    if (!o.nombre || o.nombre.length > 20 || nombres.has(o.nombre)) return false;
    nombres.add(o.nombre);
    if (o.valores.length < 1 || o.valores.length > 12 || new Set(o.valores).size !== o.valores.length) return false;
    if (o.valores.some((v) => !v || v.length > 20)) return false;
  }
  return true;
}

const mismaVariante = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** Como la RPC `guardar_variantes`: deja exactamente estas variantes y registra cada cambio de stock. */
export function guardarVariantesEnDB(
  db: DB,
  tiendaId: string,
  productoId: string,
  opciones: OpcionProducto[],
  datos: DatosVariante[],
  actorId: string,
  nuevoId: () => string,
  ahora: string,
): { db: DB; producto: Producto } {
  const producto = db.productos.find((p) => p.id === productoId && p.tiendaId === tiendaId);
  if (!producto) throw new DatosInvalidos("Ese producto ya no existe en esta tienda.");
  const invalida = () => new DatosInvalidos("Esa variante no corresponde a este producto. Revisa las opciones.");
  if (!opcionesValidas(opciones) || (opciones.length === 0 && datos.length > 0) || datos.length > 144) throw invalida();
  if (producto.tipo !== "producto" && datos.length > 0) throw invalida();
  for (const [i, d] of datos.entries()) {
    if (Object.keys(d.valores).length !== opciones.length) throw invalida();
    if (opciones.some((o) => !o.valores.includes(d.valores[o.nombre] ?? ""))) throw invalida();
    if (datos.slice(0, i).some((otra) => mismaVariante(otra.valores, d.valores))) throw invalida();
    for (const n of [d.stock, d.precio ?? null]) if (n !== null && (!Number.isSafeInteger(n) || n < 0)) throw invalida();
  }

  const previas = db.variantes.filter((v) => v.productoId === productoId);
  const conPedidos = new Set(db.pedidoItems.filter((i) => i.varianteId).map((i) => i.varianteId));
  const ajustes: AjusteInventario[] = [];
  const nuevas: Variante[] = datos.map((d, orden) => {
    const previa = previas.find((v) => mismaVariante(v.valores, d.valores));
    const v: Variante = {
      id: previa?.id ?? nuevoId(),
      productoId,
      valores: d.valores,
      stock: d.stock,
      precio: d.precio ?? null,
      activa: d.activa ?? true,
      orden,
    };
    const antes = previa?.stock ?? 0;
    if (v.stock !== null && v.stock !== antes && (!previa || previa.stock !== null)) {
      ajustes.push({
        id: nuevoId(),
        tiendaId,
        productoId,
        varianteId: v.id,
        variacion: v.stock - antes,
        stockAnterior: antes,
        stockNuevo: v.stock,
        motivo: "correccion_inventario",
        nota: null,
        actorId,
        creadoEn: ahora,
      });
    }
    return v;
  });
  // Las que desaparecen: con pedidos quedan inactivas; sin pedidos se van
  const quedan = previas
    .filter((v) => !nuevas.some((n) => n.id === v.id) && conPedidos.has(v.id))
    .map((v) => ({ ...v, activa: false }));
  const variantes = [...db.variantes.filter((v) => v.productoId !== productoId), ...quedan, ...nuevas];
  const actualizado = { ...sumarStock({ ...producto, opciones }, variantes), actualizadoEn: ahora };
  const siguiente: DB = {
    ...db,
    variantes,
    productos: db.productos.map((p) => (p.id === productoId ? actualizado : p)),
    ajustesInventario: [...db.ajustesInventario, ...ajustes],
  };
  return { db: siguiente, producto: conVariantes(siguiente, actualizado) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Catálogo público
// ---------------------------------------------------------------------------------------------------------------------

/**
 * La tienda pública por su slug. En la demo basta con que no esté pausada ni eliminada: el estado del catálogo lo simula
 * el equipo y casi siempre está "sin" (en Supabase, además, tiene que estar publicado).
 */
function tiendaPublica(db: DB, slug: string): Tienda {
  const t = db.tiendas.find((t) => t.slug === slug.trim().toLowerCase());
  if (!t || t.estado === "pausada" || t.estado === "eliminada") throw new CatalogoNoDisponible();
  return t;
}

/** La mejor promo automática vigente (la misma regla que precioConPromo), con su nombre. */
function promoAutomatica(p: Producto, promos: Promo[], ahora: Date): { nombre: string; porcentaje: number } | null {
  let mejor: Promo | null = null;
  for (const promo of promos) {
    if (promo.tiendaId !== p.tiendaId || !promo.valorPorcentaje || promo.pausada || estadoPromo(promo, ahora) !== "activa") continue;
    const aplica =
      (promo.tipo === "coleccion" && promo.coleccion != null && promo.coleccion === p.categoria) || (promo.tipo === "producto" && promo.productoId === p.id);
    if (aplica && promo.valorPorcentaje > (mejor?.valorPorcentaje ?? 0)) mejor = promo;
  }
  return mejor ? { nombre: mejor.nombre, porcentaje: mejor.valorPorcentaje! } : null;
}

/** El stock que ve el público: el de las variantes activas si las hay. */
function stockPublico(p: Producto, variantes: Variante[]): number | null {
  const activas = variantes.filter((v) => v.activa);
  if (activas.length === 0) return p.stock;
  if (activas.some((v) => v.stock === null)) return null;
  return activas.reduce((s, v) => s + v.stock!, 0);
}

export function catalogoPublicoDeDB(db: DB, slug: string, ahora: Date): CatalogoPublico {
  const t = tiendaPublica(db, slug);
  const productos = db.productos
    .filter((p) => p.tiendaId === t.id && p.activo)
    .sort((a, b) => Number(b.destacado) - Number(a.destacado) || b.creadoEn.localeCompare(a.creadoEn) || a.id.localeCompare(b.id))
    .map((p) => {
      const promo = promoAutomatica(p, db.promos, ahora);
      const variantes = variantesDe(db, p.id).filter((v) => v.activa);
      const stock = stockPublico(p, variantes);
      const disp = disponibilidad(stock, p.porEncargo);
      return {
        id: p.id,
        slug: p.slug,
        nombre: p.nombre,
        tipo: p.tipo,
        categoria: p.categoria,
        precio: p.precio,
        precioPromo: promo ? precioConPromo(p, db.promos, ahora).precio : null,
        promo,
        medios: p.medios,
        detalles: p.detalles,
        opciones: p.opciones,
        likes: p.likes,
        disponibilidad: disp,
        quedan: disp === "quedan" ? stock : null,
        encargoTexto: p.porEncargo ? p.encargoTexto : null,
        variantes: variantes.map((v) => {
          const precio = v.precio ?? p.precio;
          const dv = disponibilidad(v.stock, p.porEncargo);
          return {
            id: v.id,
            valores: v.valores,
            precio,
            precioPromo: promo ? precioConPromo({ ...p, precio }, db.promos, ahora).precio : null,
            disponibilidad: dv,
            quedan: dv === "quedan" ? v.stock : null,
          };
        }),
      };
    });
  return {
    tienda: {
      slug: t.slug,
      nombre: t.nombre,
      logoUrl: t.logoUrl,
      fotoPerfilUrl: null,
      marcaColorPrincipal: t.marcaColorPrincipal,
      marcaColorAcento: t.marcaColorAcento,
      marcaEstilo: t.marcaEstilo,
      personalizacion: {},
      whatsapp: null,
      instagram: null,
      descripcion: null,
      nombreVendedora: null,
      rubro: t.rubro,
    },
    productos,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Solicitudes
// ---------------------------------------------------------------------------------------------------------------------

/** Como `crear_solicitud_pedido`: el precio lo pone la base; agotado sin encargo → ProductoNoDisponible. */
export function crearSolicitudEnDB(
  db: DB,
  slug: string,
  items: LineaCarrito[],
  codigoPromo: string | null,
  dispositivo: string,
  nuevoId: () => string,
  ahora: Date,
): { db: DB; creada: SolicitudCreada } {
  const t = tiendaPublica(db, slug);
  if (!dispositivo || dispositivo.length > 64 || items.length < 1 || items.length > 30) {
    throw new DatosInvalidos("Algo falló de este lado. Recarga la página e inténtalo otra vez.");
  }
  const ms = ahora.getTime();
  // Las vencidas sin registrar de esta tienda se van
  const solicitudes = db.solicitudes.filter((s) => !(s.tiendaId === t.id && s.pedidoId === null && Date.parse(s.venceEn) < ms));
  if (
    solicitudes.filter((s) => s.dispositivo === dispositivo && Date.parse(s.creadaEn) > ms - HORA).length >= 10 ||
    solicitudes.filter((s) => s.tiendaId === t.id && Date.parse(s.creadaEn) > ms - DIA).length >= 300
  ) {
    throw new DemasiadosIntentos();
  }
  const lineas: ItemSolicitud[] = items.map((i) => {
    if (!Number.isInteger(i.cantidad) || i.cantidad < 1 || i.cantidad > 20) throw new DatosInvalidos("Algún producto trae una cantidad que no sirve.");
    const p = db.productos.find((p) => p.id === i.productoId && p.tiendaId === t.id && p.activo);
    if (!p) throw new ProductoNoDisponible();
    const activas = db.variantes.filter((v) => v.productoId === p.id && v.activa);
    const variante = activas.length > 0 ? activas.find((v) => v.id === i.varianteId) : undefined;
    if ((activas.length > 0 && !variante) || (activas.length === 0 && i.varianteId)) throw new ProductoNoDisponible(p.nombre);
    const stock = variante ? variante.stock : p.stock;
    let porEncargo = false;
    if (stock !== null && stock < i.cantidad) {
      if (!p.porEncargo) throw new ProductoNoDisponible(p.nombre);
      porEncargo = true;
    }
    return {
      productoId: p.id,
      varianteId: variante?.id ?? null,
      nombre: p.nombre,
      varianteTexto: variante ? textoVariante(p.opciones, variante.valores) : null,
      foto: p.medios.find((m) => m.tipo === "foto")?.url ?? p.fotos[0] ?? null,
      precioUnitario: precioConPromo({ ...p, precio: variante?.precio ?? p.precio }, db.promos, ahora).precio,
      cantidad: i.cantidad,
      porEncargo,
    };
  });
  const subtotal = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  const codigo = codigoPromo?.trim().toUpperCase() || null;
  let descuento = 0;
  if (codigo) {
    // Un código del catálogo: vigente, sin cliente_id y con cupo
    const promo = db.promos.find(
      (p) => p.tiendaId === t.id && p.tipo === "codigo" && p.clienteId === null && p.codigo?.toUpperCase() === codigo && !p.pausada && estadoPromo(p, ahora) === "activa",
    );
    const usos = promo ? db.pedidos.filter((pe) => pe.tiendaId === t.id && pe.estado !== "cancelado" && pe.codigoPromo?.toUpperCase() === codigo).length : 0;
    if (!promo || !promo.valorPorcentaje || (promo.limiteUsos !== null && usos >= promo.limiteUsos)) throw new CodigoNoValido("Ese código no existe o ya no está activo.");
    descuento = Math.round((subtotal * promo.valorPorcentaje) / 100);
  }
  const solicitud: SolicitudPedido & { dispositivo: string } = {
    id: nuevoId(),
    tiendaId: t.id,
    codigo: codigoSolicitud(db),
    items: lineas,
    codigoPromo: codigo,
    descuento,
    total: subtotal - descuento,
    creadaEn: ahora.toISOString(),
    venceEn: new Date(ms + 7 * DIA).toISOString(),
    pedidoId: null,
    descartadaEn: null,
    dispositivo,
  };
  return {
    db: { ...db, solicitudes: [...solicitudes, solicitud] },
    creada: { codigo: solicitud.codigo, subtotal, descuento, total: solicitud.total, codigoPromo: codigo, items: lineas, venceEn: solicitud.venceEn },
  };
}

/** enviado · confirmado · despachado · cancelado · vencido (como `estado_solicitud`). */
function estadoSolicitud(db: DB, s: SolicitudPedido, ahora: number): VistaSolicitud["estado"] {
  if (s.pedidoId) {
    const pedido = db.pedidos.find((p) => p.id === s.pedidoId);
    if (!pedido) return "cancelado";
    return pedido.estado === "despachado" ? "despachado" : pedido.estado === "cancelado" ? "cancelado" : "confirmado";
  }
  return s.descartadaEn || Date.parse(s.venceEn) < ahora ? "vencido" : "enviado";
}

export function verSolicitudDeDB(db: DB, codigo: string, tiendaActivaId: string, ahora: number): VistaSolicitud | null {
  const s = db.solicitudes.find((s) => s.codigo === codigo.trim().toUpperCase());
  if (!s) return null;
  const t = db.tiendas.find((t) => t.id === s.tiendaId);
  if (!t) return null;
  const mia = t.id === tiendaActivaId;
  return {
    id: mia ? s.id : null,
    codigo: s.codigo,
    tienda: { nombre: t.nombre, slug: t.slug, logoUrl: t.logoUrl, fotoPerfilUrl: null, whatsapp: null },
    items: s.items,
    descuento: s.descuento,
    total: s.total,
    creadaEn: s.creadaEn,
    venceEn: s.venceEn,
    estado: estadoSolicitud(db, s, ahora),
    esMiTienda: mia,
  };
}

export function solicitudesPendientesDeDB(db: DB, tiendaId: string, ahora: number): SolicitudPedido[] {
  return db.solicitudes
    .filter((s) => s.tiendaId === tiendaId && !s.pedidoId && !s.descartadaEn && Date.parse(s.venceEn) > ahora)
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
    .map(({ id, tiendaId, codigo, items, codigoPromo, descuento, total, creadaEn, venceEn, pedidoId, descartadaEn }) => ({
      id, tiendaId, codigo, items, codigoPromo, descuento, total, creadaEn, venceEn, pedidoId, descartadaEn,
    }));
}

function solicitudRegistrable(db: DB, tiendaId: string, id: string, ahora: number): SolicitudPedido {
  const s = db.solicitudes.find((s) => s.id === id && s.tiendaId === tiendaId);
  if (!s) throw new DatosInvalidos("No encontramos ese pedido. Revisa el enlace.");
  if (s.pedidoId || s.descartadaEn || Date.parse(s.venceEn) < ahora) throw new DatosInvalidos("Ese pedido ya se registró, se descartó o venció.");
  return s;
}

/** Como `registrar_solicitud`: une o crea el cliente, quita o pasa a encargo y crea el pedido `nuevo`. */
export function registrarSolicitudEnDB(db: DB, tiendaId: string, solicitudId: string, d: DatosRegistrarSolicitud, nuevoId: () => string, ahora: string) {
  const s = solicitudRegistrable(db, tiendaId, solicitudId, Date.parse(ahora));
  let clientes = db.clientes;
  let cliente: Cliente;
  if (d.clienteId) {
    const c = db.clientes.find((c) => c.id === d.clienteId && c.tiendaId === tiendaId);
    if (!c) throw new DatosInvalidos("Ese cliente ya no existe en tu tienda.");
    cliente = c;
  } else {
    const nuevo = d.clienteNuevo;
    if (!nuevo) throw new DatosInvalidos("Revisa el nombre y el WhatsApp del cliente.");
    const nombre = nuevo.nombre.trim();
    const escrito = nuevo.telefono?.trim() || null;
    const telefono = escrito ? normalizarTelefonoDO(escrito) : null;
    if (nombre.length < 1 || nombre.length > 120 || (escrito && !telefono)) throw new DatosInvalidos("Revisa el nombre y el WhatsApp del cliente.");
    const existente = telefono ? db.clientes.find((c) => c.tiendaId === tiendaId && c.telefono === telefono) : undefined;
    if (existente) throw new ClienteDuplicado(existente);
    cliente = { id: nuevoId(), tiendaId, nombre, telefono, origen: "catalogo", primerPedidoEn: ahora, nota: null };
    clientes = [...clientes, cliente];
  }
  const quitar = new Set(d.quitar ?? []);
  const encargo = new Set(d.encargo ?? []);
  const subtotalAntes = s.items.reduce((t, i) => t + i.precioUnitario * i.cantidad, 0);
  const quedan = s.items
    .filter((i) => !quitar.has(i.productoId) && !(i.varianteId && quitar.has(i.varianteId)))
    .map((i) => (encargo.has(i.productoId) || (i.varianteId && encargo.has(i.varianteId)) ? { ...i, porEncargo: true } : i));
  if (quedan.length === 0) throw new DatosInvalidos("Quitaste todo. El pedido necesita al menos un producto.");
  const subtotal = quedan.reduce((t, i) => t + i.precioUnitario * i.cantidad, 0);
  const descuento = subtotalAntes > 0 ? Math.round((s.descuento * subtotal) / subtotalAntes) : 0;

  const pedidoId = nuevoId();
  const pedido: Pedido = {
    id: pedidoId,
    tiendaId,
    numero: siguienteNumeroPedido(db, tiendaId),
    clienteId: cliente.id,
    origen: "catalogo",
    estado: "nuevo",
    total: subtotal - descuento,
    codigoPromo: s.codigoPromo,
    creadoEn: ahora,
    despachadoEn: null,
    pagoModo: "contado",
    pagoFechaAcordada: null,
  };
  const items: PedidoItem[] = quedan.map((i) => ({
    id: nuevoId(),
    pedidoId,
    productoId: i.productoId,
    nombreProducto: i.nombre,
    cantidad: i.cantidad,
    precioUnitario: i.precioUnitario,
    varianteId: i.varianteId,
    varianteTexto: i.varianteTexto,
    porEncargo: i.porEncargo,
  }));
  return {
    db: {
      ...db,
      clientes,
      pedidos: [...db.pedidos, pedido],
      pedidoItems: [...db.pedidoItems, ...items],
      solicitudes: db.solicitudes.map((x) => (x.id === s.id ? { ...x, pedidoId } : x)),
    },
    pedido: { ...conPago(pedido, []), items } satisfies PedidoConItems,
    cliente,
  };
}

export function descartarSolicitudEnDB(db: DB, tiendaId: string, solicitudId: string, ahora: string): DB {
  const s = db.solicitudes.find((s) => s.id === solicitudId && s.tiendaId === tiendaId);
  if (!s) throw new DatosInvalidos("No encontramos ese pedido. Revisa el enlace.");
  if (s.pedidoId) throw new DatosInvalidos("Ese pedido ya se registró, se descartó o venció.");
  return { ...db, solicitudes: db.solicitudes.map((x) => (x.id === s.id ? { ...x, descartadaEn: x.descartadaEn ?? ahora } : x)) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Aaahs y avisos
// ---------------------------------------------------------------------------------------------------------------------

function productoPublico(db: DB, t: Tienda, slug: string): Producto {
  const p = db.productos.find((p) => p.tiendaId === t.id && p.slug === slug.trim().toLowerCase() && p.activo);
  if (!p) throw new ProductoNoDisponible();
  return p;
}

/** Enciende o apaga el aaah de un dispositivo (uno por producto). Devuelve los likes. */
export function registrarAaahEnDB(db: DB, slug: string, productoSlug: string, dispositivo: string, on: boolean, nuevoId: () => string, ahora: Date) {
  const t = tiendaPublica(db, slug);
  const p = productoPublico(db, t, productoSlug);
  const tiene = db.eventosAaah.some((e) => e.productoId === p.id && e.dispositivo === dispositivo);
  if (on === tiene) return { db, likes: p.likes };
  if (on && db.eventosAaah.filter((e) => e.dispositivo === dispositivo && Date.parse(e.creadoEn) > ahora.getTime() - HORA).length >= 120) {
    throw new DemasiadosIntentos();
  }
  const eventosAaah = on
    ? [...db.eventosAaah, { id: nuevoId(), tiendaId: t.id, productoId: p.id, creadoEn: ahora.toISOString(), dispositivo }]
    : db.eventosAaah.filter((e) => !(e.productoId === p.id && e.dispositivo === dispositivo));
  const likes = Math.max(0, p.likes + (on ? 1 : -1));
  return { db: { ...db, eventosAaah, productos: db.productos.map((x) => (x.id === p.id ? { ...x, likes } : x)) }, likes };
}

/** Solo en algo agotado o por encargo; un aviso pendiente igual no se repite. */
export function pedirAvisoEnDB(
  db: DB,
  slug: string,
  productoSlug: string,
  varianteId: string | null,
  telefono: string,
  nombre: string | null,
  dispositivo: string,
  nuevoId: () => string,
  ahora: Date,
): DB {
  const t = tiendaPublica(db, slug);
  const tel = telefonoDO(telefono);
  if (!tel) throw new DatosInvalidos("Escribe un WhatsApp dominicano: 809, 829 o 849 y siete números.");
  const limpio = nombre?.trim() || null;
  if (limpio && limpio.length > 60) throw new DatosInvalidos("El nombre puede tener hasta 60 caracteres.");
  const p = productoPublico(db, t, productoSlug);
  if (p.tipo !== "producto") throw new ProductoNoDisponible();
  const activas = db.variantes.filter((v) => v.productoId === p.id && v.activa);
  let stock: number | null;
  if (varianteId) {
    const v = activas.find((v) => v.id === varianteId);
    if (!v) throw new ProductoNoDisponible();
    stock = v.stock;
  } else {
    stock = stockPublico(p, activas);
  }
  const d = disponibilidad(stock, p.porEncargo);
  if (d !== "agotado" && d !== "por_encargo") throw new DatosInvalidos("Eso todavía está disponible: se puede pedir ya.");
  const avisos = db.avisos;
  if (avisos.filter((a) => a.dispositivo === dispositivo && Date.parse(a.creadoEn) > ahora.getTime() - HORA).length >= 10) throw new DemasiadosIntentos();
  if (avisos.some((a) => a.productoId === p.id && a.varianteId === varianteId && a.telefono === tel && !a.avisadoEn)) return db;
  const aviso = { id: nuevoId(), tiendaId: t.id, productoId: p.id, varianteId, telefono: tel, nombre: limpio, creadoEn: ahora.toISOString(), avisadoEn: null, dispositivo };
  return { ...db, avisos: [...db.avisos, aviso] };
}

export function avisosDeProductoDeDB(db: DB, tiendaId: string, productoId: string): AvisoLlegada[] {
  return db.avisos
    .filter((a) => a.tiendaId === tiendaId && a.productoId === productoId && !a.avisadoEn)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
    .map(({ id, tiendaId, productoId, varianteId, telefono, nombre, creadoEn, avisadoEn }) => ({
      id, tiendaId, productoId, varianteId, telefono, nombre, creadoEn, avisadoEn,
    }));
}

export function marcarAvisadoEnDB(db: DB, tiendaId: string, ids: string[], ahora: string): { db: DB; n: number } {
  const cerrar = new Set(db.avisos.filter((a) => a.tiendaId === tiendaId && !a.avisadoEn && ids.includes(a.id)).map((a) => a.id));
  return { db: { ...db, avisos: db.avisos.map((a) => (cerrar.has(a.id) ? { ...a, avisadoEn: ahora } : a)) }, n: cerrar.size };
}
