// Teléfonos de República Dominicana (WhatsApp). Se guardan siempre como "+1" + 10 dígitos
// (código de área 809, 829 o 849 + 7 dígitos), así "809-555-0142" y "+1 (809) 555 0142" son el mismo.

import { trozos, type Trozo } from "./texto";

const AREAS = ["809", "829", "849"];

/** "809-555-0142", "(829) 555 0142", "+1 849 555 0142", "18095550142" → "+18095550142". null si no es dominicano. */
export function normalizarTelefonoDO(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("1")) digitos = digitos.slice(1);
  if (digitos.length !== 10 || !AREAS.includes(digitos.slice(0, 3))) return null;
  return `+1${digitos}`;
}

/** "+18095550142" → "809-555-0142" (lo que se muestra). Lo que no encaja se deja tal cual. */
export function formatearTelefono(telefono: string | null): string {
  if (!telefono) return "";
  const n = normalizarTelefonoDO(telefono);
  return n ? `${n.slice(2, 5)}-${n.slice(5, 8)}-${n.slice(8)}` : telefono;
}

const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

/**
 * Dígitos a buscar en un teléfono. Ignora espacios, guiones, paréntesis y el prefijo 1 / +1:
 * "(809) 555-1234", "809-555-1234" y "+1 809 555 1234" buscan lo mismo. Como ningún número
 * dominicano empieza con 1 (son 809, 829 y 849), un 1 al inicio se prueba también sin él.
 * Con menos de 3 dígitos no se busca por teléfono (todo coincidiría).
 */
export function digitosDeBusqueda(consulta: string): string[] {
  const d = soloDigitos(consulta);
  if (d.length < 3) return [];
  return d.startsWith("1") && d.length > 3 ? [d, d.slice(1)] : [d];
}

/** El teléfono guardado ("+18095551234") sin el prefijo de país: "8095551234". */
export function telefonoNacional(telefono: string): string {
  const d = soloDigitos(telefono);
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}

/** ¿Lo escrito parece un teléfono (solo dígitos y separadores, 7 o más dígitos)? */
export function pareceTelefono(consulta: string): boolean {
  return /^[\d\s+\-().]+$/.test(consulta.trim()) && soloDigitos(consulta).length >= 7;
}

/** Resalta en un teléfono ya formateado ("809-555-1234") los dígitos que coinciden con la consulta. */
export function resaltarTelefono(formateado: string, consulta: string): Trozo[] {
  const posiciones: number[] = []; // posición de cada dígito en el texto formateado
  [...formateado].forEach((c, i) => /\d/.test(c) && posiciones.push(i));
  const dig = posiciones.map((i) => formateado[i]).join("");
  const marcado = new Array<boolean>(formateado.length).fill(false);
  for (const d of digitosDeBusqueda(consulta)) {
    const desde = dig.indexOf(d);
    if (desde === -1) continue;
    // Incluye los separadores entre el primer y el último dígito marcado
    for (let i = posiciones[desde]!; i <= posiciones[desde + d.length - 1]!; i++) marcado[i] = true;
    break;
  }
  return trozos(formateado, marcado);
}
