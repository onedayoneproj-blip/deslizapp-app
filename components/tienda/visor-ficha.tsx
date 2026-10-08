"use client";
import { useEffect, useRef, useState } from "react";
import type { ProductoPublico } from "@/lib/types";
import { AJUSTADA, alternar, mover, pellizcar, transformDe, type Punto, type VistaZoom } from "@/lib/tienda/zoom";
import { DialogoCatalogo } from "./dialogo";

/**
 * Visor de la ficha técnica: la foto a pantalla completa sobre fondo oscuro, con zoom. Pellizcar y mover; un toque rápido alterna
 * entre ajustar y acercar (para cuando el pellizco libre no ande). Superficie propia del catálogo; solo mueve `transform`.
 */
export function VisorFicha({ p, cerrar }: { p: ProductoPublico; cerrar: () => void }) {
  const escena = useRef<HTMLDivElement>(null);
  const imagen = useRef<HTMLImageElement>(null);
  const [vista, setVista] = useState<VistaZoom>(AJUSTADA);
  const actual = useRef(vista);
  const dedos = useRef(new Map<number, Punto>());
  const gesto = useRef<{ inicio: VistaZoom; c0: Punto; d0: number } | null>(null);
  const toque = useRef<{ t: number; x: number; y: number; movido: boolean } | null>(null);
  const poner = (v: VistaZoom) => {
    actual.current = v;
    setVista(v);
  };
  // Safari de iPhone dispara su propio zoom de página con gestos: aquí lo manejamos nosotros.
  useEffect(() => {
    const parar = (e: Event) => e.preventDefault();
    const el = escena.current;
    el?.addEventListener("gesturestart", parar);
    el?.addEventListener("gesturechange", parar);
    return () => {
      el?.removeEventListener("gesturestart", parar);
      el?.removeEventListener("gesturechange", parar);
    };
  }, []);
  const medidas = () => {
    const r = escena.current!.getBoundingClientRect();
    // Tamaño real de la foto: los límites del arrastre salen de lo que ocupa dentro de la escena (contain), no de la escena.
    const img = imagen.current;
    const natural = img && img.naturalWidth > 0 ? { ancho: img.naturalWidth, alto: img.naturalHeight } : null;
    return { r, ancho: r.width, alto: r.height, natural };
  };
  /** Posición relativa al centro del área visible. */
  const centrado = (e: { clientX: number; clientY: number }): Punto => {
    const { r } = medidas();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };
  const dos = () => {
    const [a, b] = [...dedos.current.values()];
    return { c: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }, d: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
  };
  const bajar = (e: React.PointerEvent) => {
    dedos.current.set(e.pointerId, centrado(e));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (dedos.current.size === 2) {
      const { c, d } = dos();
      gesto.current = { inicio: actual.current, c0: c, d0: d };
      toque.current = null;
    } else toque.current = { t: Date.now(), x: e.clientX, y: e.clientY, movido: false };
  };
  const moverDedo = (e: React.PointerEvent) => {
    const antes = dedos.current.get(e.pointerId);
    if (!antes) return;
    const ahora = centrado(e);
    dedos.current.set(e.pointerId, ahora);
    const { ancho, alto, natural } = medidas();
    if (dedos.current.size >= 2 && gesto.current) {
      const { c, d } = dos();
      poner(pellizcar(gesto.current.inicio, gesto.current.c0, gesto.current.d0, c, d, ancho, alto, natural));
    } else if (dedos.current.size === 1) {
      if (toque.current && Math.hypot(e.clientX - toque.current.x, e.clientY - toque.current.y) > 8) toque.current.movido = true;
      if (actual.current.k > 1) poner(mover(actual.current, ahora.x - antes.x, ahora.y - antes.y, ancho, alto, natural));
    }
  };
  const subir = (e: React.PointerEvent) => {
    const eraUno = dedos.current.size === 1;
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) gesto.current = null;
    const t = toque.current;
    if (eraUno && t && !t.movido && Date.now() - t.t < 350) {
      const { ancho, alto, natural } = medidas();
      poner(alternar(actual.current, centrado(e), ancho, alto, natural));
    }
    toque.current = null;
  };
  const cancelar = (e: React.PointerEvent) => {
    dedos.current.delete(e.pointerId);
    gesto.current = null;
    toque.current = null;
  };
  const foto = p.fichaUrl!;
  return (
    <DialogoCatalogo id="fichaBg" nombre={`Ficha técnica de ${p.nombre}`} cerrar={cerrar} clase="sheet-bg ficha-visor">
      <div className="ficha-cab">
        <div className="ficha-tit">
          <strong>Ficha técnica</strong>
          <span>{p.nombre}</span>
        </div>
        <button className="x" aria-label="Cerrar la ficha técnica" onClick={cerrar}>
          ×
        </button>
      </div>
      <div
        ref={escena}
        className="ficha-escena"
        data-ficha-escena
        data-zoom={vista.k.toFixed(2)}
        onPointerDown={bajar}
        onPointerMove={moverDedo}
        onPointerUp={subir}
        onPointerCancel={cancelar}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imagen} src={foto} alt={`Ficha técnica de ${p.nombre}`} draggable={false} style={{ transform: transformDe(vista) }} />
      </div>
      <p className="ficha-pista" aria-hidden="true">
        {vista.k > 1 ? "Toca dos veces para volver" : "Pellizca o toca para acercar"}
      </p>
    </DialogoCatalogo>
  );
}
