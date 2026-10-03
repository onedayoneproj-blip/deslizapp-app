"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { menosMovimiento } from "@/lib/movimiento";
import { clases, FOCO, TOQUE_44 } from "./comunes";
import { Contador } from "./etiqueta";

export type OpcionFiltro<T extends string> = {
  id: T;
  texto: ReactNode;
  cantidad?: number;
  atencion?: boolean;
};

/**
 * Fila de pastillas de filtro (docs/09 §6, Pastilla.md): cambia lo que se ve en una lista, no guarda datos. Alto `--pastilla-alto`
 * (36, toque 44), letra `--pastilla-letra` en negrita, 6 px entre pastillas. El indicador es una CÁPSULA `accion` que SE DESLIZA de
 * la pastilla anterior a la elegida y cambia de ancho: tres piezas movidas con `transform` (punta izquierda, centro con scaleX y
 * punta derecha), con `--mov-normal` y `--curva-salida`; con "reducir movimiento" no hay transición. Cada pastilla lleva su
 * relleno `superficie` y contorno `borde-pastilla` en una capa propia DEBAJO del indicador (así el indicador pasa por encima).
 *
 * Hace scroll horizontal (sin barra) y sangra hasta el borde de la pantalla (-mx-5); la elegida se acerca a la vista. Sin divisor.
 * Con `ocultarVacios`, los filtros con contador en 0 se ocultan, salvo los que no llevan contador ("Todos") y el elegido.
 * Flechas, Inicio y Fin del teclado mueven la selección.
 */
export function FilaPastillas<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  ocultarVacios = false,
}: {
  opciones: OpcionFiltro<T>[];
  valor: T;
  alCambiar: (id: T) => void;
  /** Qué se filtra (para lectores de pantalla). */
  etiqueta: string;
  /** Oculta los filtros con contador en 0 (salvo "Todos" y el elegido). */
  ocultarVacios?: boolean;
}) {
  // Se ocultan los que no tienen nada (contador en 0), salvo los que no llevan contador ("Todos") y el elegido (docs/09 §6)
  const visibles = ocultarVacios ? opciones.filter((o) => o.cantidad === undefined || o.cantidad > 0 || o.id === valor) : opciones;
  const botones = useRef(new Map<T, HTMLButtonElement>());
  const lista = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState<{ x: number; ancho: number } | null>(null);
  const [cajas, setCajas] = useState<{ id: T; x: number; ancho: number }[]>([]);
  const [animar, setAnimar] = useState(false);
  // Radio de las puntas = la mitad del alto REAL de la pastilla (sale del token --pastilla-alto)
  const [r, setR] = useState(18);

  useLayoutEffect(() => {
    const medir = () => {
      const b = botones.current.get(valor);
      if (b) {
        setR(b.offsetHeight / 2);
        setCaja({ x: b.offsetLeft, ancho: b.offsetWidth });
      }
      setCajas([...botones.current].map(([id, el]) => ({ id, x: el.offsetLeft, ancho: el.offsetWidth })));
    };
    medir();
    const ro = new ResizeObserver(medir);
    botones.current.forEach((b) => ro.observe(b));
    if (lista.current?.parentElement) ro.observe(lista.current.parentElement);
    return () => ro.disconnect();
  }, [valor, visibles.length]);

  // La elegida se ve completa: al cambiar (o al abrir con una ya elegida) se acerca a la vista
  useEffect(() => {
    botones.current.get(valor)?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: menosMovimiento() ? "auto" : "smooth" });
  }, [valor]);

  const transicion = animar && !menosMovimiento() ? "transform var(--mov-normal) var(--curva-salida)" : "none";

  return (
    <div className="-mx-5 -my-1 overflow-x-auto py-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div ref={lista} role="group" aria-label={etiqueta} className="relative isolate flex w-max min-w-full flex-nowrap gap-1.5 px-5">
        {cajas.map((c) => (
          <span
            key={c.id}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full border-[1.5px] border-borde-pastilla bg-superficie"
            style={{ left: c.x, width: c.ancho }}
          />
        ))}
        {caja && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-0">
            <span className="absolute inset-y-0 left-0 rounded-l-full bg-accion" style={{ width: r, transform: `translateX(${caja.x}px)`, transition: transicion }} />
            <span
              className="absolute inset-y-0 left-0 w-px origin-left bg-accion"
              style={{ transform: `translateX(${caja.x + r - 0.5}px) scaleX(${Math.max(0, caja.ancho - 2 * r + 1)})`, transition: transicion }}
            />
            <span className="absolute inset-y-0 left-0 rounded-r-full bg-accion" style={{ width: r, transform: `translateX(${caja.x + caja.ancho - r}px)`, transition: transicion }} />
          </span>
        )}
        {visibles.map((o) => {
          const elegida = o.id === valor;
          return (
            <button
              key={o.id}
              ref={(el) => void (el ? botones.current.set(o.id, el) : botones.current.delete(o.id))}
              type="button"
              aria-pressed={elegida}
              onKeyDown={(e) => {
                if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
                e.preventDefault();
                const i = visibles.findIndex((x) => x.id === o.id);
                const n = visibles.length;
                const sig = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
                botones.current.get(visibles[sig]!.id)?.focus();
                setAnimar(true);
                alCambiar(visibles[sig]!.id);
              }}
              onClick={() => {
                setAnimar(true);
                alCambiar(o.id);
              }}
              className={clases(
                "tocable relative z-10 inline-flex h-(--pastilla-alto) shrink-0 scroll-mx-5 items-center gap-1.5 rounded-full border-[1.5px] border-transparent px-(--pastilla-px) text-(length:--pastilla-letra) font-bold whitespace-nowrap",
                TOQUE_44,
                FOCO,
                elegida ? "text-sobre-accion" : "text-texto",
              )}
            >
              {o.texto}
              {o.cantidad !== undefined && <Contador valor={o.cantidad} atencion={o.atencion} sobreAccion={elegida} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
