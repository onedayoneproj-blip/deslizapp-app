"use client";

import { useState } from "react";
import { IconoChevronAbajo } from "./iconos";

import { PASO_LISTA, textoVerMas } from "@/lib/ver-mas";

export { PASO_LISTA };

/**
 * Listas largas por tramos: muestra los primeros `paso` y, con "Ver más", `paso` más cada vez. Vuelve a empezar
 * cuando cambia `clave` (pestaña, búsqueda, tienda…). Solo recorta lo que se pinta: los contadores y totales
 * siguen saliendo de la lista completa.
 */
export function useVerMas<T>(lista: T[], clave: string, paso = PASO_LISTA) {
  const [estado, setEstado] = useState({ clave, cuantos: paso });
  // Al cambiar de pestaña, búsqueda o tienda, vuelve a empezar (ajuste de estado durante el render, sin efecto)
  if (estado.clave !== clave) setEstado({ clave, cuantos: paso });
  const cuantos = estado.clave === clave ? estado.cuantos : paso;
  return {
    visibles: lista.length > cuantos ? lista.slice(0, cuantos) : lista,
    quedan: Math.max(0, lista.length - cuantos),
    mostrados: Math.min(lista.length, cuantos),
    verMas: () => setEstado({ clave, cuantos: cuantos + paso }),
  };
}

/**
 * "Ver N más" (docs/09 §7): lo que falta de una lista se pide desde SU ÚLTIMA FILA, no con un botón suelto debajo. Es un `<li>`:
 * `forma="fila"` en una lista agrupada (misma línea separadora que las demás filas) o `forma="tarjeta"` en tarjetas sueltas (una
 * tarjeta más, del mismo ancho). 52 px de alto, "Ver N más" en `accion` con un chevron hacia abajo, y "5 de 69" a la derecha. Toda la
 * fila es el botón. Al tocarla aparecen los siguientes y el foco pasa al primer elemento nuevo. Sin nada que mostrar, no se pinta.
 */
export function BotonVerMas({
  quedan,
  mostrados,
  total,
  pagina = PASO_LISTA,
  alTocar,
  forma = "tarjeta",
  disabled = false,
  sufijo,
}: {
  quedan: number;
  mostrados: number;
  total: number;
  /** Cuántos trae cada toque (el mismo que se le dio a `useVerMas`). */
  pagina?: number;
  alTocar: (boton: HTMLButtonElement) => void;
  forma?: "fila" | "tarjeta";
  disabled?: boolean;
  /** Lo que sigue a "Ver N más" ("que se están acabando"). */
  sufijo?: string;
}) {
  if (quedan <= 0) return null;
  const tocar = (boton: HTMLButtonElement) => {
    const item = boton.closest("li");
    const lista = item?.parentElement;
    const antes = lista ? lista.children.length : 0;
    alTocar(boton);
    // El foco pasa al primer elemento nuevo (los nuevos se pintan justo antes de esta fila)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const primero = lista?.children[antes - 1];
        primero?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: false });
      }),
    );
  };
  return (
    <li className={forma === "fila" ? "border-t border-linea" : "overflow-hidden rounded-radio-l border border-linea bg-superficie"}>
      <button
        type="button"
        data-ver-mas
        onClick={(e) => tocar(e.currentTarget)}
        disabled={disabled}
        className="tocable flex h-13 w-full items-center justify-between gap-3 px-4 text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco disabled:opacity-40"
      >
        <span className="flex items-center gap-1 text-destacado text-accion">
          {textoVerMas(quedan, pagina)}{sufijo ? ` ${sufijo}` : ""}
          <IconoChevronAbajo tamano={20} strokeWidth={2.2} />
        </span>
        <span className="text-secundario text-texto-secundario">
          {mostrados} de {total}
        </span>
      </button>
    </li>
  );
}
