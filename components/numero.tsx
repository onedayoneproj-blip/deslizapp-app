"use client";

import { useLayoutEffect, useRef } from "react";
import { CURVA, DURACION, menosMovimiento } from "@/lib/movimiento";

/**
 * Número que avisa cuando cambia (créditos, contadores, badge): el valor nuevo entra desde abajo
 * con un pequeño "pop". La primera vez que se muestra no se anima. Solo transform y opacity.
 */
export function Numero({ valor, className = "" }: { valor: number | string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const primero = useRef(true);

  useLayoutEffect(() => {
    if (primero.current) {
      primero.current = false;
      return;
    }
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const cuadros = menosMovimiento()
      ? [{ opacity: 0.4 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: "translateY(45%) scale(0.85)" },
          { opacity: 1, transform: "translateY(-6%) scale(1.15)", offset: 0.6 },
          { opacity: 1, transform: "none" },
        ];
    el.animate(cuadros, { duration: DURACION.normal, easing: CURVA.salida });
  }, [valor]);

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`}>
      {valor}
    </span>
  );
}
