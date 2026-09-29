"use client";

import { useEffect, useRef } from "react";

/** Píxeles de scroll en los que el borde pasa de invisible a completo (igual que en las hojas). */
const SCROLL_BORDE = 24;

/**
 * Borde de desplazamiento de las pantallas, desde el borde superior de la pantalla hasta ~28 px bajo la
 * barra de estado (hora, batería): las mismas capas de desenfoque progresivo y velo Papel Cálido translúcido
 * que la cabecera de las hojas (.hoja-borde en globals.css; el velo llega a 0.75 arriba). El contenido pasa
 * por detrás, difuminado. Con el scroll arriba del todo no se ve nada (oculto, sin desenfoque que calcular);
 * aparece en los primeros 24 px de scroll y se va al volver arriba.
 * Solo escribe una variable CSS desde un listener pasivo con requestAnimationFrame: no cambia estado de React.
 */
export function BordeEstado() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    let cuadro = 0;
    const escribir = () => {
      cuadro = 0;
      const v = Math.min(1, Math.max(0, window.scrollY / SCROLL_BORDE));
      b.style.setProperty("--borde", String(v));
      b.style.visibility = v > 0 ? "visible" : "hidden";
    };
    const alDesplazar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(escribir);
    };
    escribir();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      cancelAnimationFrame(cuadro);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-borde-estado
      className="hoja-borde hoja-borde-estado pointer-events-none fixed inset-x-0 top-0 z-20 mx-auto h-[calc(var(--safe-arriba)+28px)] max-w-[480px]"
      style={{ visibility: "hidden" }}
    >
      <div className="hoja-borde-desenfoque" />
      <div className="hoja-borde-desenfoque" />
      <div className="hoja-borde-desenfoque" />
      <div className="hoja-borde-desenfoque" />
      <div className="hoja-borde-color" />
    </div>
  );
}
