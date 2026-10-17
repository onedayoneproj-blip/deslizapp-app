"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * ¿Se ve este elemento? Para las animaciones en bucle de /planes: solo corre la de la tarjeta que está a la vista (al menos `umbral` de ella
 * dentro de la pantalla y del carrusel) y se pausa al deslizar a otra o al irse de la página. En el servidor y antes de medir, no se ve.
 */
export function useEnPantalla(ref: RefObject<HTMLElement | null>, umbral = 0.6): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: umbral });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref, umbral]);
  return visible;
}
