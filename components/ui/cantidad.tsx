"use client";

import { IconoMas, IconoMenos } from "../iconos";
import { clases, FOCO } from "./comunes";

/** Un botón cuadrado de 36 px (`radio-s`, como la miniatura de la foto), `superficie-hundida` con icono `texto`. Con 40 % si no se puede. */
export function BotonCantidad({ tipo, etiqueta, onClick, deshabilitado, grande = false, redonda = false }: { tipo: "mas" | "menos"; etiqueta: string; onClick: () => void; deshabilitado?: boolean; grande?: boolean; redonda?: boolean }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      disabled={deshabilitado}
      className={clases(
        "tocable relative grid shrink-0 place-items-center disabled:opacity-40",
        grande ? "size-14 rounded-full" : redonda ? "size-[34px] rounded-full after:absolute after:-inset-[5px] after:content-['']" : "size-(--alto-compacto) rounded-radio-s after:absolute after:-inset-1 after:content-['']",
        tipo === "mas" ? "bg-accion text-sobre-accion" : grande || redonda ? "border-[1.5px] border-borde-pastilla bg-superficie text-texto" : "bg-superficie-hundida text-texto",
        FOCO,
      )}
    >
      {tipo === "mas" ? <IconoMas tamano={grande ? 24 : redonda ? 16 : 18} /> : <IconoMenos tamano={grande ? 24 : redonda ? 16 : 18} />}
    </button>
  );
}

/**
 * Cantidad (− 1 +) de un producto (docs/09 §6): dos botones cuadrados y el número en `destacado` entre ellos. El − se apaga en
 * `min` y el + en `max` (el stock). `etiquetaQuitar` / `etiquetaAgregar` dicen a qué producto se refiere ("Quitar uno de X").
 * `grande`: el contador protagonista de una pantalla («¿Cuántos tienes ahora?» al crear producto, como el lienzo): botones
 * redondos de 56 px (− con contorno `borde-pastilla`, + `accion`) y el número en Fredoka de 44. `redonda`: lo mismo en chico
 * (botones de 34, toque 44, número en Fredoka de 18), para las filas del Inventario de crear producto.
 */
export function Cantidad({
  valor,
  min = 0,
  max,
  alCambiar,
  etiquetaQuitar = "Quitar uno",
  etiquetaAgregar = "Agregar uno",
  deshabilitado = false,
  paso = 1,
  grande = false,
  redonda = false,
  className,
}: {
  valor: number;
  min?: number;
  max?: number;
  alCambiar: (valor: number) => void;
  etiquetaQuitar?: string;
  etiquetaAgregar?: string;
  /** Apaga los dos botones (mientras se guarda). */
  deshabilitado?: boolean;
  /** De cuánto en cuánto sube o baja (5 en 5 para un porcentaje). */
  paso?: number;
  grande?: boolean;
  redonda?: boolean;
  className?: string;
}) {
  return (
    <div className={clases("flex shrink-0 items-center", grande ? "gap-5" : redonda ? "gap-2.5" : "gap-1", className)}>
      <BotonCantidad grande={grande} redonda={redonda} tipo="menos" etiqueta={etiquetaQuitar} onClick={() => alCambiar(Math.max(min, valor - paso))} deshabilitado={deshabilitado || valor <= min} />
      <span className={grande ? "min-w-20 text-center font-display text-[2.75rem] leading-none tabular-nums" : redonda ? "min-w-7 text-center font-display text-[1.125rem] tabular-nums" : "min-w-7 text-center text-destacado tabular-nums"} aria-live="polite">
        {valor}
      </span>
      <BotonCantidad grande={grande} redonda={redonda} tipo="mas" etiqueta={etiquetaAgregar} onClick={() => alCambiar(max === undefined ? valor + paso : Math.min(max, valor + paso))} deshabilitado={deshabilitado || (max !== undefined && valor >= max)} />
    </div>
  );
}
