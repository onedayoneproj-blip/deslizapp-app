// El catálogo (rubro) que se está viendo en el panel (docs/prompts/selector-de-catalogos.md). Solo cuenta con más de un rubro.
import { esRubro, rubrosDeTienda, tipoDeProducto, tipoPorDefecto, type Rubro } from "./rubros";

type TiendaRubros = { rubro: Rubro; rubros?: readonly Rubro[] | null };

const clave = (tiendaId: string) => `deslizapp-catalogo-activo:${tiendaId}`;

/** El último catálogo que miró esta persona en esta tienda (localStorage); null si no hay o no hay almacenamiento. */
export function leerCatalogoActivo(tiendaId: string): Rubro | null {
  try {
    const v = localStorage.getItem(clave(tiendaId));
    return esRubro(v) ? v : null;
  } catch {
    return null;
  }
}

export function guardarCatalogoActivo(tiendaId: string, rubro: Rubro) {
  try {
    localStorage.setItem(clave(tiendaId), rubro);
  } catch {
    // sin almacenamiento: la próxima vez abre el principal
  }
}

/** El catálogo con el que abre: el último visto si la tienda lo sigue vendiendo; si no, el principal. */
export const catalogoInicial = (t: TiendaRubros, ultimo: Rubro | null): Rubro => tipoPorDefecto(t, ultimo);

/** Los productos de un catálogo (sin «Todo»): el que no tiene tipo cuenta como el principal. */
export function productosDeCatalogo<P extends { rubro?: Rubro | null }>(productos: readonly P[], t: { rubro: Rubro }, catalogo: Rubro): P[] {
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
