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
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const [dedo, setDedo] = useState(false);
  const [enfocada, setEnfocada] = useState<number | null>(null);
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
  const activoRef = useRef(activo);
  useEffect(() => {
    activoRef.current = activo;
  }, [activo]);
  useEffect(() => () => {
    if (pendiente.current) clearTimeout(pendiente.current);
  }, []);
  const varios = medios.length > 1;
  // Como una historia: con el reel activo y a la vista, cada foto dura 5 s (la animación de su barra es el reloj).
  const corre = varios && activo && !pausado && !dedo && !oculta && enfocada === null && !reducido && medios[indice]?.tipo === "foto";
  const avanzar = () => {
    const el = ref.current;
    if (!el || !corre || indice >= medios.length - 1) return;
    el.scrollTo({ left: (indice + 1) * el.clientWidth, behavior: "smooth" });
  };
  /** Toque en la zona central de la foto: fuera quedan arriba (barras, sonido), la columna de botones y la descripción. */
  const enCentro = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const cap = e.currentTarget.parentElement?.querySelector(".cap")?.getBoundingClientRect();
    const abajo = cap && cap.height ? cap.top - 8 : r.bottom - r.height * 0.3;
    return e.clientY > r.top + 44 && e.clientY < abajo && e.clientX > r.left + 24 && e.clientX < r.right - 72;
  };
  const abrirEnfocada = () => {
    const el = ref.current;
    if (!el || !activoRef.current) return;
    history.pushState({ ...history.state, catalogoFoto: true }, "", location.href);
    setEnfocada(Math.round(el.scrollLeft / el.clientWidth));
  };
  const cerrarEnfocada = (i: number) => {
    const el = ref.current;
    setEnfocada(null);
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "instant" });
    setIndice(i);
    devolverFoco.current = true;
  };
  // El foco vuelve a la foto cuando la vista ya se desmontó (antes el fondo sigue inerte).
  const devolverFoco = useRef(false);
  useEffect(() => {
    if (enfocada !== null || !devolverFoco.current) return;
    devolverFoco.current = false;
    ref.current?.focus({ preventScroll: true });
  }, [enfocada]);
  return (
    <>
      <div
        className="carrusel"
        ref={ref}
        tabIndex={-1}
        onScroll={(e) => {
          const d = e.currentTarget;
          setIndice(Math.round(d.scrollLeft / d.clientWidth));
        }}
        onPointerDown={(e) => {
          tap.current = { t: tap.current.t, x: e.clientX, y: e.clientY, abajo: Date.now() };
          setDedo(true);
        }}
        onPointerCancel={() => setDedo(false)}
        onPointerLeave={() => setDedo(false)}
        onPointerUp={(e) => {
          setDedo(false);
          if (
            Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) >
            12
          )
            return;
          const now = Date.now();
          if (now - tap.current.t < DOBLE_TOQUE) {
            if (pendiente.current) clearTimeout(pendiente.current);
            pendiente.current = null;
            dobleToque();
            tap.current.t = 0;
            return;
          }
          tap.current.t = now;
          // Mantener pulsado pausa (como una historia) y no abre nada al soltar.
          if (now - tap.current.abajo < 450 && enCentro(e)) {
            if (pendiente.current) clearTimeout(pendiente.current);
            pendiente.current = setTimeout(() => {
              pendiente.current = null;
              abrirEnfocada();
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
                visible={activo && indice === i}
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
      {enfocada !== null && (
        <VistaEnfocada medios={medios} nombre={nombre} inicial={enfocada} cerrada={cerrarEnfocada} />
      )}
    </>
  );
}
