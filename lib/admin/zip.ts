// ZIP sin compresión (método "store") para bajar las fotos de una tienda de una vez. Las fotos ya vienen comprimidas
// (JPEG/WebP): comprimir otra vez no ahorra casi nada. Sin dependencias: se prueba con node y `unzip -t`.

const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA[(c ^ datos[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 1 de enero de 1980 (la fecha más vieja que admite ZIP): no hace falta la fecha real de cada foto. */
const FECHA_DOS = (1 << 5) | 1;

/** Hasta cuánto se arma un ZIP en memoria (si se pasa, se bajan una por una). */
export const MAX_BYTES_ZIP = 120 * 1024 * 1024;

/** Nombre de archivo seguro (sin rutas ni caracteres raros), con su extensión. */
export function nombreArchivo(base: string, extension: string): string {
  const limpio = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${limpio || "foto"}.${extension}`;
}

/** Arma un ZIP con los archivos dados (nombres únicos: si se repite uno, se le agrega un número). */
export function armarZip(archivos: { nombre: string; datos: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const usados = new Set<string>();
  const unico = (n: string) => {
    if (!usados.has(n)) return usados.add(n), n;
    const punto = n.lastIndexOf(".");
    for (let i = 2; ; i++) {
      const otro = punto > 0 ? `${n.slice(0, punto)}-${i}${n.slice(punto)}` : `${n}-${i}`;
      if (!usados.has(otro)) return usados.add(otro), otro;
    }
  };
  const codificar = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;
  for (const a of archivos) {
    const nombre = codificar.encode(unico(a.nombre));
    const crc = crc32(a.datos);
    const local = new Uint8Array(30 + nombre.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); // nombres en UTF-8
    v.setUint16(8, 0, true); // store
    v.setUint16(12, FECHA_DOS, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, a.datos.length, true);
    v.setUint32(22, a.datos.length, true);
    v.setUint16(26, nombre.length, true);
    local.set(nombre, 30);
    const central = new Uint8Array(46 + nombre.length);
    const w = new DataView(central.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(14, FECHA_DOS, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, a.datos.length, true);
    w.setUint32(24, a.datos.length, true);
    w.setUint16(28, nombre.length, true);
    w.setUint32(42, desplazamiento, true);
    central.set(nombre, 46);
    locales.push(local, a.datos);
    centrales.push(central);
    desplazamiento += local.length + a.datos.length;
  }
  const tamanoCentral = centrales.reduce((n, c) => n + c.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, archivos.length, true);
  f.setUint16(10, archivos.length, true);
  f.setUint32(12, tamanoCentral, true);
  f.setUint32(16, desplazamiento, true);
  const total = new Uint8Array(desplazamiento + tamanoCentral + fin.length);
  let i = 0;
  for (const parte of [...locales, ...centrales, fin]) {
    total.set(parte, i);
    i += parte.length;
  }
  return total;
}
