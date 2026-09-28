"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "./provider";

/**
 * Ejecuta una consulta asíncrona de `useData()` y la repite cuando cambian los datos
 * (o cuando cambia `clave`, que debe identificar la consulta: p. ej. `productos:${tiendaId}`).
 * Mientras se repite, conserva el último resultado de la misma clave para no parpadear.
 */
export function useConsulta<T>(clave: string, consulta: () => Promise<T>): { data: T | undefined; cargando: boolean } {
  const { version } = useData();
  const [resultado, setResultado] = useState<{ clave: string; version: number; data: T } | null>(null);

  const consultaActual = useRef(consulta);
  useEffect(() => {
    consultaActual.current = consulta;
  });

  useEffect(() => {
    let vigente = true;
    consultaActual.current().then((data) => {
      if (vigente) setResultado({ clave, version, data });
    });
    return () => {
      vigente = false;
    };
  }, [clave, version]);

  const mismaClave = resultado?.clave === clave;
  return { data: mismaClave ? resultado.data : undefined, cargando: !mismaClave || resultado.version !== version };
}

/** La tienda con sesión activa (hoy la elige el selector; mañana, el login). */
export function useTiendaActiva() {
  const { tiendaActivaId, getTienda } = useData();
  const { data: tienda } = useConsulta(`tienda:${tiendaActivaId}`, () => getTienda(tiendaActivaId));
  return { tiendaId: tiendaActivaId, tienda: tienda ?? null };
}
