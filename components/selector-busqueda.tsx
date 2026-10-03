"use client";

import { useLayoutEffect, type ReactNode, type RefObject } from "react";
import { HojaFijoAbajo, HojaFijoArriba, useIrArribaHoja } from "./hoja";
import { IconoMas } from "./iconos";
import { Buscador } from "./ui";

/**
 * Selector con búsqueda, para usar DENTRO de una hoja (sin abrir otra encima): botón de volver + buscador y
 * filtros opcionales (`fijo`), que van en la zona fija de la cabecera de la hoja (dentro del mismo
 * desenfoque), una fila de acción opcional ("+ Nuevo cliente"), la lista (`children`) y algo fijo abajo
 * opcional (`abajo`, ej. <PildoraSeleccion>). Lo usan el selector de clientes y el de productos de "+ Pedido"; el paso 8 (Promos)
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
  abajo,
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
  /** Se queda fijo debajo del buscador, en la cabecera de la hoja (pastillas de colección…). */
  fijo?: ReactNode;
  /** Flota fijo abajo de la hoja (se oculta con el teclado abierto). */
  abajo?: ReactNode;
  accionArriba?: ReactNode;
  accionAbajo?: ReactNode;
  children: ReactNode;
}) {
  // Al entrar a esta vista, la lista empieza arriba del todo.
  const irArriba = useIrArribaHoja();
  useLayoutEffect(() => irArriba(), [irArriba]);

  return (
    <div className="flex flex-col gap-3">
      <HojaFijoArriba>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <BotonVolver onClick={alVolver} />
            <Buscador className="min-w-0 flex-1" entrada={entrada} valor={consulta} alCambiar={alCambiarConsulta} placeholder={placeholder} etiqueta={etiqueta} />
          </div>
          {fijo}
        </div>
      </HojaFijoArriba>
      {accionArriba}
      {children}
      {accionAbajo}
      {abajo && <HojaFijoAbajo>{abajo}</HojaFijoAbajo>}
    </div>
  );
}

export function BotonVolver({ onClick, etiqueta = "Volver" }: { onClick: () => void; etiqueta?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="tocable grid size-(--alto-control) shrink-0 place-items-center rounded-full bg-superficie-hundida text-texto outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
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
      className="tocable flex w-full items-center gap-3 rounded-radio-l border-[1.5px] border-accion bg-superficie px-3 py-2.5 text-left text-texto outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accion text-sobre-accion">
        <IconoMas tamano={20} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-cuerpo font-extrabold">{texto}</span>
        {detalle && <span className="block truncate text-secundario text-texto-secundario">{detalle}</span>}
      </span>
    </button>
  );
}

/** Contenedor de filas de una lista de selección. */
export function ListaSeleccion({ children }: { children: ReactNode }) {
  return <ul className="rounded-radio-l border border-linea bg-superficie px-3">{children}</ul>;
}

/** Fila de una lista de selección (separador y `content-visibility` para listas largas). */
export function FilaLista({ children }: { children: ReactNode }) {
  return <li className="border-b border-linea [contain-intrinsic-size:auto_64px] [content-visibility:auto] last:border-b-0">{children}</li>;
}

/**
 * Píldora flotante de resumen de una selección ("3 productos · RD$2,450" + "Listo"), abajo y centrada,
 * con el margen lateral de la pantalla y respetando el área segura del iPhone. Entra subiendo un poco
 * (transform + opacidad). Pasar a <SelectorBusqueda abajo={…}> solo cuando hay algo elegido.
 */
export function PildoraSeleccion({ detalle, total, alListo }: { detalle: string; total: string; alListo: () => void }) {
  return (
    <div className="px-5 pb-[max(16px,calc(var(--safe-abajo)+6px))]">
      <div className="mov-aparece pointer-events-auto flex h-16 items-center gap-3 rounded-full bg-accion py-2 pr-2 pl-5 text-sobre-accion shadow-flotante">
        <p className="min-w-0 flex-1 leading-tight" aria-live="polite">
          <span className="block truncate text-etiqueta opacity-80">{detalle}</span>
          <span className="block font-display text-titulo-seccion tabular-nums">{total}</span>
        </p>
        <button
          type="button"
          onClick={alListo}
          className="tocable h-12 shrink-0 rounded-full bg-sobre-accion px-7 text-cuerpo font-extrabold text-accion outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
