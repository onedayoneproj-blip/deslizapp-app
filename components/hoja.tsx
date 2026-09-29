"use client";

// Hoja inferior (bottom sheet). Todas las hojas del panel usan este componente.
// Su comportamiento manda sobre el prototipo (ver docs/04-pantallas.md).
//
// - Pegada a los bordes izquierdo, derecho e inferior, con solo las esquinas de arriba redondeadas
//   (30 px, igual en todos los modelos y en todas las alturas). Su fondo llega al borde físico de
//   abajo (incluido el safe area); el relleno inferior del contenido es
//   max(1.75rem, safe area + 1rem). En escritorio (> 480 px) va centrada con ancho máximo.
// - Altura máxima: hasta debajo de la barra de estado (--hoja-tope en globals.css: safe area de
//   arriba + 10 px, mínimo 20 px; 24 px en escritorio). El fondo oscuro queda visible encima.
// - Alturas: "auto" (se ajusta al contenido), "expandible" (media ↔ altura máxima), "grande"
//   (altura máxima desde el inicio). Pasar de media a grande solo cambia la altura visible.
// - Cabecera fija (tirador + título + X) superpuesta al contenido: el área de scroll ocupa toda la
//   hoja y pasa por detrás de la cabecera, con un borde de desplazamiento (desenfoque progresivo +
//   degradado, clases .hoja-borde de globals.css) que aparece en los primeros 24 px de scroll.
// - Se cierra deslizando hacia abajo (más de ~30 % o con velocidad); si no, vuelve a su lugar.
// - El arrastre solo mueve la hoja si el contenido está arriba del todo o si el gesto empieza en la
//   cabecera: el scroll y el arrastre nunca se pelean (se decide al primer movimiento del dedo).
// - Se anima `transform` y la opacidad del fondo, siguiendo el dedo sin retraso.
// - TECLADO (regla permanente, ver HANDOFF.md): la hoja NO cambia de tamaño, de posición ni de estado
//   cuando se abre el teclado. Solo escribe una variable CSS (`--teclado`) que da espacio al final del
//   contenido, y desplaza el contenido para que el campo enfocado quede a la vista. Nada de
//   re-renders ni de tocar el foco por eventos de `resize`/`visualViewport`: en iOS eso cierra el teclado.
//
// Implementación propia: se evaluó `vaul`, pero su repositorio está sin mantenimiento.

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as EventoFoco,
  type PointerEvent as EventoPuntero,
  type ReactNode,
} from "react";
import { CURVA as CURVAS, DURACION as DURACIONES } from "@/lib/movimiento";
import { IconoCerrar } from "./iconos";

export type AlturaHoja = "auto" | "expandible" | "grande";
type Nivel = "media" | "grande";

/** Altura máxima: toda la pantalla menos el tope de arriba (debajo de la barra de estado). */
const ALTO_MAXIMO = "calc(100dvh - var(--hoja-tope))";
const ALTO_MEDIA = 0.6; // fracción de la pantalla visible en "expandible" a media altura
/** Scroll (px) en el que el borde de desplazamiento bajo la cabecera pasa de invisible a completo. */
const SCROLL_BORDE = 24;
// Tokens del sistema de movimiento (docs/08-movimiento.md).
const DURACION = DURACIONES.entrada;
const CURVA = CURVAS.salida;

type Props = {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  /** Cómo se comporta la altura (por defecto "auto"). */
  altura?: AlturaHoja;
  children: ReactNode;
};

export function Hoja(props: Props) {
  // Queda montada mientras dura la animación de salida.
  const [montada, setMontada] = useState(props.abierta);
  if (props.abierta && !montada) setMontada(true);
  if (!montada) return null;
  return <HojaMontada {...props} alDesmontar={() => setMontada(false)} />;
}

/** Alto de la pantalla (la ventana; en iOS no cambia cuando se abre el teclado). */
const altoPantalla = () => window.innerHeight;

/** true si el elemento es un campo donde se escribe (abre el teclado). */
function esCampo(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

function HojaMontada({
  abierta,
  alCerrar,
  titulo,
  altura = "auto",
  children,
  alDesmontar,
}: Props & { alDesmontar: () => void }) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const cabecera = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  const borde = useRef<HTMLDivElement>(null);

  const [nivel, setNivelEstado] = useState<Nivel>(altura === "expandible" ? "media" : "grande");

  const nivelRef = useRef(nivel);
  const y = useRef(0); // desplazamiento vertical actual del panel (0 = arriba del todo)
  const saliendo = useRef(false);
  const fuera = useRef(false);
  const reducido = useRef(false);
  const quitarWillChange = useRef(0);
  const gesto = useRef<{
    y0: number;
    x0: number;
    yIni: number;
    desde: "cabecera" | "contenido";
    decidido: null | "hoja" | "nativo";
    puntos: { y: number; t: number }[];
  } | null>(null);

  const altoPanel = () => panel.current?.offsetHeight ?? 0;
  const yMedia = () => Math.max(0, altoPanel() - altoPantalla() * ALTO_MEDIA);
  const yDe = useCallback(
    (n: Nivel) => (altura === "expandible" && n === "media" ? Math.max(0, (panel.current?.offsetHeight ?? 0) - altoPantalla() * ALTO_MEDIA) : 0),
    [altura],
  );
  const yCerrada = () => altoPanel() + 24;

  /** Mueve el panel (y la opacidad del fondo) a `valor`. */
  const aplicar = useCallback(
    (valor: number, animado: boolean) => {
      const p = panel.current;
      const f = fondo.current;
      if (!p || !f) return;
      y.current = valor;
      p.style.transition = animado && !reducido.current ? `transform ${DURACION}ms ${CURVA}` : "none";
      // will-change solo mientras se mueve (arrastre o animación), no todo el tiempo.
      p.style.willChange = "transform";
      window.clearTimeout(quitarWillChange.current);
      if (!gesto.current) {
        quitarWillChange.current = window.setTimeout(
          () => {
            p.style.willChange = "";
            // En reposo (y = 0) no queda ninguna transformación en el panel, ancestro de los campos de texto.
            if (y.current === 0 && !saliendo.current) p.style.transform = "none";
          },
          animado ? DURACION + 50 : 100,
        );
      }
      p.style.transform = `translate3d(0, ${valor}px, 0)`;
      const alto = p.offsetHeight;
      // En "expandible" el panel siempre mide la altura máxima; a media altura se empuja hacia abajo.
      const media = altura === "expandible" ? Math.max(0, alto - altoPantalla() * ALTO_MEDIA) : 0;
      // El fondo pierde opacidad a medida que la hoja baja desde su posición de reposo.
      const base = media;
      const recorrido = Math.max(1, alto + 24 - base);
      f.style.transition = animado && !reducido.current ? `opacity ${DURACION}ms ${CURVA}` : "none";
      f.style.opacity = String(1 - Math.min(1, Math.max(0, (valor - base) / recorrido)));
    },
    [altura],
  );

  const irA = useCallback(
    (n: Nivel, animado = true) => {
      nivelRef.current = n;
      setNivelEstado(n);
      aplicar(yDe(n), animado);
    },
    [aplicar, yDe],
  );

  /** Cierre iniciado desde la hoja (X, Escape, fondo, deslizar): anima y luego avisa. */
  const cerrar = useCallback(() => {
    if (saliendo.current) return;
    saliendo.current = true;
    aplicar((panel.current?.offsetHeight ?? 0) + 24, true);
    window.setTimeout(
      () => {
        fuera.current = true;
        alCerrar();
      },
      reducido.current ? 0 : DURACION,
    );
  }, [aplicar, alCerrar]);

  /** El contenido empieza debajo de la cabecera superpuesta: su alto va en --cabecera (directo al DOM). */
  const medirCabecera = useCallback(() => {
    const alto = cabecera.current?.offsetHeight;
    if (alto) panel.current?.style.setProperty("--cabecera", `${alto}px`);
  }, []);
  useEffect(() => {
    const c = cabecera.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medirCabecera);
    observador.observe(c);
    return () => observador.disconnect();
  }, [medirCabecera]);

  /** Borde de desplazamiento: invisible arriba del todo, completo a los SCROLL_BORDE px. */
  const alDesplazar = () => {
    const c = contenido.current;
    const b = borde.current;
    if (!c || !b) return;
    const v = Math.min(1, Math.max(0, c.scrollTop / SCROLL_BORDE));
    b.style.setProperty("--borde", String(v));
    // Oculto del todo en 0: el navegador no calcula el desenfoque mientras no se ve.
    b.style.visibility = v > 0 ? "visible" : "hidden";
  };

  // Entrada: empieza fuera de la pantalla y sube a su nivel.
  useLayoutEffect(() => {
    reducido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    medirCabecera();
    aplicar(yCerrada(), false);
    const raf = requestAnimationFrame(() => aplicar(yDe(nivelRef.current), true));
    return () => cancelAnimationFrame(raf);
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salida cuando el padre cierra la hoja (abierta = false).
  useEffect(() => {
    if (abierta) return;
    if (fuera.current) {
      alDesmontar();
      return;
    }
    saliendo.current = true;
    aplicar((panel.current?.offsetHeight ?? 0) + 24, true);
    const t = window.setTimeout(alDesmontar, reducido.current ? 0 : DURACION);
    return () => window.clearTimeout(t);
  }, [abierta, aplicar, alDesmontar]);

  // ---- Teclado ----
  // Regla: el teclado NO toca el estado de React, ni la altura o posición de la hoja, ni el foco.
  // Solo (1) escribe `--teclado` (px tapados por el teclado) en el contenido, para que pueda
  // desplazarse hasta el último campo, y (2) desplaza ese contenido para dejar a la vista el campo
  // enfocado. Se hace con escritura directa al DOM, agrupada por cuadro.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const acomodar = () => {
      raf = 0;
      const c = contenido.current;
      if (!c) return;
      const tapado = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      c.style.setProperty("--teclado", `${tapado}px`);
      const campo = document.activeElement;
      if (tapado > 0 && campo instanceof HTMLElement && c.contains(campo) && esCampo(campo)) {
        const visibleAbajo = vv.offsetTop + vv.height - 16;
        const r = campo.getBoundingClientRect();
        // El contenido pasa por detrás de la cabecera: lo visible empieza debajo de ella.
        const visibleArriba = c.getBoundingClientRect().top + (cabecera.current?.offsetHeight ?? 0) + 8;
        if (r.bottom > visibleAbajo) c.scrollTop += r.bottom - visibleAbajo;
        else if (r.top < visibleArriba) c.scrollTop -= visibleArriba - r.top;
      }
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(acomodar);
    };
    vv.addEventListener("resize", pedir);
    vv.addEventListener("scroll", pedir);
    return () => {
      vv.removeEventListener("resize", pedir);
      vv.removeEventListener("scroll", pedir);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Al enfocar un campo (el teclado tarda un poco en abrirse), se asegura que quede a la vista.
  const alEnfocarCampo = (e: EventoFoco<HTMLDivElement>) => {
    if (!esCampo(e.target)) return;
    // Sin animar y SIN mover la hoja mientras el campo tiene el foco (regla del teclado).
    if (altura === "expandible" && nivelRef.current === "media") irA("grande", false);
    const campo = e.target as HTMLElement;
    window.setTimeout(() => {
      const vv = window.visualViewport;
      const c = contenido.current;
      if (!vv || !c || document.activeElement !== campo) return;
      const visibleAbajo = vv.offsetTop + vv.height - 16;
      const r = campo.getBoundingClientRect();
      if (r.bottom > visibleAbajo) c.scrollTop += r.bottom - visibleAbajo;
    }, 350);
  };

  // Lo último que se pidió cerrar: los listeners de abajo lo leen sin volver a montarse.
  const cerrarRef = useRef(cerrar);
  useEffect(() => {
    cerrarRef.current = cerrar;
  });

  // Bloquea el fondo mientras está abierta; foco dentro al abrir y de vuelta al cerrar; Escape y Tab.
  // Efecto ESTABLE (sin dependencias): si se volviera a ejecutar mientras se escribe, su limpieza
  // devolvería el foco al botón que abrió la hoja y el teclado se cerraría.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const previo = { overflow: document.body.style.overflow, overscroll: html.style.overscrollBehavior };
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    // El foco va a la hoja solo si no está ya dentro (un campo con autoFocus, por ejemplo).
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cerrarRef.current();
      } else if (e.key === "Tab" && panel.current) {
        const enfocables = [...panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)].filter((el) => el.offsetParent !== null);
        if (enfocables.length === 0) return;
        const primero = enfocables[0]!;
        const ultimo = enfocables[enfocables.length - 1]!;
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel.current)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo.overflow;
      html.style.overscrollBehavior = previo.overscroll;
      if (anterior && document.contains(anterior)) anterior.focus({ preventScroll: true });
    };
  }, []);

  // ---- Arrastre ----

  const mover = useCallback(
    (valor: number) => {
      // Más arriba del tope: resistencia elástica.
      const tope = 0;
      aplicar(valor < tope ? tope - Math.sqrt(tope - valor) * 3 : valor, false);
    },
    [aplicar],
  );

  const soltar = useCallback(() => {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.decidido !== "hoja") return;
    const recientes = g.puntos.filter((p) => performance.now() - p.t < 120);
    const primero = recientes[0] ?? g.puntos[0]!;
    const ultimo = g.puntos[g.puntos.length - 1]!;
    const velocidad = ultimo.t > primero.t ? (ultimo.y - primero.y) / (ultimo.t - primero.t) : 0; // px/ms, + = hacia abajo
    const actual = y.current;
    const alto = altoPanel();

    if (altura === "expandible") {
      const media = yMedia();
      if (nivelRef.current === "grande") {
        if (actual > media + 0.3 * (alto - media) || (velocidad > 1.4 && actual > media * 0.6)) cerrar();
        else if (velocidad > 0.4 || actual > media / 2) irA("media");
        else irA("grande");
      } else {
        if (actual < media - 40 || velocidad < -0.4) irA("grande");
        else if (actual > media + 0.3 * (alto - media) || velocidad > 0.5) cerrar();
        else irA("media");
      }
      return;
    }
    if (actual > 0.3 * alto || velocidad > 0.5) cerrar();
    else aplicar(0, true);
    // yMedia/altoPanel leen el DOM en el momento: no hacen falta como dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [altura, aplicar, cerrar, irA]);

  // Dedo (touch events, para poder decidir en el primer movimiento y cancelar el scroll nativo).
  useEffect(() => {
    const p = panel.current;
    if (!p) return;
    const inicio = (e: TouchEvent) => {
      if (e.touches.length !== 1 || saliendo.current) return;
      const t = e.touches[0]!;
      gesto.current = {
        y0: t.clientY,
        x0: t.clientX,
        yIni: y.current,
        desde: cabecera.current?.contains(e.target as Node) ? "cabecera" : "contenido",
        decidido: null,
        puntos: [{ y: t.clientY, t: performance.now() }],
      };
    };
    const movimiento = (e: TouchEvent) => {
      const g = gesto.current;
      if (!g) return;
      const t = e.touches[0]!;
      const dy = t.clientY - g.y0;
      const dx = t.clientX - g.x0;
      if (g.decidido === null) {
        if (dy === 0 && dx === 0) return;
        if (Math.abs(dx) > Math.abs(dy)) g.decidido = "nativo";
        else {
          const enTope = (contenido.current?.scrollTop ?? 0) <= 0;
          const enMedia = altura === "expandible" && nivelRef.current === "media";
          g.decidido = g.desde === "cabecera" || enMedia || (dy > 0 && enTope) ? "hoja" : "nativo";
        }
      }
      if (g.decidido !== "hoja") return;
      if (e.cancelable) e.preventDefault(); // el scroll de atrás no se mueve
      g.puntos.push({ y: t.clientY, t: performance.now() });
      if (g.puntos.length > 12) g.puntos.shift();
      mover(g.yIni + dy);
    };
    p.addEventListener("touchstart", inicio, { passive: true });
    p.addEventListener("touchmove", movimiento, { passive: false });
    p.addEventListener("touchend", soltar);
    p.addEventListener("touchcancel", soltar);
    return () => {
      p.removeEventListener("touchstart", inicio);
      p.removeEventListener("touchmove", movimiento);
      p.removeEventListener("touchend", soltar);
      p.removeEventListener("touchcancel", soltar);
    };
  }, [altura, mover, soltar]);

  // Ratón o lápiz: se arrastra desde la cabecera.
  const alApuntar = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.pointerType === "touch" || e.button !== 0 || saliendo.current) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesto.current = { y0: e.clientY, x0: e.clientX, yIni: y.current, desde: "cabecera", decidido: "hoja", puntos: [{ y: e.clientY, t: performance.now() }] };
  };
  const alMoverPuntero = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    if (e.pointerType === "touch" || !g) return;
    g.puntos.push({ y: e.clientY, t: performance.now() });
    if (g.puntos.length > 12) g.puntos.shift();
    mover(g.yIni + e.clientY - g.y0);
  };
  const alSoltarPuntero = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.pointerType !== "touch") soltar();
  };

  const expandibleEnMedia = altura === "expandible" && nivel === "media";

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div ref={fondo} aria-hidden="true" onClick={cerrar} className="absolute inset-0 touch-none bg-bosque/50" style={{ opacity: 0 }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        // Papel también por debajo del borde inferior (after): si se estira hacia arriba, no se ve un hueco.
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col rounded-t-[30px] bg-papel outline-none after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-40 after:bg-papel"
        style={{
          // dvh (no el alto del teclado): el teclado no cambia el tamaño de la hoja.
          ...(altura === "auto" ? { maxHeight: ALTO_MAXIMO } : { height: ALTO_MAXIMO }),
          transform: "translate3d(0, 100%, 0)",
        }}
      >
        {/* El scroll ocupa toda la hoja (redondeado arriba para recortar lo que pasa por las esquinas) */}
        <div
          ref={contenido}
          onScroll={alDesplazar}
          onFocus={alEnfocarCampo}
          onWheel={(e) => {
            if (expandibleEnMedia && e.deltaY > 0) irA("grande");
          }}
          className="min-h-0 flex-1 overscroll-contain rounded-t-[30px] px-5 pt-[calc(var(--cabecera,79px)+2px)] pb-[calc(max(1.75rem,calc(var(--safe-abajo)+1rem))+var(--teclado,0px))] [scroll-padding-top:calc(var(--cabecera,79px)+8px)]"
          style={{ overflowY: expandibleEnMedia ? "hidden" : "auto", touchAction: expandibleEnMedia ? "none" : "pan-y" }}
        >
          {children}
        </div>
        {/* Borde de desplazamiento: 4 capas de desenfoque + degradado, detrás de la cabecera */}
        <div
          ref={borde}
          aria-hidden="true"
          className="hoja-borde pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--cabecera,79px)+16px)] rounded-t-[30px]"
          style={{ visibility: "hidden" }}
        >
          <div className="hoja-borde-desenfoque" />
          <div className="hoja-borde-desenfoque" />
          <div className="hoja-borde-desenfoque" />
          <div className="hoja-borde-desenfoque" />
          <div className="hoja-borde-color" />
        </div>
        <div
          ref={cabecera}
          onPointerDown={alApuntar}
          onPointerMove={alMoverPuntero}
          onPointerUp={alSoltarPuntero}
          onPointerCancel={alSoltarPuntero}
          className="absolute inset-x-0 top-0 touch-none px-5 pt-2.5 pb-3"
        >
          <div className="mx-auto mb-2 h-[5px] w-11 cursor-grab rounded-full bg-[#e2d5bf]" />
          <div className="flex items-center justify-between gap-3">
            <h2 id={idTitulo} className="font-display text-2xl text-bosque">
              {titulo}
            </h2>
            <BotonCerrar onClick={cerrar} />
          </div>
        </div>
      </div>
    </div>
  );
}

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BotonCerrar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-arena text-bosque">
      <IconoCerrar tamano={20} />
    </button>
  );
}
