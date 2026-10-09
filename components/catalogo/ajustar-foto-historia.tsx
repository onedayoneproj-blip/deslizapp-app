"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ENCUADRE_INICIAL, K_MAX, K_MIN, K_PASO, acercarA, limitar, medidaFoto, mover, pellizcar, rectFondo,
  type AjusteFoto, type Encuadre, type Medida, type Punto,
} from "@/lib/encuadre-historia";
import { generarImagenHistoria, imagenesStickers, type EntradaImagenHistoria } from "@/lib/imagen-historia";
import { limitarSticker, nombreSticker, moverSticker, type StickerPuesto } from "@/lib/stickers-historia";
import { Boton, Interruptor } from "../ui";

type Entrada = Omit<EntradaImagenHistoria, "ajuste" | "soloTarjeta">;

/**
 * «Ajustar foto»: vista a pantalla completa con el marco 9:16 de la historia. Se arrastra y se pellizca la foto (o se usa el
 * deslizador y los botones − / +); con «Fondo difuminado» la foto va entera sobre sí misma ampliada y desenfocada. La tarjeta
 * de abajo se ve semitransparente como guía. «Listo» devuelve el ajuste; la matemática es la de lib/encuadre-historia.ts, la misma
 * que dibuja la imagen final. Gestos como el visor de la ficha (lib/tienda/zoom.ts): pointer events, `touch-action: none` solo
 * en el marco (no hay hojas encima) y solo `transform` en lo que se mueve.
 */
export function AjustarFotoHistoria({ entrada, natural, inicial, stickersIniciales = [], alListo, alCancelar }: {
  entrada: Entrada;
  natural: Medida;
  inicial: AjusteFoto;
  stickersIniciales?: StickerPuesto[];
  alListo: (a: AjusteFoto, stickers: StickerPuesto[]) => void;
  alCancelar: () => void;
}) {
  const [difuminado, setDifuminado] = useState(inicial.difuminado);
  const [enc, setEnc] = useState<Encuadre>(inicial.encuadre);
  const [area, setArea] = useState<Medida>({ ancho: 0, alto: 0 });
  const [guia, setGuia] = useState<string | null>(null);
  const [puestos, setPuestos] = useState<StickerPuesto[]>(stickersIniciales);
  const [imgStickers, setImgStickers] = useState<Record<string, { url: string; ancho: number; alto: number }>>({});
  const zona = useRef<HTMLDivElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  const actual = useRef(enc);
  const dedos = useRef(new Map<number, Punto>());
  const gesto = useRef<{ inicio: Encuadre; c0: Punto; d0: number } | null>(null);

  // El marco 9:16 más grande que cabe en la zona libre de la pantalla
  useEffect(() => {
    const el = zona.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      const ancho = Math.max(0, Math.min(r.width, (r.height * 9) / 16));
      setArea({ ancho, alto: (ancho * 16) / 9 });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // La tarjeta de abajo, sola y sobre fondo transparente, como guía
  useEffect(() => {
    let vigente = true;
    let url: string | null = null;
    generarImagenHistoria({ ...entrada, soloTarjeta: true }).then(
      (blob) => {
        if (!vigente) return;
        url = URL.createObjectURL(blob);
        setGuia(url);
      },
      () => undefined,
    );
    return () => {
      vigente = false;
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 0);
    };
  }, [entrada]);

  // Los stickers como imágenes sueltas: el mismo dibujo que sale en la imagen final
  useEffect(() => {
    let vigente = true;
    void imagenesStickers(stickersIniciales).then((m) => vigente && setImgStickers(m));
    return () => {
      vigente = false;
    };
    // Los stickers que se pueden mover son los de la hoja al abrir esta vista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape cierra solo esta vista (no la hoja de abajo); Safari no debe hacer zoom de página con el pellizco
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      alCancelar();
    };
    window.addEventListener("keydown", tecla, true);
    const parar = (e: Event) => e.preventDefault();
    const marco = marcoRef.current;
    marco?.addEventListener("gesturestart", parar);
    marco?.addEventListener("gesturechange", parar);
    return () => {
      window.removeEventListener("keydown", tecla, true);
      marco?.removeEventListener("gesturestart", parar);
      marco?.removeEventListener("gesturechange", parar);
    };
  }, [alCancelar]);

  const poner = (v: Encuadre) => {
    actual.current = v;
    setEnc(v);
  };
  const marco: Medida = area;
  const listo = area.ancho > 0;

  const centrado = (e: { clientX: number; clientY: number }): Punto => {
    const r = marcoRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };
  const dos = () => {
    const [a, b] = [...dedos.current.values()];
    return { c: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }, d: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
  };
  const bajar = (e: React.PointerEvent) => {
    dedos.current.set(e.pointerId, centrado(e));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (dedos.current.size === 2) {
      const { c, d } = dos();
      gesto.current = { inicio: actual.current, c0: c, d0: d };
    }
  };
  const moverDedo = (e: React.PointerEvent) => {
    const antes = dedos.current.get(e.pointerId);
    if (!antes || !listo) return;
    const ahora = centrado(e);
    dedos.current.set(e.pointerId, ahora);
    if (dedos.current.size >= 2 && gesto.current) {
      const { c, d } = dos();
      poner(pellizcar(gesto.current.inicio, gesto.current.c0, gesto.current.d0, c, d, marco, natural, difuminado));
    } else if (dedos.current.size === 1) {
      poner(mover(actual.current, ahora.x - antes.x, ahora.y - antes.y, marco, natural, difuminado));
    }
  };
  const soltar = (e: React.PointerEvent) => {
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) gesto.current = null;
  };

  const cambiarFondo = (v: boolean) => {
    setDifuminado(v);
    poner(ENCUADRE_INICIAL);
  };
  const teclado = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const paso = 0.03;
    const flechas: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] };
    const f = flechas[e.key];
    if (f) {
      e.preventDefault();
      poner(mover(actual.current, f[0] * marco.ancho, f[1] * marco.alto, marco, natural, difuminado));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoom(actual.current.k + K_PASO);
    } else if (e.key === "-") {
      e.preventDefault();
      zoom(actual.current.k - K_PASO);
    }
  };
  const zoom = (k: number) => poner(acercarA(actual.current, k, marco, natural, difuminado));
  const limpio = limitar(enc, marco, natural, difuminado);

  const base = listo ? medidaFoto(marco, natural, difuminado, 1) : { ancho: 0, alto: 0 };
  const fondo = listo ? rectFondo(marco, natural) : { x: 0, y: 0, ancho: 0, alto: 0 };
  const foto = entrada.foto;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Ajustar foto" data-ajustar-foto className="fixed inset-0 z-[400] flex flex-col bg-neutral-950 text-white">
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-3 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={alCancelar} className="tocable min-h-11 px-3 text-destacado text-white/85">Cancelar</button>
        <h2 className="text-destacado">Ajustar foto</h2>
        <button type="button" onClick={() => alListo({ difuminado, encuadre: limpio }, puestos.map(limitarSticker))} className="tocable min-h-11 px-3 text-destacado font-bold text-white">Listo</button>
      </div>

      <div ref={zona} className="flex min-h-0 flex-1 items-center justify-center px-4">
        <div
          ref={marcoRef}
          data-marco-historia
          tabIndex={0}
          role="group"
          aria-label="Foto de la historia. Con el teclado: flechas para mover, más y menos para acercar o alejar."
          onKeyDown={teclado}
          data-k={limpio.k.toFixed(2)}
          data-x={limpio.x.toFixed(3)}
          data-y={limpio.y.toFixed(3)}
          className="relative shrink-0 touch-none select-none overflow-hidden rounded-radio-m bg-black ring-1 ring-white/20"
          style={{ width: area.ancho, height: area.alto }}
          onPointerDown={bajar}
          onPointerMove={moverDedo}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        >
          {listo && (
            <>
              {difuminado && (
                // eslint-disable-next-line @next/next/no-img-element -- la misma foto, ampliada y desenfocada
                <img
                  src={foto}
                  alt=""
                  draggable={false}
                  data-fondo-difuminado
                  crossOrigin="anonymous"
                  className="pointer-events-none absolute max-w-none"
                  style={{ left: fondo.x, top: fondo.y, width: fondo.ancho, height: fondo.alto, filter: `blur(${Math.round(area.ancho / 22)}px)` }}
                />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- foto local del producto */}
              <img
                src={foto}
                alt="Foto del producto"
                draggable={false}
                crossOrigin="anonymous"
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: base.ancho,
                  height: base.alto,
                  left: (area.ancho - base.ancho) / 2,
                  top: (area.alto - base.alto) / 2,
                  transform: `translate3d(${limpio.x * area.ancho}px, ${limpio.y * area.alto}px, 0) scale(${limpio.k})`,
                  willChange: "transform",
                }}
              />
              {puestos.map((st) => {
                const img = imgStickers[`${st.id}|${st.texto}`];
                if (!img) return null;
                return (
                  <StickerArrastrable
                    key={st.id}
                    sticker={st}
                    imagen={img}
                    marco={marco}
                    alCambiar={(n) => setPuestos((l) => l.map((o) => (o.id === n.id ? n : o)))}
                  />
                );
              })}
              {guia && (
                // eslint-disable-next-line @next/next/no-img-element -- guía local
                <img src={guia} alt="" draggable={false} data-guia-tarjeta className="pointer-events-none absolute inset-0 h-full w-full opacity-45" />
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 rounded-t-radio-l bg-superficie px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-texto">
        <p className="text-center text-secundario text-texto-secundario">Pellizca para acercar o alejar y arrastra para mover. Con dos dedos sobre un sticker, también lo giras.</p>
        <div className="mt-2 flex min-h-14 items-center justify-between gap-3 border-t border-linea">
          <span className="text-destacado">Fondo difuminado</span>
          <Interruptor encendido={difuminado} alCambiar={cambiarFondo} etiqueta="Fondo difuminado" />
        </div>
        <Boton anchoCompleto tamano="grande" onClick={() => alListo({ difuminado, encuadre: limpio }, puestos.map(limitarSticker))}>Listo</Boton>
      </div>
    </div>,
    document.body,
  );
}

/** Un sticker sobre la foto: se arrastra con un dedo y se agranda o achica pellizcándolo. Solo `transform`. */
function StickerArrastrable({ sticker, imagen, marco, alCambiar }: {
  sticker: StickerPuesto;
  imagen: { url: string; ancho: number; alto: number };
  marco: Medida;
  alCambiar: (s: StickerPuesto) => void;
}) {
  const dedos = useRef(new Map<number, Punto>());
  const actual = useRef(sticker);
  useEffect(() => {
    actual.current = sticker;
  }, [sticker]);
  const pinza = useRef<{ k: number; d: number; r: number; a: number } | null>(null);
  const escala = marco.ancho / 1080;
  const s = limitarSticker(sticker);

  const distancia = () => {
    const [a, b] = [...dedos.current.values()];
    return Math.hypot(a!.x - b!.x, a!.y - b!.y);
  };
  /** El ángulo de la recta entre los dos dedos, en grados: al girarlos, el sticker gira lo mismo. */
  const angulo = () => {
    const [a, b] = [...dedos.current.values()];
    return (Math.atan2(b!.y - a!.y, b!.x - a!.x) * 180) / Math.PI;
  };
  return (
    // eslint-disable-next-line @next/next/no-img-element -- sticker dibujado en el teléfono
    <img
      src={imagen.url}
      alt={`Sticker ${nombreSticker(s)}: arrástralo para moverlo`}
      draggable={false}
      data-sticker={s.id}
      data-x={s.x.toFixed(3)}
      data-y={s.y.toFixed(3)}
      data-k={s.k.toFixed(2)}
      className="absolute left-0 top-0 max-w-none cursor-grab touch-none select-none"
      style={{
        width: imagen.ancho,
        height: imagen.alto,
        transform: `translate3d(${s.x * marco.ancho - imagen.ancho / 2}px, ${s.y * marco.alto - imagen.alto / 2}px, 0) rotate(${s.r}deg) scale(${escala * s.k})`,
        willChange: "transform",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        pinza.current = dedos.current.size === 2 ? { k: actual.current.k, d: distancia(), r: actual.current.r, a: angulo() } : null;
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        const antes = dedos.current.get(e.pointerId);
        if (!antes) return;
        dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (dedos.current.size >= 2 && pinza.current && pinza.current.d > 0) {
          alCambiar(limitarSticker({ ...actual.current, k: pinza.current.k * (distancia() / pinza.current.d), r: pinza.current.r + angulo() - pinza.current.a }));
        } else if (dedos.current.size === 1) {
          alCambiar(moverSticker(actual.current, e.clientX - antes.x, e.clientY - antes.y, marco));
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        dedos.current.delete(e.pointerId);
        pinza.current = null;
      }}
      onPointerCancel={(e) => {
        dedos.current.delete(e.pointerId);
        pinza.current = null;
      }}
    />
  );
}
