/** Cambiar de autorización exige descartar el árbol React y sus cachés mediante una carga completa. */
export function navegarVerComo(destino: string) {
  const url = new URL(destino, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("Destino de Ver como no válido.");
  // URL absoluta del mismo origen: descarta el árbol en entrada/salida/recuperación sin conservar la fuente anterior.
  window.location.assign(url.href);
}
