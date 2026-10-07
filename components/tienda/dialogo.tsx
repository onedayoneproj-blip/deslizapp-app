"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { decidirGesto, resultadoSoltar } from "@/lib/gesto-hoja";
/** Hojas propias de la superficie pública, fieles al HTML; no aplica tokens del panel. */
export function DialogoCatalogo({
  id,
  nombre,
  cerrar,
  children,
  fondo,
  clase = "sheet-bg",
}: {
  id: string;
  nombre: string;
  cerrar: () => void;
  children: ReactNode;
  clase?: string;
  fondo?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const accion = useRef(cerrar);
  useLayoutEffect(() => {
    accion.current = cerrar;
  }, [cerrar]);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    const fondo = [
      ...document.querySelectorAll<HTMLElement>(
        "#reels,#profile,.hdr,#bagDock,#cartbar",
      ),
    ];
    const estados = fondo.map((el) => el.inert);
    fondo.forEach((el) => (el.inert = true));
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        accion.current();
      }
      if (e.key === "Tab") {
        const elems = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href],input,textarea,summary",
          ) ?? []),
        ].filter((el) => el.getClientRects().length);
        const first = elems[0],
          last = elems.at(-1);
        if (!ref.current?.contains(document.activeElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", tecla);
    const vv = window.visualViewport,
      altoBase = window.innerHeight;
    const teclado = () => {
      const el = ref.current;
      if (!el) return;
      const alto = vv?.height ?? altoBase;
      el.style.setProperty(
        "--teclado",
        Math.max(0, altoBase - alto - (vv?.offsetTop ?? 0)) + "px",
      );
      const campo = document.activeElement as HTMLElement | null;
      if (campo && el.contains(campo) && campo.matches("input,textarea")) {
        const caja = campo.getBoundingClientRect();
        const limite = alto + (vv?.offsetTop ?? 0) - 20;
        const scroll = campo.closest<HTMLElement>(".sbody,.srbody");
        if (scroll && caja.bottom > limite)
          scroll.scrollTop += caja.bottom - limite;
      }
    };
    vv?.addEventListener("resize", teclado);
    vv?.addEventListener("scroll", teclado);

    return () => {
      document.removeEventListener("keydown", tecla);
      vv?.removeEventListener("resize", teclado);
      vv?.removeEventListener("scroll", teclado);
      html.style.overflow = overflow;
      fondo.forEach((el, i) => (el.inert = estados[i]));
      if (anterior?.isConnected && !anterior.matches("input,textarea"))
        anterior.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      id={id}
      className={clase}
      ref={ref}
      data-bg={fondo}
      role="dialog"
      aria-modal="true"
      aria-label={nombre}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      {children}
    </div>
  );
}
const ZONAS_ASA = ".grab,.wahead,.shead,.wagrab";

/** Contenedor que hace scroll vertical bajo el dedo, sin salir de la hoja. */
function contenedorScroll(desde: HTMLElement | null, hoja: HTMLElement) {
  for (let el = desde; el && el !== hoja; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight)
      return el;
  }
  return null;
}

export function PanelCatalogo({
  children,
  clase = "sheet",
  cerrar,
  asa = clase === "sheet",
  ...datos
}: {
  children: ReactNode;
  clase?: string;
  cerrar: () => void;
  asa?: boolean;
  [dato: `data-${string}`]: string | undefined;
}) {
  const [full, setFull] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; id: number } | null>(null);
  const estado = useRef({ full, cerrar });
  useLayoutEffect(() => {
    estado.current = { full, cerrar };
  });
  // Gesto sobre el cuerpo (touch): a media altura, arriba expande; con el cuerpo arriba, abajo arrastra.
  // Va con touch events no pasivos porque hay que cancelar el scroll nativo solo cuando el gesto es de la hoja.
  useEffect(() => {
    const hoja = ref.current;
    if (!hoja) return;
    type Modo = "esperar" | "ignorar" | "scroll" | "expandir" | "arrastrar" | "guiar";
    let g: {
      x: number;
      y: number;
      modo: Modo;
      destino: HTMLElement;
      scroll: HTMLElement | null;
      top0: number;
      guia: { y: number; top: number } | null;
    } | null = null;
    const reset = () => {
      hoja.style.transform = "";
      hoja.style.transition = "";
    };
    // Desplaza el contenedor siguiendo el dedo con JS (sin scroll nativo): tras expandir en el mismo gesto,
    // o cuando Safari no reconoce el cuerpo como desplazable.
    const guiar = (y: number) => {
      if (!g?.scroll) return;
      g.guia ??= { y, top: g.scroll.scrollTop };
      g.scroll.scrollTop = g.guia.top - (y - g.guia.y);
    };
    const inicio = (e: TouchEvent) => {
      g = null;
      const t = e.target as HTMLElement;
      const foco = document.activeElement;
      if (
        e.touches.length !== 1 ||
        t.closest(ZONAS_ASA + ",input,textarea,.x,.wax") ||
        (foco && hoja.contains(foco) && foco.matches("input,textarea"))
      )
        return;
      const scroll = contenedorScroll(t, hoja);
      g = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        modo: "esperar",
        destino: t,
        scroll,
        top0: scroll?.scrollTop ?? 0,
        guia: null,
      };
    };
    const mover = (e: TouchEvent) => {
      if (!g || g.modo === "ignorar") return;
      const y = e.touches[0].clientY;
      const dy = y - g.y;
      const full = estado.current.full;
      // El contenedor se busca también al decidir: al empezar el gesto la hoja podía estar a media altura (cuerpo sin scroll).
      if (full && !g.scroll) {
        g.scroll = contenedorScroll(g.destino, hoja);
        g.top0 = g.scroll?.scrollTop ?? 0;
      }
      if (g.modo === "scroll") {
        // Vigilante: el dedo ya se movió y el contenido no. Si el navegador no inició el scroll nativo, lo guiamos.
        const c = g.scroll;
        const puede = c && (dy < 0 ? c.scrollTop < c.scrollHeight - c.clientHeight - 1 : c.scrollTop > 0);
        if (c && puede && e.cancelable && Math.abs(dy) > 24 && c.scrollTop === g.top0) {
          g.modo = "guiar";
          g.guia = null;
        } else return;
      }
      if (g.modo === "esperar") {
        g.modo = decidirGesto({
          dx: e.touches[0].clientX - g.x,
          dy,
          full,
          scrollTop: full ? (g.scroll?.scrollTop ?? 0) : 0,
        });
        if (g.modo === "esperar") return;
        if (g.modo === "expandir") setFull(true);
        if (g.modo === "arrastrar") hoja.style.transition = "none";
      }
      if (e.cancelable) e.preventDefault();
      if (g.modo === "arrastrar") hoja.style.transform = `translateY(${Math.max(0, dy)}px)`;
      // Expandió en este gesto: en cuanto el cuerpo puede desplazarse, el mismo recorrido ya lo desplaza.
      if (g.modo === "expandir" && estado.current.full) {
        g.scroll ??= contenedorScroll(g.destino, hoja);
        guiar(y);
      }
      if (g.modo === "guiar") guiar(y);
    };
    const fin = (e: TouchEvent) => {
      const actual = g;
      g = null;
      if (actual?.modo !== "arrastrar") return;
      reset();
      if (e.type === "touchcancel") return;
      const dy = e.changedTouches[0].clientY - actual.y;
      const r = resultadoSoltar(dy, estado.current.full);
      if (r === "cerrar") estado.current.cerrar();
      if (r === "reducir") {
        actual.scroll?.scrollTo({ top: 0 });
        setFull(false);
      }
    };
    hoja.addEventListener("touchstart", inicio, { passive: true });
    hoja.addEventListener("touchmove", mover, { passive: false });
    hoja.addEventListener("touchend", fin);
    hoja.addEventListener("touchcancel", fin);
    return () => {
      hoja.removeEventListener("touchstart", inicio);
      hoja.removeEventListener("touchmove", mover);
      hoja.removeEventListener("touchend", fin);
      hoja.removeEventListener("touchcancel", fin);
    };
  }, []);
  const reducir = () => {
    ref.current?.querySelectorAll<HTMLElement>(".sbody,.wabody").forEach((b) => (b.scrollTop = 0));
    setFull(false);
  };
  return (
    <div
      ref={ref}
      {...datos}
      className={clase + (full ? " full" : "")}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".wagrab")) {
          if (full) reducir();
          else setFull(true);
        }
      }}
      onPointerDown={(e) => {
        if (
          !(e.target as HTMLElement).closest(ZONAS_ASA) ||
          (e.target as HTMLElement).closest("input,textarea,.x,.wax")
        )
          return;
        drag.current = { y: e.clientY, id: e.pointerId };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dy = e.clientY - d.y;
        if (dy > 6) {
          e.currentTarget.style.transform = `translateY(${Math.max(0, dy)}px)`;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        e.currentTarget.style.transform = "";
        if (!d) return;
        const dy = e.clientY - d.y;
        const r = resultadoSoltar(dy, full);
        if (r === "cerrar") cerrar();
        else if (r === "reducir") reducir();
        else if (dy < -50) setFull(true);
      }}
      onPointerCancel={(e) => {
        drag.current = null;
        e.currentTarget.style.transform = "";
      }}
    >
      {asa && (
        <button
          className="grab"
          aria-label={full ? "Reducir hoja" : "Ampliar hoja"}
          onClick={() => (full ? reducir() : setFull(true))}
        />
      )}{" "}
      {children}
    </div>
  );
}
