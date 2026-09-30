"use client";

import { useState } from "react";
import { Hoja } from "../hoja";

/** Confirmación breve antes de pedir el catálogo (RPC `solicitar_catalogo`). */
export function HojaPedirCatalogo({ abierta, alCerrar, alConfirmar }: { abierta: boolean; alCerrar: () => void; alConfirmar: () => Promise<void> }) {
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await alConfirmar();
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿Pedimos tu catálogo?">
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2 rounded-[20px] border border-linea bg-white px-4 py-3.5 text-[14.5px] leading-snug">
          <li>Lo armamos con los productos y fotos que ya tengas cargados.</li>
          <li>Te avisamos cuando esté listo para que lo revises.</li>
          <li>Solo se publica cuando tú lo apruebes.</li>
        </ul>
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando}
          className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60"
        >
          Sí, pedirlo
        </button>
        <button type="button" onClick={alCerrar} disabled={enviando} className="tocable h-11 text-[14.5px] font-extrabold text-bosque">
          Ahora no
        </button>
      </div>
    </Hoja>
  );
}
