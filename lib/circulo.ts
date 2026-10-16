// Círculo Deslizapp (docs/14, referencias/circulo): las fundadoras. Puro: tests/circulo.test.mjs.
import type { CirculoTienda } from "./types";

/** El descuento de las fundadoras sobre su plan (docs/14: 30 % menos el primer año). */
export const DESCUENTO_CIRCULO = 30;

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
  return descuentoVigente(c, hoy) ? `menos en tu plan hasta el ${fecha}` : `Tu descuento terminó el ${fecha}. El aro sigue siendo tuyo.`;
}

/** Precio sugerido con el 30 % aplicado, redondeado al peso. */
export const conDescuentoCirculo = (precio: number): number => Math.round((precio * (100 - DESCUENTO_CIRCULO)) / 100);
