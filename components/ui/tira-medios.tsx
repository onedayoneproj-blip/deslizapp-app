"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { VIDEO_PERMITIDO } from "@/lib/config";
import { menosMovimiento } from "@/lib/movimiento";
import { Foto } from "../foto";
import { IconoMas, IconoReproducir } from "../iconos";
import { clases, FOCO } from "./comunes";

/** Lado de cada miniatura y el espacio entre ellas (px). */
const LADO = 76;
const ESPACIO = 8;
/** Cuánto hay que mantener presionado para empezar a ordenar (ms) y cuánto se puede mover el dedo antes (px). */
const ESPERA = 380;
const TOLERANCIA = 8;

export type ElementoTira = {
  id: string;
  tipo: "foto" | "video";
  /** La imagen de la miniatura: la foto, o la portada del video. */
  imagen: string | null;
  /** Solo video: duración en segundos (se muestra "0:18"). */
  duracionS?: number;
  /** Mientras se prepara o sube: 0 a 100 (anillo con el porcentaje sobre la miniatura oscurecida). */
  progreso?: number | null;
  /** Solo foto: en el taller de retoque ("pendiente", con anillo) o devuelta por el equipo ("devuelta"). */
  taller?: "pendiente" | "devuelta" | null;
};

/** 18 → "0:18"; 75 → "1:15". */
export const duracionCorta = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/**
 * Tira de fotos y video de un producto (docs/09 §16.5; tablero Producto «Perfume» y «Video»): miniaturas cuadradas de 76 px,
 * `radio-m`, en una fila que se desliza. La primera lleva "Portada"; un video lleva ▶ y su duración. Al final, la casilla
 * punteada "Foto o video" ("Agregar foto" mientras `VIDEO_PERMITIDO` esté apagado) (con `bloqueo`, se apaga y la razón va en la línea de abajo).
 *
 * Tocar una miniatura llama a `alTocar` (la hoja chica de acciones). Mantener presionado y arrastrar la ordena (`alMover`); el
 * mismo cambio se puede hacer desde la hoja chica ("Mover a la izquierda / derecha"), que es también el camino con teclado.
 */
export function TiraMedios({
  elementos,
  alTocar,
  alMover,
  alAgregar,
  bloqueo,
  nota,
  etiqueta = VIDEO_PERMITIDO ? "Fotos y video" : "Fotos",
  seleccionado,
}: {
  elementos: ElementoTira[];
  alTocar: (id: string) => void;
  alMover: (desde: number, hasta: number) => void;
  alAgregar: () => void;
  /** Por qué no se puede agregar otro (llegó al límite): apaga la casilla y reemplaza la nota. */
  bloqueo?: string | null;
  /** La línea de abajo ("Hasta 10. Mantén presionado para ordenar."). */
  nota?: ReactNode;
  etiqueta?: string;
  /** La miniatura que se ve en grande arriba (la hoja de producto): lleva un contorno `accion`. */
  seleccionado?: string;
}) {
  const fila = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ id: string; desde: number; x: number; y: number; timer: number; activo: boolean; puntero: number } | null>(null);
  const [arrastre, setArrastre] = useState<{ id: string; desde: number; dx: number } | null>(null);
  const tocarSuprimido = useRef(false);

  // Mientras se ordena, la fila no se desplaza: el touchmove se cancela (escucha no pasiva).
  useEffect(() => {
    const el = fila.current;
    if (!el) return;
    const frenar = (e: TouchEvent) => {
      if (gesto.current?.activo) e.preventDefault();
    };
    el.addEventListener("touchmove", frenar, { passive: false });
    return () => el.removeEventListener("touchmove", frenar);
  }, []);

  const paso = LADO + ESPACIO;
  const destino = arrastre ? Math.max(0, Math.min(elementos.length - 1, arrastre.desde + Math.round(arrastre.dx / paso))) : -1;

  const soltar = () => {
    const g = gesto.current;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.activo && arrastre) {
      tocarSuprimido.current = true;
      if (destino !== g.desde) alMover(g.desde, destino);
    }
    gesto.current = null;
    setArrastre(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={fila}
        role="list"
        aria-label={etiqueta}
        // Sangra hasta los bordes de la hoja: las miniaturas se deslizan por debajo del margen en vez de cortarse.
        className="-mx-5 flex gap-2 overflow-x-auto px-5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {elementos.map((m, i) => {
          const arrastrado = arrastre?.id === m.id;
          // Las demás se corren para dejarle lugar a la que se arrastra.
          let corrimiento = 0;
          if (arrastre && !arrastrado) {
            if (arrastre.desde < i && i <= destino) corrimiento = -paso;
            if (destino <= i && i < arrastre.desde) corrimiento = paso;
          }
          const sube = typeof m.progreso === "number";
          return (
            <div key={m.id} role="listitem" className="shrink-0">
              <button
                type="button"
                aria-current={seleccionado === m.id ? "true" : undefined}
                aria-label={`${m.tipo === "video" ? "Video" : "Foto"} ${i + 1} de ${elementos.length}${i === 0 ? ", portada" : ""}${sube ? `, ${Math.round(m.progreso!)} %` : ""}${m.taller === "pendiente" ? ", en el taller" : m.taller === "devuelta" ? ", devuelta por el taller" : ""}`}
                onClick={() => {
                  if (tocarSuprimido.current) {
                    tocarSuprimido.current = false;
                    return;
                  }
                  if (!sube) alTocar(m.id);
                }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  if (sube || elementos.length < 2) return;
                  const el = e.currentTarget;
                  const puntero = e.pointerId;
                  gesto.current = {
                    id: m.id,
                    desde: i,
                    x: e.clientX,
                    y: e.clientY,
                    puntero,
                    activo: false,
                    timer: window.setTimeout(() => {
                      if (!gesto.current) return;
                      gesto.current.activo = true;
                      try {
                        el.setPointerCapture(puntero);
                      } catch {
                        // Algunos navegadores ya soltaron el puntero: el arrastre sigue con los eventos de la fila.
                      }
                      navigator.vibrate?.(10);
                      setArrastre({ id: m.id, desde: i, dx: 0 });
                    }, ESPERA),
                  };
                }}
                onPointerMove={(e) => {
                  const g = gesto.current;
                  if (!g || g.id !== m.id) return;
                  if (!g.activo) {
                    // Se movió antes de tiempo: es un deslizamiento de la fila, no un arrastre.
                    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TOLERANCIA) {
                      window.clearTimeout(g.timer);
                      gesto.current = null;
                    }
                    return;
                  }
                  setArrastre({ id: g.id, desde: g.desde, dx: e.clientX - g.x });
                }}
                onPointerUp={soltar}
                onPointerCancel={soltar}
                className={clases(
                  "tocable relative block overflow-hidden rounded-radio-m bg-superficie-hundida select-none [-webkit-touch-callout:none]",
                  FOCO,
                  seleccionado === m.id && "outline-3 outline-offset-2 outline-accion",
                  arrastrado ? "z-10 shadow-flotante" : "transition-transform duration-(--mov-normal) ease-(--curva-salida)",
                )}
                style={{
                  width: LADO,
                  height: LADO,
                  transform: arrastrado ? `translateX(${arrastre!.dx}px) scale(${menosMovimiento() ? 1 : 1.06})` : corrimiento ? `translateX(${corrimiento}px)` : undefined,
                }}
              >
                {m.imagen ? <Foto src={m.imagen} alt="" className="h-full w-full" sizes="76px" /> : null}
                {sube && (
                  <span className="absolute inset-0 grid place-items-center bg-[rgb(0_0_0/0.45)] text-white">
                    <AnilloProgreso valor={m.progreso!} />
                  </span>
                )}
                {m.taller === "pendiente" && <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-radio-m ring-3 ring-resalte ring-inset" />}
                {m.taller ? (
                  <Sello tono={m.taller === "devuelta" ? "atencion" : "resalte"}>{m.taller === "devuelta" ? "Devuelta" : "En el taller"}</Sello>
                ) : (
                  i === 0 && !sube && <Sello>Portada</Sello>
                )}
                {m.tipo === "video" && !sube && (
                  <Sello derecha={i === 0}>
                    <IconoReproducir tamano={10} strokeWidth={0} />
                    {m.duracionS !== undefined ? duracionCorta(m.duracionS) : "Video"}
                  </Sello>
                )}
              </button>
            </div>
          );
        })}
        <div role="listitem" className="shrink-0">
          <button
            type="button"
            onClick={alAgregar}
            disabled={Boolean(bloqueo)}
            className={clases(
              "tocable flex flex-col items-center justify-center gap-0.5 rounded-radio-m border-2 border-dashed border-borde-campo bg-superficie px-1 text-center text-etiqueta text-texto disabled:opacity-40",
              FOCO,
            )}
            style={{ width: LADO, height: LADO }}
          >
            <IconoMas tamano={18} strokeWidth={2.4} />
            {VIDEO_PERMITIDO ? "Foto o video" : "Agregar foto"}
          </button>
        </div>
      </div>
      {(bloqueo || nota) && <p className="text-secundario text-texto-secundario">{bloqueo ?? nota}</p>}
    </div>
  );
}

/** El rótulo pequeño sobre la miniatura ("Portada", "▶ 0:18"): `accion` con texto `sobre-accion`. */
function Sello({ children, derecha = false, tono = "accion" }: { children: ReactNode; derecha?: boolean; tono?: "accion" | "resalte" | "atencion" }) {
  return (
    <span
      aria-hidden="true"
      className={clases(
        "absolute bottom-1.5 inline-flex h-5 items-center gap-1 rounded-full px-2 text-etiqueta leading-none whitespace-nowrap",
        tono === "resalte" ? "bg-resalte text-sobre-resalte" : tono === "atencion" ? "bg-atencion-suave text-atencion-texto" : "bg-accion text-sobre-accion",
        derecha ? "right-1.5" : "left-1.5",
      )}
    >
      {children}
    </span>
  );
}

/** Anillo de progreso de 34 px con el porcentaje debajo. */
function AnilloProgreso({ valor }: { valor: number }) {
  const r = 14;
  const largo = 2 * Math.PI * r;
  return (
    <span className="flex flex-col items-center gap-0.5">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r={r} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth="3" />
        <circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - Math.max(0, Math.min(100, valor)) / 100)}
          transform="rotate(-90 17 17)"
        />
      </svg>
      <span className="text-etiqueta leading-none tabular-nums">{Math.round(valor)} %</span>
    </span>
  );
}
