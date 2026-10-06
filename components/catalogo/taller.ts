"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CREDITOS_POR_RETOQUE } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { creditosReservados, estadoFotoEnTaller, type EstadoFotoTaller } from "@/lib/data/retoques";
import type { TrabajoRetoque } from "@/lib/admin/tipos";
import type { Producto } from "@/lib/types";

/** Cada cuánto se vuelve a mirar el taller mientras una foto espera (y la pantalla está a la vista). */
const CADA_MS = 60_000;
const KEY_VISTAS = "deslizapp-taller-visto-v1";

function leerVistas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY_VISTAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function marcarVista(id: string) {
  try {
    const vistas = [...leerVistas(), id].slice(-200);
    localStorage.setItem(KEY_VISTAS, JSON.stringify(vistas));
  } catch {
    // Sin almacenamiento: la tostada puede salir otra vez, nada más.
  }
}

export type Taller = {
  /** Créditos que se pueden usar ahora (saldo menos lo reservado por las fotos que esperan). */
  libres: number;
  /** El estado de una foto en el taller (por su URL actual en el borrador). */
  estado: (url: string) => EstadoFotoTaller;
  /** ¿Esta URL está guardada en el producto? Solo esas se pueden mandar. */
  guardada: (url: string) => boolean;
  pedir: (url: string) => Promise<boolean>;
  pidiendo: string | null;
  soloMirar: boolean;
  /** Las entregadas de este producto (para cambiar la foto en un borrador abierto). */
  entregadas: TrabajoRetoque[];
};

/**
 * El taller de retoque visto desde la ficha de un producto: lee los trabajos de la tienda, calcula el saldo libre y manda una
 * foto (RPC `pedir_retoque`, o la demo). Mientras una espera, vuelve a mirar cada minuto y al volver a la app.
 */
export function useTaller(producto: Producto | null, avisar: (mensaje: string) => void): Taller {
  const datos = useData();
  const { trabajosRetoque, pedirRetoque, soloMirar } = datos;
  const { tiendaId, tienda } = useTiendaActiva();
  const consulta = useConsulta(`taller:${tiendaId}`, () => trabajosRetoque(tiendaId), true);
  const trabajos = consulta.data;
  const { reintentar } = consulta;
  const [pidiendo, setPidiendo] = useState<string | null>(null);
  const enCurso = useRef(false);
  const productoId = producto?.id ?? null;
  const hayEspera = !!productoId && !!trabajos?.some((t) => t.productoId === productoId && t.estado === "pendiente");

  useEffect(() => {
    if (!hayEspera) return;
    const mirar = () => document.visibilityState === "visible" && reintentar();
    const id = window.setInterval(mirar, CADA_MS);
    document.addEventListener("visibilitychange", mirar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", mirar);
    };
  }, [hayEspera, reintentar]);

  const entregadas = (trabajos ?? []).filter((t) => t.productoId === productoId && t.estado === "entregado" && t.medioUrlRetocado);
  // La primera vez que la tienda ve una foto entregada: la tostada, una sola vez por foto en este dispositivo.
  const ultimaEntregada = entregadas[0]?.id;
  useEffect(() => {
    if (!ultimaEntregada) return;
    const vistas = leerVistas();
    const nuevas = entregadas.filter((t) => !vistas.has(t.id));
    if (!nuevas.length) return;
    for (const t of nuevas) marcarVista(t.id);
    avisar(nuevas.length === 1 ? "Tu foto salió del taller." : "Tus fotos salieron del taller.");
    // Solo cuando aparece una entrega nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimaEntregada]);

  const libres = (tienda?.creditosRetoque ?? 0) - creditosReservados(trabajos ?? [], tiendaId);
  const estado = useCallback((url: string) => (productoId ? estadoFotoEnTaller(trabajos ?? [], productoId, url) : null), [trabajos, productoId]);
  const guardada = (url: string) => !!producto?.medios.some((m) => m.tipo === "foto" && m.url === url);

  const pedir = async (url: string) => {
    if (!productoId || enCurso.current) return false;
    enCurso.current = true;
    setPidiendo(url);
    try {
      await pedirRetoque(tiendaId, productoId, url);
      avisar(`Tu foto está en el taller. Reservamos ${CREDITOS_POR_RETOQUE} créditos; se cobran al entregarla.`);
      return true;
    } catch (e) {
      // Si la respuesta se perdió, se mira el taller antes de decir que no.
      try {
        const ahora = await trabajosRetoque(tiendaId);
        if (ahora.some((t) => t.productoId === productoId && t.medioUrlOriginal === url && t.estado === "pendiente")) {
          reintentar();
          avisar(`Tu foto está en el taller. Reservamos ${CREDITOS_POR_RETOQUE} créditos; se cobran al entregarla.`);
          return true;
        }
      } catch {
        /* se avisa abajo */
      }
      avisar(mensajeDeError(e, "No pudimos mandarla al taller. Inténtalo otra vez."));
      return false;
    } finally {
      enCurso.current = false;
      setPidiendo(null);
    }
  };

  return { libres, estado, guardada, pedir, pidiendo, soloMirar, entregadas };
}
