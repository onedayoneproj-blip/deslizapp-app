// Recibe los eventos de medición (lib/medicion/registrar-evento.ts) y los pasa a registrar_evento_publico en Supabase
// (docs/18-medicion.md). No guarda ni mira IP, cookies ni cabeceras del visitante. Siempre 204: al navegador no le importa la respuesta.

import { esEvento } from "@/lib/medicion/eventos";
import { HAY_SUPABASE, SUPABASE_LLAVE, SUPABASE_URL } from "@/lib/supabase/config";

const sinContenido = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const textoONulo = (x: unknown) => (typeof x === "string" ? x : null);

export async function POST(request: Request) {
  try {
    if (!HAY_SUPABASE) return sinContenido();
    const texto = await request.text();
    if (texto.length > 2000) return sinContenido();
    const d = JSON.parse(texto) as Record<string, unknown>;
    if (!esEvento(d.evento) || typeof d.ruta !== "string") return sinContenido();
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/registrar_evento_publico`, {
      method: "POST",
      headers: { apikey: SUPABASE_LLAVE, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_evento: d.evento,
        p_ruta: d.ruta.slice(0, 300),
        p_origen: textoONulo(d.origen) ?? "otro",
        p_paso: textoONulo(d.paso),
        p_tienda_slug: textoONulo(d.tienda_slug),
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* si falla, no pasa nada */
  }
  return sinContenido();
}
