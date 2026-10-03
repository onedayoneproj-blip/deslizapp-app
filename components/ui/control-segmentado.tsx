"use client";

import type { ReactNode } from "react";
import { clases, FOCO } from "./comunes";
import { useRadiogrupo } from "./opcion";

/**
 * Control segmentado (docs/09 §6): 2 o 3 opciones excluyentes que siempre se ven ("Pagó todo / A crédito"). Pista
 * `superficie-hundida`; el segmento elegido en `superficie` con letra extrabold, como en iOS. Más de 3 opciones: GrupoOpciones.
 * (No reemplaza todavía a Segmentos de components/controles.tsx, que es la barra de filtros actual.)
 */
export function ControlSegmentado<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
}: {
  opciones: { id: T; texto: ReactNode }[];
  valor: T;
  alCambiar: (id: T) => void;
  /** La pregunta, para lectores de pantalla. */
  etiqueta: string;
}) {
  const props = useRadiogrupo(
    opciones.map((o) => o.id),
    valor,
    alCambiar,
  );
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-1 rounded-full bg-superficie-hundida p-1">
      {opciones.map((o) => {
        const elegida = o.id === valor;
        const { refBoton, ...p } = props(o.id);
        return (
          <button
            key={o.id}
            ref={refBoton}
            type="button"
            role="radio"
            aria-checked={elegida}
            onClick={() => alCambiar(o.id)}
            {...p}
            className={clases(
              "tocable relative h-10 min-w-0 flex-1 truncate rounded-full px-3 text-cuerpo before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
              FOCO,
              elegida ? "bg-superficie font-extrabold text-texto ring-1 ring-linea" : "font-bold text-texto-secundario",
            )}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
