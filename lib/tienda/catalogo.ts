import { CAMPOS_POR_RUBRO, NOMBRE_VALOR, OCASIONES_NOCHE } from "../rubros";
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
                : !OCASIONES_NOCHE.includes(o),
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
