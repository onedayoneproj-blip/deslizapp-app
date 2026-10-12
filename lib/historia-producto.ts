// Crear producto «como una historia» (docs/prompts/crear-producto-historia.md): una pregunta por pantalla. Las reglas puras de los
// pasos, sus textos, «¿Cuándo llega?» y la celebración. Sin React: se prueba en tests/historia-producto.test.mjs.
import { esEjeColor } from "./colores";
import { PRODUCTOS_SUGERIDOS_PARA_PUBLICAR } from "./config";
import { claveVariante, entreLos, type Presentacion } from "./presentaciones";
import type { Producto } from "./types";

/**
 * Los momentos de la historia. «listo» es la celebración: no lleva barra propia. Con presentaciones (ronda 3, Bloque 2), lo que
 * se elige va como historia: «cambia» (¿en qué cambia?) y un paso por cada cosa elegida («eje1», «eje2»); las cantidades van en la
 * hoja «Inventario», así que no hay paso de stock.
 */
export type PasoHistoria = "foto" | "nombre" | "precio" | "stock" | "cambia" | "eje1" | "eje2" | "vista" | "listo";

/**
 * Los pasos con barra, en orden. Un servicio no lleva stock ni encargo: se salta «¿Cuántos tienes ahora?». `ejes`: null sin
 * presentaciones; con ellas, cuántas cosas cambian (mientras no se elige ninguna se cuentan 2: siete barras, como el lienzo).
 */
export function pasosDeHistoria(servicio = false, ejes: number | null = null): Exclude<PasoHistoria, "listo">[] {
  if (ejes !== null) return ["foto", "nombre", "precio", "cambia", ...(ejes === 1 ? (["eje1"] as const) : (["eje1", "eje2"] as const)), "vista"];
  return servicio ? ["foto", "nombre", "precio", "vista"] : ["foto", "nombre", "precio", "stock", "vista"];
}

/** El paso que sigue (después de «vista» viene la celebración, que se alcanza guardando). */
export function pasoSiguiente(paso: PasoHistoria, servicio = false, ejes: number | null = null): PasoHistoria {
  const pasos: PasoHistoria[] = [...pasosDeHistoria(servicio, ejes), "listo"];
  const i = pasos.indexOf(paso);
  return pasos[Math.min(pasos.length - 1, i + 1)]!;
}

/** El paso de atrás («foto» no tiene; la celebración tampoco: ya se guardó). */
export function pasoAnterior(paso: PasoHistoria, servicio = false, ejes: number | null = null): PasoHistoria | null {
  if (paso === "listo") return null;
  const pasos = pasosDeHistoria(servicio, ejes);
  const i = pasos.indexOf(paso);
  return i > 0 ? pasos[i - 1]! : null;
}

/** Cuántas barras van llenas: las de los pasos hechos y la del paso en que se está. En la celebración, todas. */
export function barrasLlenas(paso: PasoHistoria, servicio = false, ejes: number | null = null): number {
  const pasos = pasosDeHistoria(servicio, ejes);
  return paso === "listo" ? pasos.length : pasos.indexOf(paso) + 1;
}

/**
 * El orden de las preguntas de las cosas elegidas: el color va al final (su pantalla lleva la foto de cada color), lo demás en el
 * orden en que se eligió. Así, Talla y Color: «¿Qué tallas hay?» → «¿Y qué colores?».
 */
export function ordenDePreguntas<T extends { nombre: string }>(ejes: T[]): T[] {
  return [...ejes.filter((e) => !esEjeColor(e.nombre)), ...ejes.filter((e) => esEjeColor(e.nombre))];
}

/** Cómo se guardan las cosas: el color primero, para que el Inventario agrupe por color con una fila por talla (como el lienzo). */
export function ordenParaGuardar<T extends { nombre: string }>(ejes: T[]): T[] {
  return [...ejes.filter((e) => esEjeColor(e.nombre)), ...ejes.filter((e) => !esEjeColor(e.nombre))];
}

/** La pregunta de una cosa: «¿Qué tallas hay?» / «¿Y qué colores?» / «¿Qué materiales hay?», con su línea de ayuda. */
export function textosDeEje(nombre: string, segunda: boolean): { titulo: string; ayuda: string } {
  if (esEjeColor(nombre)) return { titulo: segunda ? "¿Y qué colores?" : "¿Qué colores hay?", ayuda: "Puedes poner una foto para cada uno." };
  const [articulo, ...resto] = entreLos(nombre).split(" ");
  return { titulo: `¿${segunda ? "Y q" : "Q"}ué ${resto.join(" ")} hay?`, ayuda: `Toca ${articulo} que vendes.` };
}

/**
 * ¿Se puede seguir? La foto no es obligatoria (se puede agregar luego); el nombre y el precio, sí. En «¿Cuántos tienes ahora?»
 * hace falta al menos 1 (o «Es por encargo» con cuándo llega): así la vista previa nunca dice «Agotado» mientras se crea.
 */
export function puedeSeguir(paso: PasoHistoria, d: { nombre: string; precio: string; porEncargo: boolean; encargoTexto: string; stock?: number }): boolean {
  if (paso === "nombre") return d.nombre.trim().length > 0;
  if (paso === "precio") return Number(d.precio) > 0;
  if (paso === "stock") return d.porEncargo ? d.encargoTexto.trim().length > 0 : (d.stock ?? 1) > 0;
  return true;
}

/** El título y la línea de ayuda de cada pregunta. */
export function textosDelPaso(paso: PasoHistoria, porEncargo = false): { titulo: string; ayuda: string } {
  switch (paso) {
    case "foto":
      return { titulo: "Empieza por la foto", ayuda: "La primera será la portada. Puedes sumar más después." };
    case "nombre":
      return { titulo: "¿Cómo se llama?", ayuda: "Como lo dirías en WhatsApp." };
    case "precio":
      return { titulo: "¿Cuánto cuesta?", ayuda: "Si cambia por talla o color, lo ajustas aquí." };
    case "stock":
      return porEncargo ? { titulo: "¿Cuándo llega?", ayuda: "Se puede pedir aunque no haya." } : { titulo: "¿Cuántos tienes ahora?", ayuda: "Al despachar, baja solito." };
    case "cambia":
      return { titulo: "¿En qué cambia?", ayuda: "Elige lo que cambia entre una y otra." };
    case "eje1":
    case "eje2":
      return { titulo: "", ayuda: "" };
    case "vista":
      return { titulo: "así se ve en tu catálogo", ayuda: "" };
    case "listo":
      return { titulo: "¡Ya está en tu catálogo!", ayuda: "" };
  }
}

/** El remate a mano del paso de la foto cuando todavía no hay ninguna (sin regañar: se puede seguir sin ella). */
export const SIN_FOTO = "Con foto se vende más.";

/** Las opciones rápidas de «¿Cuándo llega?». Se guardan como «Llega en …» (es lo que ve quien compra, hasta 40 letras). */
export const OPCIONES_CUANDO_LLEGA = ["3 a 5 días", "1 a 2 semanas", "1 mes"] as const;
export const textoCuandoLlega = (opcion: string) => `Llega en ${opcion}`;
/** Qué opción rápida corresponde a un texto guardado; null si es otro texto (o vacío). */
export function opcionDeCuandoLlega(texto: string): (typeof OPCIONES_CUANDO_LLEGA)[number] | null {
  return OPCIONES_CUANDO_LLEGA.find((o) => textoCuandoLlega(o) === texto.trim()) ?? null;
}

/** La línea bajo el titular de la celebración. */
export function lineaCelebracion(nombre: string, visible: boolean, arranque: string | null = null): string {
  const n = nombre.trim();
  if (!visible) return `${n} quedó guardado sin publicar. Lo prendes cuando quieras.`;
  return arranque ? `${n} ya se puede deslizar. ${arranque}` : `${n} ya se puede deslizar.`;
}

/** «Van N de 5 para arrancar.» (la guía de Inicio): solo mientras le falten. null si ya llegó o si todavía no cuenta ninguno. */
export function lineaArranque(cuentan: number, sugeridos: number = PRODUCTOS_SUGERIDOS_PARA_PUBLICAR): string | null {
  return cuentan > 0 && cuentan < sugeridos ? `Van ${cuentan} de ${sugeridos} para arrancar.` : null;
}

/** El titular a mano de la celebración (la única Caveat de esa pantalla). */
export const tituloCelebracion = (visible: boolean) => (visible ? "¡Ya está en tu catálogo!" : "¡Quedó guardado!");

/**
 * Las presentaciones quitadas a mano (en su detalle del Inventario) siguen quitadas aunque cambien otros valores. Solo vuelven las
 * de un valor que se vuelve a poner a propósito (se quitó y se elige otra vez): sacarlo y ponerlo trae sus combinaciones de nuevo.
 */
export function quitadasTrasCambiar(quitadas: string[], eje: string, antes: string[], despues: string[]): string[] {
  const vuelven = despues.filter((v) => !antes.includes(v));
  if (vuelven.length === 0) return quitadas;
  return quitadas.filter((k) => !vuelven.some((v) => k.split("|").includes(claveVariante({ [eje]: v }))));
}

/**
 * La lista de productos de la tienda con los que se acaban de crear en esta historia, aunque la consulta todavía no los traiga
 * (refresca después de guardar): así el límite del plan cuenta el recién publicado al tocar «Agregar otro».
 */
export function conLosCreados(productos: Producto[], creados: Producto[]): Producto[] {
  const nuevos = creados.filter((c) => !productos.some((p) => p.id === c.id));
  return nuevos.length === 0 ? productos : [...productos, ...nuevos];
}

/**
 * Al dejar de cambiar por una cosa (de Color × Talla a solo Talla), las cantidades no se pierden: se suman en las presentaciones
 * que quedan (S = Negro·S + Blanco·S). Un precio propio sigue solo si todas las que se juntan valían lo mismo; las ocultas no suman.
 */
export function juntarPorEjes(pres: Presentacion[], quedan: string[]): Presentacion[] {
  const grupos = new Map<string, Presentacion[]>();
  for (const p of pres) {
    const valores = Object.fromEntries(quedan.flatMap((e) => (p.valores[e] !== undefined ? [[e, p.valores[e]]] : [])));
    if (Object.keys(valores).length !== quedan.length) continue;
    const k = claveVariante(valores);
    grupos.set(k, [...(grupos.get(k) ?? []), { ...p, valores }]);
  }
  return [...grupos.values()].map((g) => {
    const activas = g.filter((p) => p.activa);
    const precios = new Set(g.map((p) => p.precio));
    return {
      valores: g[0]!.valores,
      stock: activas.reduce((t, p) => t + (p.stock ?? 0), 0),
      precio: precios.size === 1 ? g[0]!.precio : null,
      activa: activas.length > 0,
    };
  });
}

/**
 * Dejar de cambiar por una cosa con presentaciones quitadas a mano: se juntan las que quedan (`juntarPorEjes`) y una presentación
 * nueva sigue quitada solo si TODAS las que la forman estaban quitadas (si una sigue, la junta vive).
 */
export function quitarEje(todas: Presentacion[], quitadas: string[], quedan: string[]): { pres: Presentacion[]; quitadas: string[] } {
  const fuera = new Set(quitadas);
  const vivas = todas.filter((p) => !fuera.has(claveVariante(p.valores)));
  const pres = juntarPorEjes(vivas, quedan);
  const conVivas = new Set(pres.map((p) => claveVariante(p.valores)));
  const nuevasQuitadas = [...new Set(juntarPorEjes(todas, quedan).map((p) => claveVariante(p.valores)))].filter((k) => !conVivas.has(k));
  return { pres, quitadas: nuevasQuitadas };
}

/** Lo que se pierde al quitar un valor: unidades (de las visibles) y precios propios. */
export function loQueSePierde(pres: Presentacion[], eje: string, valor: string): { unidades: number; precios: number } {
  const suyas = pres.filter((p) => p.valores[eje] === valor);
  return { unidades: suyas.filter((p) => p.activa).reduce((t, p) => t + (p.stock ?? 0), 0), precios: suyas.filter((p) => p.precio !== null).length };
}

/** El aviso de lo que se pierde: «Se pierden 6 unidades del inventario.» / «Se pierde su precio propio.» / los dos juntos. */
export function textoPerdida({ unidades, precios }: { unidades: number; precios: number }): string {
  const u = unidades === 1 ? "1 unidad del inventario" : `${unidades} unidades del inventario`;
  const p = precios === 1 ? "su precio propio" : `sus ${precios} precios propios`;
  if (unidades > 0 && precios > 0) return `Se pierden ${u} y ${p}.`;
  if (unidades > 0) return `${unidades === 1 ? "Se pierde" : "Se pierden"} ${u}.`;
  return `${precios === 1 ? "Se pierde" : "Se pierden"} ${p}.`;
}

/** El total de unidades del borrador (las visibles): al volver a un solo stock, es lo que queda en el producto. */
export const totalDelBorrador = (pres: Presentacion[]) => pres.filter((p) => p.activa).reduce((t, p) => t + (p.stock ?? 0), 0);
