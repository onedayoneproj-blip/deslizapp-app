// Qué muestra la tarjeta del catálogo en línea (pestaña Catálogo), derivado en UN solo lugar. Sin dependencias: se prueba en
// tests/catalogo-estado.test.mjs.

/** El estado real que guarda la base (tiendas.catalogo_estado). */
export type EstadoCatalogo = "sin" | "solicitado" | "generando" | "revisar" | "cambios" | "publicado";

/** Lo que se dibuja: el estado, más "recien" (celebración), "pausado" (tienda pausada) y "conectar" (publicado sin enlace válido). */
export type VistaCatalogo = "sin" | "solicitado" | "generando" | "revisar" | "cambios" | "recien" | "publicado" | "pausado" | "conectar";

export const NOMBRES_PASOS = ["Reuniendo tus fotos", "Diseñando tu portada", "Últimos detalles"] as const;
/** Etiqueta corta de cada paso, en la fila de tres pasos. */
export const ETIQUETAS_PASOS = ["Fotos", "Portada", "Detalles"] as const;
/** Cuánto de la barra se llena en cada paso. */
export const PROGRESO_PASOS = [33, 62, 90] as const;

/** Días que cuenta como "recién publicado". */
export const DIAS_RECIEN = 3;

/** El paso 1–3 de un catálogo que se está armando (por defecto 1). */
export function pasoActual(paso: number | null | undefined): 1 | 2 | 3 {
  return paso === 2 || paso === 3 ? paso : 1;
}

/** ¿Se publicó hace menos de DIAS_RECIEN días? */
export function esRecienPublicado(publicadoEn: string | null | undefined, ahora: Date = new Date()): boolean {
  if (!publicadoEn) return false;
  const t = Date.parse(publicadoEn);
  if (Number.isNaN(t)) return false;
  const edad = ahora.getTime() - t;
  return edad >= -60_000 && edad < DIAS_RECIEN * 24 * 60 * 60 * 1000;
}

/** Con estos estados el equipo puede cambiar algo en cualquier momento: se vuelve a leer la tienda cada minuto. */
export const ESTADOS_QUE_SE_REFRESCAN: EstadoCatalogo[] = ["solicitado", "generando", "cambios"];

export function vistaCatalogo({
  tiendaEstado,
  catalogoEstado,
  publicadoEn,
  enlaceValido,
  visto,
  ahora = new Date(),
}: {
  tiendaEstado?: string | null;
  catalogoEstado: EstadoCatalogo;
  publicadoEn: string | null;
  enlaceValido: boolean;
  /** Ya vio la celebración en este dispositivo. */
  visto: boolean;
  ahora?: Date;
}): VistaCatalogo {
  if (tiendaEstado === "pausada") return "pausado";
  if (catalogoEstado === "publicado") {
    if (!enlaceValido) return "conectar"; // publicado sin un https válido: "Sin catálogo" con "Conectar mi catálogo"
    return !visto && esRecienPublicado(publicadoEn, ahora) ? "recien" : "publicado";
  }
  return catalogoEstado;
}
