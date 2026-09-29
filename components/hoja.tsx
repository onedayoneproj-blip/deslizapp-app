"use client";

// Hoja inferior (bottom sheet) al estilo de iOS 26. Todas las hojas del panel usan este componente.
// Su comportamiento manda sobre el prototipo (ver docs/04-pantallas.md).
//
// - Flota o se pega: las hojas cortas ("auto") y las de media altura FLOTAN, separadas ~8 px de
//   los lados y de abajo (abajo: max(8px, safe area − 24px)), con las cuatro esquinas redondeadas
//   (arriba 30 px; abajo 40 − 8 = 32 px, acompañando la curva de la pantalla del iPhone). Al pasar a
//   la altura grande se PEGAN a los bordes (margen 0, esquinas de abajo 0, las de arriba bajan un
//   poco). La transición va ligada al gesto: margen y radios se interpolan con el dedo. Las hojas
//   "grande" van pegadas desde el inicio.
//   El margen y los radios se dibujan con clip-path (no se cambia el ancho del panel, así el
//   contenido no se reacomoda en cada cuadro).
// - Cabecera fija (tirador + título + X); solo se desplaza el contenido.
// - Se cierra deslizando hacia abajo (más de ~30 % o con velocidad); si no, vuelve a su lugar.
// - Alturas: "auto" (se ajusta al contenido), "expandible" (media ↔ casi pantalla completa),
//   "grande" (casi pantalla completa desde el inicio).
// - El arrastre solo mueve la hoja si el contenido está arriba del todo o si el gesto empieza en la
//   cabecera: el scroll y el arrastre nunca se pelean (se decide al primer movimiento del dedo).
// - Se anima `transform`, `clip-path` y la opacidad del fondo, siguiendo el dedo sin retraso.
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

const ALTO_GRANDE = 0.93; // fracción de la pantalla visible
const ALTO_MEDIA = 0.6;
/** Esquinas de arriba: flotando / pegada (expandible) / pegada (grande). */
const RADIO_ARRIBA_FLOTA = 30;
const RADIO_ARRIBA_PEGADA = 18;
const RADIO_ARRIBA_GRANDE = 20;
/** Margen lateral de la hoja flotante. */
const MARGEN_FLOTA = 8;
/** Radio de las esquinas de la pantalla del iPhone (aprox.): las de abajo de la hoja lo acompañan. */
const RADIO_PANTALLA = 40;
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

  const [nivel, setNivelEstado] = useState<Nivel>(altura === "expandible" ? "media" : "grande");
  const [conSombra, setConSombra] = useState(false);

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
  /** Margen inferior de la hoja flotante en px: max(8px, safe area − 24px), medido de verdad. */
  const margenAbajo = useRef(MARGEN_FLOTA);

  const altoPanel = () => panel.current?.offsetHeight ?? 0;
  const yMedia = () => Math.max(0, altoPanel() - altoPantalla() * ALTO_MEDIA);
  const yDe = useCallback(
    (n: Nivel) => (altura === "expandible" && n === "media" ? Math.max(0, (panel.current?.offsetHeight ?? 0) - altoPantalla() * ALTO_MEDIA) : 0),
    [altura],
  );
  const yCerrada = () => altoPanel() + 24;

  /** Mueve el panel (y el fondo y las esquinas) a `valor`. */
  const aplicar = useCallback(
    (valor: number, animado: boolean) => {
      const p = panel.current;
      const f = fondo.current;
      if (!p || !f) return;
      y.current = valor;
      const transicion = animado && !reducido.current ? `transform ${DURACION}ms ${CURVA}, clip-path ${DURACION}ms ${CURVA}` : "none";
      p.style.transition = transicion;
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
      const media = altura === "expandible" ? Math.max(0, alto - altoPantalla() * ALTO_MEDIA) : 0;
      // Cuánto flota (1) o está pegada (0). En "expandible" va con el dedo entre media y grande.
      const flota =
        altura === "auto" ? 1 : altura === "grande" ? 0 : media ? Math.min(1, Math.max(0, valor / media)) : 0;
      const pegadaArriba = altura === "grande" ? RADIO_ARRIBA_GRANDE : RADIO_ARRIBA_PEGADA;
      const radioArriba = pegadaArriba + (RADIO_ARRIBA_FLOTA - pegadaArriba) * flota;
      const radioAbajo = (RADIO_PANTALLA - MARGEN_FLOTA) * flota;
      const lado = MARGEN_FLOTA * flota;
      // En "expandible" el panel mide 93 % y se empuja hacia abajo: la parte que queda fuera de la
      // pantalla también se recorta, para que el borde (margen y esquinas) quede a la vista. Por
      // debajo de "media" (al cerrar), el recorte se mantiene y la hoja baja entera.
      const fueraDePantalla = altura === "expandible" ? Math.min(Math.max(valor, 0), media) : 0;
      const abajo = fueraDePantalla + margenAbajo.current * flota;
      p.style.clipPath = `inset(0px ${lado}px ${abajo}px ${lado}px round ${radioArriba}px ${radioArriba}px ${radioAbajo}px ${radioAbajo}px)`;
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

  // Entrada: empieza fuera de la pantalla y sube a su nivel.
  useLayoutEffect(() => {
    reducido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Mide el margen inferior real (depende del safe area del equipo).
    const sonda = document.createElement("div");
    sonda.style.cssText = `position:absolute;visibility:hidden;height:max(${MARGEN_FLOTA}px, calc(var(--safe-abajo) - 24px))`;
    document.body.appendChild(sonda);
    margenAbajo.current = sonda.offsetHeight || MARGEN_FLOTA;
    sonda.remove();
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
        if (r.bottom > visibleAbajo) c.scrollTop += r.bottom - visibleAbajo;
        else if (r.top < c.getBoundingClientRect().top + 8) c.scrollTop -= c.getBoundingClientRect().top + 8 - r.top;
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
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col bg-papel outline-none"
        style={{
          // dvh (no el alto del teclado): el teclado no cambia el tamaño de la hoja.
          ...(altura === "auto" ? { maxHeight: `${ALTO_GRANDE * 100}dvh` } : { height: `${ALTO_GRANDE * 100}dvh` }),
          transform: "translate3d(0, 100%, 0)",
        }}
      >
        <div
          ref={cabecera}
          onPointerDown={alApuntar}
          onPointerMove={alMoverPuntero}
          onPointerUp={alSoltarPuntero}
          onPointerCancel={alSoltarPuntero}
          className="relative shrink-0 touch-none px-5 pt-2.5 pb-3"
        >
          {/* Línea bajo la cabecera cuando el contenido está desplazado: aparece con un fundido */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-linea transition-opacity duration-(--mov-rapida)"
            style={{ opacity: conSombra ? 1 : 0 }}
          />
          <div className="mx-auto mb-2 h-[5px] w-11 cursor-grab rounded-full bg-[#e2d5bf]" />
          <div className="flex items-center justify-between gap-3">
            <h2 id={idTitulo} className="font-display text-2xl text-bosque">
              {titulo}
            </h2>
            <BotonCerrar onClick={cerrar} />
          </div>
        </div>
        <div
          ref={contenido}
          onScroll={(e) => setConSombra(e.currentTarget.scrollTop > 2)}
          onFocus={alEnfocarCampo}
          onWheel={(e) => {
            if (expandibleEnMedia && e.deltaY > 0) irA("grande");
          }}
          className="min-h-0 flex-1 overscroll-contain px-5 pt-0.5 pb-[calc(1.25rem+var(--safe-abajo)+var(--teclado,0px))]"
          style={{ overflowY: expandibleEnMedia ? "hidden" : "auto", touchAction: expandibleEnMedia ? "none" : "pan-y" }}
        >
          {children}
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
