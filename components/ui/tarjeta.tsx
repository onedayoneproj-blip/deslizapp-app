import Link from "next/link";
import type { ReactNode } from "react";
import { clases, FOCO } from "./comunes";

export type TonoTarjeta = "normal" | "destacada" | "marca";

const TONO: Record<TonoTarjeta, string> = {
  normal: "border-linea bg-superficie text-texto",
  // La cifra principal de una pantalla (Ventas, Por cobrar). Máximo una por pantalla.
  destacada: "border-accion bg-accion text-sobre-accion",
  // El plan y las novedades de Deslizapp.
  marca: "border-marca-rosa bg-marca-rosa text-texto",
};

/**
 * Tarjeta (docs/09 §10): `superficie`, borde `linea`, `radio-l`, relleno 16, sin sombra. Con `href` es un enlace; con
 * `onClick`, un botón (mismo foco visible que los botones). Lo de adentro usa un radio menor (radio-m).
 */
export function Tarjeta({
  tono = "normal",
  href,
  onClick,
  etiqueta,
  className,
  children,
}: {
  tono?: TonoTarjeta;
  href?: string;
  onClick?: () => void;
  /** Nombre accesible si es tocable y su texto no basta. */
  etiqueta?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = clases("block rounded-radio-l border p-4", TONO[tono], className);
  const tocable = clases("tocable w-full text-left", FOCO);
  if (href)
    return (
      <Link href={href} scroll={false} aria-label={etiqueta} className={clases(cls, tocable)}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} aria-label={etiqueta} className={clases(cls, tocable)}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}
