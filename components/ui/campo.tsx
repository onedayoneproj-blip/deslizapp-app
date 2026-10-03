"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { IconoBuscar } from "../iconos";
import { clases } from "./comunes";

const FOCO_CAMPO = "focus:border-accion focus:outline-3 focus:outline-offset-1 focus:outline-foco";

/**
 * Campo de texto (docs/09, Campo.md): rótulo siempre visible arriba, ayuda o error abajo (aria-describedby, aria-invalid).
 * Alto 50, `radio-m`, contorno 1.5 px `borde-campo` (3:1: se ve dónde escribir), letra 16 (iOS no hace zoom).
 * El teclado según el dato va en los atributos (inputMode="numeric", type="tel"…).
 */
export function Campo({
  etiqueta,
  ayuda,
  error,
  id,
  className,
  ...input
}: Omit<ComponentProps<"input">, "className"> & { etiqueta: ReactNode; ayuda?: ReactNode; error?: ReactNode; className?: string }) {
  const propio = useId();
  const idCampo = id ?? propio;
  const idNota = `${idCampo}-nota`;
  const nota = error ?? ayuda;
  return (
    <div className={clases("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={idCampo} className="text-secundario font-extrabold text-texto">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={nota ? idNota : undefined}
        className={clases(
          "h-(--alto-campo) w-full min-w-0 rounded-radio-m border-[1.5px] bg-superficie px-3.5 text-cuerpo text-texto placeholder:text-texto-secundario disabled:opacity-40",
          FOCO_CAMPO,
          error ? "border-peligro" : "border-borde-campo",
        )}
      />
      {nota && (
        <p id={idNota} className={clases("text-secundario", error ? "font-bold text-peligro" : "text-texto-secundario")}>
          {nota}
        </p>
      )}
    </div>
  );
}

/** Buscador: píldora de 50 px con lupa y contorno `borde-pastilla`. Solo para filtrar listas. */
export function Buscador({
  valor,
  alCambiar,
  placeholder,
  etiqueta,
  className,
}: {
  valor: string;
  alCambiar: (v: string) => void;
  placeholder?: string;
  /** Qué se busca (para lectores de pantalla). */
  etiqueta: string;
  className?: string;
}) {
  return (
    <label
      className={clases(
        "flex h-(--alto-campo) items-center gap-2.5 rounded-full border-[1.5px] border-borde-pastilla bg-superficie px-4.5 text-texto-secundario has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-foco",
        className,
      )}
    >
      <IconoBuscar tamano={20} strokeWidth={2.2} className="shrink-0" />
      <span className="sr-only">{etiqueta}</span>
      <input
        type="search"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-cuerpo text-texto outline-none placeholder:text-texto-secundario"
      />
    </label>
  );
}
