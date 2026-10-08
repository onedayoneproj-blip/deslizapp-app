/**
 * Zoom del visor de la ficha técnica. Coordenadas relativas al CENTRO del área visible; la imagen ocupa el área completa (contain)
 * con `transform: translate(x, y) scale(k)` desde el centro. Funciones puras: el visor solo las llama desde los eventos.
 */
export type VistaZoom = { x: number; y: number; k: number };
export type Punto = { x: number; y: number };

export const K_MIN = 1;
export const K_MAX = 4;
/** Cuánto acerca el toque (o doble toque) cuando no se pellizca. */
export const K_TOQUE = 2.5;
export const AJUSTADA: VistaZoom = { x: 0, y: 0, k: 1 };

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Deja la vista dentro de lo permitido: zoom entre 1 y 4, y sin mover la imagen más allá de sus bordes. */
export function limitar(v: VistaZoom, ancho: number, alto: number): VistaZoom {
  const k = entre(v.k, K_MIN, K_MAX);
  if (k === K_MIN) return AJUSTADA;
  const mx = ((k - 1) * ancho) / 2;
  const my = ((k - 1) * alto) / 2;
  return { k, x: entre(v.x, -mx, mx), y: entre(v.y, -my, my) };
}

/** Mover con un dedo (solo acercada; ajustada no se mueve). */
export function mover(v: VistaZoom, dx: number, dy: number, ancho: number, alto: number): VistaZoom {
  return limitar({ ...v, x: v.x + dx, y: v.y + dy }, ancho, alto);
}

/** Pellizcar: el punto de la imagen que estaba bajo el centro de los dedos se queda bajo el centro nuevo. */
export function pellizcar(inicio: VistaZoom, c0: Punto, d0: number, c1: Punto, d1: number, ancho: number, alto: number): VistaZoom {
  if (d0 <= 0) return inicio;
  const k = entre(inicio.k * (d1 / d0), K_MIN, K_MAX);
  const qx = (c0.x - inicio.x) / inicio.k;
  const qy = (c0.y - inicio.y) / inicio.k;
  return limitar({ k, x: c1.x - k * qx, y: c1.y - k * qy }, ancho, alto);
}

/** Un toque alterna: acercada vuelve a ajustar; ajustada acerca hacia el punto tocado. */
export function alternar(v: VistaZoom, punto: Punto, ancho: number, alto: number): VistaZoom {
  if (v.k > K_MIN + 0.01) return AJUSTADA;
  return limitar({ k: K_TOQUE, x: punto.x * (1 - K_TOQUE), y: punto.y * (1 - K_TOQUE) }, ancho, alto);
}

/** `transform` de la imagen. */
export const transformDe = (v: VistaZoom) => `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.k})`;
