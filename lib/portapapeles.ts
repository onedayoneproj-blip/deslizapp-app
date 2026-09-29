// Copiar al portapapeles. Se llama DENTRO del toque (sin `await` antes): en iPhone, si no, el navegador lo rechaza.

/** Copia texto; si el navegador no deja, prueba con el método antiguo sobre un campo. Devuelve si lo logró. */
export function copiarTexto(texto: string, campoRespaldo?: HTMLTextAreaElement | null): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(texto).then(
      () => true,
      () => copiarAntiguo(texto, campoRespaldo),
    );
  }
  return Promise.resolve(copiarAntiguo(texto, campoRespaldo));
}

function copiarAntiguo(texto: string, campo?: HTMLTextAreaElement | null): boolean {
  const el = campo ?? Object.assign(document.createElement("textarea"), { value: texto });
  if (!campo) {
    el.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(el);
  }
  el.focus({ preventScroll: true });
  el.select();
  const ok = document.execCommand?.("copy") ?? false;
  if (!campo) el.remove();
  return ok;
}

/** ¿Se pueden copiar imágenes (ClipboardItem)? */
export const puedeCopiarImagen = () => typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";

/** Copia una imagen ya generada (el blob va directo dentro del toque). */
export function copiarImagen(blob: Blob): Promise<boolean> {
  return navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]).then(
    () => true,
    () => false,
  );
}

/** Descarga o guarda el archivo (en iPhone abre la hoja de guardar). */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
