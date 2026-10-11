"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Medio } from "@/lib/types";
import { Icono } from "./iconos";

const ZOOM_MAX = 4;
const ZOOM_DOBLE = 2.5;
const reducido = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Punto = { x: number; y: number };
type Zoom = { s: number; x: number; y: number };

/**
 * Vista enfocada de las fotos de un producto: fondo negro, la foto entera y nada de la UI del reel. Pellizco (1×–4×),
 * doble toque, arrastre con zoom, deslizar para cambiar de foto y hacia abajo para cerrar. Todo con transform y opacity,
 * sin librerías. La entrada de historial la abre quien la monta (en el mismo toque) y aquí se consume al cerrar.
 */
export function VistaEnfocada({
  medios,
  nombre,
  inicial,
  cerrada,
}: {
  medios: Medio[];
  nombre: string;
  inicial: number;
  /** Al terminar de cerrar, con la última foto vista. */
  cerrada: (indice: number) => void;
}) {
  const [actual, setActual] = useState(inicial);
  const [saliendo, setSaliendo] = useState(false);
  // El portal va dentro del catálogo (sus estilos están acotados a `.catalogo-publico`), fuera de los reels. Solo se monta
  // tras un toque, nunca en el servidor.
  const [raiz] = useState(() => document.querySelector<HTMLElement>(".catalogo-publico"));
  const ref = useRef<HTMLDivElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const actualRef = useRef(inicial);
  const zoom = useRef<Zoom>({ s: 1, x: 0, y: 0 });
  const dedos = useRef(new Map<number, Punto>());
  const gesto = useRef<{
    modo: null | "pan" | "desliza" | "baja" | "pinza" | "nada";
    inicio: Punto;
    t0: number;
    z0: Zoom;
    d0: number;
    local: Punto;
  }>({ modo: null, inicio: { x: 0, y: 0 }, t0: 0, z0: { s: 1, x: 0, y: 0 }, d0: 1, local: { x: 0, y: 0 } });
  const ultimoToque = useRef({ t: 0, x: 0, y: 0 });
  const cerrando = useRef(false);
  const fin = useRef(cerrada);
  useLayoutEffect(() => {
    fin.current = cerrada;
  }, [cerrada]);

  const capa = () => pista.current?.children[actualRef.current]?.firstElementChild as HTMLElement | null | undefined;
  const animar = (el: HTMLElement | null | undefined, si: boolean) => {
    if (el) el.style.transition = si && !reducido() ? "transform var(--mov-normal) var(--curva-salida)" : "none";
  };
  const colocarPista = (dx = 0, suave = false) => {
    const el = pista.current;
    if (!el) return;
    animar(el, suave);
    el.style.transform = `translate3d(calc(${-actualRef.current * 100}% + ${dx}px),0,0)`;
  };
  /** Límites del arrastre con zoom: la foto (contain) no se sale de sus bordes. */
  const acotar = (z: Zoom): Zoom => {
    const el = capa();
    const img = el?.querySelector("img,video") as HTMLImageElement | HTMLVideoElement | null;
    if (!el || !img) return { s: 1, x: 0, y: 0 };
    const W = el.clientWidth,
      H = el.clientHeight;
    const nw = (img as HTMLImageElement).naturalWidth || (img as HTMLVideoElement).videoWidth || W;
    const nh = (img as HTMLImageElement).naturalHeight || (img as HTMLVideoElement).videoHeight || H;
    const f = Math.min(W / nw, H / nh);
    const mx = Math.max(0, (nw * f * z.s - W) / 2),
      my = Math.max(0, (nh * f * z.s - H) / 2);
    return { s: z.s, x: limitar(z.x, -mx, mx), y: limitar(z.y, -my, my) };
  };
  const aplicar = (z: Zoom, suave = false) => {
    zoom.current = z;
    const el = capa();
    if (!el) return;
    animar(el, suave);
    el.style.transform = z.s === 1 && z.x === 0 && z.y === 0 ? "" : `translate3d(${z.x}px,${z.y}px,0) scale(${z.s})`;
    el.dataset.zoom = z.s.toFixed(2);
  };
  const cambiar = (i: number) => {
    const n = limitar(i, 0, medios.length - 1);
    aplicar({ s: 1, x: 0, y: 0 });
    actualRef.current = n;
    setActual(n);
    colocarPista(0, true);
  };
  const salir = () => {
    if (cerrando.current) return;
    cerrando.current = true;
    setSaliendo(true);
    setTimeout(() => fin.current(actualRef.current), reducido() ? 0 : 150);
  };
  const salirRef = useRef(salir);
  const cambiarRef = useRef(cambiar);
  useLayoutEffect(() => {
    salirRef.current = salir;
    cambiarRef.current = cambiar;
  });
  /** Cerrar consume la entrada de historial que se abrió al entrar; el «atrás» del sistema hace lo mismo. */
  const pedirCerrar = () => {
    if (history.state?.catalogoFoto) history.back();
    else salir();
  };
  const pedirCerrarRef = useRef(pedirCerrar);
  useLayoutEffect(() => {
    pedirCerrarRef.current = pedirCerrar;
  });

  useLayoutEffect(() => {
    if (raiz) colocarPista();
    // Solo al montar el portal: después la pista se coloca a mano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raiz]);

  // Modal estable: fondo inerte y sin scroll, teclado, «atrás» y gestos propios de Safari bloqueados.
  useEffect(() => {
    if (!raiz) return;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    const fondoInerte = [...document.querySelectorAll<HTMLElement>("#reels,#profile,.hdr,#bagDock,#cartbar")];
    const estados = fondoInerte.map((el) => el.inert);
    fondoInerte.forEach((el) => (el.inert = true));
    boton.current?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "Escape") pedirCerrarRef.current();
      else if (k === "ArrowRight" || k === "ArrowLeft") cambiarRef.current(actualRef.current + (k === "ArrowRight" ? 1 : -1));
      else if (k === "Tab") boton.current?.focus();
      else if (k !== "ArrowUp" && k !== "ArrowDown") return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const pop = () => {
      if (!history.state?.catalogoFoto) salirRef.current();
    };
    const evitar = (e: Event) => e.preventDefault();
    const el = ref.current;
    window.addEventListener("keydown", tecla, true);
    window.addEventListener("popstate", pop);
    document.addEventListener("gesturestart", evitar);
    el?.addEventListener("touchmove", evitar, { passive: false });
    return () => {
      window.removeEventListener("keydown", tecla, true);
      window.removeEventListener("popstate", pop);
      document.removeEventListener("gesturestart", evitar);
      el?.removeEventListener("touchmove", evitar);
      html.style.overflow = overflow;
      fondoInerte.forEach((el, i) => (el.inert = estados[i]));
    };
  }, [raiz]);

  const centro = (p: Punto): Punto => {
    const r = ref.current!.getBoundingClientRect();
    return { x: p.x - r.left - r.width / 2, y: p.y - r.top - r.height / 2 };
  };
  const inicioDe = (p: Punto) => {
    const g = gesto.current;
    g.modo = null;
    g.inicio = p;
    g.t0 = Date.now();
    g.z0 = { ...zoom.current };
  };
  const empezarPinza = () => {
    const [a, b] = [...dedos.current.values()];
    const g = gesto.current;
    const z = zoom.current;
    const m = centro({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    g.modo = "pinza";
    g.z0 = { ...z };
    g.d0 = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    // El punto de la foto bajo los dedos queda bajo los dedos mientras se acerca.
    g.local = { x: (m.x - z.x) / z.s, y: (m.y - z.y) / z.s };
    colocarPista();
  };
  const mover = (e: React.PointerEvent) => {
    if (!dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (g.modo === "pinza" && dedos.current.size >= 2) {
      const [a, b] = [...dedos.current.values()];
      const s = limitar((g.z0.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0, 1, ZOOM_MAX);
      const m = centro({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      aplicar(acotar({ s, x: m.x - s * g.local.x, y: m.y - s * g.local.y }));
      return;
    }
    const dx = e.clientX - g.inicio.x,
      dy = e.clientY - g.inicio.y;
    if (g.modo === null) {
      if (Math.hypot(dx, dy) < 8) return;
      g.modo =
        zoom.current.s > 1.01 ? "pan" : Math.abs(dx) > Math.abs(dy) ? "desliza" : dy > 0 ? "baja" : "nada";
    }
    if (g.modo === "pan") aplicar(acotar({ s: g.z0.s, x: g.z0.x + dx, y: g.z0.y + dy }));
    else if (g.modo === "desliza") {
      const borde = (dx > 0 && actualRef.current === 0) || (dx < 0 && actualRef.current === medios.length - 1);
      colocarPista(borde ? dx / 3 : dx);
    } else if (g.modo === "baja") {
      const el = capa();
      if (el) {
        animar(el, false);
        el.style.transform = `translate3d(0,${Math.max(0, dy)}px,0)`;
      }
      if (fondo.current) fondo.current.style.opacity = String(1 - Math.min(0.7, Math.max(0, dy) / 400));
    }
  };
  const soltar = (e: React.PointerEvent) => {
    if (!dedos.current.delete(e.pointerId)) return;
    const g = gesto.current;
    if (g.modo === "pinza") {
      if (dedos.current.size === 1) {
        inicioDe([...dedos.current.values()][0]);
        g.modo = "pan";
      } else if (dedos.current.size === 0) {
        g.modo = null;
        if (zoom.current.s < 1.05) aplicar({ s: 1, x: 0, y: 0 }, true);
      }
      return;
    }
    if (dedos.current.size) return;
    const dx = e.clientX - g.inicio.x,
      dy = e.clientY - g.inicio.y;
    const W = ref.current?.clientWidth ?? 1;
    if (g.modo === "desliza") {
      const i = actualRef.current;
      if (dx < -W * 0.18 && i < medios.length - 1) cambiar(i + 1);
      else if (dx > W * 0.18 && i > 0) cambiar(i - 1);
      else colocarPista(0, true);
    } else if (g.modo === "baja") {
      if (dy > 110) pedirCerrar();
      else {
        aplicar({ s: 1, x: 0, y: 0 }, true);
        if (fondo.current) fondo.current.style.opacity = "";
      }
    } else if (g.modo === null && e.type === "pointerup" && Date.now() - g.t0 < 350) {
      // Doble toque: alterna entre 1× y 2,5× centrado donde se tocó.
      const ahora = Date.now(),
        u = ultimoToque.current;
      if (ahora - u.t < 300 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 30) {
        ultimoToque.current.t = 0;
        if (zoom.current.s > 1.01) aplicar({ s: 1, x: 0, y: 0 }, true);
        else {
          const f = centro({ x: e.clientX, y: e.clientY });
          aplicar(acotar({ s: ZOOM_DOBLE, x: f.x - ZOOM_DOBLE * f.x, y: f.y - ZOOM_DOBLE * f.y }), true);
        }
      } else ultimoToque.current = { t: ahora, x: e.clientX, y: e.clientY };
    }
    g.modo = null;
  };

  if (!raiz) return null;
  return createPortal(
    <div
      className={"enfocada" + (saliendo ? " sale" : "")}
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${nombre}`}
      data-enfocada=""
    >
      <div className="enfocada-fondo" ref={fondo} aria-hidden="true" />
      <div
        className="enfocada-escena"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (dedos.current.size === 2) empezarPinza();
          else if (dedos.current.size === 1) inicioDe({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <div className="enfocada-pista" ref={pista}>
          {medios.map((m, i) => (
            <div className="enfocada-medio" key={m.url} aria-hidden={i !== actual}>
              <div className="enfocada-zoom">
                {Math.abs(i - actual) <= 1 &&
                  (m.tipo === "foto" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={nombre} draggable={false} />
                  ) : (
                    <video src={m.url} poster={m.portada ?? undefined} muted playsInline loop autoPlay={i === actual} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="enfocada-cerrar" ref={boton} aria-label="Cerrar" onClick={pedirCerrar}>
        <Icono nombre="close" />
      </button>
      {medios.length > 1 && (
        <p className="enfocada-cuenta" aria-live="polite">
          <span className="enfocada-sr">{medios[actual].tipo === "foto" ? "Foto " : "Video "}</span>
          {actual + 1} / {medios.length}
        </p>
      )}
    </div>,
    raiz,
  );
}
