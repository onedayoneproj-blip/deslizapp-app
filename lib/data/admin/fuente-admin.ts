import type { MarcaRetoque } from "../../marca-retoque";
import type {
  Admin,
  AsuntoAdmin,
  CambiosPersonalizacion,
  DatosPagoAdmin,
  DatosPlan,
  DatosPrecioExtra,
  FichaTiendaAdmin,
  FiltroRegistro,
  FiltroTiendas,
  Json,
  ListaTiendasAdmin,
  Objeto,
  PagoAdmin,
  PersonalizacionTiendaAdmin,
  PlanAdmin,
  PrecioExtra,
  ProductoAdmin,
  RegistroAdmin,
  ResumenMesAdmin,
  SaludAdmin,
  SesionVerComo,
  TrabajoRetoque,
} from "../../admin/tipos";

/** Sin pantallas: contrato para las partes 2–4. Montos enteros RD$, fechas civiles de Santo Domingo. */
export interface FuenteAdmin {
  soyAdmin(): Promise<boolean>;
  resumenMes(): Promise<ResumenMesAdmin>;
  hoy(): Promise<AsuntoAdmin[]>;
  posponer(clave: string, horas?: number): Promise<string>;
  tiendas(
    filtro?: FiltroTiendas,
    busqueda?: string,
  ): Promise<ListaTiendasAdmin>;
  tienda(tiendaId: string): Promise<FichaTiendaAdmin>;
  iniciarVerComo(tiendaId: string): Promise<SesionVerComo>;
  terminarVerComo(sesionId: string): Promise<boolean>;
  avanzarCatalogo(
    tiendaId: string,
    accion: "empezar" | "siguiente" | "a_revisar",
    urlCatalogo?: string,
  ): Promise<{
    catalogoEstado: string;
    catalogoPaso: number | null;
    catalogoPasoEn: string;
    urlCatalogo: string | null;
  }>;
  /** Productos de la tienda (sin retirados), en el orden del catálogo público. */
  productosTienda(tiendaId: string): Promise<ProductoAdmin[]>;
  /** Marca y personalización actuales, para Personalizar. */
  personalizacionTienda(tiendaId: string): Promise<PersonalizacionTiendaAdmin>;
  /** La marca de la tienda para el retoque (Instagram, 3 palabras, lo que evita, referencias). Solo lectura: el admin no escribe aquí. */
  marcaTienda(tiendaId: string): Promise<MarcaRetoque>;
  guardarPersonalizacion(
    tiendaId: string,
    cambios: CambiosPersonalizacion,
  ): Promise<Objeto>;
  trabajosRetoque(estado?: TrabajoRetoque["estado"]): Promise<TrabajoRetoque[]>;
  entregarRetoque(
    trabajoId: string,
    urlRetocada: string,
  ): Promise<TrabajoRetoque>;
  devolverRetoque(trabajoId: string, motivo: string): Promise<TrabajoRetoque>;
  /**
   * Sube la foto retocada (JPEG ya reducido, como data URL) y devuelve su URL pública. No toca el producto ni cobra:
   * eso lo hace entregarRetoque. Un nombre nuevo por intento, así un reintento nunca pisa otra foto.
   */
  subirRetocada(trabajo: Pick<TrabajoRetoque, "id" | "tiendaId">, dataUrl: string): Promise<string>;
  registrarPago(
    datos: DatosPagoAdmin,
  ): Promise<{
    pago: PagoAdmin;
    pagadoHasta: string | null;
    creditos: number;
    estado: string;
  }>;
  anularPago(
    pagoId: string,
    motivo: string,
  ): Promise<{
    anulacion: PagoAdmin;
    pagadoHasta: string | null;
    creditos: number;
  }>;
  ajustarCreditos(
    tiendaId: string,
    cantidad: number,
    motivo: string,
  ): Promise<number>;
  recargaMensual(tiendaId?: string): Promise<number>;
  planes(): Promise<{ planes: PlanAdmin[]; preciosExtra: PrecioExtra[] }>;
  guardarPlan(datos: DatosPlan): Promise<PlanAdmin>;
  cambiarPlan(
    tiendaId: string,
    planId: string,
    limite?: number,
  ): Promise<{
    plan: string;
    limiteProductos: number;
    visibles: number;
    sobran: number;
  }>;
  guardarPrecioExtra(datos: DatosPrecioExtra): Promise<PrecioExtra>;
  cambiarEstadoTienda(
    tiendaId: string,
    accion: "pausar" | "reactivar" | "prueba",
    fecha?: string,
  ): Promise<{
    estado: string;
    pruebaHasta: string | null;
    activadaEn: string | null;
  }>;
  transferirTienda(
    tiendaId: string,
    emailNuevoDueno: string,
  ): Promise<{ nuevoDueno: string; duenosAntes: string[] }>;
  funcionTienda(
    tiendaId: string,
    funcion: string,
    encendida: boolean,
  ): Promise<{
    tiendaId: string;
    funcion: string;
    encendida: boolean;
    creadoPor: string | null;
    creadoEn: string;
  }>;
  salud(): Promise<SaludAdmin>;
  registro(
    filtro?: FiltroRegistro,
    antesDe?: string,
  ): Promise<{ filas: RegistroAdmin[]; siguiente: string | null }>;
  admins(): Promise<Admin[]>;
  agregarAdmin(email: string): Promise<Admin>;
  quitarAdmin(usuarioId: string): Promise<void>;
  /** Operaciones del miembro, aún no conectadas al panel (parte 3). */
  marcarActividad(tiendaId: string): Promise<boolean>;
  pedirRetoque(productoId: string, medioUrl: string): Promise<TrabajoRetoque>;
}
export class ErrorAdmin extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensaje = codigo) {
    super(mensaje);
    this.name = "ErrorAdmin";
    this.codigo = codigo;
  }
}
/** Los JSON de detalle son opacos y conservan las claves SQL, igual que personalización. */
export type DetalleAdmin = Json;
