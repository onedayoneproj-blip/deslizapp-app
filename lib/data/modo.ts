// Modo de la app: "demo" (datos de prueba en el navegador) o "real" (Supabase con Google).
// Sin imports de valores: se prueba directo con Node (tests/datos.test.mjs).

export type Modo = "demo" | "real";

/** Dónde se recuerda el modo elegido en la pantalla de entrada. */
export const KEY_MODO = "deslizapp-modo-v1";

/**
 * El modo con el que abre la app: el que se eligió la última vez. Sin elección guardada (o con un valor raro)
 * se muestra la pantalla de entrada (null). "real" sin Supabase configurado tampoco vale.
 */
export function elegirModo(guardado: string | null, hayConfiguracion: boolean): Modo | null {
  if (guardado === "demo") return "demo";
  if (guardado === "real") return hayConfiguracion ? "real" : null;
  return null;
}

/** ¿Están las dos variables públicas de Supabase? (La URL debe ser https; la llave nunca es una secreta.) */
export function supabaseConfigurado(url: string | undefined, llave: string | undefined): boolean {
  if (!url || !llave) return false;
  if (!/^https:\/\/\S+$/.test(url.trim())) return false;
  // Nunca una llave secreta en el navegador: solo la publicable (o la anon heredada).
  return !llave.startsWith("sb_secret_");
}
