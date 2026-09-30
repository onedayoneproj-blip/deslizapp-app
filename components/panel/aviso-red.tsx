"use client";

import { useData } from "@/lib/data/provider";

/**
 * Si una lectura falla (sin conexión, por ejemplo), un aviso fijo arriba con "Reintentar".
 * Las pantallas se quedan en sus esqueletos o con lo último que leyeron. Solo aparece en modo real.
 */
export function AvisoRed() {
  const { errorLectura, refrescar } = useData();
  if (!errorLectura) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-[calc(10px+env(safe-area-inset-top))] z-[61] mx-auto flex max-w-[480px] justify-center px-3">
      <div className="flex w-full items-center gap-3 rounded-[22px] bg-bosque py-2.5 pr-2.5 pl-4 text-papel shadow-[0_14px_30px_-12px_rgba(23,75,58,0.6)]">
        <p className="min-w-0 flex-1 text-[14px] leading-tight font-bold">{errorLectura}</p>
        <button type="button" onClick={refrescar} className="h-11 shrink-0 rounded-full bg-mandarina px-4 text-sm font-extrabold text-bosque-oscuro">
          Reintentar
        </button>
      </div>
    </div>
  );
}
