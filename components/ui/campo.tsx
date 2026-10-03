"use client";

import { useId, type ComponentProps, type ReactNode, type Ref } from "react";
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

/** Lo escrito en un monto, solo dígitos: sin comas, decimales ni negativos, sin ceros a la izquierda, hasta 8 cifras. */
export const soloDigitos = (texto: string) => texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 8);

/**
 * Campo de monto en pesos enteros: rótulo arriba, "RD$" y el número grande con comas de miles. Teclado numérico. `valor` y
 * `alCambiar` van en dígitos ("1500"). `tamano`: "normal" (titulo-hoja) o "grande" (cifra, para el monto protagonista de una hoja).
 */
export function CampoMonto({
  etiqueta,
  etiquetaAccesible,
  valor,
  alCambiar,
  ayuda,
  error,
  tamano = "normal",
  className,
}: {
  etiqueta: ReactNode;
  /** Nombre accesible del <input> si debe decir más que el rótulo ("…, en pesos"). */
  etiquetaAccesible?: string;
  valor: string;
  alCambiar: (digitos: string) => void;
  ayuda?: ReactNode;
  error?: ReactNode;
  tamano?: "normal" | "grande";
  className?: string;
}) {
  const id = useId();
  const nota = error ?? ayuda;
  return (
    <div className={clases("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={clases(
          "block rounded-radio-l border-[1.5px] bg-superficie px-4 py-2.5 focus-within:border-accion focus-within:outline-3 focus-within:outline-offset-1 focus-within:outline-foco",
          error ? "border-peligro" : "border-borde-campo",
        )}
      >
        <span className="block text-secundario text-texto-secundario">{etiqueta}</span>
        <span className="flex items-baseline gap-1.5">
          <span className={clases("font-display text-texto-secundario", tamano === "grande" ? "text-titulo-hoja" : "text-titulo-seccion")}>RD$</span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0"
            value={valor === "" ? "" : Number(valor).toLocaleString("en-US")}
            onChange={(e) => alCambiar(soloDigitos(e.target.value))}
            aria-label={etiquetaAccesible}
            aria-invalid={error ? true : undefined}
            aria-describedby={nota ? `${id}-nota` : undefined}
            className={clases(
              "min-w-0 flex-1 bg-transparent font-display text-texto outline-none placeholder:text-borde-campo",
              tamano === "grande" ? "text-cifra" : "text-titulo-hoja",
            )}
          />
        </span>
      </label>
      {nota && (
        <p id={`${id}-nota`} className={clases("text-secundario", error ? "font-bold text-peligro" : "text-texto-secundario")}>
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
  entrada,
  className,
}: {
  valor: string;
  alCambiar: (v: string) => void;
  placeholder?: string;
  /** Qué se busca (para lectores de pantalla). */
  etiqueta: string;
  /** Referencia al <input>: quien abre el buscador en un toque lo enfoca ahí mismo (regla del teclado de iPhone, HANDOFF.md). */
  entrada?: Ref<HTMLInputElement>;
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
        ref={entrada}
        type="search"
        autoComplete="off"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-cuerpo text-texto outline-none placeholder:text-texto-secundario"
      />
    </label>
  );
}
