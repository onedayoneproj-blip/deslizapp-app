import type { ReactNode } from "react";
import { clases } from "./comunes";

/**
 * Fondo con patrón de marca (docs/10, «Fondos con patrón» § 1, «iconos regados»): la flecha (Desliza), el corazón (Encuentra) y la
 * burbuja de chat (Escribe), repetidos en distintos tamaños y un poco girados, en un tono apenas distinto del fondo. SVG propio, sin
 * imágenes. Va DETRÁS del contenido (absoluto, sin toques) y se desvanece en la franja del centro, donde va el texto, para no bajar
 * su contraste. Solo en bienvenida, novedades, pantallas vacías, celebraciones y el catálogo público; nunca detrás de listas,
 * formularios o números.
 */
export function FondoPatron({
  color,
  className,
  mascara = "historia",
}: {
  /** El tono del patrón (ej. #eeb0c5 sobre rosa, #2b6550 sobre Verde Bosque). */
  color: string;
  className?: string;
  /**
   * Dónde queda limpio: «historia» deja libre la franja del titular y el texto (centro); «capitulo» (onboarding, excepción de
   * docs/10) deja libre arriba el título y el campo, y el patrón solo asoma en la cabecera y en la parte de abajo.
   */
  mascara?: keyof typeof MASCARA;
}) {
  return (
    <svg
      aria-hidden="true"
      className={clases("pointer-events-none absolute inset-0 size-full", className)}
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      style={{
        color,
        maskImage: MASCARA[mascara],
        WebkitMaskImage: MASCARA[mascara],
      }}
    >
      {ICONOS.map(([tipo, x, y, tam, giro], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${giro}) scale(${tam / 24})`}>
          <g transform="translate(-12 -12)">{FORMA[tipo]}</g>
        </g>
      ))}
    </svg>
  );
}

const MASCARA = {
  // El centro (titular y texto) queda limpio: el patrón vive en los bordes de arriba y de abajo.
  historia: "linear-gradient(to bottom, #000 0%, #000 30%, transparent 46%, transparent 78%, #000 92%)",
  // Formularios del onboarding: a pantalla completa, pero muy tenue en la franja del título y del campo.
  capitulo: "linear-gradient(to bottom, #000 0%, rgb(0 0 0 / 0.3) 14%, rgb(0 0 0 / 0.3) 50%, #000 62%)",
} as const;

type Tipo = "flecha" | "corazon" | "chat";

const FORMA: Record<Tipo, ReactNode> = {
  flecha: <path d="M12 20V5M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />,
  corazon: <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" fill="currentColor" />,
  chat: <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5h-.5a.5.5 0 0 1-.5-.5z" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" />,
};

/** [tipo, x, y, tamaño, giro]: arriba y abajo, nunca en la franja del texto. */
const ICONOS: [Tipo, number, number, number, number][] = [
  ["corazon", 34, 118, 30, -14],
  ["flecha", 118, 168, 26, 12],
  ["chat", 210, 120, 28, -8],
  ["corazon", 300, 176, 22, 16],
  ["flecha", 362, 104, 30, -10],
  ["chat", 56, 250, 24, 10],
  ["corazon", 352, 268, 28, -6],
  ["flecha", 22, 700, 28, 8],
  ["corazon", 108, 760, 24, -12],
  ["chat", 208, 712, 30, 6],
  ["flecha", 296, 780, 24, -16],
  ["corazon", 368, 704, 30, 12],
  ["chat", 60, 832, 26, -6],
  ["corazon", 250, 836, 20, 8],
  // Franja media: solo se ve con la máscara de los capítulos (en las historias queda tapada por el texto limpio).
  ["flecha", 40, 430, 24, 10],
  ["corazon", 352, 470, 26, -12],
  ["chat", 30, 560, 26, 8],
  ["flecha", 330, 600, 24, -8],
  ["corazon", 120, 640, 20, 14],
];
