"use client";

import { useEffect, useState } from "react";
import { diaCorto, diasDeAtraso, diasParaPagar, textoAtraso, textoFaltan } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";

/**
 * Barra de lo pagado: crece con transform (scaleX), no con el ancho. Empieza vacía y llega a su valor al aparecer; cuando
 * cambia (un abono nuevo o borrado), se anima de un valor al otro (referencias/credito-abonos/Pedido.dc.html).
 */
export function BarraPago({ pagado, total, saldado = false }: { pagado: number; total: number; saldado?: boolean }) {
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
      className="h-2.5 overflow-hidden rounded-[5px] bg-arena"
    >
      <div className={`cre-barra h-full w-full rounded-[5px] ${saldado ? "bg-mandarina" : "bg-bosque"}`} style={{ transform: `scaleX(${valor})` }} />
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
  if (!fecha) return <p className="text-[13px] font-semibold text-suave">Sin fecha acordada</p>;
  const atraso = diasDeAtraso(fecha, ahora);
  const faltan = diasParaPagar(fecha, ahora) ?? 0;
  return (
    <p className="flex items-center gap-2 text-[13px]">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full bg-mandarina ${atraso > 0 ? "cre-latido" : ""}`} />
      <span>
        Quedó en pagar el <b>{diaCorto(fecha)}</b> · {atraso > 0 ? <b className="text-mandarina-texto">{textoAtraso(atraso)}</b> : textoFaltan(faltan).toLowerCase()}
      </span>
    </p>
  );
}

/** Etiqueta de estado de una cuenta (lista "Deben" y cuenta del cliente): atrasada en mandarina suave, con fecha en menta, sin fecha en arena. */
export function EtiquetaDeuda({ fecha, atrasoDias, genero = "o", grande = false }: { fecha: string | null; atrasoDias: number; genero?: "o" | "a"; grande?: boolean }) {
  const tamano = grande ? "h-6 px-[9px]" : "h-[22px] px-2";
  const base = `inline-flex ${tamano} shrink-0 items-center self-start rounded-full text-[11.5px] font-extrabold whitespace-nowrap`;
  if (atrasoDias > 0) return <span className={`${base} bg-mandarina/20 text-mandarina-texto`}>{textoAtraso(atrasoDias, genero)}</span>;
  if (fecha) return <span className={`${base} bg-menta text-bosque`}>Paga el {diaCorto(fecha)}</span>;
  return <span className={`${base} bg-arena text-suave`}>Sin fecha acordada</span>;
}
