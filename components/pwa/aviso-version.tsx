"use client";

import { useEffect, useState } from "react";
import { Isotipo } from "../marca";

/** Despliegue con el que se compiló este código (ver next.config.ts). */
const DESPLIEGUE_COMPILADO = process.env.NEXT_PUBLIC_ID_DESPLIEGUE;
const CADA = 60_000;

/**
 * Registra el service worker (solo en producción) y avisa cuando hay un despliegue nuevo:
 * compara el despliegue compilado con el que responde /api/version.
 */
export function AvisoVersion() {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Sin service worker la app funciona igual, solo no se instala ni guarda imágenes.
      });
    } else {
      // En desarrollo, fuera cualquier service worker que haya quedado de una prueba.
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
    }
  }, []);

  useEffect(() => {
    let vigente = true;
    const revisar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { despliegue } = (await r.json()) as { despliegue?: string };
        if (vigente && despliegue && despliegue !== DESPLIEGUE_COMPILADO) setHayNueva(true);
      } catch {
        // Sin conexión: se vuelve a revisar en el próximo intento.
      }
    };
    const inicial = setTimeout(revisar, 3000);
    const intervalo = setInterval(revisar, CADA);
    document.addEventListener("visibilitychange", revisar);
    return () => {
      vigente = false;
      clearTimeout(inicial);
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", revisar);
    };
  }, []);

  const actualizar = async () => {
    try {
      const registro = await navigator.serviceWorker?.getRegistration();
      await registro?.update();
    } catch {
      // Igual recargamos: las páginas y el código siempre se piden a la red primero.
    }
    window.location.reload();
  };

  if (!hayNueva) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[calc(10px+env(safe-area-inset-top))] z-[62] mx-auto flex max-w-[480px] justify-center px-3"
    >
      <div className="flex w-full animate-[bajar-aviso_.3s_cubic-bezier(.2,.8,.3,1)] items-center gap-3 rounded-[22px] bg-bosque py-2.5 pr-2.5 pl-4 text-papel shadow-[0_14px_30px_-12px_rgba(23,75,58,0.6)]">
        <Isotipo tamano={22} className="shrink-0 text-rosa" />
        <p className="min-w-0 flex-1 text-[14.5px] leading-tight font-bold">Hay una versión nueva</p>
        <button
          type="button"
          onClick={actualizar}
          className="h-10 shrink-0 rounded-full bg-mandarina px-4 text-sm font-extrabold text-bosque-oscuro"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}
