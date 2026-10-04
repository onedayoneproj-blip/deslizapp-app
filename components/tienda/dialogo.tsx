"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
        if (e.shiftKey && document.activeElement === first) {
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
export function PanelCatalogo({
  children,
  clase = "sheet",
  cerrar,
}: {
  children: ReactNode;
  clase?: string;
  cerrar: () => void;
}) {
  const [full, setFull] = useState(false);
  const drag = useRef<{ y: number; id: number } | null>(null);
  return (
    <div
      className={clase + (full ? " full" : "")}
      onPointerDown={(e) => {
        if (
          !(e.target as HTMLElement).closest(".grab,.wahead,.shead,.wagrab") ||
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
        if (dy > 90) {
          if (full) setFull(false);
          else cerrar();
        } else if (dy < -50) setFull(true);
      }}
      onPointerCancel={(e) => {
        drag.current = null;
        e.currentTarget.style.transform = "";
      }}
    >
      {clase === "sheet" && (
        <button
          className="grab"
          aria-label={full ? "Reducir hoja" : "Ampliar hoja"}
          onClick={() => setFull(!full)}
        />
      )}{" "}
      {children}
    </div>
  );
}
