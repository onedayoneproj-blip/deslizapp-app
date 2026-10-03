import Link from "next/link";
import type { ReactNode } from "react";
import { IconoChevronDerecha } from "../iconos";
import { clases } from "./comunes";

/**
 * Lista agrupada (docs/09 §7): filas del mismo tipo, sencillas, dentro de UNA tarjeta `superficie` `radio-l`, separadas por
 * `linea`. Si la fila lleva etiqueta de estado o un botón propio, no va aquí: va en tarjetas sueltas (Tarjeta).
 */
export function ListaAgrupada({ children, etiqueta, className }: { children: ReactNode; etiqueta?: string; className?: string }) {
  return (
    <ul aria-label={etiqueta} className={clases("overflow-hidden rounded-radio-l border border-linea bg-superficie", className)}>
      {children}
    </ul>
  );
}

/**
 * Una fila de 60 px: `inicio` (avatar o icono), título `destacado`, `detalle` `secundario` y `fin` (monto o, si abre algo,
 * chevron). Con `href` u `onClick` toda la fila es tocable.
 */
export function FilaLista({
  titulo,
  detalle,
  inicio,
  fin,
  href,
  onClick,
  accion,
  pie,
}: {
  titulo: ReactNode;
  detalle?: ReactNode;
  inicio?: ReactNode;
  fin?: ReactNode;
  href?: string;
  onClick?: () => void;
  /**
   * Un botón propio al final de la fila ("Escribir"). Ocupa el lugar del chevron: la fila sigue llevando a `href`, y el botón
   * va FUERA del enlace (no se anidan controles).
   */
  accion?: ReactNode;
  /** Algo más debajo del detalle (una etiqueta de estado); no se recorta. */
  pie?: ReactNode;
}) {
  const tocable = Boolean(href || onClick);
  const cuerpo = (
    <>
      {inicio && <span className="shrink-0">{inicio}</span>}
      <span className="flex min-w-0 flex-1 flex-col py-2">
        <span className="truncate text-destacado text-texto">{titulo}</span>
        {detalle && <span className="truncate text-secundario text-texto-secundario">{detalle}</span>}
        {pie && <span className="mt-1 block">{pie}</span>}
      </span>
      {fin !== undefined && <span className="shrink-0 text-destacado text-texto tabular-nums">{fin}</span>}
      {tocable && !accion && <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="-mr-1 shrink-0 text-texto-secundario" />}
    </>
  );
  const fila = "flex min-h-15 w-full items-center gap-3 px-4 text-left";
  const foco = "outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco";
  if (accion) {
    const dentro = clases("tocable flex min-h-15 min-w-0 flex-1 items-center gap-3 py-0 pl-4 text-left", foco);
    return (
      <li className="flex items-center gap-3 border-t border-linea pr-4 first:border-t-0">
        {href ? (
          <Link href={href} scroll={false} className={dentro}>
            {cuerpo}
          </Link>
        ) : onClick ? (
          <button type="button" onClick={onClick} className={dentro}>
            {cuerpo}
          </button>
        ) : (
          <div className="flex min-h-15 min-w-0 flex-1 items-center gap-3 pl-4">{cuerpo}</div>
        )}
        {accion}
      </li>
    );
  }
  return (
    <li className="border-t border-linea first:border-t-0">
      {href ? (
        <Link href={href} scroll={false} className={clases("tocable", fila, foco)}>
          {cuerpo}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={clases("tocable", fila, foco)}>
          {cuerpo}
        </button>
      ) : (
        <div className={fila}>{cuerpo}</div>
      )}
    </li>
  );
}
