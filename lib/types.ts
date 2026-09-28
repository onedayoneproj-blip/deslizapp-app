// Tipos del dominio, sacados de docs/03-modelo-de-datos.md.
// En TypeScript van en camelCase; la conversión desde/hacia snake_case vive solo en lib/data/.
// Montos: pesos dominicanos enteros. Fechas: ISO 8601 en UTC.

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
};

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
  pedidosCount: number;
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
