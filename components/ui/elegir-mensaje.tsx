"use client";

import { useState } from "react";
import { Hoja } from "../hoja";
import { IconoChevronAbajo } from "../iconos";
import { clases, FOCO, TOQUE_44 } from "./comunes";
import { GrupoOpciones } from "./opcion";

/** Un mensaje para elegir: el nombre corto (va en el botón) y el texto completo (va en la hoja). */
export type MensajeElegible<T extends string> = { id: T; titulo: string; texto: string };

/**
 * Elegir el mensaje (el patrón del recordatorio de cobro): un botón compacto con el nombre del mensaje elegido y un chevron hacia abajo
 * que abre la hoja "Elige el mensaje" con las opciones detalladas (GrupoOpciones). Al elegir, la hoja se cierra sola.
 */
export function ElegirMensaje<T extends string>({
  opciones,
  elegido,
  alElegir,
  etiqueta = "Mensaje",
  className,
}: {
  opciones: MensajeElegible<T>[];
  elegido: T;
  alElegir: (id: T) => void;
  /** Qué se elige (para el nombre accesible del grupo). */
  etiqueta?: string;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const actual = opciones.find((o) => o.id === elegido) ?? opciones[0];
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Cambiar el mensaje. Ahora: ${actual?.titulo ?? ""}`}
        className={clases(
          "tocable relative flex h-(--alto-compacto) shrink-0 items-center gap-1 rounded-full bg-superficie px-3 text-secundario font-extrabold whitespace-nowrap text-texto",
          TOQUE_44,
          FOCO,
          className,
        )}
      >
        {actual?.titulo}
        <IconoChevronAbajo tamano={18} strokeWidth={2.2} />
      </button>
      <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} titulo="Elige el mensaje">
        <GrupoOpciones
          etiqueta={etiqueta}
          valor={elegido}
          alCambiar={(id) => {
            alElegir(id);
            setAbierta(false);
          }}
          opciones={opciones.map((o) => ({ id: o.id, texto: o.titulo, descripcion: o.texto }))}
        />
      </Hoja>
    </>
  );
}
