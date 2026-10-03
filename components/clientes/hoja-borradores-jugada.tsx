"use client";

import { useState } from "react";
import { Hoja } from "../hoja";
import { Boton, CampoMultilinea } from "../ui";
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
  const elegir = (indice: number) => {
    setElegido(indice);
    setTexto(opciones[indice].texto);
  };
  return <Hoja abierta alCerrar={alCerrar} altura="grande" titulo={`Escribir a ${cliente}`}>
    <p className="mb-4 text-secundario text-texto-secundario">{nombreJugada}. Elige un tono y cambia lo que quieras antes de abrir WhatsApp.</p>
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Borradores de mensaje">
      {opciones.map((opcion, indice) => <button key={opcion.tono} type="button" role="radio" onClick={() => elegir(indice)}
        aria-checked={elegido === indice}
        aria-label={`Elegir borrador ${opcion.tono.toLowerCase()} para ${cliente}`}
        className={`tocable min-h-11 w-full rounded-radio-m border-[1.5px] p-3.5 text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco ${elegido === indice ? "border-accion-suave bg-accion-suave" : "border-borde-pastilla bg-superficie"}`}>
        <b className="block text-secundario text-texto">{opcion.tono}</b>
        <span className="mt-1 block text-etiqueta text-texto-secundario">{opcion.texto}</span>
      </button>)}
    </div>
    {elegido !== null && <div className="mt-5 flex flex-col gap-3">
      <CampoMultilinea etiqueta="Revisa y edita tu mensaje" id="jugada-mensaje" value={texto} onChange={(e) => setTexto(e.target.value)} filas={5} />
      <Boton tamano="grande" anchoCompleto href={enlaceWhatsApp(telefono, texto)} target="_blank" rel="noreferrer" deshabilitado={!texto.trim()}>
        Abrir WhatsApp
      </Boton>
      <p className="text-etiqueta text-texto-secundario">WhatsApp abre el texto para que lo revises. No se envía solo.</p>
    </div>}
  </Hoja>;
}
