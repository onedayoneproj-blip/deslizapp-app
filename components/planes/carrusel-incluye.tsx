"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type TarjetaCarrusel = { id: string; titulo: string; linea: string; icono: ReactNode; vista: ReactNode };

/**
 * «Todos los planes traen» (docs/prompts/planes-incluye-y-preguntas.md §1): un carrusel horizontal con `scroll-snap`, una tarjeta crema
 * a la vez y la siguiente asomando, con sus puntos debajo. Las vistas previas llegan ya armadas desde el servidor (piezas reales de la
 * app con datos de ejemplo), son decoración (aria-hidden) y no llevan nada que cargue de más: sin iframes ni video.
 */
export function CarruselIncluye({ tarjetas }: { tarjetas: TarjetaCarrusel[] }) {
  const carril = useRef<HTMLUListElement>(null);
  const [actual, setActual] = useState(0);

  useEffect(() => {
    const el = carril.current;
    if (!el) return;
    let cuadro = 0;
    const medir = () => {
      cuadro = 0;
      const items = Array.from(el.children) as HTMLElement[];
      // La tarjeta cuyo centro queda más cerca del centro del carril.
      const centro = el.scrollLeft + el.clientWidth / 2;
      let mejor = 0;
      let distancia = Infinity;
      items.forEach((it, k) => {
        const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - centro);
        if (d < distancia) {
          distancia = d;
          mejor = k;
        }
      });
      setActual(mejor);
    };
    const alMover = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    el.addEventListener("scroll", alMover, { passive: true });
    return () => {
      el.removeEventListener("scroll", alMover);
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, []);

  return (
    <section className="pl-incluye" aria-labelledby="pl-incluye-t">
      <h2 id="pl-incluye-t">Todos los planes traen</h2>
      <p className="pl-incluye-sub">Desliza para ver cada una.</p>
      <ul ref={carril} className="pl-carril" tabIndex={0} aria-label="Todos los planes traen. Desliza para ver cada una.">
        {tarjetas.map((t, k) => (
          <li key={t.id} className="pl-tj" data-actual={k === actual ? "si" : "no"}>
            <div className="pl-vista" data-vista={t.id} aria-hidden="true">
              {t.vista}
            </div>
            <div className="pl-tj-pie">
              <span className="pl-tj-icono" aria-hidden="true">
                {t.icono}
              </span>
              <div>
                <h3>{t.titulo}</h3>
                <p>{t.linea}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="pl-puntos" aria-hidden="true">
        {tarjetas.map((t, k) => (
          <span key={t.id} data-on={k === actual ? "si" : "no"} />
        ))}
      </div>
    </section>
  );
}
