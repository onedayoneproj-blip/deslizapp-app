"use client";

import { useEffect, useRef } from "react";
import { Isotipo } from "../marca";

export const PASOS_INSTALAR_IOS = [
  "En Safari, toca el menú ☰ de la barra de abajo",
  "Elige Compartir",
  "Toca Ver más",
  "Baja y toca Añadir a pantalla de inicio",
  "Deja Abrir como app web encendido y toca Añadir",
  "Listo. Deslizapp ya vive en tu pantalla de inicio",
];

/** Escena `n` (1 a 6): sale y entra en su momento de la línea de tiempo (clases `ins-*` en app/globals.css). */
function Escena({ n, className = "", children }: { n: number; className?: string; children: React.ReactNode }) {
  return <div className={`ins-esc ins-d${n} absolute inset-0 ${className}`}>{children}</div>;
}
const Barra = ({ w, className = "" }: { w: number; className?: string }) => <span className={`block h-1.5 rounded-full bg-linea ${className}`} style={{ width: w }} />;
const Toque = ({ n, x, y }: { n: number; x: number; y: number }) => (
  <span aria-hidden="true" className={`ins-toque ins-d${n} absolute size-[30px] rounded-full bg-texto/30`} style={{ left: x, top: y }} />
);
function FilaResaltada({ n, children }: { n: number; children: React.ReactNode }) {
  return <span className="relative flex h-6 items-center gap-2 px-2.5 text-[10px] font-extrabold text-texto">
    <span className={`ins-marca ins-d${n} absolute inset-x-1 inset-y-px rounded-lg bg-accion-suave`} />
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
  const raiz = useRef<HTMLDivElement>(null);
  // Un solo oyente: con la pestaña oculta la línea de tiempo se pausa (sin re-render por cuadro).
  useEffect(() => {
    const el = raiz.current; if (!el) return;
    const alCambiar = () => { el.dataset.pausada = String(document.visibilityState !== "visible"); };
    alCambiar(); document.addEventListener("visibilitychange", alCambiar);
    return () => document.removeEventListener("visibilitychange", alCambiar);
  }, []);

  return <div data-animacion-ios ref={raiz} className="ins-anim mt-3">
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
          <Escena n={1}><Toque n={1} x={35} y={310} /></Escena>
          {/* 2 · Compartir */}
          <Escena n={2}>
            <div className="ins-velo ins-d2 absolute inset-0 bg-velo" />
            <div className="ins-pop ins-d2 absolute bottom-11 left-3.5 grid w-[132px] rounded-2xl bg-superficie py-1.5" style={{ transformOrigin: "36px 100%" }}>
              <FilaGris w={52} /><FilaGris w={74} />
              <FilaResaltada n={2}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>Compartir</FilaResaltada>
              <FilaGris w={64} /><FilaGris w={46} />
            </div>
            <Toque n={2} x={39} y={206} />
          </Escena>
          {/* 3 · Ver más */}
          <Escena n={3}>
            <div className="absolute inset-0 bg-velo" />
            <div className="ins-sube ins-d3 absolute inset-x-0 bottom-0 h-[250px] rounded-t-[20px] bg-fondo p-3.5">
              <div className="flex h-[30px] items-center gap-2"><span className="grid size-[26px] place-items-center rounded-lg bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={16} /></span><span className="text-[10px] font-extrabold">deslizapp</span></div>
              <div className="mt-3 flex justify-between"><span className="size-[26px] rounded-full bg-linea" /><span className="size-[26px] rounded-full bg-linea" /><span className="size-[26px] rounded-full bg-linea" /><span className="size-[26px] rounded-full bg-linea" /></div>
              <div className="mt-3 flex items-start justify-between">
                <span className="size-[26px] rounded-full bg-superficie" /><span className="size-[26px] rounded-full bg-superficie" /><span className="size-[26px] rounded-full bg-superficie" />
                <span className="grid w-[26px] justify-items-center gap-0.5"><span className="grid size-[26px] place-items-center rounded-full bg-superficie text-[11px] font-extrabold">···</span><span className="whitespace-nowrap text-[7.5px] font-extrabold">Ver más</span></span>
              </div>
            </div>
            <Toque n={3} x={122} y={226} />
          </Escena>
          {/* 4 · Añadir a pantalla de inicio */}
          <Escena n={4}>
            <div className="absolute inset-0 bg-velo" />
            <div className="absolute inset-x-0 top-[26px] bottom-0 overflow-hidden rounded-t-[20px] bg-fondo">
              <div className="absolute top-3 left-3.5 flex items-center gap-2"><span className="grid size-[22px] place-items-center rounded-md bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={13} /></span><span className="text-[10px] font-extrabold">deslizapp</span></div>
              <div className="ins-lista ins-d4 absolute inset-x-2.5 top-[42px] grid rounded-[10px] bg-superficie">
                <FilaGris w={66} /><FilaGris w={54} /><FilaGris w={72} /><FilaGris w={48} /><FilaGris w={60} />
                <FilaResaltada n={4}><span className="whitespace-nowrap text-[8.5px]">＋ Añadir a pantalla de inicio</span></FilaResaltada>
              </div>
            </div>
            <Toque n={4} x={45} y={129} />
          </Escena>
          {/* 5 · Abrir como app web + Añadir */}
          <Escena n={5} className="bg-fondo">
            <div className="absolute inset-x-2.5 top-3.5 flex h-[22px] items-center justify-between text-[9px] font-extrabold"><span>Cancelar</span><span className="rounded-full bg-accion px-2.5 py-1 text-sobre-accion">Añadir</span></div>
            <div className="absolute inset-x-2.5 top-12 grid rounded-xl bg-superficie p-2.5">
              <div className="flex items-center gap-2.5"><span className="grid size-[34px] place-items-center rounded-[9px] bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={21} /></span><span className="text-[11px] font-extrabold">deslizapp</span></div>
            </div>
            <div className="absolute inset-x-2.5 top-[114px] flex items-center justify-between rounded-xl bg-superficie p-2.5 text-[9.5px] font-extrabold"><span>Abrir como app web</span><span className="relative h-[18px] w-[30px] rounded-full bg-accion"><span className="absolute top-0.5 right-0.5 size-3.5 rounded-full bg-sobre-accion" /></span></div>
            <Toque n={5} x={116} y={10} />
          </Escena>
          {/* 6 · Pantalla de inicio */}
          <Escena n={6} className="bg-accion-suave">
            <div className="absolute inset-x-4 top-10 grid grid-cols-4 gap-x-3 gap-y-4">
              {Array.from({ length: 7 }, (_, i) => <span key={i} className="aspect-square rounded-[9px] bg-linea" />)}
              <span className="grid justify-items-center gap-1">
                <span className="ins-icono ins-d6 grid aspect-square w-full place-items-center rounded-[9px] bg-marca-rosa-fija text-bosque-oscuro"><Isotipo tamano={18} /></span>
                <span className="text-[6px] font-extrabold">Deslizapp</span>
              </span>
            </div>
          </Escena>
        </div>
      </div>
      <div className="relative mx-4 mt-3 h-11">
        {PASOS_INSTALAR_IOS.map((t, i) => <p key={i} className={`ins-cap ins-d${i + 1} absolute inset-0 flex items-center justify-center gap-2 text-center text-destacado text-texto`}>
          {i < 5 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accion text-[11px] text-sobre-accion">{i + 1}</span>}
          <span>{t}</span>
        </p>)}
      </div>
    </div>
    <p className="mt-2 text-secundario text-texto-secundario">¿No ves ☰? Toca Compartir directamente.</p>
  </div>;
}
