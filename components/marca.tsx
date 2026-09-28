// Piezas de marca de Deslizapp: isotipo, logotipo y blobs de fondo.

/** Isotipo: una "d" minúscula con una flecha hacia arriba integrada en el asta. */
export function Isotipo({ tamano = 32, className = "" }: { tamano?: number; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="13" cy="19.5" r="6.5" />
      <path d="M19.5 26V5.5" />
      <path d="m15 10 4.5-4.5L24 10" />
    </svg>
  );
}

/** Logotipo: "deslizapp", minúscula, un solo bloque. */
export function Logotipo({ className = "" }: { className?: string }) {
  return <span className={`font-display lowercase tracking-tight ${className}`}>deslizapp</span>;
}

/** Blobs redondeados en los colores de marca, para fondos de estados vacíos y de carga. */
export function Blobs({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden="true">
      <path
        d="M38 92c-12-30 10-62 44-66s58 6 74 26 20 50-2 70-60 20-86 12-18-12-30-42z"
        className="fill-rosa"
      />
      <path d="M150 26c10-6 26-2 30 10s-4 24-16 26-22-4-24-14 0-16 10-22z" className="fill-mandarina" opacity="0.85" />
      <path d="M22 128c6-10 20-12 28-4s6 20-4 24-30-8-24-20z" className="fill-menta" />
    </svg>
  );
}
