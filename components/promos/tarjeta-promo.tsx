import Link from "next/link";
import { diaMesCorto, formatearPesos, rangoFechas } from "@/lib/formato";
import { estadoPromo } from "@/lib/promos";
import type { EstadoPromo, Producto, Promo } from "@/lib/types";

// Tarjeta de promo estilo CUPÓN (opción C del diseño: referencias/promos-cupon/opcion-c-ticket-verde.dc.html).
// Medidas y colores copiados de esa referencia. La sombra va en el contenedor con `filter: drop-shadow` para
// que siga la forma recortada por la máscara (una box-shadow no seguiría las muescas).

/** Muescas semicirculares (radio 10) arriba y abajo, a 116 px del borde izquierdo, recortadas de verdad. */
const MASCARA =
  "radial-gradient(circle 10px at 116px 0, #0000 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle 10px at 116px 100%, #0000 98%, #000) bottom / 100% 51% no-repeat";

/** El diseño usa Fredoka normal; `.font-display` ensancha (font-stretch 115 %) y esta clase no la gana. */
const SIN_ENSANCHAR = { fontStretch: "100%" } as const;

const ETIQUETA_TIPO = { codigo: "Código", coleccion: "Por colección", producto: "Por producto" } as const;
const DIA_MS = 24 * 60 * 60 * 1000;

/** "del 25 sept al 3 oct" para lectores de pantalla. */
const fechasHablado = (inicio: string, fin: string | null) => (fin ? `del ${diaMesCorto(inicio)} al ${diaMesCorto(fin)}` : `desde el ${diaMesCorto(inicio)}`);

/**
 * Promo en la lista de Promos (y en la vista previa de "Nueva promo"). Un solo componente con la variante
 * por estado: activa y programada (verde bosque) o terminada (crema apagado). Con `href` es un enlace
 * (abre el detalle o la edición); sin `href` es solo una imagen (vista previa).
 */
export function TarjetaPromo({
  promo,
  estado = estadoPromo(promo),
  producto,
  productosDeColeccion = 0,
  usos = null,
  href,
  ahora = new Date(),
}: {
  promo: Promo;
  estado?: EstadoPromo;
  /** El producto de una promo "por producto" (para el detalle). */
  producto?: Producto;
  productosDeColeccion?: number;
  /** Pedidos que usaron el código (solo promos de código). */
  usos?: number | null;
  href?: string;
  ahora?: Date;
}) {
  const terminada = estado === "terminada";
  const pct = promo.valorPorcentaje;

  // Detalle de una línea
  let detalle = "";
  if (promo.tipo === "coleccion") detalle = `Colección ${promo.coleccion ?? "…"} · ${productosDeColeccion} ${productosDeColeccion === 1 ? "producto" : "productos"}`;
  else if (promo.tipo === "producto") {
    const precio = producto ? producto.precio - Math.round((producto.precio * (pct ?? 0)) / 100) : null;
    detalle = producto ? `${producto.nombre} · ${formatearPesos(precio ?? producto.precio)}` : "Un producto";
  } else detalle = promo.nombre && promo.nombre !== promo.codigo ? `${promo.nombre} · En todo el pedido` : "En todo el pedido";

  // Lado derecho de la fila de fechas: uso del código, o cuándo empieza si es pronto
  const diasParaEmpezar = Math.ceil((Date.parse(promo.fechaInicio) - ahora.getTime()) / DIA_MS);
  const aviso =
    estado === "programada" && diasParaEmpezar >= 1 && diasParaEmpezar < 7
      ? `Empieza en ${diasParaEmpezar} ${diasParaEmpezar === 1 ? "día" : "días"}`
      : promo.tipo === "codigo" && usos !== null && estado !== "programada"
        ? `Usada en ${usos} ${usos === 1 ? "pedido" : "pedidos"}`
        : null;

  const etiqueta = `${promo.tipo === "codigo" ? `Código ${promo.codigo}` : promo.nombre}, ${pct ?? "sin"}% de descuento, ${estado}, ${fechasHablado(promo.fechaInicio, promo.fechaFin)}${
    promo.tipo === "codigo" && usos !== null ? `, usada en ${usos} ${usos === 1 ? "pedido" : "pedidos"}` : ""
  }`;

  const tarjeta = (
    <div
      className={`relative flex h-[148px] rounded-[18px] ${terminada ? "bg-[#E4DDCC] text-bosque/65" : "bg-bosque text-papel"}`}
      style={{ WebkitMask: MASCARA, mask: MASCARA }}
    >
      {/* Talón: el porcentaje */}
      <div className="flex w-[116px] flex-none flex-col items-center justify-center gap-0.5">
        <span style={SIN_ENSANCHAR} className={`font-display text-[44px] leading-none font-bold ${terminada ? "text-bosque/45" : "text-mandarina"}`}>{pct ?? "–"}%</span>
        <span className={`text-[10px] font-bold tracking-[0.1em] ${terminada ? "text-bosque/60" : "text-papel/75"}`}>
          {terminada ? "TERMINADA" : estado === "programada" ? "PROGRAMADA" : "DE DESCUENTO"}
        </span>
      </div>
      {/* Perforación */}
      <div aria-hidden="true" className={`absolute top-[18px] bottom-[18px] left-[115px] border-l-2 border-dashed ${terminada ? "border-bosque/25" : "border-papel/40"}`} />
      {/* Cuerpo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-[18px] pl-[26px]">
        <span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${terminada ? "" : "text-rosa"}`}>{ETIQUETA_TIPO[promo.tipo]}</span>
        {promo.tipo === "codigo" ? (
          <span
            style={SIN_ENSANCHAR}
            className={`max-w-full self-start truncate rounded-[10px] border-2 border-dashed px-3 py-1 font-display text-[20px] leading-[1.2] font-semibold tracking-[0.08em] ${
              terminada ? "border-bosque/65" : "border-rosa text-rosa"
            }`}
          >
            {promo.codigo || "CÓDIGO"}
          </span>
        ) : (
          <span style={SIN_ENSANCHAR} className="truncate font-display text-[21px] leading-[1.15] font-semibold">{promo.nombre || "Nombre de tu promo"}</span>
        )}
        <span className={`truncate text-[14px] ${terminada ? "" : "text-papel/80"}`}>{detalle}</span>
        <div className={`mt-1 flex items-center justify-between gap-2 text-[13px] font-semibold ${terminada ? "" : "text-papel/90"}`}>
          <span className="truncate">{rangoFechas(promo.fechaInicio, promo.fechaFin)}</span>
          {aviso && <span className="shrink-0">{aviso}</span>}
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
    <Link href={href} scroll={false} aria-label={etiqueta} className={`block active:scale-[0.98] ${contenedor}`} style={{ filter: sombra }}>
      {tarjeta}
    </Link>
  );
}
