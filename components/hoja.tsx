"use client";

// Hoja inferior (bottom sheet) al estilo de iOS. Todas las hojas del panel usan este componente.
//
// - Cabecera fija (tirador + título + X); solo se desplaza el contenido.
// - Se cierra deslizando hacia abajo (más de ~30 % o con velocidad); si no, vuelve a su lugar.
// - Alturas: "auto" (se ajusta al contenido), "expandible" (media ↔ casi pantalla completa),
//   "grande" (casi pantalla completa desde el inicio).
// - El arrastre solo mueve la hoja si el contenido está arriba del todo o si el gesto empieza en la
//   cabecera: el scroll y el arrastre nunca se pelean (se decide al primer movimiento del dedo).
// - Solo se anima `transform` (y la opacidad del fondo), siguiendo el dedo sin retraso.
//
// Implementación propia: se evaluó `vaul`, pero su repositorio está sin mantenimiento.

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as EventoPuntero,
  type ReactNode,
} from "react";
import { IconoCerrar } from "./iconos";

export type AlturaHoja = "auto" | "expandible" | "grande";
type Nivel = "media" | "grande";

const ALTO_GRANDE = 0.93; // fracción de la pantalla visible
const ALTO_MEDIA = 0.6;
const RADIO_MAX = 30;
const RADIO_MIN = 18;
const DURACION = 320;
const CURVA = "cubic-bezier(.2,.8,.3,1)";

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

/** Diferencia (px) entre la pantalla y el área visible a partir de la cual se considera que hay teclado. */
const UMBRAL_TECLADO = 120;

/**
 * Área donde se dibuja la hoja. Normalmente, la pantalla completa (así la hoja siempre llega al
 * borde de abajo). Solo con el teclado abierto se usa el área visible (visualViewport), para que
 * el campo enfocado quede encima del teclado. (Usar siempre visualViewport dejaba la hoja
 * despegada del borde en iPhone cuando ese valor salía más chico que la pantalla.)
 */
function medirVista() {
  const vv = window.visualViewport;
  const total = window.innerHeight;
  if (vv && total - vv.height > UMBRAL_TECLADO) return { alto: vv.height, arriba: vv.offsetTop, teclado: true };
  return { alto: total, arriba: 0, teclado: false };
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

  // Tamaño de la pantalla visible (se achica cuando sale el teclado del iPhone).
  const [vista, setVista] = useState(medirVista);
  const [nivel, setNivelEstado] = useState<Nivel>(altura === "expandible" ? "media" : "grande");
  const [conSombra, setConSombra] = useState(false);

  const nivelRef = useRef(nivel);
  const y = useRef(0); // desplazamiento vertical actual del panel (0 = arriba del todo)
  const saliendo = useRef(false);
  const fuera = useRef(false);
  const reducido = useRef(false);

  const altoPanel = () => panel.current?.offsetHeight ?? 0;
  const yMedia = () => Math.max(0, altoPanel() - vista.alto * ALTO_MEDIA);
  const yDe = useCallback(
    (n: Nivel) => (altura === "expandible" && n === "media" ? Math.max(0, (panel.current?.offsetHeight ?? 0) - vista.alto * ALTO_MEDIA) : 0),
    [altura, vista.alto],
  );
  const yCerrada = () => altoPanel() + 24;

  /** Mueve el panel (y el fondo y las esquinas) a `valor`. */
  const aplicar = useCallback(
    (valor: number, animado: boolean) => {
      const p = panel.current;
      const f = fondo.current;
      if (!p || !f) return;
      y.current = valor;
      const transicion = animado && !reducido.current ? `transform ${DURACION}ms ${CURVA}` : "none";
      p.style.transition = transicion;
      p.style.transform = `translate3d(0, ${valor}px, 0)`;
      const alto = p.offsetHeight;
      const media = altura === "expandible" ? Math.max(0, alto - vista.alto * ALTO_MEDIA) : 0;
      // Esquinas: se reducen un poco al subir hasta arriba (como iOS).
      const radio =
        altura === "expandible"
          ? RADIO_MIN + (RADIO_MAX - RADIO_MIN) * Math.min(1, Math.max(0, media ? valor / media : 1))
          : altura === "grande"
            ? RADIO_MIN + 2
            : RADIO_MAX;
      p.style.borderTopLeftRadius = p.style.borderTopRightRadius = `${radio}px`;
      // El fondo pierde opacidad a medida que la hoja baja desde su posición de reposo.
      const base = media;
      const recorrido = Math.max(1, alto + 24 - base);
      f.style.transition = animado && !reducido.current ? `opacity ${DURACION}ms ${CURVA}` : "none";
      f.style.opacity = String(1 - Math.min(1, Math.max(0, (valor - base) / recorrido)));
    },
    [altura, vista.alto],
  );

  const irA = useCallback(
    (n: Nivel) => {
      nivelRef.current = n;
      setNivelEstado(n);
      aplicar(yDe(n), true);
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

  // Si cambia el alto visible (teclado, rotación), se reacomoda sin animar.
  useLayoutEffect(() => {
    if (!saliendo.current) aplicar(yDe(nivelRef.current), false);
  }, [vista.alto, aplicar, yDe]);

  // Pantalla visible (visualViewport) + campo enfocado siempre a la vista sobre el teclado.
  useEffect(() => {
    const vv = window.visualViewport;
    const actualizar = () => {
      setVista(medirVista());
      const activo = document.activeElement;
      if (activo instanceof HTMLElement && contenido.current?.contains(activo) && esCampo(activo)) {
        window.setTimeout(() => activo.scrollIntoView({ block: "center", behavior: reducido.current ? "auto" : "smooth" }), 60);
      }
    };
    vv?.addEventListener("resize", actualizar);
    vv?.addEventListener("scroll", actualizar);
    window.addEventListener("resize", actualizar);
    return () => {
      vv?.removeEventListener("resize", actualizar);
      vv?.removeEventListener("scroll", actualizar);
      window.removeEventListener("resize", actualizar);
    };
  }, []);

  // Bloquea el fondo mientras está abierta; foco dentro y de vuelta al cerrar; Escape y Tab.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const previo = { overflow: document.body.style.overflow, overscroll: html.style.overscrollBehavior };
    document.body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    panel.current?.focus({ preventScroll: true });

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cerrar();
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
  }, [cerrar]);

  // ---- Arrastre ----
  const gesto = useRef<{
    y0: number;
    x0: number;
    yIni: number;
    desde: "cabecera" | "contenido";
    decidido: null | "hoja" | "nativo";
    puntos: { y: number; t: number }[];
  } | null>(null);

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
  const altoPx = vista.alto * ALTO_GRANDE;

  return (
    <div
      className="fixed inset-x-0 z-50"
      style={vista.teclado ? { top: vista.arriba, height: vista.alto } : { top: 0, bottom: 0 }}
      role="presentation"
    >
      <div ref={fondo} aria-hidden="true" onClick={cerrar} className="absolute inset-0 touch-none bg-bosque/50" style={{ opacity: 0 }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col bg-papel shadow-[0_-10px_40px_-20px_rgba(23,75,58,0.5)] outline-none will-change-transform"
        style={{
          ...(altura === "auto" ? { maxHeight: altoPx } : { height: altoPx }),
          transform: "translate3d(0, 100%, 0)",
          borderTopLeftRadius: RADIO_MAX,
          borderTopRightRadius: RADIO_MAX,
        }}
      >
        <div
          ref={cabecera}
          onPointerDown={alApuntar}
          onPointerMove={alMoverPuntero}
          onPointerUp={alSoltarPuntero}
          onPointerCancel={alSoltarPuntero}
          className={`shrink-0 touch-none px-5 pt-2.5 pb-3 transition-shadow ${conSombra ? "shadow-[0_6px_12px_-10px_rgba(23,75,58,0.45)]" : ""}`}
          style={{ borderBottom: `1px solid ${conSombra ? "var(--color-linea)" : "transparent"}` }}
        >
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
          onFocus={(e) => {
            if (altura === "expandible" && nivelRef.current === "media" && esCampo(e.target)) irA("grande");
          }}
          onWheel={(e) => {
            if (expandibleEnMedia && e.deltaY > 0) irA("grande");
          }}
          className="min-h-0 flex-1 overscroll-contain px-5 pt-0.5 pb-[calc(1.75rem+var(--safe-abajo))]"
          style={{ overflowY: expandibleEnMedia ? "hidden" : "auto", touchAction: expandibleEnMedia ? "none" : "pan-y" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function esCampo(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export function BotonCerrar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-arena text-bosque">
      <IconoCerrar tamano={20} />
    </button>
  );
}
