"use client";

import { useMemo, useState } from "react";
import { METODOS, montoDeTexto } from "@/lib/credito";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { diaLocal, fechaDeVenta } from "@/lib/venta-pasada";
import type { Abono, MetodoAbono } from "@/lib/types";
import { Chip } from "../controles";
import { Hoja } from "../hoja";
import { IconoCheckCirculo } from "../iconos";
import { useToast } from "../toast";
import { CLASE_CAMPO } from "../pedidos/selector-descuento";
import { soloDigitos } from "./campos-pago";

const NOTA_MAX = 200;
const RAPIDOS = [500, 1000];

/**
 * Hoja "Registrar abono" (referencias/credito-abonos/Abono.dc.html). Con `pedidoId` el abono va a ese pedido; sin él (desde la
 * cuenta del cliente) se reparte entre sus pedidos a crédito, del más viejo al más nuevo. `deuda` es lo que se debe en ese
 * alcance (el pedido o todo el cliente). Lleva un campo de texto: hoja "grande" (la hoja no cambia con el teclado).
 */
export function HojaAbono({
  abierta,
  alCerrar,
  clienteId,
  nombreCliente,
  pedidoId,
  numeroPedido,
  pedidos = 1,
  deuda,
  alGuardar,
}: {
  abierta: boolean;
  alCerrar: () => void;
  clienteId: string;
  nombreCliente: string;
  pedidoId?: string;
  numeroPedido?: number;
  /** Cuántos pedidos a crédito con saldo tiene el cliente (solo cuando no hay pedido fijo). */
  pedidos?: number;
  deuda: number;
  /** Los abonos creados (uno por pedido al que se aplicó). */
  alGuardar?: (abonos: Abono[]) => void;
}) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Registrar abono" altura="grande">
      <Formulario
        clienteId={clienteId}
        nombreCliente={nombreCliente}
        pedidoId={pedidoId}
        numeroPedido={numeroPedido}
        pedidos={pedidos}
        deuda={deuda}
        alGuardar={alGuardar}
        alCerrar={alCerrar}
      />
    </Hoja>
  );
}

function Formulario({
  clienteId,
  nombreCliente,
  pedidoId,
  numeroPedido,
  pedidos,
  deuda,
  alGuardar,
  alCerrar,
}: {
  clienteId: string;
  nombreCliente: string;
  pedidoId?: string;
  numeroPedido?: number;
  pedidos: number;
  deuda: number;
  alGuardar?: (abonos: Abono[]) => void;
  alCerrar: () => void;
}) {
  const { registrarAbono } = useData();
  const { tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [texto, setTexto] = useState("");
  const [metodo, setMetodo] = useState<MetodoAbono>("efectivo");
  const [dia, setDia] = useState(() => diaLocal());
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const monto = montoDeTexto(texto);
  const pasaDeLaDeuda = monto > deuda;
  const resta = deuda - monto;
  const fecha = fechaDeVenta(dia);
  const puedeGuardar = monto > 0 && !pasaDeLaDeuda && fecha !== null && !guardando;
  const primerNombre = nombreCliente.split(" ")[0] ?? nombreCliente;

  // Botones rápidos: solo los que no superan lo que se debe, sin repetir (Todo, Mitad y montos fijos)
  const rapidos = useMemo(() => {
    const lista: { texto: string; monto: number }[] = [{ texto: `Todo · ${formatearPesos(deuda)}`, monto: deuda }];
    const mitad = Math.floor(deuda / 2);
    if (mitad > 0 && mitad < deuda) lista.push({ texto: `Mitad · ${formatearPesos(mitad)}`, monto: mitad });
    for (const m of RAPIDOS) if (m < deuda && !lista.some((r) => r.monto === m)) lista.push({ texto: formatearPesos(m), monto: m });
    return lista;
  }, [deuda]);

  const guardar = async () => {
    if (!puedeGuardar || fecha === null) return;
    setGuardando(true);
    try {
      // Hoy = ahora; un día pasado = mediodía de ese día (nunca una fecha futura)
      const abonos = await registrarAbono({
        tiendaId,
        clienteId,
        monto,
        metodo,
        fecha: dia === diaLocal() ? undefined : fecha,
        nota: nota.trim() || null,
        pedidoId,
      });
      toast("Abono guardado");
      alGuardar?.(abonos);
      alCerrar();
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar el abono. Inténtalo otra vez."));
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-suave">
        {primerNombre} debe <b className="text-bosque">{formatearPesos(deuda)}</b>{" "}
        {pedidoId ? `del pedido #${numeroPedido}` : pedidos === 1 ? "en 1 pedido" : `en ${pedidos} pedidos`}
      </p>

      <label className="block rounded-[22px] border-[1.5px] border-borde bg-white px-4 py-3.5 focus-within:border-bosque">
        <span className="text-[13px] text-suave">¿Cuánto te pagó?</span>
        <span className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-display text-[26px] text-suave">RD$</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0"
            value={texto === "" ? "" : Number(texto).toLocaleString("en-US")}
            onChange={(e) => setTexto(soloDigitos(e.target.value))}
            aria-label="Monto del abono, en pesos"
            aria-invalid={pasaDeLaDeuda || undefined}
            className="min-w-0 flex-1 bg-transparent font-display text-[44px] leading-tight text-bosque outline-none placeholder:text-apagado"
          />
        </span>
      </label>
      {pasaDeLaDeuda && (
        <p role="alert" className="-mt-2 text-[13px] font-semibold text-peligro">
          Te debe {formatearPesos(deuda)}; no puedes abonar más que eso.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {rapidos.map((r) => (
          <Chip key={r.texto} elegido={monto === r.monto} onClick={() => setTexto(String(r.monto))}>
            {r.texto}
          </Chip>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[13px] text-suave">¿Cómo te pagó?</p>
        <div className="flex flex-wrap gap-2">
          {METODOS.map((m) => (
            <Chip key={m.id} elegido={metodo === m.id} onClick={() => setMetodo(m.id)}>
              {m.texto}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-bold text-suave">
          Fecha
          <input type="date" value={dia} max={diaLocal()} onChange={(e) => setDia(e.target.value)} className={`${CLASE_CAMPO} max-w-full appearance-none font-normal`} />
          {fecha === null && <span className="text-[12.5px] font-semibold text-peligro">Elige un día que ya pasó (hoy también vale).</span>}
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-bold text-suave">
          Nota (opcional)
          <input
            type="text"
            value={nota}
            maxLength={NOTA_MAX}
            onChange={(e) => setNota(e.target.value.slice(0, NOTA_MAX))}
            placeholder="Ej. le di cambio"
            enterKeyHint="done"
            className={`${CLASE_CAMPO} font-normal placeholder:text-apagado`}
          />
        </label>
      </div>

      <div aria-live="polite" className="empty:-mt-4">
        {monto > 0 && !pasaDeLaDeuda && resta === 0 && (
          <p className="mov-aparece flex items-center gap-2.5 rounded-2xl bg-menta px-3.5 py-3 text-[14px] font-bold">
            <IconoCheckCirculo tamano={18} className="shrink-0 text-bosque" />
            Con este abono queda saldado
          </p>
        )}
        {monto > 0 && !pasaDeLaDeuda && resta > 0 && (
          <p className="mov-aparece rounded-2xl bg-arena px-3.5 py-3 text-[14px]">
            Después de este abono debe <b>{formatearPesos(resta)}</b>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="tocable flex h-14 items-center justify-center rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-50"
      >
        Guardar abono
      </button>
    </div>
  );
}
