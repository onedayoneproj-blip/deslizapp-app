"use client";

import { useEffect, useState } from "react";
import { diaCorto, diasDeAtraso, diasParaPagar, textoAtraso, textoFaltan } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";

/**
 * Barra de lo pagado: crece con transform (scaleX), no con el ancho. Empieza vacía y llega a su valor al aparecer; cuando
 * cambia (un abono nuevo o borrado), se anima de un valor al otro (referencias/credito-abonos/Pedido.dc.html).
 */
export function BarraPago({ pagado, total }: { pagado: number; total: number }) {
  const meta = total > 0 ? Math.min(1, Math.max(0, pagado / total)) : 0;
  const [valor, setValor] = useState(0);
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => setValor(meta));
    return () => cancelAnimationFrame(cuadro);
  }, [meta]);
  return (
    <div
      role="progressbar"
      aria-label={`Pagó ${formatearPesos(pagado)} de ${formatearPesos(total)}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={pagado}
      className="h-2.5 overflow-hidden rounded-full bg-superficie-hundida"
    >
      <div className={`cre-barra h-full w-full rounded-full bg-accion`} style={{ transform: `scaleX(${valor})` }} />
    </div>
  );
}

/**
 * Cuándo quedó en pagar, en el detalle del pedido: "Quedó en pagar el 15 oct · faltan 15 días", o con el punto que late
 * ("Atrasado 6 días"). Sin fecha: "Sin fecha acordada".
 */
export function LineaFecha({ fecha }: { fecha: string | null }) {
  // "Ahora" se toma al mostrarse (no en cada pintado)
  const [ahora] = useState(Date.now);
  if (!fecha) return <p className="text-secundario font-bold text-texto-secundario">Sin fecha acordada</p>;
  const atraso = diasDeAtraso(fecha, ahora);
  const faltan = diasParaPagar(fecha, ahora) ?? 0;
  return (
    <p className="flex items-center gap-2 text-secundario">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full bg-atencion-texto ${atraso > 0 ? "cre-latido" : ""}`} />
      <span>
        Quedó en pagar el <b>{diaCorto(fecha)}</b> · {atraso > 0 ? <b className="text-atencion-texto">{textoAtraso(atraso)}</b> : textoFaltan(faltan).toLowerCase()}
      </span>
    </p>
  );
}
