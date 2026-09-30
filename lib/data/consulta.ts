"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useData } from "./provider";

/**
 * Ejecuta una consulta asíncrona de `useData()` y la repite cuando cambian los datos
 * (o cuando cambia `clave`, que debe identificar la consulta: p. ej. `productos:${tiendaId}`).
 * Mientras se repite, conserva el último resultado de la misma clave para no parpadear.
 * Si falla (sin conexión, por ejemplo), la pantalla se queda en su estado de carga y el provider
 * muestra el aviso con "Reintentar".
 */
export function useConsulta<T>(clave: string, consulta: () => Promise<T>): { data: T | undefined; cargando: boolean } {
  const { version, avisarErrorLectura } = useData();
  const [resultado, setResultado] = useState<{ clave: string; version: number; data: T } | null>(null);

  const consultaActual = useRef(consulta);
  useEffect(() => {
    consultaActual.current = consulta;
  });

  useEffect(() => {
    let vigente = true;
    consultaActual.current().then(
      (data) => {
        if (!vigente) return;
        startTransition(() => setResultado({ clave, version, data }));
      },
      (error: unknown) => {
        if (vigente) avisarErrorLectura(error);
      },
    );
    return () => {
      vigente = false;
    };
  }, [clave, version, avisarErrorLectura]);

  const mismaClave = resultado?.clave === clave;
  return { data: mismaClave ? resultado.data : undefined, cargando: !mismaClave || resultado.version !== version };
}

/** La tienda con sesión activa (en la demo la elige el selector; en modo real, la de tu cuenta). */
export function useTiendaActiva() {
  const { tiendaActivaId, getTienda } = useData();
  const { data: tienda } = useConsulta(`tienda:${tiendaActivaId}`, () => getTienda(tiendaActivaId));
  return { tiendaId: tiendaActivaId, tienda: tienda ?? null };
}
