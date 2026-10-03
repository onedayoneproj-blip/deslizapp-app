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
  compacta = false,
}: {
  elegida: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Letra `secundario` y menos relleno: para que tres opciones cortas quepan en una fila ("Un saludo · Un código · Productos"). */
  compacta?: boolean;
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
        "tocable inline-flex h-(--alto-control) shrink-0 items-center rounded-full border-[1.5px] font-extrabold whitespace-nowrap text-texto",
        compacta ? "gap-1.5 text-secundario" : "gap-2 text-cuerpo",
        FOCO,
        elegida ? clases("border-accion-suave bg-accion-suave", compacta ? "pr-2.5 pl-1.5" : "pr-4 pl-2.5") : clases("border-borde-pastilla bg-superficie", compacta ? "px-2.5" : "px-4"),
      )}
    >
      {elegida && <CheckCirculo />}
      {children}
    </button>
  );
}

/**
 * Opción con su texto completo debajo (elegir un mensaje): tarjeta `radio-m` a todo lo ancho con el título en `destacado` y el texto
 * en `secundario` `texto-secundario`. Elegida: relleno `accion-suave` con el check en círculo a la izquierda (como `Opcion`).
 */
function OpcionDetallada({
  elegida,
  onClick,
  titulo,
  descripcion,
  tabIndex,
  onKeyDown,
  refBoton,
}: {
  elegida: boolean;
  onClick: () => void;
  titulo: ReactNode;
  descripcion: ReactNode;
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
        "tocable flex w-full items-start gap-2.5 rounded-radio-m border-[1.5px] px-4 py-3 text-left text-texto",
        FOCO,
        elegida ? "border-accion-suave bg-accion-suave" : "border-borde-pastilla bg-superficie",
      )}
    >
      {elegida && (
        <span className="mt-0.5">
          <CheckCirculo />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-destacado">{titulo}</span>
        <span className="text-secundario text-texto-secundario">{descripcion}</span>
      </span>
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
  compacta = false,
}: {
  /** Con `descripcion`, cada opción es una tarjeta con su texto completo debajo (una debajo de la otra). */
  opciones: { id: T; texto: ReactNode; descripcion?: ReactNode }[];
  valor: T | null;
  alCambiar: (id: T) => void;
  titulo?: string;
  etiqueta?: string;
  /** Opciones cortas en una sola fila (ver `Opcion`). */
  compacta?: boolean;
}) {
  const id = useId();
  const detalladas = opciones.some((o) => o.descripcion !== undefined);
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
      <div role="radiogroup" aria-labelledby={titulo ? id : undefined} aria-label={titulo ? undefined : etiqueta} className={detalladas ? "flex flex-col gap-2" : clases("flex flex-wrap", compacta ? "gap-1.5" : "gap-2")}>
        {opciones.map((o) =>
          detalladas ? (
            <OpcionDetallada key={o.id} elegida={o.id === valor} onClick={() => alCambiar(o.id)} titulo={o.texto} descripcion={o.descripcion} {...props(o.id)} />
          ) : (
            <Opcion key={o.id} elegida={o.id === valor} compacta={compacta} onClick={() => alCambiar(o.id)} {...props(o.id)}>
              {o.texto}
            </Opcion>
          ),
        )}
      </div>
    </div>
  );
}
