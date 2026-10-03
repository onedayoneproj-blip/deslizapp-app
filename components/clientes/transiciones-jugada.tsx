"use client";

// Transiciones de Tu próxima jugada (excepción de movimiento aprobada, docs/09 §13). Son decoración encima de la navegación real:
// no la retrasan, no mueven el foco y no tocan el historial. Con "reducir movimiento" no se montan.

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DURACION } from "@/lib/movimiento";
import { MallaViva } from "../ui";

type Rect = { left: number; top: number; width: number; height: number };
/** Una carta del mazo al momento de tocar: su centro en pantalla, su giro y cómo se ve. */
export type CartaEnVuelo = { id: string; x: number; y: number; giro: number; imagen: string; color: string };
/** Lo que se mide al tocar la tarjeta, antes de navegar. */
export type OrigenEntrada = { tarjeta: Rect; hoja: Rect; cartas: CartaEnVuelo[] };

const rect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/** Mide la tarjeta, la hoja y las cartas del mazo (con el giro que tienen en ese instante del ciclo). */
export function medirEntrada(tarjeta: HTMLElement, cartas: { id: string; imagen: string; color: string }[]): OrigenEntrada | null {
  const hoja = tarjeta.closest<HTMLElement>("[role='dialog']");
  if (!hoja) return null;
  const enVuelo = [...tarjeta.querySelectorAll<HTMLElement>("[data-carta]")].flatMap((el) => {
    const c = cartas.find((x) => x.id === el.dataset.carta);
    if (!c) return [];
    const r = el.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform === "none" ? undefined : getComputedStyle(el).transform);
    return [{ ...c, x: r.left + r.width / 2, y: r.top + r.height / 2, giro: (Math.atan2(m.b, m.a) * 180) / Math.PI }];
  });
  return { tarjeta: rect(tarjeta.getBoundingClientRect()), hoja: rect(hoja.getBoundingClientRect()), cartas: enVuelo };
}

const CURVA_TARJETA = "cubic-bezier(.65,0,.25,1)";
const CURVA_CARTAS = "cubic-bezier(.5,0,.15,1.08)";
const ESCALON = 70;

/**
 * Entrada a la galería: la tarjeta se agranda hasta llenar la hoja (900 ms) y se desvanece al final; su velo se apaga en los
 * primeros 260 ms. Las cuatro cartas vuelan desde el mazo a su cuadro de la galería (950 ms, escalonadas 70 ms), se enderezan y
 * crecen (FLIP: rect de origen y rect de destino). Al terminar avisa para que aparezcan los textos de los cuadros.
 */
export function EntradaJugada({ origen, alTerminar }: { origen: OrigenEntrada; alTerminar: () => void }) {
  const capa = useRef<HTMLDivElement>(null);
  const terminar = useRef(alTerminar);
  useLayoutEffect(() => {
    terminar.current = alTerminar;
  });

  useLayoutEffect(() => {
    const el = capa.current;
    if (!el) return;
    const animaciones: Animation[] = [];
    const { tarjeta, hoja } = origen;

    const malla = el.querySelector<HTMLElement>("[data-entrada-malla]");
    if (malla) {
      animaciones.push(
        malla.animate(
          [
            { left: `${tarjeta.left}px`, top: `${tarjeta.top}px`, width: `${tarjeta.width}px`, height: `${tarjeta.height}px`, borderRadius: "22px", opacity: 1 },
            { left: `${hoja.left}px`, top: `${hoja.top}px`, width: `${hoja.width}px`, height: `${hoja.height}px`, borderRadius: "28px 28px 0 0", opacity: 1, offset: 0.78 },
            { left: `${hoja.left}px`, top: `${hoja.top}px`, width: `${hoja.width}px`, height: `${hoja.height}px`, borderRadius: "28px 28px 0 0", opacity: 0 },
          ],
          { duration: 1150, easing: CURVA_TARJETA, fill: "both" },
        ),
      );
      const velo = malla.querySelector<HTMLElement>(".malla-velo");
      if (velo) animaciones.push(velo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease", fill: "both" }));
    }

    // Destino de cada carta: su cuadro en la galería (ya está montada debajo, invisible hasta que terminemos)
    el.querySelectorAll<HTMLElement>("[data-vuelo]").forEach((carta, i) => {
      const destino = document.querySelector<HTMLElement>(`[data-jugada-cuadro="${carta.dataset.vuelo}"]`)?.getBoundingClientRect();
      const o = origen.cartas[i]!;
      const desde: Keyframe = { left: `${o.x - 29}px`, top: `${o.y - 40}px`, width: "58px", height: "80px", transform: `rotate(${o.giro}deg)`, borderRadius: "13px" };
      const hasta: Keyframe = destino
        ? { left: `${destino.left}px`, top: `${destino.top}px`, width: `${destino.width}px`, height: `${destino.height}px`, transform: "rotate(0deg)", borderRadius: "22px" }
        : { ...desde, opacity: 0 };
      animaciones.push(carta.animate([desde, hasta], { duration: DURACION.jugadaEntrada, delay: i * ESCALON, easing: CURVA_CARTAS, fill: "both" }));
    });

    void Promise.all(animaciones.map((a) => a.finished)).then(() => terminar.current(), () => {});
    return () => animaciones.forEach((a) => a.cancel());
  }, [origen]);

  return createPortal(
    <div ref={capa} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <div data-entrada-malla className="absolute overflow-hidden" style={{ left: origen.tarjeta.left, top: origen.tarjeta.top, width: origen.tarjeta.width, height: origen.tarjeta.height }}>
        <MallaViva dedo={null} />
      </div>
      {origen.cartas.map((c) => (
        <span
          key={c.id}
          data-vuelo={c.id}
          className="absolute overflow-hidden border-[2.5px] border-fondo shadow-flotante"
          style={{ backgroundColor: c.color, left: c.x - 29, top: c.y - 40, width: 58, height: 80, transform: `rotate(${c.giro}deg)` } as CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- pieza decorativa en vuelo; la foto real está en el cuadro */}
          <img src={c.imagen} alt="" className="absolute top-2.5 left-1/2 h-auto max-h-[70%] w-[84%] -translate-x-1/2 object-contain" />
        </span>
      ))}
    </div>,
    document.body,
  );
}

/**
 * El brillo suave de la malla arriba de la hoja (galería y detalle de una jugada), detrás del contenido y de la cabecera. Va como primer
 * hijo de un contenedor `relative` del contenido de la hoja. Quieto con "reducir movimiento".
 */
export function BrilloJugada() {
  return (
    <div aria-hidden="true" className="brillo-jugada pointer-events-none absolute -inset-x-5 top-[calc(-1*var(--cabecera,79px)-2px)] -z-10 h-80">
      <MallaViva dedo={null} />
    </div>
  );
}
