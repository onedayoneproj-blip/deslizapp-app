// Hoja de producto (docs/prompts/hoja-producto-rediseno.md): las reglas puras del formulario de crear y editar.
import type { OpcionProducto } from "./types";

/**
 * «Publicar» / «Guardar cambios» se enciende con nombre, un precio válido (mayor que cero) y al menos una foto; sin foto, solo
 * si el producto queda oculto (`oculto`: un borrador no cuenta para el plan ni se ve en el catálogo; regla de Lewis, 12 oct).
 * Un video que aún se prepara también lo apaga.
 */
export function puedePublicar(d: { nombre: string; precio: string; fotos: number; preparando?: boolean; oculto?: boolean }): boolean {
  return d.nombre.trim().length > 0 && Number(d.precio) > 0 && (d.fotos > 0 || d.oculto === true) && !d.preparando;
}

/** Las pastillas de «Presentaciones»: «Color · 2», «Tamaño · 3». */
export const pastillasDeOpciones = (opciones: OpcionProducto[]) => opciones.map((o) => `${o.nombre} · ${o.valores.length}`);

/** El stock con presentaciones: «6 presentaciones · 18 en total». */
export const resumenStockPresentaciones = (n: number, enTotal: number) => `${n} ${n === 1 ? "presentación" : "presentaciones"} · ${enTotal} en total`;

/** El valor de la fila Descripción cerrada: la primera línea cortada en una palabra entera; null si está vacía. */
export function resumenDescripcion(texto: string, largo = 42): string | null {
  const t = texto.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.length <= largo) return t;
  return `${t.slice(0, largo).replace(/\s+\S*$/, "").replace(/[,.:;]$/, "")}…`;
}

/** Lo que dice la fila Por encargo: el «Cuándo llega» si lo hay, o la frase de siempre. */
export const resumenEncargo = (activo: boolean, cuando: string) =>
  activo ? cuando.trim() || "Se puede pedir aunque no haya." : "Se puede pedir aunque no haya.";

/** «1 / 10»: la foto que se ve entre las del producto. */
export const contadorMedios = (posicion: number, total: number) => `${posicion} / ${total}`;

