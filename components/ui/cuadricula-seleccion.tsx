import type { ReactNode } from "react";
import { CheckSeleccion } from "./check-seleccion";
import { clases, FOCO } from "./comunes";

/** Un elemento de la cuadrícula: su imagen (una MiniaturaProducto, por ejemplo), un título y un detalle corto. */
export type ElementoCuadricula = { id: string; imagen: ReactNode; titulo: string; detalle?: string };

/**
 * Cuadrícula seleccionable de 3 columnas (elegir hasta N productos): cada casilla es la imagen cuadrada (`radio-m`), el título (una
 * línea) y el detalle (`secundario`), con el CheckSeleccion arriba a la derecha. La elegida lleva contorno `accion`. Al llegar al
 * `maximo`, las demás se ven desactivadas (40 %) y no se pueden marcar. Cada casilla es un checkbox.
 */
export function CuadriculaSeleccion({
  elementos,
  elegidos,
  alCambiar,
  maximo,
  etiqueta,
  className,
}: {
  elementos: ElementoCuadricula[];
  elegidos: string[];
  alCambiar: (ids: string[]) => void;
  maximo?: number;
  etiqueta: string;
  className?: string;
}) {
  const lleno = maximo !== undefined && elegidos.length >= maximo;
  return (
    <ul aria-label={etiqueta} className={clases("grid grid-cols-3 gap-2", className)}>
      {elementos.map((e) => {
        const marcado = elegidos.includes(e.id);
        const apagado = lleno && !marcado;
        return (
          <li key={e.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={marcado}
              aria-disabled={apagado || undefined}
              aria-label={[e.titulo, e.detalle].filter(Boolean).join(", ")}
              onClick={() => {
                if (apagado) return;
                alCambiar(marcado ? elegidos.filter((id) => id !== e.id) : [...elegidos, e.id]);
              }}
              className={clases("tocable flex w-full flex-col gap-1 rounded-radio-m text-left text-texto", FOCO, apagado && "opacity-40")}
            >
              <span className={clases("relative block aspect-square w-full overflow-hidden rounded-radio-m border-[2.5px]", marcado ? "border-accion" : "border-transparent")}>
                {e.imagen}
                <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-fondo/90">
                  <CheckSeleccion marcado={marcado} />
                </span>
              </span>
              <span className="truncate text-secundario font-bold">{e.titulo}</span>
              {e.detalle && <span className="-mt-1 truncate text-etiqueta font-normal text-texto-secundario">{e.detalle}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
