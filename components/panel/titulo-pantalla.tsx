import type { ReactNode } from "react";

/** Titular de pantalla (Fredoka 32 px) + remate en una línea, como en el prototipo. */
export function TituloPantalla({ titulo, subtitulo }: { titulo: ReactNode; subtitulo?: ReactNode }) {
  return (
    <div className="px-5 pt-2.5">
      <h1 className="mt-1.5 mb-0.5 font-display text-[32px] leading-[1.02] text-bosque">{titulo}</h1>
      {subtitulo && <p className="text-suave">{subtitulo}</p>}
    </div>
  );
}
