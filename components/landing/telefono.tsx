import type { CSSProperties, ReactNode } from "react";
import { HORA_DEMO } from "@/lib/landing/pedido-demo";

/**
 * El teléfono de la demo. Por dentro todo se dibuja a tamaño real (393 px de ancho, como un iPhone 15 Pro) y el conjunto se
 * escala al ancho disponible (landing.css, .lt-pantalla), así los componentes del sistema de diseño se ven como en la app.
 * Es una ilustración: no es tocable ni lo lee el lector de pantalla (la versión en pasos lleva el texto).
 */
export function Telefono({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`lt-telefono ${className}`} style={style} aria-hidden="true" inert>
      <div className="lt-pantalla">{children}</div>
    </div>
  );
}

/** Hora, isla y señal. `claro`: sobre fotos oscuras o la pantalla bloqueada. */
export function BarraEstado({ claro = false, hora = HORA_DEMO.replace(/\s.*$/, "") }: { claro?: boolean; hora?: string }) {
  return (
    <div className={`lt-estado ${claro ? "text-white" : "text-[#10362a]"}`}>
      <span className="w-[86px] text-center text-[16px] font-bold">{hora}</span>
      <span className="lt-isla" />
      <span className="flex w-[86px] items-center justify-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3.5" strokeOpacity=".45" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" stroke="none" />
          <path d="M24.5 4v4" strokeLinecap="round" strokeOpacity=".45" />
        </svg>
      </span>
    </div>
  );
}

/** Círculo que representa un toque del dedo (solo dibujo). */
export function Toque({ style, className = "" }: { style: CSSProperties; className?: string }) {
  return <span className={`lt-toque pista ${className}`} style={style} />;
}
