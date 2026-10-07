// La cuenta de Google en el menú y el admin, y el orden de las tiendas del selector. Lógica pura (se prueba con node):
// nada de esto se guarda en la base; la foto, el nombre y el correo se leen de la sesión.

import type { Tienda } from "./types";

export type CuentaVista = {
  nombre: string;
  /** Vacío en la demo. */
  email: string;
  /** Solo https; null cae a las iniciales. */
  fotoUrl: string | null;
};

export const CUENTA_DEMO: CuentaVista = { nombre: "Cuenta de demo", email: "", fotoUrl: null };

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * La cuenta a partir de los claims de la sesión (los datos de Google del usuario autenticado: `user_metadata` con
 * `full_name`/`name` y `avatar_url`/`picture`). null si no hay con qué identificarla.
 */
export function cuentaDeClaims(claims: unknown): CuentaVista | null {
  if (!claims || typeof claims !== "object") return null;
  const c = claims as { email?: unknown; user_metadata?: Record<string, unknown> | null };
  const meta = c.user_metadata && typeof c.user_metadata === "object" ? c.user_metadata : {};
  const email = texto(c.email) || texto(meta.email);
  const nombre = texto(meta.full_name) || texto(meta.name) || email.split("@")[0] || "";
  if (!nombre && !email) return null;
  const foto = texto(meta.avatar_url) || texto(meta.picture);
  return { nombre: nombre || email, email, fotoUrl: /^https:\/\//i.test(foto) ? foto : null };
}

/** Iniciales para el círculo sin foto: dos letras del nombre (o la primera del correo). */
export function inicialesDeCuenta(c: Pick<CuentaVista, "nombre" | "email">): string {
  const palabras = (c.nombre || c.email).replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  const letras = palabras.length > 1 ? palabras[0]![0]! + palabras[1]![0]! : (palabras[0] ?? "").slice(0, 2);
  return letras.toLocaleUpperCase("es") || "?";
}

/** La activa primero y después por nombre (sin distinguir tildes ni mayúsculas). */
export function ordenarTiendas<T extends Pick<Tienda, "id" | "nombre">>(tiendas: readonly T[], activaId: string): T[] {
  return [...tiendas].sort((a, b) => (a.id === activaId ? -1 : b.id === activaId ? 1 : a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })));
}

/** Título de la hoja del menú. */
export const tituloMenu = (cantidad: number) => (cantidad > 1 ? "Tus tiendas" : "Tu tienda");
/** Etiqueta accesible del botón del encabezado. */
export const accionEncabezado = (cantidad: number) => (cantidad > 1 ? "Menú de tus tiendas" : "Menú de la tienda");
/** Etiqueta accesible completa de una tienda de la lista: «Mora Shoes, Pro, tienda activa». */
export const etiquetaTienda = (nombre: string, plan: string, activa: boolean) => `${nombre}, ${plan}${activa ? ", tienda activa" : ""}`;

// El aviso que se muestra al volver a cargar la página tras cambiar de tienda (la recarga borra todo lo de la anterior).
export const KEY_AVISO_TRAS_CAMBIO = "deslizapp-aviso-tras-cambio";
export const avisoAhoraEstas = (nombre: string) => `Ahora estás en ${nombre}.`;
export const AVISO_SIN_CAMBIO = "No pudimos cambiar de tienda. Sigues en la de antes.";

/** El panel de la tienda. Se llega con recarga completa (no con el router) cuando hay que soltar todo lo de antes. */
export const RUTA_PANEL = "/";
