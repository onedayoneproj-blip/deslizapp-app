import type { ReactNode } from "react";

/** Titular de pantalla (titulo-pantalla) + remate en una línea, como en el prototipo. */
export function TituloPantalla({ titulo, subtitulo, derecha }: { titulo: ReactNode; subtitulo?: ReactNode; derecha?: ReactNode }) {
  return (
    <div className={`px-5 pt-2.5 ${derecha ? "flex items-center gap-3.5" : ""}`}>
      <div className="min-w-0 flex-1">
      <h1 className="mt-1.5 mb-0.5 font-display text-titulo-pantalla text-texto">{titulo}</h1>
      {subtitulo && <p className={derecha ? "mt-1 text-secundario text-texto-secundario" : "text-texto-secundario"}>{subtitulo}</p>}
      </div>
      {derecha}
    </div>
  );
}
