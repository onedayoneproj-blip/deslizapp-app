"use client";
import { useEffect, useRef, useState } from "react";
import type { Medio } from "@/lib/types";
import { Icono } from "./iconos";
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
}: {
  medio: Extract<Medio, { tipo: "video" }>;
  visible: boolean;
  cargar: boolean;
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
export function Medios({
  medios,
  nombre,
  activo,
  siguiente,
  anterior,
  prioridad,
  dobleToque,
}: {
  medios: Medio[];
  nombre: string;
  activo: boolean;
  siguiente: boolean;
  anterior: boolean;
  prioridad: boolean;
  dobleToque: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const tap = useRef({ t: 0, x: 0, y: 0 });
  return (
    <>
      <div
        className="carrusel"
        ref={ref}
        onScroll={(e) => {
          const d = e.currentTarget;
          setIndice(Math.round(d.scrollLeft / d.clientWidth));
        }}
        onPointerDown={(e) => {
          tap.current = { t: tap.current.t, x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (
            Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) >
            12
          )
            return;
          const now = Date.now();
          if (now - tap.current.t < 320) {
            dobleToque();
            tap.current.t = 0;
          } else tap.current.t = now;
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
              />
            )}
          </div>
        ))}
      </div>
      {medios.length > 1 && (
        <div className="puntos-medios" role="group" aria-label="Fotos y video">
          {medios.map((m, i) => (
            <button
              key={m.url}
              aria-label={`Ver medio ${i + 1}`}
              aria-pressed={i === indice}
              onClick={() =>
                ref.current?.scrollTo({
                  left: i * ref.current.clientWidth,
                  behavior: matchMedia("(prefers-reduced-motion:reduce)")
                    .matches
                    ? "auto"
                    : "smooth",
                })
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
