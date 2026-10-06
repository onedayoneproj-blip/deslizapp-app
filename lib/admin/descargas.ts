// Bajar fotos desde el admin (solo navegador). Las fotos públicas de Storage permiten leerlas desde otra página (CORS),
// así que se bajan como archivo con su nombre en vez de abrirse en otra pestaña.

import { armarZip, MAX_BYTES_ZIP, nombreArchivo } from "./zip";

const EXTENSIONES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

function extension(tipo: string, url: string) {
  return EXTENSIONES[tipo] ?? /\.([a-z0-9]{3,4})(?:\?|$)/i.exec(url)?.[1]?.toLowerCase() ?? "jpg";
}

function guardar(blob: Blob, nombre: string) {
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Se libera después: Safari necesita un momento para empezar la descarga.
  window.setTimeout(() => URL.revokeObjectURL(enlace.href), 30_000);
}

async function traer(url: string): Promise<Blob> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
}

/** Baja una foto con un nombre legible. Si el navegador no deja leerla, la abre para guardarla a mano. */
export async function bajarFoto(url: string, base: string): Promise<void> {
  try {
    const blob = await traer(url);
    guardar(blob, nombreArchivo(base, extension(blob.type, url)));
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Baja varias fotos: en un ZIP si todas caben en memoria; si no (o si el ZIP falla), una por una.
 * Devuelve cuántas no se pudieron bajar.
 */
export async function bajarTodas(
  fotos: { url: string; nombre: string }[],
  nombreZip: string,
  alAvanzar: (hechas: number, total: number) => void,
): Promise<{ fallidas: number; enZip: boolean }> {
  const archivos: { nombre: string; datos: Uint8Array; blob: Blob }[] = [];
  let bytes = 0;
  let fallidas = 0;
  for (const [i, f] of fotos.entries()) {
    alAvanzar(i, fotos.length);
    try {
      const blob = await traer(f.url);
      bytes += blob.size;
      if (bytes > MAX_BYTES_ZIP) {
        // No cabe: lo que ya se trajo se guarda suelto y el resto también.
        for (const a of archivos) guardar(a.blob, a.nombre);
        guardar(blob, nombreArchivo(f.nombre, extension(blob.type, f.url)));
        for (const resto of fotos.slice(i + 1)) await bajarFoto(resto.url, resto.nombre);
        alAvanzar(fotos.length, fotos.length);
        return { fallidas, enZip: false };
      }
      archivos.push({ nombre: nombreArchivo(f.nombre, extension(blob.type, f.url)), datos: new Uint8Array(await blob.arrayBuffer()), blob });
    } catch {
      fallidas++;
    }
  }
  alAvanzar(fotos.length, fotos.length);
  if (!archivos.length) return { fallidas, enZip: false };
  try {
    guardar(new Blob([armarZip(archivos)], { type: "application/zip" }), nombreArchivo(nombreZip, "zip"));
    return { fallidas, enZip: true };
  } catch {
    for (const a of archivos) guardar(a.blob, a.nombre);
    return { fallidas, enZip: false };
  }
}
