"use client";

import { useState } from "react";
import { diaCorto, diaDeSantoDomingo, nombreMetodo } from "@/lib/credito";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import type { Abono } from "@/lib/types";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { Alerta, Boton } from "../ui";
import { HojaAbono } from "./hoja-abono";

/**
 * Hoja "Abono" (se apila sobre el detalle del pedido): el monto en grande, cómo y cuándo pagó, la nota y a qué pedido se aplicó.
 * Abajo, "Editar abono" (abre la hoja de registrar abonos ya llena) y "Borrar abono" (terciario peligro, con su Alerta).
 * `abono` es el que se muestra; `maximo` = saldo del pedido + monto del abono (lo más que puede valer al editarlo).
 */
export function HojaDetalleAbono({
  abono,
  alCerrar,
  numeroPedido,
  clienteId,
  nombreCliente,
  saldoPedido,
}: {
  abono: Abono | null;
  alCerrar: () => void;
  numeroPedido: number;
  clienteId: string;
  nombreCliente: string;
  saldoPedido: number;
}) {
  const { eliminarAbono } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  // Se recuerda el último abono mostrado para que la hoja no se vacíe mientras se cierra
  const [ultimo, setUltimo] = useState<Abono | null>(abono);
  if (abono && abono !== ultimo) setUltimo(abono);
  const a = abono ?? ultimo;

  const borrar = async () => {
    if (!a) return;
    try {
      await eliminarAbono(tiendaId, a.id);
      setBorrando(false);
      alCerrar();
      toast(`Abono borrado. La deuda subió ${formatearPesos(a.monto)}.`);
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo borrar el abono. Inténtalo otra vez."));
    }
  };

  return (
    <>
      <Hoja abierta={abono !== null} alCerrar={alCerrar} titulo="Abono">
        {a && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-secundario text-texto-secundario">Monto</p>
              <p className="font-display text-cifra">{formatearPesos(a.monto)}</p>
            </div>
            <dl className="overflow-hidden rounded-radio-l border border-linea bg-superficie">
              <Dato titulo="Cómo pagó" valor={nombreMetodo(a.metodo)} />
              <Dato titulo="Fecha" valor={diaCorto(diaDeSantoDomingo(Date.parse(a.fecha)))} />
              <Dato titulo="Aplicado al" valor={`Pedido #${numeroPedido}`} />
              {a.nota && <Dato titulo="Nota" valor={a.nota} />}
            </dl>
            <div className="flex flex-col gap-1">
              <Boton jerarquia="secundario" anchoCompleto onClick={() => setEditando(true)}>
                Editar abono
              </Boton>
              <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={() => setBorrando(true)}>
                Borrar abono
              </Boton>
            </div>
          </div>
        )}
      </Hoja>

      <Alerta
        abierta={borrando}
        titulo="¿Borrar este abono?"
        descripcion={`La deuda vuelve a subir ${formatearPesos(a?.monto ?? 0)}.`}
        accion={{ texto: "Borrar abono", tono: "peligro", alConfirmar: borrar }}
        alCancelar={() => setBorrando(false)}
      />

      {a && (
        <HojaAbono
          abierta={editando && abono !== null}
          alCerrar={() => setEditando(false)}
          clienteId={clienteId}
          nombreCliente={nombreCliente}
          pedidoId={a.pedidoId}
          numeroPedido={numeroPedido}
          deuda={saldoPedido + a.monto}
          abono={a}
        />
      )}
    </>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-linea px-4 py-3 first:border-t-0">
      <dt className="shrink-0 text-secundario text-texto-secundario">{titulo}</dt>
      <dd className="min-w-0 text-right text-cuerpo font-bold break-words text-texto">{valor}</dd>
    </div>
  );
}
