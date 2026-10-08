"use client";

import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { IconoCheck, IconoChevronAbajo, IconoMas } from "../iconos";
import { indiceConTecla, posicionMenu, type TeclaMenu } from "@/lib/menu-flotante";

export type OpcionMenu = { id: string; texto: string; cantidad?: number };

/**
 * Menú flotante (docs/09 §16.5): el nombre del elemento elegido con un chevron, sin fondo ni borde, que abre una tarjeta justo
 * debajo. Cada opción es un `menuitemradio`; al final, una acción con «+» (`accion`). Se pinta en un portal a `document.body`
 * con posición calculada, así no lo recorta una hoja. Cierra al elegir, al tocar fuera, con Escape y al desmontarse.
 * Movimiento: solo `transform` y `opacity` (clase `menu-flotante`).
 */
export function MenuFlotante({
  opciones,
  valor,
  alElegir,
  accion,
  etiqueta,
  tamano,
  deshabilitado,
}: {
  opciones: OpcionMenu[];
  valor: string;
  alElegir: (id: string) => void;
  accion?: { texto: string; alTocar: () => void };
  /** Nombre accesible del menú («Catálogo»). */
  etiqueta: string;
  tamano: "pantalla" | "hoja";
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<ReturnType<typeof posicionMenu> | null>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const actual = opciones.find((o) => o.id === valor);
  const clase = tamano === "pantalla" ? "font-display text-titulo-pantalla" : "font-display text-titulo-seccion";
  const total = opciones.length + (accion ? 1 : 0);

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) disparador.current?.focus({ preventScroll: true });
  };

  const abrir = () => {
    const r = disparador.current?.getBoundingClientRect();
    if (!r) return;
    // Dentro del gesto del toque: se pinta ya y el foco va al elemento activo (regla de HANDOFF.md).
    flushSync(() => {
      setPos(posicionMenu(r, { ancho: window.innerWidth, alto: window.innerHeight }));
      setAbierto(true);
    });
    const i = Math.max(0, opciones.findIndex((o) => o.id === valor));
    items.current[i]?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!abierto) return;
    const alRedimensionar = () => setAbierto(false);
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
  }, [abierto]);

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cerrar();
    } else if (e.key === "Tab") {
      cerrar(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const ahora = items.current.findIndex((el) => el === document.activeElement);
      items.current[indiceConTecla(ahora, total, e.key as TeclaMenu)]?.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <button
        ref={disparador}
        type="button"
        disabled={deshabilitado}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        aria-label={`${etiqueta}: ${actual?.texto ?? ""}. Cambiar`}
        data-selector-catalogo=""
        onClick={() => (abierto ? cerrar() : abrir())}
        className={`tocable inline-flex min-h-11 max-w-full items-center gap-1.5 text-left text-texto ${clase}`}
      >
        <span className="min-w-0 truncate">{actual?.texto}</span>
        <IconoChevronAbajo tamano={tamano === "pantalla" ? 24 : 20} strokeWidth={2.4} className="shrink-0 text-texto-secundario" />
      </button>
      {abierto && pos && typeof document !== "undefined" && createPortal(
        // El portal burbuja eventos de React hacia la hoja: sus gestos de arrastre con puntero no deben verlos.
        <div
          className="fixed inset-0 z-[80]"
          onKeyDown={alTeclear}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div aria-hidden="true" onClick={() => cerrar()} className="menu-flotante-velo absolute inset-0 bg-velo/40" />
          <div
            id={id}
            role="menu"
            aria-label={etiqueta}
            data-menu-flotante=""
            style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight }}
            className="menu-flotante absolute overflow-y-auto rounded-[16px] border border-borde bg-superficie shadow-flotante"
          >
            {opciones.map((o, i) => (
              <Fila
                key={o.id}
                ref={(el) => { items.current[i] = el; }}
                role="menuitemradio"
                checked={o.id === valor}
                alTocar={() => { cerrar(); if (o.id !== valor) alElegir(o.id); }}
                icono={o.id === valor ? <IconoCheck tamano={18} strokeWidth={3} /> : null}
                cantidad={o.cantidad}
              >{o.texto}</Fila>
            ))}
            {accion && (
              <>
                <div aria-hidden="true" className="h-2 bg-superficie-hundida" />
                <Fila
                  ref={(el) => { items.current[opciones.length] = el; }}
                  role="menuitem"
                  alTocar={() => { cerrar(false); accion.alTocar(); }}
                  icono={<IconoMas tamano={18} strokeWidth={2.4} className="text-texto-secundario" />}
                >{accion.texto}</Fila>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const Fila = forwardRef<HTMLButtonElement, {
  role: "menuitemradio" | "menuitem";
  checked?: boolean;
  icono: ReactNode;
  cantidad?: number;
  alTocar: () => void;
  children: ReactNode;
}>(function Fila({ role, checked, icono, cantidad, alTocar, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role={role}
      aria-checked={role === "menuitemradio" ? Boolean(checked) : undefined}
      onClick={alTocar}
      className="tocable flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-cuerpo font-semibold text-texto outline-none focus-visible:bg-superficie-hundida"
    >
      <span className="grid w-[18px] shrink-0 place-items-center">{icono}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {cantidad != null && <span className="shrink-0 text-secundario text-texto-secundario">{cantidad}</span>}
    </button>
  );
});
