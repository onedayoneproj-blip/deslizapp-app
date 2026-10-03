import type { Producto } from "@/lib/types";
import { Foto } from "../foto";

/** Miniatura cuadrada de un producto (radio-s). Sin foto, su inicial. `opaca` la baja al 60 % (producto agotado u oculto). */
export function MiniaturaProducto({ producto, className = "size-11", atenuada = false }: { producto: Pick<Producto, "nombre" | "fotos">; className?: string; atenuada?: boolean }) {
  const foto = producto.fotos[0];
  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida ${atenuada ? "opacity-60" : ""} ${className}`}>
      {foto ? (
        <Foto src={foto} alt="" className="size-full" sizes="48px" />
      ) : (
        <span className="grid size-full place-items-center font-display text-destacado text-texto-secundario">{producto.nombre[0]}</span>
      )}
    </span>
  );
}
