"use client";

import { useEffect, useId, useRef, useState, type MutableRefObject } from "react";
import { createPortal, flushSync } from "react-dom";
import { IconoChevronAbajo } from "../iconos";
import { clases, FOCO } from "../ui/comunes";

/**
 * «Publicar ⌄» de «Así se ve» (historia de crear producto): botón dividido. «Publicar» publica; el chevron abre un menú pequeño
 * con una sola opción, «Guardar sin publicar». El menú se pinta en un portal, justo encima del botón (el pie va abajo), y se
 * cierra con Escape, tocando fuera o con «atrás» (`cierreRef`); el foco entra a la opción y vuelve al chevron.
 * Movimiento: solo transform y opacity (`menu-flotante` / `menu-flotante-arriba`).
 */
export function BotonPublicar({
  alPublicar,
  alGuardar,
  cargando,
  deshabilitado,
  cierreRef,
}: {
  alPublicar: () => void;
  alGuardar: () => void;
  cargando: boolean;
  deshabilitado: boolean;
  /** Para el «atrás» del teléfono: si hay un menú abierto lo cierra y devuelve true. */
  cierreRef: MutableRefObject<(() => boolean) | null>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ right: number; bottom: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const chevron = useRef<HTMLButtonElement>(null);
  const opcion = useRef<HTMLButtonElement>(null);
  const id = useId();
  const apagado = deshabilitado || cargando;

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) chevron.current?.focus({ preventScroll: true });
  };
  const abrir = () => {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    // Dentro del gesto del toque: se pinta ya y el foco entra a la opción (regla de HANDOFF.md).
    flushSync(() => {
      setPos({ right: Math.max(12, window.innerWidth - r.right), bottom: window.innerHeight - r.top + 8 });
      setAbierto(true);
    });
    opcion.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    cierreRef.current = () => {
      if (!abierto) return false;
      cerrar();
      return true;
    };
  });
  useEffect(() => () => { cierreRef.current = null; }, [cierreRef]);
  useEffect(() => {
    if (!abierto) return;
    const cerrarYa = () => setAbierto(false);
    window.addEventListener("resize", cerrarYa);
    return () => window.removeEventListener("resize", cerrarYa);
  }, [abierto]);

  return (
    <div ref={caja} className={clases("flex h-(--alto-boton-grande) min-w-0 flex-1 items-stretch overflow-hidden rounded-full border", apagado ? "border-linea bg-superficie-hundida text-texto-secundario" : "border-resalte bg-resalte text-sobre-resalte")} data-boton-publicar="">
      <button
        type="button" disabled={apagado} onClick={alPublicar} data-publicar=""
        className={clases("tocable min-w-0 flex-1 rounded-l-full px-4 text-destacado font-extrabold", FOCO)}
      >
        {cargando ? "…" : "Publicar"}
      </button>
      <span aria-hidden="true" className="my-3 w-px bg-current opacity-30" />
      <button
        ref={chevron} type="button" disabled={apagado}
        aria-haspopup="menu" aria-expanded={abierto} aria-controls={abierto ? id : undefined} aria-label="Más opciones para guardar"
        onClick={() => (abierto ? cerrar() : abrir())} data-mas-opciones=""
        className={clases("tocable grid min-w-12 shrink-0 place-items-center rounded-r-full", FOCO)}
      >
        <IconoChevronAbajo tamano={20} strokeWidth={2.4} />
      </button>
      {abierto && pos && typeof document !== "undefined" && createPortal(
        // El portal burbuja eventos de React hacia la hoja: sus gestos de arrastre no deben verlos.
        <div
          className="fixed inset-0 z-[80]"
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); }
            else if (e.key === "Tab") cerrar(false);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div aria-hidden="true" onClick={() => cerrar()} className="menu-flotante-velo absolute inset-0 bg-velo/40" />
          <div
            id={id} role="menu" aria-label="Más opciones para guardar" data-menu-publicar=""
            style={{ right: pos.right, bottom: pos.bottom }}
            className="menu-flotante menu-flotante-arriba absolute w-[min(272px,calc(100vw-24px))] overflow-hidden rounded-[16px] border border-borde bg-superficie shadow-flotante"
          >
            <button
              ref={opcion} type="button" role="menuitem"
              onClick={() => { cerrar(false); alGuardar(); }}
              className="tocable flex min-h-14 w-full flex-col justify-center px-4 py-2 text-left outline-none focus-visible:bg-superficie-hundida"
            >
              <span className="text-cuerpo font-semibold text-texto">Guardar sin publicar</span>
              <span className="text-secundario text-texto-secundario">Queda oculto en tu catálogo</span>
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
