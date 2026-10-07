"use client";

import { IconoChevronAbajo } from "../iconos";
import { NOMBRE_TIPO, type Rubro } from "@/lib/rubros";

export const OTRA_COSA = "__otra";

/**
 * El nombre del catálogo con un chevron, sin fondo ni borde: es el selector. Por dentro hay un `<select>` nativo encima (la rueda
 * de iOS, sin menú propio). Solo se pinta con más de un rubro. La última opción lleva a «Lo que vendes» y deja el catálogo como estaba.
 * Sin permiso se ve el nombre sin chevron y, al tocarlo, avisa.
 */
export function SelectorCatalogo({
  tipos,
  valor,
  conteo,
  textoOtra,
  alCambiar,
  alVenderOtra,
  tamano,
  deshabilitado,
  sinPermiso,
}: {
  tipos: Rubro[];
  valor: Rubro;
  conteo?: Record<string, number>;
  textoOtra: string;
  alCambiar: (r: Rubro) => void;
  alVenderOtra: () => void;
  tamano: "pantalla" | "hoja";
  deshabilitado?: boolean;
  sinPermiso?: () => void;
}) {
  const clase = tamano === "pantalla" ? "font-display text-titulo-pantalla text-texto" : "font-display text-titulo-seccion text-texto";
  if (sinPermiso) {
    return (
      <button type="button" data-selector-catalogo="" onClick={sinPermiso} className={`tocable flex min-h-11 items-center text-left ${clase}`}>
        {NOMBRE_TIPO[valor]}
      </button>
    );
  }
  return (
    <label className={`relative inline-flex min-h-11 max-w-full items-center gap-1.5 ${clase}`}>
      <span aria-hidden="true" className="min-w-0 truncate">{NOMBRE_TIPO[valor]}</span>
      <IconoChevronAbajo tamano={tamano === "pantalla" ? 24 : 20} strokeWidth={2.4} className="shrink-0 text-texto-secundario" />
      <select
        value={valor}
        disabled={deshabilitado}
        data-selector-catalogo=""
        aria-label={`Catálogo: ${NOMBRE_TIPO[valor]}. Cambiar`}
        onChange={(e) => {
          if (e.target.value === OTRA_COSA) alVenderOtra();
          else alCambiar(e.target.value as Rubro);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {tipos.map((r) => (
          <option key={r} value={r}>{NOMBRE_TIPO[r]}{conteo ? ` · ${conteo[r] ?? 0}` : ""}</option>
        ))}
        <option value={OTRA_COSA}>{textoOtra}</option>
      </select>
    </label>
  );
}
