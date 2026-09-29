// Reglas de promos que no dependen de dónde vienen los datos (sirven hoy y con Supabase).

import type { EstadoPromo, Pedido, Producto, Promo, TipoPromo } from "./types";

/**
 * Estado real de una promo en un momento dado: se calcula por fechas, salvo que el dueño
 * la haya terminado a mano (`estado = 'terminada'` guardado manda sobre las fechas).
 */
export function estadoPromo(promo: Promo, ahora: Date = new Date()): EstadoPromo {
  if (promo.estado === "terminada") return "terminada";
  const t = ahora.getTime();
  if (promo.fechaFin && Date.parse(promo.fechaFin) < t) return "terminada";
  if (Date.parse(promo.fechaInicio) > t) return "programada";
  return "activa";
}

export type PrecioConPromo = {
  /** Precio que paga el cliente hoy. */
  precio: number;
  /** Precio de lista, si hay descuento (para mostrarlo tachado). */
  precioAntes: number | null;
  /** Porcentaje aplicado, si hay descuento. */
  porcentaje: number | null;
};

/**
 * Precio de un producto con la mejor promo activa por colección (su categoría) o por producto.
 * Los códigos no cuentan aquí: se aplican al total del pedido.
 */
export function precioConPromo(producto: Producto, promos: Promo[], ahora: Date = new Date()): PrecioConPromo {
  let mejor = 0;
  for (const promo of promos) {
    if (promo.tiendaId !== producto.tiendaId || !promo.valorPorcentaje) continue;
    if (estadoPromo(promo, ahora) !== "activa") continue;
    const aplica =
      (promo.tipo === "coleccion" && promo.coleccion != null && promo.coleccion === producto.categoria) ||
      (promo.tipo === "producto" && promo.productoId === producto.id);
    if (aplica && promo.valorPorcentaje > mejor) mejor = promo.valorPorcentaje;
  }
  if (mejor === 0) return { precio: producto.precio, precioAntes: null, porcentaje: null };
  return {
    precio: producto.precio - Math.round((producto.precio * mejor) / 100),
    precioAntes: producto.precio,
    porcentaje: mejor,
  };
}

// ---- Crear y editar promos ----

export const MAX_PORCENTAJE = 90;
export const MAX_CODIGO = 12;
const ZONA = "America/Santo_Domingo";

/** Lo que se escribe en el formulario de una promo. Las fechas son "AAAA-MM-DD" (día de Santo Domingo). */
export type DatosPromo = {
  tipo: TipoPromo;
  nombre: string;
  /** Texto tal cual se escribió (entero de 1 a 90). */
  porcentaje: string;
  codigo: string;
  coleccion: string | null;
  productoId: string | null;
  inicio: string;
  /** Vacío = sin fecha de fin. */
  fin: string;
};

export type ErroresPromo = Partial<Record<"nombre" | "porcentaje" | "codigo" | "coleccion" | "productoId" | "inicio" | "fin", string>>;

const dia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** Hoy en Santo Domingo, "AAAA-MM-DD". */
export const hoyLocal = (ahora: Date = new Date()) => dia.format(ahora);

/** Un instante → su día en Santo Domingo, "AAAA-MM-DD" (para rellenar un campo de fecha). */
export const isoADia = (iso: string) => dia.format(new Date(iso));

/** "2026-10-03" → inicio del día (00:00 de Santo Domingo, UTC-4) o final del día (23:59:59.999). */
export function diaAIso(fecha: string, momento: "inicio" | "fin"): string {
  const [a, m, d] = fecha.split("-").map(Number) as [number, number, number];
  return momento === "inicio" ? new Date(Date.UTC(a, m - 1, d, 4, 0, 0, 0)).toISOString() : new Date(Date.UTC(a, m - 1, d + 1, 3, 59, 59, 999)).toISOString();
}

/** Código escrito → mayúsculas, solo letras y números, máx. MAX_CODIGO. */
export const limpiarCodigo = (texto: string) => texto.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_CODIGO);

/** ¿Ya hay un código igual en una promo activa o programada de la tienda (menos `exceptoId`)? */
export function codigoEnUso(promos: Promo[], tiendaId: string, codigo: string, exceptoId?: string, ahora: Date = new Date()): boolean {
  const c = codigo.trim().toUpperCase();
  return promos.some(
    (p) => p.tiendaId === tiendaId && p.tipo === "codigo" && p.id !== exceptoId && p.codigo?.toUpperCase() === c && estadoPromo(p, ahora) !== "terminada",
  );
}

/** Validación del formulario (la misma para la pantalla y para la capa de datos). Vacío = todo bien. */
export function validarPromo(datos: DatosPromo, promos: Promo[], tiendaId: string, exceptoId?: string): ErroresPromo {
  const e: ErroresPromo = {};
  if (!datos.nombre.trim()) e.nombre = "Ponle un nombre para reconocerla.";
  const n = Number(datos.porcentaje);
  if (datos.porcentaje.trim() === "" || !Number.isInteger(n) || n < 1) e.porcentaje = "Pon un descuento de 1 a 90%.";
  else if (n > MAX_PORCENTAJE) e.porcentaje = "Más de 90% ya es regalar. Bájale un poco.";
  if (datos.tipo === "codigo") {
    if (datos.codigo.length < 3) e.codigo = "Escribe un código de 3 a 12 letras o números.";
    else if (codigoEnUso(promos, tiendaId, datos.codigo, exceptoId)) e.codigo = `Ya tienes el código ${datos.codigo} en una promo activa o programada.`;
  }
  if (datos.tipo === "coleccion" && !datos.coleccion) e.coleccion = "Elige la colección.";
  if (datos.tipo === "producto" && !datos.productoId) e.productoId = "Elige el producto.";
  if (!datos.inicio) e.inicio = "Elige cuándo empieza.";
  if (datos.fin && datos.inicio && datos.fin < datos.inicio) e.fin = "No puede vencer antes de empezar.";
  return e;
}

/** Pedidos que usaron el código de una promo: no cancelados, de la tienda y hechos mientras la promo corría. */
export function pedidosConCodigo(pedidos: Pedido[], promo: Promo): number {
  if (promo.tipo !== "codigo" || !promo.codigo) return 0;
  return pedidos.filter(
    (p) =>
      p.tiendaId === promo.tiendaId &&
      p.estado !== "cancelado" &&
      p.codigoPromo?.toUpperCase() === promo.codigo!.toUpperCase() &&
      p.creadoEn >= promo.fechaInicio &&
      (promo.fechaFin === null || p.creadoEn <= promo.fechaFin),
  ).length;
}
