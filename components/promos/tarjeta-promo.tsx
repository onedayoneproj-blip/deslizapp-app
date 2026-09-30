import Link from "next/link";
import { datosCupon } from "@/lib/cupon";
import { diaMesCorto } from "@/lib/formato";
import { estadoVisible, type EstadoVisiblePromo } from "@/lib/promos";
import type { Producto, Promo } from "@/lib/types";
import { TicketPromo } from "./ticket-promo";

// Tarjeta de promo estilo CUPÓN (opción C del diseño: referencias/promos-cupon/opcion-c-ticket-verde.dc.html).
// Medidas y colores copiados de esa referencia. La sombra va en el contenedor con `filter: drop-shadow` para
// que siga la forma recortada por la máscara (una box-shadow no seguiría las muescas).

/** "del 25 sept al 3 oct" para lectores de pantalla. */
const fechasHablado = (inicio: string, fin: string | null) => (fin ? `del ${diaMesCorto(inicio)} al ${diaMesCorto(fin)}` : `desde el ${diaMesCorto(inicio)}`);

/**
 * Promo en la lista de Promos (y en la vista previa de "Nueva promo"). Un solo componente con la variante
 * por estado: activa y programada (verde bosque) o terminada (crema apagado). Con `href` es un enlace
 * (abre el detalle o la edición); sin `href` es solo una imagen (vista previa).
 */
export function TarjetaPromo({
  promo,
  estado: estadoProp,
  producto,
  productosDeColeccion = 0,
  usos = null,
  href,
  ahora = new Date(),
}: {
  promo: Promo;
  estado?: EstadoVisiblePromo;
  /** El producto de una promo "por producto" (para el detalle). */
  producto?: Producto;
  productosDeColeccion?: number;
  /** Pedidos que usaron el código (solo promos de código). */
  usos?: number | null;
  href?: string;
  ahora?: Date;
}) {
  const estado = estadoProp ?? estadoVisible(promo, usos, ahora);
  // Terminada, pausada y agotada se ven apagadas (crema): ya no se aplican.
  const terminada = estado === "terminada" || estado === "pausada" || estado === "agotada";
  const d = datosCupon(promo, estado, { producto, productosDeColeccion, usos, ahora });
  const pct = promo.valorPorcentaje;

  const etiqueta = `${promo.tipo === "codigo" ? `Código ${promo.codigo}` : promo.nombre}, ${pct ?? "sin"}% de descuento, ${estado}, ${fechasHablado(promo.fechaInicio, promo.fechaFin)}${
    promo.tipo === "codigo" && usos !== null
      ? promo.limiteUsos !== null
        ? `, usada ${usos} de ${promo.limiteUsos} pedidos`
        : `, usada en ${usos} ${usos === 1 ? "pedido" : "pedidos"}`
      : ""
  }`;

  const tarjeta = <TicketPromo d={d} apagado={terminada} />;

  const sombra = terminada ? "drop-shadow(0 4px 8px rgba(23,75,58,0.1))" : "drop-shadow(0 8px 12px rgba(23,75,58,0.22))";
  const contenedor = "transition-[scale] duration-(--mov-rapida) ease-(--curva-salida)";
  if (!href) {
    return (
      <div role="img" aria-label={etiqueta} className={contenedor} style={{ filter: sombra }}>
        {tarjeta}
      </div>
    );
  }
  return (
    <Link href={href} scroll={false} className={`block active:scale-[0.98] ${contenedor}`} style={{ filter: sombra }}>
      {tarjeta}
    </Link>
  );
}
