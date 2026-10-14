"use client";
// Lo común de los dos teléfonos de la demo (app/demo-landing/*), que viven en iframes de la landing, como «Así se ve»
// (components/tienda/vista-previa-reel.tsx). La landing les manda el paso por postMessage; ellos le avisan antes de cada toque
// para que el ♥ vaya hasta ahí (el dedo de la demo) y le dicen dónde están las anclas de un viaje (window.__dzAncla). Ninguno escribe nada ni usa la red: los datos son lib/landing/db-demo.ts en memoria.

import { useEffect, useRef } from "react";
import { DEDO_LLEGA, MENSAJE_LISTO, MENSAJE_PASO, MENSAJE_TOQUE, MENSAJE_VIAJE, type IdAncla, type MensajeDedo, type MensajePaso } from "@/lib/landing/pasos";

export type Rect = { x: number; y: number; w: number };

// El historial de un iframe es el de la página que lo contiene: las hojas reales (components/hoja.tsx) guardan una entrada al
// abrirse y hacen history.back() al cerrarse, y eso deshacía un salto de la landing (el índice, «Saltar») o su «Atrás». Dentro de
// la landing, los teléfonos no tocan el historial: pushState no guarda nada y back solo avisa con su popstate, como el navegador.
if (typeof window !== "undefined" && window.parent !== window) {
  history.pushState = () => {};
  history.back = () => {
    setTimeout(() => window.dispatchEvent(new PopStateEvent("popstate", { state: history.state })), 0);
  };
}

declare global {
  interface Window {
    __dzAncla?: (id: IdAncla) => Rect | null;
    __dzPaso?: number;
  }
}

/** Recibe el paso de la landing (y el de `?paso=N`, para abrir la página sola). `aplicar` se llama en orden y cancela el anterior. */
export function usePasoDeLaLanding(aplicar: (paso: number, animar: boolean, vigente: () => boolean) => Promise<void> | void) {
  const ultimo = useRef(0);
  const ref = useRef(aplicar);
  useEffect(() => {
    ref.current = aplicar;
  });
  useEffect(() => {
    const ir = (paso: number, animar: boolean) => {
      const turno = ++ultimo.current;
      window.__dzPaso = paso;
      void ref.current(paso, animar, () => turno === ultimo.current);
    };
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      const d = e.data as MensajePaso | undefined;
      if (d?.tipo === MENSAJE_PASO) ir(d.paso, d.animar);
    };
    window.addEventListener("message", alMensaje);
    const inicial = Number(new URLSearchParams(location.search).get("paso"));
    if (Number.isFinite(inicial) && inicial > 0) ir(inicial, false);
    if (window.parent !== window) window.parent.postMessage({ tipo: MENSAJE_LISTO }, location.origin);
    return () => window.removeEventListener("message", alMensaje);
  }, []);
}

/** Registra dónde está cada ancla del ♥ en esta página (en px de la página, el centro y el ancho). */
export function useAnclas(buscar: (id: IdAncla) => { el: Element | null; w?: number; dx?: number; caja?: DOMRect | null } | null) {
  const ref = useRef(buscar);
  useEffect(() => {
    ref.current = buscar;
  });
  useEffect(() => {
    window.__dzAncla = (id) => {
      const b = ref.current(id);
      if (!b?.el) return null;
      const r = b.caja ?? b.el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return { x: r.left + r.width / 2 + (b.dx ?? 0), y: r.top + r.height / 2, w: b.w ?? r.width };
    };
    return () => {
      delete window.__dzAncla;
    };
  }, []);
}

export const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const centro = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const enLaLanding = () => window.parent !== window;
const avisar = (tipo: MensajeDedo["tipo"], el: Element) => window.parent.postMessage({ tipo, ...centro(el) } satisfies MensajeDedo, location.origin);

/**
 * Un toque de la demo sobre un elemento (solo ilustración; no lo pulsa). En la landing, el ♥ de la página es el dedo: se le avisa,
 * va hasta el elemento y hace el pulso; se resuelve cuando llega, para que el componente reaccione justo entonces. Sola (`?paso=N`),
 * dibuja un círculo aquí mismo.
 */
export async function tocar(el: Element | null | undefined) {
  if (!el) return;
  if (enLaLanding()) {
    avisar(MENSAJE_TOQUE, el);
    await esperar(DEDO_LLEGA);
    return;
  }
  const { x, y } = centro(el);
  const punto = document.createElement("span");
  punto.setAttribute("aria-hidden", "true");
  Object.assign(punto.style, {
    position: "fixed",
    left: `${x - 26}px`,
    top: `${y - 26}px`,
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "3px solid #ff834f",
    zIndex: "2147483647",
    pointerEvents: "none",
  });
  document.body.appendChild(punto);
  void punto
    .animate([{ opacity: 1, transform: "scale(.6)" }, { opacity: 0, transform: "scale(1.4)" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" })
    .finished.catch(() => {})
    .finally(() => punto.remove());
}

/**
 * Toca y pulsa de verdad un botón de la app (el like real, «Registrar pedido»…) cuando llega el ♥. Espera a que el ♥ se vaya: en
 * un like, el corazón que se ve después es el del burst real.
 */
export async function tocarYPulsar(el: Element | null | undefined, despues = 280) {
  if (!el) return;
  await tocar(el);
  await esperar(despues);
  (el as HTMLElement).click();
}

/** El ♥ lleva el pedido hasta este elemento y se desvanece al llegar. */
export function viajar(el: Element | null | undefined) {
  if (el && enLaLanding()) avisar(MENSAJE_VIAJE, el);
}

/** La caja del TEXTO de un elemento (un título ocupa todo el ancho; su texto, no). */
export function cajaDelTexto(el: Element | null): DOMRect | null {
  if (!el) return null;
  const rango = document.createRange();
  rango.selectNodeContents(el);
  return rango.getBoundingClientRect();
}

/** Un elemento por su texto visible (para los botones de la app que no tienen otro gancho). */
export function porTexto(selector: string, texto: string | RegExp): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>(selector)].find((el) => (typeof texto === "string" ? el.textContent?.trim() === texto : texto.test(el.textContent ?? ""))) ?? null
  );
}
