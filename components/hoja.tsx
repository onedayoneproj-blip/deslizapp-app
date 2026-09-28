"use client";

import { useEffect, type ReactNode } from "react";
import { IconoCerrar } from "./iconos";

/** Hoja inferior (bottom sheet) como la del prototipo: fondo verde translúcido, esquinas de 30 px. */
export function Hoja({
  abierta,
  alCerrar,
  titulo,
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!abierta) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={alCerrar}
        className="absolute inset-0 bg-bosque/50 animate-[aparecer_.25s_ease]"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[93dvh] max-w-[480px] overflow-y-auto rounded-t-[30px] bg-papel px-5 pt-2.5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] animate-[subir-hoja_.32s_cubic-bezier(.2,.8,.3,1)]">
        <div className="mx-auto mb-2 h-[5px] w-11 rounded-full bg-[#e2d5bf]" />
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-2xl text-bosque">{titulo}</h2>
          <BotonCerrar onClick={alCerrar} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function BotonCerrar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-arena text-bosque"
    >
      <IconoCerrar tamano={20} />
    </button>
  );
}
