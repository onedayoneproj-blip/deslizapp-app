"use client";

import { useRef, useState, type ReactNode } from "react";
import { IconoBocina, IconoBocinaApagada } from "../iconos";
import { Foto } from "../foto";
import { clases, FOCO } from "./comunes";

/**
 * El video de un producto (docs/09 §16.5): se reproduce solo, sin sonido y en bucle (muted, playsinline, loop, autoplay), con la
 * portada como póster mientras carga. Tocarlo activa o quita el sonido; una bocina pequeña en la esquina lo dice. Sirve con una
 * URL local (blob:, recién preparado) o la de Supabase. Si no se puede reproducir, queda la portada con una línea corta.
 * El tamaño y el radio los pone quien lo usa (`className`).
 */
export function VideoProducto({ src, portada, className, esquina }: { src: string; portada: string | null; className?: string; esquina?: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null);
  const [conSonido, setConSonido] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  // Otro video: se vuelve a intentar.
  if (fallo !== null && fallo !== src) setFallo(null);
  const roto = fallo === src;

  const alternar = () => {
    const v = video.current;
    if (!v) return;
    const sonar = !conSonido;
    v.muted = !sonar;
    setConSonido(sonar);
    // El toque es un gesto: si el autoplay no había arrancado (modo ahorro en iPhone), arranca ahora.
    if (v.paused) void v.play().catch(() => undefined);
  };

  if (roto) {
    return (
      <div className="flex flex-col gap-2">
        <div className={clases("relative overflow-hidden bg-superficie-hundida", className)}>
          {portada && <Foto src={portada} alt="Portada del video" className="h-full w-full" sizes="240px" />}
          {esquina}
        </div>
        <p role="status" className="text-center text-secundario text-texto-secundario">
          Este video no arrancó aquí. Si en el catálogo tampoco, súbelo otra vez.
        </p>
      </div>
    );
  }

  return (
    <div className={clases("relative overflow-hidden bg-superficie-hundida", className)}>
      <button
        type="button"
        onClick={alternar}
        aria-pressed={conSonido}
        aria-label={conSonido ? "Quitar el sonido del video" : "Activar el sonido del video"}
        className={clases("tocable absolute inset-0 block h-full w-full", FOCO)}
      >
        <video
          ref={(el) => {
            video.current = el;
            // Si falló antes de que React escuchara 'error' (página que viene del servidor), se nota aquí.
            if (el?.error) queueMicrotask(() => setFallo(src));
            // iOS solo reproduce solo un video que nace mudo: el atributo, no solo la propiedad.
            if (el && !el.hasAttribute("muted") && !conSonido) {
              el.defaultMuted = true;
              el.muted = true;
              el.setAttribute("muted", "");
            }
          }}
          src={src}
          poster={portada ?? undefined}
          muted={!conSonido}
          playsInline
          loop
          autoPlay
          preload="auto"
          onError={() => setFallo(src)}
          className="pointer-events-none h-full w-full object-cover"
        />
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-[rgb(0_0_0/0.45)] text-white"
      >
        {conSonido ? <IconoBocina tamano={16} strokeWidth={2.4} /> : <IconoBocinaApagada tamano={16} strokeWidth={2.4} />}
      </span>
      {esquina}
    </div>
  );
}
