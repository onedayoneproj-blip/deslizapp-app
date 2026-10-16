"use client";

import { useState } from "react";
import { entrarConGoogle } from "@/lib/data/sesion";
import { limitesDe, precioDe, type PlanPublico } from "@/lib/planes/planes";
import { IconoCasa, IconoCatalogo, IconoClientes } from "../iconos";
import { registrarEvento } from "@/lib/medicion/registrar-evento";

const DIAS_DE_PRUEBA = 30;

/** El icono de cada límite, los mismos de la app: Catálogo (productos), Casa (tiendas) y Clientes (el de «Tu equipo»). */
const ICONO_LIMITE = { productos: IconoCatalogo, tiendas: IconoCasa, personas: IconoClientes } as const;

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
      <div className="pl-selector" role="group" aria-label="Forma de pago">
        <button type="button" aria-pressed={!anual} onClick={() => setAnual(false)} className="tocable" data-forma="mensual">
          Mensual
        </button>
        <button type="button" aria-pressed={anual} onClick={() => setAnual(true)} className="tocable" data-forma="anual">
          Anual · 2 meses gratis
        </button>
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
              <h2>{p.nombre}</h2>
              <div className="pl-precio">
                <b data-precio>{precio}</b>
                <span>{periodo}</span>
              </div>
              {nota && <span className="pl-nota">{nota}</span>}
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
