// Fuentes de "Mi marca" (Google Fonts). Se cargan SOLO cuando se van a usar (el cupón de la tienda, la
// imagen para compartir, la hoja "Mi marca"), nunca todas siempre. Solo navegador.

import { ESTILOS, type EstiloMarca } from "./marca";

const cargadas = new Map<EstiloMarca, Promise<void>>();

/** "Playfair Display", Georgia, serif — con un respaldo parecido mientras carga. */
export function familiaTitulo(estilo: EstiloMarca): string {
  const e = ESTILOS[estilo];
  const serif = estilo === "elegante" || estilo === "clasica";
  return `"${e.titulo}", ${serif ? "Georgia, serif" : "system-ui, sans-serif"}`;
}

export function familiaTexto(estilo: EstiloMarca): string {
  return `"${ESTILOS[estilo].texto}", system-ui, sans-serif`;
}

function urlGoogleFonts(estilo: EstiloMarca): string {
  const e = ESTILOS[estilo];
  const familia = (nombre: string, pesos: number[]) => `family=${nombre.replace(/ /g, "+")}:wght@${pesos.join(";")}`;
  return `https://fonts.googleapis.com/css2?${familia(e.titulo, e.pesosTitulo)}&${familia(e.texto, e.pesosTexto)}&display=swap`;
}

/**
 * Carga el par de fuentes de un estilo (una sola vez por estilo) y espera a que estén listas para dibujar
 * (canvas). Si no hay internet, resuelve igual: se usa el respaldo.
 */
export function cargarFuentesMarca(estilo: EstiloMarca): Promise<void> {
  const ya = cargadas.get(estilo);
  if (ya) return ya;
  const promesa = new Promise<void>((resolver) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = urlGoogleFonts(estilo);
    link.dataset.marca = estilo;
    link.onload = () => resolver();
    link.onerror = () => resolver();
    document.head.appendChild(link);
  }).then(async () => {
    const e = ESTILOS[estilo];
    await Promise.all([
      ...e.pesosTitulo.map((p) => document.fonts.load(`${p} 40px "${e.titulo}"`, "Aa0%")),
      ...e.pesosTexto.map((p) => document.fonts.load(`${p} 16px "${e.texto}"`, "Aa0%")),
    ]).catch(() => undefined);
  });
  cargadas.set(estilo, promesa);
  return promesa;
}
