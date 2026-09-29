// Mensajes y enlaces para compartir una promo con los clientes. Las plantillas viven aquí, no en los componentes.

import { URL_CATALOGO_PUBLICO } from "./config";
import { fechaLarga } from "./formato";
import type { EstadoPromo, Producto, Promo, Tienda } from "./types";

/** Enlace al catálogo público de la tienda, con el parámetro de la promo (código, colección o producto). */
export function enlacePromo(tienda: Pick<Tienda, "slug">, promo: Promo): string {
  const base = `${URL_CATALOGO_PUBLICO}/${tienda.slug}`;
  if (promo.tipo === "codigo" && promo.codigo) return `${base}?promo=${encodeURIComponent(promo.codigo)}`;
  if (promo.tipo === "coleccion" && promo.coleccion) return `${base}?coleccion=${encodeURIComponent(promo.coleccion)}`;
  if (promo.tipo === "producto" && promo.productoId) return `${base}?producto=${encodeURIComponent(promo.productoId)}`;
  return base;
}

/**
 * "Del 25 de septiembre al 3 de octubre" / "Hasta el 3 de octubre" / "Desde el 25 de septiembre" / "" según
 * las fechas y si la promo ya empezó. Sin fecha de fin y ya activa: sin frase de vigencia.
 */
function vigencia(promo: Promo, estado: EstadoPromo): string {
  const inicio = fechaLarga(promo.fechaInicio);
  const fin = promo.fechaFin ? fechaLarga(promo.fechaFin) : null;
  if (estado === "programada") return fin ? `del ${inicio} al ${fin}` : `desde el ${inicio}`;
  return fin ? `hasta el ${fin}` : "";
}

/** El mensaje de texto (editable por la persona antes de compartir). */
export function mensajePromo(promo: Promo, estado: EstadoPromo, tienda: Pick<Tienda, "nombre" | "slug">, producto?: Producto): string {
  const n = promo.valorPorcentaje ?? 0;
  const enlace = enlacePromo(tienda, promo);
  const v = vigencia(promo, estado);
  const cierre = `Míralo aquí: ${enlace}`;
  if (promo.tipo === "codigo") {
    const valido = v ? ` Válido ${v}.` : "";
    return `🎁 ¡Tenemos una promo para ti en ${tienda.nombre}! Usa el código ${promo.codigo} y llévate ${n}% de descuento en todo tu pedido.${valido} ${cierre}`;
  }
  if (promo.tipo === "coleccion") {
    // "del 25 de septiembre al 3 de octubre" (ya empezada: también, si hay fin)
    const fin = promo.fechaFin ? fechaLarga(promo.fechaFin) : null;
    const cuando = estado === "programada" ? (v ? `, ${v}` : "") : fin ? `, del ${fechaLarga(promo.fechaInicio)} al ${fin}` : "";
    return `✨ ${n}% de descuento en ${promo.coleccion} en ${tienda.nombre}${cuando}. ${cierre}`;
  }
  const cuando = v ? `, ${v}` : "";
  return `💚 ${producto?.nombre ?? "Un producto"} con ${n}% de descuento en ${tienda.nombre}${cuando}. ${cierre}`;
}

/** Enlace para abrir WhatsApp con el mensaje listo; la persona elige el chat. */
export const enlaceWhatsAppMensaje = (mensaje: string) => `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
