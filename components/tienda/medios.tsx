"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Medio } from "@/lib/types";
import { Icono } from "./iconos";
import { VistaEnfocada } from "./vista-enfocada";
const tintes = new Map<string, { c: string; dark: boolean }>();
export function colorDePortada(
  url: string,
): Promise<{ c: string; dark: boolean } | null> {
  if (tintes.has(url)) return Promise.resolve(tintes.get(url)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 24;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 24, 24);
        const d = ctx.getImageData(0, 0, 24, 24).data;
        const sum = [0, 0, 0];
        let n = 0;
        for (let y = 0; y < 24; y++)
          for (let x = 0; x < 24; x++) {
            if (x > 2 && x < 21 && y > 2 && y < 21) continue;
            const i = (y * 24 + x) * 4;
            for (let k = 0; k < 3; k++) sum[k] += d[i + k];
            n++;
          }
        const rgb = sum.map((v) => Math.round(v / n));
        const t = {
          c: "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join(""),
          dark: rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 120,
        };
        tintes.set(url, t);
        resolve(t);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
function Video({
  medio,
  visible,
  cargar,
  progreso,
}: {
  medio: Extract<Medio, { tipo: "video" }>;
  visible: boolean;
  cargar: boolean;
  /** El avance del video (0–1) para su barra; el video no pasa solo a la siguiente foto. */
  progreso: (fraccion: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (visible) v.play().catch(() => {});
    else v.pause();
    return () => v.pause();
  }, [visible]);
  return (
    <>
      <video
        ref={ref}
        src={cargar ? medio.url : undefined}
        poster={medio.portada ?? undefined}
        autoPlay={visible}
        muted={mudo}
        playsInline
        loop
        preload={cargar ? "metadata" : "none"}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (visible && v.duration) progreso(v.currentTime / v.duration);
        }}
      />
      {visible && (
        <button
          className="sonido"
          aria-label={mudo ? "Activar sonido" : "Silenciar video"}
          onClick={() => setMudo(!mudo)}
        >
          <Icono nombre={mudo ? "mute" : "sound"} />
        </button>
      )}
    </>
  );
}
const MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion:reduce)";
const suscribirMovimiento = (avisar: () => void) => {
  const mq = matchMedia(MOVIMIENTO_REDUCIDO);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
};
const suscribirVisibilidad = (avisar: () => void) => {
  document.addEventListener("visibilitychange", avisar);
  return () => document.removeEventListener("visibilitychange", avisar);
};
/** Doble toque: misma ventana que antes (el «aaah»). Un toque solo abre la vista enfocada cuando ya no puede llegar el segundo. */
const DOBLE_TOQUE = 320;
/** Franja de arriba de la foto que no abre la vista enfocada (barras, colección y botón de expandir). */
const FRANJA_ARRIBA = 56;
export function Medios({
  medios,
  nombre,
  activo,
  siguiente,
  anterior,
  prioridad,
  dobleToque,
  irA = null,
  pausado = false,
  conVistaEnfocada = true,
}: {
  medios: Medio[];
  nombre: string;
  activo: boolean;
  siguiente: boolean;
  anterior: boolean;
  prioridad: boolean;
  dobleToque: () => void;
  /** Una foto a la que ir (la del color elegido): solo mueve este carrusel, no la página ni el foco. */
  irA?: number | null;
  /** Hay algo encima del reel (una hoja, el perfil o la descripción): las fotos no avanzan solas. */
  pausado?: boolean;
  /** La vista enfocada (toque, pellizco, teclado y botón). Apagada en la vista previa del panel: su historial es de la hoja. */
  conVistaEnfocada?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const [dedo, setDedo] = useState(false);
  const [enfocada, setEnfocada] = useState<{ i: number; id: string } | null>(null);
  // Si la vista se abrió con un pellizco, el mismo gesto sigue acercando dentro de ella.
  const [conPellizco, setConPellizco] = useState(false);
  const abierta = useRef(false);
  // Elegir una foto por color reinicia su barra aunque ya estuviera en ella.
  const [vuelta, setVuelta] = useState(0);
  const [irAnterior, setIrAnterior] = useState(irA);
  if (irA !== irAnterior) {
    setIrAnterior(irA);
    setVuelta((v) => v + 1);
  }
  const reducido = useSyncExternalStore(suscribirMovimiento, () => matchMedia(MOVIMIENTO_REDUCIDO).matches, () => false);
  const oculta = useSyncExternalStore(suscribirVisibilidad, () => document.hidden, () => false);
  const barraVideo = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (irA === null || !el) return;
    const left = irA * el.clientWidth;
    if (Math.abs(el.scrollLeft - left) < 2) return;
    el.scrollTo({ left, behavior: matchMedia(MOVIMIENTO_REDUCIDO).matches ? "auto" : "smooth" });
  }, [irA]);
  const tap = useRef({ t: 0, x: 0, y: 0, abajo: 0 });
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelarPendiente = () => {
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = null;
  };
  const activoRef = useRef(activo);
  const pausadoRef = useRef(pausado);
  const dedoRef = useRef(false);
  useEffect(() => {
    activoRef.current = activo;
    pausadoRef.current = pausado;
    // Si mientras tanto se abrió una hoja o el reel dejó de ser el activo, el toque que esperaba ya no abre nada.
    if (pausado || !activo) cancelarPendiente();
  }, [activo, pausado]);
  useEffect(() => () => {
    if (pendiente.current) clearTimeout(pendiente.current);
  }, []);
  const varios = medios.length > 1;
  // Como una historia: con el reel activo y a la vista, cada foto dura 5 s (la animación de su barra es el reloj).
  const corre = varios && activo && !pausado && !dedo && !oculta && !enfocada && !reducido && medios[indice]?.tipo === "foto";
  const avanzar = () => {
    const el = ref.current;
    if (!el || !corre || indice >= medios.length - 1) return;
    el.scrollTo({ left: (indice + 1) * el.clientWidth, behavior: "smooth" });
  };
  /** Toda la foto abre la vista enfocada: los controles del reel reciben sus propios toques (el resto de `.cap` y `.acts`
   * deja pasar el dedo) y solo queda fuera la franja de arriba, con las barras y el botón de expandir. */
  const enFoto = (e: React.PointerEvent<HTMLDivElement>) => e.clientY > e.currentTarget.getBoundingClientRect().top + FRANJA_ARRIBA;
  const abrirEnfocada = (pellizco = false) => {
    const el = ref.current;
    if (!conVistaEnfocada || !el || !activoRef.current || pausadoRef.current || abierta.current) return;
    abierta.current = true;
    cancelarPendiente();
    // Un id por apertura: una marca vieja (tras recargar o si iOS descartó la pestaña) no se confunde con esta.
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    history.pushState({ ...history.state, catalogoFoto: id }, "", location.href);
    setConPellizco(pellizco);
    setEnfocada({ i: Math.round(el.scrollLeft / el.clientWidth), id });
  };
  const irAFoto = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(medios.length - 1, i)) * el.clientWidth, behavior: reducido ? "auto" : "smooth" });
  };
  // Pellizcar la foto del reel (separar dos dedos) abre la vista enfocada, como un toque. Con eventos táctiles: en Safari de
  // iPhone son más fiables que los de puntero; `touch-action: pan-x pan-y` del carrusel evita el zoom de la página.
  const pinza = useRef<{ d0: number } | null>(null);
  const multitoque = useRef(false);
  const abrirRef = useRef(abrirEnfocada);
  const conVistaRef = useRef(conVistaEnfocada);
  useEffect(() => {
    abrirRef.current = abrirEnfocada;
    conVistaRef.current = conVistaEnfocada;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const inicio = (e: TouchEvent) => {
      if (e.targetTouches.length < 2 || !conVistaRef.current) return;
      multitoque.current = true;
      pinza.current = { d0: Math.max(1, distancia(e.targetTouches)) };
    };
    const mueve = (e: TouchEvent) => {
      const p = pinza.current;
      if (!p || e.targetTouches.length < 2) return;
      e.preventDefault();
      if (abierta.current) return;
      const d = distancia(e.targetTouches);
      if (d > p.d0 * 1.2 || d > p.d0 + 24) abrirRef.current(true);
    };
    const fin = (e: TouchEvent) => {
      if (e.targetTouches.length < 2) pinza.current = null;
      if (e.targetTouches.length === 0) setTimeout(() => (multitoque.current = false), 0);
    };
    const evitar = (e: Event) => e.preventDefault();
    el.addEventListener("touchstart", inicio, { passive: true });
    el.addEventListener("touchmove", mueve, { passive: false });
    el.addEventListener("touchend", fin);
    el.addEventListener("touchcancel", fin);
    el.addEventListener("gesturestart", evitar);
    return () => {
      el.removeEventListener("touchstart", inicio);
      el.removeEventListener("touchmove", mueve);
      el.removeEventListener("touchend", fin);
      el.removeEventListener("touchcancel", fin);
      el.removeEventListener("gesturestart", evitar);
    };
  }, []);
  const cerrarEnfocada = (i: number) => {
    const el = ref.current;
    abierta.current = false;
    dedoRef.current = false;
    setDedo(false);
    setEnfocada(null);
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "instant" });
    setIndice(i);
    devolverFoco.current = true;
  };
  // El foco vuelve a la foto cuando la vista ya se desmontó (antes el fondo sigue inerte).
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (enfocada || !devolverFoco.current) return;
    devolverFoco.current = false;
    ref.current?.focus({ preventScroll: true });
  }, [enfocada]);
  return (
    <>
      <div
        className="carrusel"
        ref={ref}
        // Con teclado: el carrusel se enfoca, ←/→ cambian de foto y Enter o Espacio abren la vista enfocada.
        tabIndex={0}
        role="group"
        aria-roledescription="carrusel"
        aria-label={`Fotos de ${nombre}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            irAFoto(indice + (e.key === "ArrowRight" ? 1 : -1));
          } else if ((e.key === "Enter" || e.key === " ") && conVistaEnfocada) {
            e.preventDefault();
            abrirEnfocada();
          }
        }}
        onScroll={(e) => {
          const d = e.currentTarget;
          setIndice(Math.round(d.scrollLeft / d.clientWidth));
        }}
        onPointerDown={(e) => {
          // Un dedo nuevo (un segundo toque, un deslizamiento) anula el toque que esperaba a abrir la vista.
          cancelarPendiente();
          tap.current = { t: tap.current.t, x: e.clientX, y: e.clientY, abajo: Date.now() };
          dedoRef.current = true;
          setDedo(true);
        }}
        onPointerCancel={() => {
          cancelarPendiente();
          dedoRef.current = false;
          setDedo(false);
        }}
        onPointerLeave={() => {
          dedoRef.current = false;
          setDedo(false);
        }}
        onPointerUp={(e) => {
          dedoRef.current = false;
          setDedo(false);
          // Un pellizco no es un toque: ni «aaah» ni vista enfocada al soltar los dedos.
          if (multitoque.current || abierta.current) return;
          if (
            Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) >
            12
          ) {
            cancelarPendiente();
            return;
          }
          const now = Date.now();
          // Mantener pulsado pausa (como una historia): al soltar no abre nada ni cuenta para el doble toque.
          if (now - tap.current.abajo >= 450) {
            tap.current.t = 0;
            return;
          }
          if (now - tap.current.t < DOBLE_TOQUE) {
            cancelarPendiente();
            dobleToque();
            tap.current.t = 0;
            return;
          }
          tap.current.t = now;
          if (conVistaEnfocada && enFoto(e)) {
            pendiente.current = setTimeout(() => {
              pendiente.current = null;
              if (!dedoRef.current) abrirRef.current();
            }, DOBLE_TOQUE);
          }
        }}
      >
        {medios.map((m, i) => (
          <div className="medio" key={m.url}>
            {m.tipo === "foto" ? (
              <img
                src={prioridad || activo || siguiente || anterior ? m.url : "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="}
                alt={nombre}
                loading={prioridad && i === 0 ? "eager" : "lazy"}
                draggable={false}
              />
            ) : (
              <Video
                medio={m}
                visible={activo && indice === i && !enfocada}
                cargar={activo || siguiente}
                progreso={(f) => {
                  if (barraVideo.current) barraVideo.current.style.transform = `scaleX(${f})`;
                }}
              />
            )}
          </div>
        ))}
      </div>
      {varios && (
        <div
          className="historias-medios"
          role="img"
          aria-label={`${medios[indice]?.tipo === "video" ? "Video" : "Foto"} ${indice + 1} de ${medios.length}`}
        >
          {medios.map((m, i) => (
            <span className="historia" key={m.url} aria-hidden="true">
              {i === indice ? (
                <i
                  key={`${i}-${vuelta}`}
                  ref={m.tipo === "video" ? barraVideo : undefined}
                  className={m.tipo === "video" ? "video" : "activa"}
                  data-corre={corre ? "" : undefined}
                  onAnimationEnd={avanzar}
                />
              ) : (
                <i className={i < indice ? "vista" : undefined} />
              )}
            </span>
          ))}
        </div>
      )}
      {conVistaEnfocada && medios.some((m) => m.tipo === "foto") && (
        <button
          type="button"
          className={"expandir ov" + (varios ? " con-historias" : "")}
          aria-label="Ver foto en grande"
          onClick={() => abrirEnfocada()}
        >
          <Icono nombre="expandir" />
        </button>
      )}
      {enfocada && (
        <VistaEnfocada
          medios={medios}
          nombre={nombre}
          inicial={enfocada.i}
          idHistorial={enfocada.id}
          cerrada={cerrarEnfocada}
          pellizco={conPellizco}
        />
      )}
    </>
  );
}
