"use client";

import { useEffect, useRef, useState } from "react";
import { diaCorto, diaDeSantoDomingo, enlaceWhatsAppCliente, mensajeRecordatorio, nombreMetodo } from "@/lib/credito";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import type { Abono, Cliente, PedidoConItems } from "@/lib/types";
import { IconoCheck, IconoMas, IconoMoneda, IconoWhatsApp } from "../iconos";
import { useToast } from "../toast";
import { BarraPago, LineaFecha } from "./comunes";
import { diaDeOpcion, SelectorFechaPago, type FechaPago } from "./campos-pago";
import { HojaAbono } from "./hoja-abono";
import { TarjetaSaldado } from "./tarjeta-saldado";

const DIA_MS = 24 * 60 * 60 * 1000;
/** Un pedido saldado hace más de esto ya no se celebra al abrirlo. */
const CELEBRAR_HASTA_MS = 3 * DIA_MS;
const CLAVE_SALDADO = (pedidoId: string) => `deslizapp-saldado-visto-${pedidoId}`;

function yaSeVio(pedidoId: string) {
  try {
    return localStorage.getItem(CLAVE_SALDADO(pedidoId)) !== null;
  } catch {
    return false;
  }
}
function marcarVisto(pedidoId: string) {
  try {
    localStorage.setItem(CLAVE_SALDADO(pedidoId), "1");
  } catch {
    // Sin almacenamiento, la tarjeta puede repetirse: no pasa nada.
  }
}

const ACCION_PRINCIPAL = "tocable flex h-12 items-center justify-center gap-2 rounded-full bg-bosque text-[15px] font-extrabold text-papel disabled:opacity-60";
const ACCION_SECUNDARIA = "tocable flex h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-bosque text-[15px] font-extrabold text-bosque disabled:opacity-60";

/**
 * "Pago" del detalle del pedido (referencias/credito-abonos/Pedido.dc.html). A crédito: "Debe" en grande, lo pagado, la barra,
 * cuándo quedó en pagar y la lista de abonos (cada uno se puede borrar con confirmación), con "+ Registrar abono" y "Recordarle
 * por WhatsApp". De contado: una línea "Pagado" y "Cambiar a crédito". Al saldarse, la tarjeta verde con confeti (una sola vez).
 */
export function PagoDelPedido({ pedido, cliente }: { pedido: PedidoConItems; cliente: Cliente | null }) {
  const { eliminarAbono, cambiarPagoPedido, getDueno } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));
  const toast = useToast();
  const [abonando, setAbonando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [fecha, setFecha] = useState<FechaPago>({ opcion: "sin", dia: null });

  const credito = pedido.pagoModo === "credito";
  const cancelado = pedido.estado === "cancelado";
  const saldado = credito && !cancelado && pedido.total > 0 && pedido.saldo === 0 && pedido.abonos.length > 0;

  // Celebración: cuando el pedido pasa de deber a saldado con esta pantalla abierta, o al abrirlo si se saldó hace poco y aún no se vio.
  const [celebrar, setCelebrar] = useState(false);
  const antes = useRef<{ id: string; saldo: number } | null>(null);
  useEffect(() => {
    const previo = antes.current;
    antes.current = { id: pedido.id, saldo: pedido.saldo };
    if (!saldado) return;
    const ultimo = pedido.abonos.reduce((m, a) => (a.creadoEn > m ? a.creadoEn : m), "");
    const reciente = Date.now() - Date.parse(ultimo) < CELEBRAR_HASTA_MS;
    const acabaDeSaldarse = previo !== null && previo.id === pedido.id && previo.saldo > 0;
    if (acabaDeSaldarse || (previo === null && reciente && !yaSeVio(pedido.id))) {
      marcarVisto(pedido.id);
      setCelebrar(true);
    }
  }, [pedido.id, pedido.saldo, pedido.abonos, saldado]);

  const correr = async (accion: () => Promise<void>, error: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      toast(mensajeDeError(e, error));
    } finally {
      setOcupado(false);
    }
  };

  const borrar = (a: Abono) =>
    correr(async () => {
      await eliminarAbono(tiendaId, a.id);
      setBorrando(null);
      toast(`Abono borrado. La deuda subió ${formatearPesos(a.monto)}.`);
    }, "No se pudo borrar el abono. Inténtalo otra vez.");

  const pasarACredito = () =>
    correr(async () => {
      await cambiarPagoPedido(tiendaId, pedido.id, { pagoModo: "credito", pagoFechaAcordada: diaDeOpcion(fecha.opcion, fecha.dia) });
      setCambiando(false);
      toast(`Pedido #${pedido.numero} quedó a crédito.`);
    }, "No se pudo cambiar el pago. Inténtalo otra vez.");

  const vendedora = dueno?.nombre ?? "";
  const nombreTienda = tienda?.nombre ?? "la tienda";

  // ---- De contado ----
  if (!credito) {
    if (cancelado) return null;
    return (
      <div className="rounded-[20px] border border-linea bg-white px-3.5 py-2">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-suave">
            <IconoCheck tamano={16} strokeWidth={2.6} className="text-bosque" />
            Pagado
          </p>
          {!cambiando && (
            <button type="button" onClick={() => setCambiando(true)} className="tocable flex h-11 items-center px-1 text-[13.5px] font-extrabold text-bosque">
              Cambiar a crédito
            </button>
          )}
        </div>
        {cambiando && (
          <div role="group" aria-label="Cambiar a crédito" className="mov-aparece flex flex-col gap-3 border-t border-arena pt-3 pb-1">
            <p className="text-[14px] font-bold">¿Dejar este pedido a crédito? Quedará debiendo {formatearPesos(pedido.total)}.</p>
            <SelectorFechaPago valor={fecha} alCambiar={setFecha} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pasarACredito}
                disabled={ocupado || (fecha.opcion === "otra" && diaDeOpcion("otra", fecha.dia) === null)}
                className="tocable h-11 flex-1 rounded-full bg-bosque text-sm font-extrabold text-papel disabled:opacity-60"
              >
                Sí, dejarlo a crédito
              </button>
              <button
                type="button"
                onClick={() => setCambiando(false)}
                disabled={ocupado}
                className="tocable h-11 flex-1 rounded-full border-[1.5px] border-bosque text-sm font-extrabold text-bosque"
              >
                Mejor no
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- A crédito ----
  if (cancelado && pedido.abonos.length === 0) return null;
  const recordatorio =
    cliente?.telefono && pedido.saldo > 0
      ? enlaceWhatsAppCliente(cliente.telefono, mensajeRecordatorio({ cliente: cliente.nombre, vendedora, tienda: nombreTienda, deuda: pedido.saldo }))
      : null;

  return (
    <>
      {celebrar && saldado && (
        <TarjetaSaldado pedido={pedido} nombreCliente={cliente?.nombre ?? ""} telefono={cliente?.telefono ?? null} vendedora={vendedora} tienda={nombreTienda} />
      )}

      <section aria-label="Pago del pedido" className="rounded-[20px] border border-linea bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[19px]">Pago</h2>
          {saldado ? (
            <span className="flex h-[26px] items-center gap-1 rounded-full bg-menta px-2.5 text-xs font-extrabold">
              <IconoCheck tamano={13} strokeWidth={3} />
              Pagado
            </span>
          ) : (
            <span className="flex h-[26px] items-center rounded-full bg-rosa px-2.5 text-xs font-extrabold">A crédito</span>
          )}
        </div>

        <div aria-live="polite" className="mt-3">
          <div className="flex items-baseline justify-between gap-3 text-[13px] text-suave">
            <span>{cancelado ? "Cancelado: no genera deuda" : "Debe"}</span>
            <span className="text-right">
              Pagó {formatearPesos(pedido.pagado)} de {formatearPesos(pedido.total)}
            </span>
          </div>
          <p className={`font-display text-[38px] leading-[1.1] ${pedido.saldo > 0 ? "text-mandarina-texto" : "text-bosque"}`}>{formatearPesos(pedido.saldo)}</p>
        </div>
        <div className="mt-2.5">
          <BarraPago pagado={pedido.pagado} total={pedido.total} saldado={saldado} />
        </div>
        {!saldado && !cancelado && (
          <div className="mt-2.5">
            <LineaFecha fecha={pedido.pagoFechaAcordada} />
          </div>
        )}

        {pedido.abonos.length > 0 && (
          <ul className="mt-3">
            {pedido.abonos.map((a) => (
              <li key={a.id} className="border-t border-linea">
                {borrando === a.id ? (
                  <div role="alertdialog" aria-label="Borrar abono" className="my-2.5 rounded-[18px] bg-arena px-4 py-3">
                    <p className="text-sm font-bold">¿Borrar este abono? La deuda vuelve a subir {formatearPesos(a.monto)}.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => borrar(a)} disabled={ocupado} className="tocable h-11 flex-1 rounded-full border-[1.5px] border-peligro bg-transparent text-sm font-extrabold text-peligro disabled:opacity-60">
                        Sí, borrar
                      </button>
                      <button
                        type="button"
                        onClick={() => setBorrando(null)}
                        disabled={ocupado}
                        className="tocable h-11 flex-1 rounded-full border-[1.5px] border-bosque text-sm font-extrabold text-bosque"
                      >
                        Mejor no
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-menta text-bosque">
                      <IconoMoneda tamano={18} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-bold">Abono · {nombreMetodo(a.metodo)}</span>
                      <span className="text-[12.5px] text-suave">
                        {fechaDelAbono(a)}
                        {a.nota ? ` · ${a.nota}` : ""}
                      </span>
                    </div>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-[15px] font-extrabold">{formatearPesos(a.monto)}</span>
                      <button
                        type="button"
                        onClick={() => setBorrando(a.id)}
                        aria-label={`Borrar el abono de ${formatearPesos(a.monto)} del ${fechaDelAbono(a)}`}
                        className="tocable relative flex h-5 items-center text-[12.5px] font-bold text-suave before:absolute before:-inset-x-3 before:-inset-y-3 before:content-['']"
                      >
                        Borrar
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {!cancelado && pedido.saldo > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={() => setAbonando(true)} className={ACCION_PRINCIPAL}>
              <IconoMas tamano={18} strokeWidth={2.6} />
              Registrar abono
            </button>
            {recordatorio && (
              <a href={recordatorio} target="_blank" rel="noreferrer" className={ACCION_SECUNDARIA}>
                <IconoWhatsApp tamano={18} />
                Recordarle por WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      {pedido.clienteId && (
        <HojaAbono
          abierta={abonando}
          alCerrar={() => setAbonando(false)}
          clienteId={pedido.clienteId}
          nombreCliente={cliente?.nombre ?? "El cliente"}
          pedidoId={pedido.id}
          numeroPedido={pedido.numero}
          deuda={pedido.saldo}
        />
      )}
    </>
  );
}

/** "22 sep" del abono (día de Santo Domingo). */
function fechaDelAbono(a: Abono): string {
  return diaCorto(diaDeSantoDomingo(Date.parse(a.fecha)));
}
