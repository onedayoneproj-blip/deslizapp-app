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

/** La cookie que recuerda a dónde volver después de Google (el link de un pedido del catálogo, o `/unirse`). */
export const COOKIE_VOLVER = "dz_volver";

/**
 * A dónde se puede volver después de Google: solo rutas locales permitidas (`/pedido/CODIGO` y `/unirse`, SIN el código del
 * enlace: ese queda guardado en el navegador y nunca viaja en el retorno). Cualquier otra cosa (otro dominio, `//x`, rutas con
 * `..`, un código que no es de solicitud) vuelve al panel: nunca se redirige afuera.
 */
export function vueltaPermitida(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let ruta = valor;
  try {
    ruta = decodeURIComponent(valor);
  } catch {
    return null;
  }
  if (ruta === RUTA_UNIRSE) return ruta;
  return /^\/pedido\/[A-HJ-NP-Z2-9]{10}$/.test(ruta) ? ruta : null;
}

/** El código viaja en el callback además de la cookie: dos pestañas no comparten su destino. */
export function callbackGoogle(origen: string, volverA?: string): string {
  const url = new URL("/auth/callback", origen);
  const vuelta = vueltaPermitida(volverA);
  if (vuelta) url.searchParams.set("volver", vuelta);
  return url.href;
}

/** Donde se abre un enlace de invitación (docs/prompts/colaboradores-e-invitaciones.md §3). */
export const RUTA_UNIRSE = "/unirse";

/** Mantiene el login normal del panel; el retorno de una solicitud monta su vista privada tras comprobar RLS. */
export function destinoGoogle(vuelta: string | null, error: boolean): string {
  if (!vuelta) return error ? "/?error_login=1" : "/";
  if (vuelta === RUTA_UNIRSE) return error ? `${RUTA_UNIRSE}?error_login=1` : RUTA_UNIRSE;
  return `${vuelta}?registrar=1${error ? "&error_login=1" : ""}`;
}
