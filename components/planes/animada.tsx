"use client";

import { useRef, type ReactNode } from "react";
import { useEnPantalla } from "../landing/en-pantalla";

/**
 * Envoltorio de una vista previa animada de «Todos los planes traen»: marca `data-pausa` cuando su tarjeta no está a la vista, y el CSS
 * (components/planes/vistas-animadas.css) pausa sus animaciones. Lo de adentro llega ya armado desde el servidor (piezas reales de la app).
 */
export function Animada({ children, className, umbral = 0.6 }: { children: ReactNode; className?: string; /** Cuánto de ella tiene que verse para que corra (menos si va cortada por la vista previa). */ umbral?: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const visible = useEnPantalla(caja, umbral);
  return (
    <div ref={caja} className={className ? `pl-an ${className}` : "pl-an"} data-pausa={visible ? "no" : "si"}>
      {children}
    </div>
  );
}
