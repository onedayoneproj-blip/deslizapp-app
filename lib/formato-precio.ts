/**
 * Formato del precio mientras se escribe: dígitos con coma de miles ("1850" → "1,850"). El estado guarda solo dígitos; el
 * texto con comas es lo que se ve. `editarPrecio` recoloca el cursor (Safari del iPhone lo manda al final si el valor cambia).
 */

/** Largo máximo de un precio en dígitos (hasta 9,999,999). */
export const PRECIO_MAX_DIGITOS = 7;

/** "1850" → "1,850"; "" → "". */
export const formatearPrecio = (digitos: string): string => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Solo dígitos, sin ceros a la izquierda y hasta `max` cifras (pegar "RD$ 1,850.00" da "185000"; el campo no admite decimales). */
export const limpiarPrecio = (texto: string, max: number = PRECIO_MAX_DIGITOS): string =>
  texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, max);

/** El texto con comas que queda cuando hay `digitosAntes` dígitos a la izquierda del cursor: dónde va el cursor. */
const posicionTrasDigitos = (texto: string, digitosAntes: number): number => {
  if (digitosAntes <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] !== ",") vistos++;
    if (vistos === digitosAntes) return i + 1;
  }
  return texto.length;
};

/**
 * Lo que pasa cuando el campo cambia: `previo` es el texto que se veía, `nuevo` lo que dejó el teclado y `cursor` dónde quedó.
 * Devuelve los dígitos limpios, el texto con comas y dónde poner el cursor. Borrar una coma borra el dígito de antes (si no, el
 * toque de borrar no haría nada). Los ceros a la izquierda y lo que pase de `max` se quitan sin mover el cursor de lugar.
 */
export function editarPrecio(previo: string, nuevo: string, cursor: number, max: number = PRECIO_MAX_DIGITOS): { digitos: string; texto: string; cursor: number } {
  const bruto = nuevo.replace(/\D/g, "");
  let antes = nuevo.slice(0, Math.max(0, cursor)).replace(/\D/g, "").length;
  let digitos = bruto;
  if (bruto === previo.replace(/\D/g, "") && nuevo.length < previo.length && antes > 0) {
    digitos = bruto.slice(0, antes - 1) + bruto.slice(antes);
    antes -= 1;
  }
  const sinCeros = digitos.replace(/^0+(?=\d)/, "");
  antes = Math.max(0, antes - (digitos.length - sinCeros.length));
  digitos = sinCeros.slice(0, max);
  antes = Math.min(antes, digitos.length);
  const texto = formatearPrecio(digitos);
  return { digitos, texto, cursor: posicionTrasDigitos(texto, antes) };
}
