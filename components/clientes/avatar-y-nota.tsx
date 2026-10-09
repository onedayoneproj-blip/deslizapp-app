"use client";

import { useState } from "react";
import { COLORES_AVATAR, EMOJIS_AVATAR, hexDeColor, type ColorAvatar } from "@/lib/avatar-cliente";
import { MAX_NOTA } from "@/lib/data/clientes";
import { iniciales } from "@/lib/formato";
import { Hoja } from "../hoja";
import { IconoCheck, IconoEditar, IconoMas } from "../iconos";
import { Avatar, Boton } from "../ui";

/** Forma de la nota de Instagram: gotita pegada abajo-izquierda y un puntito suelto (referencias/cliente-nuevo-nota). */
function ColaDeNota({ ancho = 36, alto = 34, className }: { ancho?: number; alto?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={ancho} height={alto} viewBox="0 0 36 34" className={className}>
      <path d="M0 0H36V10Q27 10 24 16.5A8 8 0 0 1 8.5 15.5Q6 10 0 10Z" fill="currentColor" />
      <circle cx="23" cy="28.5" r="4.8" fill="currentColor" />
    </svg>
  );
}

/** Burbuja de la nota (píldora muy redondeada, sombra única, fondo `superficie`) con su cola. `onClick`: la burbuja es un botón. */
export function BurbujaNota({ nota, onClick, etiqueta, className }: { nota: string; onClick?: () => void; etiqueta?: string; className?: string }) {
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
 * Arriba de "Cliente nuevo" y "Editar cliente": la burbuja de la nota sobre el avatar grande (112 px, con la muesca del botón
 * "+" / lápiz). Tocar el avatar abre "Su avatar"; tocar la burbuja, "Nota". Solo emoji, nunca fotos.
 */
export function AvatarYNota({
  nombre,
  nota,
  emoji,
  color,
  alAbrirAvatar,
  alAbrirNota,
}: {
  nombre: string;
  nota: string;
  emoji: string | null;
  color: ColorAvatar | null;
  alAbrirAvatar: () => void;
  alAbrirNota: () => void;
}) {
  const hayAvatar = emoji !== null || color !== null;
  return (
    <div className="relative mx-auto mt-3 h-44 w-60">
      <BurbujaNota nota={nota} onClick={alAbrirNota} etiqueta={nota ? "Editar la nota" : "Agregar una nota"} className="absolute top-[-8px] left-[30px]" />
      <button
        type="button"
        onClick={alAbrirAvatar}
        aria-label={hayAvatar ? "Cambiar avatar" : "Elegir avatar"}
        className="tocable absolute top-[52px] left-16 size-28 rounded-full outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
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
  const [c, setC] = useState<ColorAvatar>(color ?? "crema");
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto">
        <span
          role="img"
          aria-label="Así se ve"
          className="grid size-23 place-items-center overflow-hidden rounded-full font-display text-titulo-hoja text-texto"
          style={{ backgroundColor: hexDeColor(c) ?? undefined, fontSize: e ? "48px" : undefined }}
        >
          {e ?? iniciales(nombre || "?")}
        </span>
      </div>

      <div role="radiogroup" aria-label="Color de fondo" className="flex justify-center gap-3.5">
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

      <Boton tamano="grande" anchoCompleto onClick={() => alElegir(e, e === null && c === "crema" ? null : c)}>
        Usar este
      </Boton>
    </div>
  );
}

/** "Nota": la burbuja grande se escribe ahí mismo (cursor dentro). «Solo tú la ves · N/60» y «Listo». */
export function HojaNota({
  abierta,
  alCerrar,
  nombre,
  nota,
  emoji,
  color,
  alListo,
}: {
  abierta: boolean;
  alCerrar: () => void;
  nombre: string;
  nota: string;
  emoji: string | null;
  color: ColorAvatar | null;
  alListo: (nota: string) => void;
}) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Nota" altura="grande">
      <Escribir key={`${abierta}`} nombre={nombre} inicial={nota} emoji={emoji} color={color} alListo={alListo} />
    </Hoja>
  );
}

function Escribir({ nombre, inicial, emoji, color, alListo }: { nombre: string; inicial: string; emoji: string | null; color: ColorAvatar | null; alListo: (nota: string) => void }) {
  const [texto, setTexto] = useState(inicial);
  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <div className="relative z-20 w-full max-w-[250px] text-superficie [filter:drop-shadow(0_8px_18px_rgb(23_75_58/0.16))]">
        <label className="block rounded-[34px] bg-superficie px-6 py-4">
          <span className="sr-only">Nota del cliente</span>
          <textarea
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value.replace(/\n/g, " ").slice(0, MAX_NOTA))}
            maxLength={MAX_NOTA}
            rows={2}
            placeholder="Talla, gustos…"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                alListo(texto);
              }
            }}
            className="block w-full resize-none bg-transparent text-center text-cuerpo font-semibold text-texto outline-none placeholder:font-normal placeholder:text-texto-secundario"
          />
        </label>
        <ColaDeNota ancho={54} alto={51} className="absolute top-[calc(100%-15px)] left-8" />
      </div>
      <div className="mt-8">
        <Avatar nombre={nombre || "?"} tamano="perfil" emoji={emoji} color={color} />
      </div>
      <p className="text-secundario text-texto-secundario">
        Solo tú la ves · {texto.length}/{MAX_NOTA}
      </p>
      <Boton tamano="grande" anchoCompleto onClick={() => alListo(texto)}>
        Listo
      </Boton>
    </div>
  );
}
