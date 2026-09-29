"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
  alto?: 38 | 40;
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
      className={`tocable flex h-8 w-[54px] shrink-0 rounded-full p-1 ${deshabilitado ? "bg-[#d9cdb8]" : encendido ? "bg-bosque" : "bg-apagado"}`}
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
 */
export function Segmentos<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  alto = 38,
}: {
  opciones: { id: T; texto: ReactNode }[];
  valor: T;
  alCambiar: (id: T) => void;
  etiqueta: string;
  alto?: number;
}) {
  const botones = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [caja, setCaja] = useState<{ x: number; ancho: number } | null>(null);
  const [animar, setAnimar] = useState(false);

  useLayoutEffect(() => {
    const medir = () => {
      const b = botones.current.get(valor);
      if (b) setCaja({ x: b.offsetLeft, ancho: b.offsetWidth });
    };
    medir();
    const ro = new ResizeObserver(medir);
    botones.current.forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [valor, opciones.length]);

  const r = alto / 2;
  const transicion = animar ? "transform var(--mov-normal) var(--curva-salida)" : "none";

  return (
    <div role="tablist" aria-label={etiqueta} className="relative isolate flex gap-2">
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
      {opciones.map(({ id, texto }) => {
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
            className={`tocable relative z-10 shrink-0 rounded-full border-[1.5px] px-3.5 text-sm font-bold whitespace-nowrap ${
              elegido ? "border-transparent text-papel" : "border-borde bg-transparent text-bosque"
            }`}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}
