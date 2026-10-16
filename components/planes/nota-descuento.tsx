"use client";

import { useEffect, useRef, useState } from "react";
import { textoMenosCirculo } from "@/lib/circulo";

/**
 * La nota a mano del descuento de las primeras tiendas, junto al selector de /planes (opción E, referencias/planes/descuento-nota-a-mano.dc.html):
 * «primeras tiendas: -30%» en Caveat, girada unos -6°, con una flecha dibujada a mano que baja hacia el botón «Anual». Se ve siempre,
 * con «Mensual» o «Anual». Se anima una sola vez, cuando el selector entra en pantalla: la nota hace un fundido corto y la flecha se
 * dibuja (pagina-planes.css); cambiar de pestaña no la repite. Con movimiento reducido, todo queda quieto desde el principio. Solo
 * decorativa: el pie de cada tarjeta lo dice en texto.
 */
export function NotaDescuento() {
  const ref = useRef<HTMLSpanElement>(null);
  // "no": todavía fuera de pantalla (oculta, lista para animarse); "si": ya entró y se animó (no vuelve a empezar).
  const [vista, setVista] = useState<"no" | "si">("no");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Sin IntersectionObserver, se ve y se anima de una vez.
      const id = window.setTimeout(() => setVista("si"), 0);
      return () => window.clearTimeout(id);
    }
    const o = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVista("si");
          o.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <>
      <span ref={ref} className="pl-nota-mano" data-vista={vista} aria-hidden="true" data-nota-mano="">
        primeras tiendas: <span className="pl-nota-mano-menos">{textoMenosCirculo}</span>
      </span>
      <svg className="pl-flecha" data-vista={vista} width="34" height="30" viewBox="0 0 34 30" fill="none" stroke="#F5C9D6" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M4 2c6 12 14 18 26 22" pathLength="1" />
        <path d="M22 26l8-2-3-8" pathLength="1" className="pl-flecha-punta" />
      </svg>
    </>
  );
}
