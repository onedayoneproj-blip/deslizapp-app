"use client";

import { useEffect } from "react";
import type { Novedad } from "@/lib/novedades";
import { IconoChispa } from "../iconos";
import { Isotipo } from "../marca";

const fechaCorta = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", timeZone: "UTC" });

/** Pantalla de novedades: fondo Verde Bosque, títulos en Fredoka y botón Mandarina (firma de marca). */
export function PantallaNovedades({ novedades, alCerrar }: { novedades: Novedad[]; alCerrar: () => void }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [alCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="novedades-titulo"
      className="fixed inset-0 z-[65] mx-auto flex max-w-[480px] animate-[aparecer_.3s_ease] flex-col overflow-y-auto bg-bosque px-6 pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] text-papel"
    >
      <div className="flex items-center gap-2.5">
        <Isotipo tamano={34} className="text-rosa" />
        <span className="font-mano text-2xl text-mandarina">lo nuevo</span>
      </div>
      <h1 id="novedades-titulo" className="mt-5 font-display text-[34px] leading-[1.05]">
        {novedades[0]?.titulo}
      </h1>

      <div className="mt-6 flex flex-1 flex-col gap-7">
        {novedades.map((n) => (
          <section key={n.version}>
            <p className="text-xs font-bold tracking-wider text-rosa uppercase">
              Versión {n.version} · {fechaCorta.format(new Date(`${n.fecha}T12:00:00Z`))}
            </p>
            {n !== novedades[0] && <h2 className="mt-1 font-display text-xl">{n.titulo}</h2>}
            <ul className="mt-3 flex flex-col gap-3">
              {n.cambios.map((c) => (
                <li key={c} className="flex gap-3 text-[15.5px] leading-snug">
                  <IconoChispa tamano={18} className="mt-0.5 shrink-0 text-mandarina" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={alCerrar}
        autoFocus
        className="mt-8 h-14 w-full shrink-0 rounded-full bg-mandarina text-[16.5px] font-extrabold text-bosque-oscuro transition active:scale-[0.98]"
      >
        ¡A deslizar!
      </button>
    </div>
  );
}
