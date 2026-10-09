"use client";

import { useState } from "react";
import { CATEGORIAS_EMOJI, conTono, guardarTonoPiel, leerRecientes, leerTonoPiel, TONOS_PIEL, validarEmoji } from "@/lib/emojis-avatar";
import { Campo } from "../ui";

/** Una celda de emoji: botón de 48 px con el nombre en español como etiqueta. */
function Celda({ emoji, nombre, elegido, alTocar }: { emoji: string; nombre: string; elegido: boolean; alTocar: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegido}
      aria-label={nombre}
      onClick={alTocar}
      className={`tocable grid h-12 place-items-center rounded-radio-m text-[28px] leading-none outline-none focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-foco ${elegido ? "bg-accion-suave" : ""}`}
    >
      {emoji}
    </button>
  );
}

/**
 * Elegir el emoji del avatar: «Usados hace poco» (hasta 12), categorías en pestañas horizontales, una cuadrícula de 6 columnas que se
 * desplaza (solo se pinta la categoría abierta) con tono de piel en «Personas» (se recuerda), «Aa» para volver a las iniciales y «Usar otro
 * emoji» para escribir cualquiera con el teclado del teléfono (un solo emoji, validado).
 */
export function SelectorEmoji({ valor, alElegir }: { valor: string | null; alElegir: (emoji: string | null) => void }) {
  const [categoria, setCategoria] = useState(CATEGORIAS_EMOJI[0]!.id);
  const [tono, setTono] = useState(() => leerTonoPiel());
  const [recientes] = useState(() => leerRecientes());
  const [otro, setOtro] = useState("");
  const abierta = CATEGORIAS_EMOJI.find((c) => c.id === categoria) ?? CATEGORIAS_EMOJI[0]!;
  const validado = otro.trim() === "" ? null : validarEmoji(otro);

  return (
    <div className="flex flex-col gap-3">
      {recientes.length > 0 && (
        <div>
          <p className="mb-1 text-secundario font-extrabold">Usados hace poco</p>
          <div role="radiogroup" aria-label="Usados hace poco" className="grid grid-cols-6 gap-1.5">
            {recientes.map((e) => (
              <Celda key={e} emoji={e} nombre={e} elegido={valor === e} alTocar={() => alElegir(e)} />
            ))}
          </div>
        </div>
      )}

      <div role="tablist" aria-label="Categorías de emojis" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {CATEGORIAS_EMOJI.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === categoria}
            onClick={() => setCategoria(c.id)}
            className={`tocable flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 text-secundario font-extrabold whitespace-nowrap outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foco ${
              c.id === categoria ? "border-accion bg-accion-suave text-texto" : "border-borde-pastilla bg-superficie text-texto-secundario"
            }`}
          >
            <span aria-hidden="true" className="text-[18px] leading-none">
              {c.icono}
            </span>
            {c.nombre}
          </button>
        ))}
      </div>

      {abierta.conTono && (
        <div role="radiogroup" aria-label="Tono de piel" className="flex items-center justify-between gap-1">
          <span className="text-secundario text-texto-secundario max-[400px]:sr-only">Tono</span>
          {TONOS_PIEL.map((t) => (
            <button
              key={t.id || "sin"}
              type="button"
              role="radio"
              aria-checked={tono === t.id}
              aria-label={t.nombre}
              onClick={() => {
                setTono(t.id);
                guardarTonoPiel(t.id);
              }}
              className={`tocable grid size-11 shrink-0 place-items-center rounded-full border-2 text-[22px] leading-none outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foco ${tono === t.id ? "border-accion bg-accion-suave" : "border-transparent"}`}
            >
              {t.id ? "👋" + t.id : "👋"}
            </button>
          ))}
        </div>
      )}

      <div role="radiogroup" aria-label={abierta.nombre} className="grid max-h-[232px] grid-cols-6 gap-1.5 overflow-y-auto overscroll-contain">
        {abierta.emojis.map((x) => {
          const e = abierta.conTono ? conTono(x.e, tono) : x.e;
          return <Celda key={x.e} emoji={e} nombre={x.n} elegido={valor === e} alTocar={() => alElegir(e)} />;
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-linea pt-3">
        <button
          type="button"
          role="radio"
          aria-checked={valor === null}
          onClick={() => alElegir(null)}
          className={`tocable flex h-12 items-center justify-center gap-2 rounded-radio-m border-2 font-display text-cuerpo text-texto outline-none focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-foco ${valor === null ? "border-accion bg-accion-suave" : "border-borde-pastilla bg-superficie"}`}
        >
          Aa <span className="font-sans text-secundario font-normal text-texto-secundario">Usar las iniciales</span>
        </button>
        <Campo
          etiqueta="Usar otro emoji"
          value={otro}
          onChange={(e) => {
            setOtro(e.target.value);
            const r = e.target.value.trim() === "" ? null : validarEmoji(e.target.value);
            if (r?.ok) alElegir(r.emoji);
          }}
          placeholder="Escribe o pega un emoji"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="done"
          error={validado && !validado.ok ? validado.error : undefined}
          ayuda={validado?.ok ? `Listo: ${validado.emoji}` : "Cambia al teclado de emojis de tu teléfono (🌐) y toca el que quieras."}
        />
      </div>
    </div>
  );
}
