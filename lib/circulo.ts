// Círculo Deslizapp (docs/14, referencias/circulo): las fundadoras. Puro: tests/circulo.test.mjs.
import { hoyLocal } from "./promos";
import type { CirculoTienda } from "./types";

/** El día de hoy en Santo Domingo ("AAAA-MM-DD"): el mismo para la tarjeta del panel y la del admin. */
export const hoyCirculo = (ahora: Date = new Date()): string => hoyLocal(ahora);

/** El descuento de las fundadoras sobre su plan (docs/14: 30 % menos el primer año, solo pagando anual). */
export const DESCUENTO_CIRCULO = 30;

/** «-30%», como lo escribe la nota a mano de /planes (el número sale de DESCUENTO_CIRCULO, no se escribe a mano en la página). */
export const textoMenosCirculo = `-${DESCUENTO_CIRCULO}%`;

/** Fechas "AAAA-MM-DD" (sin hora): se leen y se muestran en UTC para que el día no se corra. */
const mesAnio = new Intl.DateTimeFormat("es-DO", { timeZone: "UTC", month: "long", year: "numeric" });
const diaMesAnio = new Intl.DateTimeFormat("es-DO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const aFecha = (iso: string) => new Date(iso.slice(0, 10) + "T00:00:00Z");

/** ¿Sigue vigente el 30 %? Mientras `descuentoHasta` sea hoy o futuro (hoy = "AAAA-MM-DD"). */
export function descuentoVigente(c: CirculoTienda | null | undefined, hoy: string): boolean {
  return !!c?.descuentoHasta && c.descuentoHasta.slice(0, 10) >= hoy;
}

/** «Fundadora desde octubre 2026». */
export const textoDesde = (c: CirculoTienda): string => `Fundadora desde ${mesAnio.format(aFecha(c.desde)).replace(" de ", " ")}`;

/** «menos en tu plan hasta el 16 oct 2027», o el aviso de que ya terminó. */
export function textoDescuento(c: CirculoTienda, hoy: string): string {
  if (!c.descuentoHasta) return "Tu descuento ya terminó. El aro sigue siendo tuyo.";
  const fecha = diaMesAnio.format(aFecha(c.descuentoHasta)).replace(/\./g, "").replace(/ de /g, " ");
  return descuentoVigente(c, hoy) ? `menos en tu primer año anual, hasta el ${fecha}` : `Tu descuento terminó el ${fecha}. El aro sigue siendo tuyo.`;
}

/**
 * El monto del primer año anual del Círculo (docs/14, opción B de Lewis): 12 × el precio mensual × 0,7, redondeado al peso
 * (Inicial 4,192 · Negocio 8,392 · Pro 12,592). Siempre del precio mensual de la base, nunca escrito en el código. No se suma a los
 * 2 meses gratis del anual normal. Es la única fórmula: la usan Cobros, la ficha del admin y la cinta de /planes.
 */
export const montoAnualCirculo = (precioMensual: number): number => Math.round(12 * precioMensual * ((100 - DESCUENTO_CIRCULO) / 100));

/**
 * El monto sugerido de un cobro de una tienda del Círculo (Cobros, docs/14): solo en un cobro **anual** (`meses` = 12) y mientras
 * `descuentoHasta` sea futuro, va `montoAnualCirculo`; en un cobro mensual, el precio normal. En anual sin Círculo vigente devuelve
 * `null`: el monto es el precio anual normal del plan (`planes.precio_anual`), que este módulo no conoce.
 */
export function montoSugeridoCobro(precioMensual: number, meses: number, circulo: CirculoTienda | null | undefined, hoy: string): number | null {
  if (meses === 12) return descuentoVigente(circulo, hoy) ? montoAnualCirculo(precioMensual) : null;
  return precioMensual * meses;
}
