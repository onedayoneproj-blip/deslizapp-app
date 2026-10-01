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

/** Las dos chispas de "retoque / créditos" del prototipo. */
export const IconoCreditos = (p: Props) => (
  <Icono {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 15.5l.7 1.8 1.8.7-1.8.7L19 20.5l-.7-1.8-1.8-.7 1.8-.7z" />
  </Icono>
);

export const IconoBuscar = (p: Props) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Icono>
);

export const IconoEnlaceExterno = (p: Props) => (
  <Icono {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Icono>
);

export const IconoCopiar = (p: Props) => (
  <Icono {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
  </Icono>
);

export const IconoEditar = (p: Props) => (
  <Icono {...p}>
    <path d="M4 20l4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16z" />
    <path d="m14.8 6.4 2.8 2.8M4 20l1.2-4" />
  </Icono>
);

export const IconoMas = (p: Props) => (
  <Icono strokeWidth={2.6} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

export const IconoMenos = (p: Props) => (
  <Icono strokeWidth={2.6} {...p}>
    <path d="M5 12h14" />
  </Icono>
);

export const IconoCamara = (p: Props) => (
  <Icono strokeWidth={1.8} {...p}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icono>
);

/** Logo de WhatsApp (relleno, en su verde por defecto). */
export const IconoWhatsApp = ({ tamano = 24, ...p }: Props) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="currentColor"
      d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.16-1.5A9.93 9.93 0 1 0 12.04 2zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.06.89.9-2.98-.2-.31a8.2 8.2 0 1 1 6.84 3.73zm4.5-6.14c-.25-.12-1.46-.72-1.68-.8-.23-.09-.39-.13-.56.12-.16.24-.64.8-.78.96-.15.17-.29.19-.54.06a6.7 6.7 0 0 1-1.97-1.21 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.47a.9.9 0 0 0-.66.31 2.77 2.77 0 0 0-.86 2.06c0 1.21.88 2.39 1 2.55.12.17 1.74 2.66 4.22 3.73.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.47-.29z"
    />
  </svg>
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

export const IconoCamion = (p: Props) => (
  <Icono {...p}>
    <path d="M3 6h11v10H3z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </Icono>
);

/** Moneda con signo de pesos: un abono (icono del diseño de crédito y abonos). */
export const IconoMoneda = (p: Props) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2 2.8.8 2.8 2-1.2 2-2.8 2c-1.3 0-2.3-.4-2.8-1.2M12 6.5V8m0 8v1.5" />
  </Icono>
);

/** Check curvo en círculo relleno (queda saldado). El relleno toma el color actual con `fill`. */
export const IconoCheckCirculo = ({ tamano = 18, ...p }: Props) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="11" fill="var(--color-menta)" />
    <path d="M7.4 12.9c1.1.9 2 1.8 2.8 2.9 1.6-2.7 3.6-4.8 6.4-6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
