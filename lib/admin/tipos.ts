import type { EstadoCatalogo, EstadoTienda, Medio, OpinionProducto } from "../types";

export type Json =
  null | boolean | number | string | Json[] | { [clave: string]: Json };
export type Objeto = { [clave: string]: Json };
export type EstadoCobro =
  | "en_prueba"
  | "sin_plan"
  | "al_dia"
  | "vence_pronto"
  | "en_gracia"
  | "vencida";
export type SaludTienda =
  "te_necesita" | "esperando_equipo" | "se_enfria" | "viva" | "quieta";
export type FiltroTiendas =
  "todas" | "activas" | "en_prueba" | "atrasadas" | "pausadas";
export type FiltroRegistro =
  "todo" | "plata" | "ver_como" | "planes" | "catalogos";
export type ReglaHoy =
  | "pago_vencido"
  | "prueba_termina"
  | "vence_pronto"
  | "solicitudes"
  | "catalogo_solicitado"
  | "catalogo_cambios"
  | "prueba_sin_productos"
  | "sin_entrar"
  | "sin_pedidos"
  | "fotos"
  | "catalogo_generando"
  | "plataforma";
export type AsuntoAdmin = {
  clave: string;
  regla: ReglaHoy;
  categoria: "plata" | "clientes" | "se_enfria" | "trabajo" | "plataforma";
  prioridad: number;
  tiendaId: string | null;
  tiendaNombre?: string | null;
  tiendaWhatsapp?: string | null;
  vendedora?: string | null;
  datos: Objeto;
  accion: string;
  desde: string;
};
export type MotivoAdmin = Pick<AsuntoAdmin, "regla" | "clave" | "datos">;
export type PlanAdmin = {
  id: string;
  nombre: string;
  precioMensual: number | null;
  limiteProductos: number | null;
  creditosMensuales: number;
  seOfrece: boolean;
  orden: number;
  destacado: boolean;
  creadoEn: string;
  tiendas?: number;
};
export type DatosPlan = Omit<PlanAdmin, "creadoEn" | "tiendas">;
export type PrecioExtra = {
  clave: string;
  nombre: string;
  precio: number;
  creditos: number | null;
  orden: number;
  creadoEn: string;
};
export type DatosPrecioExtra = Omit<PrecioExtra, "creadoEn">;
export type PagoAdmin = {
  id: string;
  numero: number;
  tiendaId: string;
  concepto: "mensualidad" | "creditos" | "instalacion" | "otro";
  monto: number;
  metodo: "transferencia" | "deposito" | "efectivo";
  referencia: string | null;
  /** Ruta privada <tiendaId>/<archivo>, nunca URL pública. */
  comprobanteUrl: string | null;
  meses: number | null;
  creditos: number | null;
  cubreHasta: string | null;
  pagadoHastaAnterior: string | null;
  anulaA: string | null;
  nota: string | null;
  registradoPor: string | null;
  creadoEn: string;
};
export type DatosPagoAdmin = Pick<
  PagoAdmin,
  "tiendaId" | "concepto" | "monto" | "metodo"
> &
  Partial<
    Pick<
      PagoAdmin,
      "referencia" | "comprobanteUrl" | "nota" | "meses" | "creditos"
    >
  >;
export type MovimientoCreditos = {
  id: string;
  tiendaId: string;
  cantidad: number;
  tipo: "recarga_mensual" | "compra" | "retoque" | "devolucion" | "ajuste";
  motivo: string | null;
  pagoId: string | null;
  trabajoId: string | null;
  periodo: string | null;
  creadoPor: string | null;
  creadoEn: string;
};
export type TrabajoRetoque = {
  id: string;
  tiendaId: string;
  productoId: string;
  medioUrlOriginal: string;
  medioUrlRetocado: string | null;
  estado: "pendiente" | "entregado" | "devuelto";
  motivoDevolucion: string | null;
  creditos: number;
  pedidoPor: string | null;
  atendidoPor: string | null;
  creadoEn: string;
  atendidoEn: string | null;
  tiendaNombre?: string;
  tiendaWhatsapp?: string | null;
  vendedora?: string | null;
  productoNombre?: string;
};
export type Admin = {
  usuarioId: string;
  email: string;
  nombre: string;
  creadoEn: string;
  creadoPor: string | null;
  quitadoEn?: string | null;
  quitadoPor?: string | null;
  creadoPorEmail?: string | null;
  soyYo?: boolean;
};
export type SesionVerComo = { id: string; tiendaId: string; venceEn: string };
export type RegistroAdmin = {
  id: string;
  creadoEn: string;
  accion: string;
  detalle: Objeto;
  tiendaId: string | null;
  tiendaNombre?: string | null;
  adminId: string | null;
  adminEmail?: string | null;
};
export type ResumenMesAdmin = {
  mes: string;
  tiendasActivas: number;
  enPrueba: number;
  cobradoMes: number;
  esperadoMes: number;
  porCobrar: number;
  porCobrarTiendas: number;
  creditosVendidosMonto: number;
  creditosVendidos: number;
};
export type TiendaAdmin = {
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  fotoPerfilUrl: string | null;
  rubro: string;
  estado: EstadoTienda;
  plan: string;
  planNombre: string;
  precioMensual: number | null;
  estadoCobro: EstadoCobro;
  pagadoHasta: string | null;
  pruebaHasta: string | null;
  diasGracia: number;
  whatsapp: string | null;
  vendedora: string | null;
  creditos: number;
  catalogoEstado: EstadoCatalogo;
  catalogoPaso: number | null;
  catalogoPasoEn: string | null;
  catalogoNotasCambios: string | null;
  urlCatalogo: string | null;
  salud: SaludTienda;
  motivo: MotivoAdmin | null;
  enHoy: boolean;
};
export type ListaTiendasAdmin = {
  tiendas: TiendaAdmin[];
  conteos: Record<FiltroTiendas, number>;
};
export type FichaTiendaAdmin = {
  tienda: {
    id: string;
    slug: string;
    nombre: string;
    rubro: string;
    vendedora: string | null;
    whatsapp: string | null;
    instagram: string | null;
    logoUrl: string | null;
    fotoPerfilUrl: string | null;
    creadoEn: string;
    activadaEn: string | null;
    estado: EstadoTienda;
    urlCatalogo: string | null;
    ultimaActividadEn: string | null;
  };
  cuenta: {
    plan: string;
    planNombre: string;
    precioMensual: number | null;
    limiteProductos: number;
    pagadoHasta: string | null;
    pruebaHasta: string | null;
    diasGracia: number;
    estadoCobro: EstadoCobro;
    ultimoPago: PagoAdmin | null;
    pagos: PagoAdmin[];
  };
  treintaDias: {
    productosVisibles: number;
    productos: number;
    limiteProductos: number;
    aaahs: number;
    pedidos: number;
    solicitudesSinRegistrar: number;
    creditos: number;
    creditosReservados: number;
    creditosUsados: number;
    almacenamientoBytes: number;
  };
  catalogo: {
    estado: EstadoCatalogo;
    paso: number | null;
    pasoEn: string | null;
    notasCambios: string | null;
    solicitadoEn: string | null;
    publicadoEn: string | null;
    url: string | null;
  };
  equipo: {
    usuarioId: string;
    email: string;
    nombre: string;
    rol: string;
    ultimaEntradaEn: string | null;
    creadoEn: string;
  }[];
  eventos: { tipo: string; en: string; datos: Objeto }[];
  asuntos: AsuntoAdmin[];
  salud: { salud: SaludTienda; motivo: MotivoAdmin | null };
  funciones: Record<string, boolean>;
};
export type SaludAdmin = {
  almacenamiento: {
    bytes: number;
    limiteBytes: number;
    porBucket: Record<string, number>;
  };
  base: { bytes: number; limiteBytes: number };
  porTienda: {
    tiendaId: string;
    nombre: string;
    bytes: number;
    archivos: number;
  }[];
  archivoMasGrande: {
    bucket: string;
    nombre: string;
    bytes: number;
    tiendaId: string | null;
  } | null;
  hoy: { aaahs: number; solicitudes: number; pedidos: number };
};
/** Tema/mensajes/secciones conservan las claves JSON del catálogo. null elimina una clave. */
export type CambiosPersonalizacion = {
  tema?: Json;
  mensajes?: Json;
  secciones?: Json;
  productos?: {
    id: string;
    orden?: number | null;
    opiniones?: OpinionProducto[];
  }[];
};
/** Lo que Trabajo y Personalizar necesitan de un producto (admin_productos_tienda, sin retirados). */
export type ProductoAdmin = {
  id: string;
  nombre: string;
  slug: string | null;
  activo: boolean;
  orden: number | null;
  opiniones: OpinionProducto[];
  medios: Medio[];
  creadoEn: string;
  actualizadoEn: string;
};
/** Marca y personalización de una tienda (admin_personalizacion_tienda). `personalizacion` conserva las claves JSON. */
export type PersonalizacionTiendaAdmin = {
  id: string;
  nombre: string;
  slug: string;
  vendedora: string | null;
  rubro: string;
  estado: EstadoTienda;
  marcaColorPrincipal: string;
  marcaColorAcento: string;
  marcaEstilo: string;
  logoUrl: string | null;
  urlCatalogo: string | null;
  catalogoEstado: EstadoCatalogo;
  catalogoNotasCambios: string | null;
  personalizacion: Objeto;
};

/** Un enlace de tienda nueva (Más › Invitaciones). Nunca trae el código: ese se ve una sola vez, al crearlo. */
export type EnlaceTiendaNueva = {
  id: string;
  nota: string | null;
  estado: "activo" | "aprobado" | "usado" | "cancelado" | "vencido";
  creadoEn: string;
  venceEn: string;
  reclamadoEn: string | null;
  correo: string | null;
  nombre: string | null;
  tiendaCreada: string | null;
};
