"use client";

import { useState } from "react";
import { formatearPesos } from "@/lib/formato";
import type { Barra } from "@/lib/resumen";

const ALTO = 92;

/**
 * Barras de ventas del periodo (divs, sin librería). Tocar una barra muestra su valor arriba; al entrar
 * se elige la de "ahora" (en Mandarina). Las barras que aún no llegan (franjas o semanas futuras) quedan
 * como un trazo tenue. Sin animación de entrada por barra. El resumen completo va en texto para lectores.
 */
export function GraficoVentas({ barras, valores, actual, titulo }: { barras: Barra[]; valores: (number | null)[]; actual: number; titulo: string }) {
  const [elegida, setElegida] = useState(actual);
  const maximo = Math.max(0, ...valores.map((v) => v ?? 0));
  const muchas = barras.length > 7;
  const valorElegido = valores[elegida];
  const resumen = barras.map((b, i) => `${b.nombre}: ${valores[i] === null ? "todavía no llega" : formatearPesos(valores[i] ?? 0)}`).join("; ");

  return (
    <div>
      <p data-barra-elegida className="mt-3.5 min-h-[18px] text-[13px] font-bold" aria-live="polite">
        {barras[elegida]?.nombre}: {valorElegido === null ? "todavía no llega" : formatearPesos(valorElegido ?? 0)}
      </p>
      <p className="sr-only">
        {titulo}. {resumen}.
      </p>
      <div role="group" aria-label={titulo} className={`mt-1.5 flex h-[118px] items-end ${muchas ? "gap-1" : "gap-2"}`}>
        {barras.map((b, i) => {
          const v = valores[i];
          const esElegida = i === elegida;
          const alto = v === null ? 4 : v > 0 && maximo > 0 ? Math.max(6, Math.round((v / maximo) * ALTO)) : 4;
          return (
            <button
              key={b.desde}
              type="button"
              data-barra
              aria-pressed={esElegida}
              aria-label={`${b.nombre}: ${v === null ? "todavía no llega" : formatearPesos(v)}`}
              onClick={() => setElegida(i)}
              className="flex h-full min-w-0 flex-1 basis-0 flex-col items-center justify-end gap-1.5"
            >
              <span
                data-alto={alto}
                className={`block w-full max-w-[30px] rounded-t-[7px] rounded-b-[4px] ${
                  esElegida ? "bg-mandarina" : v === null ? "bg-papel/15" : v > 0 ? "bg-rosa" : "bg-rosa/35"
                }`}
                style={{ height: alto }}
              />
              <span className={`h-[14px] text-[11.5px] leading-none font-bold whitespace-nowrap ${esElegida ? "text-mandarina" : "text-[#D9E6DF]"}`}>
                {muchas && i % 2 === 1 && !esElegida ? "" : b.etiqueta}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
