"use client";

import type { ReactNode, RefObject } from "react";
import { IconoBuscar, IconoMas } from "./iconos";

/**
 * Selector con búsqueda, para usar DENTRO de una hoja (sin abrir otra encima): botón de volver + buscador,
 * bloque fijo arriba (filtros / resumen opcionales), una fila de acción opcional ("+ Nuevo cliente") y la
 * lista (`children`). Lo usan el selector de clientes y el de productos de "+ Pedido"; el paso 8 (Promos)
 * lo reutiliza para elegir producto o colección.
 *
 * Teclado (HANDOFF.md): quien abre el selector con un toque debe enfocar el buscador en ESE toque
 * (`flushSync` + `entrada.current.focus()`), para que el teclado del iPhone abra bien.
 * Sin animación por elemento. Las filas largas usan `content-visibility` para desplazarse fluido.
 */
export function SelectorBusqueda({
  entrada,
  consulta,
  alCambiarConsulta,
  placeholder,
  etiqueta,
  alVolver,
  fijo,
  accionArriba,
  accionAbajo,
  children,
}: {
  entrada: RefObject<HTMLInputElement | null>;
  consulta: string;
  alCambiarConsulta: (texto: string) => void;
  placeholder: string;
  /** Nombre del buscador para lectores de pantalla. */
  etiqueta: string;
  alVolver: () => void;
  /** Se queda fijo debajo del buscador al desplazar la lista (pastillas de colección, resumen…). */
  fijo?: ReactNode;
  accionArriba?: ReactNode;
  accionAbajo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Fijo bajo la cabecera de la hoja (el relleno de arriba del contenido ya deja ese espacio: sticky mide desde ahí); tapa lo que pasa por detrás */}
      <div className="sticky top-0 z-[5] -mx-5 -mt-0.5 flex flex-col gap-2.5 bg-papel px-5 pt-0.5 pb-2">
        <div className="flex items-center gap-2">
          <BotonVolver onClick={alVolver} />
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full border-[1.5px] border-borde bg-white px-4 focus-within:border-bosque">
            <IconoBuscar tamano={20} className="shrink-0 text-suave" />
            <span className="sr-only">{etiqueta}</span>
            <input
              ref={entrada}
              type="search"
              value={consulta}
              onChange={(e) => alCambiarConsulta(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-base text-bosque outline-none placeholder:text-suave/80"
            />
          </label>
        </div>
        {fijo}
      </div>
      {accionArriba}
      {children}
      {accionAbajo}
    </div>
  );
}

export function BotonVolver({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Volver" className="tocable grid h-11 w-11 shrink-0 place-items-center rounded-full bg-arena text-bosque">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  );
}

/** Fila de acción ("+ Nuevo cliente", "+ Crear «Ana»"): distinta a una fila de la lista (borde verde bosque y ícono +). */
export function FilaAccion({ texto, detalle, onClick }: { texto: string; detalle?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tocable flex w-full items-center gap-3 rounded-[20px] border-[1.5px] border-bosque bg-white px-3 py-2.5 text-left text-bosque"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-bosque text-papel">
        <IconoMas tamano={20} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-extrabold">{texto}</span>
        {detalle && <span className="block truncate text-[12.5px] text-suave">{detalle}</span>}
      </span>
    </button>
  );
}

/** Contenedor de filas de una lista de selección. */
export function ListaSeleccion({ children }: { children: ReactNode }) {
  return <ul className="rounded-[20px] border border-linea bg-white px-3">{children}</ul>;
}

/**
 * Fila de una lista de selección (separador y `content-visibility` para listas largas).
 * `margenSuperior` es un `scroll-mt-*`: lo que mide el bloque fijo de arriba, para que al llevar una fila
 * a la vista (foco, teclado) no quede tapada por él.
 */
export function FilaLista({ children, margenSuperior = "scroll-mt-16" }: { children: ReactNode; margenSuperior?: string }) {
  return (
    <li className={`border-b border-arena [contain-intrinsic-size:auto_64px] [content-visibility:auto] last:border-b-0 ${margenSuperior}`}>{children}</li>
  );
}
