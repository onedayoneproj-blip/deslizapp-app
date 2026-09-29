/** Bloque de carga con brillo sutil (en vez de pantallas en blanco o saltos de contenido). */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`esqueleto block ${className}`} />;
}
