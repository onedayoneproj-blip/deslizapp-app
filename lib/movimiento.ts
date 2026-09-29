// Sistema de movimiento: la misma fuente de verdad que los tokens de app/globals.css
// (--mov-*, --curva-*, --desplazar-*). Reglas en docs/08-movimiento.md.
//
// Aquí solo va lo que se usa desde JS (hojas, barra, números, tipos de transición de pantalla).
// Si cambias un valor, cámbialo también en globals.css.

export const DURACION = {
  /** Toques, cambios de color, salidas. */
  rapida: 150,
  /** Casi todo: aparecer, deslizar indicadores, números. */
  normal: 250,
  /** Entradas de pantalla y hojas. */
  entrada: 350,
} as const;

export const CURVA = {
  /** Salida suave: arranca rápido y se posa (la de iOS). */
  salida: "cubic-bezier(.2,.8,.2,1)",
  /** Para lo que se va: acelera hacia afuera. */
  entrada: "cubic-bezier(.4,0,1,1)",
} as const;

/** Resorte para gestos (selector de la barra). Rígido y casi crítico: rebote apenas perceptible. */
export const RESORTE = {
  rigidez: 620,
  amortiguacion: 2 * Math.sqrt(620) * 0.8,
} as const;

/**
 * Tipos de transición (React `addTransitionType`, `transitionTypes` de Next). Una transición
 * SIN tipo no anima nada (así la primera carga de datos o abrir una hoja no esperan a ninguna
 * transición de vista).
 * - pestana: cambio de pestaña de la barra → fundido rápido con leve desplazamiento.
 * - adelante: entrar a un detalle → desliza desde la derecha (como iOS).
 * - atras: volver → desliza hacia la derecha.
 */
export const TRANSICION = {
  pestana: "nav-tab",
  adelante: "nav-forward",
  atras: "nav-back",
  /** Cambió un dato (crear, editar, desactivar…): los elementos de las listas entran, salen o se reacomodan. */
  datos: "data-change",
  /** Se filtró o buscó en una lista: igual que `datos`. */
  lista: "list-filter",
} as const;

/** true si hay un campo de texto con el foco (el teclado está abierto o abriéndose). */
export function hayCampoConFoco(): boolean {
  if (typeof document === "undefined") return false;
  const a = document.activeElement;
  return a instanceof HTMLElement && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable);
}

/**
 * Agrega un tipo de transición de vista (`addTransitionType`) SOLO si no hay un campo de texto con
 * el foco. Regla permanente (docs/08-movimiento.md): una transición de vista reemplaza la página
 * por una captura mientras dura y, en iOS, eso le quita el foco al campo y cierra el teclado.
 * Devuelve true si la transición quedó activada. Llamar dentro de `startTransition`.
 */
export function tipoDeTransicion(agregar: (tipo: string) => void, tipo: string): boolean {
  if (hayCampoConFoco()) return false;
  agregar(tipo);
  return true;
}

/** true si la persona pidió reducir el movimiento (solo en el navegador). */
export function menosMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
