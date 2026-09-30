// Con qué datos abre la app: la pantalla de entrada, la demo o tu tienda real (Supabase con Google).
// Un almacén fuera de React (como la demo) que el DataProvider lee con useSyncExternalStore.

import type { Usuario } from "../types";
import { HAY_SUPABASE, SUPABASE_LLAVE, SUPABASE_URL } from "../supabase/config";
import { createClient } from "../supabase/client";
import { esErrorDeRed, traducirErrorSupabase } from "./errores";
import { aUsuario, type FilaUsuario } from "./filas";
import { debeComprobarSesion } from "../auth/canje";
import { elegirModo, KEY_MODO, type Modo } from "./modo";

export type EstadoSesion =
  /** Pantalla de entrada ("Entrar con Google" / "Ver demo"). `aviso`: por qué se volvió aquí. */
  | { tipo: "entrada"; aviso: string | null }
  | { tipo: "demo" }
  /** Modo real: comprobando la sesión con Supabase. */
  | { tipo: "cargando" }
  /** Entró con Google pero su cuenta no tiene tienda (no hay fila en `usuarios`). */
  | { tipo: "sin-tienda"; email: string }
  | { tipo: "lista"; usuario: Usuario }
  /** No se pudo comprobar la sesión (sin conexión, por ejemplo). */
  | { tipo: "error"; mensaje: string };

export const AVISO_GOOGLE_SIN_CONFIGURAR = "El acceso con Google todavía no está activado. Mientras tanto, puedes ver la demo.";
const AVISO_LOGIN_FALLIDO = "No se pudo entrar con Google. Inténtalo otra vez.";
const AVISO_SIN_RED = "No hay conexión. Revisa tu internet e inténtalo otra vez.";

let estado: EstadoSesion | null = null;
const oyentes = new Set<() => void>();
let escuchandoAuth = false;

function poner(nuevo: EstadoSesion) {
  estado = nuevo;
  for (const o of oyentes) o();
}

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardarModo(modo: Modo | null) {
  try {
    if (modo) localStorage.setItem(KEY_MODO, modo);
    else localStorage.removeItem(KEY_MODO);
  } catch {
    // Sin localStorage (modo privado viejo): se elige cada vez.
  }
}

/** Si Google devolvió un error (`/?error_login=1`), se avisa una vez y se limpia la dirección. */
function avisoDeLaUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error_login")) return null;
    url.searchParams.delete("error_login");
    // Fuera del render (esto corre al leer el estado por primera vez).
    setTimeout(() => window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash), 0);
    return AVISO_LOGIN_FALLIDO;
  } catch {
    return null;
  }
}

function hayCookieDeSesion(): boolean {
  try {
    return /(^|;\s*)sb-[^=]*auth-token/.test(document.cookie);
  } catch {
    return false;
  }
}

function inicial(): EstadoSesion {
  const hayErrorLogin = new URL(window.location.href).searchParams.has("error_login");
  const aviso = avisoDeLaUrl();
  const modo = elegirModo(leerLocal(KEY_MODO), HAY_SUPABASE);
  if (modo === "demo") return { tipo: "demo" };
  // Aunque el login haya avisado de un error (la vuelta de Google pudo repetirse), si ya hay sesión válida se entra.
  if (debeComprobarSesion(modo, HAY_SUPABASE, hayErrorLogin, hayCookieDeSesion())) {
    queueMicrotask(() => void comprobarSesion(aviso));
    return { tipo: "cargando" };
  }
  return { tipo: "entrada", aviso };
}

export function leerSesion(): EstadoSesion {
  estado ??= inicial();
  return estado;
}

export function suscribirSesion(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Modo real: ¿hay sesión? ¿de qué tienda? */
export async function comprobarSesion(aviso: string | null = null) {
  if (estado?.tipo !== "cargando") poner({ tipo: "cargando" });
  const supabase = createClient();
  if (!escuchandoAuth) {
    escuchandoAuth = true;
    supabase.auth.onAuthStateChange((evento) => {
      // Si la sesión se cierra (en otra pestaña o porque venció), vuelve a la entrada.
      if (evento === "SIGNED_OUT" && estado?.tipo !== "demo" && estado?.tipo !== "entrada") {
        poner({ tipo: "entrada", aviso: "Tu sesión se cerró. Vuelve a entrar con Google." });
      }
    });
  }
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error && esErrorDeRed(error)) throw error;
    const claims = data?.claims;
    if (!claims?.sub) {
      poner({ tipo: "entrada", aviso });
      return;
    }
    const r = await supabase.from("usuarios").select("*").eq("id", claims.sub).maybeSingle();
    if (r.error) throw traducirErrorSupabase(r.error);
    if (!r.data) {
      guardarModo("real");
      poner({ tipo: "sin-tienda", email: typeof claims.email === "string" ? claims.email : "" });
      return;
    }
    guardarModo("real"); // por si el login terminó en un contexto sin modo guardado
    poner({ tipo: "lista", usuario: aUsuario(r.data as FilaUsuario) });
  } catch (e) {
    poner({ tipo: "error", mensaje: esErrorDeRed(e) ? AVISO_SIN_RED : "No pudimos abrir tu tienda. Inténtalo otra vez." });
  }
}

export function verDemo() {
  guardarModo("demo");
  poner({ tipo: "demo" });
}

/** ¿Tiene Supabase activado el acceso con Google? (settings públicos de Auth, con la llave publicable). */
async function googleActivado(): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_LLAVE } });
  if (!r.ok) return true; // Si no se puede saber, que lo diga Supabase al intentar.
  const ajustes = (await r.json()) as { external?: { google?: boolean } };
  return ajustes.external?.google === true;
}

/**
 * Lleva a Google y, al volver, a /auth/callback. Devuelve un aviso (y no sale de la app) si el acceso con
 * Google no está configurado todavía o no hay conexión.
 */
export async function entrarConGoogle(): Promise<string | null> {
  if (!HAY_SUPABASE) return AVISO_GOOGLE_SIN_CONFIGURAR;
  let guardado = false;
  // Si no se pudo salir hacia Google, se olvida el modo real (salvo que ya se haya elegido otra cosa).
  const deshacer = () => {
    if (guardado && leerLocal(KEY_MODO) === "real" && estado?.tipo === "entrada") guardarModo(null);
  };
  try {
    if (!(await googleActivado())) return AVISO_GOOGLE_SIN_CONFIGURAR;
    // Se recuerda antes de salir: al volver de Google la app abre directo en modo real.
    guardarModo("real");
    guardado = true;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      deshacer();
      return /provider is not enabled|unsupported provider/i.test(error.message) ? AVISO_GOOGLE_SIN_CONFIGURAR : AVISO_LOGIN_FALLIDO;
    }
    return null;
  } catch (e) {
    deshacer();
    return esErrorDeRed(e) || e instanceof TypeError ? AVISO_SIN_RED : AVISO_LOGIN_FALLIDO;
  }
}

/** Cerrar sesión (real) o salir de la demo (sus datos se quedan guardados): vuelve a la entrada. */
export async function salir() {
  const eraReal = estado?.tipo !== "demo";
  guardarModo(null);
  poner({ tipo: "entrada", aviso: null });
  if (eraReal && HAY_SUPABASE) {
    try {
      await createClient().auth.signOut();
    } catch {
      // Sin conexión: la sesión local igual se borra.
    }
  }
}
