"use client";

import { useEffect, useState } from "react";

const vistas = new Set<string>();

/**
 * true solo la primera vez que se muestra `clave` en esta sesión (y solo mientras dura la
 * entrada): sirve para la entrada escalonada de listas, que no debe repetirse en cada render.
 */
export function usePrimeraVez(clave: string, duracion = 900): boolean {
  const [primera, setPrimera] = useState(() => !vistas.has(clave));
  useEffect(() => {
    vistas.add(clave);
    if (!primera) return;
    const t = window.setTimeout(() => setPrimera(false), duracion);
    return () => window.clearTimeout(t);
  }, [clave, duracion, primera]);
  return primera;
}
