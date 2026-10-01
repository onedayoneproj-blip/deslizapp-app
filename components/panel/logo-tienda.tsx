import type { Tienda } from "@/lib/types";
import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";

/** Foto de la tienda circular (en Rosa Suave con iniciales si no tiene foto). */
export function LogoTienda({ tienda, tamano = 42 }: { tienda: Pick<Tienda, "nombre" | "logoUrl">; tamano?: number }) {
  const estilo = { width: tamano, height: tamano };
  if (tienda.logoUrl) {
    return (
      <span style={estilo} className="block shrink-0 overflow-hidden rounded-full">
        <Foto src={tienda.logoUrl} alt={`Logo de ${tienda.nombre}`} className="h-full w-full" sizes={`${tamano}px`} />
      </span>
    );
  }
  return (
    <span style={estilo} className="grid shrink-0 place-items-center rounded-full bg-rosa text-sm font-extrabold text-bosque" aria-hidden="true">
      {iniciales(tienda.nombre)}
    </span>
  );
}
