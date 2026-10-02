"use client";

import { useState } from "react";
import { Hoja } from "../hoja";
import { enlaceWhatsApp } from "@/lib/formato";
import { borradoresJugada, type IdJugada } from "@/lib/proxima-jugada";

/** Hoja apilada: la elección y la edición ocurren antes de abrir WhatsApp. */
export function HojaBorradoresJugada({ id, nombreJugada, cliente, telefono, vendedora, tienda, urlCatalogo, alCerrar }: {
  id: IdJugada; nombreJugada: string; cliente: string; telefono: string;
  vendedora: string; tienda: string; urlCatalogo: string | null; alCerrar: () => void;
}) {
  const opciones = borradoresJugada(id, cliente, vendedora, tienda, urlCatalogo);
  const [elegido, setElegido] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [pulso, setPulso] = useState(0);
  const elegir = (indice: number) => {
    setElegido(indice);
    setTexto(opciones[indice].texto);
    setPulso((n) => n + 1);
  };
  return <Hoja abierta alCerrar={alCerrar} altura="grande" titulo={`Escribir a ${cliente}`}
    decoracionAbajo={<div className="jugada-resplandor" aria-hidden="true"><div className="jugada-resplandor-color" /><div className="jugada-resplandor-grano" />{pulso > 0 && <div key={pulso} className="jugada-resplandor-pulso" />}</div>}>
    <p className="mb-4 text-[14px] leading-[1.45] text-suave">{nombreJugada}. Elige un tono y cambia lo que quieras antes de abrir WhatsApp.</p>
    <div className="space-y-2" role="group" aria-label="Borradores de mensaje">
      {opciones.map((opcion, indice) => <button key={opcion.tono} type="button" onClick={() => elegir(indice)}
        aria-pressed={elegido === indice}
        aria-label={`Elegir borrador ${opcion.tono.toLowerCase()} para ${cliente}`}
        className={`tocable min-h-11 w-full rounded-[18px] border p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque ${elegido === indice ? "border-bosque bg-[#e3eee6]" : "border-linea bg-white"}`}>
        <b className="block text-[13px] text-bosque">{opcion.tono}</b>
        <span className="mt-1 block text-[12px] leading-[1.4] text-suave">{opcion.texto}</span>
      </button>)}
    </div>
    {elegido !== null && <div className="mt-5">
      <label htmlFor="jugada-mensaje" className="mb-2 block text-[13px] font-extrabold text-bosque">Revisa y edita tu mensaje</label>
      <textarea id="jugada-mensaje" value={texto} onChange={(e) => setTexto(e.target.value)} rows={5}
        className="w-full resize-y rounded-[18px] border border-linea bg-white p-3.5 text-[14px] leading-[1.5] text-bosque outline-none focus-visible:border-bosque focus-visible:ring-2 focus-visible:ring-bosque/25" />
      <a href={enlaceWhatsApp(telefono, texto)} target="_blank" rel="noreferrer" aria-disabled={!texto.trim()}
        onClick={(e) => { if (!texto.trim()) e.preventDefault(); }}
        className="tocable mt-3 flex min-h-12 items-center justify-center rounded-full bg-bosque px-4 text-[14px] font-extrabold text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque">
        Abrir WhatsApp
      </a>
      <p className="mt-2 text-[12px] text-suave">WhatsApp abre el texto para que lo revises. No se envía solo.</p>
    </div>}
  </Hoja>;
}
