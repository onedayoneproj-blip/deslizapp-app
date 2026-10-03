"use client";

import type { SaludInventario } from "@/lib/inventario-catalogo";
import { Dona } from "../dona";

/** Colores de los tres tramos (tokens): con stock, queda 1 o 2 y agotados. Los usan la dona y la leyenda de la hoja. */
export const COLOR_STOCK = {
  conStock: "var(--accion)",
  quedan: "var(--resalte)",
  agotados: "var(--atencion-suave)",
} as const;

/** Anillo de la salud del inventario (solo productos visibles). Dentro, la cifra de disponibles. */
export function DonaInventario({ salud, tamano = 76, grosor = 9, className = "", cifra = "text-cifra" }: { salud: SaludInventario; tamano?: number; grosor?: number; className?: string; cifra?: string }) {
  return (
    <Dona
      className={className}
      tamano={tamano}
      grosor={grosor}
      total={salud.total}
      pista="var(--superficie-hundida)"
      segmentos={[
        { valor: salud.conStock, color: COLOR_STOCK.conStock },
        { valor: salud.quedan, color: COLOR_STOCK.quedan },
        { valor: salud.agotados, color: COLOR_STOCK.agotados },
      ]}
    >
      <b className={`dona-cifra font-display text-texto ${cifra}`}>{salud.disponibles.toLocaleString("en-US")}</b>
    </Dona>
  );
}
