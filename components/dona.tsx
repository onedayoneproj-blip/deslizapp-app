"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CURVA, DURACION, menosMovimiento } from "@/lib/movimiento";

/** Arcos SVG: excepción de movimiento aprobada para las donas, sin animar el layout. */
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
  const varios = segmentos.length > 1;
  const arcos = segmentos.map((x, i) => {
    const fraccion = base > 0 ? Math.max(0, x.valor) / base : 0;
    const largo = Math.max(0, circunferencia * fraccion - (varios && fraccion > 0 ? 2 : 0));
    const inicio = base > 0 ? segmentos.slice(0, i).reduce((s, anterior) => s + Math.max(0, anterior.valor), 0) / base : 0;
    return { color: x.color, largo, angulo: inicio * 360 - 90 };
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
      <circle cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" stroke={pista} strokeWidth={grosor} />
      {arcos.map((a, i) => <circle key={i} data-arco data-largo={a.largo} cx={tamano / 2} cy={tamano / 2} r={radio}
        fill="none" stroke={a.color} strokeWidth={grosor} strokeLinecap={varios ? "butt" : "round"}
        opacity={a.largo > 0 ? 1 : 0} strokeDasharray={`${circunferencia} ${circunferencia}`}
        strokeDashoffset={circunferencia - a.largo} transform={`rotate(${a.angulo} ${tamano / 2} ${tamano / 2})`} />)}
    </svg>
    <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">{children}</span>
  </span>;
}
