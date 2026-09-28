import type { ReactNode } from "react";
import { Blobs } from "./marca";

/** Estado vacío con tono de marca: titular corto + remate (+ nota a mano, opcional). */
export function EstadoVacio({
  icono,
  titulo,
  remate,
  nota,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  remate: ReactNode;
  nota?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-6 text-center">
      <div className="relative mb-6 h-36 w-44">
        <Blobs className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center text-bosque">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-papel shadow-sm">{icono}</div>
        </div>
      </div>
      <h2 className="font-display text-2xl leading-tight text-bosque">{titulo}</h2>
      <p className="mt-2 max-w-xs text-[15px] leading-snug text-suave">{remate}</p>
      {nota && <p className="mt-3 font-mano text-2xl text-mandarina -rotate-2">{nota}</p>}
      {children && <div className="mt-6 w-full">{children}</div>}
    </div>
  );
}
