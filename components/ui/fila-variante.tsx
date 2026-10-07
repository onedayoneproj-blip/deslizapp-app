"use client";

import type { ReactNode } from "react";
import { Cantidad } from "./cantidad";
import { clases, FOCO } from "./comunes";

/**
 * Una combinación de opciones con su stock (docs/09 §16.5; tableros Producto «Ropa» y Presentaciones «Lista»), dentro de una
 * ListaAgrupada: a la izquierda, si la variante tiene un color conocido, un círculo de ese color; el texto ("S · Arena") en
 * `destacado` y debajo, solo cuando importa, "Queda 1" o "Agotado" en `atencion-texto`; a la derecha la Cantidad (el − se apaga en 0).
 *
 * Con `alAbrir`, el texto es un botón que abre la hoja de esa presentación; `estado` reemplaza el texto automático (null = nada) y
 * `detalle` va debajo ("Editar", "RD$ 2,100 · precio propio"): el estado siempre se dice con palabras, nunca solo con color.
 */
export function FilaVariante({
  texto,
  color,
  stock,
  alCambiar,
  deshabilitado = false,
  alAbrir,
  estado: estadoPedido,
  detalle,
  atenuada = false,
  deshabilitadoAbrir = false,
}: {
  texto: string;
  /** Hex del color de la variante (si un eje es Color y el nombre se conoce). */
  color?: string | null;
  stock: number;
  alCambiar: (stock: number) => void;
  deshabilitado?: boolean;
  alAbrir?: () => void;
  estado?: string | null;
  detalle?: ReactNode;
  /** Oculta: se ve más tenue (la palabra «Oculta» lo dice igual). */
  atenuada?: boolean;
  /** El toque sigue ahí (explica por qué no se puede) pero la fila se ve apagada. */
  deshabilitadoAbrir?: boolean;
}) {
  const automatico = stock === 0 ? "Agotado" : stock <= 2 ? `Queda${stock === 1 ? "" : "n"} ${stock}` : null;
  const estado = estadoPedido === undefined ? automatico : estadoPedido;
  const cuerpo = (
    <>
      <span className="truncate text-destacado text-texto">{texto}</span>
      {estado && <span className="text-secundario font-extrabold text-atencion-texto">{estado}</span>}
      {detalle && <span className="text-secundario text-texto-secundario">{detalle}</span>}
    </>
  );
  return (
    <li className={clases("flex min-h-15 items-center gap-3 border-t border-linea px-4 first:border-t-0", atenuada && "opacity-70")}>
      {color && <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-linea" style={{ background: color }} />}
      {alAbrir ? (
        <button type="button" onClick={alAbrir} aria-disabled={deshabilitadoAbrir || undefined} aria-label={`Abrir ${texto}`} className={clases("tocable flex min-h-15 min-w-0 flex-1 flex-col items-start justify-center py-2 text-left", FOCO)}>
          {cuerpo}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col py-2">{cuerpo}</span>
      )}
      <Cantidad
        valor={stock}
        max={2147483647}
        deshabilitado={deshabilitado}
        alCambiar={alCambiar}
        etiquetaQuitar={`Quitar uno de ${texto}`}
        etiquetaAgregar={`Agregar uno de ${texto}`}
      />
    </li>
  );
}
