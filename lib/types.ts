// Tipos del dominio, sacados de docs/03-modelo-de-datos.md.
// En TypeScript van en camelCase; la conversión desde/hacia snake_case vive solo en lib/data/.
// Montos: pesos dominicanos enteros. Fechas: ISO 8601 en UTC.

import type { EstiloMarca } from "./marca";

import type { EstadoCatalogo } from "./catalogo-estado";
export type { EstadoCatalogo };

export type Plan = "p20" | "p60" | "p100" | "custom";

export type Tienda = {
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

export type Producto = {
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
};

export type OrigenPedido = "catalogo" | "manual";
export type EstadoPedido = "nuevo" | "por_despachar" | "despachado" | "cancelado";

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
};

export type PedidoItem = {
  id: string;
  pedidoId: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
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
  /** 2 o más pedidos. */
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
};

export type EventoAaah = {
  id: string;
  tiendaId: string;
  productoId: string;
  creadoEn: string;
};

// ---- Formas de entrada para crear/editar ----

export type NuevoProducto = Omit<Producto, "id" | "tiendaId" | "creadoEn" | "actualizadoEn">;
export type CambiosProducto = Partial<NuevoProducto>;

export type PedidoConItems = Pedido & { items: PedidoItem[] };
