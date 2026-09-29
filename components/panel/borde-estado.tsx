"use client";

import { useEffect, useRef } from "react";

/** Píxeles de scroll en los que el borde pasa de invisible a completo (igual que en las hojas). */
const SCROLL_BORDE = 24;

/**
 * Borde de desplazamiento de las pantallas, detrás de la barra de estado (hora, batería): mismo
 * desenfoque progresivo + degradado Papel Cálido que la cabecera de las hojas (.hoja-borde en
 * globals.css). Con el scroll arriba del todo no se ve nada (oculto, sin desenfoque que calcular);
 * aparece en los primeros 24 px de scroll y se va al volver arriba.
 * Solo escribe una variable CSS en el scroll: no cambia estado de React (regla del teclado).
 */
export function BordeEstado() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    const actualizar = () => {
      const v = Math.min(1, Math.max(0, window.scrollY / SCROLL_BORDE));
      b.style.setProperty("--borde", String(v));
      b.style.visibility = v > 0 ? "visible" : "hidden";
    };
    actualizar();
    window.addEventListener("scroll", actualizar, { passive: true });
    return () => window.removeEventListener("scroll", actualizar);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-borde-estado
      className="hoja-borde pointer-events-none fixed inset-x-0 top-0 z-20 mx-auto h-[calc(var(--safe-arriba)+20px)] max-w-[480px]"
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
