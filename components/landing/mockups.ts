/** Los mockups de iPhone de la demo (public/landing/mockup-*.webp): tamaño de la imagen y dónde está la pantalla (en %, unos px más grande: el marco la
 *  tapa). La landing (landing.tsx) y el teléfono que gira en el cambio de lado (cambio-lado.tsx) los comparten. */
export const MOCKUPS = {
  compradora: { src: "/landing/mockup-titanio.webp", ancho: 640, alto: 1325, x: 6.094, y: 2.113, w: 87.969, h: 95.774 },
  tienda: { src: "/landing/mockup-negro.webp", ancho: 640, alto: 1350, x: 5.313, y: 1.926, w: 89.688, h: 96.148 },
} as const;

/** El alto (px) de la página de 393 px de ancho que llena la pantalla del mockup: las páginas de los teléfonos de la demo son de 393 px de ancho. */
export const altoPagina = (id: keyof typeof MOCKUPS) => {
  const m = MOCKUPS[id];
  return Math.round((393 * m.h * m.alto) / (m.w * m.ancho));
};
