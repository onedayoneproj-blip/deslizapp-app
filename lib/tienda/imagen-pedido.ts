import type { ItemSolicitud } from "../types";

export const TAMANO_IMAGEN_PEDIDO = { width: 1200, height: 630 };
/** Los mismos códigos públicos que admiten el contrato y el retorno de Google. */
export const codigoPedidoValido = (codigo: string) => /^[A-HJ-NP-Z2-9]{10}$/.test(codigo);

/** Una portada por línea, nunca por unidad. No deduplica variantes ni modifica su orden. */
export function portadasPedido(items: Pick<ItemSolicitud, "foto" | "varianteTexto">[]) {
  return { portadas: items.slice(0, 4).map(i => ({ foto: i.foto, variante: i.varianteTexto })), adicionales: Math.max(0, items.length - 4) };
}

/** Solo fotos de nuestro bucket público. Nunca se acepta un destino arbitrario enviado en la URL. */
export function fotoPublicaPermitida(foto: string | null, supabaseUrl: string): string | null {
  if (!foto || !supabaseUrl) return null;
  try {
    const url = new URL(foto), proyecto = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.origin !== proyecto.origin || url.username || url.password || url.search || url.hash) return null;
    // Ruta de producto: carpeta de tienda y un archivo, sin segmentos ni escapes especiales.
    if (!/^\/storage\/v1\/object\/public\/productos\/[a-f0-9-]{36}\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

/** Metadatos siempre absolutos, con el host del despliegue que se está compartiendo. */
export function urlImagenPedido(codigo: string, origen: string): string | null {
  return codigoPedidoValido(codigo) ? new URL(`/pedido/${codigo}/imagen`, origen).href : null;
}
