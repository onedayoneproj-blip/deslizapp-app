"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { menosMovimiento } from "@/lib/movimiento";
import { clases, FOCO, TOQUE_44 } from "./comunes";
import { Contador } from "./etiqueta";

/**
 * Pastilla de filtro (docs/09 §6): cambia lo que se ve en una lista, no guarda datos. Alto 36 (toque 44), letra 14 extrabold.
 * Elegida: relleno `accion`, texto `sobre-accion`. Sin elegir: `superficie` con contorno `borde-pastilla`.
 */
export function Pastilla({
  elegida,
  onClick,
  cantidad,
  atencion = false,
  children,
}: {
  elegida: boolean;
  onClick: () => void;
  cantidad?: number;
  /** El contador pide acción (resalte): Agotados, Deben, Nuevos. */
  atencion?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={elegida}
      onClick={onClick}
      className={clases(
        "tocable relative inline-flex h-(--alto-compacto) shrink-0 scroll-mx-5 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-secundario font-extrabold whitespace-nowrap",
        TOQUE_44,
        FOCO,
        elegida ? "border-accion bg-accion text-sobre-accion" : "border-borde-pastilla bg-superficie text-texto",
      )}
    >
      {children}
      {cantidad !== undefined && <Contador valor={cantidad} atencion={atencion} sobreAccion={elegida} />}
    </button>
  );
}

export type OpcionFiltro<T extends string> = {
  id: T;
  texto: ReactNode;
  cantidad?: number;
  /** Filtro condicional: solo aparece cuando tiene algo (cantidad > 0) o está elegido. */
  condicional?: boolean;
  atencion?: boolean;
};

/**
 * Fila de pastillas de filtro. Hace scroll horizontal (sin barra) y deja ver la siguiente cortada: sangra hasta el borde de la
 * pantalla (-mx-5) y el margen va por dentro. El divisor vertical aparece SOLO entre los filtros fijos y los condicionales
 * visibles; los condicionales se ocultan con contador 0, salvo que estén elegidos.
 */
export function FilaPastillas<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
}: {
  opciones: OpcionFiltro<T>[];
  valor: T;
  alCambiar: (id: T) => void;
  /** Qué se filtra (para lectores de pantalla). */
  etiqueta: string;
}) {
  const fila = useRef<HTMLDivElement>(null);
  const fijos = opciones.filter((o) => !o.condicional);
  const condicionales = opciones.filter((o) => o.condicional && ((o.cantidad ?? 0) > 0 || o.id === valor));

  // La elegida se acerca a la vista
  useEffect(() => {
    fila.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: menosMovimiento() ? "auto" : "smooth" });
  }, [valor]);

  const pastilla = (o: OpcionFiltro<T>) => (
    <Pastilla key={o.id} elegida={o.id === valor} onClick={() => alCambiar(o.id)} cantidad={o.cantidad} atencion={o.atencion}>
      {o.texto}
    </Pastilla>
  );

  return (
    <div className="-mx-5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div ref={fila} role="group" aria-label={etiqueta} className="flex w-max min-w-full items-center gap-2 px-5">
        {fijos.map(pastilla)}
        {condicionales.length > 0 && (
          <Fragment>
            <span aria-hidden="true" className="h-6 w-[1.5px] shrink-0 rounded-full bg-borde-campo" />
            {condicionales.map(pastilla)}
          </Fragment>
        )}
      </div>
    </div>
  );
}
