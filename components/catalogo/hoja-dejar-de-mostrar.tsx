"use client";

import { useState } from "react";
import { Hoja } from "../hoja";

/** Confirmación para dejar de mostrar el catálogo (RPC `despublicar_mi_catalogo`): se puede volver a publicar sin perder nada. */
export function HojaDejarDeMostrar({ abierta, alCerrar, alConfirmar }: { abierta: boolean; alCerrar: () => void; alConfirmar: () => Promise<void> }) {
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
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿Dejar de mostrar tu catálogo?">
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2 rounded-[20px] border border-linea bg-white px-4 py-3.5 text-[14.5px] leading-snug">
          <li>Tus clientes dejan de verlo y el enlace deja de funcionar.</li>
          <li>No pierdes nada: tus productos y tu enlace se quedan.</li>
          <li>Cuando quieras, lo publicas otra vez.</li>
        </ul>
        <button type="button" onClick={confirmar} disabled={enviando} className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60">
          Dejar de mostrarlo
        </button>
        <button type="button" onClick={alCerrar} disabled={enviando} className="tocable h-11 text-[14.5px] font-extrabold text-bosque">
          Mejor no
        </button>
      </div>
    </Hoja>
  );
}
