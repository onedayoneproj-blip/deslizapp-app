"use client";

import { useEffect, useRef, useState } from "react";
import { diaCorto, diaDeSantoDomingo, enlaceWhatsAppCliente, mensajeRecordatorio, nombreMetodo } from "@/lib/credito";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import type { Abono, Cliente, PedidoConItems } from "@/lib/types";
import { IconoCheck, IconoMas, IconoMoneda, IconoWhatsApp } from "../iconos";
import { Alerta, Boton, Etiqueta, Tarjeta } from "../ui";
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
      <div className="rounded-radio-l border border-linea bg-superficie px-4 py-2">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-secundario font-bold text-texto-secundario">
            <IconoCheck tamano={16} strokeWidth={2.6} className="text-texto" />
            Pagado
          </p>
          {!cambiando && (
            <Boton jerarquia="terciario" tamano="compacto" className="-mr-2" onClick={() => setCambiando(true)}>
              Cambiar a crédito
            </Boton>
          )}
        </div>
        {cambiando && (
          <div role="group" aria-label="Cambiar a crédito" className="mov-aparece flex flex-col gap-3 border-t border-linea pt-3 pb-1">
            <p className="text-secundario font-bold">¿Dejar este pedido a crédito? Quedará debiendo {formatearPesos(pedido.total)}.</p>
            <SelectorFechaPago valor={fecha} alCambiar={setFecha} />
            <div className="grid grid-cols-2 gap-3">
              <Boton jerarquia="secundario" anchoCompleto onClick={() => setCambiando(false)} deshabilitado={ocupado}>
                Cancelar
              </Boton>
              <Boton anchoCompleto onClick={pasarACredito} deshabilitado={ocupado || (fecha.opcion === "otra" && diaDeOpcion("otra", fecha.dia) === null)}>
                A crédito
              </Boton>
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

      <section aria-label="Pago del pedido">
        <Tarjeta>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-titulo-seccion">Pago</h2>
            {saldado ? (
              <Etiqueta tono="exito" icono={<IconoCheck tamano={14} strokeWidth={3} />}>
                Pagado
              </Etiqueta>
            ) : (
              <Etiqueta>A crédito</Etiqueta>
            )}
          </div>

          <div aria-live="polite" className="mt-3">
            <div className="flex items-baseline justify-between gap-3 text-secundario text-texto-secundario">
              <span>{cancelado ? "Cancelado: no genera deuda" : "Debe"}</span>
              <span className="text-right">
                Pagó {formatearPesos(pedido.pagado)} de {formatearPesos(pedido.total)}
              </span>
            </div>
            <p className={`font-display text-cifra ${pedido.saldo > 0 ? "text-atencion-texto" : "text-texto"}`}>{formatearPesos(pedido.saldo)}</p>
          </div>
          <div className="mt-2.5">
            <BarraPago pagado={pedido.pagado} total={pedido.total} />
          </div>
          {!saldado && !cancelado && (
            <div className="mt-2.5">
              <LineaFecha fecha={pedido.pagoFechaAcordada} />
            </div>
          )}

          {pedido.abonos.length > 0 && (
            <ul className="mt-3">
              {pedido.abonos.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-t border-linea py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accion-suave text-texto">
                    <IconoMoneda tamano={18} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-secundario font-bold">Abono · {nombreMetodo(a.metodo)}</span>
                    <span className="text-etiqueta font-normal text-texto-secundario">
                      {fechaDelAbono(a)}
                      {a.nota ? ` · ${a.nota}` : ""}
                    </span>
                  </div>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-cuerpo font-extrabold">{formatearPesos(a.monto)}</span>
                    <Boton
                      jerarquia="peligro"
                      tamano="compacto"
                      aria-label={`Borrar el abono de ${formatearPesos(a.monto)} del ${fechaDelAbono(a)}`}
                      onClick={() => setBorrando(a.id)}
                    >
                      Borrar
                    </Boton>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!cancelado && pedido.saldo > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <Boton anchoCompleto icono={<IconoMas tamano={18} strokeWidth={2.6} />} onClick={() => setAbonando(true)}>
                Registrar abono
              </Boton>
              {recordatorio && (
                <Boton jerarquia="secundario" anchoCompleto icono={<IconoWhatsApp tamano={18} />} href={recordatorio} target="_blank" rel="noreferrer">
                  Recordarle por WhatsApp
                </Boton>
              )}
            </div>
          )}
        </Tarjeta>
      </section>

      <Alerta
        abierta={borrando !== null}
        titulo="¿Borrar este abono?"
        descripcion={`La deuda vuelve a subir ${formatearPesos(pedido.abonos.find((x) => x.id === borrando)?.monto ?? 0)}.`}
        accion={{ texto: "Borrar abono", tono: "peligro", alConfirmar: () => { const a = pedido.abonos.find((x) => x.id === borrando); return a ? borrar(a) : undefined; } }}
        alCancelar={() => setBorrando(null)}
      />

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
