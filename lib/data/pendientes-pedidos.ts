"use client";

import { useCallback, useEffect, useState } from "react";
import { pendientesPedidos, textoPendientes } from "../pendientes-pedidos";
import { useConsulta } from "./consulta";
import { useData } from "./provider";

/** Publica ambas lecturas juntas por versión; registrar no muestra un total intermedio duplicado o vacío. */
export function usePendientesPedidos() {
  const { tiendaActivaId: tiendaId, getPedidos, solicitudesPendientes, refrescar } = useData();
  const lectura = useConsulta(`trabajo-pedidos:${tiendaId}`, async () => {
    const [pedidos, solicitudes] = await Promise.all([getPedidos(tiendaId), solicitudesPendientes(tiendaId)]);
    return { pedidos, solicitudes, leidoEn: Date.now() };
  }, true);
  const repetirLectura = lectura.reintentar;
  const reintentar = useCallback(() => { refrescar(); repetirLectura(); }, [refrescar, repetirLectura]);
  const [ahora, setAhora] = useState(() => Date.now());
  const solicitudes = lectura.data?.solicitudes;
  // Una solicitud vence aunque no haya escritura ni se cambie de pantalla.
  useEffect(() => {
    const fechas = (solicitudes ?? []).map((s) => Date.parse(s.venceEn)).filter((n) => n > Date.now());
    if (!fechas.length) return;
    const reloj = window.setTimeout(() => setAhora(Date.now()), Math.min(Math.max(0, Math.min(...fechas) - Date.now()), 2_147_483_647));
    return () => window.clearTimeout(reloj);
  }, [solicitudes, ahora]);
  useEffect(() => {
    const actualizar = () => { if (document.visibilityState === "visible") setAhora(Date.now()); };
    window.addEventListener("focus", actualizar);
    document.addEventListener("visibilitychange", actualizar);
    return () => { window.removeEventListener("focus", actualizar); document.removeEventListener("visibilitychange", actualizar); };
  }, []);
  const instante = Math.max(ahora, lectura.data?.leidoEn ?? ahora);
  const vigentes = lectura.data?.solicitudes.filter((s) => s.tiendaId === tiendaId && !s.pedidoId && !s.descartadaEn && Date.parse(s.venceEn) > instante);
  const cuenta = lectura.data ? pendientesPedidos(lectura.data.pedidos, lectura.data.solicitudes, tiendaId, instante) : undefined;
  const descripcion = cuenta ? textoPendientes(cuenta) : "Pendientes por comprobar";
  return { ...lectura, reintentar, pedidos: lectura.data?.pedidos, solicitudes: vigentes, cuenta,
    descripcion: lectura.error ? `${descripcion}. No pudimos actualizar los pendientes` : descripcion };
}
