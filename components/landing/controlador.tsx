"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { DURACION, ESCALA_SCROLL, estadoDemo } from "@/lib/landing/escenas";

const REDUCIDO = "(prefers-reduced-motion: reduce)";

/**
 * El recorrido animado: el scroll de la página es el control. Un solo requestAnimationFrame por movimiento escribe el
 * progreso en `--p` (sin renders de React) y el estado discreto en atributos data-* (escena, bolsa, total) para las
 * pruebas. Al parar, se queda donde está; al subir, retrocede igual.
 */
export function DemoScroll({ children }: { children: ReactNode }) {
  const seccion = useRef<HTMLElement>(null);
  const escenario = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Puede llegar aquí sin el script de la página (navegación del lado del cliente): se marca igual.
    document.documentElement.setAttribute("data-landing-js", "");
    const s = seccion.current;
    const e = escenario.current;
    if (!s || !e) return;
    let pendiente = 0;
    let anterior = "";
    let medidas: { tope: number; recorrido: number } | null = null;
    const reducido = window.matchMedia(REDUCIDO);
    const pintar = () => {
      pendiente = 0;
      if (reducido.matches) return;
      // El progreso empieza cuando la sección llega a donde se pega el escenario (su `top`) y termina cuando se despega.
      medidas ??= { tope: parseFloat(getComputedStyle(e).top) || 0, recorrido: s.offsetHeight - e.offsetHeight };
      const { tope, recorrido } = medidas;
      const f = recorrido > 0 ? Math.min(1, Math.max(0, (tope - s.getBoundingClientRect().top) / recorrido)) : 0;
      const p = f * DURACION;
      e.style.setProperty("--p", p.toFixed(4));
      const estado = estadoDemo(p);
      const clave = `${estado.escena}|${estado.bolsa}`;
      if (clave !== anterior) {
        anterior = clave;
        e.dataset.escena = estado.escena;
        e.dataset.bolsa = String(estado.bolsa);
        e.dataset.total = String(estado.total);
        e.dataset.lado = estado.lado ?? "";
        e.dataset.codigo = estado.codigoVisible ? "si" : "no";
      }
    };
    const pedir = () => {
      if (!pendiente) pendiente = requestAnimationFrame(pintar);
    };
    const remedir = () => {
      medidas = null;
      pedir();
    };
    pintar();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", remedir);
    reducido.addEventListener("change", remedir);
    return () => {
      cancelAnimationFrame(pendiente);
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", remedir);
      reducido.removeEventListener("change", remedir);
    };
  }, []);

  return (
    <section
      ref={seccion}
      id="demo"
      aria-label="Demo: un pedido de principio a fin"
      className="landing-demo"
      style={{ "--duracion": DURACION, "--escala-scroll": ESCALA_SCROLL } as CSSProperties}
    >
      <div ref={escenario} className="lt-escenario" data-escena="bienvenida" data-bolsa="0" data-total="0" data-lado="" data-codigo="no" style={{ "--duracion": DURACION } as CSSProperties}>
        {children}
      </div>
    </section>
  );
}
