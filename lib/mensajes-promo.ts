// Mensajes y enlaces para compartir una promo con los clientes. Las plantillas viven aquí, no en los componentes.

import { fechaLarga } from "./formato";
import type { EstadoPromo, Producto, Promo, Tienda } from "./types";

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
export function mensajePromo(promo: Promo, estado: EstadoPromo, tienda: Pick<Tienda, "nombre" | "urlCatalogo">, producto?: Producto): string {
  const n = promo.valorPorcentaje ?? 0;
  const v = vigencia(promo, estado);
  // El enlace va solo si la tienda tiene el "Enlace de tu catálogo" (Mi marca); si no, se quita la frase.
  const cierre = tienda.urlCatalogo ? ` Míralo aquí: ${tienda.urlCatalogo}` : "";
  if (promo.tipo === "codigo") {
    const valido = v ? ` Válido ${v}.` : "";
    return `🎁 ¡Tenemos una promo para ti en ${tienda.nombre}! Usa el código ${promo.codigo} y llévate ${n}% de descuento en todo tu pedido.${valido}${cierre}`;
  }
  if (promo.tipo === "coleccion") {
    // "del 25 de septiembre al 3 de octubre" (ya empezada: también, si hay fin)
    const fin = promo.fechaFin ? fechaLarga(promo.fechaFin) : null;
    const cuando = estado === "programada" ? (v ? `, ${v}` : "") : fin ? `, del ${fechaLarga(promo.fechaInicio)} al ${fin}` : "";
    return `✨ ${n}% de descuento en ${promo.coleccion} en ${tienda.nombre}${cuando}.${cierre}`;
  }
  const cuando = v ? `, ${v}` : "";
  return `💚 ${producto?.nombre ?? "Un producto"} con ${n}% de descuento en ${tienda.nombre}${cuando}.${cierre}`;
}
