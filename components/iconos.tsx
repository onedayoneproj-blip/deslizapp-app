// Iconografía de trazo simple y geométrico (docs/01-marca.md).

import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { tamano?: number };

function Icono({ tamano = 24, children, ...props }: Props) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoInicio = (p: Props) => (
  <Icono {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Icono>
);

export const IconoCatalogo = (p: Props) => (
  <Icono {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Icono>
);

export const IconoPedidos = (p: Props) => (
  <Icono {...p}>
    <path d="M5.5 8h13l-1 12h-11z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </Icono>
);

export const IconoClientes = (p: Props) => (
  <Icono {...p}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6" />
    <path d="M21 20a6 6 0 0 0-3.5-5.4" />
  </Icono>
);

export const IconoPromos = (p: Props) => (
  <Icono {...p}>
    <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8.5 8.5-9 9z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </Icono>
);

export const IconoChispa = (p: Props) => (
  <Icono {...p}>
    <path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7-5.6-1.9L10.1 9z" fill="currentColor" stroke="none" />
  </Icono>
);

export const IconoCorazon = (p: Props) => (
  <Icono {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
  </Icono>
);

export const IconoFlechaArriba = (p: Props) => (
  <Icono {...p}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Icono>
);

export const IconoChevronAbajo = (p: Props) => (
  <Icono {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icono>
);

export const IconoCheck = (p: Props) => (
  <Icono {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icono>
);

export const IconoCerrar = (p: Props) => (
  <Icono {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icono>
);

export const IconoReiniciar = (p: Props) => (
  <Icono {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </Icono>
);

export const IconoChat = (p: Props) => (
  <Icono {...p}>
    <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z" />
  </Icono>
);

export const IconoMatraz = (p: Props) => (
  <Icono {...p}>
    <path d="M9.5 3.5h5M10.5 3.5v5.2L5 18.5A1.4 1.4 0 0 0 6.2 20.5h11.6a1.4 1.4 0 0 0 1.2-2L13.5 8.7V3.5" />
    <path d="M7.5 14.5h9" />
  </Icono>
);
