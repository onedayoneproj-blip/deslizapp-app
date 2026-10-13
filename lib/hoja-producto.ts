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


// ---- Editar producto como resumen (docs/prompts/editar-producto-2-resumen.md) ----

/** Lo que dice la fila Presentaciones: «Talla y color · 6», o «Agregar» si no tiene. */
export function resumenPresentaciones(opciones: OpcionProducto[], cuantas: number): string {
  if (opciones.length === 0 || cuantas === 0) return "Agregar";
  const nombres = opciones.map((o, i) => (i === 0 ? o.nombre : o.nombre.toLocaleLowerCase("es")));
  const juntos = nombres.length === 1 ? nombres[0]! : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return `${juntos} · ${cuantas}`;
}

/** Lo que dice la fila Stock: «14 en total». Sin cantidad guardada se ve como 0. */
export const resumenStock = (total: number | null) => `${total ?? 0} en total`;

/** Una presentación (o el producto) que bajó: dónde y cuánto. */
export type Bajada = { donde: string | null; unidades: number };

/**
 * La pregunta del motivo cuando el stock baja («Bajaste 2 en Blanco · M. ¿Qué pasó?»). Con varias presentaciones que bajaron,
 * el total y cuántas («Bajaste 3 en 2 presentaciones. ¿Qué pasó?»). null si no bajó nada.
 */
export function preguntaBajada(bajadas: Bajada[]): string | null {
  const reales = bajadas.filter((b) => b.unidades > 0);
  if (reales.length === 0) return null;
  const total = reales.reduce((t, b) => t + b.unidades, 0);
  if (reales.length === 1) return `Bajaste ${total}${reales[0]!.donde ? ` en ${reales[0]!.donde}` : ""}. ¿Qué pasó?`;
  return `Bajaste ${total} en ${reales.length} presentaciones. ¿Qué pasó?`;
}

/** La ayuda de un paso de editar: el valor de antes cuando cambió («Antes: RD$1,450.»); si no, la de siempre. */
export const ayudaConAntes = (antes: string, ahora: string, deSiempre: string) => (antes.trim() && antes.trim() !== ahora.trim() ? `Antes: ${antes.trim()}.` : deSiempre);

/** La franja de la lista de espera en «Ver producto»: «3 personas lo esperan». */
export const textoPersonasLoEsperan = (n: number) => (n === 1 ? "1 persona lo espera" : `${n} personas lo esperan`);
