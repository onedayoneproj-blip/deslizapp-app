"use client";

import { useEffect, useRef, useState } from "react";
import { menosMovimiento } from "@/lib/movimiento";
import { EJEMPLO_ABONO } from "@/lib/planes/ejemplos-incluye";
import { useEnPantalla } from "../landing/en-pantalla";
import { Avatar, BloqueDeuda, Boton, Tarjeta } from "../ui";
import { CampoMonto } from "../ui/campo";

/** Cuándo pasa cada cosa (ms desde que empieza el bucle) y cuánto dura todo. */
const T = { tocaAnotar: 1000, campo: 1400, digitos: [1800, 2050, 2300], tocaGuardar: 3000, guardado: 3350, sale: 6400, vuelve: 6800 } as const;
const ESCRITO = String(EJEMPLO_ABONO.abono);

type Estado = { fase: "inicio" | "campo" | "guardado"; digitos: number; toque: "anotar" | "guardar" | null; oculto: boolean };
const FINAL: Estado = { fase: "guardado", digitos: ESCRITO.length, toque: null, oculto: false };
const INICIO: Estado = { fase: "inicio", digitos: 0, toque: null, oculto: false };

/**
 * «Clientes, abonos y lo pendiente» animada (docs/prompts/planes-incluye-y-preguntas.md): un toque en «Anotar abono», se escribe RD$500, se guarda
 * y la deuda baja de RD$1,250 a RD$750 con el aviso de número de la app (`Numero`) y su barra. Las piezas son las reales (Tarjeta, Avatar,
 * BloqueDeuda, Boton, CampoMonto) con datos de ejemplo; el toque es el círculo de la landing. Corre solo mientras la tarjeta se ve y vuelve
 * a empezar cada ~7 s. Con movimiento reducido (y antes de medir) se ve el estado final, quieto. Es decoración: la esconde quien la monta.
 */
export function AbonoAnimado({ ahora, fecha }: { ahora: number; fecha: string | null }) {
  const caja = useRef<HTMLDivElement>(null);
  const visible = useEnPantalla(caja);
  const [e, setE] = useState<Estado>(FINAL);

  useEffect(() => {
    if (!visible || menosMovimiento()) return;
    const timers: number[] = [];
    const en = (ms: number, f: Estado | ((a: Estado) => Estado)) => timers.push(window.setTimeout(() => setE(f), ms));
    const ciclo = () => {
      setE(INICIO);
      en(T.tocaAnotar, (a) => ({ ...a, toque: "anotar" }));
      en(T.campo, { ...INICIO, fase: "campo" });
      T.digitos.forEach((ms, k) => en(ms, { ...INICIO, fase: "campo", digitos: k + 1 }));
      en(T.tocaGuardar, (a) => ({ ...a, toque: "guardar" }));
      en(T.guardado, FINAL);
      en(T.sale, (a) => ({ ...a, oculto: true }));
      timers.push(window.setTimeout(ciclo, T.vuelve));
    };
    ciclo();
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      setE(FINAL);
    };
  }, [visible]);

  const saldo = e.fase === "guardado" ? EJEMPLO_ABONO.deuda - EJEMPLO_ABONO.abono : EJEMPLO_ABONO.deuda;
  return (
    <div ref={caja} className="pl-ab" data-oculto={e.oculto ? "si" : "no"}>
      <Tarjeta>
        <div className="flex items-center gap-3">
          <Avatar nombre="María P." emoji="🌸" color="rosa" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-destacado text-texto">María P.</span>
            <span className="truncate text-secundario text-texto-secundario">3 pedidos · RD$5,400</span>
          </div>
        </div>
        <BloqueDeuda animado saldo={saldo} total={EJEMPLO_ABONO.total} fecha={fecha} ahora={ahora} />
      </Tarjeta>
      <div className="pl-ab-zona">
        {e.fase === "campo" ? (
          <>
            <CampoMonto etiqueta="Monto del abono" valor={ESCRITO.slice(0, e.digitos)} alCambiar={() => {}} />
            <div className="pl-ab-boton">
              <Boton soloVista anchoCompleto>
                Guardar abono
              </Boton>
              {e.toque === "guardar" && <span className="pl-toque" />}
            </div>
          </>
        ) : (
          <div className="pl-ab-boton">
            <Boton soloVista anchoCompleto jerarquia={e.fase === "guardado" ? "secundario" : "principal"}>
              {e.fase === "guardado" ? "Anotar otro abono" : "Anotar abono"}
            </Boton>
            {e.toque === "anotar" && <span className="pl-toque" />}
          </div>
        )}
      </div>
    </div>
  );
}
