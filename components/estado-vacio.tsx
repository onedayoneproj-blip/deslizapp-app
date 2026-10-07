import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Ilustraciones de estados vacíos (public/ilustraciones/*.webp, originales en referencias/ilustraciones/). */
const ILUSTRACIONES = {
  pedidos: { alto: 530 },
  inicio: { alto: 536 },
  promos: { alto: 494 },
  clientes: { alto: 543 },
  catalogo: { alto: 516 },
} as const;
const ANCHO_ORIGINAL = 600;

export type Ilustracion = keyof typeof ILUSTRACIONES;

/**
 * Estado vacío con tono de marca: ilustración (decorativa, sin animación) + título corto en Fredoka
 * + texto en Figtree (+ botón Mandarina si aplica). `pequeno` es para búsquedas y filtros sin
 * resultados: la misma ilustración de la sección, más chica y con menos aire.
 */
export function EstadoVacio({
  ilustracion,
  titulo,
  remate,
  nota,
  accion,
  pequeno = false,
}: {
  ilustracion: Ilustracion;
  titulo: string;
  remate: ReactNode;
  /** Nota a mano (Caveat, Mandarina), opcional. */
  nota?: string;
  /** Botón Mandarina, opcional. */
  accion?: { texto: string; href: string; /** Esta cuenta no puede: se ve apagado y, al tocarlo, explica por qué. */ bloqueado?: { motivo: string; alTocar: () => void } };
  pequeno?: boolean;
}) {
  const ancho = pequeno ? 120 : 210;
  const alto = Math.round((ancho * ILUSTRACIONES[ilustracion].alto) / ANCHO_ORIGINAL);
  return (
    <div className={`flex flex-col items-center px-6 text-center ${pequeno ? "py-6" : "pt-8 pb-6"}`}>
      {/* Con ancho y alto definidos el espacio queda reservado: no salta el diseño al cargar. */}
      <Image
        src={`/ilustraciones/${ilustracion}.webp`}
        alt=""
        width={ancho}
        height={alto}
        unoptimized
        className="mb-4 select-none"
        draggable={false}
      />
      <h2 className={`font-display text-texto ${pequeno ? "text-titulo-seccion" : "text-titulo-hoja"}`}>{titulo}</h2>
      <p className={`mt-2 max-w-xs text-texto-secundario ${pequeno ? "text-secundario" : "text-cuerpo"}`}>{remate}</p>
      {nota && <p className="mt-3 font-mano text-mano text-atencion-texto -rotate-2">{nota}</p>}
      {accion?.bloqueado && (
        <button
          type="button"
          aria-disabled="true"
          data-sin-permiso=""
          onClick={accion.bloqueado.alTocar}
          className="tocable mt-5 flex h-[52px] items-center rounded-full bg-resalte px-6 text-cuerpo font-extrabold text-sobre-resalte opacity-40 outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          {accion.texto}
        </button>
      )}
      {accion && !accion.bloqueado && (
        <Link
          href={accion.href}
          scroll={false}
          className="tocable mt-5 flex h-[52px] items-center rounded-full bg-resalte px-6 text-cuerpo font-extrabold text-sobre-resalte outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          {accion.texto}
        </Link>
      )}
    </div>
  );
}
