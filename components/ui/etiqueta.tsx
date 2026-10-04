import type { ReactNode } from "react";
import { clases } from "./comunes";

export type TonoEtiqueta = "neutro" | "exito" | "atencion" | "fuerte" | "marca";

const TONO: Record<TonoEtiqueta, string> = {
  neutro: "bg-borde-pastilla text-texto",
  exito: "bg-accion-suave text-exito-texto",
  atencion: "bg-atencion-suave text-atencion-texto",
  fuerte: "bg-accion text-sobre-accion",
  /** Rosa: lo que espera un comprador ("2 esperan", tablero Producto «Inventario"). Rosa le habla al comprador. */
  marca: "bg-marca-rosa text-texto",
};

/**
 * Etiqueta de estado (docs/09 §11): un solo tamaño (24, letra `etiqueta`), píldora, sin mayúsculas, no tocable.
 * `punto` solo para estados vivos ("En línea"); el estado lo dice siempre el texto.
 */
export function Etiqueta({ tono = "neutro", punto = false, icono, children, className }: { tono?: TonoEtiqueta; punto?: boolean; icono?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={clases("inline-flex h-(--alto-etiqueta) shrink-0 items-center gap-1.5 rounded-full px-2.5 text-etiqueta whitespace-nowrap", TONO[tono], className)}>
      {punto && <span aria-hidden="true" className="size-2 rounded-full bg-en-linea" />}
      {icono}
      {children}
    </span>
  );
}

/**
 * Contador: círculo de 20 px con número `contador`. `atencion` (resalte) solo cuando pide acción; si no, accion-suave.
 * `sobreAccion`: va dentro de algo elegido (relleno accion) y se invierte. En 0 no se muestra; desde 100, "99+".
 */
export function Contador({ valor, atencion = false, sobreAccion = false, className }: { valor: number; atencion?: boolean; sobreAccion?: boolean; className?: string }) {
  if (valor <= 0) return null;
  const tono = atencion ? "bg-resalte text-sobre-resalte" : sobreAccion ? "bg-sobre-accion text-accion" : "bg-accion-suave text-texto";
  return (
    <span className={clases("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-contador tabular-nums", tono, className)}>
      {valor > 99 ? "99+" : valor}
    </span>
  );
}
