"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { CURVA, DURACION, menosMovimiento } from "@/lib/movimiento";

export type OrigenLuz = { x: number; y: number };

/** Recorte y grano quietos. Solo se mueven las manchas radiales, transparentes en sus límites. */
export function LuzJugada({ tarjeta = false, pulso = 0 }: { tarjeta?: boolean; pulso?: number }) {
  const intensidad = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pulso || menosMovimiento() || !intensidad.current) return;
    const animacion = intensidad.current.animate([
      { opacity: 0, transform: "scale(.94)" },
      { opacity: .85, transform: "scale(1.08)", offset: .32 },
      { opacity: 0, transform: "scale(1.14)" },
    ], { duration: DURACION.jugadaPulso, easing: "ease-out" });
    return () => animacion.cancel(); // otro toque sustituye el pulso, nunca lo acumula
  }, [pulso]);
  return <span aria-hidden="true" className={`jugada-luz ${tarjeta ? "jugada-luz-tarjeta" : "jugada-resplandor"}`}>
    <span className="jugada-luz-color jugada-luz-rosa" />
    <span className="jugada-luz-color jugada-luz-naranja" />
    <span className="jugada-luz-color jugada-luz-verde" />
    <span ref={intensidad} className="jugada-luz-pulso" />
    <span className="jugada-luz-grano" />
  </span>;
}

/** Una sola transición decorativa; no transforma el contenido, los campos ni el recorte. */
export function TransicionJugada({ tipo, origen, alTerminar }: {
  tipo: "galeria" | "detalle"; origen?: OrigenLuz; alTerminar: () => void;
}) {
  const capa = useRef<HTMLDivElement>(null);
  const terminar = useRef(alTerminar);
  useLayoutEffect(() => { terminar.current = alTerminar; });
  useLayoutEffect(() => {
    const el = capa.current;
    if (!el || menosMovimiento()) return;
    const r = el.getBoundingClientRect();
    const x = (origen?.x ?? r.left + r.width / 2) - r.left - r.width / 2;
    const y = (origen?.y ?? r.top + r.height * .2) - r.top - r.height / 2;
    const animaciones = [...el.querySelectorAll<HTMLElement>(".jugada-velo-mancha")].map((mancha, i) => {
      const desplazamiento = (i - 1) * r.width * .18;
      const cuadros: Keyframe[] = tipo === "galeria" ? [
        { transform: `translate3d(${x}px,${y}px,0) scale(.28,.18)`, opacity: .5, easing: "ease-in-out" },
        { transform: `translate3d(${desplazamiento}px,${-r.height * .08}px,0) scale(${1.05 + i * .12},${.8 + i * .16})`, opacity: .78, offset: .48, easing: CURVA.salida },
        { transform: `translate3d(${-desplazamiento * .6}px,0,0) scale(1.3,1.2)`, opacity: .86, offset: .65, easing: "ease-in" },
        { transform: `translate3d(${-desplazamiento}px,${r.height * .07}px,0) scale(1.5,1.3)`, opacity: 0 },
      ] : [
        { transform: `translate3d(${desplazamiento}px,${-r.height * .54}px,0) scale(1.2,.36)`, opacity: .78 },
        { transform: `translate3d(${-desplazamiento}px,${r.height * .05}px,0) scale(1.35,.44)`, opacity: .74, offset: .48 },
        { transform: `translate3d(${desplazamiento}px,${r.height * .85}px,0) scale(1.25,.38)`, opacity: 0 },
      ];
      return mancha.animate(cuadros, { duration: DURACION.jugadaTransicion, easing: tipo === "galeria" ? "linear" : "cubic-bezier(.3,.4,.5,1)", fill: "both" });
    });
    // No espera para navegar: al terminar solo se retira la decoración.
    void Promise.all(animaciones.map((a) => a.finished)).then(() => terminar.current(), () => {});
    return () => animaciones.forEach((a) => a.cancel());
  }, [tipo, origen]);
  return <div ref={capa} className={`jugada-velo jugada-velo-${tipo}`} aria-hidden="true">
    <span className="jugada-velo-mancha jugada-velo-rosa" />
    <span className="jugada-velo-mancha jugada-velo-naranja" />
    <span className="jugada-velo-mancha jugada-velo-verde" />
  </div>;
}
