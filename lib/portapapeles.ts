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

/** Descarga o guarda el archivo (en iPhone abre la hoja de guardar). */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Descarga para el dueño que tocó "PDF" o "Imagen". Normal: `guardarArchivo`. En la app instalada en iPhone/iPad (PWA), donde la
 * descarga directa de un blob no siempre funciona, usa la hoja de compartir con el archivo (mismo recurso que "Compartir").
 * Devuelve false si la persona cerró la hoja de compartir sin elegir nada.
 */
export async function descargarArchivo(blob: Blob, nombre: string): Promise<boolean> {
  const enIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalada = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (enIos && instalada && typeof navigator.share === "function") {
    const archivo = new File([blob], nombre, { type: blob.type });
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: nombre });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return false;
      }
    }
  }
  guardarArchivo(blob, nombre);
  return true;
}
