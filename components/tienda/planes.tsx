"use client";
import { useState } from "react";
import { DialogoCatalogo, PanelCatalogo } from "./dialogo";
import { Icono } from "./iconos";
const PLANS = [
  {
    id: "basico",
    name: "Básico",
    qty: "Hasta 40",
    mo: 1500,
    setup: 5000,
    brand: 10000,
    ret: "Con créditos",
  },
  {
    id: "pro",
    name: "Pro",
    qty: "Hasta 100",
    mo: 3200,
    setup: 5000,
    brand: 10000,
    ret: "100 créditos",
  },
  {
    id: "ilimitado",
    name: "Ilimitado",
    qty: "Sin límite",
    mo: null,
    setup: null,
    brand: null,
    ret: "A tu medida",
  },
];
const TERMS: string[][] = [
  [
    "Pago del montaje",
    "50% para empezar y 50% al entregar el catálogo. Si incluye marca, se paga igual.",
  ],
  [
    "Mensualidad",
    "La primera se paga junto con el segundo pago del montaje, cuando apruebas y publicamos tu catálogo. Después, por adelantado, en los primeros 5 días de cada mes.",
  ],
  [
    "Fotos y créditos",
    "Todas las fotos del montaje se retocan sin costo extra. Después, cada foto nueva retocada usa 5 créditos. El plan Pro incluye 100 créditos cada mes (20 fotos) que no se acumulan. Los créditos comprados no vencen.",
  ],
  [
    "Tiempo de entrega",
    "De 5 a 7 días laborables después de recibir todas tus fotos, precios y descripciones. Con marca, 5 días laborables más.",
  ],
  [
    "Cambios al catálogo",
    "Precios, agotados, textos y productos nuevos: ilimitados y gratis en todos los planes. Solo el retoque de fotos nuevas usa créditos.",
  ],
  [
    "Atrasos",
    "Con más de 10 días de atraso en la mensualidad, el catálogo se pausa hasta ponerse al día.",
  ],
  [
    "Cambiar de plan",
    "Puedes subir o bajar de plan cuando quieras; la nueva mensualidad aplica desde el mes siguiente.",
  ],
  [
    "Cancelación",
    "Cancela cuando quieras, sin mínimo de tiempo ni penalidad. No se devuelve el montaje ni la mensualidad del mes en curso.",
  ],
  [
    "Qué es de quién",
    "Tus fotos, textos, logo y marca son tuyos (también el logo que yo diseñe, una vez pagado). El diseño y el sistema del catálogo son de Deslizapp y se usan mientras la mensualidad esté activa.",
  ],
  [
    "Cambios de precio",
    "Los precios pueden cambiar con 30 días de aviso, nunca a mitad de un mes ya pagado.",
  ],
];
export function Planes({
  cerrar,
  tienda,
  inicial,
}: {
  cerrar: () => void;
  tienda: string;
  inicial: string;
}) {
  const [seleccion, setSeleccion] = useState(inicial);
  const p = PLANS.find((p) => p.id === seleccion) ?? PLANS[1];
  const rd = (n: number | null) => "RD$" + (n ?? 0).toLocaleString("en-US");
  const mensaje =
    `¡Hola! Vi el catálogo de ${tienda} en Deslizapp y me dio un aaah. Quiero uno para mi tienda.\n\n• Plan: ${p.name} (${p.qty.toLowerCase()} productos)` +
    (p.mo
      ? `\n• Montaje ${rd(p.setup)} (o ${rd(p.brand)} con marca) + ${rd(p.mo)}/mes`
      : "\n• Quiero una cotización") +
    "\n\n¿Cómo empezamos?";
  return (
    <DialogoCatalogo id="plBg" nombre="Planes y precios" cerrar={cerrar}>
      <PanelCatalogo cerrar={cerrar}>
        <div className="shead">
          <h2 id="plTitle">Planes y precios</h2>
          <button className="x" aria-label="Cerrar" onClick={cerrar}>
            ×
          </button>
        </div>
        <div className="sbody" id="plBody">
          <p className="plintro">
            Un <b>montaje</b> una sola vez y una <b>mensualidad</b> para que tu
            catálogo siga brillando. Toca un plan para elegirlo.
          </p>
          <table className="ptab">
            <colgroup>
              <col className="l" />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th />
                {PLANS.map((p) => (
                  <th
                    scope="col"
                    key={p.id}
                    className={
                      (p.id === "pro" ? "hot " : "") +
                      (p.id === seleccion ? "on" : "")
                    }
                  >
                    <button
                      className="pc"
                      aria-pressed={p.id === seleccion}
                      onClick={() => {
                        setSeleccion(p.id);
                        history.replaceState(
                          history.state,
                          "",
                          `#planes${p.id !== "pro" ? "?plan=" + p.id : ""}`,
                        );
                      }}
                    >
                      <i>Más elegido</i>
                      <b>{p.name}</b>
                      <span className="pm">
                        {p.mo ? rd(p.mo) : "A cotizar"}
                        <small>{p.mo ? "al mes" : ""}</small>
                      </span>
                      <span className="ps">
                        {p.setup ? "+ " + rd(p.setup) : "según volumen"}
                        <small>{p.setup ? "montaje" : ""}</small>
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Productos", ...PLANS.map((p) => p.qty)],
                ["Fotos del montaje retocadas", "✓", "✓", "✓"],
                ["Retoques cada mes", ...PLANS.map((p) => p.ret)],
                ["Cambios ilimitados", "✓", "✓", "✓"],
                ["Pedidos a WhatsApp y enlace en vivo", "✓", "✓", "✓"],
                ["Búsqueda y colecciones", "✓", "✓", "✓"],
              ].map(([label, ...values]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {values.map((v, i) => (
                    <td
                      key={i}
                      className={PLANS[i].id === seleccion ? "on" : ""}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="plnotes">
            <li>
              <b>Montaje:</b> pago único para dejar tu catálogo listo, con todas
              tus fotos retocadas. 50% al empezar y 50% al entregar.
            </li>
            <li>
              <b>Montaje con marca:</b> si todavía no tienes logo, el montaje
              sube a RD$10,000 e incluye tu logo y estilo, con 2 rondas de
              cambios.
            </li>
            <li>
              <b>Mensualidad:</b> mantiene tu catálogo en línea con cambios
              ilimitados. La primera se paga al publicar.
            </li>
            <li>
              <b>Créditos de retoque:</b> cada foto nueva retocada usa 5
              créditos. Los créditos no vencen.
              <span className="plcred">
                {[
                  [50, 700],
                  [125, 1500],
                  [250, 2500],
                ].map(([n, precio]) => (
                  <span key={n}>
                    <b>{n} créditos</b>
                    {rd(precio)}
                  </span>
                ))}
              </span>
            </li>
          </ul>
          <details className="plhow">
            <summary>¿Cómo se paga y qué condiciones hay?</summary>
            <div className="terms">
              {TERMS.map(([h, b]) => (
                <details key={h} name="terms">
                  <summary>{h}</summary>
                  <p>{b}</p>
                </details>
              ))}
            </div>
          </details>
          <p className="plsoon2">
            <span>Próximamente</span>Tu propia app para manejar pedidos,
            clientes y ventas.
          </p>
        </div>
        <div className="sfoot">
          <a
            id="plWa"
            href={
              "https://wa.me/18297898061?text=" + encodeURIComponent(mensaje)
            }
          >
            <Icono nombre="wa" />
            Quiero el plan {p.name}
          </a>
        </div>
      </PanelCatalogo>
    </DialogoCatalogo>
  );
}
