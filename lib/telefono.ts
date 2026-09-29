// Teléfonos de República Dominicana (WhatsApp). Se guardan siempre como "+1" + 10 dígitos
// (código de área 809, 829 o 849 + 7 dígitos), así "809-555-0142" y "+1 (809) 555 0142" son el mismo.

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
