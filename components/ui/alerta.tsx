"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Boton } from "./boton";

const sinSuscripcion = () => () => {};

/**
 * Alerta (docs/09 §8): confirma algo que no se puede deshacer o que pierde datos. Tarjeta centrada sobre `velo`, título en
 * pregunta, una línea con la consecuencia concreta y dos botones: Cancelar (secundario, izquierda) y la acción (derecha):
 * `peligro` relleno si destruye, `accion` si solo confirma. Si no caben, uno debajo del otro con la acción arriba.
 * Escape y tocar fuera = Cancelar. role="alertdialog", atrapa el foco y lo devuelve al cerrar. El foco empieza en Cancelar.
 */
export function Alerta({
  abierta,
  titulo,
  descripcion,
  accion,
  alCancelar,
  textoCancelar = "Cancelar",
}: {
  abierta: boolean;
  titulo: string;
  descripcion?: string;
  accion: { texto: string; tono: "peligro" | "accion"; alConfirmar: () => void | Promise<void> };
  alCancelar: () => void;
  textoCancelar?: string;
}) {
  const enNavegador = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (!abierta || !enNavegador) return null;
  return createPortal(
    <Contenido titulo={titulo} descripcion={descripcion} accion={accion} alCancelar={alCancelar} textoCancelar={textoCancelar} />,
    document.body,
  );
}

function Contenido({
  titulo,
  descripcion,
  accion,
  alCancelar,
  textoCancelar,
}: {
  titulo: string;
  descripcion?: string;
  accion: { texto: string; tono: "peligro" | "accion"; alConfirmar: () => void | Promise<void> };
  alCancelar: () => void;
  textoCancelar: string;
}) {
  const idTitulo = useId();
  const idTexto = useId();
  const caja = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef(alCancelar);
  useEffect(() => {
    cancelarRef.current = alCancelar;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    caja.current?.querySelector<HTMLElement>("[data-cancelar]")?.focus({ preventScroll: true });
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cancelarRef.current();
      } else if (e.key === "Tab" && caja.current) {
        const botones = [...caja.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")];
        const primero = botones[0];
        const ultimo = botones[botones.length - 1];
        if (!primero || !ultimo) return;
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        } else if (!caja.current.contains(document.activeElement)) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    // En captura: la Alerta manda sobre cualquier hoja que esté debajo
    window.addEventListener("keydown", alTeclear, true);
    return () => {
      window.removeEventListener("keydown", alTeclear, true);
      if (previo && document.contains(previo)) previo.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center px-6" role="presentation">
      <div aria-hidden="true" onClick={alCancelar} className="mov-aparece absolute inset-0 bg-velo" />
      <div
        ref={caja}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descripcion ? idTexto : undefined}
        className="mov-aparece relative flex w-full max-w-75 flex-col gap-2 rounded-radio-xl bg-superficie px-5 pt-5.5 pb-4.5 text-texto shadow-hoja"
      >
        <h2 id={idTitulo} className="font-display text-titulo-hoja">
          {titulo}
        </h2>
        {descripcion && (
          <p id={idTexto} className="text-cuerpo text-texto-secundario">
            {descripcion}
          </p>
        )}
        {/* wrap-reverse: si no caben lado a lado, la acción queda arriba */}
        <div className="mt-2 flex flex-wrap-reverse gap-3">
          <Boton jerarquia="secundario" data-cancelar onClick={alCancelar} className="min-w-28 flex-1">
            {textoCancelar}
          </Boton>
          <Boton
            jerarquia={accion.tono === "peligro" ? "peligro" : "principal"}
            relleno={accion.tono === "peligro"}
            onClick={accion.alConfirmar}
            className="min-w-28 flex-1"
          >
            {accion.texto}
          </Boton>
        </div>
      </div>
    </div>
  );
}
