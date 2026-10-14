"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { DURACION, ESCALA_SCROLL, estadoDemo, hiloEn } from "@/lib/landing/escenas";

const REDUCIDO = "(prefers-reduced-motion: reduce)";
/** El ♥ mide esto sin escalar (landing.css .lt-hilo); su escala sale del tamaño del ancla. */
const BASE_HILO = 100;

/**
 * El recorrido animado: el scroll de la página es el control. Un solo requestAnimationFrame por movimiento escribe el
 * progreso en `--p` (sin renders de React), pone el ♥ sobre su ancla (o entre dos) y deja el estado discreto en atributos
 * data-* (escena, bolsa, total) para las pruebas. Al parar, se queda donde está; al subir, retrocede igual.
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
    const hilo = e.querySelector<HTMLElement>("[data-hilo]");
    const anclas = new Map<string, HTMLElement>();
    e.querySelectorAll<HTMLElement>("[data-ancla]").forEach((a) => anclas.set(a.dataset.ancla!, a));
    let pendiente = 0;
    let anterior = "";
    let medidas: { tope: number; recorrido: number } | null = null;
    const reducido = window.matchMedia(REDUCIDO);

    const centro = (id: string, base: DOMRect) => {
      const r = anclas.get(id)?.getBoundingClientRect();
      return r ? { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2, w: r.width } : null;
    };
    const ponerHilo = (p: number) => {
      if (!hilo) return;
      const base = e.getBoundingClientRect();
      const h = hiloEn(p);
      const a = centro(h.de, base);
      const b = h.de === h.a ? a : centro(h.a, base);
      if (!a || !b) return;
      // Entre dos anclas viaja en un arco suave (sube un poco a mitad de camino).
      const arco = Math.sin(Math.PI * h.t) * Math.min(120, Math.hypot(b.x - a.x, b.y - a.y) * 0.25);
      const x = a.x + (b.x - a.x) * h.t;
      const y = a.y + (b.y - a.y) * h.t - arco;
      // Y crece al viajar: a mitad de camino es lo único que se mira (sobre todo al cruzar de un teléfono al otro).
      const recto = a.w + (b.w - a.w) * h.t;
      const grande = Math.min(base.width, base.height) * 0.22;
      const w = recto + Math.max(0, grande - recto) * Math.sin(Math.PI * h.t);
      hilo.style.transform = `translate(${(x - BASE_HILO / 2).toFixed(1)}px, ${(y - BASE_HILO / 2).toFixed(1)}px) scale(${(w / BASE_HILO).toFixed(3)})`;
    };

    const pintar = () => {
      pendiente = 0;
      if (reducido.matches) return;
      // El progreso empieza cuando la sección llega a donde se pega el escenario (su `top`) y termina cuando se despega.
      medidas ??= { tope: parseFloat(getComputedStyle(e).top) || 0, recorrido: s.offsetHeight - e.offsetHeight };
      const { tope, recorrido } = medidas;
      const f = recorrido > 0 ? Math.min(1, Math.max(0, (tope - s.getBoundingClientRect().top) / recorrido)) : 0;
      const p = f * DURACION;
      e.style.setProperty("--p", p.toFixed(4));
      ponerHilo(p);
      const estado = estadoDemo(p);
      const clave = `${estado.escena}|${estado.bolsa}`;
      if (clave !== anterior) {
        anterior = clave;
        e.dataset.escena = estado.escena;
        e.dataset.bolsa = String(estado.bolsa);
        e.dataset.total = String(estado.total);
        e.dataset.lado = estado.lado;
        e.dataset.capitulo = String(estado.capitulo);
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
    // Las fuentes y las imágenes pueden mover las anclas al cargar.
    void document.fonts?.ready.then(pedir);
    window.addEventListener("load", pedir);
    return () => {
      cancelAnimationFrame(pendiente);
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", remedir);
      window.removeEventListener("load", pedir);
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
      <div ref={escenario} className="lt-escenario" data-escena="bienvenida" data-bolsa="0" data-total="0" data-lado="compras" data-capitulo="1" data-codigo="no" style={{ "--duracion": DURACION } as CSSProperties}>
        {children}
      </div>
    </section>
  );
}
