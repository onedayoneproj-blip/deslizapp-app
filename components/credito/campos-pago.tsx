"use client";

import { useState } from "react";
import { diaCorto, diaDeSantoDomingo, esDiaValido, finDeMes, METODOS, montoDeTexto, sumarDias } from "@/lib/credito";
import type { DatosPago } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { MetodoAbono, PagoModo } from "@/lib/types";
import { Chip, GrupoOpciones, Segmentos } from "../controles";
import { CLASE_CAMPO } from "../pedidos/selector-descuento";

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

/** Lo escrito, solo dígitos (sin comas, sin decimales, sin negativos, sin ceros a la izquierda; hasta 8 cifras). */
export const soloDigitos = (texto: string) => texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 8);

/** Lo escrito con comas de miles ("1500" → "1,500"). */
const conComas = (digitos: string) => (digitos === "" ? "" : Number(digitos).toLocaleString("en-US"));

/**
 * "¿Cuándo quedó en pagar?": pastillas En 1 semana / Fin de mes / Elegir fecha / Sin fecha. Con "Elegir fecha" aparece el
 * campo de fecha (un día que no haya pasado). La pastilla elegida muestra el día ("15 oct").
 */
export function SelectorFechaPago({ valor, alCambiar }: { valor: FechaPago; alCambiar: (f: FechaPago) => void }) {
  const dia = diaDeOpcion(valor.opcion, valor.dia);
  const texto = (opcion: OpcionFecha, normal: string) => (valor.opcion === opcion && dia ? diaCorto(dia) : normal);
  const elegir = (opcion: OpcionFecha) => alCambiar({ opcion, dia: opcion === "otra" ? (valor.dia ?? sumarDias(hoy(), 14)) : diaDeOpcion(opcion, null) });
  return (
    <div>
      <p className="mb-2 text-[13px] text-suave">¿Cuándo quedó en pagar?</p>
      <GrupoOpciones etiqueta="Cuándo quedó en pagar">
        <Chip tono="opcion" elegido={valor.opcion === "semana"} onClick={() => elegir("semana")}>
          {texto("semana", "En 1 semana")}
        </Chip>
        <Chip tono="opcion" elegido={valor.opcion === "mes"} onClick={() => elegir("mes")}>
          {texto("mes", "Fin de mes")}
        </Chip>
        <Chip tono="opcion" elegido={valor.opcion === "otra"} onClick={() => elegir("otra")}>
          {texto("otra", "Elegir fecha")}
        </Chip>
        <Chip tono="opcion" elegido={valor.opcion === "sin"} onClick={() => alCambiar({ opcion: "sin", dia: null })}>
          Sin fecha
        </Chip>
      </GrupoOpciones>
      {valor.opcion === "otra" && (
        <label className="mt-3 flex min-w-0 flex-col gap-1.5 text-[13.5px] font-bold">
          Día para pagar
          <input
            type="date"
            value={valor.dia ?? ""}
            min={hoy()}
            onChange={(e) => alCambiar({ opcion: "otra", dia: e.target.value || null })}
            className={`${CLASE_CAMPO} max-w-full appearance-none`}
          />
          {!dia && <span className="text-[12.5px] font-semibold text-peligro">Elige un día que no haya pasado, o toca «Sin fecha».</span>}
        </label>
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
    <div className="flex flex-col gap-3.5 rounded-[20px] border border-linea bg-white px-3.5 py-3.5">
      <h2 className="font-display text-[19px]">¿Cómo te paga?</h2>
      <Segmentos
        etiqueta="Cómo paga el cliente"
        tono="opcion"
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
        <p role="alert" className="rounded-2xl bg-mandarina/20 px-3.5 py-2.5 text-[13.5px] font-semibold">
          {aviso}
        </p>
      )}

      {valor.modo === "credito" && (
        <div className="mov-aparece flex flex-col gap-3.5">
          {!conAbonos && (
            <>
              <label className="block rounded-[20px] border-[1.5px] border-borde bg-white px-3.5 py-2.5 focus-within:border-bosque">
                <span className="text-[12.5px] text-suave">Te dio ahora (opcional)</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-display text-[22px] text-suave">RD$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder="0"
                    value={conComas(valor.dio)}
                    onChange={(e) => alCambiar({ ...valor, dio: soloDigitos(e.target.value) })}
                    aria-label="Te dio ahora, en pesos (opcional)"
                    aria-invalid={pasaDelTotal || undefined}
                    className="min-w-0 flex-1 bg-transparent font-display text-[28px] text-bosque outline-none placeholder:text-apagado"
                  />
                </span>
              </label>
              {pasaDelTotal && <p className="-mt-1.5 text-[12.5px] font-semibold text-peligro">Lo que te dio no puede ser más que el total ({formatearPesos(total)}).</p>}
              {dio > 0 && !pasaDelTotal && (
                <div className="mov-aparece">
                  <p className="mb-2 text-[13px] text-suave">¿Cómo te lo dio?</p>
                  <GrupoOpciones etiqueta="Cómo te lo dio">
                    {METODOS.map((m) => (
                      <Chip key={m.id} tono="opcion" elegido={valor.metodo === m.id} onClick={() => alCambiar({ ...valor, metodo: m.id })}>
                        {m.texto}
                      </Chip>
                    ))}
                  </GrupoOpciones>
                </div>
              )}
            </>
          )}
          {saldaTodo ? (
            <p aria-live="polite" className="mov-aparece rounded-2xl bg-menta px-3.5 py-3 text-[14px] font-bold">
              Con eso queda pagado: el pedido se guarda como «Pagó todo».
            </p>
          ) : (
            <>
              <SelectorFechaPago valor={valor.fecha} alCambiar={(f) => alCambiar({ ...valor, fecha: f })} />
              <p aria-live="polite" className="rounded-2xl bg-mandarina/10 px-3.5 py-3 text-[14px] leading-snug">
                Queda debiendo <b className="text-mandarina-texto">{formatearPesos(debe)}</b>.
                {fecha ? ` Te aviso el ${diaCorto(fecha)} si no ha pagado.` : ""}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
