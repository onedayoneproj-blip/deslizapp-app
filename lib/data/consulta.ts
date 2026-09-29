"use client";

import { addTransitionType, startTransition, useEffect, useRef, useState } from "react";
import { TRANSICION } from "../movimiento";
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

  // Última clave respondida: si llega otra versión de la misma consulta, es un cambio de datos.
  const claveRespondida = useRef<string | null>(null);

  useEffect(() => {
    let vigente = true;
    consultaActual.current().then((data) => {
      if (!vigente) return;
      const esCambio = claveRespondida.current === clave;
      claveRespondida.current = clave;
      // Un cambio de datos va en una transición con tipo: las listas animan lo que entra, sale o
      // se mueve (docs/08-movimiento.md). La primera carga no se anima (ni hace esperar).
      startTransition(() => {
        if (esCambio) addTransitionType(TRANSICION.datos);
        setResultado({ clave, version, data });
      });
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
