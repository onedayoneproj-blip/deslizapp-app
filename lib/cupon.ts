// Lo que muestra un cupón de promo (la tarjeta de la lista y la imagen para compartir), en un solo lugar.

import { formatearPesos, rangoFechas } from "./formato";
import type { EstadoVisiblePromo } from "./promos";
import type { Producto, Promo } from "./types";

const DIA_MS = 24 * 60 * 60 * 1000;

export const ETIQUETA_TIPO = { codigo: "Código", coleccion: "Por colección", producto: "Por producto" } as const;

export type DatosCupon = {
  /** Porcentaje o "–" si todavía no hay uno válido. */
  porcentaje: string;
  /** Lo que va bajo el %: DE DESCUENTO / PROGRAMADA / TERMINADA / PAUSADA / AGOTADA. */
  bajoPorcentaje: string;
  tipo: string;
  /** El nombre, o el código (que va en caja punteada). */
  titulo: string;
  esCodigo: boolean;
  detalle: string;
  fechas: string;
  /** Lado derecho de la fila de fechas ("Usada en 2 pedidos", "Empieza en 3 días"). */
  aviso: string | null;
};

export function datosCupon(
  promo: Promo,
  estado: EstadoVisiblePromo,
  {
    producto,
    productosDeColeccion = 0,
    usos = null,
    ahora = new Date(),
  }: { producto?: Producto; productosDeColeccion?: number; usos?: number | null; ahora?: Date } = {},
): DatosCupon {
  const pct = promo.valorPorcentaje;
  let detalle: string;
  if (promo.tipo === "coleccion") detalle = `Colección ${promo.coleccion ?? "…"} · ${productosDeColeccion} ${productosDeColeccion === 1 ? "producto" : "productos"}`;
  else if (promo.tipo === "producto") {
    const precio = producto ? producto.precio - Math.round((producto.precio * (pct ?? 0)) / 100) : null;
    detalle = producto ? `${producto.nombre} · ${formatearPesos(precio ?? producto.precio)}` : "Un producto";
  } else detalle = promo.nombre && promo.nombre !== promo.codigo ? `${promo.nombre} · En todo el pedido` : "En todo el pedido";

  const dias = Math.ceil((Date.parse(promo.fechaInicio) - ahora.getTime()) / DIA_MS);
  const aviso =
    estado === "programada" && dias >= 1 && dias < 7
      ? `Empieza en ${dias} ${dias === 1 ? "día" : "días"}`
      : promo.tipo === "codigo" && usos !== null && estado !== "programada"
        ? promo.limiteUsos !== null
          ? `Usada ${usos} de ${promo.limiteUsos} pedidos`
          : `Usada ${usos} ${usos === 1 ? "pedido" : "pedidos"}`
        : null;

  return {
    porcentaje: pct === null ? "–" : String(pct),
    bajoPorcentaje: { terminada: "TERMINADA", programada: "PROGRAMADA", pausada: "PAUSADA", agotada: "AGOTADA", activa: "DE DESCUENTO" }[estado],
    tipo: ETIQUETA_TIPO[promo.tipo],
    titulo: promo.tipo === "codigo" ? promo.codigo || "CÓDIGO" : promo.nombre || "Nombre de tu promo",
    esCodigo: promo.tipo === "codigo",
    detalle,
    fechas: rangoFechas(promo.fechaInicio, promo.fechaFin),
    aviso,
  };
}
