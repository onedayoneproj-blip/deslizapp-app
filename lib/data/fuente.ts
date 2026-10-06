import type { RevisionEliminacionProducto } from "./eliminar-producto";
import type { TrabajoRetoque } from "../admin/tipos";
// La interfaz ÚNICA de datos. La cumplen dos implementaciones: la demo (lib/data/demo.ts, en el navegador)
// y Supabase (lib/data/supabase.ts). Las pantallas solo ven esto a través de `useData()`; nunca una fila.
// Los errores que lanza (con mensaje para el dueño) están en lib/data/errores.ts.

import type { CuentaCliente, CuentasPorCobrar, DatosPago } from "../credito";
import type { DatosPromo } from "../promos";
import type { Abono, PropuestaInventario, PaginaAjustesInventario, AjusteInventario, CambiosProducto, Cliente, ClienteConResumen, EventoAaah, MotivoAjusteInventario, NuevoProducto, PedidoConItems, Producto, Promo, Tienda, Usuario } from "../types";
import type { EnvioJugada, MetodoAbono, TipoEnvioJugada } from "../types";
import type { AvisoLlegada, CatalogoPublico, ItemSolicitud, OpcionProducto, SolicitudPedido, VistaSolicitud } from "../types";
import type { CambiosAbono } from "../credito";
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

/** Lo que se registra al escribirle a un cliente desde una jugada. */
export type DatosEnvioJugada = {
  clienteId: string;
  jugada: EnvioJugada["jugada"];
  tipo: TipoEnvioJugada;
  /** Solo con tipo "codigo". */
  promoId?: string | null;
  /** Solo con tipo "productos": de 1 a 3. */
  productoIds?: string[];
};

/** Lo que se crea junto con un producto nuevo (ver `crearProducto`). */
export type ExtraNuevoProducto = { retoques?: number; opciones?: OpcionProducto[]; variantes?: DatosVariante[] };

/** Una variante a guardar. Se reconoce por `valores`: si ya existía conserva su id. */
export type DatosVariante = {
  valores: Record<string, string>;
  stock: number | null;
  /** null = el precio del producto. */
  precio?: number | null;
  activa?: boolean;
};

/** Cómo registrar una solicitud del catálogo: con un cliente de la tienda o con uno nuevo. */
export type DatosRegistrarSolicitud = (
  | { clienteId: string; clienteNuevo?: undefined }
  | { clienteId?: undefined; clienteNuevo: { nombre: string; telefono: string | null; nota?: string | null } }
) & {
  /** Productos o variantes (por id) que ya no van. Con variante, el id de la variante (el del producto quitaría todas). */
  quitar?: string[];
  /** Productos o variantes (por id) que pasan a encargo (no mueven stock al despachar). */
  encargo?: string[];
};

/** Una línea del carrito del catálogo. El precio lo pone la base. */
export type LineaCarrito = { productoId: string; varianteId?: string | null; cantidad: number };

/** Lo que devuelve crear una solicitud: el código para la página del pedido y lo que cobró la base. */
export type SolicitudCreada = {
  codigo: string;
  subtotal: number;
  descuento: number;
  total: number;
  codigoPromo: string | null;
  items: ItemSolicitud[];
  venceEn: string;
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
  /**
   * Manda una foto ya guardada del producto al taller (real: RPC `pedir_retoque`). Reserva los créditos; se cobran solo cuando
   * el equipo la entrega. Lanza CreditosInsuficientes si el saldo libre no alcanza y DatosInvalidos si ya está en el taller.
   */
  pedirRetoque(tiendaId: string, productoId: string, medioUrl: string): Promise<TrabajoRetoque>;
  /** Las fotos de la tienda en el taller y las atendidas en los últimos 30 días (entregadas o devueltas), de la más nueva a la más vieja. */
  trabajosRetoque(tiendaId: string): Promise<TrabajoRetoque[]>;
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
  getProductos(tiendaId: string, incluirEliminados?: boolean): Promise<Producto[]>;
  revisarEliminacionProducto(tiendaId: string, id: string): Promise<RevisionEliminacionProducto>;
  eliminarProducto(tiendaId: string, id: string): Promise<void>;
  getProducto(tiendaId: string, id: string): Promise<Producto | null>;
  /**
   * Crea el producto en una sola vez (RPC `crear_producto`): la ficha con medios, detalles y encargo, el cobro de `retoques`
   * fotos retocadas y, si trae `opciones`, sus variantes. Si algo falla no queda nada.
   */
  crearProducto(tiendaId: string, datos: NuevoProducto, extra?: ExtraNuevoProducto): Promise<Producto>;
  actualizarProducto(tiendaId: string, id: string, cambios: CambiosProducto): Promise<Producto>;
  /** Ajusta manualmente el inventario y guarda un registro atómico separado de pedidos/ventas. */
  /** Con `varianteId`, ajusta esa variante (un producto con variantes activas no se ajusta entero: UsarVariante). */
  ajustarStock(
    tiendaId: string,
    productoId: string,
    variacion: number,
    motivo: MotivoAjusteInventario,
    nota?: string | null,
    varianteId?: string | null,
  ): Promise<Producto>;

  /**
   * "Ya la tengo": suma la reposición de varios productos de una vez, todo o nada (real: RPC `reponer_stock`). Cada línea queda
   * en el historial como reposición. Devuelve los productos con el stock nuevo.
   */
  reponerStock(tiendaId: string, items: { productoId: string; cantidad: number; varianteId?: string | null }[], nota?: string | null): Promise<Producto[]>;
  /** Muestra u oculta varios productos en una sola operación (ocultar con "Hacer espacio" y su Deshacer). */
  cambiarVisibilidad(tiendaId: string, ids: string[], activo: boolean): Promise<Producto[]>;

  guardarProductoConInventario(tiendaId: string, productoId: string, cambios: Omit<CambiosProducto, "stock">, propuesta: PropuestaInventario | null, retocar?: boolean): Promise<Producto>;
  getAjustesInventario(tiendaId: string, productoId: string, desde?: number, limite?: number): Promise<PaginaAjustesInventario>;
  revisarGuardadoInventario(tiendaId: string, productoId: string, ajusteId: string | null): Promise<{ producto: Producto | null; ajuste: AjusteInventario | null }>;

  // Variantes (real: RPC guardar_variantes)
  /**
   * Guarda los ejes (Talla, Color…) y deja exactamente estas variantes: las que desaparecen se borran, o quedan inactivas si
   * ya tienen pedidos. Cada cambio de stock queda en el historial. Con `opciones = []` el producto vuelve a stock simple.
   * Devuelve el producto con sus variantes (su `stock` es la suma de las activas).
   */
  guardarVariantes(tiendaId: string, productoId: string, opciones: OpcionProducto[], variantes: DatosVariante[]): Promise<Producto>;

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
  /**
   * Edita un abono (monto, método, fecha y nota; real: RPC `editar_abono`). Sigue en el mismo pedido. Si el monto pasa de lo que ese
   * pedido debía antes del abono lanza MontoMayorQueDeuda con `deuda` = el máximo permitido.
   */
  editarAbono(tiendaId: string, abonoId: string, cambios: CambiosAbono): Promise<Abono>;
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

  // Tu próxima jugada (real: RPC crear_codigo_cliente y registrar_envio_jugada)
  /**
   * Código de un solo uso solo para ese cliente, que vence al final del día (Santo Domingo) dentro de `dias`. Sin `codigo` se arma
   * con su nombre y el porcentaje (LUISAN10; si existe, con 2 dígitos más). Lanza CodigoNoValido si el código escrito no sirve o ya existe.
   */
  crearCodigoCliente(tiendaId: string, clienteId: string, porcentaje: number, dias: number, codigo?: string | null): Promise<Promo>;
  /** Guarda que se abrió WhatsApp desde una jugada (a quién, qué jugada y con qué). */
  registrarEnvioJugada(tiendaId: string, datos: DatosEnvioJugada): Promise<EnvioJugada>;
  /** Lo enviado desde las jugadas en los últimos 30 días, del más nuevo al más viejo. */
  enviosJugada(tiendaId: string): Promise<EnvioJugada[]>;

  // Aaahs (solo lectura: los escribe el catálogo)
  getEventosAaah(tiendaId: string): Promise<EventoAaah[]>;

  // Solicitudes del catálogo (el pedido antes de que la tienda lo registre)
  /** Las que esperan a la tienda (sin registrar, sin descartar y sin vencer), de la más nueva a la más vieja. */
  solicitudesPendientes(tiendaId: string): Promise<SolicitudPedido[]>;
  /** Crea el pedido (`nuevo`, origen catálogo) y une o crea el cliente. Lanza ClienteDuplicado si el WhatsApp nuevo ya es de otro. */
  registrarSolicitud(tiendaId: string, solicitudId: string, datos: DatosRegistrarSolicitud): Promise<{ pedido: PedidoConItems; cliente: Cliente }>;
  descartarSolicitud(tiendaId: string, solicitudId: string): Promise<void>;
  /**
   * La solicitud de ese código si es de una de tus tiendas (registrada, descartada o vencida también), con `pedidoId`; null si
   * no existe o es de otra tienda. Real: lectura con sesión (RLS), nunca para anon.
   */
  solicitudPorCodigo(codigo: string): Promise<SolicitudPedido | null>;

  // Avísame cuando llegue
  /** Todos los avisos pendientes de la tienda (para contar "N esperan" en el inventario), del más viejo al más nuevo. */
  avisosPendientes(tiendaId: string): Promise<AvisoLlegada[]>;
  /** Los avisos pendientes de un producto (de cualquiera de sus variantes), del más viejo al más nuevo. */
  avisosDeProducto(tiendaId: string, productoId: string): Promise<AvisoLlegada[]>;
  /** Marca que ya se les avisó. Devuelve cuántos cerró. */
  marcarAvisado(tiendaId: string, avisoIds: string[]): Promise<number>;

  // Catálogo público (sin sesión; real: RPC para anon)
  /** Lanza CatalogoNoDisponible si la tienda no está activa o su catálogo no está publicado. */
  catalogoPublico(slug: string): Promise<CatalogoPublico>;
  /** El precio lo pone la base, no el navegador. Lanza ProductoNoDisponible, CodigoNoValido o DemasiadosIntentos. */
  crearSolicitudPedido(slug: string, items: LineaCarrito[], codigoPromo: string | null, dispositivo: string): Promise<SolicitudCreada>;
  /** null si no existe. */
  verSolicitud(codigo: string): Promise<VistaSolicitud | null>;
  /** Enciende o apaga el aaah de este dispositivo. Devuelve los likes del producto. */
  registrarAaah(slug: string, productoSlug: string, dispositivo: string, on: boolean): Promise<number>;
  /** Solo en algo agotado o por encargo; un aviso pendiente igual no se repite. */
  pedirAviso(slug: string, productoSlug: string, varianteId: string | null, telefono: string, nombre: string | null, dispositivo: string): Promise<void>;

  // Solo demo (en modo real lanzan SoloDemo)
  /** Hace de "el equipo": avanza el estado del catálogo un paso (solicitado → generando → … → revisar; cambios → revisar). */
  simularAvanceCatalogo(tiendaId: string): Promise<Tienda>;
  simularPedidoCatalogo(tiendaId: string): Promise<{ pedido: PedidoConItems; cliente: Cliente }>;
  reiniciarDemo(): Promise<void>;
};
