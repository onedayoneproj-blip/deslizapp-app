// Lógica de la vuelta de Google, sin dependencias para poder probarla (tests/auth.test.mjs).

/**
 * Resultado de la vuelta de Google. El código PKCE solo se puede canjear una vez: si la petición llega dos
 * veces (o el canje falla pero la primera ya creó la sesión), lo que cuenta es si hay sesión válida.
 * - canje bien → "ok"
 * - canje mal pero ya hay sesión → "ok" (sin aviso)
 * - canje mal y sin sesión → "error"
 */
export async function resolverVuelta(canjear: () => Promise<{ error: unknown }>, haySesion: () => Promise<boolean>): Promise<"ok" | "error"> {
  try {
    const { error } = await canjear();
    if (!error) return "ok";
  } catch {
    // Se trata como canje fallido.
  }
  try {
    return (await haySesion()) ? "ok" : "error";
  } catch {
    return "error";
  }
}

/**
 * ¿Hay que comprobar la sesión con Supabase al abrir la app? Sí si el modo guardado es "real", y también sin
 * modo guardado cuando hay señales de un login reciente: `?error_login` en la dirección o cookie de sesión.
 * (En iPhone la PWA y Safari no comparten localStorage: el login pudo terminar en un contexto sin modo guardado.)
 */
export function debeComprobarSesion(modo: "demo" | "real" | null, hayConfiguracion: boolean, hayErrorLogin: boolean, hayCookieSesion: boolean): boolean {
  if (!hayConfiguracion || modo === "demo") return false;
  return modo === "real" || hayErrorLogin || hayCookieSesion;
}
