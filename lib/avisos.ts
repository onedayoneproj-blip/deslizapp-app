// "Avísame cuando llegue" en el panel (docs/12 §9; tablero Producto «Inventario»). Sin dependencias: tests/avisos.test.mjs.

/** Solo un catálogo HTTPS publicado; nunca enlaces inventados o ejecutables. */
export function catalogoParaAviso(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    u.hash = "";
    return u.href;
  } catch { return null; }
}

/** "¡Hola Carolina! Ya llegó Mayar · 50 ml. Aquí lo tienes antes de que se vaya: https://…#p/mayar". Sin nombre: "¡Hola! …". */
export function mensajeYaLlego(d: { nombre: string | null; producto: string; variante: string | null; urlCatalogo: string | null; slug: string }): string {
  const hola = d.nombre?.trim() ? `¡Hola ${d.nombre.trim().split(/\s+/)[0]}!` : "¡Hola!";
  const que = d.variante ? `${d.producto} · ${d.variante}` : d.producto;
  const url = catalogoParaAviso(d.urlCatalogo);
  const enlace = url ? ` Aquí lo tienes antes de que se vaya: ${url}#p/${d.slug}` : "";
  return `${hola} Ya llegó ${que}.${enlace}`;
}

/** "18095550142" → enlace de WhatsApp con el mensaje. */
export const enlaceAviso = (telefono: string, mensaje: string) => `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;

/** Cuántos esperan cada producto (por id). */
export function esperanPorProducto(avisos: { productoId: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of avisos) m.set(a.productoId, (m.get(a.productoId) ?? 0) + 1);
  return m;
}
