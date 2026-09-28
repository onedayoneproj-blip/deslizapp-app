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
