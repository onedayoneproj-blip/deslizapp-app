// El catálogo (rubro) que se está viendo en el panel (docs/prompts/selector-de-catalogos.md). Solo cuenta con más de un rubro.
import { esRubro, NOMBRE_TIPO, rubrosDeTienda, tipoDeProducto, tipoPorDefecto, type Rubro } from "./rubros";

type TiendaRubros = { rubro: Rubro; rubros?: readonly Rubro[] | null };

/** Opción virtual que reúne los productos de todos los catálogos. No es un rubro guardado. */
export const CATALOGO_GENERAL = "__general_agregado__" as const;
export type CatalogoPanel = Rubro | typeof CATALOGO_GENERAL;

/** Nombre visible en los selectores del panel: el rubro `general` conserva sus datos y pasa a «De todo». */
export function nombreCatalogoPanel(catalogo: CatalogoPanel): string {
  return catalogo === CATALOGO_GENERAL ? "General" : catalogo === "general" ? "De todo" : NOMBRE_TIPO[catalogo];
}

const clave = (tiendaId: string) => `deslizapp-catalogo-activo:${tiendaId}`;

/** El último catálogo que miró esta persona en esta tienda (localStorage); null si no hay o no hay almacenamiento. */
export function leerCatalogoActivo(tiendaId: string): CatalogoPanel | null {
  try {
    const v = localStorage.getItem(clave(tiendaId));
    return v === CATALOGO_GENERAL ? CATALOGO_GENERAL : esRubro(v) ? v : null;
  } catch {
    return null;
  }
}

export function guardarCatalogoActivo(tiendaId: string, rubro: CatalogoPanel) {
  try {
    localStorage.setItem(clave(tiendaId), rubro);
  } catch {
    // sin almacenamiento: la próxima vez abre el principal
  }
}

/** El catálogo con el que abre: el último visto si la tienda lo sigue vendiendo; si no, el principal. */
export const catalogoInicial = (t: TiendaRubros, ultimo: CatalogoPanel | null): CatalogoPanel => {
  if (ultimo === CATALOGO_GENERAL && rubrosDeTienda(t).length > 1) return CATALOGO_GENERAL;
  return tipoPorDefecto(t, ultimo && esRubro(ultimo) ? ultimo : null);
};

/** Un producto nuevo necesita un rubro real; desde la vista agregada parte del principal. */
export const rubroInicialDeProducto = (t: TiendaRubros, ultimo: CatalogoPanel | null): Rubro =>
  tipoPorDefecto(t, ultimo && esRubro(ultimo) ? ultimo : null);

/** Los productos de un catálogo (sin «Todo»): el que no tiene tipo cuenta como el principal. */
export function productosDeCatalogo<P extends { id: string; rubro?: Rubro | null }>(productos: readonly P[], t: { rubro: Rubro }, catalogo: CatalogoPanel): P[] {
  if (catalogo === CATALOGO_GENERAL) {
    const vistos = new Set<string>();
    return productos.filter((p) => {
      if (vistos.has(p.id)) return false;
      vistos.add(p.id);
      return true;
    });
  }
  return productos.filter((p) => tipoDeProducto(p, t) === catalogo);
}

/** Cuántos productos tiene cada catálogo de la tienda. */
export function contarPorCatalogo(productos: readonly { rubro?: Rubro | null }[], t: TiendaRubros): Record<string, number> {
  const res: Record<string, number> = Object.fromEntries(rubrosDeTienda(t).map((r) => [r, 0]));
  for (const p of productos) {
    const r = tipoDeProducto(p, t);
    if (r in res) res[r]! += 1;
  }
  return res;
}
