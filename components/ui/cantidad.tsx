"use client";

import { IconoMas, IconoMenos } from "../iconos";
import { clases, FOCO } from "./comunes";

/** Un botón cuadrado de 36 px (`radio-s`, como la miniatura de la foto), `superficie-hundida` con icono `texto`. Con 40 % si no se puede. */
export function BotonCantidad({ tipo, etiqueta, onClick, deshabilitado }: { tipo: "mas" | "menos"; etiqueta: string; onClick: () => void; deshabilitado?: boolean }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      disabled={deshabilitado}
      className={clases(
        "tocable relative grid size-(--alto-compacto) shrink-0 place-items-center rounded-radio-s after:absolute after:-inset-1 after:content-[''] disabled:opacity-40",
        tipo === "mas" ? "bg-accion text-sobre-accion" : "bg-superficie-hundida text-texto",
        FOCO,
      )}
    >
      {tipo === "mas" ? <IconoMas tamano={18} /> : <IconoMenos tamano={18} />}
    </button>
  );
}

/**
 * Cantidad (− 1 +) de un producto (docs/09 §6): dos botones cuadrados y el número en `destacado` entre ellos. El − se apaga en
 * `min` y el + en `max` (el stock). `etiquetaQuitar` / `etiquetaAgregar` dicen a qué producto se refiere ("Quitar uno de X").
 */
export function Cantidad({
  valor,
  min = 0,
  max,
  alCambiar,
  etiquetaQuitar = "Quitar uno",
  etiquetaAgregar = "Agregar uno",
  className,
}: {
  valor: number;
  min?: number;
  max?: number;
  alCambiar: (valor: number) => void;
  etiquetaQuitar?: string;
  etiquetaAgregar?: string;
  className?: string;
}) {
  return (
    <div className={clases("flex shrink-0 items-center gap-1", className)}>
      <BotonCantidad tipo="menos" etiqueta={etiquetaQuitar} onClick={() => alCambiar(Math.max(min, valor - 1))} deshabilitado={valor <= min} />
      <span className="min-w-7 text-center text-destacado tabular-nums" aria-live="polite">
        {valor}
      </span>
      <BotonCantidad tipo="mas" etiqueta={etiquetaAgregar} onClick={() => alCambiar(max === undefined ? valor + 1 : Math.min(max, valor + 1))} deshabilitado={max !== undefined && valor >= max} />
    </div>
  );
}
