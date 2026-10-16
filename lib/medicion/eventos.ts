// Medición propia de lo público (docs/18-medicion.md). Puro: sin navegador ni red (tests/medicion.test.mjs).
// La lista cerrada es la misma que valida registrar_evento_publico en Supabase; un evento nuevo pide migración nueva.

export const EVENTOS = [
  "inicio_visto",
  "cta_iniciar_sesion",
  "cta_como_funciona",
  "cta_quiero_vender",
  "cta_demo",
  "conoce_paso",
  "conoce_final",
  "conoce_cta_vender",
  "conoce_cta_catalogo",
  "conoce_cta_entrar",
  "conoce_cta_otra_vez",
  "catalogo_visto",
  "catalogo_reel_deslizapp",
  "catalogo_cta_iniciar_sesion",
  "catalogo_cta_como_funciona",
  "catalogo_cta_quiero_vender",
  "catalogo_cta_demo",
] as const;
export type Evento = (typeof EVENTOS)[number];

export type Origen = "instagram" | "whatsapp" | "directo" | "otro";
export const ORIGENES: readonly Origen[] = ["instagram", "whatsapp", "directo", "otro"];

export type DatosEvento = { paso?: string; tiendaSlug?: string };

export function esEvento(x: unknown): x is Evento {
  return typeof x === "string" && (EVENTOS as readonly string[]).includes(x);
}

const DE_INSTAGRAM = /(^|\.)instagram\.com$/;
const DE_WHATSAPP = /(^|\.)(whatsapp\.com|wa\.me)$/;

/**
 * De dónde llegó la visita: `utm_source` manda; si no, el dominio del referer o, en el navegador interno de Instagram, su agente.
 * Sin referer ni marca → «directo» (WhatsApp casi nunca manda referer: sus enlaces se ven aquí como directos salvo que lleven utm_source).
 * Un referer del propio sitio no cuenta: devuelve null y quien llama conserva el origen con el que empezó la visita.
 */
export function deducirOrigen(entrada: { utmSource?: string | null; referer?: string | null; agente?: string | null; host?: string | null }): Origen | null {
  const utm = (entrada.utmSource ?? "").trim().toLowerCase();
  if (utm) {
    if (utm === "instagram" || utm === "ig") return "instagram";
    if (utm === "whatsapp" || utm === "wa") return "whatsapp";
    return "otro";
  }
  if (entrada.referer) {
    let host = "";
    try {
      host = new URL(entrada.referer).hostname.toLowerCase();
    } catch {
      return "otro";
    }
    if (entrada.host && host === entrada.host.toLowerCase()) return null;
    if (DE_INSTAGRAM.test(host)) return "instagram";
    if (DE_WHATSAPP.test(host)) return "whatsapp";
    return "otro";
  }
  if (/Instagram/i.test(entrada.agente ?? "")) return "instagram";
  return "directo";
}
