// Publicar mi catálogo (docs/prompts/publicar-catalogo.md, docs/17-onboarding.md): qué productos cuentan y los textos de la
// confirmación. Sin mínimo: se publica aunque esté vacío; con menos de los sugeridos se pide una confirmación suave.
// Sin dependencias de React: se prueba en tests/publicar-catalogo.test.mjs.

import { PRODUCTOS_SUGERIDOS_PARA_PUBLICAR, URL_BASE_CATALOGO } from "./config";
import type { Medio } from "./types";

type ProductoParaPublicar = { activo: boolean; eliminadoEn?: string | null; medios: Pick<Medio, "tipo" | "url">[] };

/** ¿Cuenta como producto del catálogo? Visible, no eliminado y con al menos una FOTO (un video solo no basta). */
export function cuentaParaPublicar(p: ProductoParaPublicar): boolean {
  return p.activo && !p.eliminadoEn && p.medios.some((m) => m.tipo === "foto" && !!m.url);
}

/** Cuántos productos visibles con foto tiene la tienda. */
export const productosQueCuentan = (productos: ProductoParaPublicar[]) => productos.filter(cuentaParaPublicar).length;

/** ¿Antes de publicar se pregunta? Solo con menos de los sugeridos; nunca impide publicar. */
export const pideConfirmarPublicar = (n: number, sugeridos: number = PRODUCTOS_SUGERIDOS_PARA_PUBLICAR) => n < sugeridos;

/** «Tu catálogo está vacío» / «Tu catálogo tiene 1 producto» / «Tu catálogo tiene 3 productos». */
export function tituloConfirmarPublicar(n: number): string {
  if (n <= 0) return "Tu catálogo está vacío";
  return n === 1 ? "Tu catálogo tiene 1 producto" : `Tu catálogo tiene ${n} productos`;
}

/** El enlace que tendrá el catálogo al publicarse (la base lo pone igual). */
export function enlaceAlPublicar(slug: string, base: string = URL_BASE_CATALOGO): string {
  return `${base}/tienda/${slug}`;
}

/** El catálogo publicado sin productos todavía (también en «Ver cómo queda»): un «pronto», nunca algo roto. */
export const textoCatalogoPronto = (tienda: string) => `Pronto, aquí van los productos de ${tienda}.`;
export const SUBTEXTO_CATALOGO_PRONTO = "Guarda este enlace: lo que viene te va a gustar.";
