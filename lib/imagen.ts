import { FOTO_LADO_MAXIMO } from "./config";

/**
 * Reduce una foto del celular a JPEG de máx. FOTO_LADO_MAXIMO px de lado y la devuelve como
 * data URL (así cabe en localStorage). Con Supabase, esto se reemplaza por subirla a Storage.
 */
export async function reducirFoto(archivo: File, calidad = 0.82): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await cargarImagen(url);
    const escala = Math.min(1, FOTO_LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Este navegador no deja procesar la foto.");
    ctx.fillStyle = "#ffffff"; // por si la foto trae transparencia
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(img, 0, 0, ancho, alto);
    return lienzo.toDataURL("image/jpeg", calidad);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error("No pudimos leer esa foto."));
    img.src = src;
  });
}

/**
 * Retoque simulado (sin IA en esta entrega): más luz, contraste y color, con un toque cálido,
 * horneado en la foto. Devuelve un JPEG de máx. FOTO_LADO_MAXIMO px como data URL.
 * Se hace píxel a píxel (no con `ctx.filter`) para que se vea igual en Safari.
 */
export async function retocarFoto(src: string, calidad = 0.85): Promise<string> {
  const img = await cargarImagen(src);
  const lado = Math.max(img.naturalWidth || FOTO_LADO_MAXIMO, img.naturalHeight || FOTO_LADO_MAXIMO);
  const escala = Math.min(1, FOTO_LADO_MAXIMO / lado);
  const ancho = Math.max(1, Math.round((img.naturalWidth || FOTO_LADO_MAXIMO) * escala));
  const alto = Math.max(1, Math.round((img.naturalHeight || FOTO_LADO_MAXIMO) * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Este navegador no deja procesar la foto.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);

  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;
  const luz = 14; // brillo
  const contraste = 1.1;
  const saturacion = 1.18;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i]!;
    let g = px[i + 1]!;
    let b = px[i + 2]!;
    const gris = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gris + (r - gris) * saturacion;
    g = gris + (g - gris) * saturacion;
    b = gris + (b - gris) * saturacion;
    r = (r - 128) * contraste + 128 + luz + 5; // + un toque cálido
    g = (g - 128) * contraste + 128 + luz;
    b = (b - 128) * contraste + 128 + luz - 4;
    px[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    px[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    px[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(datos, 0, 0);
  return lienzo.toDataURL("image/jpeg", calidad);
}

/** Lado máximo del logo de la tienda ("Mi marca"). */
export const LOGO_LADO_MAXIMO = 512;

/** Reduce un logo a máx. 512 px conservando la transparencia (WebP si el navegador puede; si no, PNG). */
export async function reducirLogo(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await cargarImagen(url);
    const escala = Math.min(1, LOGO_LADO_MAXIMO / Math.max(img.naturalWidth || LOGO_LADO_MAXIMO, img.naturalHeight || LOGO_LADO_MAXIMO));
    const ancho = Math.max(1, Math.round((img.naturalWidth || LOGO_LADO_MAXIMO) * escala));
    const alto = Math.max(1, Math.round((img.naturalHeight || LOGO_LADO_MAXIMO) * escala));
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Este navegador no deja procesar el logo.");
    ctx.drawImage(img, 0, 0, ancho, alto);
    return lienzo.toDataURL("image/webp", 0.9); // sin soporte de WebP, el navegador entrega PNG
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Píxeles (RGBA) de una imagen reducida a `lado` px, para sacarle los colores. null si no se puede leer. */
export async function pixelesDeImagen(src: string, lado = 64): Promise<Uint8ClampedArray | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolver(i);
      i.onerror = rechazar;
      i.src = src;
    });
    const lienzo = document.createElement("canvas");
    lienzo.width = lado;
    lienzo.height = lado;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, lado, lado);
    return ctx.getImageData(0, 0, lado, lado).data;
  } catch {
    return null; // imagen de otro sitio sin permiso (CORS) o rota
  }
}
