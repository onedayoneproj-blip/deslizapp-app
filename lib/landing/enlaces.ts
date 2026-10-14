// Los destinos reales de la landing (los CTA finales y «Entrar»). Puro: tests/landing.test.mjs.

/** El mismo número y la misma forma que «Quiero uno para mi tienda» del catálogo (components/tienda/catalogo.tsx). */
export const WHATSAPP_VENDER = "18297898061";
export const TEXTO_QUIERO_VENDER = "¡Hola! Vi Deslizapp y quiero vender con mi tienda.";
export const ENLACE_QUIERO_VENDER = `https://wa.me/${WHATSAPP_VENDER}?text=${encodeURIComponent(TEXTO_QUIERO_VENDER)}`;

/** Catálogo de ejemplo: la Tienda de ensayo (slug comprobado en Supabase el 14 oct 2026). */
export const ENLACE_CATALOGO_EJEMPLO = "/tienda/tienda-de-ensayo";

/** La pantalla de entrada de siempre («Entrar con Google» / «Ver demo»). */
export const RUTA_ENTRAR = "/entrar";

export const URL_SITIO = "https://deslizapp.com";
