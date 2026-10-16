"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * El contenedor del aro con movimiento: marca `data-en-pantalla` ("si"/"no") según si está a la vista, y el CSS pausa las
 * animaciones fuera de pantalla (./aro-circulo.css). Sin IntersectionObserver, siempre "si".
 */
export function AroAnimado({ animacion, estilo, etiqueta, children }: { animacion: "entrada" | "ondas"; estilo: CSSProperties; etiqueta: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [enPantalla, setEnPantalla] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const o = new IntersectionObserver(([e]) => setEnPantalla(!!e?.isIntersecting), { rootMargin: "40px" });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <span ref={ref} style={estilo} className="aro-c" data-aro-circulo="" data-animacion={animacion} data-en-pantalla={enPantalla ? "si" : "no"} role="img" aria-label={etiqueta}>
      {children}
    </span>
  );
}
