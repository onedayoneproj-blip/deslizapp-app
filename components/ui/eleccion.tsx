"use client";

import type { ReactNode } from "react";
import { clases, FOCO, TOQUE_44 } from "./comunes";
import { useRadiogrupo } from "./opcion";

/**
 * Elección de una historia (crear producto, prototipo v4): una píldora que se elige con un toque y queda en `marca-rosa`, sin
 * check (las respuestas de «¿Cuándo llega?», y en presentaciones las tallas y los colores). Contorno de 2 px `borde-pastilla` y
 * relleno `superficie`; elegida, relleno y contorno `marca-rosa`. 44 px (`compacta`: 40, toque 44). Va dentro de `GrupoEleccion`.
 */
export function Eleccion({
  elegida,
  onClick,
  children,
  compacta = false,
  casilla = false,
  deshabilitada = false,
  accion = false,
  tabIndex,
  onKeyDown,
  refBoton,
}: {
  elegida: boolean;
  onClick: () => void;
  children: ReactNode;
  compacta?: boolean;
  /** Se puede elegir más de una (role="checkbox"). */
  casilla?: boolean;
  /** No se puede elegir (ya hay el máximo): 40 %, sin toque. */
  deshabilitada?: boolean;
  /** Con la misma forma, un botón que hace algo («+ Otra»): sin estado de elegido. */
  accion?: boolean;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  refBoton?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={refBoton}
      type="button"
      role={accion ? undefined : casilla ? "checkbox" : "radio"}
      aria-checked={accion ? undefined : elegida}
      tabIndex={tabIndex}
      disabled={deshabilitada}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={clases(
        "tocable relative inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 font-bold whitespace-nowrap text-texto disabled:opacity-40",
        compacta ? clases("h-10 px-3 text-secundario", TOQUE_44) : "h-(--alto-control) px-4 text-cuerpo",
        FOCO,
        elegida ? "border-marca-rosa bg-marca-rosa" : "border-borde-pastilla bg-superficie",
      )}
    >
      {children}
    </button>
  );
}

/** Un grupo de `Eleccion` de una sola respuesta (radiogroup, con flechas del teclado), en varias filas si no caben. */
export function GrupoEleccion<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  compacta = false,
}: {
  opciones: { id: T; texto: ReactNode }[];
  valor: T | null;
  alCambiar: (id: T) => void;
  /** Qué se pregunta (para lectores de pantalla: el título de la pantalla ya lo dice). */
  etiqueta: string;
  compacta?: boolean;
}) {
  const props = useRadiogrupo(opciones.map((o) => o.id), valor, alCambiar);
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <Eleccion key={o.id} elegida={o.id === valor} compacta={compacta} onClick={() => alCambiar(o.id)} {...props(o.id)}>
          {o.texto}
        </Eleccion>
      ))}
    </div>
  );
}
