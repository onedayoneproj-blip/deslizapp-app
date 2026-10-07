"use client";

import { usePermisos } from "@/lib/data/permisos";
import { TEXTO_SIN_PERMISO } from "@/lib/equipo";
import { useCallback, useEffect, useRef, useState } from "react";
import { marcaLista as esMarcaLista, type MarcaRetoque } from "@/lib/marca-retoque";
import { avisoFotoEnProceso, MOTIVO_SIN_MARCA } from "@/lib/retoque-textos";
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
  /**
   * Manda al taller una foto de un producto ya guardado, aunque la ficha sea la de un producto que apenas se creó. Con
   * `silencioso` no avisa por su cuenta (quien manda varias fotos junta el resultado en una sola tostada).
   */
  pedirDe: (productoId: string, url: string, opciones?: { silencioso?: boolean }) => Promise<boolean>;
  pidiendo: string | null;
  soloMirar: boolean;
  /** El nivel de esta cuenta no incluye créditos (Ayudante, Editor): el retoque se ve apagado con su porqué. */
  sinPermiso: boolean;
  /** La marca de la tienda para el retoque; undefined mientras se lee. */
  marca: MarcaRetoque | undefined;
  /** La regla «marca lista» (lib/marca-retoque.ts): null mientras se lee. Sin ella no se manda nada al taller. */
  marcaLista: boolean | null;
  /** Las entregadas de este producto (para cambiar la foto en un borrador abierto). */
  entregadas: TrabajoRetoque[];
};

/**
 * El taller de retoque visto desde la ficha de un producto: lee los trabajos de la tienda, calcula el saldo libre y manda una
 * foto (RPC `pedir_retoque`, o la demo). Mientras una espera, vuelve a mirar cada minuto y al volver a la app.
 */
export function useTaller(producto: Producto | null, avisar: (mensaje: string) => void): Taller {
  const datos = useData();
  const { trabajosRetoque, pedirRetoque, soloMirar, getMarcaRetoque } = datos;
  const sinPermiso = !usePermisos().puede("creditos");
  const { tiendaId, tienda } = useTiendaActiva();
  const consulta = useConsulta(`taller:${tiendaId}`, () => trabajosRetoque(tiendaId), true);
  const trabajos = consulta.data;
  const consultaMarca = useConsulta(`marca:${tiendaId}`, () => getMarcaRetoque(tiendaId));
  const marca = consultaMarca.data;
  // Si la lectura falla no se adivina: sin marca confirmada no se manda nada.
  const marcaLista = marca ? esMarcaLista(marca) : consultaMarca.error ? false : null;
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

  const pedirDe = async (destinoId: string, url: string, opciones?: { silencioso?: boolean }) => {
    if (enCurso.current) return false;
    if (sinPermiso) {
      if (!opciones?.silencioso) avisar(TEXTO_SIN_PERMISO);
      return false;
    }
    // La compuerta de la marca también vive aquí: ninguna pantalla manda una foto al taller sin Mi marca lista.
    if (marcaLista !== true) {
      if (!opciones?.silencioso) avisar(MOTIVO_SIN_MARCA);
      return false;
    }
    enCurso.current = true;
    setPidiendo(url);
    const aviso = (mensaje: string) => {
      if (!opciones?.silencioso) avisar(mensaje);
    };
    try {
      await pedirRetoque(tiendaId, destinoId, url);
      aviso(avisoFotoEnProceso());
      return true;
    } catch (e) {
      // Si la respuesta se perdió, se mira el taller antes de decir que no.
      try {
        const ahora = await trabajosRetoque(tiendaId);
        if (ahora.some((t) => t.productoId === destinoId && t.medioUrlOriginal === url && t.estado === "pendiente")) {
          reintentar();
          aviso(avisoFotoEnProceso());
          return true;
        }
      } catch {
        /* se avisa abajo */
      }
      aviso(mensajeDeError(e, "No pudimos mandarla al taller. Inténtalo otra vez."));
      return false;
    } finally {
      enCurso.current = false;
      setPidiendo(null);
    }
  };
  const pedir = async (url: string) => (productoId ? pedirDe(productoId, url) : false);

  return { libres, estado, guardada, pedir, pedirDe, pidiendo, soloMirar, sinPermiso, marca, marcaLista, entregadas };
}
