/** Lógica pura del gesto vertical sobre el cuerpo de una hoja del catálogo del cliente. */
export const UMBRAL_EJE = 8;
export const UMBRAL_CERRAR = 90;

export type DecisionGesto = "esperar" | "ignorar" | "scroll" | "expandir" | "arrastrar";

/**
 * Qué hace un gesto que empezó en el cuerpo de la hoja.
 * - Casi quieto: se espera. Más horizontal que vertical: se ignora (carruseles, cuadrículas).
 * - Hacia arriba: a media altura expande la hoja; expandida, el contenido hace scroll.
 * - Hacia abajo: con el cuerpo arriba (o sin scroll) arrastra la hoja; con el cuerpo scrolleado, scroll normal.
 * `scrollTop` es el del contenedor que haría scroll bajo el dedo; a media altura el cuerpo no se desplaza, vale 0.
 */
export function decidirGesto(d: { dx: number; dy: number; full: boolean; scrollTop: number }): DecisionGesto {
  if (Math.abs(d.dx) < UMBRAL_EJE && Math.abs(d.dy) < UMBRAL_EJE) return "esperar";
  if (Math.abs(d.dx) > Math.abs(d.dy)) return "ignorar";
  if (d.dy < 0) return d.full ? "scroll" : "expandir";
  return !d.full || d.scrollTop <= 0 ? "arrastrar" : "scroll";
}

/** Al soltar un arrastre: más de 90 px cierra, o reduce si estaba expandida. */
export function resultadoSoltar(dy: number, full: boolean): "cerrar" | "reducir" | "volver" {
  if (dy <= UMBRAL_CERRAR) return "volver";
  return full ? "reducir" : "cerrar";
}

/** Solo los gestos que maneja la hoja cancelan el scroll nativo; "scroll" e "ignorar" lo dejan pasar intacto. */
export function debeCancelar(modo: DecisionGesto | "guiar"): boolean {
  return modo === "expandir" || modo === "arrastrar" || modo === "guiar";
}
