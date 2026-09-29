"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { Novedad } from "@/lib/novedades";
import { IconoChispa } from "../iconos";
import { Isotipo } from "../marca";

const fechaCorta = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", timeZone: "UTC" });

/** Pantalla de novedades: fondo Verde Bosque, títulos en Fredoka y botón Mandarina (firma de marca). */
export function PantallaNovedades({ novedades, alCerrar }: { novedades: Novedad[]; alCerrar: () => void }) {
  // Sale con movimiento (baja y se desvanece) y recién ahí se desmonta.
  const [saliendo, setSaliendo] = useState(false);
  const cerrar = useCallback(() => setSaliendo(true), []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [cerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="novedades-titulo"
      onAnimationEnd={(e) => {
        if (saliendo && e.target === e.currentTarget) alCerrar();
      }}
      className={`${saliendo ? "mov-baja-sale" : "mov-aparece"} fixed inset-0 z-[65] mx-auto flex max-w-[480px] flex-col overflow-y-auto bg-bosque px-6 pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] text-papel`}
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
              {n.cambios.map((c, i) => (
                <li key={c} className="mov-escalonado flex gap-3 text-[15.5px] leading-snug" style={{ "--i": i + 2 } as CSSProperties}>
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
        onClick={cerrar}
        autoFocus
        className="mt-8 h-14 w-full shrink-0 rounded-full bg-mandarina text-[16.5px] font-extrabold text-bosque-oscuro tocable"
      >
        ¡A deslizar!
      </button>
    </div>
  );
}
