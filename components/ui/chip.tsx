"use client";

import type { ComponentProps, ReactNode } from "react";
import { IconoCheck, IconoMas } from "../iconos";
import { clases, FOCO, TOQUE_44 } from "./comunes";

/**
 * Chip de acción (docs/09 §6, crear producto 12 oct 2026): un botón chico de 36 px (toque 44) con contorno `borde-pastilla`,
 * relleno `superficie`, letra `secundario` en negrita y un «+» delante, para lo opcional que abre algo («Tiene tallas o colores»,
 * «+ Descripción»). `hecho`: lo opcional ya tiene algo (check y relleno `accion-suave`). `elegido` (con `aria-pressed`): un
 * interruptor a la vista («Es por encargo, no llevo stock»). No es un filtro ni el botón principal.
 */
export function Chip({
  hecho = false,
  elegido,
  sinIcono = false,
  className,
  children,
  ...boton
}: Omit<ComponentProps<"button">, "className" | "children"> & { hecho?: boolean; elegido?: boolean; sinIcono?: boolean; className?: string; children: ReactNode }) {
  const lleno = hecho || elegido === true;
  return (
    <button
      type="button"
      aria-pressed={elegido}
      {...boton}
      className={clases(
        "tocable relative inline-flex h-(--alto-compacto) shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-secundario font-bold whitespace-nowrap text-texto disabled:opacity-40",
        TOQUE_44,
        FOCO,
        lleno ? "border-accion-suave bg-accion-suave" : "border-borde-pastilla bg-superficie",
        className,
      )}
    >
      {!sinIcono && (lleno ? <IconoCheck tamano={16} strokeWidth={2.4} /> : <IconoMas tamano={16} strokeWidth={2.2} />)}
      {children}
    </button>
  );
}
