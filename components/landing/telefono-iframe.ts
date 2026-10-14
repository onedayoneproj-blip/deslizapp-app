"use client";
// Lo común de los dos teléfonos de la demo (app/demo-landing/*), que viven en iframes de la landing, como «Así se ve»
// (components/tienda/vista-previa-reel.tsx). La landing les manda el paso por postMessage y les pregunta dónde está cada ancla
// del ♥ (window.__dzAncla). Ninguno escribe nada ni usa la red: los datos son lib/landing/db-demo.ts en memoria.

import { useEffect, useRef } from "react";
import { MENSAJE_LISTO, MENSAJE_PASO, type IdAncla, type MensajePaso } from "@/lib/landing/pasos";

export type Rect = { x: number; y: number; w: number };

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

/** Dibuja un toque del dedo sobre un elemento (solo ilustración; no lo pulsa). */
export function tocar(el: Element | null | undefined) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const punto = document.createElement("span");
  punto.setAttribute("aria-hidden", "true");
  Object.assign(punto.style, {
    position: "fixed",
    left: `${r.left + r.width / 2 - 26}px`,
    top: `${r.top + r.height / 2 - 26}px`,
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "rgba(255,249,238,.55)",
    border: "3px solid #ff834f",
    boxShadow: "0 0 0 6px rgba(255,131,79,.25)",
    zIndex: "2147483647",
    pointerEvents: "none",
  });
  document.body.appendChild(punto);
  void punto
    .animate(
      [
        { opacity: 0, transform: "scale(1.6)" },
        { opacity: 1, transform: "scale(1)", offset: 0.35 },
        { opacity: 1, transform: "scale(.9)", offset: 0.7 },
        { opacity: 0, transform: "scale(.9)" },
      ],
      { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" },
    )
    .finished.catch(() => {})
    .finally(() => punto.remove());
}

/** Toca y pulsa de verdad un botón de la app (el like real, «Registrar pedido»…). */
export async function tocarYPulsar(el: Element | null | undefined, antes = 260) {
  if (!el) return;
  tocar(el);
  await esperar(antes);
  (el as HTMLElement).click();
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
