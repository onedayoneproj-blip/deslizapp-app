// Crear producto «como una historia» (docs/prompts/crear-producto-historia.md): una pregunta por pantalla. Las reglas puras de los
// pasos, sus textos, «¿Cuándo llega?» y la celebración. Sin React: se prueba en tests/historia-producto.test.mjs.
import { PRODUCTOS_SUGERIDOS_PARA_PUBLICAR } from "./config";

/** Los momentos de la historia. «listo» es la celebración: no lleva barra propia. */
export type PasoHistoria = "foto" | "nombre" | "precio" | "stock" | "vista" | "listo";

/** Los pasos con barra, en orden. Un servicio no lleva stock ni encargo: se salta «¿Cuántos tienes ahora?». */
export function pasosDeHistoria(servicio = false): Exclude<PasoHistoria, "listo">[] {
  return servicio ? ["foto", "nombre", "precio", "vista"] : ["foto", "nombre", "precio", "stock", "vista"];
}

/** El paso que sigue (después de «vista» viene la celebración, que se alcanza guardando). */
export function pasoSiguiente(paso: PasoHistoria, servicio = false): PasoHistoria {
  const pasos: PasoHistoria[] = [...pasosDeHistoria(servicio), "listo"];
  const i = pasos.indexOf(paso);
  return pasos[Math.min(pasos.length - 1, i + 1)]!;
}

/** El paso de atrás («foto» no tiene; la celebración tampoco: ya se guardó). */
export function pasoAnterior(paso: PasoHistoria, servicio = false): PasoHistoria | null {
  if (paso === "listo") return null;
  const pasos = pasosDeHistoria(servicio);
  const i = pasos.indexOf(paso);
  return i > 0 ? pasos[i - 1]! : null;
}

/** Cuántas barras van llenas: las de los pasos hechos y la del paso en que se está. En la celebración, todas. */
export function barrasLlenas(paso: PasoHistoria, servicio = false): number {
  const pasos = pasosDeHistoria(servicio);
  return paso === "listo" ? pasos.length : pasos.indexOf(paso) + 1;
}

/** ¿Se puede seguir? La foto no es obligatoria (se puede agregar luego); el nombre y el precio, sí. */
export function puedeSeguir(paso: PasoHistoria, d: { nombre: string; precio: string; porEncargo: boolean; encargoTexto: string }): boolean {
  if (paso === "nombre") return d.nombre.trim().length > 0;
  if (paso === "precio") return Number(d.precio) > 0;
  if (paso === "stock") return !d.porEncargo || d.encargoTexto.trim().length > 0;
  return true;
}

/** El título y la línea de ayuda de cada pregunta. */
export function textosDelPaso(paso: PasoHistoria, porEncargo = false): { titulo: string; ayuda: string } {
  switch (paso) {
    case "foto":
      return { titulo: "Empieza por la foto", ayuda: "La primera es la portada. Puedes sumar más." };
    case "nombre":
      return { titulo: "¿Cómo se llama?", ayuda: "Como lo dirías en WhatsApp." };
    case "precio":
      return { titulo: "¿Cuánto cuesta?", ayuda: "Si cambia por talla o color, lo ajustas aquí." };
    case "stock":
      return porEncargo ? { titulo: "¿Cuándo llega?", ayuda: "Se puede pedir aunque no haya." } : { titulo: "¿Cuántos tienes ahora?", ayuda: "Al despachar, baja solito." };
    case "vista":
      return { titulo: "Así se ve en tu catálogo", ayuda: "Lo demás es opcional." };
    case "listo":
      return { titulo: "¡Ya está en tu catálogo!", ayuda: "" };
  }
}

/** La línea del paso de la foto cuando todavía no hay ninguna. */
export const SIN_FOTO = "Sin foto se vende menos. Puedes agregarla luego.";

/** Las opciones rápidas de «¿Cuándo llega?». Se guardan como «Llega en …» (es lo que ve quien compra, hasta 40 letras). */
export const OPCIONES_CUANDO_LLEGA = ["3 a 5 días", "1 a 2 semanas", "1 mes"] as const;
export const textoCuandoLlega = (opcion: string) => `Llega en ${opcion}`;
/** Qué opción rápida corresponde a un texto guardado; null si es otro texto (o vacío). */
export function opcionDeCuandoLlega(texto: string): (typeof OPCIONES_CUANDO_LLEGA)[number] | null {
  return OPCIONES_CUANDO_LLEGA.find((o) => textoCuandoLlega(o) === texto.trim()) ?? null;
}

/** La línea bajo el titular de la celebración. */
export function lineaCelebracion(nombre: string, visible: boolean): string {
  const n = nombre.trim();
  return visible ? `${n} ya se puede deslizar.` : `${n} quedó guardado sin publicar. Lo prendes cuando quieras.`;
}

/** «Van N de 5 para arrancar.» (la guía de Inicio): solo mientras le falten. null si ya llegó o si todavía no cuenta ninguno. */
export function lineaArranque(cuentan: number, sugeridos: number = PRODUCTOS_SUGERIDOS_PARA_PUBLICAR): string | null {
  return cuentan > 0 && cuentan < sugeridos ? `Van ${cuentan} de ${sugeridos} para arrancar.` : null;
}

/** El titular a mano de la celebración (la única Caveat de esa pantalla). */
export const tituloCelebracion = (visible: boolean) => (visible ? "¡Ya está en tu catálogo!" : "¡Quedó guardado!");
