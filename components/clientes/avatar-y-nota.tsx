"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { COLORES_AVATAR, EMOJIS_AVATAR, hexDeColor, type ColorAvatar } from "@/lib/avatar-cliente";
import { MAX_NOTA } from "@/lib/data/clientes";
import { iniciales } from "@/lib/formato";
import { Hoja } from "../hoja";
import { IconoCheck, IconoChispa, IconoEditar, IconoMas } from "../iconos";
import { Avatar, Boton } from "../ui";
import { useTonoDeEmoji } from "../ui/avatar";

/** Forma de la nota de Instagram: gotita pegada abajo-izquierda y un puntito suelto (referencias/cliente-nuevo-nota). */
function ColaDeNota({ ancho = 36, alto = 34, className }: { ancho?: number; alto?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={ancho} height={alto} viewBox="0 0 36 34" className={className}>
      <path d="M0 0H36V10Q27 10 24 16.5A8 8 0 0 1 8.5 15.5Q6 10 0 10Z" fill="currentColor" />
      <circle cx="23" cy="28.5" r="4.8" fill="currentColor" />
    </svg>
  );
}

/** Sin nota, en el detalle del cliente: la misma forma, tenue y con línea punteada: «Agregar nota». */
function BurbujaAgregarNota({ onClick, etiqueta, className }: { onClick: () => void; etiqueta?: string; className?: string }) {
  return (
    <div className={`z-20 ${className ?? ""}`}>
      <div className="relative w-max text-texto-secundario">
        <button
          type="button"
          onClick={onClick}
          aria-label={etiqueta ?? "Agregar nota"}
          className="tocable block rounded-[26px] border-2 border-dashed border-borde-campo px-4 py-2.5 text-center text-secundario leading-tight outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Agregar nota
        </button>
        {/* Gotita y puntito, también punteados */}
        <svg aria-hidden="true" width="36" height="34" viewBox="0 0 36 34" className="absolute top-[calc(100%-1px)] left-5.5 overflow-visible">
          <circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="23" cy="26" r="3.6" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      </div>
    </div>
  );
}

/** Burbuja de la nota (píldora muy redondeada, sombra única, fondo `superficie`) con su cola. `onClick`: la burbuja es un botón. */
export function BurbujaNota({ nota, onClick, etiqueta, className }: { nota: string; onClick?: () => void; etiqueta?: string; className?: string }) {
  if (!nota && onClick) return <BurbujaAgregarNota onClick={onClick} etiqueta={etiqueta} className={className} />;
  const contenido = nota ? (
    <span className="line-clamp-3 break-words text-secundario font-semibold text-texto">{nota}</span>
  ) : (
    <span className="text-secundario text-texto-secundario">Talla, gustos…</span>
  );
  return (
    <div className={`z-20 ${className ?? ""}`}>
      <div className="relative w-max max-w-[170px] text-superficie [filter:drop-shadow(0_5px_12px_rgb(23_75_58/0.16))]">
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={etiqueta} className="tocable block min-w-28 rounded-[26px] bg-superficie px-5 py-3 text-center leading-tight outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco">
          {contenido}
        </button>
      ) : (
        <div className="min-w-28 rounded-[26px] bg-superficie px-5 py-3 text-center leading-tight">{contenido}</div>
      )}
      <ColaDeNota className="absolute top-[calc(100%-10px)] left-5.5" />
      </div>
    </div>
  );
}

/**
 * Con el teclado abierto, si «Guardar cliente» quedó bajo el teclado, sube el contenido lo que haga falta para verlo SIN esconder la
 * burbuja bajo el encabezado. Espera a que la hoja termine de acomodar el campo enfocado (350 ms) y mide con `visualViewport`.
 */
function verBotonGuardar(campo: HTMLTextAreaElement | null) {
  window.setTimeout(() => {
    const vv = window.visualViewport;
    const contenido = campo?.closest<HTMLElement>("[data-hoja-contenido]");
    const boton = contenido?.querySelector<HTMLElement>("[data-guardar]");
    if (!campo || !vv || !contenido || !boton || document.activeElement !== campo) return;
    const falta = boton.getBoundingClientRect().bottom - (vv.offsetTop + vv.height - 12);
    const holgura = campo.getBoundingClientRect().top - (contenido.getBoundingClientRect().top + 88);
    if (falta > 0 && holgura > 0) contenido.scrollBy({ top: Math.min(falta, holgura), behavior: "smooth" });
  }, 400);
}

/** Líneas que muestra la burbuja de la nota antes de desplazarse por dentro. */
const LINEAS_NOTA = 3;

/**
 * La burbuja de la nota ES el campo (como la nota de Instagram): tocarla pone el cursor dentro y se escribe ahí mismo, sin otra hoja ni
 * otra vista. Crece en alto con el texto (máx. 3 líneas, luego se desplaza por dentro) hacia ARRIBA, para que el avatar no se mueva. Sin
 * saltos de línea: Enter cierra el teclado (`enterkeyhint="done"`). El contador «Solo tú la ves · N/60» sale discreto mientras se escribe.
 */
function BurbujaEscribible({ id, valor, alCambiar, alEnfocar }: { id?: string; valor: string; alCambiar: (v: string) => void; alEnfocar: (enfocado: boolean) => void }) {
  const campo = useRef<HTMLTextAreaElement>(null);
  // Alto según el contenido (hasta LINEAS_NOTA líneas)
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    const linea = parseFloat(getComputedStyle(el).lineHeight) || 19;
    el.style.height = `${Math.min(el.scrollHeight, linea * LINEAS_NOTA)}px`;
  }, [valor]);
  return (
    <div className="absolute bottom-[108px] left-[30px] z-20">
      <div className="relative w-[150px] text-superficie [filter:drop-shadow(0_5px_12px_rgb(23_75_58/0.16))]">
        <label className="block rounded-[26px] bg-superficie px-4 py-3">
          <span className="sr-only">Nota del cliente</span>
          <textarea
            ref={campo}
            id={id}
            rows={1}
            value={valor}
            maxLength={MAX_NOTA}
            placeholder="Talla, gustos…"
            enterKeyHint="done"
            autoComplete="off"
            onFocus={() => {
              alEnfocar(true);
              verBotonGuardar(campo.current);
            }}
            onBlur={() => alEnfocar(false)}
            onChange={(e) => alCambiar(e.target.value.replace(/\s*\n\s*/g, " ").slice(0, MAX_NOTA))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="block w-full resize-none overflow-y-auto bg-transparent text-center text-[16px] leading-[1.25] font-semibold text-texto outline-none placeholder:font-normal placeholder:text-texto-secundario"
          />
        </label>
        <ColaDeNota className="absolute top-[calc(100%-10px)] left-5.5" />
      </div>
    </div>
  );
}

/**
 * Arriba de "Cliente nuevo" y "Editar cliente": la burbuja de la nota (un campo, se escribe ahí mismo) sobre el avatar grande (112 px,
 * con la muesca del botón "+" / lápiz). Tocar el avatar abre "Su avatar". Solo emoji, nunca fotos.
 */
export function AvatarYNota({
  nombre,
  nota,
  emoji,
  color,
  idNota,
  alCambiarNota,
  alAbrirAvatar,
}: {
  nombre: string;
  nota: string;
  emoji: string | null;
  color: ColorAvatar | null;
  /** id del campo de la nota (para enfocarlo desde el detalle del cliente en el mismo toque). */
  idNota?: string;
  alCambiarNota: (nota: string) => void;
  alAbrirAvatar: () => void;
}) {
  const hayAvatar = emoji !== null || color !== null;
  const [enfocada, setEnfocada] = useState(false);
  return (
    <div>
    <div className="relative mx-auto mt-3 h-[192px] w-60">
      <BurbujaEscribible id={idNota} valor={nota} alCambiar={alCambiarNota} alEnfocar={setEnfocada} />
      <button
        type="button"
        onClick={alAbrirAvatar}
        aria-label={hayAvatar ? "Cambiar avatar" : "Elegir avatar"}
        className="tocable absolute top-[80px] left-16 size-28 rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <span className="block [mask:radial-gradient(circle_21px_at_93px_93px,transparent_20.5px,#000_21px)]">
          {nombre.trim() === "" && !hayAvatar ? (
            // Sin nombre todavía: círculo crema con una carita (nada de «?»)
            <span className="grid size-28 place-items-center rounded-full text-texto" style={{ backgroundColor: hexDeColor("crema") ?? undefined }}>
              <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14.5c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
                <circle cx="9" cy="10" r=".6" fill="currentColor" />
                <circle cx="15" cy="10" r=".6" fill="currentColor" />
              </svg>
            </span>
          ) : (
            <Avatar nombre={nombre} tamano="perfil" emoji={emoji} color={color} />
          )}
        </span>
        <span className="absolute top-[76px] left-[76px] grid size-8.5 place-items-center rounded-full bg-accion text-sobre-accion">
          {hayAvatar ? <IconoEditar tamano={16} strokeWidth={2.4} /> : <IconoMas tamano={16} strokeWidth={3} />}
        </span>
      </button>
    </div>
      {/* Lugar fijo (no mueve nada al aparecer): discreto, solo mientras se escribe */}
      <p aria-live="polite" className="mt-1 h-5 text-center text-etiqueta font-normal text-texto-secundario">
        {enfocada ? `Solo tú la ves · ${nota.length}/${MAX_NOTA}` : ""}
      </p>
    </div>
  );
}

/** "Su avatar": el emoji (o «Aa» = iniciales) y el color de fondo. `alElegir` se llama con «Usar este». */
export function HojaAvatar({
  abierta,
  alCerrar,
  nombre,
  emoji,
  color,
  alElegir,
}: {
  abierta: boolean;
  alCerrar: () => void;
  nombre: string;
  emoji: string | null;
  color: ColorAvatar | null;
  alElegir: (emoji: string | null, color: ColorAvatar | null) => void;
}) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Su avatar" altura="auto">
      {/* Se vuelve a montar al abrir: el borrador parte de lo guardado */}
      <Selector key={`${abierta}`} nombre={nombre} emoji={emoji} color={color} alElegir={alElegir} />
    </Hoja>
  );
}

function Selector({ nombre, emoji, color, alElegir }: { nombre: string; emoji: string | null; color: ColorAvatar | null; alElegir: (emoji: string | null, color: ColorAvatar | null) => void }) {
  const [e, setE] = useState<string | null>(emoji);
  // null = «Automático»: con emoji, el pastel del emoji; con iniciales, el rosa de siempre
  const [c, setC] = useState<ColorAvatar | null>(color);
  const tono = useTonoDeEmoji(e);
  const fondo = c ? hexDeColor(c) : e ? tono : null;
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto">
        <span
          role="img"
          aria-label="Así se ve"
          className={`grid size-23 place-items-center overflow-hidden rounded-full font-display text-titulo-hoja text-texto ${fondo ? "" : "bg-marca-rosa"}`}
          style={{ ...(fondo ? { backgroundColor: fondo } : null), ...(e ? { fontSize: "48px" } : null) }}
        >
          {e ?? iniciales(nombre || "?")}
        </span>
      </div>

      <div role="radiogroup" aria-label="Color de fondo" className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={c === null}
          aria-label="Automático"
          onClick={() => setC(null)}
          className={`tocable grid size-11 place-items-center rounded-full border-2 border-dashed border-borde-campo text-texto outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${e ? "" : "bg-marca-rosa"}`}
          style={e && tono ? { backgroundColor: tono } : undefined}
        >
          {c === null ? <IconoCheck tamano={20} strokeWidth={3} /> : <IconoChispa tamano={18} />}
        </button>
        {COLORES_AVATAR.map((col) => (
          <button
            key={col.id}
            type="button"
            role="radio"
            aria-checked={c === col.id}
            aria-label={col.nombre}
            onClick={() => setC(col.id)}
            className="tocable grid size-11 place-items-center rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
            style={{ backgroundColor: col.hex }}
          >
            {c === col.id && <IconoCheck tamano={20} strokeWidth={3} className="text-texto" />}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Emoji" className="grid grid-cols-6 gap-1.5 border-t border-linea pt-3">
        {[null, ...EMOJIS_AVATAR].map((x) => (
          <button
            key={x ?? "iniciales"}
            type="button"
            role="radio"
            aria-checked={e === x}
            aria-label={x ?? "Iniciales"}
            onClick={() => setE(x)}
            className={`tocable grid h-13.5 place-items-center rounded-radio-m outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${e === x ? "bg-accion-suave" : ""} ${x ? "text-[30px]" : "font-display text-cuerpo text-texto"}`}
          >
            {x ?? "Aa"}
          </button>
        ))}
      </div>

      <Boton tamano="grande" anchoCompleto onClick={() => alElegir(e, c)}>
        Usar este
      </Boton>
    </div>
  );
}
