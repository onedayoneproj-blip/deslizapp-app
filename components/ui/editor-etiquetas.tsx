"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { IconoCerrar, IconoMas } from "../iconos";
import { clases, FOCO } from "./comunes";
import { Opcion } from "./opcion";

const PILDORA = "inline-flex h-(--alto-compacto) shrink-0 items-center rounded-full text-secundario font-extrabold";

/** Quita espacios de más y compara sin mayúsculas ni tildes (para no repetir "Rosa" y "rosa"). */
const clave = (s: string) => s.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Editor de etiquetas (docs/09 §6): una lista corta de textos que se guarda (los valores de una opción, las notas de un perfume).
 * Cada valor es una pastilla `superficie` con su × para quitarlo; al final, "+ Agregar" (contorno punteado) abre el campo: se
 * escribe y Enter (o coma) lo agrega. Sin repetir, hasta `maximo`. Debajo del campo, las `sugerencias` que coinciden con lo
 * escrito (en `superficie-hundida`, se agregan con un toque).
 *
 * Con `permitidos`, no hay texto libre: cada valor permitido es una opción para tocar (casilla), como "Ideal para".
 */
export function EditorEtiquetas({
  etiqueta,
  valores,
  alCambiar,
  sugerencias = [],
  permitidos,
  maximo = 12,
  largoMaximo = 40,
  placeholder = "Escribe y toca Enter",
  error,
  rotuloVisible = true,
}: {
  /** El rótulo ("Valores", "Salida"). */
  etiqueta: string;
  valores: string[];
  alCambiar: (valores: string[]) => void;
  /** Textos para proponer mientras se escribe (los que la tienda ya usó). */
  sugerencias?: readonly string[];
  /** Solo estos valores, para tocar (sin escribir). */
  permitidos?: readonly string[];
  maximo?: number;
  largoMaximo?: number;
  placeholder?: string;
  error?: string | null;
  rotuloVisible?: boolean;
}) {
  const id = useId();
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const lleno = valores.length >= maximo;
  const usados = new Set(valores.map(clave));

  const agregar = (bruto: string) => {
    const limpio = bruto.trim().replace(/\s+/g, " ").slice(0, largoMaximo);
    if (!limpio || lleno || usados.has(clave(limpio))) return false;
    alCambiar([...valores, limpio]);
    return true;
  };
  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (agregar(texto)) setTexto("");
    } else if (e.key === "Backspace" && texto === "" && valores.length > 0) {
      alCambiar(valores.slice(0, -1));
    } else if (e.key === "Escape") {
      setEscribiendo(false);
    }
  };
  const quitar = (v: string) => alCambiar(valores.filter((x) => x !== v));

  const nota = error ? (
    <p id={`${id}-nota`} className="text-secundario font-bold text-peligro">
      {error}
    </p>
  ) : null;

  if (permitidos) {
    return (
      <div className="flex flex-col gap-2">
        <p id={id} className={rotuloVisible ? "text-destacado text-texto" : "sr-only"}>
          {etiqueta}
        </p>
        <div role="group" aria-labelledby={id} aria-describedby={error ? `${id}-nota` : undefined} className="flex flex-wrap gap-2">
          {permitidos.map((p) => {
            const elegido = valores.includes(p);
            return (
              <Opcion key={p} casilla elegida={elegido} deshabilitada={!elegido && lleno} onClick={() => alCambiar(elegido ? valores.filter((v) => v !== p) : [...valores, p])}>
                {p}
              </Opcion>
            );
          })}
        </div>
        {nota}
      </div>
    );
  }

  const coinciden = texto.trim()
    ? sugerencias.filter((s) => !usados.has(clave(s)) && clave(s).includes(clave(texto))).slice(0, 6)
    : sugerencias.filter((s) => !usados.has(clave(s))).slice(0, 6);

  return (
    <div className="flex flex-col gap-2">
      <p id={id} className={rotuloVisible ? "text-destacado text-texto" : "sr-only"}>
        {etiqueta}
      </p>
      <ul aria-labelledby={id} className="flex flex-wrap gap-2">
        {valores.map((v) => (
          <li key={v} className={clases(PILDORA, "gap-1 border-[1.5px] border-borde-pastilla bg-superficie pl-3.5 text-texto")}>
            {v}
            <button
              type="button"
              aria-label={`Quitar ${v}`}
              onClick={() => quitar(v)}
              className={clases("tocable relative grid size-7 place-items-center rounded-full text-texto-secundario after:absolute after:-inset-2 after:content-['']", FOCO)}
            >
              <IconoCerrar tamano={14} strokeWidth={2.6} />
            </button>
          </li>
        ))}
        {!escribiendo && !lleno && (
          <li>
            <button
              type="button"
              onClick={() => {
                setEscribiendo(true);
                // El foco dentro del mismo toque: así iOS abre el teclado.
                requestAnimationFrame(() => entrada.current?.focus());
              }}
              className={clases(PILDORA, "tocable relative gap-1 border-[1.5px] border-dashed border-borde-pastilla px-3.5 text-texto-secundario before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']", FOCO)}
            >
              <IconoMas tamano={14} strokeWidth={2.6} />
              Agregar
            </button>
          </li>
        )}
      </ul>
      {escribiendo && !lleno && (
        <input
          ref={entrada}
          autoFocus
          type="text"
          enterKeyHint="done"
          autoComplete="off"
          aria-label={`Agregar a ${etiqueta}`}
          aria-describedby={error ? `${id}-nota` : undefined}
          aria-invalid={error ? true : undefined}
          value={texto}
          maxLength={largoMaximo}
          placeholder={placeholder}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={alTeclear}
          onBlur={() => {
            // Lo escrito no se pierde al salir del campo.
            if (agregar(texto)) setTexto("");
            if (!texto.trim()) setEscribiendo(false);
          }}
          className={clases(
            "h-(--alto-campo) w-full min-w-0 rounded-radio-m border-2 bg-superficie px-3.5 text-cuerpo text-texto outline-none placeholder:text-texto-secundario",
            error ? "border-peligro" : "border-borde-campo focus:border-accion",
          )}
        />
      )}
      {escribiendo && coinciden.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Sugerencias">
          {coinciden.map((s) => (
            <button
              key={s}
              type="button"
              // Antes que el blur del campo: la sugerencia se agrega y el campo sigue abierto.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (agregar(s)) setTexto("");
                entrada.current?.focus();
              }}
              className={clases(PILDORA, "tocable relative bg-superficie-hundida px-3.5 text-texto before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']", FOCO)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {lleno && <p className="text-secundario text-texto-secundario">Llegaste a {maximo}. Quita uno para agregar otro.</p>}
      {nota}
    </div>
  );
}
