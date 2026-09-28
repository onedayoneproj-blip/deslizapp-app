import type { Tienda } from "@/lib/types";
import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";

/** Logo de la tienda en un cuadro redondeado (en Rosa Suave si la tienda no tiene logo). */
export function LogoTienda({ tienda, tamano = 42 }: { tienda: Pick<Tienda, "nombre" | "logoUrl">; tamano?: number }) {
  const estilo = { width: tamano, height: tamano, borderRadius: Math.round(tamano * 0.31) };
  if (tienda.logoUrl) {
    return (
      <span style={estilo} className="block shrink-0 overflow-hidden">
        <Foto src={tienda.logoUrl} alt={`Logo de ${tienda.nombre}`} className="h-full w-full" sizes={`${tamano}px`} />
      </span>
    );
  }
  return (
    <span style={estilo} className="grid shrink-0 place-items-center bg-rosa text-sm font-extrabold text-bosque" aria-hidden="true">
      {iniciales(tienda.nombre)}
    </span>
  );
}
