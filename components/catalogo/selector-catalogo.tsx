"use client";

import { MenuFlotante } from "../ui/menu-flotante";
import type { Rubro } from "@/lib/rubros";
import { CATALOGO_GENERAL, nombreCatalogoPanel, type CatalogoPanel } from "@/lib/catalogo-activo";

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
  vistaAgregada = false,
}: {
  tipos: Rubro[];
  valor: CatalogoPanel;
  conteo?: Record<string, number>;
  textoOtra: string;
  alCambiar: (r: CatalogoPanel) => void;
  alVenderOtra: () => void;
  tamano: "pantalla" | "hoja";
  deshabilitado?: boolean;
  sinPermiso?: () => void;
  vistaAgregada?: boolean;
}) {
  if (sinPermiso) {
    const clase = tamano === "pantalla" ? "font-display text-titulo-pantalla text-texto" : "font-display text-titulo-seccion text-texto";
    return (
      <button type="button" data-selector-catalogo="" onClick={sinPermiso} className={`tocable flex min-h-11 items-center text-left ${clase}`}>
        {nombreCatalogoPanel(valor)}
      </button>
    );
  }
  return (
    <MenuFlotante
      etiqueta="Catálogo"
      tamano={tamano}
      deshabilitado={deshabilitado}
      valor={valor}
      opciones={[
        ...(vistaAgregada ? [{ id: CATALOGO_GENERAL, texto: nombreCatalogoPanel(CATALOGO_GENERAL), cantidad: conteo?.[CATALOGO_GENERAL] }] : []),
        ...tipos.map((r) => ({ id: r, texto: nombreCatalogoPanel(r), cantidad: conteo?.[r] ?? (conteo ? 0 : undefined) })),
      ]}
      alElegir={(id) => alCambiar(id as CatalogoPanel)}
      accion={{ texto: textoOtra, alTocar: alVenderOtra }}
    />
  );
}
