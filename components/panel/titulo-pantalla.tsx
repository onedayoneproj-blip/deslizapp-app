import type { ReactNode } from "react";

export function TituloPantalla({ titulo, subtitulo }: { titulo: string; subtitulo?: ReactNode }) {
  return (
    <div className="px-4 pt-5">
      <h1 className="font-display text-3xl leading-tight text-bosque">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-[15px] text-suave">{subtitulo}</p>}
    </div>
  );
}
