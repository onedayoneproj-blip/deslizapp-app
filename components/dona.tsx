"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CURVA, DURACION, menosMovimiento } from "@/lib/movimiento";

/**
 * Arcos SVG: excepción de movimiento aprobada para las donas, sin animar el layout. Sin anillo de fondo (docs/09, "Barras y anillos"):
 * con datos solo se ven los arcos, con su separación; `pista` pinta el anillo entero únicamente en el estado vacío (suma 0), para que
 * la dona no desaparezca.
 */
export function Dona({ segmentos, total, tamano = 76, grosor = 9, pista = "#f3ead9", children, className = "" }: {
  segmentos: { valor: number; color: string }[]; total?: number; tamano?: number; grosor?: number;
  pista?: string; children?: ReactNode; className?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const anteriores = useRef<number[]>([]);
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const suma = segmentos.reduce((s, x) => s + Math.max(0, x.valor), 0);
  const base = Math.max(total ?? suma, suma, 0);
  // Regla "Barras y anillos" (docs/09): puntas redondeadas y 3 px de separación visible entre tramos. El trazo redondo se pasa
  // medio grosor por cada punta, así que al largo se le restan la separación y el grosor; un tramo muy corto queda como un punto.
  const SEPARACION = 3;
  const varios = segmentos.filter((x) => x.valor > 0).length > 1;
  const arcos = segmentos.map((x, i) => {
    const fraccion = base > 0 ? Math.max(0, x.valor) / base : 0;
    const inicio = base > 0 ? segmentos.slice(0, i).reduce((s, anterior) => s + Math.max(0, anterior.valor), 0) / base : 0;
    if (!varios) return { color: x.color, largo: circunferencia * fraccion, angulo: inicio * 360 - 90 };
    const hueco = SEPARACION + grosor;
    const largo = fraccion > 0 ? Math.max(0.01, circunferencia * fraccion - hueco) : 0;
    // El tramo empieza media separación y medio grosor después de su inicio; si es más corto que el hueco, se centra en su casilla
    const desfase = circunferencia * fraccion - hueco < 0 ? (circunferencia * fraccion) / 2 : hueco / 2;
    return { color: x.color, largo, angulo: inicio * 360 - 90 + (desfase / circunferencia) * 360 };
  });
  const firma = arcos.map((a) => a.largo).join(",");
  useEffect(() => {
    const animaciones: Animation[] = [];
    svg.current?.querySelectorAll<SVGCircleElement>("[data-arco]").forEach((el, i) => {
      const largo = Number(el.dataset.largo);
      if (!menosMovimiento()) animaciones.push(el.animate([
        { strokeDashoffset: circunferencia - (anteriores.current[i] ?? 0) },
        { strokeDashoffset: circunferencia - largo },
      ], { duration: anteriores.current.length ? DURACION.normal : DURACION.dona, easing: CURVA.salida }));
    });
    anteriores.current = firma.split(",").map(Number);
    return () => animaciones.forEach((a) => a.cancel());
  }, [firma, circunferencia]);
  return <span className={`relative block shrink-0 ${className}`} style={{ width: tamano, height: tamano }}>
    <svg ref={svg} viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true" className="absolute inset-0 h-full w-full">
      {suma === 0 && <circle cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" stroke={pista} strokeWidth={grosor} />}
      {arcos.map((a, i) => <circle key={i} data-arco data-largo={a.largo} cx={tamano / 2} cy={tamano / 2} r={radio}
        fill="none" stroke={a.color} strokeWidth={grosor} strokeLinecap="round"
        opacity={a.largo > 0 ? 1 : 0} strokeDasharray={`${circunferencia} ${circunferencia}`}
        strokeDashoffset={circunferencia - a.largo} transform={`rotate(${a.angulo} ${tamano / 2} ${tamano / 2})`} />)}
    </svg>
    <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">{children}</span>
  </span>;
}
