"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { IconoCheck } from "../iconos";
import { clases, FOCO } from "./comunes";

/** Check en círculo `accion` de la opción elegida. */
function CheckCirculo() {
  return (
    <span aria-hidden="true" className="mov-pop-aparece grid size-5 shrink-0 place-items-center rounded-full bg-accion text-sobre-accion">
      <IconoCheck tamano={13} strokeWidth={3} />
    </span>
  );
}

/**
 * Opción de formulario (docs/09 §6): un dato que se va a guardar. Alto 44, píldora. Elegida: relleno `accion-suave` con check
 * en círculo a la izquierda, SIN contorno verde y SIN rosa (no se confunde con el botón principal ni con un filtro).
 * Va dentro de un GrupoOpciones (role="radio" en un radiogroup).
 */
export function Opcion({
  elegida,
  onClick,
  children,
  tabIndex,
  onKeyDown,
  refBoton,
}: {
  elegida: boolean;
  onClick: () => void;
  children: ReactNode;
  tabIndex?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  refBoton?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={refBoton}
      type="button"
      role="radio"
      aria-checked={elegida}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={clases(
        "tocable inline-flex h-(--alto-control) shrink-0 items-center gap-2 rounded-full border-[1.5px] text-cuerpo font-extrabold whitespace-nowrap text-texto",
        FOCO,
        elegida ? "border-accion-suave bg-accion-suave pr-4 pl-2.5" : "border-borde-pastilla bg-superficie px-4",
      )}
    >
      {elegida && <CheckCirculo />}
      {children}
    </button>
  );
}

/** Teclado de un radiogrupo: flechas y Inicio/Fin mueven el foco y eligen. Devuelve lo que necesita cada botón. */
export function useRadiogrupo<T extends string>(ids: T[], valor: T | null, alCambiar: (id: T) => void) {
  const botones = useRef(new Map<T, HTMLButtonElement>());
  const activo = valor !== null && ids.includes(valor) ? valor : ids[0];
  const props = (id: T) => ({
    tabIndex: id === activo ? 0 : -1,
    refBoton: (el: HTMLButtonElement | null) => void (el ? botones.current.set(id, el) : botones.current.delete(id)),
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const i = ids.indexOf(id);
      const destino =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? ids[(i + 1) % ids.length]
          : e.key === "ArrowLeft" || e.key === "ArrowUp"
            ? ids[(i - 1 + ids.length) % ids.length]
            : e.key === "Home"
              ? ids[0]
              : e.key === "End"
                ? ids[ids.length - 1]
                : undefined;
      if (destino === undefined) return;
      e.preventDefault();
      alCambiar(destino);
      botones.current.get(destino)?.focus();
    },
  });
  return props;
}

/**
 * Grupo de opciones de formulario con su pregunta como subtítulo (`destacado`, negrita, `texto`: "¿Cómo te pagó?"). Se acomoda en varias filas si no caben.
 * Sin `titulo` visible, `etiqueta` la dice a los lectores de pantalla.
 */
export function GrupoOpciones<T extends string>({
  opciones,
  valor,
  alCambiar,
  titulo,
  etiqueta,
}: {
  opciones: { id: T; texto: ReactNode }[];
  valor: T | null;
  alCambiar: (id: T) => void;
  titulo?: string;
  etiqueta?: string;
}) {
  const id = useId();
  const props = useRadiogrupo(
    opciones.map((o) => o.id),
    valor,
    alCambiar,
  );
  return (
    <div className="flex flex-col gap-2">
      {titulo && (
        <p id={id} className="text-destacado text-texto">
          {titulo}
        </p>
      )}
      <div role="radiogroup" aria-labelledby={titulo ? id : undefined} aria-label={titulo ? undefined : etiqueta} className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <Opcion key={o.id} elegida={o.id === valor} onClick={() => alCambiar(o.id)} {...props(o.id)}>
            {o.texto}
          </Opcion>
        ))}
      </div>
    </div>
  );
}
