// Publicar mi catálogo (docs/prompts/publicar-catalogo.md): qué cuenta para poder publicar y los textos de la tarjeta.
// Sin dependencias de React: se prueba en tests/publicar-catalogo.test.mjs. La base aplica la misma regla (publicar_mi_catalogo).

import { PRODUCTOS_MINIMOS_PARA_PUBLICAR, URL_BASE_CATALOGO } from "./config";
import type { Medio } from "./types";

type ProductoParaPublicar = { activo: boolean; eliminadoEn?: string | null; medios: Pick<Medio, "tipo" | "url">[] };

/** ¿Cuenta para publicar? Visible, no eliminado y con al menos una FOTO (un video solo no basta). */
export function cuentaParaPublicar(p: ProductoParaPublicar): boolean {
  return p.activo && !p.eliminadoEn && p.medios.some((m) => m.tipo === "foto" && !!m.url);
}

/** Cuántos productos le faltan para poder publicar (0 = ya puede). */
export function faltanParaPublicar(productos: ProductoParaPublicar[], minimo: number = PRODUCTOS_MINIMOS_PARA_PUBLICAR): number {
  return Math.max(0, minimo - productos.filter(cuentaParaPublicar).length);
}

/** «Te faltan 2 productos con foto para publicar tu catálogo». */
export function textoFaltan(faltan: number): string {
  return faltan === 1
    ? "Te falta 1 producto con foto para publicar tu catálogo"
    : `Te faltan ${faltan} productos con foto para publicar tu catálogo`;
}

/** El enlace que tendrá el catálogo al publicarse (la base lo pone igual). */
export function enlaceAlPublicar(slug: string, base: string = URL_BASE_CATALOGO): string {
  return `${base}/tienda/${slug}`;
}
