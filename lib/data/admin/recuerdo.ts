import type { FuenteAdmin } from "./fuente-admin";

/**
 * Última lectura de cada pantalla del admin, por fuente (la demo y la real nunca se mezclan). Al volver a una pestaña ya vista,
 * la pantalla se pinta al instante con lo último y se vuelve a leer por detrás; sin esto cada cambio de pestaña mostraba el
 * esqueleto de carga. Vive solo en memoria de esta pestaña del navegador.
 */
const recuerdos = new WeakMap<FuenteAdmin, Map<string, unknown>>();

export function recordado<T>(fuente: FuenteAdmin, clave: string): T | undefined {
  return recuerdos.get(fuente)?.get(clave) as T | undefined;
}

export function recordar<T>(fuente: FuenteAdmin, clave: string, valor: T): T {
  let mapa = recuerdos.get(fuente);
  if (!mapa) recuerdos.set(fuente, (mapa = new Map()));
  mapa.set(clave, valor);
  return valor;
}
