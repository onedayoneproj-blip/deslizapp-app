"use client";

// DataProvider: elige la fuente de datos según el modo (lib/data/sesion.ts) y la da a las pantallas con
// `useData()`. Las dos fuentes cumplen la misma interfaz (lib/data/fuente.ts):
// - demo: lib/data/demo.ts (navegador + localStorage, con selector de tienda);
// - real: lib/data/supabase.ts (Supabase con Google; una cuenta = una tienda).
// Ver docs/05-arquitectura.md.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Usuario } from "../types";
import { createClient } from "../supabase/client";
import { cambiarTiendaActivaDemo, fuenteDemo, leerDemo, suscribirDemo } from "./demo";
import { mensajeDeError } from "./errores";
import type { FuenteDatos } from "./fuente";
import type { Modo } from "./modo";
import { leerSesion, salir, suscribirSesion, type EstadoSesion } from "./sesion";
import { crearFuenteSupabase } from "./supabase";

export type DataContexto = FuenteDatos & {
  modo: Modo;
  /** Demo: la elegida en el selector. Real: la de tu cuenta. */
  tiendaActivaId: string;
  /** Solo demo (en real no hace nada: una cuenta = una tienda). */
  cambiarTiendaActiva: (tiendaId: string) => void;
  /** Sube con cada cambio; las consultas lo usan para volver a leer. */
  version: number;
  /** Cerrar sesión (real) o salir de la demo: vuelve a la pantalla de entrada. */
  salir: () => Promise<void>;
  /** Mensaje si una lectura falló (sin conexión, por ejemplo); null si todo bien. */
  errorLectura: string | null;
  /** Lo llama useConsulta cuando una lectura falla. */
  avisarErrorLectura: (e: unknown) => void;
  /** Vuelve a leer todo (el botón "Reintentar"). */
  refrescar: () => void;
};

const Contexto = createContext<DataContexto | null>(null);

// En el servidor no hay localStorage ni sesión: la app se pinta cuando el navegador tiene los datos.
const nadaEnServidor = () => null;
const nada = () => {};

/** El estado de la sesión (para la pantalla de entrada). null mientras el navegador no lo ha leído. */
export function useSesion(): EstadoSesion | null {
  return useSyncExternalStore(suscribirSesion, leerSesion, nadaEnServidor);
}

/**
 * Monta la fuente de datos del modo activo. Mientras el navegador no ha leído los datos (render del
 * servidor, primer render del cliente, comprobando la sesión) muestra `cargando`; sin modo elegido,
 * con la cuenta sin activar o si no se pudo comprobar la sesión, muestra `entrada`.
 */
export function DataProvider({ children, cargando, entrada }: { children: ReactNode; cargando: ReactNode; entrada: ReactNode }) {
  const sesion = useSesion();
  if (!sesion || sesion.tipo === "cargando") return cargando;
  if (sesion.tipo === "demo") return <ProveedorDemo cargando={cargando}>{children}</ProveedorDemo>;
  if (sesion.tipo === "lista") return <ProveedorReal usuario={sesion.usuario}>{children}</ProveedorReal>;
  return entrada;
}

export function ProveedorDemo({ children, cargando }: { children: ReactNode; cargando: ReactNode }) {
  const e = useSyncExternalStore(suscribirDemo, leerDemo, nadaEnServidor);
  const valor = useMemo<DataContexto | null>(
    () =>
      e && {
        ...fuenteDemo,
        modo: "demo",
        tiendaActivaId: e.tiendaActivaId,
        cambiarTiendaActiva: cambiarTiendaActivaDemo,
        version: e.version,
        salir,
        errorLectura: null,
        avisarErrorLectura: nada,
        refrescar: nada,
      },
    [e],
  );
  if (!valor) return cargando;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function ProveedorReal({ children, usuario }: { children: ReactNode; usuario: Usuario }) {
  const [version, setVersion] = useState(0);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [fuente] = useState(() => crearFuenteSupabase(createClient(), () => setVersion((v) => v + 1)));

  const refrescar = useCallback(() => {
    fuente.olvidar();
    setErrorLectura(null);
    setVersion((v) => v + 1);
  }, [fuente]);

  const avisarErrorLectura = useCallback((e: unknown) => {
    console.warn("No se pudieron leer los datos", e);
    setErrorLectura(mensajeDeError(e, "No pudimos cargar tus datos. Inténtalo otra vez."));
  }, []);

  // Al volver a la app (otra pestaña, el teléfono bloqueado, de WhatsApp o del link de un pedido) se leen los datos de
  // nuevo: pudieron llegar pedidos del catálogo mientras tanto. Visibilidad y foco comparten el mismo freno de 15 s.
  useEffect(() => {
    let ultima = Date.now();
    const alVolver = () => {
      if (document.visibilityState !== "visible" || Date.now() - ultima < 15_000) return;
      ultima = Date.now();
      refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [refrescar]);

  const valor = useMemo<DataContexto>(
    () => ({
      ...fuente,
      modo: "real",
      tiendaActivaId: usuario.tiendaId,
      cambiarTiendaActiva: nada,
      version,
      salir,
      errorLectura,
      avisarErrorLectura,
      refrescar,
    }),
    [fuente, usuario.tiendaId, version, errorLectura, avisarErrorLectura, refrescar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useData(): DataContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useData() debe usarse dentro de <DataProvider>.");
  return valor;
}
