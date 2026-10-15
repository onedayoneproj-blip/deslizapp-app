// Las fotos del feed de la página principal (`/` sin sesión): la primera foto de cada producto activo del catálogo real de la
// tienda Deslizapp (docs/prompts/pagina-principal-y-conoce.md). Se leen en el servidor y se guardan una hora; si no se pueden leer
// o hay menos de 6, se completan con las fotos del feed de la landing.
export type FotoInicio = { src: string; nombre: string };

/** La tienda cuyo catálogo llena el feed. */
export const SLUG_TIENDA_INICIO = "deslizapp";
/** Por debajo de esto, se completa con las de la landing. */
export const MINIMO_FOTOS_INICIO = 6;

export const FOTOS_RESPALDO: FotoInicio[] = [
  { src: "/landing/feed-termo.webp", nombre: "Termo rosado" },
  { src: "/landing/feed-tote.webp", nombre: "Tote bag crema y verde" },
  { src: "/landing/feed-gorra.webp", nombre: "Gorra verde" },
];

/** Las fotos de la tienda, o las de respaldo hasta llegar al mínimo. Puro: tests/inicio.test.mjs. */
export function completarFotos(deLaTienda: FotoInicio[]): FotoInicio[] {
  const fotos = [...deLaTienda];
  for (let i = 0; fotos.length < MINIMO_FOTOS_INICIO; i++) fotos.push(FOTOS_RESPALDO[i % FOTOS_RESPALDO.length]!);
  return fotos;
}
