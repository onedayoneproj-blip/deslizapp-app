"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Evento de Chrome/Edge/Samsung Internet que ofrece instalar la app (no está en los tipos de DOM). */
type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

type Estado = { evento: EventoInstalacion | null; instalada: boolean };

// Estado a nivel de módulo: el evento puede llegar antes de que se abra la hoja, así que se guarda aquí.
let estado: Estado = { evento: null, instalada: false };
const oyentes = new Set<() => void>();
const SERVIDOR: Estado = { evento: null, instalada: false };
const poner = (nuevo: Partial<Estado>) => { estado = { ...estado, ...nuevo }; oyentes.forEach((o) => o()); };
const suscribir = (o: () => void) => { oyentes.add(o); return () => { oyentes.delete(o); }; };

/** Se monta una sola vez en el layout: captura `beforeinstallprompt` y `appinstalled` desde que carga la app. */
export function CapturaInstalacion() {
  useEffect(() => {
    const alOfrecer = (e: Event) => { e.preventDefault(); poner({ evento: e as EventoInstalacion }); };
    const alInstalar = () => poner({ evento: null, instalada: true });
    window.addEventListener("beforeinstallprompt", alOfrecer);
    window.addEventListener("appinstalled", alInstalar);
    return () => { window.removeEventListener("beforeinstallprompt", alOfrecer); window.removeEventListener("appinstalled", alInstalar); };
  }, []);
  return null;
}

/**
 * `puedeInstalar`: Chrome ofreció instalar y el evento sigue vivo. `instalar()` abre el diálogo propio de Chrome
 * (no se instala en silencio) y devuelve lo que la persona eligió; el evento se consume, así que después
 * `puedeInstalar` es falso hasta que Chrome lo vuelva a emitir. `instalada`: llegó `appinstalled`.
 */
export function useInstalarPwa() {
  const { evento, instalada } = useSyncExternalStore(suscribir, () => estado, () => SERVIDOR);
  const instalar = async (): Promise<"accepted" | "dismissed" | "no-disponible"> => {
    if (!evento) return "no-disponible";
    poner({ evento: null }); // se consume al llamar prompt()
    try {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      return outcome;
    } catch {
      return "no-disponible";
    }
  };
  return { puedeInstalar: evento !== null, instalada, instalar };
}

const suscribirModo = (o: () => void) => {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", o); window.addEventListener("focus", o);
  return () => { media.removeEventListener("change", o); window.removeEventListener("focus", o); };
};
const leerStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** La app ya corre instalada (modo standalone). Falso en el servidor. */
export function useAppInstalada() {
  return useSyncExternalStore(suscribirModo, leerStandalone, () => false);
}

const leerEsIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
/** iPhone/iPad: no hay API de instalación, solo la guía. Falso en el servidor. */
export function useEsIos() {
  return useSyncExternalStore(() => () => {}, leerEsIos, () => false);
}
