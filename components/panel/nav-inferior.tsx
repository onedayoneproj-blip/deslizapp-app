"use client";

// Barra de pestañas inferior. DECISIÓN DEL DUEÑO QUE MANDA SOBRE EL PROTOTIPO (ver
// docs/04-pantallas.md): no volver a la píldora verde expandida del prototipo.
//
// - La barra es una cápsula sólida (sin vidrio ni desenfoque) con cinco pestañas iguales:
//   ícono arriba y nombre siempre visible debajo.
// - Selector Rosa Suave en cápsula, de ANCHO VARIABLE: se ajusta al contenido de la pestaña que
//   cubre (lo más ancho entre ícono y nombre, medido de verdad) + ~14 px por lado.
// - Toque: el selector se desliza y cambia de ancho con un resorte corto.
// - Arrastre con imán (estilo iOS 26): mientras el dedo se aleja, el selector se estira hacia él
//   con resistencia de goma (máx. ~28 % de una pestaña) sin dejar su pestaña; al pasar el umbral
//   de la vecina, SALTA a ella con el resorte (una vibración leve si el equipo la admite). La
//   pantalla solo cambia al soltar. Nunca se sale de la barra (6 px del borde, sigue la curva).
// - Todo se anima con transform (tres piezas: punta izquierda, centro con scaleX y punta
//   derecha, así las puntas no se deforman) y un resorte propio con requestAnimationFrame.
// - Con prefers-reduced-motion: sin resorte ni estiramiento, cambio directo.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as EventoPuntero,
} from "react";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { hayCampoConFoco, RESORTE } from "@/lib/movimiento";
import { IconoCatalogo, IconoClientes, IconoInicio, IconoPedidos, IconoPromos } from "../iconos";
import { Contador } from "../contador";

type Seccion = { href: string; nombre: string; Icono: ComponentType<{ tamano?: number; strokeWidth?: number }> };

const SECCIONES: Seccion[] = [
  { href: "/", nombre: "Inicio", Icono: IconoInicio },
  { href: "/catalogo", nombre: "Catálogo", Icono: IconoCatalogo },
  { href: "/pedidos", nombre: "Pedidos", Icono: IconoPedidos },
  { href: "/clientes", nombre: "Clientes", Icono: IconoClientes },
  { href: "/promos", nombre: "Promos", Icono: IconoPromos },
];
const N = SECCIONES.length;

/** Distancia horizontal (px) a partir de la cual un toque pasa a ser arrastre. */
const UMBRAL_ARRASTRE = 8;
/** Zona de los bordes de la pantalla donde no se empieza a arrastrar (gesto de volver del iPhone). */
const BORDE_PANTALLA = 20;
/** Relleno del selector a cada lado del contenido. */
const RELLENO = 14;
/** Estiramiento máximo hacia el dedo, en fracción del ancho de una pestaña. */
const ESTIRA_MAX = 0.28;
/** Cuánto hay que entrar en la pestaña vecina (fracción de su ancho) para que el selector salte. */
const UMBRAL_SALTO = 0.5;
/** Resorte del sistema de movimiento (lib/movimiento.ts): rígido y casi crítico. */
const RIGIDEZ = RESORTE.rigidez;
const AMORTIGUACION = RESORTE.amortiguacion;
/** Las pestañas navegan con el tipo "pestaña": la pantalla cambia con un fundido corto. */

function indiceDe(pathname: string) {
  const i = SECCIONES.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)));
  return i === -1 ? 0 : i;
}

type Medidas = { ancho: number; alto: number; contenidos: number[] };

export function NavInferior() {
  const pathname = usePathname();
  const router = useRouter();
  const { tiendaActivaId, getPedidos } = useData();
  const { data: pedidos } = useConsulta(`pedidos:${tiendaActivaId}`, () => getPedidos(tiendaActivaId));
  const nuevos = pedidos?.filter((p) => p.estado === "nuevo").length ?? 0;

  const activa = indiceDe(pathname);
  // Toque: el selector va a la pestaña tocada al instante, antes de que termine de cambiar la ruta.
  const [tocada, setTocada] = useState<{ indice: number; desde: string } | null>(null);
  // Arrastre: pestaña que el selector cubre ahora (se resalta en vivo).
  const [cubierta, setCubierta] = useState<number | null>(null);
  const [medidas, setMedidas] = useState<Medidas | null>(null);

  const seleccion = tocada && tocada.desde === pathname ? tocada.indice : activa;
  const resaltada = cubierta ?? seleccion;

  const pista = useRef<HTMLDivElement>(null);
  const medidores = useRef<(HTMLSpanElement | null)[]>([]);
  const piezas = useRef<{ izq: HTMLSpanElement | null; centro: HTMLSpanElement | null; der: HTMLSpanElement | null }>({ izq: null, centro: null, der: null });
  const gesto = useRef<{ id: number; x0: number; y0: number; arrastrando: boolean; cubierta: number } | null>(null);
  const ignorarClic = useRef(false);
  const reducido = useRef(false);

  // ---- Medidas reales (ancho de la barra y del contenido de cada pestaña) ----
  useLayoutEffect(() => {
    reducido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const medir = () => {
      const p = pista.current;
      if (!p) return;
      setMedidas({
        ancho: p.clientWidth,
        alto: p.clientHeight,
        contenidos: medidores.current.map((m) => m?.offsetWidth ?? 0),
      });
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (pista.current) ro.observe(pista.current);
    medidores.current.forEach((m) => m && ro.observe(m)); // cambia si cambia el tamaño de letra
    return () => ro.disconnect();
  }, []);

  /** Bordes (izq, der) del selector en reposo sobre la pestaña `i`. */
  const reposo = useCallback(
    (i: number, m: Medidas) => {
      const tab = m.ancho / N;
      const centro = tab * (i + 0.5);
      // Ancho = contenido + relleno; al menos una cápsula redonda y a lo sumo un poco más que la pestaña.
      const ancho = Math.min(Math.max(m.contenidos[i]! + 2 * RELLENO, m.alto), tab + 12);
      return limitar(centro - ancho / 2, centro + ancho / 2, m);
    },
    [],
  );

  // ---- Resorte (física simple, sin duración fija) ----
  const resorte = useRef({ L: 0, R: 0, vL: 0, vR: 0, objL: 0, objR: 0, raf: 0, ultimo: 0, listo: false });

  const pintar = useCallback(() => {
    const { izq, centro, der } = piezas.current;
    const alto = pista.current?.clientHeight ?? 0;
    if (!izq || !centro || !der) return;
    const { L, R } = resorte.current;
    const r = alto / 2;
    const ancho = Math.max(R - L, alto);
    izq.style.width = der.style.width = `${r}px`;
    izq.style.transform = `translate3d(${L}px,0,0)`;
    der.style.transform = `translate3d(${L + ancho - r}px,0,0)`;
    // El centro mide 1 px y se estira con scaleX; se solapa medio píxel con cada punta (sin costuras).
    centro.style.transform = `translate3d(${L + r - 0.5}px,0,0) scaleX(${Math.max(0, ancho - 2 * r + 1)})`;
  }, []);

  /** will-change solo mientras el resorte se mueve. */
  const marcarWillChange = useCallback((activo: boolean) => {
    const { izq, centro, der } = piezas.current;
    for (const el of [izq, centro, der]) if (el) el.style.willChange = activo ? "transform" : "";
  }, []);

  const paso = useCallback(
    (t: number) => {
      const s = resorte.current;
      const dt = Math.min(0.032, (t - (s.ultimo || t)) / 1000) || 1 / 60;
      s.ultimo = t;
      const aL = RIGIDEZ * (s.objL - s.L) - AMORTIGUACION * s.vL;
      const aR = RIGIDEZ * (s.objR - s.R) - AMORTIGUACION * s.vR;
      s.vL += aL * dt;
      s.vR += aR * dt;
      s.L += s.vL * dt;
      s.R += s.vR * dt;
      const quieto = Math.abs(s.objL - s.L) < 0.2 && Math.abs(s.objR - s.R) < 0.2 && Math.abs(s.vL) < 2 && Math.abs(s.vR) < 2;
      if (quieto) {
        s.L = s.objL;
        s.R = s.objR;
        s.vL = s.vR = 0;
        s.raf = 0;
        s.ultimo = 0;
        marcarWillChange(false);
      } else s.raf = requestAnimationFrame(paso);
      pintar();
    },
    [pintar, marcarWillChange],
  );

  /** Lleva el selector a (izq, der): con resorte o directo. */
  const llevar = useCallback(
    ([L, R]: [number, number], animado: boolean) => {
      const s = resorte.current;
      s.objL = L;
      s.objR = R;
      if (!animado || reducido.current || !s.listo) {
        cancelAnimationFrame(s.raf);
        Object.assign(s, { L, R, vL: 0, vR: 0, raf: 0, ultimo: 0, listo: true });
        pintar();
        return;
      }
      if (!s.raf) {
        marcarWillChange(true);
        s.raf = requestAnimationFrame(paso);
      }
    },
    [paso, pintar, marcarWillChange],
  );

  useEffect(() => () => cancelAnimationFrame(resorte.current.raf), []);

  // Fuera del arrastre, el selector va a la pestaña seleccionada (toque, enlace, botón atrás…).
  useLayoutEffect(() => {
    if (!medidas || gesto.current?.arrastrando) return;
    llevar(reposo(seleccion, medidas), true);
  }, [seleccion, medidas, llevar, reposo]);

  // ---- Arrastre con imán ----
  const objetivoArrastre = (dedo: number, i: number, m: Medidas): [number, number] => {
    const [L, R] = reposo(i, m);
    if (reducido.current) return [L, R];
    const tab = m.ancho / N;
    const d = dedo - tab * (i + 0.5);
    // Goma: crece rápido al principio y se frena hasta ESTIRA_MAX de una pestaña.
    const estira = ESTIRA_MAX * tab * Math.tanh(Math.abs(d) / (tab * 0.9));
    // El borde del lado del dedo se estira; el otro acompaña un poco (el selector se desplaza).
    // En las puntas de la barra, cada borde se topa por separado (el estiramiento queda limitado).
    const [nL, nR] = d >= 0 ? [L + estira * 0.3, R + estira] : [L - estira, R - estira * 0.3];
    return [Math.max(nL, 0), Math.min(nR, m.ancho)];
  };

  const alApuntar = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Cerca de los bordes de la pantalla solo se aceptan toques (el iPhone usa ese gesto para volver).
    if (e.clientX < BORDE_PANTALLA || e.clientX > window.innerWidth - BORDE_PANTALLA) return;
    gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, arrastrando: false, cubierta: seleccion };
  };

  const alMover = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId || !medidas || !pista.current) return;
    if (!g.arrastrando) {
      const dx = Math.abs(e.clientX - g.x0);
      if (dx < UMBRAL_ARRASTRE || dx < Math.abs(e.clientY - g.y0)) return;
      g.arrastrando = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setCubierta(g.cubierta);
    }
    const tab = medidas.ancho / N;
    const dedo = e.clientX - pista.current.getBoundingClientRect().left;
    // Salta de una en una mientras el dedo pase el umbral de la vecina (aunque el gesto sea rápido).
    let saltos = 0;
    for (;;) {
      const d = dedo - tab * (g.cubierta + 0.5);
      const umbral = tab * (0.5 + UMBRAL_SALTO);
      if (d > umbral && g.cubierta < N - 1) g.cubierta++;
      else if (d < -umbral && g.cubierta > 0) g.cubierta--;
      else break;
      saltos++;
    }
    if (saltos > 0) {
      setCubierta(g.cubierta);
      navigator.vibrate?.(8);
    }
    llevar(objetivoArrastre(dedo, g.cubierta, medidas), true);
  };

  const alSoltar = (e: EventoPuntero<HTMLDivElement>) => {
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.id !== e.pointerId || !g.arrastrando) return;
    ignorarClic.current = true; // el clic que llega después del arrastre no cuenta
    window.setTimeout(() => (ignorarClic.current = false), 0);
    setCubierta(null);
    // El selector ya está sobre una pestaña: vuelve a su reposo y ahí se navega.
    if (medidas) llevar(reposo(g.cubierta, medidas), true);
    if (g.cubierta !== activa) {
      if (hayCampoConFoco()) (document.activeElement as HTMLElement).blur();
      setTocada({ indice: g.cubierta, desde: pathname });
      router.push(SECCIONES[g.cubierta]!.href);
    }
  };

  const alCancelar = () => {
    const g = gesto.current;
    gesto.current = null;
    setCubierta(null);
    if (g?.arrastrando && medidas) llevar(reposo(seleccion, medidas), true);
  };

  return (
    <nav
      aria-label="Secciones"
      // Anclada durante las transiciones de pantalla: no se mueve (ver globals.css).
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] px-3 pb-(--nav-margen)"
    >
      <div className="pointer-events-auto h-(--nav-alto) rounded-full border border-linea bg-white p-1.5 shadow-[0_8px_24px_-12px_rgba(23,75,58,0.35)]">
        <div
          ref={pista}
          onPointerDown={alApuntar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alCancelar}
          onLostPointerCapture={(e) => {
            // Al tomar la captura, el enlace tocado pierde la suya (captura implícita del toque):
            // eso no es cancelar. Solo cuenta si la pierde la propia barra.
            if (e.target === e.currentTarget && gesto.current) alCancelar();
          }}
          className="relative h-full touch-pan-y select-none"
        >
          {/* Selector Rosa Suave en cápsula: punta izquierda + centro estirable + punta derecha */}
          <span aria-hidden="true" data-selector className={`pointer-events-none absolute inset-0 ${medidas ? "" : "opacity-0"}`}>
            <span
              ref={(el) => void (piezas.current.izq = el)}
              className="absolute inset-y-0 left-0 rounded-l-full bg-rosa"
            />
            <span
              ref={(el) => void (piezas.current.centro = el)}
              className="absolute inset-y-0 left-0 w-px origin-left bg-rosa"
            />
            <span
              ref={(el) => void (piezas.current.der = el)}
              className="absolute inset-y-0 left-0 rounded-r-full bg-rosa"
            />
          </span>

          <ul className="relative flex h-full">
            {SECCIONES.map(({ href, nombre, Icono }, i) => {
              const esActiva = i === activa;
              const marcada = i === resaltada;
              const badge = href === "/pedidos" && nuevos > 0 ? nuevos : 0;
              return (
                <li key={href} className="relative min-w-0 flex-1">
                  {/* Medidor invisible: ancho real del contenido con la letra de la pestaña activa */}
                  <span
                    ref={(el) => void (medidores.current[i] = el)}
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute top-0 left-0 flex w-max flex-col items-center"
                  >
                    <span className="block h-0 w-[22px]" />
                    <span className="text-[11.5px] leading-none font-extrabold whitespace-nowrap">{nombre}</span>
                  </span>
                  <Link
                    href={href}
                    draggable={false}
                    aria-current={esActiva ? "page" : undefined}
                    aria-label={badge ? `${nombre}, ${badge} ${badge === 1 ? "nuevo" : "nuevos"}` : undefined}
                    onClick={(e) => {
                      if (ignorarClic.current) {
                        e.preventDefault();
                        return;
                      }
                      // Con el teclado abierto se suelta el foco antes de navegar (la transición de
                      // pantalla no debe correr con un campo enfocado).
                      if (hayCampoConFoco()) (document.activeElement as HTMLElement).blur();
                      if (i !== activa) setTocada({ indice: i, desde: pathname });
                    }}
                    className={`tocable flex h-full flex-col items-center justify-center gap-[3px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-bosque focus-visible:ring-inset ${
                      marcada ? "text-bosque" : "text-tenue"
                    }`}
                  >
                    <span className="relative">
                      <Icono tamano={22} strokeWidth={marcada ? 2.3 : 2} />
                      <Contador valor={badge} tamano="barra" oculto className="mov-aparece absolute -top-1.5 -right-3" />
                    </span>
                    <span className={`max-w-full truncate px-0.5 text-[11.5px] leading-none ${marcada ? "font-extrabold" : "font-semibold"}`}>
                      {nombre}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

/** Mantiene el selector dentro de la barra (la pista ya deja 6 px al borde de la cápsula). */
function limitar(L: number, R: number, m: Medidas): [number, number] {
  const ancho = Math.min(R - L, m.ancho);
  const izq = Math.min(Math.max(L, 0), m.ancho - ancho);
  return [izq, izq + ancho];
}
