import Link from "next/link";
import { datosCupon } from "@/lib/cupon";
import { diaMesCorto } from "@/lib/formato";
import { estadoVisible, type EstadoVisiblePromo } from "@/lib/promos";
import type { Producto, Promo } from "@/lib/types";

// Tarjeta de promo estilo CUPÓN (opción C del diseño: referencias/promos-cupon/opcion-c-ticket-verde.dc.html).
// Medidas y colores copiados de esa referencia. La sombra va en el contenedor con `filter: drop-shadow` para
// que siga la forma recortada por la máscara (una box-shadow no seguiría las muescas).

/** Muescas semicirculares (radio 10) arriba y abajo, a 116 px del borde izquierdo, recortadas de verdad. */
const MASCARA =
  "radial-gradient(circle 10px at 116px 0, #0000 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 10px at 116px 100%, #0000 98%, #000) bottom / 100% 51% no-repeat";

/** El diseño usa Fredoka normal; `.font-display` ensancha (font-stretch 115 %) y esta clase no la gana. */
const SIN_ENSANCHAR = { fontStretch: "100%" } as const;

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

  const tarjeta = (
    <div
      className={`relative flex h-[148px] rounded-[18px] ${terminada ? "bg-[#E4DDCC] text-bosque/65" : "bg-bosque text-papel"}`}
      style={{ WebkitMask: MASCARA, mask: MASCARA }}
    >
      {/* Talón: el porcentaje */}
      <div className="flex w-[116px] flex-none flex-col items-center justify-center gap-0.5">
        <span style={SIN_ENSANCHAR} className={`font-display text-[44px] leading-none font-bold ${terminada ? "text-bosque/45" : "text-mandarina"}`}>{d.porcentaje}%</span>
        <span className={`text-[10px] font-bold tracking-[0.1em] ${terminada ? "text-bosque/60" : "text-papel/75"}`}>
          {d.bajoPorcentaje}
        </span>
      </div>
      {/* Perforación */}
      <div aria-hidden="true" className={`absolute top-[18px] bottom-[18px] left-[115px] border-l-2 border-dashed ${terminada ? "border-bosque/25" : "border-papel/40"}`} />
      {/* Cuerpo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-[18px] pl-[26px]">
        <span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${terminada ? "" : "text-rosa"}`}>{d.tipo}</span>
        {d.esCodigo ? (
          <span
            style={SIN_ENSANCHAR}
            className={`max-w-full self-start truncate rounded-[10px] border-2 border-dashed px-3 py-1 font-display text-[20px] leading-[1.2] font-semibold tracking-[0.08em] ${
              terminada ? "border-bosque/65" : "border-rosa text-rosa"
            }`}
          >
            {d.titulo}
          </span>
        ) : (
          <span style={SIN_ENSANCHAR} className="truncate font-display text-[21px] leading-[1.15] font-semibold">{d.titulo}</span>
        )}
        <span className={`truncate text-[14px] ${terminada ? "" : "text-papel/80"}`}>{d.detalle}</span>
        <div className={`mt-1 flex items-center justify-between gap-2 text-[13px] font-semibold ${terminada ? "" : "text-papel/90"}`}>
          <span className="truncate">{d.fechas}</span>
          {d.aviso && <span className="shrink-0">{d.aviso}</span>}
        </div>
      </div>
    </div>
  );

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
