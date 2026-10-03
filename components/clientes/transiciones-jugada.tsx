"use client";

// Transiciones de Tu próxima jugada (excepción de movimiento aprobada, docs/09 §13). Son decoración encima de la navegación real:
// no la retrasan, no mueven el foco y no tocan el historial. Con "reducir movimiento" no se montan (cambio directo).

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DURACION } from "@/lib/movimiento";
import { MallaViva } from "../ui";

type Rect = { left: number; top: number; width: number; height: number };
/** Una carta del mazo al momento de tocar: su centro en pantalla, su giro y su tamaño visible. */
export type CartaEnVuelo = { id: string; x: number; y: number; giro: number; ancho: number; alto: number };
/** Lo que se mide al tocar la tarjeta, antes de navegar. */
export type OrigenEntrada = {
  /** La tarjeta, relativa a la superficie de la hoja. */
  tarjeta: Rect;
  /** La superficie de la hoja (`data-hoja-panel`). */
  hoja: { width: number; height: number };
  cartas: CartaEnVuelo[];
  /** Alto de la cabecera y scroll del contenido al tocar: la vista anterior se queda exactamente donde estaba. */
  cabecera: number;
  scroll: number;
};

/** Mide la tarjeta (relativa a la hoja), la hoja, la cabecera, el scroll y las cartas del mazo (con su giro y escala de ese instante). */
export function medirEntrada(tarjeta: HTMLElement): OrigenEntrada | null {
  const hoja = tarjeta.closest<HTMLElement>("[data-hoja-panel]");
  if (!hoja) return null;
  const h = hoja.getBoundingClientRect();
  const t = tarjeta.getBoundingClientRect();
  const cartas = [...tarjeta.querySelectorAll<HTMLElement>("[data-carta]")].map((el) => {
    const r = el.getBoundingClientRect();
    const estilo = getComputedStyle(el).transform;
    const m = new DOMMatrixReadOnly(estilo === "none" ? undefined : estilo);
    const escala = Math.hypot(m.a, m.b) || 1;
    return { id: el.dataset.carta!, x: r.left + r.width / 2, y: r.top + r.height / 2, giro: (Math.atan2(m.b, m.a) * 180) / Math.PI, ancho: el.offsetWidth * escala, alto: el.offsetHeight * escala };
  });
  const contenido = hoja.querySelector<HTMLElement>("[data-hoja-contenido]");
  return {
    tarjeta: { left: t.left - h.left, top: t.top - h.top, width: t.width, height: t.height },
    hoja: { width: h.width, height: h.height },
    cartas,
    cabecera: parseFloat(hoja.style.getPropertyValue("--cabecera")) || 79,
    scroll: contenido?.scrollTop ?? 0,
  };
}

const CURVA_TARJETA = "cubic-bezier(.65,0,.25,1)";
const CURVA_CARTAS = "cubic-bezier(.5,0,.15,1.08)";
const ESCALON = 70;
/** La malla llega a llenar la hoja en 900 ms; en los 250 ms siguientes se vuelve el brillo de arriba. */
const MALLA = 900;
const MALLA_FIN = 250;
/** Radio de la superficie de la hoja (rounded-t-[30px] en Hoja). */
const RADIO_HOJA = 30;

/** Doble requestAnimationFrame: la vista nueva ya se pintó una vez y el layout está quieto. */
function despuesDeUnCuadro(fn: () => void) {
  let b = 0;
  const a = requestAnimationFrame(() => {
    b = requestAnimationFrame(fn);
  });
  return () => {
    cancelAnimationFrame(a);
    cancelAnimationFrame(b);
  };
}

/** Cruce de un texto a otro (título de la hoja, fila de arriba). Lo anima quien orquesta la transición (`cruzarTextos`). */
export function CruceTexto({ antes, despues }: { antes: ReactNode; despues: ReactNode }) {
  return (
    <span className="inline-grid">
      <span data-cruce="antes" aria-hidden="true" className="col-start-1 row-start-1">
        {antes}
      </span>
      <span data-cruce="despues" className="col-start-1 row-start-1" style={{ opacity: 0 }}>
        {despues}
      </span>
    </span>
  );
}

function cruzarTextos(raiz: HTMLElement, retraso: number, duracion: number): Animation[] {
  const t = { duration: duracion, delay: retraso, easing: "ease", fill: "both" } as const;
  return [
    ...[...raiz.querySelectorAll<HTMLElement>("[data-cruce='antes']")].map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], t)),
    ...[...raiz.querySelectorAll<HTMLElement>("[data-cruce='despues']")].map((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], t)),
  ];
}

/**
 * Capas de la entrada a la galería (van dentro del contenedor `relative` del contenido, como hermanas de la galería):
 * - La malla, del tamaño de la superficie de la hoja desde el principio, debajo de la cabecera y encima de la vista anterior. Solo se
 *   anima su `clip-path`: del rect de la tarjeta (radio 22) a la hoja entera (900 ms). En los últimos 250 ms se apaga hacia abajo como
 *   el `BrilloJugada` de la galería, que ya está debajo: al quitarla no hay salto.
 * - La vista anterior (`[data-entrada-atras]`, montada por quien llama) se desvanece en 300 ms. Las cartas que no tienen cuadro se
 *   quedan en el mazo y se apagan en 180 ms; las que sí, se ocultan porque su cuadro despega de ahí.
 * - FLIP de los cuadros reales de la galería (`[data-jugada-cuadro]`): cada uno vuela desde el rect y el giro de su carta hasta su
 *   lugar (950 ms, escalonados 70 ms). Mientras vuela solo se ve su color y su imagen (centrada como en la carta); al aterrizar entra el
 *   texto en 200 ms.
 * - El título cruza al 35 % (200 ms) y lo demás de la galería (`[data-entrada-resto]`) entra al 60 % de la malla (300 ms).
 * Todo empieza después de un cuadro (doble rAF), con la galería ya montada y quieta.
 */
export function EntradaCapas({ origen, alTerminar }: { origen: OrigenEntrada; alTerminar: () => void }) {
  const malla = useRef<HTMLDivElement>(null);
  const terminar = useRef(alTerminar);
  useLayoutEffect(() => {
    terminar.current = alTerminar;
  });

  useLayoutEffect(() => {
    const el = malla.current;
    const hoja = el?.closest<HTMLElement>("[data-hoja-panel]");
    if (!el || !hoja) return;
    const animaciones: Animation[] = [];
    const { tarjeta: t, hoja: h } = origen;
    const cancelar = despuesDeUnCuadro(() => {
      // Malla: solo clip-path; al final se apaga hacia abajo (como el brillo) y se va
      const desde = `inset(${t.top}px ${h.width - t.left - t.width}px ${h.height - t.top - t.height}px ${t.left}px round 22px)`;
      const hasta = `inset(0px 0px 0px 0px round ${RADIO_HOJA}px ${RADIO_HOJA}px 0px 0px)`;
      animaciones.push(el.animate([{ clipPath: desde }, { clipPath: hasta }], { duration: MALLA, easing: CURVA_TARJETA, fill: "both" }));
      animaciones.push(
        el.animate(
          [
            { "--entrada-a": `${h.height}px`, "--entrada-b": `${h.height + 1}px`, opacity: 1 },
            { "--entrada-a": "112px", "--entrada-b": "320px", opacity: 0 },
          ] as Keyframe[],
          { duration: MALLA_FIN, delay: MALLA, easing: "ease", fill: "both" },
        ),
      );

      // Vista anterior: se desvanece; las cartas del mazo no viajan
      const atras = hoja.querySelector<HTMLElement>("[data-entrada-atras]");
      const cuadros = [...hoja.querySelectorAll<HTMLElement>("[data-jugada-cuadro]")];
      const conCuadro = new Set(cuadros.map((c) => c.dataset.jugadaCuadro));
      if (atras) {
        animaciones.push(atras.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease", fill: "both" }));
        atras.querySelectorAll<HTMLElement>("[data-carta]").forEach((carta) => {
          animaciones.push(
            conCuadro.has(carta.dataset.carta)
              ? carta.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 300, fill: "both" })
              : carta.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease", fill: "both" }),
          );
        });
      }

      // FLIP: cada cuadro despega desde su carta
      cuadros.forEach((cuadro, i) => {
        const carta = origen.cartas.find((c) => c.id === cuadro.dataset.jugadaCuadro);
        const r = cuadro.getBoundingClientRect();
        const retraso = i * ESCALON;
        const vuelo = { duration: DURACION.jugadaEntrada, delay: retraso, easing: CURVA_CARTAS, fill: "both" } as const;
        if (!carta || !r.width) {
          animaciones.push(cuadro.animate([{ opacity: 1 }, { opacity: 1 }], vuelo));
          return;
        }
        const sx = carta.ancho / r.width;
        const sy = carta.alto / r.height;
        const g = (carta.giro * Math.PI) / 180;
        // Con origen arriba a la izquierda: el centro local (ancho/2, alto/2) escalado y girado debe caer en el centro de la carta
        const cx = (carta.ancho / 2) * Math.cos(g) - (carta.alto / 2) * Math.sin(g);
        const cy = (carta.ancho / 2) * Math.sin(g) + (carta.alto / 2) * Math.cos(g);
        const tx = carta.x - r.left - cx;
        const ty = carta.y - r.top - cy;
        animaciones.push(
          cuadro.animate(
            [
              { transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) rotate(${carta.giro}deg) scale(${sx}, ${sy})`, opacity: 1 },
              { transformOrigin: "0 0", transform: "translate(0px, 0px) rotate(0deg) scale(1, 1)", opacity: 1 },
            ],
            vuelo,
          ),
        );
        // La imagen, centrada y del ancho de la carta, como en el mazo
        const imagen = cuadro.querySelector<HTMLElement>("[data-cuadro-imagen]");
        if (imagen) {
          const k = r.width / imagen.offsetWidth;
          const dy = r.height / 2 - (imagen.offsetTop + imagen.offsetHeight / 2);
          animaciones.push(imagen.animate([{ transform: `translateY(${dy}px) scale(${k})` }, { transform: "translateY(0px) scale(1)" }], vuelo));
        }
        // El texto, la cantidad y el chevron entran al aterrizar
        cuadro.querySelectorAll<HTMLElement>("[data-cuadro-detalle]").forEach((d) =>
          animaciones.push(d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: retraso + DURACION.jugadaEntrada, easing: "ease", fill: "both" })),
        );
      });

      // Título al 35 %; la fila de arriba, el párrafo y las notas al 60 % de la malla
      animaciones.push(...cruzarTextos(hoja, Math.round(MALLA * 0.35), 200));
      hoja.querySelectorAll<HTMLElement>("[data-entrada-resto]").forEach((r) =>
        animaciones.push(r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: Math.round(MALLA * 0.6), easing: "ease", fill: "both" })),
      );

      void Promise.all(animaciones.map((a) => a.finished)).then(() => terminar.current(), () => {});
    });
    return () => {
      cancelar();
      animaciones.forEach((a) => a.cancel());
    };
  }, [origen]);

  return (
    <div
      ref={malla}
      aria-hidden="true"
      className="entrada-malla pointer-events-none absolute -left-5 z-[1]"
      style={{
        top: "calc(-1 * var(--cabecera, 79px) - 2px)",
        width: origen.hoja.width,
        height: origen.hoja.height,
        clipPath: `inset(${origen.tarjeta.top}px ${origen.hoja.width - origen.tarjeta.left - origen.tarjeta.width}px ${origen.hoja.height - origen.tarjeta.top - origen.tarjeta.height}px ${origen.tarjeta.left}px round 22px)`,
      }}
    >
      <MallaViva dedo={null} />
    </div>
  );
}

/** Dónde va la vista anterior durante la entrada: exactamente donde estaba al tocar, aunque la cabecera haya crecido. */
export function posicionAtras(origen: OrigenEntrada): CSSProperties {
  return { top: `calc(${origen.cabecera - origen.scroll}px - var(--cabecera, 79px))` };
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

const CURVA_BARRIDO = "cubic-bezier(.65,0,.35,1)";
/** Alto de la franja del degradado. */
const FRANJA = 300;
/** El centro de la franja (y el borde de la máscara) va de 150 px arriba de la hoja a 150 px debajo de su borde de abajo. */
const MARGEN_BARRIDO = 150;
/** Posiciones de las chispas dentro de la franja: [izquierda %, arriba px, retraso ms]. */
const CHISPAS: [number, number, number][] = [
  [18, 150, 0],
  [46, 120, 220],
  [70, 165, 420],
  [86, 128, 140],
  [32, 182, 600],
];

/**
 * La franja del barrido (va en `decoracionEncima`, recortada a la forma de la hoja): los cuatro colores en vertical, dos brillos
 * crema, el grano y cinco chispas. Su centro va de −150 px a H + 150 px (H = alto de la hoja) en 1100 ms, igual que el borde de la
 * máscara de `BarridoContenido`: entra en el primer cuadro y el borde difuminado siempre queda escondido debajo.
 */
export function BarridoFranja({ alTerminar }: { alTerminar: () => void }) {
  const franja = useRef<HTMLDivElement>(null);
  const terminar = useRef(alTerminar);
  useLayoutEffect(() => {
    terminar.current = alTerminar;
  });
  useLayoutEffect(() => {
    const el = franja.current;
    const alto = el?.parentElement?.clientHeight ?? 0;
    if (!el || !alto) return;
    const a = el.animate(
      [{ transform: `translateY(${-MARGEN_BARRIDO - FRANJA / 2}px)` }, { transform: `translateY(${alto + MARGEN_BARRIDO - FRANJA / 2}px)` }],
      { duration: DURACION.jugadaBarrido, easing: CURVA_BARRIDO, fill: "both" },
    );
    void a.finished.then(() => terminar.current(), () => {});
    return () => a.cancel();
  }, []);
  return (
    <div ref={franja} className="barrido-franja" style={{ height: FRANJA, transform: `translateY(${-MARGEN_BARRIDO - FRANJA / 2}px)` }}>
      <i className="barrido-franja-color" />
      <i className="barrido-franja-brillo" />
      <i className="barrido-franja-grano" />
      {CHISPAS.map(([x, y, d]) => (
        <svg key={x} className="barrido-chispa" style={{ left: `${x}%`, top: y, animationDelay: `${d}ms` }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3c.6 4.6 1.9 6.9 4.4 7.9.8.3.8 1.5 0 1.8-2.5 1-3.8 3.3-4.4 7.9-.6-4.6-1.9-6.9-4.4-7.9-.8-.3-.8-1.5 0-1.8C10.1 9.9 11.4 7.6 12 3z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * El detalle de una jugada, con o sin barrido. Siempre la misma estructura (así el detalle no se vuelve a montar al terminar).
 * Con `activo`: la página nueva se descubre con una máscara cuyo borde difuminado (±0,08·H) va donde está la franja (de −150 px a
 * H + 150 px desde el borde de arriba de la hoja, 1100 ms), sube 28 px, y lleva fondo opaco (con su propio brillo) hasta abajo de la
 * hoja para que lo de atrás no se transparente. Lo de atrás (`atras`) baja a opacidad .45 con blur(4px) y scale(.97) con la misma
 * curva, y se desmonta cuando termina la máscara. El título y la fila de arriba cruzan al 12 % (150 ms).
 */
export function BarridoContenido({ activo, atras, children }: { activo: number | null; atras: ReactNode; children: ReactNode }) {
  const nuevo = useRef<HTMLDivElement>(null);
  const viejo = useRef<HTMLDivElement>(null);
  const [terminado, setTerminado] = useState<number | null>(null);
  const conAtras = activo !== null && terminado !== activo;
  useLayoutEffect(() => {
    const el = nuevo.current;
    const hoja = el?.closest<HTMLElement>("[data-hoja-panel]");
    if (activo === null || !el || !hoja) return;
    const h = hoja.getBoundingClientRect();
    const desde = el.getBoundingClientRect().top - h.top;
    el.style.setProperty("--barrido-borde", `${0.08 * h.height}px`);
    el.style.minHeight = `${h.height - desde}px`;
    const tiempo = { duration: DURACION.jugadaBarrido, easing: CURVA_BARRIDO, fill: "both" } as const;
    const mascara = el.animate(
      [{ "--barrido-y": `${-MARGEN_BARRIDO - desde}px` }, { "--barrido-y": `${h.height + MARGEN_BARRIDO - desde}px` }] as Keyframe[],
      tiempo,
    );
    const animaciones = [mascara, el.animate([{ transform: "translateY(28px)" }, { transform: "translateY(0)" }], tiempo), ...cruzarTextos(hoja, Math.round(DURACION.jugadaBarrido * 0.12), 150)];
    if (viejo.current)
      animaciones.push(viejo.current.animate([{ opacity: 1, filter: "blur(0px)", transform: "scale(1)" }, { opacity: 0.45, filter: "blur(4px)", transform: "scale(.97)" }], tiempo));
    void mascara.finished.then(() => setTerminado(activo), () => {});
    return () => {
      animaciones.forEach((a) => a.cancel());
      el.style.removeProperty("min-height");
    };
  }, [activo]);
  return (
    <div className="relative">
      {conAtras && (
        <div ref={viejo} aria-hidden="true" inert className="pointer-events-none absolute inset-x-0 top-0 origin-top">
          {atras}
        </div>
      )}
      <div ref={nuevo} className={conAtras ? "barrido-nuevo relative isolate bg-fondo" : "relative"}>
        {conAtras && <BrilloJugada />}
        {children}
      </div>
    </div>
  );
}
