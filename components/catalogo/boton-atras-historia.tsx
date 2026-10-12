"use client";

import { clases, FOCO } from "../ui/comunes";

/**
 * «Atrás» de la historia de crear producto (prototipo v4): el círculo de 52 px abajo, a la izquierda del botón principal, en la
 * hoja principal y en todas las que se abren encima (Inventario, el detalle de una presentación, los opcionales).
 */
export function BotonAtras({ alTocar, apagado = false }: { alTocar: () => void; apagado?: boolean }) {
  return (
    <button
      type="button" aria-label="Atrás" onClick={alTocar} disabled={apagado}
      className={clases("tocable grid size-(--alto-boton-grande) shrink-0 place-items-center rounded-full border-[1.5px] border-accion bg-superficie text-accion disabled:opacity-35", FOCO)}
      data-atras-historia=""
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
  );
}
