// La interfaz ÚNICA de datos. La cumplen dos implementaciones: la demo (lib/data/demo.ts, en el navegador)
// y Supabase (lib/data/supabase.ts). Las pantallas solo ven esto a través de `useData()`; nunca una fila.
// Los errores que lanza (con mensaje para el dueño) están en lib/data/errores.ts.

import type { CuentaCliente, CuentasPorCobrar, DatosPago } from "../credito";
import type { DatosPromo } from "../promos";
import type { Abono, CambiosProducto, Cliente, ClienteConResumen, EventoAaah, NuevoProducto, PedidoConItems, Producto, Promo, Tienda, Usuario } from "../types";
import type { MetodoAbono } from "../types";
import type { DatosClienteEditables } from "./clientes";
import type { DatosEdicionPedido, DatosPedidoManual } from "./pedidos";
import type { DatosMarca } from "./tiendas";

export type { DatosClienteEditables, DatosEdicionPedido, DatosMarca, DatosPago, DatosPedidoManual };

/** Un abono a registrar. Con `pedidoId` va a ese pedido; sin él se reparte entre los pedidos a crédito del cliente, del más viejo al más nuevo. */
export type DatosAbonoNuevo = {
  tiendaId: string;
  clienteId: string;
  monto: number;
  metodo: MetodoAbono;
  /** Cuándo pagó (ISO); por defecto, ahora. No puede ser futura. */
  fecha?: string;
  nota?: string | null;
  pedidoId?: string;
};

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

  // Catálogo en línea del dueño (RPC en Supabase; lo arma el equipo). Devuelven la tienda con su estado nuevo. Estos campos NO se
  // escriben por UPDATE directo: solo por estas funciones.
  /** sin → solicitado. */
  solicitarCatalogo(tiendaId: string): Promise<Tienda>;
  /** revisar → cambios (notas de 1 a 500 caracteres). */
  pedirCambiosCatalogo(tiendaId: string, notas: string): Promise<Tienda>;
  /** revisar → publicado (exige el enlace). */
  publicarCatalogo(tiendaId: string): Promise<Tienda>;
  /** Vuelve a leer la tienda (el equipo cambia el estado desde fuera de la app). En la demo no hace nada. */
  releerTienda(tiendaId: string): Promise<void>;

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
  /**
   * Aplica, cambia (o quita, con null) el código de descuento de un pedido `nuevo` o `por_despachar`: recalcula los precios
   * unitarios y el total. Lanza DatosInvalidos (sin cambiar nada) si el código no existe, no está activo o el pedido ya
   * se despachó o canceló.
   */
  aplicarCodigoPedido(tiendaId: string, id: string, codigo: string | null): Promise<PedidoConItems>;
  /**
   * Edita un pedido (mismo número): en `despachado` solo cliente y fecha; en `nuevo` y `por_despachar` todo (productos,
   * código, y "ya hecho" con su fecha). Real: RPC `editar_pedido`. Un cancelado no se edita.
   */
  editarPedido(tiendaId: string, id: string, datos: DatosEdicionPedido): Promise<{ pedido: PedidoConItems; cliente: Cliente }>;
  /**
   * Cambia solo el pago de un pedido: a crédito (con su fecha acordada y lo que dio ahora) o de vuelta a contado. Con abonos no
   * puede pasar a contado (PedidoConAbonos). Un cancelado no se toca.
   */
  cambiarPagoPedido(tiendaId: string, id: string, datos: DatosPago): Promise<PedidoConItems>;
  /** Borra para siempre un pedido cancelado (real: RPC `eliminar_pedido`). */
  eliminarPedido(tiendaId: string, id: string): Promise<void>;
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

  // Ventas a crédito y abonos
  /**
   * Registra un abono (real: RPC `registrar_abono`). Devuelve los abonos creados (uno por pedido al que se aplicó). Lanza
   * MontoMayorQueDeuda si supera lo que se debe.
   */
  registrarAbono(datos: DatosAbonoNuevo): Promise<Abono[]>;
  /** Borra un abono registrado por error; la deuda vuelve a subir (real: RPC `eliminar_abono`). */
  eliminarAbono(tiendaId: string, abonoId: string): Promise<void>;
  /** Los clientes que deben (uno por cliente, ordenados: atrasados, con fecha, sin fecha), el total por cobrar y lo cobrado este mes. */
  getCuentasPorCobrar(tiendaId: string): Promise<CuentasPorCobrar>;
  /** La cuenta de un cliente: lo que debe, sus pedidos con saldo y el historial de compras a crédito y abonos. */
  getCuentaCliente(tiendaId: string, clienteId: string): Promise<CuentaCliente>;

  // Clientes
  /** Clientes con lo derivado de sus pedidos (cantidad, total gastado, última compra, "repite"). */
  getClientes(tiendaId: string): Promise<ClienteConResumen[]>;
  getCliente(tiendaId: string, id: string): Promise<ClienteConResumen | null>;
  /** "+ Cliente". Lanza ClienteDuplicado si el WhatsApp ya es de otro cliente de la tienda. */
  crearCliente(tiendaId: string, datos: { nombre: string; telefono: string; nota?: string | null }): Promise<Cliente>;
  /** Cambia nombre y WhatsApp (vacío = sin WhatsApp). Lanza ClienteDuplicado si ya lo usa otra persona. */
  actualizarCliente(tiendaId: string, id: string, datos: DatosClienteEditables): Promise<Cliente>;
  /** Borra el contacto y conserva sus pedidos en el historial, ya sin nombre asociado. */
  eliminarCliente(tiendaId: string, id: string, borrarPedidos?: boolean): Promise<void>;
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
  /** Hace de "el equipo": avanza el estado del catálogo un paso (solicitado → generando → … → revisar; cambios → revisar). */
  simularAvanceCatalogo(tiendaId: string): Promise<Tienda>;
  simularPedidoCatalogo(tiendaId: string): Promise<{ pedido: PedidoConItems; cliente: Cliente }>;
  reiniciarDemo(): Promise<void>;
};
