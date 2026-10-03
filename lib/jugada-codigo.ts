// Código personal de Tu próxima jugada: la misma regla que la función `crear_codigo_cliente` de la base
// (supabase/migrations/20261003200000_jugadas_codigos_y_envios.sql). Puro, con pruebas en tests/jugada-codigo.test.mjs.

/** Lo que acepta la base: de 3 a 15 letras A–Z o números, sin espacios. */
export const PATRON_CODIGO = /^[A-Z0-9]{3,15}$/;

/** Límites que valida la base. */
export const PORCENTAJE_MIN = 1;
export const PORCENTAJE_MAX = 90;
export const DIAS_MAX = 90;

/** Primera palabra del nombre, sin tildes ni símbolos, en mayúsculas, hasta 6 letras ("Luisanna Peña" → "LUISAN"). Sin letras: "CLIENTE". */
export function baseCodigo(nombre: string): string {
  const palabra = nombre.trim().split(/\s+/)[0] ?? "";
  const limpia = palabra
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6);
  return limpia || "CLIENTE";
}

/**
 * El código que se propone: base + porcentaje ("LUISAN10"). Si ya lo usa una promo activa de la tienda, se le agregan 2 dígitos
 * (el primero libre de 10 a 99; la base elige uno al azar, por eso el que vuelve puede ser otro).
 */
export function codigoPropuesto(nombre: string, porcentaje: number, enUso: Iterable<string>): string {
  const usados = new Set([...enUso].map((c) => c.toUpperCase()));
  const simple = `${baseCodigo(nombre)}${porcentaje}`;
  if (!usados.has(simple)) return simple;
  for (let n = 10; n <= 99; n++) {
    if (!usados.has(`${simple}${n}`)) return `${simple}${n}`;
  }
  return simple;
}

/** Mientras se escribe: mayúsculas, solo A–Z y 0–9 (se quitan tildes y espacios), máximo 15. */
export function limpiarCodigo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 15);
}

/** Santo Domingo no cambia de horario: UTC−4 todo el año. */
const DESFASE_SD = 4 * 3_600_000;
const DIA = 86_400_000;

/** Fin del día (hora de Santo Domingo) `dias` días después de hoy: el vencimiento de un código personal. */
export function finDelDiaEn(ahora: number, dias: number): string {
  const inicioHoySd = Math.floor((ahora - DESFASE_SD) / DIA) * DIA + DESFASE_SD;
  return new Date(inicioHoySd + (dias + 1) * DIA - 1).toISOString();
}
