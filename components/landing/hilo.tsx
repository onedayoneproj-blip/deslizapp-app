// El ♥ de la demo: representa el pedido y lo acompaña de principio a fin (referencias/landing/ajustes-lewis-1.md §6).
// Rosa mientras es de Ana, verde Bosque cuando llega a la tienda y un check al despachar. El color y el check dependen solo
// de --p (CSS); dónde está lo calcula components/landing/controlador.tsx a partir de las anclas (lib/landing/escenas.ts HILO).

import { HILO_APARECE, HILO_CHECK, HILO_SUMA, HILO_VERDE } from "@/lib/landing/escenas";
import { pista } from "./pista";

const TRAZO = "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z";

function Corazon({ relleno, borde }: { relleno: string; borde: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d={TRAZO} fill={relleno} stroke={borde} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** El dibujo del ♥ (lo usan el ♥ que viaja y, quieto, las anclas de la versión en pasos). Ocupa todo su contenedor. */
export function CorazonHilo() {
  return (
    <span className="lt-corazon presiona-suma" style={pista({ entra: HILO_SUMA, sale: [HILO_SUMA[1], HILO_SUMA[1] + 0.06] })}>
      <span className="lt-corazon-capa pista" style={pista({ sale: HILO_VERDE })}>
        <Corazon relleno="var(--marca-rosa-fija)" borde="var(--marca-bosque)" />
      </span>
      <span className="lt-corazon-capa pista" style={pista({ entra: HILO_VERDE, sale: HILO_CHECK, s1: -0.4 })}>
        <Corazon relleno="var(--marca-bosque)" borde="var(--marca-papel)" />
      </span>
      <span className="lt-corazon-capa pista" style={pista({ entra: HILO_CHECK, s0: -0.6 })}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <circle cx="12" cy="12" r="10.5" fill="var(--marca-bosque)" stroke="var(--marca-papel)" strokeWidth="1.4" />
          <path d="M7.4 12.3l3.1 3.1 6.1-6.6" fill="none" stroke="var(--marca-papel)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {/* El segundo «Lo quiero» se suma al mismo ♥ */}
      <span className="lt-corazon-cuenta pista" style={pista({ entra: [HILO_SUMA[1] - 0.02, HILO_SUMA[1]], s0: -0.6, sale: HILO_CHECK })}>
        2
      </span>
    </span>
  );
}

/** El ♥ que viaja, en una capa por encima de los dos teléfonos. */
export function Hilo() {
  return (
    <div className="lt-hilo" data-hilo aria-hidden="true">
      <div className="lt-hilo-dentro pista" style={pista({ entra: HILO_APARECE, s0: -0.7 })}>
        <CorazonHilo />
      </div>
    </div>
  );
}
