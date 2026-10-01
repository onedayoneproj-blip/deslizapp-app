import type { ReactNode } from "react";

/** Titular de pantalla (Fredoka 32 px) + remate en una línea, como en el prototipo. */
export function TituloPantalla({ titulo, subtitulo, derecha }: { titulo: ReactNode; subtitulo?: ReactNode; derecha?: ReactNode }) {
  return (
    <div className={`px-5 pt-2.5 ${derecha ? "flex items-center gap-3.5" : ""}`}>
      <div className="min-w-0 flex-1">
      <h1 className="mt-1.5 mb-0.5 font-display text-[32px] leading-[1.02] text-bosque">{titulo}</h1>
      {subtitulo && <p className={derecha ? "mt-1 text-[14.5px] leading-[1.35] text-suave" : "text-suave"}>{subtitulo}</p>}
      </div>
      {derecha}
    </div>
  );
}
