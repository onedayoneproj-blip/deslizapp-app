import { formatearPesos } from "@/lib/formato";
import type { EstadoPedido, PedidoConItems, PedidoItem, Producto } from "@/lib/types";
import { Etiqueta, type TonoEtiqueta } from "../ui";

/** Etiqueta de estado (docs/09 §11): Nuevo = atención (pide acción), Despachado = éxito; Por despachar y Cancelado, neutras (los distingue el texto). */
export const ESTADO_PEDIDO: Record<EstadoPedido, { texto: string; tono: TonoEtiqueta }> = {
  nuevo: { texto: "Nuevo", tono: "atencion" },
  por_despachar: { texto: "Por despachar", tono: "neutro" },
  despachado: { texto: "Despachado", tono: "exito" },
  cancelado: { texto: "Cancelado", tono: "neutro" },
};

export function ChipEstado({ estado }: { estado: EstadoPedido }) {
  const { texto, tono } = ESTADO_PEDIDO[estado];
  return <Etiqueta tono={tono}>{texto}</Etiqueta>;
}

/**
 * La etiqueta de pago de un pedido: "Al contado" (éxito) o "A crédito" (atención). Con `distinguirPagado`, un pedido a crédito sin
 * saldo se llama "Pagado" (éxito), como en la tarjeta de la factura. Una sola definición para la hoja del pedido y la factura.
 */
export function etiquetaDePago(pedido: Pick<PedidoConItems, "pagoModo" | "saldo">, distinguirPagado = false): { texto: string; tono: TonoEtiqueta } {
  if (pedido.pagoModo !== "credito") return { texto: "Al contado", tono: "exito" };
  if (distinguirPagado && pedido.saldo === 0) return { texto: "Pagado", tono: "exito" };
  return { texto: "A crédito", tono: "atencion" };
}

export function EtiquetaPago({ pedido }: { pedido: Pick<PedidoConItems, "pagoModo" | "saldo"> }) {
  const { texto, tono } = etiquetaDePago(pedido);
  return <Etiqueta tono={tono}>{texto}</Etiqueta>;
}

/** Debajo del nombre de un producto del pedido: la variante ("M · Negro"), y cuántos a qué precio. */
export const detalleDeItem = (i: Pick<PedidoItem, "varianteTexto" | "cantidad" | "precioUnitario">) =>
  `${i.varianteTexto ? `${i.varianteTexto} · ` : ""}${i.cantidad} × ${formatearPesos(i.precioUnitario)}`;

/** "Por encargo" bajo un producto del pedido que no descuenta stock (docs/12). */
export const pieDeItem = (i: Pick<PedidoItem, "porEncargo">) => (i.porEncargo ? <Etiqueta tono="atencion">Por encargo</Etiqueta> : undefined);

/** El stock que le toca a un producto del pedido: el de su variante si la tiene; undefined si va por encargo o ya no existe. */
export function stockDeItem(producto: Producto | undefined, i: Pick<PedidoItem, "varianteId" | "porEncargo">): number | null | undefined {
  if (!producto || i.porEncargo) return undefined;
  if (!i.varianteId) return producto.stock;
  return producto.variantes?.find((v) => v.id === i.varianteId)?.stock;
}
