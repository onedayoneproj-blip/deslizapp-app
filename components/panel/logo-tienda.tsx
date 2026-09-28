import type { Tienda } from "@/lib/types";
import { iniciales } from "@/lib/formato";
import { Foto } from "../foto";

export function LogoTienda({ tienda, tamano = 36 }: { tienda: Pick<Tienda, "nombre" | "logoUrl">; tamano?: number }) {
  const estilo = { width: tamano, height: tamano };
  if (tienda.logoUrl) {
    return (
      <span style={estilo} className="shrink-0">
        <Foto src={tienda.logoUrl} alt={`Logo de ${tienda.nombre}`} className="h-full w-full rounded-xl" sizes={`${tamano}px`} />
      </span>
    );
  }
  return (
    <span
      style={estilo}
      className="flex shrink-0 items-center justify-center rounded-xl bg-rosa text-sm font-bold text-bosque"
      aria-hidden="true"
    >
      {iniciales(tienda.nombre)}
    </span>
  );
}
