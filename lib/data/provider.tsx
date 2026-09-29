"use client";

// DataProvider: el almacén de la demo, en el navegador (estado de React + localStorage).
// Ver docs/05-arquitectura.md. Las pantallas solo ven `useData()`; el día que se conecte
// Supabase se reescribe el interior de estas operaciones y ninguna pantalla cambia.

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type {
  CambiosProducto,
  Cliente,
  ClienteConResumen,
  EventoAaah,
  NuevoProducto,
  PedidoConItems,
  Producto,
  Promo,
  Tienda,
  Usuario,
} from "../types";
import { CREDITOS_POR_RETOQUE } from "../config";
import { clienteDeTienda, clientesDeTienda, insertarCliente, modificarNotaCliente } from "./clientes";
import { construirDesdeSeed, esDB, migrar, nuevoId, type DB } from "./db";
import {
  cambiarEstadoPedido,
  despacharPedido,
  insertarPedidoManual,
  insertarPedidoSimulado,
  pedidoDeTienda,
  pedidosDeTienda,
  type DatosPedidoManual,
} from "./pedidos";
import { insertarProducto, modificarProducto, productoDeTienda, productosDeTienda } from "./productos";
import { insertarPromo, modificarPromo, promosDeTienda, terminarPromoDeTienda } from "./promos";
import type { DatosPromo } from "../promos";
import { eventosAaahDeTienda } from "./resumen";
import { buscarDueno, buscarTienda, descontarCreditos, listarTiendas, modificarMarca, type DatosMarca } from "./tiendas";

// Subir la versión cuando cambie la forma de los datos: lo guardado con la forma vieja se ignora.
const KEY = "deslizapp-demo-v2";
const KEY_SESION = "deslizapp-sesion-v1";

type Estado = {
  db: DB;
  /** Simula "la tienda con sesión activa" mientras no hay login real. */
  tiendaActivaId: string;
  /** Sube con cada cambio; las consultas lo usan para volver a leer. */
  version: number;
};

// ---------------------------------------------------------------------------
// Almacén (fuera de React, para poder leerlo con useSyncExternalStore)
// ---------------------------------------------------------------------------

let estado: Estado | null = null;
const oyentes = new Set<() => void>();

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function cargarInicial(version = 0): Estado {
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

function leer(): Estado {
  estado ??= cargarInicial();
  return estado;
}

function emitir() {
  for (const oyente of oyentes) oyente();
}

function persistir(e: Estado) {
  try {
    localStorage.setItem(KEY, JSON.stringify(e.db));
    localStorage.setItem(KEY_SESION, e.tiendaActivaId);
  } catch (error) {
    console.warn("No se pudo guardar la demo en localStorage", error);
  }
}

function escribir(cambio: (db: DB) => DB) {
  const actual = leer();
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

function suscribir(oyente: () => void) {
  if (oyentes.size === 0) window.addEventListener("storage", alCambiarOtraPestana);
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
    if (oyentes.size === 0) window.removeEventListener("storage", alCambiarOtraPestana);
  };
}

// En el servidor no hay localStorage: la app se pinta cuando el navegador tiene los datos.
const sinDatosEnServidor = () => null;

// ---------------------------------------------------------------------------
// Operaciones (lo que ven las pantallas a través de useData)
// ---------------------------------------------------------------------------

const ahora = () => new Date().toISOString();

const operaciones = {
  // Tiendas
  async getTiendas(): Promise<Tienda[]> {
    return listarTiendas(leer().db);
  },
  async getTienda(tiendaId: string): Promise<Tienda | null> {
    return buscarTienda(leer().db, tiendaId);
  },
  async getDueno(tiendaId: string): Promise<Usuario | null> {
    return buscarDueno(leer().db, tiendaId);
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

  // Productos
  async getProductos(tiendaId: string): Promise<Producto[]> {
    return productosDeTienda(leer().db, tiendaId);
  },
  async getProducto(tiendaId: string, id: string): Promise<Producto | null> {
    return productoDeTienda(leer().db, tiendaId, id);
  },
  async crearProducto(tiendaId: string, datos: NuevoProducto): Promise<Producto> {
    let creado!: Producto;
    escribir((db) => {
      const r = insertarProducto(db, tiendaId, datos, nuevoId(), ahora());
      creado = r.producto;
      return r.db;
    });
    return creado;
  },
  async actualizarProducto(tiendaId: string, id: string, cambios: CambiosProducto): Promise<Producto> {
    let actualizado!: Producto;
    escribir((db) => {
      const r = modificarProducto(db, tiendaId, id, cambios, ahora());
      actualizado = r.producto;
      return r.db;
    });
    return actualizado;
  },

  // Pedidos
  async getPedidos(tiendaId: string): Promise<PedidoConItems[]> {
    return pedidosDeTienda(leer().db, tiendaId);
  },
  async getPedido(tiendaId: string, id: string): Promise<PedidoConItems | null> {
    return pedidoDeTienda(leer().db, tiendaId, id);
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

  // Clientes
  /** Clientes con lo derivado de sus pedidos (cantidad, total gastado, última compra, "repite"). */
  async getClientes(tiendaId: string): Promise<ClienteConResumen[]> {
    return clientesDeTienda(leer().db, tiendaId);
  },
  async getCliente(tiendaId: string, id: string): Promise<ClienteConResumen | null> {
    return clienteDeTienda(leer().db, tiendaId, id);
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
    return promosDeTienda(leer().db, tiendaId);
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
    return eventosAaahDeTienda(leer().db, tiendaId);
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
    const actual = leer();
    const db = construirDesdeSeed();
    estado = { db, tiendaActivaId: tiendaValida(db, actual.tiendaActivaId), version: actual.version + 1 };
    persistir(estado);
    emitir();
  },
};

function cambiarTiendaActiva(tiendaId: string) {
  const actual = leer();
  if (!actual.db.tiendas.some((t) => t.id === tiendaId) || actual.tiendaActivaId === tiendaId) return;
  estado = { ...actual, tiendaActivaId: tiendaId, version: actual.version + 1 };
  persistir(estado);
  emitir();
}

// ---------------------------------------------------------------------------
// React
// ---------------------------------------------------------------------------

export type DataContexto = typeof operaciones & {
  tiendaActivaId: string;
  cambiarTiendaActiva: (tiendaId: string) => void;
  version: number;
};

const Contexto = createContext<DataContexto | null>(null);

/**
 * Monta el almacén. Mientras el navegador no ha leído los datos (render del servidor y
 * primer render del cliente) muestra `cargando`.
 */
export function DataProvider({ children, cargando }: { children: ReactNode; cargando: ReactNode }) {
  const e = useSyncExternalStore(suscribir, leer, sinDatosEnServidor);
  const valor = useMemo<DataContexto | null>(
    () => e && { ...operaciones, tiendaActivaId: e.tiendaActivaId, cambiarTiendaActiva, version: e.version },
    [e],
  );
  if (!valor) return cargando;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useData(): DataContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useData() debe usarse dentro de <DataProvider>.");
  return valor;
}
