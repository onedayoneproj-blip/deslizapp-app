"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useData } from "./provider";

/**
 * Ejecuta una consulta asíncrona de `useData()` y la repite cuando cambian los datos
 * (o cuando cambia `clave`, que debe identificar la consulta: p. ej. `productos:${tiendaId}`).
 * Mientras se repite, conserva el último resultado de la misma clave para no parpadear.
 * Si falla (sin conexión, por ejemplo), la pantalla se queda en su estado de carga y el provider
 * muestra el aviso con "Reintentar".
 */
export function useConsulta<T>(
  clave: string,
  consulta: () => Promise<T>,
): {
  data: T | undefined;
  cargando: boolean;
  /** La última lectura de esta clave falló (y todavía no hay resultado): una hoja puede mostrar "Reintentar" en vez de quedarse en blanco. */
  error: boolean;
  /** Vuelve a pedir esta consulta. */
  reintentar: () => void;
} {
  const { version, avisarErrorLectura } = useData();
  const [resultado, setResultado] = useState<{ clave: string; version: number; data: T } | null>(null);
  const [fallo, setFallo] = useState<{ clave: string; version: number } | null>(null);
  const [intento, setIntento] = useState(0);

  const consultaActual = useRef(consulta);
  useEffect(() => {
    consultaActual.current = consulta;
  });

  useEffect(() => {
    let vigente = true;
    consultaActual.current().then(
      (data) => {
        if (!vigente) return;
        startTransition(() => {
          setResultado({ clave, version, data });
          setFallo(null);
        });
      },
      (error: unknown) => {
        if (!vigente) return;
        setFallo({ clave, version });
        avisarErrorLectura(error);
      },
    );
    return () => {
      vigente = false;
    };
  }, [clave, version, intento, avisarErrorLectura]);

  const reintentar = useCallback(() => {
    setFallo(null);
    setIntento((n) => n + 1);
  }, []);

  const mismaClave = resultado?.clave === clave;
  return {
    data: mismaClave ? resultado.data : undefined,
    cargando: !mismaClave || resultado.version !== version,
    error: fallo?.clave === clave && !mismaClave,
    reintentar,
  };
}

/** La tienda con sesión activa (en la demo la elige el selector; en modo real, la de tu cuenta). */
export function useTiendaActiva() {
  const { tiendaActivaId, getTienda } = useData();
  const { data: tienda } = useConsulta(`tienda:${tiendaActivaId}`, () => getTienda(tiendaActivaId));
  return { tiendaId: tiendaActivaId, tienda: tienda ?? null };
}
