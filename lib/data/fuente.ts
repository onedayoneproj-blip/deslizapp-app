// La interfaz ÚNICA de datos. La cumplen dos implementaciones: la demo (lib/data/demo.ts, en el navegador)
// y Supabase (lib/data/supabase.ts). Las pantallas solo ven esto a través de `useData()`; nunca una fila.
// Los errores que lanza (con mensaje para el dueño) están en lib/data/errores.ts.

import type { DatosPromo } from "../promos";
import type { CambiosProducto, Cliente, ClienteConResumen, EventoAaah, NuevoProducto, PedidoConItems, Producto, Promo, Tienda, Usuario } from "../types";
import type { DatosPedidoManual } from "./pedidos";
import type { DatosMarca } from "./tiendas";

export type { DatosMarca, DatosPedidoManual };

export type FuenteDatos = {
  // Tiendas
  /** Demo: todas las tiendas de prueba. Real: solo la tuya. */
  getTiendas(): Promise<Tienda[]>;
  getTienda(tiendaId: string): Promise<Tienda | null>;
  getDueno(tiendaId: string): Promise<Usuario | null>;
  /**
   * Gasta los créditos de retocar `fotos` fotos (CREDITOS_POR_RETOQUE cada una).
   * Lanza CreditosInsuficientes si no alcanzan. Devuelve la tienda con el saldo nuevo.
   */
  usarCreditosRetoque(tiendaId: string, fotos?: number): Promise<Tienda>;
  /** "Mi marca": logo, colores, estilo tipográfico y enlace del catálogo. */
  actualizarMarca(tiendaId: string, datos: DatosMarca): Promise<Tienda>;

  // Productos
  getProductos(tiendaId: string): Promise<Producto[]>;
  getProducto(tiendaId: string, id: string): Promise<Producto | null>;
  crearProducto(tiendaId: string, datos: NuevoProducto): Promise<Producto>;
  actualizarProducto(tiendaId: string, id: string, cambios: CambiosProducto): Promise<Producto>;

  // Pedidos
  getPedidos(tiendaId: string): Promise<PedidoConItems[]>;
  getPedido(tiendaId: string, id: string): Promise<PedidoConItems | null>;
  /** Nuevo → Por despachar. */
  confirmarPedido(tiendaId: string, id: string): Promise<PedidoConItems>;
  cancelarPedido(tiendaId: string, id: string): Promise<PedidoConItems>;
  /** Por despachar → Recibido (`nuevo`). */
  volverPedidoARecibido(tiendaId: string, id: string): Promise<PedidoConItems>;
  /** Cancelado → Recibido (`nuevo`). */
  reabrirPedido(tiendaId: string, id: string): Promise<PedidoConItems>;
  /** Despachado → Por despachar: devuelve el stock de cada producto (RPC `deshacer_despacho` en real). */
  deshacerDespacho(tiendaId: string, id: string): Promise<PedidoConItems>;
  /**
   * Por despachar → Despachado: descuenta el stock. Lanza StockInsuficiente (sin cambiar nada) si algún
   * producto no alcanza. `agotados` = nombres de los productos que quedaron en 0.
   */
  despacharPedido(tiendaId: string, id: string): Promise<{ pedido: PedidoConItems; agotados: string[] }>;
  /** Pedido manual: entra directo en Por despachar; el número lo asigna la base. */
  crearPedidoManual(tiendaId: string, datos: DatosPedidoManual): Promise<{ pedido: PedidoConItems; cliente: Cliente }>;

  // Clientes
  /** Clientes con lo derivado de sus pedidos (cantidad, total gastado, última compra, "repite"). */
  getClientes(tiendaId: string): Promise<ClienteConResumen[]>;
  getCliente(tiendaId: string, id: string): Promise<ClienteConResumen | null>;
  /** "+ Cliente". Lanza ClienteDuplicado si el WhatsApp ya es de otro cliente de la tienda. */
  crearCliente(tiendaId: string, datos: { nombre: string; telefono: string; nota?: string | null }): Promise<Cliente>;
  /** Guarda la nota de un cliente (vacía = la borra). */
  actualizarNotaCliente(tiendaId: string, id: string, nota: string | null): Promise<Cliente>;

  // Promos
  getPromos(tiendaId: string): Promise<Promo[]>;
  /** Lanza PromoInvalida (con los errores por campo) si algo no cumple las reglas. */
  crearPromo(tiendaId: string, datos: DatosPromo): Promise<Promo>;
  actualizarPromo(tiendaId: string, id: string, datos: DatosPromo): Promise<Promo>;
  /** La termina el dueño. No se puede reactivar. */
  terminarPromo(tiendaId: string, id: string): Promise<Promo>;

  // Aaahs (solo lectura: los escribe el catálogo)
  getEventosAaah(tiendaId: string): Promise<EventoAaah[]>;

  // Solo demo (en modo real lanzan SoloDemo)
  simularPedidoCatalogo(tiendaId: string): Promise<{ pedido: PedidoConItems; cliente: Cliente }>;
  reiniciarDemo(): Promise<void>;
};
