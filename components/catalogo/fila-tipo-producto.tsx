"use client";

import { IconoChevronDerecha } from "../iconos";
import { NOMBRE_TIPO, type Rubro } from "@/lib/rubros";

export const OTRA_COSA = "__otra";

/**
 * «Tipo de producto»: se ve como la fila Colección (etiqueta a la izquierda, valor gris y chevron), pero por dentro es un `<select>`
 * nativo con su `<label>` puesto encima (la rueda de iOS); no abre hoja. Solo se pinta con más de un rubro. La última opción,
 * «Vendo otra cosa también», lleva a «Lo que vendes».
 */
export function FilaTipoProducto({
  tipos,
  valor,
  alCambiar,
  alVenderOtra,
  deshabilitado,
}: {
  tipos: Rubro[];
  valor: Rubro;
  alCambiar: (r: Rubro) => void;
  alVenderOtra: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <ul aria-label="Tipo de producto" className="overflow-hidden rounded-radio-l border border-linea bg-superficie">
      <li>
        <label className="tocable relative flex min-h-15 w-full items-center gap-3 px-4">
          <span className="min-w-0 flex-1 truncate text-destacado text-texto">Tipo de producto</span>
          <span aria-hidden="true" className="shrink-0 text-secundario font-normal text-texto-secundario">{NOMBRE_TIPO[valor]}</span>
          <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="-mr-1 shrink-0 text-texto-secundario" />
          <select
            value={valor}
            disabled={deshabilitado}
            data-tipo-producto=""
            onChange={(e) => {
              if (e.target.value === OTRA_COSA) alVenderOtra();
              else alCambiar(e.target.value as Rubro);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {tipos.map((r) => (
              <option key={r} value={r}>{NOMBRE_TIPO[r]}</option>
            ))}
            <option value={OTRA_COSA}>Vendo otra cosa también</option>
          </select>
        </label>
      </li>
    </ul>
  );
}
