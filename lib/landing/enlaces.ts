// Los destinos reales de la landing y de la página principal (los CTA y «Entrar»). Puro: tests/landing.test.mjs.

import { INSTAGRAM_DESLIZAPP } from "../config";

/** El perfil de Instagram de Deslizapp (el pie de contacto y «Escríbenos»). El nombre sale de lib/config.ts: nunca escrito a mano. */
export const ENLACE_INSTAGRAM = `https://instagram.com/${INSTAGRAM_DESLIZAPP}`;

/** «Escríbenos» (la página principal y el cierre de /conoce): el Instagram de Deslizapp (docs/prompts/pagina-principal-y-conoce.md). */
export const ENLACE_QUIERO_VENDER = ENLACE_INSTAGRAM;

/** El correo de contacto (el pie de contacto): recibe correo desde el 17 oct 2026. */
export const CORREO_CONTACTO = "hola@deslizapp.com";

/** «Cómo funciona»: la landing con la demo de un pedido. */
export const RUTA_CONOCE = "/conoce";

/** Catálogo de ejemplo: la Tienda de ensayo (slug comprobado en Supabase el 14 oct 2026). */
export const ENLACE_CATALOGO_EJEMPLO = "/tienda/tienda-de-ensayo";

/** «Entrar» de /conoce: la página principal, con su «Iniciar sesión» (sin sesión) o el panel (con sesión). */
export const RUTA_ENTRAR = "/";

export const URL_SITIO = "https://deslizapp.com";

/** La página pública de planes y precios (docs/prompts/pagina-planes.md). */
export const RUTA_PLANES = "/planes";
