"use client";

import { IconoMas } from "../iconos";
import { clases, FOCO } from "./comunes";

/**
 * Fila "Agregar …" (Agregar cupón, Agregar producto; docs/09 §6): fila tocable con un círculo relleno `accion` de 24 px con un +
 * en `sobre-accion` y el texto en `destacado`. El círculo relleno la distingue de un texto suelto.
 */
export function FilaAgregar({ texto, alTocar, deshabilitado, className }: { texto: string; alTocar: () => void; deshabilitado?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={alTocar}
      disabled={deshabilitado}
      className={clases("tocable flex min-h-(--alto-control) w-full items-center gap-2.5 rounded-radio-m text-left text-destacado text-texto disabled:opacity-40", FOCO, className)}
    >
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-accion text-sobre-accion">
        <IconoMas tamano={14} strokeWidth={3} />
      </span>
      {texto}
    </button>
  );
}
