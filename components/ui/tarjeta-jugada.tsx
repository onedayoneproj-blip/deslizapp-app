"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { menosMovimiento } from "@/lib/movimiento";
import { IconoChevronDerecha } from "../iconos";
import { Boton } from "./boton";
import { clases, FOCO } from "./comunes";

/** Una carta del mazo: la foto de la jugada sobre su color. */
export type CartaJugada = { id: string; imagen: string; color: string };

const MANCHAS = ["rosa", "sol", "mandarina", "menta"] as const;
type Mancha = (typeof MANCHAS)[number];
/** Qué fracción de la distancia hasta el dedo recorre cada mancha (cada una a su ritmo). */
const ATRACCION: Record<Mancha, number> = { rosa: 0.55, sol: 0.4, mandarina: 0.5, menta: 0.35 };

/** Después de tocar la tarjeta, el mazo no se vuelve a barajar en esta sesión. */
const CLAVE_CARTAS = "deslizapp-jugada-cartas-vistas";
const cartasYaVistas = () => {
  try {
    return sessionStorage.getItem(CLAVE_CARTAS) === "1";
  } catch {
    return false;
  }
};

/**
 * Malla viva (docs/09 §10 y §13): cuatro manchas de color de marca que se mueven sin parar, cada una en su zona, con un velo crema a la
 * izquierda y grano encima. Al tocar o arrastrar, cada mancha se desplaza hacia el dedo a su ritmo, crece y se satura; al soltar,
 * vuelve. Con "reducir movimiento" queda quieta en su primer cuadro y no sigue el dedo. Decorativa: va detrás del contenido.
 */
export type DedoMalla = { x: number; y: number; centros: Partial<Record<Mancha, { x: number; y: number }>> };

/** Mide el centro en reposo de cada zona (offsetLeft/Top no incluyen el transform) para saber cuánto moverla hacia el dedo. */
export function centrosMalla(contenedor: HTMLElement): DedoMalla["centros"] {
  const centros: DedoMalla["centros"] = {};
  contenedor.querySelectorAll<HTMLElement>("[data-malla-zona]").forEach((el) => {
    centros[el.dataset.mallaZona as Mancha] = { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  });
  return centros;
}

export function MallaViva({ dedo }: { dedo: DedoMalla | null }) {
  return (
    <span aria-hidden="true" className="malla" data-tocando={dedo ? true : undefined}>
      {MANCHAS.map((id) => {
        const c = dedo?.centros[id];
        const transform = dedo && c ? `translate(${((dedo.x - c.x) * ATRACCION[id]).toFixed(1)}px, ${((dedo.y - c.y) * ATRACCION[id]).toFixed(1)}px) scale(1.12)` : undefined;
        return (
          <span key={id} data-malla-zona={id} className={`malla-zona malla-zona-${id}`} style={{ transform }}>
            <span className={`malla-mancha malla-mancha-${id}`} />
          </span>
        );
      })}
      <span className="malla-velo" />
      <span className="malla-grano" />
    </span>
  );
}

/**
 * Mazo de las cuatro cartas en abanico. Con `ciclo`, corre "Las tres" de 14 s (la carta del lugar 1 se asoma y saluda, el mazo se
 * recoge, se baraja y se vuelve a abrir). La carta `destacada` se pone en ese lugar para que sea la que se asoma.
 */
export function MazoJugadas({ cartas, destacada, ciclo }: { cartas: CartaJugada[]; destacada?: string | null; ciclo: boolean }) {
  const orden = [...cartas];
  const i = orden.findIndex((c) => c.id === destacada);
  if (i >= 0 && orden.length > 1) {
    const [carta] = orden.splice(i, 1);
    orden.splice(1, 0, carta!);
  }
  return (
    <span aria-hidden="true" className={clases("mazo block", ciclo && "mazo-ciclo")}>
      {orden.slice(0, 4).map((c, n) => (
        <span key={c.id} data-carta={c.id} className={`mazo-carta mazo-carta-${n}`} style={{ backgroundColor: c.color }}>
          <Image src={c.imagen} alt="" fill sizes="58px" className="object-contain" />
        </span>
      ))}
    </span>
  );
}

/**
 * Tarjeta de jugada (docs/09 §10): solo "Tu próxima jugada". Toda la tarjeta es un botón. Fondo de malla viva, "Tu próxima jugada"
 * en Caveat, el nombre de la jugada en Fredoka, una línea con quiénes y qué hacer, "Ver tus jugadas" y, a la derecha, el mazo.
 * Sin jugada: "La próxima conversación empieza aquí." y sin botón. El mazo corre su ciclo solo mientras la tarjeta se ve y deja de
 * repetirse en la sesión después de tocarla.
 */
export function TarjetaJugada({
  titulo,
  linea,
  cartas,
  destacada,
  etiqueta,
  alTocar,
  className,
}: {
  /** Nombre de la jugada destacada; null = todavía no hay jugadas. */
  titulo: string | null;
  linea?: string | null;
  cartas: CartaJugada[];
  destacada?: string | null;
  /** Nombre accesible: la jugada y la cantidad. */
  etiqueta: string;
  /** Recibe la tarjeta (para animar desde ella). */
  alTocar: (tarjeta: HTMLButtonElement) => void;
  className?: string;
}) {
  const boton = useRef<HTMLButtonElement>(null);
  const [dedo, setDedo] = useState<DedoMalla | null>(null);
  const [visible, setVisible] = useState(false);
  const [vistas, setVistas] = useState(cartasYaVistas);

  // El ciclo de las cartas corre solo mientras la tarjeta está en pantalla
  useEffect(() => {
    const el = boton.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const posicion = (e: PointerEvent<HTMLButtonElement>): DedoMalla => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, centros: dedo?.centros ?? centrosMalla(e.currentTarget) };
  };
  const seguir = !menosMovimientoSeguro();

  return (
    <button
      ref={boton}
      type="button"
      aria-label={etiqueta}
      onClick={(e) => {
        try {
          sessionStorage.setItem(CLAVE_CARTAS, "1");
        } catch {
          // Sin almacenamiento: el mazo vuelve a barajar, nada más.
        }
        setVistas(true);
        alTocar(e.currentTarget);
      }}
      onPointerDown={seguir ? (e) => setDedo(posicion(e)) : undefined}
      onPointerMove={seguir ? (e) => (dedo || e.pointerType === "mouse" ? setDedo(posicion(e)) : undefined) : undefined}
      onPointerUp={seguir ? (e) => (e.pointerType === "mouse" ? undefined : setDedo(null)) : undefined}
      onPointerCancel={() => setDedo(null)}
      onPointerLeave={() => setDedo(null)}
      className={clases(
        "tocable relative isolate block min-h-46 w-full touch-none overflow-hidden rounded-radio-l text-left text-texto select-none",
        FOCO,
        className,
      )}
    >
      <MallaViva dedo={dedo} />
      <span className="relative z-3 flex w-[calc(100%-10.75rem)] flex-col gap-1 py-4 pl-4.5">
        <span className="font-mano text-mano whitespace-nowrap text-atencion-texto">Tu próxima jugada</span>
        <span className="font-display text-titulo-hoja">{titulo ?? "La próxima conversación empieza aquí."}</span>
        {titulo && linea && <span className="text-secundario font-semibold text-texto-secundario">{linea}</span>}
        {titulo && (
          <Boton soloVista tamano="compacto" className="mt-2 self-start">
            Ver tus jugadas
            <IconoChevronDerecha tamano={16} strokeWidth={2.6} />
          </Boton>
        )}
      </span>
      <span className="absolute top-1/2 right-2.5 z-3 -mt-15.5">
        <MazoJugadas cartas={cartas} destacada={destacada} ciclo={visible && !vistas} />
      </span>
    </button>
  );
}

function menosMovimientoSeguro() {
  try {
    return menosMovimiento();
  } catch {
    return false;
  }
}
