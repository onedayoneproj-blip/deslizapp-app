// El pedido del catálogo en el panel (docs/12 §6; docs/prompts/pedido-catalogo-panel.md): el estado que ve el comprador, la
// disponibilidad de lo que pidió cuando la tienda lo va a registrar, el borrador del registro (Quitar / Por encargo) con la
// misma cuenta que la RPC `registrar_solicitud`, y la única excepción del selector de cliente. Puro: tests/pedido-catalogo.test.mjs.

import { diaMesCorto, horaCorta } from "./formato";
import { NOMBRE_PRODUCTO, type Rubro } from "./rubros";
import { normalizarTelefonoDO } from "./telefono";
import type { ItemSolicitud, Producto, VistaSolicitud } from "./types";

// ---- Lo que ve el comprador ----

/** El paso de la barra: 1 Enviado · 2 Confirmado · 3 Despachado; 0 sin pasos (cancelado). */
export type EstadoComprador = {
  estado: VistaSolicitud["estado"];
  titulo: string;
  linea: string;
  paso: 0 | 1 | 2 | 3;
};

/** "3 perfumes" · "1 prenda" (la cantidad real de unidades y el sustantivo del rubro). */
export function cantidadConSustantivo(items: Pick<ItemSolicitud, "cantidad">[], rubro: Rubro | null): string {
  const n = items.reduce((t, i) => t + i.cantidad, 0);
  const nombre = NOMBRE_PRODUCTO[rubro ?? "general"] ?? NOMBRE_PRODUCTO.general;
  return `${n} ${n === 1 ? nombre.singular : nombre.plural}`;
}

/** "hoy a las 3:20 p. m." · "ayer a las 9:05 a. m." · "el 2 oct a las 5:40 p. m." (hora de Santo Domingo). */
export function cuandoSalio(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(d);
  const dias = Math.round((Date.parse(dia(ahora)) - Date.parse(dia(fecha))) / 86_400_000);
  const cuando = dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `el ${diaMesCorto(iso)}`;
  return `${cuando} a las ${horaCorta(fecha)}`;
}

/**
 * El título, la línea corta y el paso de la hoja de estado (tableros Comprador y Estados). Quien vende: el nombre de la
 * vendedora si la tienda lo puso; si no, el de la tienda. Sin `despachadoEn` no se inventa la hora.
 */
export function estadoComprador(v: Pick<VistaSolicitud, "estado" | "items" | "despachadoEn" | "tienda">, ahora: Date = new Date()): EstadoComprador {
  const quien = v.tienda.nombreVendedora?.trim() || v.tienda.nombre;
  const cuantos = cantidadConSustantivo(v.items, v.tienda.rubro);
  switch (v.estado) {
    case "enviado":
      return { estado: v.estado, titulo: `Le llegó a ${quien}`, linea: `${cuantos} · te responde por WhatsApp`, paso: 1 };
    case "confirmado":
      return { estado: v.estado, titulo: `${quien} lo confirmó`, linea: `${cuantos} · ya lo tiene anotado`, paso: 2 };
    case "despachado":
      return {
        estado: v.estado,
        titulo: "Va en camino",
        linea: v.despachadoEn ? `${cuantos} · salió ${cuandoSalio(v.despachadoEn, ahora)}` : `${cuantos} · ya salió`,
        paso: 3,
      };
    case "cancelado":
      return { estado: v.estado, titulo: "Se canceló", linea: `Si fue un error, escríbele a ${quien}.`, paso: 0 };
    case "vencido":
      return { estado: v.estado, titulo: "Este pedido venció", linea: "Nadie lo registró en 7 días. Si todavía te interesa, vuélvelo a armar.", paso: 0 };
  }
}

// ---- Registrar: disponibilidad de hoy ----

/**
 * Cómo está hoy cada línea de lo que pidió: `ok`; `agotado` (esa variante o el producto en 0); `menos` (quedan menos que la
 * cantidad: `quedan`); `no_esta` (el producto o la variante ya no existe, o se ocultó/desactivó). Stock null = sin control.
 * Una línea que ya venía por encargo no pide atención por stock.
 */
export type Disponibilidad = { tipo: "ok" } | { tipo: "agotado" } | { tipo: "menos"; quedan: number } | { tipo: "no_esta"; motivo: "borrado" | "oculto" };

export function disponibilidadDeLinea(item: ItemSolicitud, productos: Producto[]): Disponibilidad {
  const p = productos.find((x) => x.id === item.productoId);
  if (!p) return { tipo: "no_esta", motivo: "borrado" };
  const variante = item.varianteId ? p.variantes?.find((v) => v.id === item.varianteId) : null;
  if (item.varianteId && !variante) return { tipo: "no_esta", motivo: "borrado" };
  if (!p.activo || (variante && !variante.activa) || (!item.varianteId && p.variantes?.some(v => v.activa))) return { tipo: "no_esta", motivo: "oculto" };
  if (item.porEncargo) return { tipo: "ok" };
  const stock = variante ? variante.stock : p.stock;
  if (stock === null || stock >= item.cantidad) return { tipo: "ok" };
  if (stock <= 0) return { tipo: "agotado" };
  return { tipo: "menos", quedan: stock };
}

/** La llave de una línea para Quitar / Por encargo: la variante si la tiene (el producto quitaría todas sus variantes). */
export const llaveDeLinea = (i: Pick<ItemSolicitud, "productoId" | "varianteId">) => i.varianteId ?? i.productoId;

/** El encargo de esa línea, si el producto lo trae ("Llega en 7 a 10 días"). */
export const textoEncargoDe = (item: ItemSolicitud, productos: Producto[]) => productos.find((p) => p.id === item.productoId)?.encargoTexto ?? null;

// ---- Registrar: el borrador ----

export type Borrador = { quitar: string[]; encargo: string[] };

/**
 * Las líneas que quedan y el total con las decisiones de la tienda, con la misma cuenta que `registrar_solicitud`: el
 * descuento del código, en proporción a lo que queda (redondeado). Los precios son los de la solicitud, nunca los de hoy.
 */
export function totalDelBorrador(s: { items: ItemSolicitud[]; descuento: number }, b: Borrador) {
  const quitar = new Set(b.quitar);
  const encargo = new Set(b.encargo);
  const subtotalAntes = s.items.reduce((t, i) => t + i.precioUnitario * i.cantidad, 0);
  const quedan = s.items
    .filter((i) => !quitar.has(llaveDeLinea(i)) && !quitar.has(i.productoId))
    .map((i) => (encargo.has(llaveDeLinea(i)) || encargo.has(i.productoId) ? { ...i, porEncargo: true } : i));
  const subtotal = quedan.reduce((t, i) => t + i.precioUnitario * i.cantidad, 0);
  const descuento = subtotalAntes > 0 ? Math.round((s.descuento * subtotal) / subtotalAntes) : 0;
  return { quedan, subtotal, descuento, total: subtotal - descuento };
}

// ---- Selector de cliente ----

/**
 * La única excepción a "Nuevo cliente / Crear «…» siempre primero": lo escrito es un WhatsApp completo y válido que ya es de
 * un cliente de la tienda. Entonces no se ofrece crear (sería un duplicado): solo ese cliente. "809 555" no es un número.
 */
export function clienteDelTelefono<C extends { telefono: string | null }>(clientes: C[], consulta: string): C | null {
  const numero = normalizarTelefonoDO(consulta);
  if (!numero) return null;
  return clientes.find((c) => c.telefono !== null && normalizarTelefonoDO(c.telefono) === numero) ?? null;
}
