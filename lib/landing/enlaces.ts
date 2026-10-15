// Los destinos reales de la landing y de la página principal (los CTA y «Entrar»). Puro: tests/landing.test.mjs.

import { INSTAGRAM_DESLIZAPP } from "../config";

/** «Quiero vender» (la página principal y el cierre de /conoce): el Instagram de Deslizapp (docs/prompts/pagina-principal-y-conoce.md). */
export const ENLACE_QUIERO_VENDER = `https://instagram.com/${INSTAGRAM_DESLIZAPP}`;

/** «Cómo funciona»: la landing con la demo de un pedido. */
export const RUTA_CONOCE = "/conoce";

/** Catálogo de ejemplo: la Tienda de ensayo (slug comprobado en Supabase el 14 oct 2026). */
export const ENLACE_CATALOGO_EJEMPLO = "/tienda/tienda-de-ensayo";

/** La pantalla de entrada de siempre («Entrar con Google» / «Ver demo»). */
export const RUTA_ENTRAR = "/entrar";

export const URL_SITIO = "https://deslizapp.com";
