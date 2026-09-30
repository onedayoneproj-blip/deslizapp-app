"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Contador } from "./contador";

/** Chip seleccionable (colecciones, opciones sueltas): verde lleno si está elegido, blanco con borde si no. */
export function Chip({
  elegido,
  onClick,
  children,
  alto = 38,
}: {
  elegido: boolean;
  onClick: () => void;
  children: ReactNode;
  alto?: 38 | 40 | 44;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={elegido}
      style={{ height: alto }}
      className={`tocable shrink-0 rounded-full border-[1.5px] px-3.5 text-sm font-bold whitespace-nowrap ${
        elegido ? "border-bosque bg-bosque text-papel" : "border-borde bg-white text-bosque"
      }`}
    >
      {children}
    </button>
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
      className={`tocable relative flex h-8 w-[54px] shrink-0 rounded-full p-1 before:absolute before:-inset-x-1 before:-inset-y-[6px] before:content-[''] ${deshabilitado ? "bg-[#d9cdb8]" : encendido ? "bg-bosque" : "bg-apagado"}`}
    >
      <span
        className="h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-(--mov-normal) ease-(--curva-salida)"
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
 * Ancho: las opciones se reparten el ancho útil (mismo margen lateral que el resto de la pantalla,
 * sin desplazamiento). Si no caben, se compactan por pasos (COMPACTO: primero el padding y los
 * espacios, después la letra y el contador) y solo si aun así no caben, la fila se desplaza en horizontal SIN
 * barra visible y conservando el margen al inicio y al final (el padding va en la fila interior,
 * no en el contenedor que se desplaza: ahí algunos navegadores ignoran el final). Alto táctil: 44 px.
 */
/** Pasos de compactación de Segmentos, del más holgado al más apretado (el 0 es el normal). */
const COMPACTO: Record<string, string>[] = [
  {},
  { "--seg-px": "5px", "--seg-gap": "4px", "--seg-gi": "5px" },
  { "--seg-px": "4px", "--seg-gap": "4px", "--seg-gi": "4px", "--seg-letra": "12.5px", "--contador": "20px" },
  { "--seg-px": "3px", "--seg-gap": "4px", "--seg-gi": "4px", "--seg-letra": "12px", "--contador": "18px", "--contador-letra": "10.5px" },
  { "--seg-px": "3px", "--seg-gap": "3px", "--seg-gi": "3px", "--seg-letra": "12px", "--contador": "18px", "--contador-letra": "10.5px" },
];
const VARIABLES = Object.keys(COMPACTO.at(-1)!);

export function Segmentos<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  alto = 44,
}: {
  /**
   * `cantidad`: número de la opción, en un Contador a la derecha del nombre (en 0 no se muestra).
   * `atencion`: el contador va en Mandarina (pide acción del dueño); si no, neutro. Solo cuenta con cantidad > 0.
   */
  opciones: { id: T; texto: ReactNode; cantidad?: number; atencion?: boolean }[];
  valor: T;
  alCambiar: (id: T) => void;
  etiqueta: string;
  alto?: number;
}) {
  const botones = useRef<Map<T, HTMLButtonElement>>(new Map());
  const lista = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState<{ x: number; ancho: number } | null>(null);
  // Posición de TODAS las opciones: cada una lleva su relleno blanco en una capa propia debajo del indicador
  // (así el indicador sigue deslizándose por encima) y ninguna pastilla depende de lo que haya detrás.
  const [cajas, setCajas] = useState<{ id: T; x: number; ancho: number }[]>([]);
  const [animar, setAnimar] = useState(false);

  useLayoutEffect(() => {
    const medir = () => {
      // Compactación: se escribe directo en el DOM (variables CSS) y se mide en el mismo paso, sin
      // estado de React. Siempre desde el paso 0, así al haber más sitio vuelve a lo normal.
      const l = lista.current;
      const scroll = l?.parentElement;
      if (l && scroll) {
        for (const paso of COMPACTO) {
          VARIABLES.forEach((v) => l.style.removeProperty(v));
          Object.entries(paso).forEach(([v, x]) => l.style.setProperty(v, x));
          if (scroll.scrollWidth <= scroll.clientWidth) break;
        }
      }
      const b = botones.current.get(valor);
      // Si la fila se desplaza (no caben todas), la opción elegida queda a la vista (sin tocar el scroll de la página).
      if (b && scroll) {
        const izq = b.offsetLeft - 20;
        const der = b.offsetLeft + b.offsetWidth + 20 - scroll.clientWidth;
        if (scroll.scrollLeft > izq) scroll.scrollLeft = Math.max(0, izq);
        else if (scroll.scrollLeft < der) scroll.scrollLeft = der;
      }
      if (b) setCaja({ x: b.offsetLeft, ancho: b.offsetWidth });
      setCajas([...botones.current].map(([id, el]) => ({ id, x: el.offsetLeft, ancho: el.offsetWidth })));
    };
    medir();
    const ro = new ResizeObserver(medir);
    botones.current.forEach((b) => ro.observe(b));
    if (lista.current?.parentElement) ro.observe(lista.current.parentElement);
    return () => ro.disconnect();
  }, [valor, opciones.length]);

  const r = alto / 2;
  const transicion = animar ? "transform var(--mov-normal) var(--curva-salida)" : "none";

  return (
    <div className="-mx-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div ref={lista} role="tablist" aria-label={etiqueta} className="relative isolate flex w-max min-w-full gap-(--seg-gap,6px) px-5">
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
      {opciones.map(({ id, texto, cantidad, atencion }) => {
        const elegido = id === valor;
        return (
          <button
            key={id}
            ref={(el) => void (el ? botones.current.set(id, el) : botones.current.delete(id))}
            type="button"
            role="tab"
            aria-selected={elegido}
            onClick={() => {
              setAnimar(true);
              alCambiar(id);
            }}
            style={{ height: alto }}
            className={`tocable relative z-10 inline-flex min-w-0 shrink-0 grow items-center justify-center gap-(--seg-gi,6px) rounded-full border-[1.5px] px-(--seg-px,8px) text-center text-[length:var(--seg-letra,13px)] min-[390px]:text-[length:var(--seg-letra,13.5px)] font-bold tracking-tight whitespace-nowrap ${
              elegido ? "border-transparent text-papel" : "border-transparent text-bosque"
            }`}
          >
            {texto}
            {cantidad !== undefined && <Contador valor={cantidad} tamano="pastilla" tono={atencion ? "atencion" : "neutro"} sobreActivo={elegido} />}
          </button>
        );
      })}
    </div>
    </div>
  );
}
