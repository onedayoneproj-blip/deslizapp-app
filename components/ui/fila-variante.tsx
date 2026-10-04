"use client";

import { Cantidad } from "./cantidad";

/**
 * Una combinación de opciones con su stock (docs/09 §16.5; tablero Producto «Ropa»), dentro de una ListaAgrupada: a la izquierda,
 * si la variante tiene un color conocido, un círculo de ese color; el texto ("S · Arena") en `destacado` y debajo, solo cuando
 * importa, "Queda 1" o "Agotado" en `atencion-texto`; a la derecha la Cantidad (el − se apaga en 0).
 */
export function FilaVariante({
  texto,
  color,
  stock,
  alCambiar,
  deshabilitado = false,
}: {
  texto: string;
  /** Hex del color de la variante (si un eje es Color y el nombre se conoce). */
  color?: string | null;
  stock: number;
  alCambiar: (stock: number) => void;
  deshabilitado?: boolean;
}) {
  const estado = stock === 0 ? "Agotado" : stock <= 2 ? `Queda${stock === 1 ? "" : "n"} ${stock}` : null;
  return (
    <li className="flex min-h-15 items-center gap-3 border-t border-linea px-4 first:border-t-0">
      {color && <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-linea" style={{ background: color }} />}
      <span className="flex min-w-0 flex-1 flex-col py-2">
        <span className="truncate text-destacado text-texto">{texto}</span>
        {estado && <span className="text-secundario font-extrabold text-atencion-texto">{estado}</span>}
      </span>
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
