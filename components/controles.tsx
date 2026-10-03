"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { menosMovimiento } from "@/lib/movimiento";
import { Contador } from "./contador";
import { IconoCheckCirculo } from "./iconos";

/**
 * Tamaño único de toda pastilla (Segmentos y Chip): sale de los tokens --pastilla-* (app/globals.css). La pastilla mide
 * 36 px, pero su área de toque es de 44 px: el pseudo-elemento invisible suma 5,5 px arriba y abajo (en filas que se
 * desplazan, el contenedor deja ese espacio con padding (5,5 px) para que no se recorte).
 */
const PASTILLA =
  "tocable relative inline-flex h-(--pastilla-alto) shrink-0 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-(--pastilla-px) text-center text-[length:var(--pastilla-letra)] font-bold tracking-tight whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[5.5px] before:content-['']";

/**
 * Tono de una pastilla:
 * - "filtro" (por defecto): filtros y pestañas (Pedidos, Clientes, Catálogo, Promos…): la elegida va en Verde Bosque lleno.
 * - "opcion": una OPCIÓN dentro de un formulario (¿Cómo te paga?, método, fecha, monto rápido). La elegida va en Rosa Suave con
 *   borde Verde Bosque de 1,5 px y un check en círculo a la izquierda (no depende solo del color); la libre, blanca con borde.
 *   Así no se confunde con una acción (que es Verde Bosque lleno o de contorno). Es una opción de un grupo: role="radio" dentro de
 *   un <GrupoOpciones>. Mismo alto y padding que el resto (tokens --pastilla-*).
 */
export type TonoPastilla = "filtro" | "opcion";

/** Chip seleccionable (colecciones, opciones sueltas): verde lleno si está elegido, blanco con borde si no. Con tono="opcion", ver arriba. */
export function Chip({ elegido, onClick, children, tono = "filtro" }: { elegido: boolean; onClick: () => void; children: ReactNode; tono?: TonoPastilla }) {
  if (tono === "opcion") {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={elegido}
        onClick={onClick}
        className={`${PASTILLA} ${elegido ? "border-bosque bg-rosa pl-2.5 text-bosque" : "border-borde bg-white text-bosque"}`}
      >
        {elegido && <IconoCheckCirculo tamano={18} className="mov-pop-aparece shrink-0 text-bosque" />}
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={elegido}
      className={`${PASTILLA} ${
        elegido ? "border-bosque bg-bosque text-papel" : "border-borde bg-white text-bosque"
      }`}
    >
      {children}
    </button>
  );
}

/** Grupo de opciones de un formulario (radiogrupo): las pastillas con tono="opcion" van dentro. Se acomodan en varias filas si no caben. */
export function GrupoOpciones({ etiqueta, children, className = "" }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={`flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}

/** Interruptor (switch) de 54×32 como el del prototipo; la perilla se desliza (transform). */
export function Interruptor({
  encendido,
  alCambiar,
  etiqueta,
  deshabilitado = false,
  alTocarBloqueado,
}: {
  encendido: boolean;
  alCambiar: (valor: boolean) => void;
  etiqueta: string;
  deshabilitado?: boolean;
  /** Qué pasa si lo tocan bloqueado (ej. avisar por qué). */
  alTocarBloqueado?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      aria-disabled={deshabilitado}
      onClick={() => (deshabilitado ? alTocarBloqueado?.() : alCambiar(!encendido))}
      className={`tocable relative flex h-8 w-[54px] outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco shrink-0 rounded-full p-1 before:absolute before:-inset-x-1 before:-inset-y-[6px] before:content-[''] ${encendido ? "bg-accion" : "bg-borde-campo"} ${deshabilitado ? "opacity-40" : ""}`}
    >
      <span
        className="h-6 w-6 rounded-full bg-superficie ring-1 ring-linea transition-transform duration-(--mov-normal) ease-(--curva-salida)"
        style={{ transform: encendido ? "translateX(22px)" : "none" }}
      />
    </button>
  );
}

/**
 * Grupo de opciones excluyentes (filtros, pestañas internas como Nuevos / Por despachar /
 * Despachados) con un indicador en cápsula que se DESLIZA de una a otra y cambia de ancho.
 * El indicador son tres piezas movidas con transform (puntas + centro con scaleX), así no se
 * anima el ancho y las puntas no se deforman.
 *
 * Ancho: si todas caben, se reparten el ancho útil (mismo margen lateral que el resto de la pantalla). Si no caben, las
 * pastillas conservan su tamaño y la fila se DESPLAZA en horizontal, sin barra visible: el contenedor sangra hasta los bordes
 * de la pantalla (-mx-5) y el margen va como padding de la fila interior (al inicio y al final; en el contenedor que se
 * desplaza algunos navegadores ignoran el final), así las pastillas se deslizan por debajo del borde en vez de cortarse en
 * el margen. La elegida se acerca a la vista con scrollIntoView (suave, salvo movimiento reducido). Alto táctil: 44 px.
 * Lo usan Inicio (periodo), Pedidos, Catálogo, Promos y el selector de productos de "+ Pedido".
 */
export function Segmentos<T extends string>(props: SegmentosProps<T>) {
  // Dentro de un formulario: opciones (rosa + check), no la barra de filtros con indicador deslizante
  return props.tono === "opcion" ? <OpcionesDeFormulario {...props} /> : <SegmentosConIndicador {...props} />;
}

type SegmentosProps<T extends string> = {
  /**
   * `cantidad`: número de la opción, en un Contador a la derecha del nombre (en 0 no se muestra).
   * `atencion`: el contador va en Mandarina (pide acción del dueño); si no, neutro. Solo cuenta con cantidad > 0.
   */
  opciones: { id: T; texto: ReactNode; cantidad?: number; atencion?: boolean; divisorAntes?: boolean }[];
  valor: T;
  alCambiar: (id: T) => void;
  etiqueta: string;
  /** "opcion": las opciones de un formulario (rosa + check, varias filas si no caben). Por defecto, la barra de filtros. */
  tono?: TonoPastilla;
};

/** Las opciones de un formulario con dos o más pastillas (ej. "Pagó todo" / "A crédito"): un radiogrupo de pastillas con tono="opcion". */
function OpcionesDeFormulario<T extends string>({ opciones, valor, alCambiar, etiqueta }: SegmentosProps<T>) {
  return (
    <GrupoOpciones etiqueta={etiqueta}>
      {opciones.map((o) => (
        <Chip key={o.id} tono="opcion" elegido={o.id === valor} onClick={() => alCambiar(o.id)}>
          {o.texto}
        </Chip>
      ))}
    </GrupoOpciones>
  );
}

function SegmentosConIndicador<T extends string>({ opciones, valor, alCambiar, etiqueta }: SegmentosProps<T>) {
  const botones = useRef<Map<T, HTMLButtonElement>>(new Map());
  const lista = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState<{ x: number; ancho: number } | null>(null);
  // Posición de TODAS las opciones: cada una lleva su relleno blanco en una capa propia debajo del indicador
  // (así el indicador sigue deslizándose por encima) y ninguna pastilla depende de lo que haya detrás.
  const [cajas, setCajas] = useState<{ id: T; x: number; ancho: number }[]>([]);
  const [animar, setAnimar] = useState(false);
  // Radio de los extremos del indicador = la mitad del alto REAL de la pastilla (sale del token --pastilla-alto).
  const [r, setR] = useState(18);

  useLayoutEffect(() => {
    const medir = () => {
      const b = botones.current.get(valor);
      if (b) setR(b.offsetHeight / 2);
      if (b) setCaja({ x: b.offsetLeft, ancho: b.offsetWidth });
      setCajas([...botones.current].map(([id, el]) => ({ id, x: el.offsetLeft, ancho: el.offsetWidth })));
    };
    medir();
    const ro = new ResizeObserver(medir);
    botones.current.forEach((b) => ro.observe(b));
    if (lista.current?.parentElement) ro.observe(lista.current.parentElement);
    return () => ro.disconnect();
  }, [valor, opciones.length]);

  // La elegida se ve completa: al cambiar de opción (o al abrir la pantalla con una ya elegida) se acerca a la vista.
  // `scroll-mx-5` en cada pastilla deja el margen lateral al llegar al borde.
  useEffect(() => {
    botones.current.get(valor)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: menosMovimiento() ? "auto" : "smooth" });
  }, [valor]);

  const transicion = animar ? "transform var(--mov-normal) var(--curva-salida)" : "none";

  return (
    <div className="-mx-5 -my-[5.5px] overflow-x-auto py-[5.5px] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div ref={lista} role="tablist" aria-label={etiqueta} className="relative isolate flex w-max min-w-full flex-nowrap gap-1.5 px-5">
      {/* Relleno blanco sólido de cada pastilla (sin transparencia, con su borde) */}
      {cajas.map((c) => (
        <span
          key={c.id}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full border-[1.5px] border-borde bg-white"
          style={{ left: c.x, width: c.ancho }}
        />
      ))}
      {caja && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-0">
          <span className="absolute inset-y-0 left-0 rounded-l-full bg-bosque" style={{ width: r, transform: `translateX(${caja.x}px)`, transition: transicion }} />
          <span
            className="absolute inset-y-0 left-0 w-px origin-left bg-bosque"
            style={{ transform: `translateX(${caja.x + r - 0.5}px) scaleX(${Math.max(0, caja.ancho - 2 * r + 1)})`, transition: transicion }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-r-full bg-bosque"
            style={{ width: r, transform: `translateX(${caja.x + caja.ancho - r}px)`, transition: transicion }}
          />
        </span>
      )}
      {opciones.map(({ id, texto, cantidad, atencion, divisorAntes }) => {
        const elegido = id === valor;
        return (
          <button
            key={id}
            ref={(el) => void (el ? botones.current.set(id, el) : botones.current.delete(id))}
            type="button"
            role="tab"
            aria-selected={elegido}
            aria-label={typeof texto === "string" && cantidad !== undefined ? `${texto}, ${cantidad}` : undefined}
            onKeyDown={(e) => {
              const teclas = ["ArrowRight", "ArrowLeft", "Home", "End"];
              if (!teclas.includes(e.key)) return;
              e.preventDefault();
              const i = opciones.findIndex((o) => o.id === id);
              const siguiente = e.key === "Home" ? 0 : e.key === "End" ? opciones.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + opciones.length) % opciones.length;
              botones.current.get(opciones[siguiente].id)?.focus();
              alCambiar(opciones[siguiente].id);
            }}
            onClick={() => {
              setAnimar(true);
              alCambiar(id);
            }}
            className={`${PASTILLA} z-10 scroll-mx-5 ${divisorAntes ? "ml-2" : ""} ${
              elegido ? "border-transparent text-papel" : "border-transparent text-bosque"
            }`}
          >
            {divisorAntes && <span aria-hidden="true" className="pointer-events-none absolute top-1/2 -left-[7px] h-6 w-[1.5px] -translate-y-1/2 rounded-full bg-apagado" />}
            {texto}
            {cantidad !== undefined && <Contador valor={cantidad} tamano="pastilla" tono={atencion ? "atencion" : "neutro"} sobreActivo={elegido} />}
          </button>
        );
      })}
    </div>
    </div>
  );
}
