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
// - Zona fija de arriba: todo lo que deba quedarse fijo (buscador, pastillas…) va DENTRO de la cabecera
//   con <HojaFijoArriba> (o la prop `fijoArriba`). El desenfoque cubre la zona completa porque su alto
//   sale del alto real de la cabecera (ResizeObserver → --cabecera) y se desvanece justo debajo de su
//   último elemento. El contenido empieza debajo de toda la zona. Un solo desenfoque por hoja.
// - Zona fija de abajo: <HojaFijoAbajo> (ej. la píldora de resumen); el contenido suma su alto al relleno
//   inferior (--fijo-abajo) y se oculta mientras el teclado está abierto.
// - Se cierra deslizando hacia abajo (más de ~30 % o con velocidad); si no, vuelve a su lugar.
// - El arrastre solo mueve la hoja si el contenido está arriba del todo o si el gesto empieza en la
//   cabecera: el scroll y el arrastre nunca se pelean (se decide al primer movimiento del dedo).
// - Se anima `transform` y la opacidad del fondo, siguiendo el dedo sin retraso.
// - TECLADO (regla permanente, ver HANDOFF.md): la hoja NO cambia de tamaño, de posición ni de estado
//   cuando se abre el teclado. Solo escribe una variable CSS (`--teclado`) que da espacio al final del
//   contenido, y desplaza el contenido para que el campo enfocado quede a la vista. Nada de
//   re-renders ni de tocar el foco por eventos de `resize`/`visualViewport`: en iOS eso cierra el teclado.
//
// - HOJAS APILADAS: la hoja se pinta en un portal en <body> (no dentro de la que está debajo), así los gestos táctiles, el
//   toque en el fondo y los eventos de la de arriba nunca llegan a la de abajo. Además solo la de arriba responde a Escape, Tab
//   y al botón atrás del teléfono (una hoja apilada guarda una entrada de historial que "atrás" consume).
// - AVISO AL SALIR: con `avisarAlSalir` (o el hook `useAvisarAlSalir`) y cambios sin guardar, cerrar (deslizar, fondo, Escape, X o
//   atrás) no cierra: la hoja rebota a su lugar y sale el diálogo "¿Salir sin guardar?". Cerrar desde el padre (guardar con éxito,
//   cambiar de ruta) nunca pregunta.
//
// - ALTURA (regla del sistema de diseño, docs/09 §9): AUTOMÁTICA por defecto ("auto": mide su contenido hasta el alto máximo y
//   hace scroll dentro). COMPLETA ("grande") SOLO si hay teclado (escribir haría saltar la altura) o una lista que crece mientras
//   se usa (buscar cliente, elegir productos). Nunca una hoja completa con un hueco vacío abajo si no tiene teclado. Máximo dos
//   hojas apiladas. (Al migrar: fondo `fondo`, radio-xl, sombra-hoja; hoy el radio es 30 px y no lleva sombra, así que esos
//   dos cambios visibles quedan para la migración. Fondo y botón cerrar ya usan los tokens, con el mismo valor en claro.)
//
// Implementación propia: se evaluó `vaul`, pero su repositorio está sin mantenimiento.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent as EventoFoco,
  type PointerEvent as EventoPuntero,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CURVA as CURVAS, DURACION as DURACIONES } from "@/lib/movimiento";
import { IconoCerrar } from "./iconos";
import { Boton } from "./ui";

export type AlturaHoja = "auto" | "expandible" | "grande";
type Nivel = "media" | "grande";

/** Altura máxima: toda la pantalla menos el tope de arriba (debajo de la barra de estado). */
const ALTO_MAXIMO = "calc(100dvh - var(--hoja-tope))";
/** Una hoja con hueco propio en px (el Inventario, 118), siempre debajo de la barra de estado. */
const altoConHueco = (hueco: number) => `calc(100dvh - max(${hueco}px, calc(var(--safe-arriba) + 20px)))`;
/** La historia de crear producto: como las hojas grandes de iOS, 10 px por debajo de la barra de estado (≈69 px en un iPhone con isla) y nunca a menos de 24 px. */
const ALTO_HISTORIA = "calc(100dvh - max(calc(var(--safe-arriba) + 10px), 24px))";
const ALTO_MEDIA = 0.6; // fracción de la pantalla visible en "expandible" a media altura
/** Scroll (px) en el que el borde de desplazamiento bajo la cabecera pasa de invisible a completo. */
const SCROLL_BORDE = 24;
// Tokens del sistema de movimiento (docs/08-movimiento.md).
const DURACION = DURACIONES.entrada;
const CURVA = CURVAS.salida;

/** Hojas abiertas, de la más vieja a la más nueva: si hay una encima de otra (ej. "Registrar abono" sobre el detalle), solo la de arriba responde a Escape y Tab. */
const PILA_DE_HOJAS: symbol[] = [];

/** Popstates que provoca la propia hoja al quitar su entrada de historial: no cierran ninguna hoja. */
const IGNORAR_ATRAS = { n: 0 };

/**
 * Fondo bloqueado mientras haya al menos una hoja abierta. Es un contador y no "guardar y restaurar" por hoja: si una hoja se
 * abre mientras otra termina de cerrarse, el orden de las limpiezas se cruza y la segunda restauraba "hidden" (el scroll
 * quedaba trabado sin ninguna hoja a la vista).
 */
const BLOQUEO_FONDO = { hojas: 0, overflow: "", overscroll: "" };
function bloquearFondo() {
  const html = document.documentElement;
  if (BLOQUEO_FONDO.hojas++ === 0) {
    BLOQUEO_FONDO.overflow = document.body.style.overflow;
    BLOQUEO_FONDO.overscroll = html.style.overscrollBehavior;
  }
  document.body.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
}
function liberarFondo() {
  BLOQUEO_FONDO.hojas = Math.max(0, BLOQUEO_FONDO.hojas - 1);
  if (BLOQUEO_FONDO.hojas > 0) return;
  document.body.style.overflow = BLOQUEO_FONDO.overflow === "hidden" ? "" : BLOQUEO_FONDO.overflow;
  document.documentElement.style.overscrollBehavior = BLOQUEO_FONDO.overscroll === "none" ? "" : BLOQUEO_FONDO.overscroll;
}
/** Marca de la entrada de historial de una hoja apilada. Conserva el estado de Next (`__NA`…) para no confundir al router. */
const estadoDeHoja = () => ({ ...(window.history.state ?? {}), deslizappHoja: true });

type Ranuras = { arriba: HTMLDivElement | null; abajo: HTMLDivElement | null; irArriba: () => void; avisar: (cambios: boolean, textos?: TextosAviso) => void; confirmarSalida: (accion: () => void) => void };
/** Textos del aviso que puede poner el contenido de la hoja (lo que solo él sabe: cuántas fotos o presentaciones se pierden). */
export type TextosAviso = { titulo?: string; texto?: string };
const ContextoHoja = createContext<Ranuras | null>(null);

/** Contenido que se queda fijo debajo del título de la hoja (buscador, pastillas…). Se pinta en la cabecera. */
export function HojaFijoArriba({ children }: { children: ReactNode }) {
  const r = useContext(ContextoHoja);
  return r?.arriba ? createPortal(children, r.arriba) : null;
}

/** Contenido que flota fijo abajo de la hoja (ej. resumen de selección). Se oculta con el teclado abierto. */
export function HojaFijoAbajo({ children }: { children: ReactNode }) {
  const r = useContext(ContextoHoja);
  return r?.abajo ? createPortal(children, r.abajo) : null;
}

/**
 * Pie flotante sin recuadro (historia de crear producto): los botones flotan siempre a la vista y detrás de ellos
 * el contenido se difumina con el borde de la cabecera invertido (`.hoja-borde-abajo`, más fuerte abajo, nada arriba).
 * La zona difuminada mide el pie + 24 px por encima, para que la transición empiece antes de los botones.
 * Va dentro de <HojaFijoAbajo>; los hijos reciben toques (el resto del pie no).
 */
export function PieFlotante({ children, className, ...datos }: { children: ReactNode; className?: string; [dato: `data-${string}`]: string }) {
  return (
    <div className="pointer-events-none relative">
      <div className="hoja-borde-abajo pointer-events-none absolute inset-x-0 -top-6 bottom-0" aria-hidden="true">
        <div className="hoja-borde-desenfoque" />
        <div className="hoja-borde-desenfoque" />
        <div className="hoja-borde-desenfoque" />
        <div className="hoja-borde-desenfoque" />
        <div className="hoja-borde-color" />
      </div>
      <div className={`pointer-events-auto relative px-5 pb-[max(1.5rem,var(--safe-abajo))] ${className ?? ""}`} {...datos}>
        {children}
      </div>
    </div>
  );
}

/**
 * El contenido de una hoja avisa si hay cambios sin guardar: mientras `cambios` sea true, cerrar la hoja pide confirmación.
 * Para formularios cuyo estado vive dentro de la hoja. `textos` (opcional) cambia el título o el texto del aviso para este contenido.
 */
export function useAvisarAlSalir(cambios: boolean, textos?: TextosAviso) {
  const avisar = useContext(ContextoHoja)?.avisar;
  const titulo = textos?.titulo;
  const texto = textos?.texto;
  useEffect(() => {
    avisar?.(cambios, { titulo, texto });
    return () => avisar?.(false);
  }, [avisar, cambios, titulo, texto]);
}

/** Reutiliza el aviso de cambios sin guardar antes de salir hacia otro formulario. */
export function useConfirmarSalida() {
  const confirmar = useContext(ContextoHoja)?.confirmarSalida;
  if (!confirmar) throw new Error("useConfirmarSalida() necesita una Hoja.");
  return confirmar;
}

/** Lleva el contenido de la hoja arriba del todo (ej. al cambiar de vista dentro de la hoja). */
export function useIrArribaHoja() {
  return useContext(ContextoHoja)?.irArriba ?? (() => {});
}

type Props = {
  abierta: boolean;
  alCerrar: () => void;
  /** Se llama después de que la hoja terminó de salir y se retiró del portal. */
  alSalir?: () => void;
  /** Texto del título (puede llevar un cruce animado de un título a otro, ver Tu próxima jugada). */
  titulo: ReactNode;
  /** El título solo lo leen los lectores de pantalla (la hoja trae su propio encabezado en el contenido). */
  tituloOculto?: boolean;
  /** Capa decorativa por ENCIMA de todo (también de la cabecera y la X): sin toques, no ocupa espacio. Empieza donde empieza el contenido. */
  capaSuperior?: ReactNode;
  /** Cómo se comporta la altura (por defecto "auto"). */
  altura?: AlturaHoja;
  /** Contenido fijo debajo del título (también se puede poner desde adentro con <HojaFijoArriba>). */
  fijoArriba?: ReactNode;
  /**
   * Cabecera de historia (crear producto, prototipo v4): fila 1 con la X a la izquierda, el título visible y `alLadoDelTitulo` a la derecha
   * (el selector de catálogo); fila 2 con `avance` (las barras) a todo el ancho. Con `altura="grande"`, la hoja deja arriba el hueco del lienzo
   * (borde en y≈69 en un iPhone) con esquinas de `radio-xl` y su agarradera.
   */
  historia?: {
    /** Las barras de avance (fila 2). Sin ellas, la cabecera es una sola fila (editar producto, sus pasos y la vista del producto). */
    avance?: ReactNode;
    alLadoDelTitulo?: ReactNode;
    /** El título se corta con elipsis (el nombre de un producto); por defecto no se corta. */
    tituloElipsis?: boolean;
    /** En una pantalla interna: la izquierda muestra «‹» (vuelve a la pantalla anterior de la misma hoja) en lugar de la ✕. */
    volver?: () => void;
  };
  /**
   * Hoja apilada que no abre otra encima (máximo dos hojas): toda `Hoja` que se abra dentro de su contenido se pinta como pantalla
   * interna de esta (su título en la cabecera, «‹» a la izquierda y el atrás del teléfono vuelve), no como una tercera hoja.
   */
  anidarHojas?: boolean;
  /**
   * Solo con `altura="grande"`: dónde empieza la hoja (px desde arriba, nunca sobre la barra de estado), con esquinas `radio-xl`.
   * La historia de crear producto usa su propio hueco (10 px bajo la barra de estado); la hoja que se abre encima de ella («Inventario»), 40 más abajo (118).
   */
  hueco?: number;
  /** Capa decorativa fija al pie, detrás del contenido desplazable y sin capturar toques. */
  decoracionAbajo?: ReactNode;
  /** Efecto decorativo sobre el contenido, siempre bajo el borde y la cabecera. */
  decoracionEncima?: ReactNode;
  /** Hay cambios sin guardar: cerrar pide confirmación (ver el comentario de arriba). También se puede avisar con `useAvisarAlSalir`. */
  avisarAlSalir?: boolean;
  /** Hojas de ruta que consumen su entrada antes de navegar mediante alSalir. */
  protegerAtras?: boolean;
  /** Regresa a una vista interna sin cerrar ni descartar el borrador; true consume Atrás. */
  alVolverInterno?: () => boolean;
  /** Textos del aviso al salir. */
  avisoTitulo?: string;
  avisoTexto?: string;
  /** Botón principal del aviso (lo que se conserva) y el secundario (lo que se pierde). */
  avisoQuedarme?: string;
  avisoDescartar?: string;
  children: ReactNode;
};

const sinSuscripcion = () => () => {};

/** Pantallas internas de una hoja con `anidarHojas`: la de arriba es la que se ve. */
type Interna = { id: symbol; titulo: { current: ReactNode }; cerrar: { current: () => void } };
type Anidar = { ranura: HTMLDivElement | null; pila: Interna[]; registrar: (i: Interna) => () => void };
const ContextoAnidar = createContext<Anidar | null>(null);

export function Hoja(props: Props) {
  const anidar = useContext(ContextoAnidar);
  return anidar ? <HojaInterna {...props} anidar={anidar} /> : <HojaRaiz {...props} />;
}

/**
 * Una `Hoja` abierta dentro de una hoja con `anidarHojas`: su contenido ocupa el lugar del de esa hoja (como el historial de
 * ajustes) y la cabecera de la de abajo muestra su título con «‹». Cerrarla vuelve a la pantalla anterior. Sin animación de entrada.
 */
function HojaInterna({ abierta, alCerrar, alSalir, titulo, fijoArriba, children, anidar }: Props & { anidar: Anidar }) {
  const [id] = useState(() => Symbol("interna"));
  const tituloRef = useRef(titulo);
  const cerrarRef = useRef(alCerrar);
  const alSalirRef = useRef(alSalir);
  useLayoutEffect(() => {
    tituloRef.current = titulo;
    cerrarRef.current = alCerrar;
    alSalirRef.current = alSalir;
  });
  const yo = useMemo<Interna>(() => ({ id, titulo: tituloRef, cerrar: cerrarRef }), [id]);
  const { registrar } = anidar;
  useLayoutEffect(() => {
    if (!abierta) return;
    const quitar = registrar(yo);
    return () => {
      quitar();
      window.setTimeout(() => alSalirRef.current?.(), 0);
    };
  }, [abierta, registrar, yo]);
  if (!abierta || !anidar.ranura) return null;
  const arriba = anidar.pila[anidar.pila.length - 1]?.id === id;
  return createPortal(
    <div className={arriba ? "flex flex-col gap-3" : "hidden"} data-pantalla-interna="">
      {fijoArriba}
      {children}
    </div>,
    anidar.ranura,
  );
}

function HojaRaiz(props: Props) {
  // Queda montada mientras dura la animación de salida.
  const [montada, setMontada] = useState(props.abierta);
  if (props.abierta && !montada) setMontada(true);
  // Solo en el navegador (el portal necesita `document`)
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (!montada || !enNavegador) return null;
  // Portal en <body>: una hoja sobre otra no queda DENTRO de la de abajo (si no, sus toques subirían por el DOM hasta ella).
  return createPortal(<HojaMontada {...props} alDesmontar={() => setMontada(false)} />, document.body);
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
  alSalir,
  titulo,
  tituloOculto = false,
  capaSuperior,
  altura = "auto",
  fijoArriba,
  historia,
  anidarHojas = false,
  hueco: huecoPedido,
  decoracionAbajo,
  decoracionEncima,
  avisarAlSalir = false,
  protegerAtras = false,
  alVolverInterno,
  avisoTitulo = "¿Salir sin guardar?",
  avisoTexto = "Lo que escribiste se va a perder.",
  avisoQuedarme = "Quedarme",
  avisoDescartar = "Descartar y salir",
  children,
  alDesmontar,
}: Props & { alDesmontar: () => void }) {
  const hueco = altura === "grande" ? (huecoPedido ?? (historia ? ("historia" as const) : undefined)) : undefined;
  const idTitulo = useId();
  const idAviso = useId();
  const idAvisoTexto = useId();
  // Aviso al salir: lo pide la prop o el contenido (`useAvisarAlSalir`); se lee al cerrar, sin volver a pintar.
  const avisoDeProp = useRef(avisarAlSalir);
  const avisoDeHijo = useRef(false);
  const [avisando, setAvisando] = useState(false);
  const avisandoRef = useRef(false);
  const dialogoAviso = useRef<HTMLDivElement>(null);
  const seguirAqui = useRef<HTMLButtonElement>(null);
  const accionAlSalir = useRef<(() => void) | null>(null);
  useEffect(() => {
    avisoDeProp.current = avisarAlSalir;
  }, [avisarAlSalir]);
  useEffect(() => {
    avisandoRef.current = avisando;
  }, [avisando]);
  const textosDeHijo = useRef<TextosAviso>({});
  const [textosAviso, setTextosAviso] = useState<TextosAviso>({});
  const avisar = useCallback((cambios: boolean, textos?: TextosAviso) => {
    avisoDeHijo.current = cambios;
    textosDeHijo.current = cambios ? (textos ?? {}) : {};
  }, []);
  const miTurno = useRef(Symbol("hoja"));
  const entradaDeHistorial = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const fondo = useRef<HTMLDivElement>(null);
  const cabecera = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  const borde = useRef<HTMLDivElement>(null);
  // Ranuras para lo fijo (en estado para que los portales se pinten apenas existen).
  const [ranuraArriba, setRanuraArriba] = useState<HTMLDivElement | null>(null);
  const [ranuraAbajo, setRanuraAbajo] = useState<HTMLDivElement | null>(null);
  // Pantallas internas (`anidarHojas`): la pila, dónde se pintan y desde dónde se abrió cada una (scroll y foco al volver).
  const [ranuraInterna, setRanuraInterna] = useState<HTMLDivElement | null>(null);
  const [pila, setPila] = useState<Interna[]>([]);
  const pilaRef = useRef<Interna[]>([]);
  const origenes = useRef(new Map<symbol, { scroll: number; foco: HTMLElement | null }>());
  const registrar = useCallback((i: Interna) => {
    const c = contenido.current;
    origenes.current.set(i.id, { scroll: c?.scrollTop ?? 0, foco: document.activeElement as HTMLElement | null });
    pilaRef.current = [...pilaRef.current, i];
    setPila(pilaRef.current);
    if (c) c.scrollTop = 0;
    // El foco va a «‹» (un botón: no abre teclado), en el mismo cuadro en que aparece.
    requestAnimationFrame(() => cabecera.current?.querySelector<HTMLElement>("[data-volver-interna]")?.focus({ preventScroll: true }));
    return () => {
      pilaRef.current = pilaRef.current.filter((x) => x !== i);
      setPila(pilaRef.current);
      const o = origenes.current.get(i.id);
      origenes.current.delete(i.id);
      requestAnimationFrame(() => {
        if (contenido.current && o) contenido.current.scrollTop = o.scroll;
        if (o?.foco && document.contains(o.foco)) o.foco.focus({ preventScroll: true });
      });
    };
  }, []);
  const anidar = useMemo<Anidar>(() => ({ ranura: ranuraInterna, pila, registrar }), [ranuraInterna, pila, registrar]);

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

  /** Cierre de verdad: anima la salida y luego avisa al padre. */
  const cerrarDeVerdad = useCallback(() => {
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

  /** Vuelve a su lugar con un pequeño rebote (sin rebote con movimiento reducido). */
  const rebotar = useCallback(() => {
    const p = panel.current;
    if (!p) return;
    aplicar(yDe(nivelRef.current), true);
    if (!reducido.current) p.style.transition = "transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)";
  }, [aplicar, yDe]);

  /**
   * Cierre iniciado desde la hoja (X, Escape, fondo, deslizar, atrás). Con cambios sin guardar no cierra: rebota y pregunta.
   * Devuelve true si cerró.
   */
  const cerrar = useCallback((): boolean => {
    if (saliendo.current) return true;
    // Con una pantalla interna abierta, cerrar (Escape) vuelve a la anterior.
    const interna = pilaRef.current[pilaRef.current.length - 1];
    if (interna) {
      interna.cerrar.current();
      return false;
    }
    accionAlSalir.current = null;
    if (avisoDeProp.current || avisoDeHijo.current) {
      rebotar();
      setTextosAviso(textosDeHijo.current);
      setAvisando(true);
      return false;
    }
    cerrarDeVerdad();
    return true;
  }, [cerrarDeVerdad, rebotar]);

  const confirmarSalida = useCallback((accion: () => void) => {
    if (avisoDeProp.current || avisoDeHijo.current) {
      accionAlSalir.current = accion;
      rebotar();
      setTextosAviso(textosDeHijo.current);
      setAvisando(true);
    } else accion();
  }, [rebotar]);
  const seguirAqui_ = useCallback(() => {
    accionAlSalir.current = null;
    setAvisando(false);
  }, []);
  const salirDeVerdad = useCallback(() => {
    setAvisando(false);
    const accion = accionAlSalir.current;
    accionAlSalir.current = null;
    if (accion) accion();
    else cerrarDeVerdad();
  }, [cerrarDeVerdad]);

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

  // Alto de la zona fija de abajo (+12 px de aire): el contenido lo suma a su relleno inferior.
  useEffect(() => {
    const r = ranuraAbajo;
    const p = panel.current;
    if (!r || !p || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(() => {
      const alto = r.offsetHeight;
      p.style.setProperty("--fijo-abajo", alto ? `${alto + 12}px` : "0px");
    });
    observador.observe(r);
    return () => observador.disconnect();
  }, [ranuraAbajo]);

  const irArriba = useCallback(() => {
    if (contenido.current) contenido.current.scrollTop = 0;
  }, []);
  const ranuras = useMemo<Ranuras>(() => ({ arriba: ranuraArriba, abajo: ranuraAbajo, irArriba, avisar, confirmarSalida }), [ranuraArriba, ranuraAbajo, irArriba, avisar, confirmarSalida]);

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
      const p = panel.current;
      if (!c || !p) return;
      const tapado = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      // Altura automática: el relleno del teclado haría crecer (y mover) la hoja. Se congela el alto que tenía justo antes de abrirse el
      // teclado y se suelta al cerrarlo: la hoja no cambia de tamaño con el teclado, el contenido se desplaza dentro.
      if (p.dataset.altura === "auto") {
        if (tapado > 0 && !p.dataset.congelada) {
          p.style.height = `${p.offsetHeight}px`;
          p.dataset.congelada = "";
        } else if (tapado === 0 && p.dataset.congelada !== undefined) {
          p.style.height = "";
          delete p.dataset.congelada;
        }
      }
      // En el panel: lo usan el contenido (relleno) y la zona fija de abajo (se oculta con el teclado).
      p.style.setProperty("--teclado", `${tapado}px`);
      if (tapado > 0) p.dataset.teclado = "";
      else delete p.dataset.teclado;
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
    // Un campo de OTRA hoja apilada (el evento de React sube por el árbol aunque el DOM sea otro) no es de esta
    if (!esCampo(e.target) || !contenido.current?.contains(e.target as Node)) return;
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
  const seguirRef = useRef(seguirAqui_);
  const alSalirRef = useRef(alSalir);
  useEffect(() => {
    cerrarRef.current = cerrar;
    seguirRef.current = seguirAqui_;
    alSalirRef.current = alSalir;
  });

  // El foco entra al diálogo de "¿Salir sin guardar?" y, al irse, vuelve a donde estaba
  useEffect(() => {
    if (!avisando) return;
    const previo = document.activeElement as HTMLElement | null;
    seguirAqui.current?.focus({ preventScroll: true });
    return () => {
      if (previo && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, [avisando]);

  const protegerAtrasInicial = useRef(protegerAtras);
  const volverInternoRef = useRef(alVolverInterno);
  useLayoutEffect(() => { volverInternoRef.current = alVolverInterno; }, [alVolverInterno]);

  // Bloquea el fondo mientras está abierta; foco dentro al abrir y de vuelta al cerrar; Escape y Tab.
  // Efecto ESTABLE (sin dependencias): si se volviera a ejecutar mientras se escribe, su limpieza
  // devolvería el foco al botón que abrió la hoja y el teclado se cerraría.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    bloquearFondo();
    // El foco va a la hoja solo si no está ya dentro (un campo con autoFocus, por ejemplo).
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });

    const turno = miTurno.current;
    PILA_DE_HOJAS.push(turno);
    // Hoja apilada: guarda una entrada de historial para que "atrás" cierre solo esta (las de ruta ya se cierran con su ruta)
    let entrada = PILA_DE_HOJAS.length > 1 || protegerAtrasInicial.current;
    if (entrada && !entradaDeHistorial.current) {
      window.history.pushState(estadoDeHoja(), "");
      entradaDeHistorial.current = true;
    }
    const alAtras = () => {
      // Solo la hoja de arriba atiende "atrás" (y consume el aviso de ignorarlo): si lo consumiera otra, la de arriba se
      // cerraría con el mismo popstate (cerrar una hoja apilada dentro de otra apilada cerraba las dos).
      if (PILA_DE_HOJAS[PILA_DE_HOJAS.length - 1] !== turno) return;
      if (IGNORAR_ATRAS.n > 0) {
        IGNORAR_ATRAS.n--;
        return;
      }
      if (!entrada) return;
      const interna = pilaRef.current[pilaRef.current.length - 1];
      if (interna || volverInternoRef.current?.()) {
        interna?.cerrar.current();
        window.history.pushState(estadoDeHoja(), "");
        return;
      }
      entrada = false; // el navegador ya la quitó
      if (!cerrarRef.current()) {
        // Con cambios sin guardar no se cierra: vuelve a guardar su entrada
        window.history.pushState(estadoDeHoja(), "");
        entrada = true;
      }
    };
    window.addEventListener("popstate", alAtras);
    const alTeclear = (e: KeyboardEvent) => {
      if (PILA_DE_HOJAS[PILA_DE_HOJAS.length - 1] !== turno) return;
      if (avisandoRef.current) {
        // El diálogo de "¿Salir sin guardar?" manda: Escape = "Quedarme"; Tab no sale de él
        if (e.key === "Escape") {
          e.stopPropagation();
          seguirRef.current();
        } else if (e.key === "Tab" && dialogoAviso.current) {
          const botones = [...dialogoAviso.current.querySelectorAll<HTMLElement>("button")];
          const primero = botones[0]!;
          const ultimo = botones[botones.length - 1]!;
          if (e.shiftKey && document.activeElement === primero) {
            e.preventDefault();
            ultimo.focus();
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primero.focus();
          }
        }
        return;
      }
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
      window.removeEventListener("popstate", alAtras);
      if (entrada) {
        entrada = false;
        const quitarEntrada = () => {
          // React Strict Mode desmonta y monta los efectos en el mismo turno de desarrollo.
          // Si esta hoja volvió a la pila, su entrada todavía le pertenece.
          if (process.env.NODE_ENV === "development" && PILA_DE_HOJAS.includes(turno)) return;
          entradaDeHistorial.current = false;
          // Solo otra hoja montada necesita ignorar este popstate.
          // Sin ella, dejar un contador pendiente ignoraría el siguiente Atrás real.
          if (PILA_DE_HOJAS.some(t => t !== turno)) IGNORAR_ATRAS.n++;
          if (alSalirRef.current) window.addEventListener("popstate", () => alSalirRef.current?.(), { once: true });
          window.history.back();
        };
        if (process.env.NODE_ENV === "development") queueMicrotask(quitarEntrada);
        else quitarEntrada();
      } else if (alSalirRef.current) window.setTimeout(() => alSalirRef.current?.(), 0);
      const posicion = PILA_DE_HOJAS.indexOf(turno);
      if (posicion >= 0) PILA_DE_HOJAS.splice(posicion, 1);
      liberarFondo();
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
    // Botones, campos y filas desplazables de la zona fija no arrastran la hoja con el ratón.
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select, [role=tablist]")) return;
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
    <ContextoHoja.Provider value={ranuras}>
    <div className="fixed inset-0 z-50" role="presentation">
      <div ref={fondo} aria-hidden="true" onClick={cerrar} className="absolute inset-0 touch-none bg-velo" style={{ opacity: 0 }} />
      <div
        ref={panel}
        data-hoja-panel
        data-altura={altura}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        // Papel también por debajo del borde inferior (after): si se estira hacia arriba, no se ve un hueco.
        className={`absolute inset-x-0 bottom-0 mx-auto isolate flex max-w-[480px] flex-col bg-fondo outline-none after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-40 after:bg-fondo ${hueco !== undefined ? "rounded-t-radio-xl" : "rounded-t-[30px]"}`}
        style={{
          // dvh (no el alto del teclado): el teclado no cambia el tamaño de la hoja.
          ...(altura === "auto" ? { maxHeight: ALTO_MAXIMO } : { height: hueco === "historia" ? ALTO_HISTORIA : hueco !== undefined ? altoConHueco(hueco) : ALTO_MAXIMO }),
          transform: "translate3d(0, 100%, 0)",
        }}
      >
        {decoracionAbajo && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden">{decoracionAbajo}</div>}
        {/* El scroll ocupa toda la hoja (redondeado arriba para recortar lo que pasa por las esquinas) */}
        <div
          ref={contenido}
          data-hoja-contenido
          onScroll={alDesplazar}
          onFocus={alEnfocarCampo}
          onWheel={(e) => {
            if (expandibleEnMedia && e.deltaY > 0) irA("grande");
          }}
          className={`relative z-10 min-h-0 flex-1 isolate overscroll-contain ${hueco !== undefined ? "rounded-t-radio-xl" : "rounded-t-[30px]"} px-5 pt-[calc(var(--cabecera,79px)+2px)] ${hueco === "historia" ? "pb-[calc(max(max(1.75rem,calc(var(--safe-abajo)+1rem)),var(--fijo-abajo,0px))+var(--teclado,0px))]" : "pb-[calc(max(1.75rem,calc(var(--safe-abajo)+1rem))+var(--teclado,0px)+var(--fijo-abajo,0px))]"} [scroll-padding-top:calc(var(--cabecera,79px)+8px)] [scroll-padding-bottom:calc(var(--fijo-abajo,0px)+var(--teclado,0px)+8px)]`}
          style={{ overflowY: expandibleEnMedia ? "hidden" : "auto", touchAction: expandibleEnMedia ? "none" : "pan-y" }}
        >
          {anidarHojas ? (
            <ContextoAnidar.Provider value={anidar}>
              <div className={pila.length > 0 ? "hidden" : "contents"}>{children}</div>
              <div ref={setRanuraInterna} className="contents" />
            </ContextoAnidar.Provider>
          ) : (
            children
          )}
        </div>
        {decoracionEncima && <div data-hoja-decoracion aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15] overflow-hidden rounded-t-[30px]">{decoracionEncima}</div>}
        {/* Borde de desplazamiento: 4 capas de desenfoque + degradado, detrás de la cabecera */}
        <div
          ref={borde}
          aria-hidden="true"
          className={`hoja-borde pointer-events-none absolute inset-x-0 top-0 z-20 h-[calc(var(--cabecera,79px)+16px)] ${hueco !== undefined ? "rounded-t-radio-xl" : "rounded-t-[30px]"}`}
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
          data-hoja-cabecera
          onPointerDown={alApuntar}
          onPointerMove={alMoverPuntero}
          onPointerUp={alSoltarPuntero}
          onPointerCancel={alSoltarPuntero}
          className={`absolute inset-x-0 top-0 z-30 touch-none px-5 ${historia ? "pt-2 pb-1.5" : "pt-2.5 pb-3"}`}
        >
          <div className={`mx-auto h-[5px] cursor-grab rounded-full bg-borde-pastilla ${historia ? "w-10" : "mb-2 w-11"}`} />
          {historia ? (
            <>
              {/* Fila 1 (44 px): la X a la izquierda (regla de Apple para hojas que confirman algo), el título y, a la derecha,
                  lo que lo acompaña (se acorta con elipsis; el título no). Fila 2: el avance a todo el ancho. En una pantalla
                  interna, «‹» en lugar de la X y el título de esa pantalla; lo de la derecha no se muestra. */}
              <div className="mt-0.5 -ml-1 flex h-11 items-center gap-2">
                {pila.length > 0 || historia.volver ? (
                  <span data-volver-historial="" className="contents">
                    <BotonVolverCabecera onClick={() => (pila.length > 0 ? pila[pila.length - 1]!.cerrar.current() : historia.volver?.())} />
                  </span>
                ) : (
                  <BotonCerrar onClick={cerrar} />
                )}
                <h2 id={idTitulo} className={`font-display text-titulo-seccion text-texto ${pila.length > 0 || historia.tituloElipsis ? "min-w-0 flex-1 truncate" : "shrink-0"}`}>
                  {pila.length > 0 ? pila[pila.length - 1]!.titulo.current : titulo}
                </h2>
                {pila.length === 0 && !historia.volver && historia.alLadoDelTitulo}
              </div>
              {historia.avance && pila.length === 0 && <div className="mt-1.5">{historia.avance}</div>}
            </>
          ) : (
            <div className={tituloOculto ? "flex items-center justify-end gap-3" : "flex items-center justify-between gap-3"}>
              <h2 id={idTitulo} className={tituloOculto ? "sr-only" : "min-w-0 font-display text-titulo-hoja text-texto"}>
                {titulo}
              </h2>
              <BotonCerrar onClick={cerrar} />
            </div>
          )}
          {/* Zona fija bajo el título: forma parte de la cabecera (y de su desenfoque) */}
          {fijoArriba && <div className="mt-3">{fijoArriba}</div>}
          <div ref={setRanuraArriba} className="[&:not(:empty)]:mt-3" />
        </div>
        {capaSuperior && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[calc(var(--cabecera,79px)+2px)] z-40 overflow-x-clip px-5">
            {capaSuperior}
          </div>
        )}
        {/* Zona fija de abajo (píldora de resumen…): se oculta mientras el teclado está abierto */}
        <div ref={setRanuraAbajo} className={`hoja-abajo pointer-events-none absolute inset-x-0 bottom-0 z-30 ${pila.length > 0 ? "hidden" : ""}`} />
      </div>
      {avisando && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-velo px-6">
          <div
            ref={dialogoAviso}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={idAviso}
            aria-describedby={idAvisoTexto}
            className="mov-aparece w-full max-w-[340px] rounded-radio-xl bg-superficie p-5 text-texto shadow-hoja"
          >
            <h3 id={idAviso} className="font-display text-titulo-hoja">
              {textosAviso.titulo ?? avisoTitulo}
            </h3>
            <p id={idAvisoTexto} className="mt-1.5 text-cuerpo text-texto-secundario">
              {textosAviso.texto ?? avisoTexto}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Boton ref={seguirAqui} anchoCompleto onClick={seguirAqui_}>
                {avisoQuedarme}
              </Boton>
              <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={salirDeVerdad}>
                {avisoDescartar}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
    </ContextoHoja.Provider>
  );
}

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** «‹» de la cabecera: vuelve a la pantalla anterior de la misma hoja (mismo tamaño y fondo que la ✕). */
export function BotonVolverCabecera({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Volver" data-volver-interna="" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-superficie-hundida text-texto">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
  );
}

export function BotonCerrar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-superficie-hundida text-texto">
      <IconoCerrar tamano={20} />
    </button>
  );
}
