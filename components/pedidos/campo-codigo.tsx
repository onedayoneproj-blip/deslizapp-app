"use client";

import type { Ref } from "react";
import { MENSAJE_CODIGO_MALO } from "@/lib/data/pedidos";
import type { Promo } from "@/lib/types";

/** Estilo de los campos de texto de las hojas de pedidos. */
export const CLASE_CAMPO =
  "h-[50px] w-full min-w-0 rounded-2xl border-[1.5px] border-borde bg-white px-3.5 text-base text-bosque outline-none focus:border-bosque";

/**
 * Campo "Código de promo" de "+ Pedido" y del Detalle de pedido. La validación es la misma en los dos: el código (sin
 * importar mayúsculas) tiene que ser de una promo de código activa de la tienda (`promo` = la que encontró
 * `buscarCodigoPromo`, o null).
 */
export function CampoCodigo({
  valor,
  alCambiar,
  promo,
  opcional = true,
  entrada,
}: {
  valor: string;
  alCambiar: (valor: string) => void;
  promo: Promo | null;
  opcional?: boolean;
  entrada?: Ref<HTMLInputElement>;
}) {
  const malo = valor.trim() !== "" && !promo;
  return (
    <label className="mt-1 flex min-w-0 flex-col gap-1.5 text-[13.5px] font-bold">
      <span>
        Código de promo {opcional && <span className="text-[12.5px] font-semibold text-suave">(opcional)</span>}
      </span>
      <input
        ref={entrada}
        type="text"
        value={valor}
        onChange={(e) => alCambiar(e.target.value.toUpperCase().slice(0, 20))}
        placeholder="Ej: LUNA20"
        autoCapitalize="characters"
        autoComplete="off"
        className={CLASE_CAMPO}
      />
      {promo && (
        <span className="text-[12.5px] font-semibold text-suave">
          Código {promo.codigo}: {promo.valorPorcentaje}% menos. Ya va en el total.
        </span>
      )}
      {malo && <span className="text-[12.5px] font-semibold text-[#b4432a]">{MENSAJE_CODIGO_MALO}</span>}
    </label>
  );
}
