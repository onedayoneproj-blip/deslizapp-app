"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Hoja } from "../hoja";
import { Boton } from "./boton";
import { clases, FOCO } from "./comunes";
import { Etiqueta } from "./etiqueta";
import { MallaViva } from "./tarjeta-jugada";

/**
 * Función en preparación (docs/09 §10): la tarjeta que ocupa el lugar de una función que todavía no se enciende. Mismo tamaño mínimo y
 * radio que la tarjeta de jugada, con la malla viva más lenta y apagada bajo un velo `fondo` ("detrás del cristal"), sin mazo ni botón.
 * Arriba a la izquierda la pastilla "Próximamente"; luego el texto de voz en Caveat, el nombre en Fredoka y una línea. Toda la tarjeta
 * es un botón que abre la hoja (`HojaProximamente`). Con "reducir movimiento" la malla queda quieta.
 */
export function TarjetaProximamente({
  voz,
  titulo,
  linea,
  etiqueta,
  alTocar,
  className,
}: {
  /** Texto en Caveat ("Tu próxima jugada"). */
  voz: string;
  titulo: string;
  linea: string;
  /** Nombre accesible. */
  etiqueta: string;
  alTocar: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={alTocar}
      className={clases("tocable relative isolate block min-h-46 w-full overflow-hidden rounded-radio-l text-left text-texto select-none", FOCO, className)}
    >
      <span aria-hidden="true" className="malla-apagada absolute inset-0">
        <MallaViva dedo={null} />
      </span>
      <span className="relative z-3 flex max-w-76 flex-col items-start gap-1 py-4 pr-4.5 pl-4.5">
        <Etiqueta tono="atencion" className="mb-1.5">
          Próximamente
        </Etiqueta>
        <span className="font-mano text-mano text-atencion-texto">{voz}</span>
        <span className="font-display text-titulo-hoja">{titulo}</span>
        <span className="text-secundario font-semibold text-texto-secundario">{linea}</span>
      </span>
    </button>
  );
}

/**
 * La hoja de una función en preparación: arriba la malla suave con una ilustración, "Muy pronto" en Caveat, el nombre en Fredoka, el
 * texto y un solo botón que cierra. No pide ni guarda nada.
 */
export function HojaProximamente({
  abierta,
  alCerrar,
  titulo,
  imagen,
  voz = "Muy pronto",
  boton = "Listo, a esperar",
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  /** Una ilustración de public/ilustraciones (cuadrada). */
  imagen: string;
  voz?: string;
  boton?: string;
  /** Los párrafos. */
  children: ReactNode;
}) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo} tituloOculto>
      <div className="flex flex-col gap-4">
        <div aria-hidden="true" className="relative isolate h-44 overflow-hidden rounded-radio-l">
          <span className="malla-apagada absolute inset-0">
            <MallaViva dedo={null} />
          </span>
          <Image src={imagen} alt="" width={180} height={180} sizes="160px" className="relative z-3 mx-auto size-40 object-contain" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-mano text-mano text-atencion-texto">{voz}</p>
          <p aria-hidden="true" className="font-display text-titulo-hoja text-texto">
            {titulo}
          </p>
        </div>
        <div className="flex flex-col gap-3 text-cuerpo text-texto">{children}</div>
        <Boton tamano="grande" anchoCompleto onClick={alCerrar} className="mt-2">
          {boton}
        </Boton>
      </div>
    </Hoja>
  );
}
