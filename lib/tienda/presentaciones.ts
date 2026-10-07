// Presentaciones en el catálogo del cliente (docs/prompts/presentaciones-catalogo.md): lógica pura, sin pantalla. Decide qué
// celda está agotada o queda poca, la elección por defecto, el «Desde», la foto del color, el texto de los ejes y qué hace ♥.
// Solo cuenta para productos con presentaciones: sin ellas, nada de esto se usa y el catálogo se comporta como siempre.

import { colorPorNombre, esEjeColor } from "../colores.ts";
import type { Disponibilidad, OpcionProducto, ProductoPublico } from "../types";

type Variante = ProductoPublico["variantes"][number];
export type Eleccion = Record<string, string>;

/** ¿Este producto se elige por presentación? (tiene ejes y al menos una presentación a la vista). */
export const tienePresentaciones = (p: Pick<ProductoPublico, "opciones" | "variantes">) => p.opciones.length > 0 && p.variantes.length > 0;

/** La presentación de estos valores (uno por eje); null si esa combinación no existe. */
export const varianteDe = (p: Pick<ProductoPublico, "opciones" | "variantes">, valores: Eleccion | null | undefined): Variante | null =>
  valores ? (p.variantes.find((v) => p.opciones.every((o) => v.valores[o.nombre] === valores[o.nombre])) ?? null) : null;

/** El estado de una combinación: «no_existe» si no hay tal presentación. */
export type EstadoCelda = { variante: Variante | null; estado: "hay" | "quedan" | "agotada" | "por_encargo" | "no_existe"; quedan: number | null; precio: number | null };
export function celda(p: Pick<ProductoPublico, "opciones" | "variantes">, valores: Eleccion): EstadoCelda {
  const v = varianteDe(p, valores);
  if (!v) return { variante: null, estado: "no_existe", quedan: null, precio: null };
  const estado = v.disponibilidad === "agotado" ? "agotada" : v.disponibilidad === "quedan" ? "quedan" : v.disponibilidad === "por_encargo" ? "por_encargo" : "hay";
  return { variante: v, estado, quedan: v.quedan, precio: v.precioPromo ?? v.precio };
}
/** Una celda que no se puede pedir: agotada o inexistente (se tacha). */
export const sinStock = (c: EstadoCelda) => c.estado === "agotada" || c.estado === "no_existe";

/** El eje de las filas de la cuadrícula (Color si hay; si no, el primero) y el de las columnas (el otro; null con un solo eje). */
export function ejesDeCuadricula(opciones: OpcionProducto[]): { filas: OpcionProducto; columnas: OpcionProducto | null } | null {
  if (opciones.length === 0) return null;
  const filas = opciones.find((o) => esEjeColor(o.nombre)) ?? opciones[0]!;
  return { filas, columnas: opciones.find((o) => o !== filas) ?? null };
}

/** Todas las combinaciones de los ejes en orden de lectura (cuadrícula: fila por fila). */
export function combinaciones(opciones: OpcionProducto[]): Eleccion[] {
  const g = ejesDeCuadricula(opciones);
  if (!g) return [];
  return g.filas.valores.flatMap((f) => (g.columnas ? g.columnas.valores.map((c) => ({ [g.filas.nombre]: f, [g.columnas!.nombre]: c })) : [{ [g.filas.nombre]: f }]));
}

/** La elección por defecto de las hojas: la primera presentación que se puede pedir (si no queda ninguna, la primera). */
export function eleccionPorDefecto(p: Pick<ProductoPublico, "opciones" | "variantes">): Eleccion | null {
  const todas = combinaciones(p.opciones);
  const buena = todas.find((c) => !sinStock(celda(p, c)));
  return buena ?? todas[0] ?? null;
}

/** El precio de una presentación (con la promo si hay). */
const precioDe = (v: Variante) => v.precioPromo ?? v.precio;

/** «Desde RD$ X»: el precio más bajo de las que se pueden pedir (si no hay ninguna, de todas). `varia` = hay precios distintos. */
export function desde(p: Pick<ProductoPublico, "variantes">): { precio: number; varia: boolean } | null {
  if (p.variantes.length === 0) return null;
  const pedibles = p.variantes.filter((v) => v.disponibilidad !== "agotado");
  const precios = (pedibles.length ? pedibles : p.variantes).map(precioDe);
  const todos = p.variantes.map(precioDe);
  return { precio: Math.min(...precios), varia: new Set(todos).size > 1 };
}

/** El eje que lleva foto (Color; si no hay, el primero) y la foto del valor elegido, o null (no se mueve la foto). */
export function fotoDeEleccion(p: Pick<ProductoPublico, "opciones" | "fotosPorValor" | "medios">, eleccion: Eleccion | null | undefined): string | null {
  const eje = p.opciones.find((o) => esEjeColor(o.nombre)) ?? p.opciones[0];
  if (!eje || !eleccion) return null;
  const url = p.fotosPorValor?.[eje.nombre]?.[eleccion[eje.nombre] ?? ""];
  return url && p.medios.some((m) => m.tipo === "foto" && m.url === url) ? url : null;
}
/** La posición, entre los medios del producto, de la foto del color elegido; null si no hay foto asignada. */
export function indiceDeFoto(p: Pick<ProductoPublico, "opciones" | "fotosPorValor" | "medios">, eleccion: Eleccion | null | undefined): number | null {
  const url = fotoDeEleccion(p, eleccion);
  const i = url ? p.medios.findIndex((m) => m.tipo === "foto" && m.url === url) : -1;
  return i >= 0 ? i : null;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const minus = (s: string) => s.toLocaleLowerCase("es");
const pluralDe = (nombre: string) => (/[aeiouáéíóú]$/i.test(nombre) ? `${nombre}s` : `${nombre}es`);

/** «4 tallas · 3 colores» (o «3 tamaños»), en el orden de los ejes. */
export function textoEjes(opciones: OpcionProducto[]): string {
  return opciones.map((o) => plural(o.valores.length, minus(o.nombre), minus(pluralDe(o.nombre)))).join(" · ");
}

/** Título de la hoja: «Elige tu talla», «Elige tu tamaño» o «Elige la tuya» (dos ejes o un eje que no es talla ni tamaño). */
export function tituloHoja(opciones: OpcionProducto[]): string {
  if (opciones.length === 1) {
    const n = minus(opciones[0]!.nombre);
    if (/^talla/.test(n)) return "Elige tu talla";
    if (/^tama[ñn]o/.test(n)) return "Elige tu tamaño";
  }
  return "Elige la tuya";
}

/** Los colores conocidos de un eje Color, en su orden, para los puntitos del botón. Un nombre que no se conoce no se dibuja. */
export function coloresDelEje(opciones: OpcionProducto[]): string[] {
  const eje = opciones.find((o) => esEjeColor(o.nombre));
  return eje ? eje.valores.flatMap((v) => colorPorNombre(v) ?? []) : [];
}
/** El color (hex) de la elección, si hay un eje Color y se conoce. */
export function colorDeEleccion(opciones: OpcionProducto[], eleccion: Eleccion | null | undefined): string | null {
  const eje = opciones.find((o) => esEjeColor(o.nombre));
  return eje && eleccion ? colorPorNombre(eleccion[eje.nombre] ?? "") : null;
}

/** «M · Negro» (los valores en el orden de los ejes). */
export const textoEleccion = (opciones: OpcionProducto[], eleccion: Eleccion) => opciones.map((o) => eleccion[o.nombre]).filter(Boolean).join(" · ");

/** «Talla M, color Negro, quedan 2» / «Talla L, color Negro, agotada» para lectores de pantalla. */
export function etiquetaCelda(opciones: OpcionProducto[], eleccion: Eleccion, c: EstadoCelda, base?: number): string {
  const partes = opciones.map((o) => `${minus(o.nombre)} ${eleccion[o.nombre] ?? ""}`);
  const estado = c.estado === "agotada" ? "agotada" : c.estado === "no_existe" ? "no disponible" : c.estado === "quedan" ? `quedan ${c.quedan}` : c.estado === "por_encargo" ? "por encargo" : "";
  const precio = c.precio !== null && base !== undefined && c.precio !== base ? `RD$${Math.round(c.precio).toLocaleString("es-DO")}` : "";
  const lista = [partes.join(", "), estado, precio].filter(Boolean).join(", ");
  return lista.charAt(0).toUpperCase() + lista.slice(1);
}

/** «Quedan 2» / «Quedan 2 de la M · Negro» / «Agotada» / «Por encargo»: lo que dice la línea de la elección. */
export function estadoDeEleccion(c: EstadoCelda): string {
  if (c.estado === "agotada") return "Agotada";
  if (c.estado === "no_existe") return "No disponible";
  if (c.estado === "quedan") return `Quedan ${c.quedan}`;
  if (c.estado === "por_encargo") return "Por encargo";
  return "";
}

/** Qué hace ♥ (y el doble toque): sin elegir abre la hoja de pastillas; con una elegida la agrega o, si está agotada, pide el aviso. */
export type AccionCorazon = { tipo: "hoja" } | { tipo: "agregar"; varianteId: string } | { tipo: "avisar"; varianteId: string | null } | { tipo: "quitar"; varianteId: string };
export function accionCorazon(p: ProductoPublico, eleccion: Eleccion | null | undefined, enPedido: (varianteId: string) => boolean): AccionCorazon {
  if (!eleccion) return { tipo: "hoja" };
  const c = celda(p, eleccion);
  if (!c.variante || c.estado === "agotada" || c.estado === "no_existe") return { tipo: "avisar", varianteId: c.variante?.id ?? null };
  return enPedido(c.variante.id) ? { tipo: "quitar", varianteId: c.variante.id } : { tipo: "agregar", varianteId: c.variante.id };
}

/** ¿Está agotado el producto entero para quien lo mira? Sin elegir, solo si todas lo están; elegida, solo esa combinación. */
export function agotadoPara(p: ProductoPublico, eleccion: Eleccion | null | undefined): boolean {
  if (!tienePresentaciones(p)) return p.disponibilidad === "agotado";
  if (!eleccion) return p.disponibilidad === "agotado";
  const c = celda(p, eleccion);
  return c.estado === "agotada" || c.estado === "no_existe";
}
export const disponibilidadPara = (p: ProductoPublico, eleccion: Eleccion | null | undefined): Disponibilidad => {
  if (!tienePresentaciones(p) || !eleccion) return p.disponibilidad;
  const c = celda(p, eleccion);
  return c.estado === "no_existe" ? "agotado" : (c.variante!.disponibilidad as Disponibilidad);
};
