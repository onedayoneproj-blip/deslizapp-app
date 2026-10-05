// Solo el servidor importa este módulo. No descarga redirecciones, URLs privadas ni fotos ajenas al bucket permitido.
import sharp from "sharp";
import { fotoPublicaPermitida } from "./imagen-pedido";
import { MAX_BYTES, TIPOS_PERMITIDOS } from "../data/almacen";

export async function descargarFotoPedido(foto: string | null, supabaseUrl: string, transporte: typeof fetch = fetch): Promise<string | null> {
  const url = fotoPublicaPermitida(foto, supabaseUrl);
  if (!url) return null;
  const control = new AbortController();
  const tiempo = setTimeout(() => control.abort(), 4000);
  try {
    const respuesta = await transporte(url, { redirect: "error", signal: control.signal, cache: "no-store" });
    if (!respuesta.ok || !TIPOS_PERMITIDOS.includes(respuesta.headers.get("content-type")?.split(";")[0] ?? "")) return null;
    if (Number(respuesta.headers.get("content-length")) > MAX_BYTES || !respuesta.body) return null;
    const lector = respuesta.body.getReader(), partes: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_BYTES) { await lector.cancel(); return null; }
      partes.push(value);
    }
    // Fotos limitadas, orientación EXIF y una copia reducida. Originales intactos.
    const png = await sharp(Buffer.concat(partes), { limitInputPixels: 16_000_000 }).rotate().resize(600, 480, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch { return null; }
  finally { control.abort(); clearTimeout(tiempo); }
}
