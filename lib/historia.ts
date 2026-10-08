// Compartir un producto en una historia (WhatsApp, Instagram): lo que dice la imagen según los interruptores, el texto del precio,
// las presentaciones resumidas y el enlace directo al producto. Lógica pura, sin pantalla: se prueba en tests/historia.test.mjs.

import { presentacionesDe, resumenDe, type Presentacion } from "./presentaciones";
import { enlaceCatalogo } from "./enlace-catalogo";
import { colorPorNombre, esEjeColor } from "./colores";
import { precioConPromo } from "./promos";
import type { Producto, Promo, Tienda } from "./types";

/** Cuántas presentaciones caben en la imagen (una o dos líneas); el resto va como «+N». */
export const MAX_PRESENTACIONES_HISTORIA = 8;

export type OpcionesHistoria = { precio: boolean; presentaciones: boolean; fotoTienda: boolean };
export const OPCIONES_INICIALES: OpcionesHistoria = { precio: true, presentaciones: true, fotoTienda: true };

export type PrecioHistoria = {
  /** «Desde» cuando las presentaciones cuestan distinto. */
  desde: boolean;
  precio: number;
  /** El precio normal, tachado, cuando hay promo vigente. */
  antes: number | null;
};

export type ElementoPresentacion = { texto: string; color: string | null };
export type PresentacionesHistoria = { elementos: ElementoPresentacion[]; mas: number };

export type DatosHistoria = {
  nombre: string;
  precio: PrecioHistoria | null;
  presentaciones: PresentacionesHistoria | null;
  fotoTienda: boolean;
};

/** El producto tiene con qué armar la historia: una foto (la principal) que se pueda mostrar. */
export const fotoDeHistoria = (p: Pick<Producto, "fotos">): string | null => p.fotos[0] ?? null;

/** Precio de la historia: con promo, el de promo y el normal tachado; con presentaciones de precio distinto, «Desde» el más bajo. */
export function precioHistoria(producto: Producto, promos: Promo[], ahora: Date = new Date()): PrecioHistoria {
  const lista = presentacionesDe(producto);
  const resumen = (producto.tipo ?? "producto") === "producto" && producto.opciones.length > 0 ? resumenDe(lista, producto.precio) : null;
  if (resumen && resumen.total > 0 && resumen.conPrecioPropio && resumen.desde != null) {
    const p = precioConPromo({ ...producto, precio: resumen.desde }, promos, ahora);
    return { desde: true, precio: p.precio, antes: p.precioAntes };
  }
  const p = precioConPromo(producto, promos, ahora);
  return { desde: false, precio: p.precio, antes: p.precioAntes };
}

/**
 * Las presentaciones que ve el cliente, resumidas por valor: los colores conocidos como punto con su color; el resto (tallas,
 * tamaños) como pastilla. No repite un valor aunque salga en varias combinaciones. Las agotadas no se anuncian.
 */
export function presentacionesHistoria(producto: Producto, max: number = MAX_PRESENTACIONES_HISTORIA): PresentacionesHistoria | null {
  if ((producto.tipo ?? "producto") !== "producto" || producto.opciones.length === 0) return null;
  const disponibles: Presentacion[] = presentacionesDe(producto).filter((p) => p.activa && p.stock !== 0);
  if (disponibles.length === 0) return null;
  const vistos = new Set<string>();
  const colores: ElementoPresentacion[] = [];
  const otros: ElementoPresentacion[] = [];
  for (const eje of producto.opciones) {
    for (const valor of eje.valores) {
      if (!disponibles.some((p) => p.valores[eje.nombre] === valor)) continue;
      const clave = `${eje.nombre}=${valor}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const color = esEjeColor(eje.nombre) ? colorPorNombre(valor) : null;
      (color ? colores : otros).push({ texto: valor, color });
    }
  }
  const todos = [...colores, ...otros];
  if (todos.length === 0) return null;
  return { elementos: todos.slice(0, max), mas: Math.max(0, todos.length - max) };
}

/** Qué se dibuja según los interruptores. «Presentaciones» y «Precio» solo salen si el producto los tiene. */
export function datosHistoria(producto: Producto, promos: Promo[], opciones: OpcionesHistoria, ahora: Date = new Date()): DatosHistoria {
  return {
    nombre: producto.nombre,
    precio: opciones.precio ? precioHistoria(producto, promos, ahora) : null,
    presentaciones: opciones.presentaciones ? presentacionesHistoria(producto) : null,
    fotoTienda: opciones.fotoTienda,
  };
}

/** ¿Tiene presentaciones que mostrar? Si no, el interruptor «Presentaciones» no hace falta. */
export const tienePresentaciones = (producto: Producto) => presentacionesHistoria(producto) !== null;

/** Enlace directo al producto en el catálogo público, con `?ref=historia` (el catálogo lo ignora). null si la tienda no tiene enlace válido. */
export function enlaceProductoHistoria(urlCatalogo: string | null | undefined, slug: string): string | null {
  const base = enlaceCatalogo(urlCatalogo);
  if (!base) return null;
  const u = new URL(base.href);
  u.searchParams.set("ref", "historia");
  u.hash = `p/${slug}`;
  return u.href;
}

/** La dirección corta que se escribe en la imagen: «dominio/ruta», sin https, sin parámetros ni gancho. */
export function direccionCorta(urlCatalogo: string | null | undefined): string | null {
  const e = enlaceCatalogo(urlCatalogo);
  if (!e) return null;
  const ruta = new URL(e.href).pathname.replace(/\/$/, "");
  return `${e.dominio}${ruta}`;
}

export type DireccionHistoria = { dominio: string; ruta: string | null };

/** La dirección en dos partes para escribirla en la imagen sin cortarla: el dominio completo y, debajo, la ruta («/tienda/esencias»). Sin https. */
export function direccionEnLineas(urlCatalogo: string | null | undefined): DireccionHistoria | null {
  const e = enlaceCatalogo(urlCatalogo);
  if (!e) return null;
  const ruta = new URL(e.href).pathname.replace(/\/$/, "");
  return { dominio: e.dominio, ruta: ruta || null };
}

/** Texto de WhatsApp: «Majestic Oud · Pídelo aquí: https://…». */
export const textoWhatsAppHistoria = (nombre: string, enlace: string) => `${nombre} · Pídelo aquí: ${enlace}`;

export const AVISO_SIN_PUBLICAR = "Tu catálogo aún no está publicado: el enlace no abrirá.";
export const AVISO_INSTAGRAM = "Copiamos el enlace: pégalo con el sticker «Enlace».";

/** El catálogo está publicado y la tienda no está en pausa: el enlace del producto abre. */
export const catalogoAbre = (tienda: Pick<Tienda, "catalogoEstado" | "estado" | "urlCatalogo">) =>
  tienda.catalogoEstado === "publicado" && tienda.estado !== "pausada" && enlaceCatalogo(tienda.urlCatalogo) !== null;
