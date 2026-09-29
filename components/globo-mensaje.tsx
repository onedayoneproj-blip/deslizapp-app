"use client";

import type { Ref } from "react";

/** Hora en formato 12 h para el globo: "1:18 p. m.". */
export function horaGlobo(fecha = new Date()): string {
  return new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit", hour12: true }).format(fecha).replace(/ | /g, " ");
}

/** Parte el texto en tramos normales y enlaces (http/https) para pintar estos en azul y subrayados. */
function conEnlaces(texto: string) {
  return texto.split(/(https?:\/\/\S+)/g).map((t, i) =>
    i % 2 ? (
      <span key={i} className="text-[#027EB5] underline">
        {t}
      </span>
    ) : (
      t
    ),
  );
}

const TEXTO = "px-[9px] pt-[6px] pb-[8px] text-[15.5px] leading-[1.35] font-normal tracking-normal";

/**
 * Globo de mensaje enviado, como en un chat (sin el papel tapiz ni nada de la marca WhatsApp): panel beige liso
 * con el globo verde claro a la derecha, su colita, la hora y los dos checks azules (SVG propio).
 * Muestra el mensaje completo. Con `editando`, un textarea transparente se pone sobre el mismo texto
 * (que sigue dando el alto, así el globo crece solo) y hereda tipografía y fondo. El cambio es instantáneo.
 * El foco lo pone quien lo abre, dentro del mismo toque (`alEditar`, ver HANDOFF.md).
 */
export function GloboMensaje({
  texto,
  hora,
  editando,
  alCambiar,
  alEditar,
  campoRef,
}: {
  texto: string;
  hora: string;
  editando: boolean;
  alCambiar: (t: string) => void;
  /** Toque en el globo (fuera de edición). */
  alEditar?: () => void;
  campoRef?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <div data-panel-chat className="rounded-[18px] bg-[#EFE7DC] p-4">
      <div
        data-globo
        onClick={editando ? undefined : alEditar}
        className={`relative ml-auto w-fit max-w-[85%] rounded-[12px] rounded-tr-[2px] bg-[#D9FDD3] text-[#111B21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] ${editando ? "" : "cursor-text"}`}
      >
        {/* Colita: mismo color que el globo, sin borde */}
        <svg aria-hidden="true" width="8" height="12" viewBox="0 0 8 12" className="absolute top-0 -right-[7px] text-[#D9FDD3]">
          <path d="M0 0h8L0 12z" fill="currentColor" />
        </svg>
        <div data-globo-texto className={`${TEXTO} break-words whitespace-pre-wrap ${editando ? "text-transparent [&_span]:!text-transparent [&_span]:decoration-transparent" : ""}`}>
          {conEnlaces(texto)}
          {/* Deja sitio a la hora en la última línea; el ZWSP mantiene una línea final vacía */}
          {"​"}
          <span className="inline-block h-px w-[74px] align-baseline" />
        </div>
        {editando && (
          <textarea
            ref={campoRef}
            aria-label="Mensaje"
            value={texto}
            onChange={(e) => alCambiar(e.target.value)}
            spellCheck={false}
            className={`${TEXTO} absolute inset-0 block h-full w-full resize-none overflow-hidden border-0 bg-transparent font-[inherit] text-[#111B21] caret-[#027EB5] outline-none`}
          />
        )}
        <span className="pointer-events-none absolute right-[8px] bottom-[4px] flex items-center gap-[3px] text-[11.5px] leading-none text-[#5B6C76]">
          {hora}
          <svg aria-hidden="true" width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="#53BDEB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 6l3 3 6.5-7.5" />
            <path d="M6 8.6l1 .9L14 1.5" />
          </svg>
        </span>
      </div>
    </div>
  );
}
