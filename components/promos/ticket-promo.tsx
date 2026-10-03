import type { ReactNode } from "react";
import type { DatosCupon } from "@/lib/cupon";

// El ticket/cupón de promo, en un solo componente: la tarjeta de la lista de Promos (normal) y la versión pequeña del selector de
// descuento (compacto). Medidas y colores de la opción C del diseño (referencias/promos-cupon/opcion-c-ticket-verde.dc.html).
// Forma con muescas semicirculares arriba y abajo (recortadas de verdad con una máscara), línea punteada y el porcentaje grande
// en el talón. La sombra, cuando la hay, la pone quien lo usa (una box-shadow no seguiría las muescas).

const mascara = (x: number, r: number) =>
  `radial-gradient(circle ${r}px at ${x}px 0, #0000 98%, #000) top / 100% 51% no-repeat, radial-gradient(circle ${r}px at ${x}px 100%, #0000 98%, #000) bottom / 100% 51% no-repeat`;

const MASCARA_NORMAL = mascara(116, 10);
const MASCARA_COMPACTA = mascara(72, 7);

/** El diseño usa Fredoka normal; `.font-display` ensancha (font-stretch 115 %) y esta clase no la gana. */
const SIN_ENSANCHAR = { fontStretch: "100%" } as const;

/** Lo que pone la versión compacta en el cuerpo del ticket. */
export type CuerpoCompacto = {
  nombre: string;
  codigo: string;
  /** "usada 3 veces" · "usada 3 de 10". */
  uso: string;
  /** Etiqueta corta de un cupón que no se puede usar (Pausado, Vencido…). */
  razon?: string;
  /** Algo a la derecha (el check de lo elegido). */
  extra?: ReactNode;
};

export function TicketPromo({
  d,
  apagado,
  tamano = "normal",
  compacto,
}: {
  d: DatosCupon;
  /** Terminada, pausada o agotada: crema apagado, ya no se aplica. */
  apagado: boolean;
  tamano?: "normal" | "compacto";
  compacto?: CuerpoCompacto;
}) {
  if (tamano === "compacto" && compacto) return <Compacto d={d} apagado={apagado} c={compacto} />;

  return (
    <div
      className={`relative flex h-[148px] rounded-[18px] ${apagado ? "bg-[#E4DDCC] text-bosque/65" : "bg-bosque text-papel"}`}
      style={{ WebkitMask: MASCARA_NORMAL, mask: MASCARA_NORMAL }}
    >
      {/* Talón: el porcentaje */}
      <div className="flex w-[116px] flex-none flex-col items-center justify-center gap-0.5">
        <span style={SIN_ENSANCHAR} className={`font-display text-[44px] leading-none font-bold ${apagado ? "text-bosque/45" : "text-mandarina"}`}>
          {d.porcentaje}%
        </span>
        <span className={`text-[10px] font-bold tracking-[0.1em] ${apagado ? "text-bosque/60" : "text-papel/75"}`}>{d.bajoPorcentaje}</span>
      </div>
      {/* Perforación */}
      <div
        aria-hidden="true"
        className={`absolute top-[18px] bottom-[18px] left-[115px] border-l-2 border-dashed ${apagado ? "border-bosque/25" : "border-papel/40"}`}
      />
      {/* Cuerpo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-[18px] pl-[26px]">
        <span className={`text-[11px] font-bold tracking-[0.1em] uppercase ${apagado ? "" : "text-rosa"}`}>{d.tipo}</span>
        {d.esCodigo ? (
          <span
            style={SIN_ENSANCHAR}
            className={`max-w-full self-start truncate rounded-[10px] border-2 border-dashed px-3 py-1 font-display text-[20px] leading-[1.2] font-semibold tracking-[0.08em] ${
              apagado ? "border-bosque/65" : "border-rosa text-rosa"
            }`}
          >
            {d.titulo}
          </span>
        ) : (
          <span style={SIN_ENSANCHAR} className="truncate font-display text-[21px] leading-[1.15] font-semibold">
            {d.titulo}
          </span>
        )}
        <span className={`truncate text-[14px] ${apagado ? "" : "text-papel/80"}`}>{d.detalle}</span>
        <div className={`mt-1 flex items-center justify-between gap-2 text-[13px] font-semibold ${apagado ? "" : "text-papel/90"}`}>
          <span className="truncate">{d.fechas}</span>
          {d.aviso && <span className="shrink-0">{d.aviso}</span>}
        </div>
      </div>
    </div>
  );
}

/** Versión pequeña (76 px de alto): porcentaje a la izquierda, nombre, código en caja punteada y el uso. Mismos colores. */
function Compacto({ d, apagado, c }: { d: DatosCupon; apagado: boolean; c: CuerpoCompacto }) {
  return (
    <div
      className={`relative flex h-[76px] rounded-[14px] ${apagado ? "bg-[#E4DDCC] text-bosque/70" : "bg-bosque text-papel"}`}
      style={{ WebkitMask: MASCARA_COMPACTA, mask: MASCARA_COMPACTA }}
    >
      <div className="flex w-[72px] flex-none items-center justify-center">
        <span style={SIN_ENSANCHAR} className={`font-display text-[27px] leading-none font-bold ${apagado ? "text-bosque/50" : "text-mandarina"}`}>
          {d.porcentaje}%
        </span>
      </div>
      <div
        aria-hidden="true"
        className={`absolute top-[11px] bottom-[11px] left-[71px] border-l-2 border-dashed ${apagado ? "border-bosque/25" : "border-papel/40"}`}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px] py-2 pr-3 pl-[18px]">
        {/* El nombre solo si es distinto del código: nunca el código dos veces */}
        {c.nombre.trim() !== "" && c.nombre.trim().toUpperCase() !== c.codigo.trim().toUpperCase() && <span className="truncate text-[13.5px] leading-tight font-bold">{c.nombre}</span>}
        <span
          style={SIN_ENSANCHAR}
          className={`max-w-full self-start truncate rounded-[8px] border-[1.5px] border-dashed px-2 font-display text-[14px] leading-[1.35] font-semibold tracking-[0.08em] ${
            apagado ? "border-bosque/60" : "border-rosa text-rosa"
          }`}
        >
          {c.codigo}
        </span>
        <span className={`truncate text-[12px] font-semibold ${apagado ? "" : "text-papel/80"}`}>{c.uso}</span>
      </div>
      {(c.razon || c.extra) && (
        <div className="flex flex-none items-center gap-2 pr-3.5">
          {c.razon && <span className="rounded-full bg-bosque/12 px-2 py-[2px] text-[11.5px] font-extrabold whitespace-nowrap">{c.razon}</span>}
          {c.extra}
        </div>
      )}
    </div>
  );
}
