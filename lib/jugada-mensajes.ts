// Mensajes de "Escribirle a {nombre}" (Tu próxima jugada): con un código o con productos. El saludo usa borradoresJugada
// (lib/proxima-jugada.ts). Puro, con pruebas en tests/jugada-mensajes.test.mjs.

import { enlaceCatalogo } from "./enlace-catalogo.ts";

const pesos = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const rd = (monto: number) => `RD$${pesos.format(monto)}`;

/** "¡Hola, Luisanna! Soy Michel de Esencias Michel." (el mismo inicio de los saludos). */
export function inicioMensaje(cliente: string, vendedora: string, tienda: string): string {
  const nombre = cliente.trim().split(/\s+/)[0] || "";
  const firma = vendedora.trim() ? `Soy ${vendedora.trim()} de ${tienda.trim() || "la tienda"}.` : `Te escribo de ${tienda.trim() || "la tienda"}.`;
  return `${nombre ? `¡Hola, ${nombre}!` : "¡Hola!"} ${firma}`;
}

/** Con un código: el código, el porcentaje, cuántos días dura (si se sabe) y el enlace del catálogo si existe. */
export function mensajeCodigo(d: {
  cliente: string;
  vendedora: string;
  tienda: string;
  codigo: string;
  porcentaje: number;
  dias?: number | null;
  urlCatalogo?: string | null;
}): string {
  const enlace = enlaceCatalogo(d.urlCatalogo)?.href;
  const vence = d.dias ? ` Vale por ${d.dias} ${d.dias === 1 ? "día" : "días"}.` : "";
  return [
    `${inicioMensaje(d.cliente, d.vendedora, d.tienda)} Te guardé un ${d.porcentaje} % de descuento para tu próximo pedido con el código ${d.codigo}.${vence}`,
    enlace ? `Mira el catálogo aquí: ${enlace}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Con productos: una línea por producto ("• Nombre · RD$1,200") y, debajo, su enlace en el catálogo (sin url_catalogo, sin enlaces). */
export function mensajeProductos(d: {
  cliente: string;
  vendedora: string;
  tienda: string;
  productos: { id: string; nombre: string; precio: number }[];
  urlCatalogo?: string | null;
}): string {
  const enlace = enlaceCatalogo(d.urlCatalogo)?.href;
  const lineas = d.productos.flatMap((p) => [`• ${p.nombre} · ${rd(p.precio)}`, ...(enlace ? [`${enlace}#p/${p.id}`] : [])]);
  return [`${inicioMensaje(d.cliente, d.vendedora, d.tienda)} Pensé en ti con ${d.productos.length === 1 ? "esto" : "estos"}:`, ...lineas].join("\n");
}

/** Cambia el código viejo por el nuevo en un texto que la persona editó (si el código vuelve distinto de la base). */
export function reemplazarCodigo(texto: string, viejo: string, nuevo: string): string {
  if (!viejo || viejo === nuevo) return texto;
  return texto.split(viejo).join(nuevo);
}
