// Reglas de Supabase Storage para fotos y logos, sin dependencias para poder probarlas (tests/almacen.test.mjs).
// El bucket "productos" es público para leer; cada tienda solo escribe y borra en su carpeta "<tienda_id>/".

export const BUCKET = "productos";
/** Lado mayor de lo que se sube (la app reduce antes; nunca se agranda). */
export const LADO_MAXIMO_SUBIDA = 1600;
export const CALIDAD_SUBIDA = 0.82;
/** Límite del bucket. */
export const MAX_BYTES = 5 * 1024 * 1024;
export const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

const EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Videos: el bucket acepta estos tipos hasta 15 MB (migración 20261004132336). */
export const TIPOS_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_BYTES_VIDEO = 15 * 1024 * 1024;

/** ¿Es un archivo del navegador (blob:)? Así llega un video recién preparado. */
export const esBlobUrl = (s: string) => s.startsWith("blob:");

/** Ruta de un video de producto: "<tienda_id>/<id>.mp4" (o .webm / .mov). */
export function rutaVideo(tiendaId: string, id: string, tipo = "video/mp4"): string {
  return `${tiendaId}/${id}.${EXTENSION[tipo] ?? "mp4"}`;
}

/** ¿Ya es una dirección (http/https)? Esas no se vuelven a subir. */
export const esUrlHttp = (s: string) => /^https?:\/\//i.test(s);

/** ¿Es una imagen recién elegida, en el navegador (data URL)? Solo esas se suben. */
export const esDataUrl = (s: string) => s.startsWith("data:");

/** Tipo MIME de una data URL ("image/png"), o null si no lo es. */
export function tipoDeDataUrl(s: string): string | null {
  const m = /^data:([^;,]+)[;,]/i.exec(s);
  return m ? m[1]!.toLowerCase() : null;
}

/** Ruta de una foto de producto: "<tienda_id>/<id>.webp" (o .jpg si el navegador no sabe crear webp). */
export function rutaFoto(tiendaId: string, id: string, tipo = "image/webp"): string {
  return `${tiendaId}/${id}.${EXTENSION[tipo] ?? "webp"}`;
}

/** Ruta del logo: "<tienda_id>/logo/<id>.webp". */
export function rutaLogo(tiendaId: string, id: string, tipo = "image/webp"): string {
  return `${tiendaId}/logo/${id}.${EXTENSION[tipo] ?? "webp"}`;
}

/** Bucket PRIVADO de las fotos de referencia de «Mi marca» (uso interno: se ven con URL firmada, nunca en el catálogo). */
export const BUCKET_MARCA = "marca-referencias";
/** Cuánto dura una URL firmada de una referencia (4 horas). */
export const FIRMA_SEGUNDOS = 4 * 3600;
/** Ruta de una referencia: "<tienda_id>/<id>.webp". La base exige que empiece por la carpeta de la propia tienda. */
export function rutaReferencia(tiendaId: string, id: string, tipo = "image/webp"): string {
  return `${tiendaId}/${id}.${EXTENSION[tipo] ?? "webp"}`;
}

const MARCA_PUBLICA = `/storage/v1/object/public/${BUCKET}/`;

/** La ruta dentro del bucket de una URL pública de nuestro Storage; null si es de otro lado. */
export function rutaDesdeUrlPublica(url: string): string | null {
  const i = url.indexOf(MARCA_PUBLICA);
  if (i < 0) return null;
  const resto = url.slice(i + MARCA_PUBLICA.length).split(/[?#]/)[0]!;
  try {
    return decodeURIComponent(resto) || null;
  } catch {
    return null;
  }
}

/**
 * Archivos del bucket que dejaron de usarse: los de `antes` que ya no están en `despues`. Solo rutas de la
 * carpeta de la tienda (nunca se intenta borrar algo ajeno ni una foto del seed).
 */
export function rutasParaBorrar(tiendaId: string, antes: (string | null | undefined)[], despues: (string | null | undefined)[]): string[] {
  const siguen = new Set(despues.filter((u): u is string => !!u));
  const rutas = new Set<string>();
  for (const url of antes) {
    if (!url || siguen.has(url)) continue;
    const ruta = rutaDesdeUrlPublica(url);
    if (ruta && ruta.startsWith(`${tiendaId}/`)) rutas.add(ruta);
  }
  return [...rutas];
}

export type ProblemaArchivo = "formato" | "grande" | null;

/** ¿Se puede subir este archivo (tipo y tamaño en bytes)? */
export function problemaDeArchivo(tipo: string | null, bytes: number): ProblemaArchivo {
  if (!tipo || !TIPOS_PERMITIDOS.includes(tipo)) return "formato";
  if (bytes > MAX_BYTES) return "grande";
  return null;
}
