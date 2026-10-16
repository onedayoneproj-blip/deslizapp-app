"use client";

import { useState } from "react";
import { entrarConGoogle } from "@/lib/data/sesion";
import { DESCUENTO_CIRCULO, montoAnualCirculo } from "@/lib/circulo";
import { limitesDe, pesos, precioDe, type PlanPublico } from "@/lib/planes/planes";
import { SelloCirculo } from "./sello-circulo";
import { IconoBarras, IconoCasa, IconoCatalogo, IconoChispa, IconoClientes, IconoFlechaArriba } from "../iconos";
import { registrarEvento } from "@/lib/medicion/registrar-evento";

const DIAS_DE_PRUEBA = 30;

/** El icono de cada límite, los mismos de la app: Catálogo (productos), Casa (tiendas) y Clientes (el de «Tu equipo»). */
const ICONO_LIMITE = { productos: IconoCatalogo, tiendas: IconoCasa, personas: IconoClientes } as const;

/**
 * La insignia de cada plan, a la izquierda del nombre (40 px): Inicial empieza (flecha que sube), Negocio crece (barras), Pro llega
 * más lejos (chispa). Un plan nuevo sin insignia aquí sale sin ella.
 */
const INSIGNIA_PLAN: Record<string, { Icono: typeof IconoBarras; fondo: string; tinta: string; borde: string }> = {
  // Colores de marca sólidos; cada insignia pasa 3:1 contra el fondo de su tarjeta (el borde Bosque de 2 px lo da donde el relleno solo no llega).
  inicial: { Icono: IconoFlechaArriba, fondo: "#F5C9D6", tinta: "#174B3A", borde: "#174B3A" },
  negocio: { Icono: IconoBarras, fondo: "#FF834F", tinta: "#174B3A", borde: "#174B3A" },
  pro: { Icono: IconoChispa, fondo: "#174B3A", tinta: "#F5C9D6", borde: "#174B3A" },
};

/** El selector Mensual / Anual y las tarjetas de cada plan. «Probar 30 días gratis» lleva a Google y, de ahí, al onboarding. */
export function ListaPlanes({ planes }: { planes: PlanPublico[] }) {
  const [anual, setAnual] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const probar = async () => {
    registrarEvento("cta_iniciar_sesion");
    setEntrando(true);
    setAviso(null);
    const problema = await entrarConGoogle();
    // Si todo va bien, el navegador ya se está yendo a Google.
    if (problema) {
      setAviso(problema);
      setEntrando(false);
    }
  };

  if (planes.length === 0) {
    return (
      <p role="status" className="pl-vacio" data-sin-planes>
        No pudimos cargar los planes ahora. Vuelve a intentarlo en un momento.
      </p>
    );
  }

  return (
    <>
      {/* El sello va montado en la esquina de arriba a la derecha del selector, solo en «Anual»; arriba queda aire para él. */}
      <div className="pl-selector-caja">
        {anual && <SelloCirculo />}
      <div className="pl-selector" role="group" aria-label="Forma de pago">
        <button type="button" aria-pressed={!anual} onClick={() => setAnual(false)} className="tocable" data-forma="mensual">
          Mensual
        </button>
        <button type="button" aria-pressed={anual} onClick={() => setAnual(true)} className="tocable" data-forma="anual">
          Anual · 2 meses gratis
        </button>
      </div>
      </div>
      {aviso && (
        <p role="alert" className="ini-aviso">
          {aviso}
        </p>
      )}
      <div className="pl-planes">
        {planes.map((p) => {
          const { precio, periodo, nota } = precioDe(p, anual);
          return (
            <article key={p.id} className="pl-plan" data-destacado={p.destacado ? "si" : "no"} data-plan={p.id}>
              {p.destacado && <span className="pl-etiqueta">Para tienda que crece</span>}
              <div className="pl-cabeza">
                {INSIGNIA_PLAN[p.id] && (
                  <span className="pl-insignia" style={{ background: INSIGNIA_PLAN[p.id]!.fondo, color: INSIGNIA_PLAN[p.id]!.tinta, borderColor: INSIGNIA_PLAN[p.id]!.borde }} data-insignia={p.id} aria-hidden="true">
                    {(() => {
                      const Icono = INSIGNIA_PLAN[p.id]!.Icono;
                      return <Icono tamano={22} />;
                    })()}
                  </span>
                )}
                <h2>{p.nombre}</h2>
              </div>
              <div className="pl-precio">
                <b data-precio>{precio}</b>
                <span>{periodo}</span>
              </div>
              {nota && <span className="pl-nota">{nota}</span>}
              {/* La cinta de las primeras tiendas (el Círculo): solo en «Anual», con el monto de ese plan sacado de su precio mensual. */}
              {anual && p.precioMensual != null && (
                <div className="pl-cinta" data-cinta="circulo">
                  <span className="pl-cinta-titulo">Primeras tiendas · {DESCUENTO_CIRCULO} % menos</span>
                  <span className="pl-cinta-monto">{pesos(montoAnualCirculo(p.precioMensual))} el primer año</span>
                  <span className="pl-cinta-nota">por invitación</span>
                </div>
              )}
              {p.idealPara && <p className="pl-ideal">{p.idealPara}</p>}
              <ul>
                {limitesDe(p).map((l) => {
                  const Icono = ICONO_LIMITE[l.clave];
                  return (
                    <li key={l.clave} data-limite={l.clave}>
                      <Icono tamano={20} />
                      {l.texto}
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="pl-probar tocable" onClick={() => void probar()} disabled={entrando} data-cta="probar">
                {entrando ? "Abriendo Google…" : `Probar ${DIAS_DE_PRUEBA} días gratis`}
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
