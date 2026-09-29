"use client";

import { ViewTransition, type ReactNode } from "react";
import { TRANSICION } from "@/lib/movimiento";
import { usePrimeraVez } from "./primera-vez";

/**
 * Envuelve el contenido de cada pantalla para animar la navegación (docs/08-movimiento.md).
 * Cada navegación lleva un tipo (TRANSICION en lib/movimiento.ts) y aquí se traduce a una clase
 * de animación de app/globals.css. Sin tipo (atrás del navegador, recargas, hojas) no se anima.
 * Va en cada página (o en el layout que monta la pantalla), nunca en un layout que persiste.
 */
export function Pantalla({ children }: { children: ReactNode }) {
  // La primera pantalla, justo después de los esqueletos de carga, aparece con un fundido corto.
  const primera = usePrimeraVez("app");
  return (
    <ViewTransition
      enter={{
        [TRANSICION.pestana]: "mov-pestana-entra",
        [TRANSICION.adelante]: "mov-adelante-entra",
        [TRANSICION.atras]: "mov-atras-entra",
        default: "none",
      }}
      exit={{
        [TRANSICION.pestana]: "mov-pestana-sale",
        [TRANSICION.adelante]: "mov-adelante-sale",
        [TRANSICION.atras]: "mov-atras-sale",
        default: "none",
      }}
      default="none"
    >
      <div className={primera ? "mov-aparece" : undefined}>{children}</div>
    </ViewTransition>
  );
}
