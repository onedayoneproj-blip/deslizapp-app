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
import { soloMirar } from "./solo-mirar";
import type { SesionVerComo } from "../admin/tipos";
import { usePathname } from "next/navigation";
import Link from "next/link";

export type DataContexto = FuenteDatos & {
  modo: Modo;
  /** Ver como: la capa de datos bloquea escrituras; no revoca permisos SQL del dueño. */
  soloMirar: boolean;
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
        soloMirar: false,
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
      void fetch("/api/admin/ver-como", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "detectar" }) })
        .then(r => { if (!r.ok) throw new Error("No se pudo comprobar Ver como."); return r.json() as Promise<{ activa?: boolean }>; })
        .then(r => { if (r.activa) window.location.reload(); else refrescar(); })
        .catch(() => window.location.assign("/ver-como/recuperar"));
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
      soloMirar: false,
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

/** Fuente fresca y acotada para Ver como: no comparte caché ni estado de tienda con el dueño. */
export function ProveedorSoloMirar({ children, sesion }: { children: ReactNode; sesion: SesionVerComo & { tiendaNombre: string } }) {
  const [version, setVersion] = useState(0);
  const [instancia] = useState(() => {
    const cliente = createClient();
    const real = crearFuenteSupabase(cliente, () => setVersion((v) => v + 1));
    const lectura = soloMirar(real, sesion, Date.now, async () => {
      const respuesta = await fetch("/api/admin/ver-como", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "validar", sesionId: sesion.id }), cache: "no-store",
      }).catch(() => null);
      if (!respuesta?.ok) {
        real.olvidar();
        if (respuesta?.status === 409) {
          const detalle = await respuesta.json().catch(() => ({})) as { motivo?: string };
          if (detalle.motivo === "reemplazada") window.location.reload();
          else window.location.assign(`/admin/tiendas/${encodeURIComponent(sesion.tiendaId)}`);
        } else window.location.assign("/ver-como/recuperar");
        return false;
      }
      return true;
    });
    return { real, lectura, cliente };
  });
  const refrescar = useCallback(() => {
    instancia.real.olvidar();
    setVersion((v) => v + 1);
  }, [instancia]);
  const cerrarVerComo = useCallback(async (volverAFicha: boolean) => {
    instancia.lectura.cerrar(); instancia.real.olvidar();
    const r = await fetch("/api/admin/ver-como", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "terminar", sesionId: sesion.id }) }).catch(() => null);
    if (!r?.ok) { window.location.assign("/ver-como/recuperar"); return false; }
    if (!volverAFicha) {
      const { error } = await instancia.cliente.auth.signOut();
      if (error) { window.location.assign("/ver-como/recuperar"); return false; }
    }
    window.location.assign(volverAFicha ? `/admin/tiendas/${encodeURIComponent(sesion.tiendaId)}` : "/");
    return true;
  }, [instancia, sesion.id, sesion.tiendaId]);
  const valor = useMemo<DataContexto>(() => ({
    ...instancia.lectura,
    modo: "real", soloMirar: true, tiendaActivaId: sesion.tiendaId, cambiarTiendaActiva: nada,
    version, salir: async () => { await cerrarVerComo(false); }, errorLectura: null, avisarErrorLectura: nada, refrescar,
  }), [instancia, sesion.id, sesion.tiendaId, version, refrescar, cerrarVerComo]);
  useEffect(() => {
    const { data } = instancia.cliente.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        instancia.lectura.cerrar(); instancia.real.olvidar();
        window.location.assign("/");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [instancia]);
  useEffect(() => {
    const restante = Math.max(0, Date.parse(sesion.venceEn) - Date.now());
    const reloj = window.setTimeout(() => {
      instancia.lectura.cerrar(); instancia.real.olvidar();
      void fetch("/api/admin/ver-como", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "terminar", sesionId: sesion.id }) })
        .then(r => { if (r.ok) window.location.assign(`/admin/tiendas/${encodeURIComponent(sesion.tiendaId)}`); else window.location.assign("/ver-como/recuperar"); })
        .catch(() => window.location.assign("/ver-como/recuperar"));
    }, restante);
    const enfocar = () => { if (document.visibilityState === "visible") refrescar(); };
    window.addEventListener("focus", enfocar); document.addEventListener("visibilitychange", enfocar);
    return () => { window.clearTimeout(reloj); window.removeEventListener("focus", enfocar); document.removeEventListener("visibilitychange", enfocar); };
  }, [instancia, refrescar, sesion.venceEn, sesion.id, sesion.tiendaId]);
  return <Contexto.Provider value={valor}><SoloMirarCapa tienda={sesion.tiendaNombre} onSalir={() => void cerrarVerComo(true)}>{children}</SoloMirarCapa></Contexto.Provider>;
}

function SoloMirarCapa({ children, tienda, onSalir }: { children: ReactNode; tienda: string; onSalir: () => void }) {
  const pathname = usePathname();
  const [mensaje, setMensaje] = useState("");
  useEffect(() => {
    const permitida = (el: Element | null) => {
      const control = el?.closest("[data-solo-mirar-permitido], [role=tab], [aria-pressed], [aria-label^='Volver'], [aria-label^='Cerrar'], [aria-label^='Atrás']");
      return !!control || /^(cancelar|volver|cerrar|cerrar sesión y salir|reintentar|ver más|atrás|regresar|listo)$/i.test(el?.closest("button")?.textContent?.trim() ?? "");
    };
    const rutaSoloDemoOEdicion = (pathname: string) => /^\/admin-demo(?:\/|$)|^\/(?:prueba|diseno|novedades|instalar)(?:\/|$)|^\/(?:catalogo\/nuevo|catalogo\/[^/]+\/editar|clientes\/nuevo|pedidos\/nuevo|pedidos\/[^/]+\/editar|promos\/nueva|promos\/[^/]+\/(?:editar|compartir))(?:\/|$)/.test(pathname);
    const bloquear = (ev: Event) => {
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;
      const enlace = target.closest("a[href]") as HTMLAnchorElement | null;
      const boton = target.closest("button, input[type=submit], [role=button]");
      const destino = enlace ? new URL(enlace.href).pathname : "";
      const editableRuta = enlace && /\/(?:editar|nuevo|nueva|crear)(?:\/|$)/.test(destino);
      if (editableRuta || (enlace && rutaSoloDemoOEdicion(destino)) || (boton && !permitida(boton))) {
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.();
        setMensaje(`Aquí solo se mira. Para cambiar algo, escríbele a ${tienda}.`);
        window.setTimeout(() => setMensaje(""), 3500);
      }
      if (ev.type === "submit") {
        ev.preventDefault(); ev.stopPropagation();
        setMensaje(`Aquí solo se mira. Para cambiar algo, escríbele a ${tienda}.`);
      }
    };
    document.addEventListener("click", bloquear, true);
    document.addEventListener("submit", bloquear, true);
    return () => { document.removeEventListener("click", bloquear, true); document.removeEventListener("submit", bloquear, true); };
  }, [tienda]);
  const rutaEditable = /\/(?:editar|nuevo|nueva|crear)(?:\/|$)/.test(pathname);
  const rutaNoPermitida = /^\/admin-demo(?:\/|$)|^\/(?:prueba|diseno|novedades|instalar)(?:\/|$)|^\/(?:catalogo\/nuevo|catalogo\/[^/]+\/editar|clientes\/nuevo|pedidos\/nuevo|pedidos\/[^/]+\/editar|promos\/nueva|promos\/[^/]+\/(?:editar|compartir))(?:\/|$)/.test(pathname);
  return <>
    <div className="sticky top-0 z-50 flex min-h-[56px] items-center gap-2 bg-bosque px-3 text-papel" role="status">
      <span aria-hidden="true">◉</span><span className="min-w-0 flex-1 leading-tight"><strong className="block">Viendo {tienda}</strong><small className="text-papel/80">Solo mirar · queda anotado</small></span>
      <button type="button" data-solo-mirar-permitido onClick={onSalir} className="min-h-11 rounded-full bg-papel px-4 font-bold text-bosque">Salir</button>
    </div>
    {rutaEditable || rutaNoPermitida ? <main className="mx-auto min-h-[60dvh] max-w-[480px] p-5"><h1 className="font-display text-titulo-hoja font-bold text-bosque">Aquí solo se mira</h1><p className="mt-2 text-texto-secundario">Para cambiar algo, escríbele a {tienda}.</p><Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-bosque px-5 font-bold text-papel">Volver al panel</Link></main> : children}
    {mensaje && <div role="status" aria-live="polite" className="fixed bottom-24 left-4 right-4 z-[80] mx-auto max-w-[440px] rounded-radio-m bg-bosque p-4 font-bold text-papel shadow-hoja">{mensaje}</div>}
  </>;
}

export function useData(): DataContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useData() debe usarse dentro de <DataProvider>.");
  return valor;
}
