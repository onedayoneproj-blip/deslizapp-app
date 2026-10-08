/** Lógica pura del menú flotante (components/ui/menu-flotante.tsx): foco con flechas y posición bajo el disparador. */

export type TeclaMenu = "ArrowDown" | "ArrowUp" | "Home" | "End";

/** A qué elemento pasa el foco con una tecla. `actual` -1 = ninguno. Da la vuelta en los extremos. */
export function indiceConTecla(actual: number, total: number, tecla: TeclaMenu): number {
  if (total <= 0) return -1;
  if (tecla === "Home") return 0;
  if (tecla === "End") return total - 1;
  if (tecla === "ArrowDown") return actual < 0 ? 0 : (actual + 1) % total;
  return actual < 0 ? total - 1 : (actual - 1 + total) % total;
}

/** Posición `fixed` de la tarjeta: debajo del disparador, alineada a su borde izquierdo y sin salirse de la pantalla. */
export function posicionMenu(
  disparador: { left: number; bottom: number },
  ventana: { ancho: number; alto: number },
  anchoMenu = 252,
  margen = 12,
): { left: number; top: number; width: number; maxHeight: number } {
  const width = Math.min(anchoMenu, ventana.ancho - margen * 2);
  const left = Math.max(margen, Math.min(disparador.left, ventana.ancho - width - margen));
  const top = disparador.bottom + 6;
  return { left, top, width, maxHeight: Math.max(120, ventana.alto - top - margen) };
}
