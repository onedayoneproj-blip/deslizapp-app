import { CAMPOS_POR_RUBRO, NOMBRE_VALOR, OCASIONES_NOCHE, OCASIONES_DIA, rubrosDeTienda, tipoDeProducto, type Rubro } from "../rubros";
import type { CatalogoPublico, ProductoPublico } from "../types";
export const portada = (p: ProductoPublico) =>
  p.medios[0]?.tipo === "video"
    ? (p.medios[0].portada ?? "")
    : (p.medios[0]?.url ?? "");
export const mostrarDetalle = (v: unknown) =>
  Array.isArray(v)
    ? v.join(", ")
    : typeof v === "string"
      ? (NOMBRE_VALOR[v] ?? v)
      : v == null
        ? ""
        : String(v);
export function detallesDe(
  p: ProductoPublico,
  rubro: CatalogoPublico["tienda"]["rubro"],
) {
  return CAMPOS_POR_RUBRO[rubro]
    .filter((c) => p.detalles[c.llave] != null)
    .map((c) => ({
      nombre: c.nombre,
      valor: mostrarDetalle(p.detalles[c.llave]),
    }));
}
export function lineaCorta(
  p: ProductoPublico,
  rubro: CatalogoPublico["tienda"]["rubro"],
) {
  return rubro === "perfumes"
    ? [
        mostrarDetalle(p.detalles.concentracion),
        p.detalles.tamano_ml ? `${p.detalles.tamano_ml} ml` : "",
      ]
        .filter(Boolean)
        .join(" ")
    : detallesDe(p, rubro)
        .filter((d) => d.valor.length <= 40)
        .slice(0, 2)
        .map((d) => d.valor)
        .join(" · ");
}
export type Coleccion = {
  id: string;
  nombre: string;
  productos: ProductoPublico[];
};
/** La colección de un reel (la primera que lo incluye, sin «Todos») y su abanico como el de «Colecciones»: su carátula al
 * frente y detrás las de otras dos colecciones. Sin colección, null. */
export function abanicoDeColeccion(cols: Coleccion[], p: ProductoPublico) {
  const propias = cols.filter((c) => c.id !== "all");
  const suya = propias.find((c) => c.productos.some((x) => x.id === p.id));
  if (!suya) return null;
  return {
    nombre: suya.nombre,
    portadas: [suya, ...propias.filter((c) => c !== suya).slice(0, 2)].map((c) => portada(c.productos[0])),
  };
}
export type AbanicoColeccion = NonNullable<ReturnType<typeof abanicoDeColeccion>>;
export function coleccionesDe(c: CatalogoPublico): Coleccion[] {
  const p = c.productos;
  const a: Coleccion[] = [{ id: "all", nombre: "Todos", productos: p }];
  if (c.tienda.rubro === "perfumes") {
    for (const [valor, nombre] of [
      ["ella", "Para ella"],
      ["el", "Para él"],
      ["unisex", "Para los dos"],
    ])
      a.push({
        id: valor,
        nombre,
        productos: p.filter((p) => p.detalles.para === valor),
      });
    for (const [id, nombre] of [
      ["dia", "Día"],
      ["noche", "Noche"],
    ])
      a.push({
        id,
        nombre,
        productos: p.filter(
          (p) =>
            Array.isArray(p.detalles.ocasiones) &&
            p.detalles.ocasiones.some((o) =>
              id === "noche"
                ? OCASIONES_NOCHE.includes(o)
                : OCASIONES_DIA.includes(o),
            ),
        ),
      });
  }
  for (const nombre of new Set(
    p.map((p) => p.categoria).filter((s): s is string => !!s),
  ))
    a.push({
      id: "categoria:" + nombre,
      nombre,
      productos: p.filter((p) => p.categoria === nombre),
    });
  return a.filter((a) => a.productos.length > 0);
}

/** Los catálogos (rubros) de la tienda con productos visibles y cuántos tiene cada uno. Un producto sin rubro cuenta como el principal. */
export function catalogosDe(c: CatalogoPublico): { rubro: Rubro; cantidad: number }[] {
  return rubrosDeTienda(c.tienda)
    .map((rubro) => ({ rubro, cantidad: c.productos.filter((p) => tipoDeProducto(p, c.tienda) === rubro).length }))
    .filter((x) => x.cantidad > 0);
}
/** El catálogo solo con los productos de un rubro (`null` = Todo: el mismo catálogo). */
export function catalogoFiltrado(c: CatalogoPublico, rubro: Rubro | null): CatalogoPublico {
  return rubro === null ? c : { ...c, productos: c.productos.filter((p) => tipoDeProducto(p, c.tienda) === rubro) };
}
/** La colección elegida si sigue existiendo; si no, «Todos». */
export const filtroVigente = (cols: readonly Coleccion[], id: string) => (cols.some((c) => c.id === id) ? id : "all");
