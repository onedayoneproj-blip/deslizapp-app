"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Isotipo } from "../marca";

export const PASOS_INSTALAR_IOS = [
  "En Safari, toca el menú ☰ de la barra de abajo",
  "Elige Compartir",
  "Toca Ver más",
  "Baja y toca Añadir a pantalla de inicio",
  "Deja Abrir como app web encendido y toca Añadir",
  "Listo. Deslizapp ya vive en tu pantalla de inicio",
];
const PASO_QUIETO = 4; // con movimiento reducido se queda en el paso 5
const CADA_MS = 2200; // 6 momentos ≈ 13 s en bucle

function suscribirMedia(o: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", o); document.addEventListener("visibilitychange", o);
  return () => { media.removeEventListener("change", o); document.removeEventListener("visibilitychange", o); };
}
// Con movimiento reducido (o en el servidor) la animación queda quieta; una pestaña oculta la detiene.
const leerReducido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const leerVisible = () => document.visibilityState === "visible";

/** Escena: aparece con opacity y se posa con transform (sin librerías). */
function Escena({ activa, children }: { activa: boolean; children: React.ReactNode }) {
  return <div className="absolute inset-0 transition-opacity duration-(--mov-normal) ease-(--curva-salida)" style={{ opacity: activa ? 1 : 0 }}>{children}</div>;
}
const Barra = ({ w, className = "" }: { w: number; className?: string }) => <span className={`block h-1.5 rounded-full bg-linea ${className}`} style={{ width: w }} />;
const Toque = ({ activo, x, y }: { activo: boolean; x: number; y: number }) => (
  <span aria-hidden="true" className="absolute size-7 rounded-full bg-texto/30 transition-[transform,opacity] duration-(--mov-entrada) ease-(--curva-salida)"
    style={{ left: x, top: y, opacity: activo ? 1 : 0, transform: activo ? "scale(1)" : "scale(0.4)" }} />
);
function FilaResaltada({ activa, children }: { activa: boolean; children: React.ReactNode }) {
  return <span className="relative flex h-6 items-center gap-2 px-2.5 text-[10px] font-extrabold text-texto">
    <span className="absolute inset-x-1 inset-y-px rounded-lg bg-accion-suave transition-opacity duration-(--mov-normal)" style={{ opacity: activa ? 1 : 0 }} />
    <span className="relative flex items-center gap-2">{children}</span>
  </span>;
}
const FilaGris = ({ w }: { w: number }) => <span className="flex h-6 items-center gap-2 px-2.5"><span className="size-2 rounded-sm bg-linea" /><Barra w={w} /></span>;

/**
 * Ilustración esquemática del flujo de Safari (iOS 26) para añadir Deslizapp a la pantalla de inicio.
 * Decorativa (aria-hidden); los seis pasos van como lista de texto para lectores de pantalla.
 * Solo corre con `activa` y la pestaña visible; con movimiento reducido queda quieta en el paso 5.
 */
export function AnimacionInstalarIos({ activa }: { activa: boolean }) {
  // Al montarse (hoja abierta) empieza del paso 1; al cerrarla se desmonta y se detiene.
  return activa ? <Animacion /> : null;
}

function Animacion() {
  const reducido = useSyncExternalStore(suscribirMedia, leerReducido, () => true);
  const visible = useSyncExternalStore(suscribirMedia, leerVisible, () => true);
  const [tick, setTick] = useState(0);
  const corre = visible && !reducido;
  useEffect(() => {
    if (!corre) return;
    const id = window.setInterval(() => setTick((t) => t + 1), CADA_MS);
    return () => window.clearInterval(id);
  }, [corre]);
  const paso = reducido ? PASO_QUIETO : tick % PASOS_INSTALAR_IOS.length;

  return <div data-animacion-ios className="mt-3">
    <ol className="sr-only">{PASOS_INSTALAR_IOS.map((t, i) => <li key={i}>{i < 5 ? `${i + 1}. ` : ""}{t}</li>)}</ol>
    <div aria-hidden="true" className="rounded-radio-l bg-superficie-hundida py-4">
      <div className="mx-auto h-[360px] w-[176px] rounded-[34px] bg-texto p-[6px]">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-superficie text-texto">
          {/* Pantalla de Safari */}
          <div className="absolute top-5 left-3 flex items-center gap-2"><span className="size-[18px] rounded-full bg-linea" /><Barra w={60} /></div>
          <div className="absolute top-14 left-3 grid gap-1.5"><Barra w={120} className="!h-2.5" /><Barra w={86} className="!h-2.5" /></div>
          <div className="absolute inset-x-3 top-24 rounded-xl bg-superficie-hundida py-1"><FilaGris w={70} /><FilaGris w={56} /><FilaGris w={80} /></div>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            <span className="size-[26px] rounded-full bg-superficie-hundida" />
            <span className="flex h-[26px] w-[92px] items-center gap-2 rounded-full bg-superficie-hundida px-2.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg><Barra w={44} />
            </span>
            <span className="size-[26px] rounded-full bg-superficie-hundida" />
          </div>
          {/* 1 · menú ☰ */}
          <Escena activa={paso === 0}><Toque activo={paso === 0} x={62} y={308} /></Escena>
          {/* 2 · Compartir */}
          <Escena activa={paso === 1}>
            <div className="absolute inset-0 bg-velo" />
            <div className="absolute bottom-11 left-3.5 grid w-[132px] rounded-2xl bg-superficie py-1.5 transition-transform duration-(--mov-entrada) ease-(--curva-salida)" style={{ transformOrigin: "36px 100%", transform: paso === 1 ? "scale(1)" : "scale(0.6)" }}>
              <FilaGris w={52} /><FilaGris w={74} />
              <FilaResaltada activa={paso === 1}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>Compartir</FilaResaltada>
              <FilaGris w={64} /><FilaGris w={46} />
            </div>
            <Toque activo={paso === 1} x={40} y={204} />
          </Escena>
          {/* 3 · Ver más */}
          <Escena activa={paso === 2}>
            <div className="absolute inset-0 bg-velo" />
            <div className="absolute inset-x-0 bottom-0 h-[250px] rounded-t-[20px] bg-fondo p-3.5 transition-transform duration-(--mov-entrada) ease-(--curva-salida)" style={{ transform: paso === 2 ? "translateY(0)" : "translateY(100%)" }}>
              <div className="flex h-[30px] items-center gap-2"><span className="grid size-[26px] place-items-center rounded-lg bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={16} /></span><span className="text-[10px] font-extrabold">deslizapp</span></div>
              <div className="mt-3 flex justify-between"><span className="size-[26px] rounded-full bg-linea" /><span className="size-[26px] rounded-full bg-linea" /><span className="size-[26px] rounded-full bg-linea" /><span className="size-[26px] rounded-full bg-linea" /></div>
              <div className="mt-3 flex items-start justify-between">
                <span className="size-[26px] rounded-full bg-superficie" /><span className="size-[26px] rounded-full bg-superficie" /><span className="size-[26px] rounded-full bg-superficie" />
                <span className="grid w-[26px] justify-items-center gap-0.5"><span className="grid size-[26px] place-items-center rounded-full bg-superficie text-[11px] font-extrabold">···</span><span className="whitespace-nowrap text-[7.5px] font-extrabold">Ver más</span></span>
              </div>
            </div>
            <Toque activo={paso === 2} x={122} y={226} />
          </Escena>
          {/* 4 · Añadir a pantalla de inicio */}
          <Escena activa={paso === 3}>
            <div className="absolute inset-0 bg-velo" />
            <div className="absolute inset-x-0 top-[26px] bottom-0 overflow-hidden rounded-t-[20px] bg-fondo">
              <div className="absolute top-3 left-3.5 flex items-center gap-2"><span className="grid size-[22px] place-items-center rounded-md bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={13} /></span><span className="text-[10px] font-extrabold">deslizapp</span></div>
              <div className="absolute inset-x-2.5 top-[42px] grid rounded-[10px] bg-superficie transition-transform duration-(--mov-entrada) ease-(--curva-salida)" style={{ transform: paso === 3 ? "translateY(-30px)" : "translateY(0)" }}>
                <FilaGris w={66} /><FilaGris w={54} /><FilaGris w={72} /><FilaGris w={48} />
                <FilaResaltada activa={paso === 3}><span className="whitespace-nowrap text-[8.5px]">＋ Añadir a pantalla de inicio</span></FilaResaltada>
              </div>
            </div>
            <Toque activo={paso === 3} x={45} y={121} />
          </Escena>
          {/* 5 · Abrir como app web + Añadir */}
          <Escena activa={paso === 4}>
            <div className="absolute inset-0 bg-fondo" />
            <div className="absolute inset-x-2.5 top-3.5 flex h-[22px] items-center justify-between text-[9px] font-extrabold"><span>Cancelar</span><span className="rounded-full bg-accion px-2 py-0.5 text-sobre-accion">Añadir</span></div>
            <div className="absolute inset-x-2.5 top-12 grid rounded-xl bg-superficie p-2.5">
              <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-[9px] bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={22} /></span><span className="text-[10px] font-extrabold">Deslizapp</span></div>
              <div className="mt-3 flex items-center justify-between border-t border-linea pt-2.5 text-[8.5px] font-extrabold"><span>Abrir como app web</span><span className="flex h-3.5 w-6 items-center justify-end rounded-full bg-accion px-0.5"><span className="size-2.5 rounded-full bg-sobre-accion" /></span></div>
            </div>
            <Toque activo={paso === 4} x={118} y={8} />
          </Escena>
          {/* 6 · Pantalla de inicio */}
          <Escena activa={paso === 5}>
            <div className="absolute inset-0 bg-fondo" />
            <div className="absolute inset-x-4 top-10 grid grid-cols-4 gap-x-3 gap-y-4">
              {Array.from({ length: 7 }, (_, i) => <span key={i} className="aspect-square rounded-[9px] bg-linea" />)}
              <span className="grid justify-items-center gap-1 transition-[transform,opacity] duration-(--mov-entrada) ease-(--curva-resorte)" style={{ transform: paso === 5 ? "scale(1)" : "scale(0.2)", opacity: paso === 5 ? 1 : 0 }}>
                <span className="grid aspect-square w-full place-items-center rounded-[9px] bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={18} /></span>
                <span className="text-[6px] font-extrabold">Deslizapp</span>
              </span>
            </div>
          </Escena>
        </div>
      </div>
      <p className="mx-4 mt-3 min-h-11 text-center text-destacado text-texto">
        {paso < 5 && <span className="mr-1.5 inline-grid size-5 place-items-center rounded-full bg-accion align-middle text-[11px] text-sobre-accion">{paso + 1}</span>}
        {PASOS_INSTALAR_IOS[paso]}
      </p>
    </div>
    <p className="mt-2 text-secundario text-texto-secundario">¿No ves ☰? Toca Compartir directamente.</p>
  </div>;
}
