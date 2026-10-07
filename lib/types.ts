// Tipos del dominio, sacados de docs/03-modelo-de-datos.md.
// En TypeScript van en camelCase; la conversión desde/hacia snake_case vive solo en lib/data/.
// Montos: pesos dominicanos enteros. Fechas: ISO 8601 en UTC.

import type { EstiloMarca } from "./marca";
import type { Detalles, Rubro } from "./rubros";

import type { EstadoCatalogo } from "./catalogo-estado";
export type { EstadoCatalogo };

export type Plan = "p20" | "p60" | "p100" | "custom";

export type Tienda = {
  personalizacion?: Record<string, unknown>;
  whatsapp?: string | null;
  instagram?: string | null;
  descripcion?: string | null;
  nombreVendedora?: string | null;
  fotoPerfilUrl?: string | null;
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  plan: Plan;
  limiteProductos: number;
  creditosRetoque: number;
  creditosRetoqueMensuales: number;
  creadoEn: string;
  /** Mi marca (lo que ve el cliente final: cupones, imágenes, catálogo público). El panel no cambia. */
  marcaColorPrincipal: string;
  marcaColorAcento: string;
  marcaEstilo: EstiloMarca;
  /** Enlace del catálogo propio de la tienda (opcional). */
  urlCatalogo: string | null;
  /** Estado de la tienda en Deslizapp ("pausada": el catálogo se ve pausado). */
  estado: EstadoTienda;
  /** Catálogo en línea: lo pide, revisa y publica el dueño; lo arma el equipo. Solo cambia con las RPC (nunca por UPDATE directo). */
  catalogoEstado: EstadoCatalogo;
  /** 1–3: el paso en que va mientras se arma. */
  catalogoPaso: number | null;
  /** Lo que el dueño pidió cambiar en la revisión. */
  catalogoNotasCambios: string | null;
  catalogoSolicitadoEn: string | null;
  catalogoPublicadoEn: string | null;
  /** Qué vende (define los detalles de sus productos, lib/rubros.ts). */
  rubro: Rubro;
  /** Todo lo que vende («Lo que vendes»); `rubro` es el principal y siempre está aquí. */
  rubros: Rubro[];
};

export type EstadoTienda = "en_prueba" | "activa" | "pausada" | "eliminada";

export type RolUsuario = "dueno" | "staff";

export type Usuario = {
  id: string;
  tiendaId: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
};

export type OpinionProducto = { usuario: string; fuente: string; url: string; texto: string; estrellas: number | null; traducida: boolean };

export type Producto = {
  /** Retirado de la administración; se conserva para el historial. */
  eliminadoEn?: string | null;
  orden?: number | null;
  opiniones?: OpinionProducto[];
  id: string;
  tiendaId: string;
  nombre: string;
  precio: number;
  fotos: string[];
  fotoRetocada: boolean;
  categoria: string | null;
  activo: boolean;
  destacado: boolean;
  stock: number | null;
  likes: number;
  creadoEn: string;
  actualizadoEn: string;
  /** Corto y único en la tienda: el enlace del producto en el catálogo (/tienda/producto). */
  slug: string;
  tipo: TipoProducto;
  /** Fotos y videos en orden. La base lo mantiene igual a `fotos` mientras la app escriba `fotos`. */
  medios: Medio[];
  /** Tipo de producto (su rubro). null = el principal de la tienda. Solo organiza y busca: los Detalles siguen el rubro principal. */
  rubro?: Rubro | null;
  /** Detalles del rubro (marca, notas, talla…), más `descripcion`. */
  detalles: Detalles;
  /** Ejes de las variantes (Talla, Color…); vacío = sin variantes. */
  opciones: OpcionProducto[];
  /** Agotado, todavía se puede pedir. */
  porEncargo: boolean;
  /** "Llega en 5 días" (≤ 40). */
  encargoTexto: string | null;
  /** Solo cuando se leen con el producto. Con variantes activas, `stock` es la suma de ellas. */
  variantes?: Variante[];
  /** La foto de cada color: { Color: { Negro: "<url de una de sus fotos>" } }. Vacío = se ve la del producto. */
  fotosPorValor?: FotosPorValor;
};

/** eje → valor → url de una de las fotos del producto (la base la limpia si la foto o el valor desaparecen). */
export type FotosPorValor = Record<string, Record<string, string>>;

export type TipoProducto = "producto" | "servicio";

export type Medio =
  | { tipo: "foto"; url: string; retocada: boolean }
  | { tipo: "video"; url: string; portada: string | null; duracionS: number };

export type OpcionProducto = { nombre: string; valores: string[] };

export type Variante = {
  id: string;
  productoId: string;
  /** Un valor por eje: { Talla: "M", Color: "Arena" }. */
  valores: Record<string, string>;
  stock: number | null;
  /** null = el precio del producto. */
  precio: number | null;
  activa: boolean;
  orden: number;
};

/** Lo que ve el público (nunca el stock exacto si pasa de 3). */
export type Disponibilidad = "hay" | "quedan" | "agotado" | "por_encargo";

/** Motivos que se guardan junto con cada ajuste manual de inventario. */
export type MotivoAjusteInventario = "reposicion" | "dano" | "perdida" | "correccion_inventario" | "otro";

/** Propuesta que solo se aplica al guardar, con comprobación del stock base. */
export type PropuestaInventario = {
  id: string;
  stockBase: number;
  stockPropuesto: number;
  motivo: MotivoAjusteInventario;
  nota: string | null;
};
export type AjusteInventarioVisible = AjusteInventario & { actorNombre: string };
export type PaginaAjustesInventario = { ajustes: AjusteInventarioVisible[]; hayMas: boolean };

/** Registro auditable de un cambio manual; no representa una venta ni un pedido. */
export type AjusteInventario = {
  id: string;
  tiendaId: string;
  productoId: string;
  /** El ajuste de una variante (null: del producto entero). */
  varianteId?: string | null;
  variacion: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: MotivoAjusteInventario;
  nota: string | null;
  actorId: string;
  creadoEn: string;
};

export type OrigenPedido = "catalogo" | "manual";
export type EstadoPedido = "nuevo" | "por_despachar" | "despachado" | "cancelado";

/** Cómo paga el cliente: todo de una vez ("contado") o en abonos ("credito"). */
export type PagoModo = "contado" | "credito";
export type MetodoAbono = "efectivo" | "transferencia" | "otro";

export type Pedido = {
  id: string;
  tiendaId: string;
  /** Número visible del pedido (#1042). Autoincremental por tienda. */
  numero: number;
  clienteId: string | null;
  origen: OrigenPedido;
  estado: EstadoPedido;
  total: number;
  codigoPromo: string | null;
  creadoEn: string;
  despachadoEn: string | null;
  pagoModo: PagoModo;
  /** Día ("AAAA-MM-DD") en que el cliente quedó en pagar. Solo a crédito; null = sin fecha. */
  pagoFechaAcordada: string | null;
};

/** Un pago parcial de un pedido a crédito. Solo se crea y se borra con las funciones de la capa de datos. */
export type Abono = {
  id: string;
  tiendaId: string;
  pedidoId: string;
  /** Pesos enteros, > 0. */
  monto: number;
  metodo: MetodoAbono;
  fecha: string;
  nota: string | null;
  creadoEn: string;
};

export type PedidoItem = {
  id: string;
  pedidoId: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  varianteId: string | null;
  /** "M · Arena": lo pone la base y no cambia aunque cambie la variante. */
  varianteTexto: string | null;
  /** No mueve stock al despachar. */
  porEncargo: boolean;
};

export type Cliente = {
  id: string;
  tiendaId: string;
  nombre: string;
  telefono: string | null;
  origen: OrigenPedido;
  primerPedidoEn: string;
  /** Nota del dueño sobre el cliente (talla, gustos, cómo entregarle…). Máx. 200 caracteres. */
  nota: string | null;
};

/**
 * Cliente con lo que se DERIVA de sus pedidos (no se guarda): docs/03-modelo-de-datos.md.
 * Cuenta solo los pedidos no cancelados.
 */
export type ClienteConResumen = Cliente & {
  pedidos: number;
  totalGastado: number;
  /** Fecha del pedido no cancelado más reciente; null si todavía no pide. */
  ultimaCompra: string | null;
  /** 2 o más pedidos despachados (compras), aunque pedidos cuente recibidos. */
  repite: boolean;
};

export type TipoPromo = "codigo" | "coleccion" | "producto";
export type EstadoPromo = "activa" | "programada" | "terminada";

export type Promo = {
  id: string;
  tiendaId: string;
  tipo: TipoPromo;
  nombre: string;
  valorPorcentaje: number | null;
  codigo: string | null;
  coleccion: string | null;
  productoId: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoPromo;
  /** Solo promos de código: máximo de pedidos (no cancelados) que pueden usarla. null = sin límite. */
  limiteUsos: number | null;
  /** Pausa manual: deja de aplicarse sin perder su historial. */
  pausada: boolean;
  /** Código personal: solo vale en pedidos de este cliente (creado desde Tu próxima jugada). null = para todos. */
  clienteId: string | null;
};

/** Qué se le mandó a un cliente desde Tu próxima jugada. */
export type TipoEnvioJugada = "saludo" | "codigo" | "productos";

/** Cada vez que se abre WhatsApp desde una jugada (tabla `jugada_envios`). */
export type EnvioJugada = {
  id: string;
  tiendaId: string;
  clienteId: string;
  jugada: "volver" | "segundo" | "gracias" | "primer";
  tipo: TipoEnvioJugada;
  promoId: string | null;
  productoIds: string[];
  enviadoEn: string;
};

/** Una línea de una solicitud del catálogo (foto fija de lo que pidió el cliente). */
export type ItemSolicitud = {
  productoId: string;
  varianteId: string | null;
  nombre: string;
  varianteTexto: string | null;
  foto: string | null;
  precioUnitario: number;
  cantidad: number;
  porEncargo: boolean;
};

export type EstadoSolicitud = "enviado" | "confirmado" | "despachado" | "cancelado" | "vencido";

/** El pedido que manda el cliente desde el catálogo, antes de que la tienda lo registre. */
export type SolicitudPedido = {
  id: string;
  tiendaId: string;
  codigo: string;
  items: ItemSolicitud[];
  codigoPromo: string | null;
  descuento: number;
  total: number;
  creadaEn: string;
  venceEn: string;
  pedidoId: string | null;
  descartadaEn: string | null;
};

/**
 * Lo que devuelve `verSolicitud` (la página del pedido del cliente). `id` solo si es de tu tienda. Ya registrada, `items`,
 * `descuento` y `total` son los del pedido (con lo quitado, lo pasado a encargo y lo editado después), no la foto inicial.
 */
export type VistaSolicitud = {
  id: string | null;
  codigo: string;
  tienda: {
    nombre: string;
    slug: string;
    logoUrl: string | null;
    fotoPerfilUrl: string | null;
    whatsapp: string | null;
    /** "Michel": para "Le llegó a Michel". null si la tienda no lo puso. */
    nombreVendedora: string | null;
    /** Para decir "3 perfumes" / "3 prendas". */
    rubro: Rubro | null;
  };
  items: ItemSolicitud[];
  descuento: number;
  total: number;
  creadaEn: string;
  venceEn: string;
  estado: EstadoSolicitud;
  /** Cuándo salió (solo despachado). */
  despachadoEn: string | null;
  esMiTienda: boolean;
};

/** "Avísame cuando llegue". `telefono`: solo dígitos con código de país (18095550123). */
export type AvisoLlegada = {
  id: string;
  tiendaId: string;
  productoId: string;
  varianteId: string | null;
  telefono: string;
  nombre: string | null;
  creadoEn: string;
  avisadoEn: string | null;
};

/** Un producto como lo ve el público. */
export type ProductoPublico = {
  orden: number | null;
  opiniones: OpinionProducto[];
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoProducto;
  /** Tipo de producto ya resuelto (el principal de la tienda si el producto no trae). */
  rubro: Rubro;
  categoria: string | null;
  precio: number;
  /** El precio con la promo automática vigente; null si no hay. */
  precioPromo: number | null;
  promo: { nombre: string; porcentaje: number } | null;
  medios: Medio[];
  detalles: Detalles;
  opciones: OpcionProducto[];
  likes: number;
  disponibilidad: Disponibilidad;
  /** Solo con disponibilidad "quedan" (1 a 3). */
  quedan: number | null;
  encargoTexto: string | null;
  /** La foto de cada color (o del primer eje): { Color: { Negro: "<url de una de sus fotos>" } }. Vacío = la del producto. */
  fotosPorValor?: FotosPorValor;
  variantes: {
    id: string;
    valores: Record<string, string>;
    precio: number;
    precioPromo: number | null;
    disponibilidad: Disponibilidad;
    quedan: number | null;
  }[];
};

export type CatalogoPublico = {
  tienda: {
    desde: string;
    ventas: number | null;
    slug: string;
    nombre: string;
    logoUrl: string | null;
    fotoPerfilUrl: string | null;
    marcaColorPrincipal: string;
    marcaColorAcento: string;
    marcaEstilo: EstiloMarca;
    personalizacion: Record<string, unknown>;
    whatsapp: string | null;
    instagram: string | null;
    descripcion: string | null;
    nombreVendedora: string | null;
    rubro: Rubro;
    /** Lo que vende la tienda; con más de uno, el catálogo muestra tipos. */
    rubros: Rubro[];
  };
  productos: ProductoPublico[];
};

export type EventoAaah = {
  id: string;
  tiendaId: string;
  productoId: string;
  creadoEn: string;
  /** El dispositivo que lo dio desde el catálogo (uno por producto). */
  dispositivo?: string | null;
};

// ---- Formas de entrada para crear/editar ----

/** Lo nuevo del catálogo conectado es opcional al crear: la base pone slug, tipo y medios (desde `fotos`). */
type CamposCatalogo = "slug" | "tipo" | "medios" | "detalles" | "opciones" | "porEncargo" | "encargoTexto" | "variantes";
export type NuevoProducto = Omit<Producto, "id" | "tiendaId" | "creadoEn" | "actualizadoEn" | "eliminadoEn" | CamposCatalogo> &
  Partial<Omit<Pick<Producto, CamposCatalogo>, "variantes">>;
export type CambiosProducto = Partial<NuevoProducto>;

/**
 * Un pedido con sus productos y su estado de pago. Contado: pagado = total y saldo = 0. Crédito: pagado = suma de los abonos
 * y saldo = total − pagado (0 si está cancelado). `abonos` va del más viejo al más nuevo.
 */
export type PedidoConItems = Pedido & { items: PedidoItem[]; pagado: number; saldo: number; abonos: Abono[] };
