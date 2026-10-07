"use client";

import { MenuFlotante } from "../ui/menu-flotante";
import { NOMBRE_TIPO, type Rubro } from "@/lib/rubros";

/**
 * El nombre del catálogo con un chevron, sin fondo ni borde: es el selector. Abre el menú flotante (`MenuFlotante`) con los
 * catálogos de la tienda y, al final, «Lo que vendes». Solo se pinta con más de un rubro. Sin permiso se ve el nombre sin
 * chevron y, al tocarlo, avisa.
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
  if (sinPermiso) {
    const clase = tamano === "pantalla" ? "font-display text-titulo-pantalla text-texto" : "font-display text-titulo-seccion text-texto";
    return (
      <button type="button" data-selector-catalogo="" onClick={sinPermiso} className={`tocable flex min-h-11 items-center text-left ${clase}`}>
        {NOMBRE_TIPO[valor]}
      </button>
    );
  }
  return (
    <MenuFlotante
      etiqueta="Catálogo"
      tamano={tamano}
      deshabilitado={deshabilitado}
      valor={valor}
      opciones={tipos.map((r) => ({ id: r, texto: NOMBRE_TIPO[r], cantidad: conteo?.[r] ?? (conteo ? 0 : undefined) }))}
      alElegir={(id) => alCambiar(id as Rubro)}
      accion={{ texto: textoOtra, alTocar: alVenderOtra }}
    />
  );
}
