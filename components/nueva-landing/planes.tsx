"use client";

import { useState } from "react";
import { formatearPesos } from "@/lib/formato";
import { NOTA_ANUAL, PLANES_LANDING, montoPlan, type PeriodoPlan } from "@/lib/nueva-landing/datos";

/** Mensual o anual. El año son 10 meses por 12; el cambio es inmediato. */
export function Planes() {
  const [periodo, setPeriodo] = useState<PeriodoPlan>("mes");
  const [aviso, setAviso] = useState("");
  const anual = periodo === "ano";

  function elegir(siguiente: PeriodoPlan) {
    setPeriodo(siguiente);
    setAviso(siguiente === "ano" ? `Precios al año. ${NOTA_ANUAL}` : "Precios al mes.");
  }

  return (
    <div data-periodo={periodo}>
      <div className="nl-periodo" role="group" aria-label="Cómo quieres ver el precio">
        <button type="button" aria-pressed={!anual} onClick={() => elegir("mes")}>
          Al mes
        </button>
        <button type="button" aria-pressed={anual} onClick={() => elegir("ano")}>
          Al año
        </button>
      </div>
      <p className="nl-periodo-nota">{NOTA_ANUAL}</p>
      <p className="nl-sr" aria-live="polite">
        {aviso}
      </p>
      <ul className="nl-planes-grid">
        {PLANES_LANDING.map((plan) => {
          const monto = montoPlan(plan, periodo);
          return (
            <li key={plan.id} className={`nl-plan nl-plan-${plan.id}`} data-plan={plan.id} data-monto={monto}>
              {plan.destacado && <p className="nl-plan-sello">{plan.destacado}</p>}
              <h3>{plan.nombre}</h3>
              <p className="nl-plan-precio">
                <span className="nl-plan-monto">{formatearPesos(monto)}</span>
                <span className="nl-plan-cada">{anual ? "/año" : "/mes"}</span>
              </p>
              <p className="nl-plan-equiv">
                {anual ? `${formatearPesos(plan.mensual)} × 10` : `Al año, ${formatearPesos(plan.anual)}`}
              </p>
              <ul>
                {plan.limites.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
