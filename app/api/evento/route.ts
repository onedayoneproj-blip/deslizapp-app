// Recibe los eventos de medición (lib/medicion/registrar-evento.ts) y los pasa a registrar_evento_publico en Supabase
// (docs/18-medicion.md). No guarda ni mira IP, cookies ni cabeceras del visitante. Siempre 204: al navegador no le importa la respuesta,
// y la llamada a Supabase corre después de responder (after).

import { after } from "next/server";
import { esEvento } from "@/lib/medicion/eventos";
import { HAY_SUPABASE, SUPABASE_LLAVE, SUPABASE_URL } from "@/lib/supabase/config";

const MAX_BYTES = 2048;
const HOSTS_PROPIOS = new Set(["deslizapp.com", "www.deslizapp.com", "deslizapp-app.vercel.app"]);

const sinContenido = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const textoONulo = (x: unknown) => (typeof x === "string" ? x : null);

/** Sin Origin (sendBeacon a veces no lo manda) pasa; con Origin, solo el mismo host o el de producción. */
function origenPermitido(request: Request): boolean {
  const origen = request.headers.get("origin");
  if (!origen) return true;
  try {
    const host = new URL(origen).host;
    return host === request.headers.get("host") || HOSTS_PROPIOS.has(host);
  } catch {
    return false;
  }
}

/** Lee el cuerpo con tope: si pasa de MAX_BYTES, lo descarta sin terminar de leerlo. */
async function leerConTope(request: Request): Promise<string | null> {
  const largo = Number(request.headers.get("content-length"));
  if (Number.isFinite(largo) && largo > MAX_BYTES) return null;
  const lector = request.body?.getReader();
  if (!lector) return null;
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      void lector.cancel().catch(() => {});
      return null;
    }
    trozos.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(trozos));
}

export async function POST(request: Request) {
  try {
    if (!HAY_SUPABASE || !origenPermitido(request)) return sinContenido();
    const texto = await leerConTope(request);
    if (!texto) return sinContenido();
    const d = JSON.parse(texto) as Record<string, unknown>;
    if (!esEvento(d.evento) || typeof d.ruta !== "string") return sinContenido();
    const cuerpo = JSON.stringify({
      p_evento: d.evento,
      p_ruta: d.ruta.slice(0, 300),
      p_origen: textoONulo(d.origen) ?? "otro",
      p_paso: textoONulo(d.paso),
      p_tienda_slug: textoONulo(d.tienda_slug),
    });
    after(async () => {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/registrar_evento_publico`, {
          method: "POST",
          headers: { apikey: SUPABASE_LLAVE, "Content-Type": "application/json" },
          body: cuerpo,
          signal: AbortSignal.timeout(2000),
        });
      } catch {
        /* si falla, no pasa nada */
      }
    });
  } catch {
    /* si falla, no pasa nada */
  }
  return sinContenido();
}
