"use client";

import { useLayoutEffect, useReducer, useRef, type ChangeEvent, type ComponentProps } from "react";
import { PRECIO_MAX_DIGITOS, editarPrecio, formatearPrecio } from "@/lib/formato-precio";

/**
 * <input> de precio con comas de miles mientras se escribe (1,850 · 12,500), teclado numérico. `digitos` es el valor limpio
 * ("1850") y `alCambiar` entrega dígitos. El cursor se vuelve a poner donde estaba después de pintar, así no salta al final al
 * escribir ni al borrar en Safari del iPhone. El resto de props va al <input>.
 */
export function InputPrecio({
  digitos,
  alCambiar,
  max = PRECIO_MAX_DIGITOS,
  ...input
}: Omit<ComponentProps<"input">, "value" | "onChange" | "ref" | "type" | "inputMode"> & { digitos: string; alCambiar: (digitos: string) => void; max?: number }) {
  const campo = useRef<HTMLInputElement>(null);
  const cursor = useRef<number | null>(null);
  const [, repintar] = useReducer((n: number) => n + 1, 0);
  const texto = formatearPrecio(digitos);

  useLayoutEffect(() => {
    const donde = cursor.current;
    cursor.current = null;
    if (campo.current && donde !== null && document.activeElement === campo.current) campo.current.setSelectionRange(donde, donde);
  });

  const cambio = (e: ChangeEvent<HTMLInputElement>) => {
    const r = editarPrecio(texto, e.target.value, e.target.selectionStart ?? e.target.value.length, max);
    cursor.current = r.cursor;
    alCambiar(r.digitos);
    repintar(); // aunque los dígitos no cambien (una letra), el cursor se recoloca
  };

  return <input {...input} ref={campo} type="text" inputMode="numeric" value={texto} onChange={cambio} />;
}
