"use client";

import { useState } from "react";
import { diaCorto, diaDeSantoDomingo, esDiaValido, finDeMes, METODOS, montoDeTexto, sumarDias } from "@/lib/credito";
import type { DatosPago } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { MetodoAbono, PagoModo } from "@/lib/types";
import { Aviso, Campo, CampoMonto, GrupoOpciones, soloDigitos, Tarjeta } from "../ui";

/** Cuándo quedó en pagar: una de las pastillas o un día elegido. */
export type OpcionFecha = "semana" | "mes" | "otra" | "sin";
export type FechaPago = { opcion: OpcionFecha; dia: string | null };

/** Lo que se ve y escribe en "¿Cómo te paga?". El monto va como texto (lo que escribe la persona). */
export type EstadoPago = {
  modo: PagoModo;
  /** "Te dio ahora": lo escrito, solo dígitos. */
  dio: string;
  metodo: MetodoAbono;
  fecha: FechaPago;
};

const hoy = () => diaDeSantoDomingo(Date.now());

/** El día que corresponde a cada pastilla ("En 1 semana" = hoy + 7; "Fin de mes" = último día de este mes). */
export function diaDeOpcion(opcion: OpcionFecha, elegido: string | null): string | null {
  if (opcion === "semana") return sumarDias(hoy(), 7);
  if (opcion === "mes") return finDeMes(hoy());
  if (opcion === "otra") return elegido && esDiaValido(elegido) ? elegido : null;
  return null;
}

/** De la fecha que ya tiene un pedido a la pastilla que la representa ("otra" si no es ninguna de las dos). */
export function fechaDeDia(dia: string | null): FechaPago {
  if (!dia) return { opcion: "sin", dia: null };
  if (dia === sumarDias(hoy(), 7)) return { opcion: "semana", dia };
  if (dia === finDeMes(hoy())) return { opcion: "mes", dia };
  return { opcion: "otra", dia };
}

export const PAGO_INICIAL: EstadoPago = { modo: "contado", dio: "", metodo: "efectivo", fecha: { opcion: "sin", dia: null } };

/** Lo que el formulario manda a la capa de datos sobre el pago. */
export function datosDePago(p: EstadoPago, permiteAbono = true): DatosPago {
  if (p.modo !== "credito") return { pagoModo: "contado" };
  const dio = montoDeTexto(p.dio);
  return {
    pagoModo: "credito",
    pagoFechaAcordada: diaDeOpcion(p.fecha.opcion, p.fecha.dia),
    abonoInicial: permiteAbono && dio > 0 ? { monto: dio, metodo: p.metodo } : null,
  };
}

export { soloDigitos };

/**
 * "¿Cuándo quedó en pagar?": pastillas En 1 semana / Fin de mes / Elegir fecha / Sin fecha. Con "Elegir fecha" aparece el
 * campo de fecha (un día que no haya pasado). La pastilla elegida muestra el día ("15 oct").
 */
export function SelectorFechaPago({ valor, alCambiar }: { valor: FechaPago; alCambiar: (f: FechaPago) => void }) {
  const dia = diaDeOpcion(valor.opcion, valor.dia);
  const texto = (opcion: OpcionFecha, normal: string) => (valor.opcion === opcion && dia ? diaCorto(dia) : normal);
  const elegir = (opcion: OpcionFecha) => alCambiar({ opcion, dia: opcion === "otra" ? (valor.dia ?? sumarDias(hoy(), 14)) : diaDeOpcion(opcion, null) });
  return (
    <div className="flex flex-col gap-3">
      <GrupoOpciones
        titulo="¿Cuándo quedó en pagar?"
        valor={valor.opcion}
        alCambiar={(o) => (o === "sin" ? alCambiar({ opcion: "sin", dia: null }) : elegir(o))}
        opciones={[
          { id: "semana", texto: texto("semana", "En 1 semana") },
          { id: "mes", texto: texto("mes", "Fin de mes") },
          { id: "otra", texto: texto("otra", "Elegir fecha") },
          { id: "sin", texto: "Sin fecha" },
        ]}
      />
      {valor.opcion === "otra" && (
        <Campo
          etiqueta="Día para pagar"
          type="date"
          value={valor.dia ?? ""}
          min={hoy()}
          onChange={(e) => alCambiar({ opcion: "otra", dia: e.target.value || null })}
          className="[&_input]:max-w-full [&_input]:appearance-none"
          error={!dia ? "Elige un día que no haya pasado, o toca «Sin fecha»." : undefined}
        />
      )}
    </div>
  );
}

/**
 * "¿Cómo te paga?" de "+ Pedido", la venta pasada y "Editar pedido" (referencias/credito-abonos/Main.dc.html):
 * "Pagó todo" / "A crédito"; a crédito, cuánto dio ahora (opcional), cómo, cuándo quedó en pagar y cuánto queda debiendo.
 * - `pagado`: lo que ya pagó un pedido que se edita (sus abonos). Con abonos no se puede volver a "Pagó todo" y no se pide "Te dio ahora".
 * - `alDarMonto`: el error de lo que dio ahora (más que el total) lo calcula el formulario, que ya sabe el total.
 */
export function CamposPago({
  valor,
  alCambiar,
  total,
  pagado = 0,
  conAbonos = false,
}: {
  valor: EstadoPago;
  alCambiar: (v: EstadoPago) => void;
  total: number;
  pagado?: number;
  conAbonos?: boolean;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const dio = montoDeTexto(valor.dio);
  const fecha = diaDeOpcion(valor.fecha.opcion, valor.fecha.dia);
  const pasaDelTotal = dio > total;
  const debe = Math.max(0, total - pagado - (conAbonos ? 0 : dio));
  const saldaTodo = !conAbonos && dio === total && total > 0;

  return (
    <Tarjeta>
      <div className="flex flex-col gap-3.5">
        <GrupoOpciones
          titulo="¿Cómo te paga?"
          valor={valor.modo}
          alCambiar={(modo) => {
            if (modo === "contado" && conAbonos) {
              setAviso("Este pedido ya tiene abonos, así que no puede pasar a «Pagó todo». Borra primero sus abonos desde el detalle del pedido.");
              return;
            }
            setAviso(null);
            alCambiar({ ...valor, modo });
          }}
          opciones={[
            { id: "contado", texto: "Pagó todo" },
            { id: "credito", texto: "A crédito" },
          ]}
        />
        {aviso && (
          <div role="alert">
            <Aviso tono="atencion">{aviso}</Aviso>
          </div>
        )}

        {valor.modo === "credito" && (
          <div className="mov-aparece flex flex-col gap-3.5">
            {!conAbonos && (
              <>
                <CampoMonto
                  etiqueta="Te dio ahora (opcional)"
                  etiquetaAccesible="Te dio ahora, en pesos (opcional)"
                  valor={valor.dio}
                  alCambiar={(dio) => alCambiar({ ...valor, dio })}
                  error={pasaDelTotal ? `Lo que te dio no puede ser más que el total (${formatearPesos(total)}).` : undefined}
                />
                {dio > 0 && !pasaDelTotal && (
                  <div className="mov-aparece">
                    <GrupoOpciones
                      titulo="¿Cómo te lo dio?"
                      valor={valor.metodo}
                      alCambiar={(metodo) => alCambiar({ ...valor, metodo })}
                      opciones={METODOS.map((m) => ({ id: m.id, texto: m.texto }))}
                    />
                  </div>
                )}
              </>
            )}
            {saldaTodo ? (
              <div aria-live="polite" className="mov-aparece">
                <Aviso tono="exito">Con eso queda pagado: el pedido se guarda como «Pagó todo».</Aviso>
              </div>
            ) : (
              <>
                <SelectorFechaPago valor={valor.fecha} alCambiar={(f) => alCambiar({ ...valor, fecha: f })} />
                <div aria-live="polite">
                  <Aviso tono="atencion">
                    Queda debiendo <b className="text-atencion-texto">{formatearPesos(debe)}</b>.
                    {fecha ? ` Te aviso el ${diaCorto(fecha)} si no ha pagado.` : ""}
                  </Aviso>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
