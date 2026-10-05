import { eliminarProductoDeDB, revisarEliminacionProducto } from "./eliminar-producto";
// La demo: un almacén en el navegador (memoria + localStorage), sin login, con selector de tienda.
// Implementa la misma interfaz que Supabase (lib/data/fuente.ts). Ver docs/05-arquitectura.md.

import type { CambiosProducto, Cliente, ClienteConResumen, EnvioJugada, EventoAaah, NuevoProducto, PedidoConItems, Producto, Promo, Tienda, Usuario } from "../types";
import { CREDITOS_POR_RETOQUE } from "../config";
import type { CambiosAbono } from "../credito";
import type { Abono, MotivoAjusteInventario } from "../types";
import { DatosInvalidos, FuncionApagada } from "./errores";
import { FUNCIONES } from "../funciones";
import { cuentaDelCliente, cuentasDeTienda, editarAbonoDemo, quitarAbonoDemo, registrarAbonoDemo } from "./creditos";
import { clienteDeTienda, clientesDeTienda, insertarCliente, modificarCliente, modificarNotaCliente } from "./clientes";
import { eliminarClienteDeDB } from "./eliminar-cliente";
import { construirDesdeSeed, esDB, migrar, nuevoId, type DB } from "./db";
import type { DatosAbonoNuevo, DatosPago, ExtraNuevoProducto, FuenteDatos } from "./fuente";
import {
  cambiarEstadoPedido,
  aplicarCodigoAlPedido,
  cambiarPagoDePedido,
  despacharPedido,
  modificarPedido,
  quitarPedido,
  type DatosEdicionPedido,
  deshacerDespacho as deshacerDespachoDemo,
  insertarPedidoManual,
  insertarPedidoSimulado,
  pedidoDeTienda,
  pedidosDeTienda,
  type DatosPedidoManual,
} from "./pedidos";
import { conVariantes, fotosDesdeMedios, insertarProducto, mediosDesdeFotos, modificarProducto, productoDeTienda, productosDeTienda, validarCatalogo } from "./productos";
import { insertarPromo, modificarPromo, promosDeTienda, terminarPromoDeTienda } from "./promos";
import { crearCodigoClienteEnDB, enviosDeTienda, registrarEnvioEnDB } from "./jugadas";
import type { DatosPromo } from "../promos";
import { eventosAaahDeTienda } from "./resumen";
import { ajustarStockEnDB, guardarProductoEnDB, validarReposicion } from "./inventario";
import {
  avisosDeProductoDeDB,
  catalogoPublicoDeDB,
  crearSolicitudEnDB,
  descartarSolicitudEnDB,
  guardarVariantesEnDB,
  marcarAvisadoEnDB,
  pedirAvisoEnDB,
  registrarAaahEnDB,
  registrarSolicitudEnDB,
  solicitudesPendientesDeDB,
  solicitudPorCodigoDeDB,
  verSolicitudDeDB,
} from "./catalogo";
import {
  avanzarCatalogoDemo,
  buscarDueno,
  buscarTienda,
  descontarCreditos,
  listarTiendas,
  modificarMarca,
  pedirCambiosDelCatalogo,
  pedirCatalogo,
  publicarElCatalogo,
  type DatosMarca,
} from "./tiendas";

// Subir la versión cuando cambie la forma de los datos: lo guardado con la forma vieja se ignora.
const KEY = "deslizapp-demo-v5";
const KEY_SESION = "deslizapp-sesion-v1";

export type EstadoDemo = {
  db: DB;
  /** Simula "la tienda con sesión activa" mientras no hay login real. */
  tiendaActivaId: string;
  /** Sube con cada cambio; las consultas lo usan para volver a leer. */
  version: number;
};

// ---------------------------------------------------------------------------
// Almacén (fuera de React, para poder leerlo con useSyncExternalStore)
// ---------------------------------------------------------------------------

let estado: EstadoDemo | null = null;
const oyentes = new Set<() => void>();

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function cargarInicial(version = 0): EstadoDemo {
  let db: DB | null = null;
  const guardado = leerLocal(KEY);
  if (guardado) {
    try {
      const parseado: unknown = JSON.parse(guardado);
      if (esDB(parseado)) db = migrar(parseado);
    } catch {
      // Guardado corrupto: se vuelve al seed.
    }
  }
  db ??= construirDesdeSeed();
  return { db, tiendaActivaId: tiendaValida(db, leerLocal(KEY_SESION)), version };
}

function tiendaValida(db: DB, id: string | null): string {
  if (id && db.tiendas.some((t) => t.id === id)) return id;
  return listarTiendas(db)[0]?.id ?? "";
}

export function leerDemo(): EstadoDemo {
  estado ??= cargarInicial();
  return estado;
}

function emitir() {
  for (const oyente of oyentes) oyente();
}

function persistir(e: EstadoDemo) {
  try {
    localStorage.setItem(KEY, JSON.stringify(e.db));
    localStorage.setItem(KEY_SESION, e.tiendaActivaId);
  } catch (error) {
    console.warn("No se pudo guardar la demo en localStorage", error);
  }
}

function escribir(cambio: (db: DB) => DB) {
  const actual = leerDemo();
  estado = { ...actual, db: cambio(actual.db), version: actual.version + 1 };
  persistir(estado);
  emitir();
}

/** Si otra pestaña cambia la demo, esta se entera. */
function alCambiarOtraPestana(evento: StorageEvent) {
  if (evento.key !== null && evento.key !== KEY && evento.key !== KEY_SESION) return;
  estado = cargarInicial((estado?.version ?? 0) + 1);
  emitir();
}

export function suscribirDemo(oyente: () => void) {
  if (oyentes.size === 0) window.addEventListener("storage", alCambiarOtraPestana);
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) window.removeEventListener("storage", alCambiarOtraPestana);
  };
}

// ---------------------------------------------------------------------------
// Operaciones (lo que ven las pantallas a través de useData)
// ---------------------------------------------------------------------------

const ahora = () => new Date().toISOString();

export const fuenteDemo: FuenteDatos = {
  // Tiendas
  async getTiendas(): Promise<Tienda[]> {
    return listarTiendas(leerDemo().db);
  },
  async getTienda(tiendaId: string): Promise<Tienda | null> {
    return buscarTienda(leerDemo().db, tiendaId);
  },
  async getDueno(tiendaId: string): Promise<Usuario | null> {
    return buscarDueno(leerDemo().db, tiendaId);
  },
  /**
   * Gasta los créditos de retocar `fotos` fotos (CREDITOS_POR_RETOQUE cada una).
   * Lanza CreditosInsuficientes si no alcanzan. Devuelve la tienda con el saldo nuevo.
   */
  async usarCreditosRetoque(tiendaId: string, fotos = 1): Promise<Tienda> {
    let actualizada!: Tienda;
    escribir((db) => {
      const r = descontarCreditos(db, tiendaId, fotos * CREDITOS_POR_RETOQUE);
      actualizada = r.tienda;
      return r.db;
    });
    return actualizada;
  },

  /** "Mi marca": logo, colores, estilo tipográfico y enlace del catálogo. */
  async actualizarMarca(tiendaId: string, datos: DatosMarca): Promise<Tienda> {
    let actualizada!: Tienda;
    escribir((db) => {
      const r = modificarMarca(db, tiendaId, datos);
      actualizada = r.tienda;
      return r.db;
    });
    return actualizada;
  },

  // Catálogo en línea
  async solicitarCatalogo(tiendaId: string): Promise<Tienda> {
    let t!: Tienda;
    escribir((db) => {
      const r = pedirCatalogo(db, tiendaId, ahora());
      t = r.tienda;
      return r.db;
    });
    return t;
  },
  async pedirCambiosCatalogo(tiendaId: string, notas: string): Promise<Tienda> {
    let t!: Tienda;
    escribir((db) => {
      const r = pedirCambiosDelCatalogo(db, tiendaId, notas);
      t = r.tienda;
      return r.db;
    });
    return t;
  },
  async publicarCatalogo(tiendaId: string): Promise<Tienda> {
    let t!: Tienda;
    escribir((db) => {
      const r = publicarElCatalogo(db, tiendaId, ahora());
      t = r.tienda;
      return r.db;
    });
    return t;
  },
  async releerTienda(): Promise<void> {
    // La demo vive en el navegador: no hay nadie más que cambie el estado.
  },
  async simularAvanceCatalogo(tiendaId: string): Promise<Tienda> {
    let t!: Tienda;
    escribir((db) => {
      const r = avanzarCatalogoDemo(db, tiendaId);
      t = r.tienda;
      return r.db;
    });
    return t;
  },

  // Productos
  async getProductos(tiendaId: string, incluirEliminados = false): Promise<Producto[]> {
    return productosDeTienda(leerDemo().db, tiendaId, incluirEliminados);
  },
  async getProducto(tiendaId: string, id: string): Promise<Producto | null> {
    return productoDeTienda(leerDemo().db, tiendaId, id);
  },
  async revisarEliminacionProducto(tiendaId, id) {
    return revisarEliminacionProducto(leerDemo().db, tiendaId, id, ahora());
  },
  async eliminarProducto(tiendaId, id) {
    escribir(db => eliminarProductoDeDB(db, tiendaId, id, ahora()));
  },
  async crearProducto(tiendaId: string, datos: NuevoProducto, extra?: ExtraNuevoProducto): Promise<Producto> {
    let creado!: Producto;
    // Todo en una sola escritura, como la RPC crear_producto: si algo falla, no queda nada.
    escribir((db) => {
      let d = extra?.retoques ? descontarCreditos(db, tiendaId, extra.retoques * CREDITOS_POR_RETOQUE).db : db;
      const r = insertarProducto(d, tiendaId, datos, nuevoId(), ahora());
      d = r.db;
      creado = r.producto;
      if (extra?.opciones?.length) {
        const actor = d.usuarios.find((u) => u.tiendaId === tiendaId);
        if (!actor) throw new DatosInvalidos("No hay una cuenta asociada a esta tienda.");
        const v = guardarVariantesEnDB(d, tiendaId, creado.id, extra.opciones, extra.variantes ?? [], actor.id, nuevoId, ahora());
        d = v.db;
        creado = v.producto;
      }
      return d;
    });
    return creado;
  },
  async actualizarProducto(tiendaId: string, id: string, cambios: CambiosProducto): Promise<Producto> {
    let actualizado!: Producto;
    escribir((db) => {
      const actual = productoDeTienda(db, tiendaId, id);
      if (!actual) throw new DatosInvalidos("Ese producto ya no existe en esta tienda.");
      if (cambios.stock !== undefined && cambios.stock !== actual.stock) {
        throw new DatosInvalidos("Para ajustar el inventario, vuelve a la vista previa del producto.");
      }
      const soloFicha = { ...cambios };
      delete soloFicha.stock;
      const r = modificarProducto(db, tiendaId, id, soloFicha, ahora());
      actualizado = r.producto;
      return r.db;
    });
    return actualizado;
  },
  async ajustarStock(tiendaId, productoId, variacion, motivo, nota = null, varianteId = null) {
    let actualizado!: Producto;
    escribir((db) => {
      const actor = db.usuarios.find((u) => u.tiendaId === tiendaId);
      if (!actor) throw new Error("No hay una cuenta asociada a esta tienda.");
      const r = ajustarStockEnDB(db, tiendaId, productoId, variacion, motivo as MotivoAjusteInventario, nota, actor.id, nuevoId(), ahora(), varianteId);
      actualizado = productoDeTienda(r.db, tiendaId, productoId) ?? r.producto;
      return r.db;
    });
    return actualizado;
  },
  async reponerStock(tiendaId, items, nota = null) {
    validarReposicion(items);
    const actualizados: Producto[] = [];
    escribir((db) => {
      const actor = db.usuarios.find((u) => u.tiendaId === tiendaId);
      if (!actor) throw new Error("No hay una cuenta asociada a esta tienda.");
      // Todo o nada: si una línea falla, `escribir` no guarda nada.
      let siguiente = db;
      for (const { productoId, cantidad, varianteId } of items) {
        const r = ajustarStockEnDB(siguiente, tiendaId, productoId, cantidad, "reposicion", nota, actor.id, nuevoId(), ahora(), varianteId ?? null);
        siguiente = r.db;
      }
      // Uno por producto, con su stock final (como la RPC)
      for (const id of new Set(items.map((i) => i.productoId))) {
        const p = productoDeTienda(siguiente, tiendaId, id);
        if (p) actualizados.push(p);
      }
      return siguiente;
    });
    return actualizados;
  },
  async cambiarVisibilidad(tiendaId, ids, activo) {
    const actualizados: Producto[] = [];
    escribir((db) => {
      let siguiente = db;
      for (const id of ids) {
        const r = modificarProducto(siguiente, tiendaId, id, { activo }, ahora());
        siguiente = r.db;
        actualizados.push(r.producto);
      }
      return siguiente;
    });
    return actualizados;
  },

  async guardarProductoConInventario(tiendaId, productoId, cambios, propuesta, retocar = false) {
    let actualizado!: Producto;
    escribir((db) => {
      const actor = db.usuarios.find(u => u.tiendaId === tiendaId);
      if (!actor) throw new DatosInvalidos("No hay una cuenta asociada a esta tienda.");
      const r = guardarProductoEnDB(db, tiendaId, productoId, cambios, propuesta, actor.id, ahora());
      // Ficha, catálogo (medios, detalles, encargo), créditos y ajuste se confirman juntos en la misma escritura local, con la
      // sincronía medios ↔ fotos y las mismas reglas que la base (como guardar_producto_inventario).
      const antes = db.productos.find((p) => p.id === productoId)!;
      let producto: Producto = r.producto;
      if (cambios.medios) producto = { ...producto, ...fotosDesdeMedios(cambios.medios) };
      else if (cambios.fotos || cambios.fotoRetocada !== undefined) producto = { ...producto, medios: mediosDesdeFotos(producto.fotos, producto.fotoRetocada, antes.medios) };
      validarCatalogo(r.db, producto);
      const d = { ...r.db, productos: r.db.productos.map((p) => (p.id === productoId ? producto : p)) };
      actualizado = conVariantes(d, producto);
      return retocar && !(propuesta && db.ajustesInventario.some(a => a.id === propuesta.id))
        ? descontarCreditos(d, tiendaId, CREDITOS_POR_RETOQUE).db : d;
    });
    return actualizado;
  },
  async getAjustesInventario(tiendaId, productoId, desde = 0, limite = 10) {
    const db = leerDemo().db;
    const todos = db.ajustesInventario.filter(a => a.tiendaId === tiendaId && a.productoId === productoId)
      .sort((a,b) => b.creadoEn.localeCompare(a.creadoEn) || b.id.localeCompare(a.id));
    return { ajustes: todos.slice(desde, desde + limite).map(a => ({ ...a, actorNombre: db.usuarios.find(u => u.id === a.actorId && u.tiendaId === tiendaId)?.nombre || "Cuenta de la tienda" })), hayMas: todos.length > desde + limite };
  },
  async revisarGuardadoInventario(tiendaId, productoId, ajusteId) {
    const db = leerDemo().db;
    return { producto: productoDeTienda(db, tiendaId, productoId), ajuste: db.ajustesInventario.find(a => a.id === ajusteId && a.tiendaId === tiendaId && a.productoId === productoId) ?? null };
  },

  // Variantes
  async guardarVariantes(tiendaId, productoId, opciones, variantes) {
    let actualizado!: Producto;
    escribir((db) => {
      const actor = db.usuarios.find((u) => u.tiendaId === tiendaId);
      if (!actor) throw new DatosInvalidos("No hay una cuenta asociada a esta tienda.");
      const r = guardarVariantesEnDB(db, tiendaId, productoId, opciones, variantes, actor.id, nuevoId, ahora());
      actualizado = r.producto;
      return r.db;
    });
    return actualizado;
  },

  // Pedidos
  async getPedidos(tiendaId: string): Promise<PedidoConItems[]> {
    return pedidosDeTienda(leerDemo().db, tiendaId);
  },
  async getPedido(tiendaId: string, id: string): Promise<PedidoConItems | null> {
    return pedidoDeTienda(leerDemo().db, tiendaId, id);
  },
  /** Nuevo → Por despachar. */
  async confirmarPedido(tiendaId: string, id: string): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = cambiarEstadoPedido(db, tiendaId, id, "por_despachar");
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  async cancelarPedido(tiendaId: string, id: string): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = cambiarEstadoPedido(db, tiendaId, id, "cancelado");
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  /**
   * Por despachar → Despachado: descuenta el stock de cada producto. Lanza StockInsuficiente
   * (sin cambiar nada) si algún producto no alcanza. `agotados` = productos que quedaron en 0.
   */
  async aplicarCodigoPedido(tiendaId: string, id: string, codigo: string | null): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = aplicarCodigoAlPedido(db, tiendaId, id, codigo, ahora());
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  async editarPedido(tiendaId: string, id: string, datos: DatosEdicionPedido): Promise<{ pedido: PedidoConItems; cliente: Cliente }> {
    let resultado!: { pedido: PedidoConItems; cliente: Cliente };
    escribir((db) => {
      const r = modificarPedido(db, tiendaId, id, datos, ahora());
      resultado = { pedido: r.pedido, cliente: r.cliente };
      return r.db;
    });
    return resultado;
  },
  async cambiarPagoPedido(tiendaId: string, id: string, datos: DatosPago): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = cambiarPagoDePedido(db, tiendaId, id, datos, nuevoId, ahora());
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  async eliminarPedido(tiendaId: string, id: string): Promise<void> {
    escribir((db) => quitarPedido(db, tiendaId, id));
  },
  async volverPedidoARecibido(tiendaId: string, id: string): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = cambiarEstadoPedido(db, tiendaId, id, "nuevo");
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  async reabrirPedido(tiendaId: string, id: string): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = cambiarEstadoPedido(db, tiendaId, id, "nuevo");
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  async deshacerDespacho(tiendaId: string, id: string): Promise<PedidoConItems> {
    let resultado!: PedidoConItems;
    escribir((db) => {
      const r = deshacerDespachoDemo(db, tiendaId, id, ahora());
      resultado = r.pedido;
      return r.db;
    });
    return resultado;
  },
  async despacharPedido(tiendaId: string, id: string): Promise<{ pedido: PedidoConItems; agotados: string[] }> {
    let resultado!: { pedido: PedidoConItems; agotados: string[] };
    escribir((db) => {
      const r = despacharPedido(db, tiendaId, id, ahora());
      resultado = { pedido: r.pedido, agotados: r.agotados };
      return r.db;
    });
    return resultado;
  },
  /** Pedido manual: entra directo en Por despachar con el siguiente número de la tienda. */
  async crearPedidoManual(tiendaId: string, datos: DatosPedidoManual): Promise<{ pedido: PedidoConItems; cliente: Cliente }> {
    let resultado!: { pedido: PedidoConItems; cliente: Cliente };
    escribir((db) => {
      const r = insertarPedidoManual(db, tiendaId, datos, nuevoId, ahora());
      resultado = { pedido: r.pedido, cliente: r.cliente };
      return r.db;
    });
    return resultado;
  },

  // Ventas a crédito y abonos
  async registrarAbono(datos: DatosAbonoNuevo): Promise<Abono[]> {
    let creados!: Abono[];
    escribir((db) => {
      const r = registrarAbonoDemo(db, datos, nuevoId, ahora());
      creados = r.abonos;
      return r.db;
    });
    return creados;
  },
  async editarAbono(tiendaId: string, abonoId: string, cambios: CambiosAbono): Promise<Abono> {
    let editado!: Abono;
    escribir((db) => {
      const r = editarAbonoDemo(db, tiendaId, abonoId, cambios, Date.parse(ahora()));
      editado = r.abono;
      return r.db;
    });
    return editado;
  },
  async eliminarAbono(tiendaId: string, abonoId: string): Promise<void> {
    escribir((db) => quitarAbonoDemo(db, tiendaId, abonoId));
  },
  async getCuentasPorCobrar(tiendaId: string) {
    return cuentasDeTienda(leerDemo().db, tiendaId, Date.now());
  },
  async getCuentaCliente(tiendaId: string, clienteId: string) {
    return cuentaDelCliente(leerDemo().db, tiendaId, clienteId, Date.now());
  },

  // Clientes
  /** Clientes con lo derivado de sus pedidos (cantidad, total gastado, última compra, "repite"). */
  async getClientes(tiendaId: string): Promise<ClienteConResumen[]> {
    return clientesDeTienda(leerDemo().db, tiendaId);
  },
  async getCliente(tiendaId: string, id: string): Promise<ClienteConResumen | null> {
    return clienteDeTienda(leerDemo().db, tiendaId, id);
  },
  /** "+ Cliente". Lanza ClienteDuplicado si el WhatsApp ya es de otro cliente de la tienda. */
  async crearCliente(tiendaId: string, datos: { nombre: string; telefono: string; nota?: string | null }): Promise<Cliente> {
    let creado!: Cliente;
    escribir((db) => {
      const r = insertarCliente(db, tiendaId, datos, nuevoId(), ahora());
      creado = r.cliente;
      return r.db;
    });
    return creado;
  },
  /** Cambia nombre y WhatsApp; conserva pedidos, origen y nota. */
  async actualizarCliente(tiendaId, id, datos) {
    let actualizado!: Cliente;
    escribir((db) => {
      const r = modificarCliente(db, tiendaId, id, datos);
      actualizado = r.cliente;
      return r.db;
    });
    return actualizado;
  },
  async eliminarCliente(tiendaId, id, borrarPedidos = false) {
    escribir((db) => eliminarClienteDeDB(db, tiendaId, id, borrarPedidos));
  },
  /** Guarda la nota de un cliente (vacía = la borra). */
  async actualizarNotaCliente(tiendaId: string, id: string, nota: string | null): Promise<Cliente> {
    let actualizado!: Cliente;
    escribir((db) => {
      const r = modificarNotaCliente(db, tiendaId, id, nota);
      actualizado = r.cliente;
      return r.db;
    });
    return actualizado;
  },

  // Promos
  async getPromos(tiendaId: string): Promise<Promo[]> {
    return promosDeTienda(leerDemo().db, tiendaId);
  },

  /** Lanza PromoInvalida (con los errores por campo) si algo no cumple las reglas. */
  async crearPromo(tiendaId: string, datos: DatosPromo): Promise<Promo> {
    let creada!: Promo;
    escribir((db) => {
      const r = insertarPromo(db, tiendaId, datos, nuevoId(), new Date());
      creada = r.promo;
      return r.db;
    });
    return creada;
  },
  async actualizarPromo(tiendaId: string, id: string, datos: DatosPromo): Promise<Promo> {
    let actualizada!: Promo;
    escribir((db) => {
      const r = modificarPromo(db, tiendaId, id, datos, new Date());
      actualizada = r.promo;
      return r.db;
    });
    return actualizada;
  },
  async crearCodigoCliente(tiendaId, clienteId, porcentaje, dias, codigo) {
    if (!FUNCIONES.proximaJugada) throw new FuncionApagada();
    let creada!: Promo;
    escribir((db) => {
      const r = crearCodigoClienteEnDB(db, tiendaId, clienteId, porcentaje, dias, codigo, nuevoId(), Date.now());
      creada = r.promo;
      return r.db;
    });
    return creada;
  },
  async registrarEnvioJugada(tiendaId, datos) {
    if (!FUNCIONES.proximaJugada) throw new FuncionApagada();
    let envio!: EnvioJugada;
    escribir((db) => {
      const r = registrarEnvioEnDB(db, tiendaId, datos, nuevoId(), Date.now());
      envio = r.envio;
      return r.db;
    });
    return envio;
  },
  async enviosJugada(tiendaId) {
    if (!FUNCIONES.proximaJugada) return [];
    return enviosDeTienda(leerDemo().db, tiendaId, Date.now());
  },
  /** La termina el dueño. No se puede reactivar. */
  async terminarPromo(tiendaId: string, id: string): Promise<Promo> {
    let terminada!: Promo;
    escribir((db) => {
      const r = terminarPromoDeTienda(db, tiendaId, id, new Date());
      terminada = r.promo;
      return r.db;
    });
    return terminada;
  },

  // Aaahs
  async getEventosAaah(tiendaId: string): Promise<EventoAaah[]> {
    return eventosAaahDeTienda(leerDemo().db, tiendaId);
  },

  // Solicitudes del catálogo
  async solicitudesPendientes(tiendaId) {
    return solicitudesPendientesDeDB(leerDemo().db, tiendaId, Date.now());
  },
  async registrarSolicitud(tiendaId, solicitudId, datos) {
    let resultado!: { pedido: PedidoConItems; cliente: Cliente };
    escribir((db) => {
      const r = registrarSolicitudEnDB(db, tiendaId, solicitudId, datos, nuevoId, ahora());
      resultado = { pedido: r.pedido, cliente: r.cliente };
      return r.db;
    });
    return resultado;
  },
  async solicitudPorCodigo(codigo) {
    const e = leerDemo();
    return solicitudPorCodigoDeDB(e.db, codigo, e.tiendaActivaId);
  },
  async descartarSolicitud(tiendaId, solicitudId) {
    escribir((db) => descartarSolicitudEnDB(db, tiendaId, solicitudId, ahora()));
  },

  // Avísame cuando llegue
  async avisosPendientes(tiendaId) {
    const db = leerDemo().db;
    return db.productos.filter((p) => p.tiendaId === tiendaId).flatMap((p) => avisosDeProductoDeDB(db, tiendaId, p.id)).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  },
  async avisosDeProducto(tiendaId, productoId) {
    return avisosDeProductoDeDB(leerDemo().db, tiendaId, productoId);
  },
  async marcarAvisado(tiendaId, avisoIds) {
    let n = 0;
    escribir((db) => {
      const r = marcarAvisadoEnDB(db, tiendaId, avisoIds, ahora());
      n = r.n;
      return r.db;
    });
    return n;
  },

  // Catálogo público
  async catalogoPublico(slug) {
    return catalogoPublicoDeDB(leerDemo().db, slug, new Date());
  },
  async crearSolicitudPedido(slug, items, codigoPromo, dispositivo) {
    let creada!: Awaited<ReturnType<FuenteDatos["crearSolicitudPedido"]>>;
    escribir((db) => {
      const r = crearSolicitudEnDB(db, slug, items, codigoPromo, dispositivo, nuevoId, new Date());
      creada = r.creada;
      return r.db;
    });
    return creada;
  },
  async verSolicitud(codigo) {
    const e = leerDemo();
    return verSolicitudDeDB(e.db, codigo, e.tiendaActivaId, Date.now());
  },
  async registrarAaah(slug, productoSlug, dispositivo, on) {
    let likes = 0;
    escribir((db) => {
      const r = registrarAaahEnDB(db, slug, productoSlug, dispositivo, on, nuevoId, new Date());
      likes = r.likes;
      return r.db;
    });
    return likes;
  },
  async pedirAviso(slug, productoSlug, varianteId, telefono, nombre, dispositivo) {
    escribir((db) => pedirAvisoEnDB(db, slug, productoSlug, varianteId, telefono, nombre, dispositivo, nuevoId, new Date()));
  },

  // Acciones de demo
  /** Crea un pedido `nuevo` "del catálogo" con productos al azar de la tienda. */
  async simularPedidoCatalogo(tiendaId: string): Promise<{ pedido: PedidoConItems; cliente: Cliente }> {
    let resultado!: { pedido: PedidoConItems; cliente: Cliente };
    escribir((db) => {
      const r = insertarPedidoSimulado(db, tiendaId, Math.random, nuevoId, ahora());
      resultado = { pedido: r.pedido, cliente: r.cliente };
      return r.db;
    });
    return resultado;
  },
  /** Borra lo guardado y vuelve al seed. Se queda en la misma tienda si sigue existiendo. */
  async reiniciarDemo(): Promise<void> {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nada que borrar.
    }
    const actual = leerDemo();
    const db = construirDesdeSeed();
    estado = { db, tiendaActivaId: tiendaValida(db, actual.tiendaActivaId), version: actual.version + 1 };
    persistir(estado);
    emitir();
  },
};

export function cambiarTiendaActivaDemo(tiendaId: string) {
  const actual = leerDemo();
  if (!actual.db.tiendas.some((t) => t.id === tiendaId) || actual.tiendaActivaId === tiendaId) return;
  estado = { ...actual, tiendaActivaId: tiendaId, version: actual.version + 1 };
  persistir(estado);
  emitir();
}

/** Demo: de qué tienda (de este navegador) es la solicitud de ese código, para "Ver como la tienda". null si no está aquí. */
export function tiendaDeSolicitudDemo(codigo: string): string | null {
  return leerDemo().db.solicitudes.find((s) => s.codigo === codigo.trim().toUpperCase())?.tiendaId ?? null;
}
