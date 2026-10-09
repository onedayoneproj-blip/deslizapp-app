"use client";

import { useEffect, useRef, useState } from "react";
import { debeGuardarFecha, diaCorto, diaDeSantoDomingo, enlaceWhatsAppCliente, mensajeRecordatorio, nombreMetodo } from "@/lib/credito";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import type { Abono, Cliente, PedidoConItems } from "@/lib/types";
import { IconoCheck, IconoMas, IconoMoneda, IconoWhatsApp } from "../iconos";
import { BarraAbonado, BloqueDeuda, Boton, Etiqueta, FilaLista, Tarjeta } from "../ui";
import { useToast } from "../toast";
import { diaDeOpcion, SelectorFechaPago, type FechaPago } from "./campos-pago";
import { HojaAbono } from "./hoja-abono";
import { HojaDetalleAbono } from "./hoja-detalle-abono";
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
 * cuándo quedó en pagar y la lista de abonos (cada fila abre su hoja con Editar y Borrar), con "+ Registrar abono" y "Recordarle
 * por WhatsApp". De contado: una línea "Pagado" y "Cambiar a crédito". Al saldarse, la tarjeta verde con confeti (una sola vez).
 */
export function PagoDelPedido({ pedido, cliente }: { pedido: PedidoConItems; cliente: Cliente | null }) {
  const { cambiarPagoPedido, getDueno } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));
  const toast = useToast();
  const [abonando, setAbonando] = useState(false);
  const [viendo, setViendo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ahora] = useState(Date.now);
  const [cambiando, setCambiando] = useState(false);
  const [fecha, setFecha] = useState<FechaPago | null>(null);

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

  const correr = async (accion: () => Promise<void>, error: string, alFallar?: () => void) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      toast(mensajeDeError(e, error));
      alFallar?.();
    } finally {
      setOcupado(false);
    }
  };

  const pasarACredito = (f: FechaPago) =>
    correr(async () => {
      await cambiarPagoPedido(tiendaId, pedido.id, { pagoModo: "credito", pagoFechaAcordada: diaDeOpcion(f.opcion, f.dia) });
      setCambiando(false);
      setFecha(null);
      toast(`Pedido #${pedido.numero} quedó a crédito.`);
    }, "No se pudo cambiar el pago. Inténtalo otra vez.", () => setFecha(null));

  // Elegir una fecha (o "Sin fecha") guarda el pago a crédito al momento, en cualquier estado. "Elegir fecha" espera el día que se
  // escriba (el campo arranca vacío, así que escribir cualquier día guarda). Si falla, se queda como estaba (de contado, con el aviso).
  const elegirFecha = (f: FechaPago) => {
    const guardar = debeGuardarFecha(f);
    setFecha(f);
    if (guardar) void pasarACredito(f);
  };
  const dejarDeContado = () => {
    setCambiando(false);
    setFecha(null);
  };

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
          {/* El mismo botón abre y cierra: tocarlo de nuevo vuelve a contado (sin botones de Cancelar aparte) */}
          <Boton jerarquia="secundario" tamano="compacto" onClick={cambiando ? dejarDeContado : () => setCambiando(true)} deshabilitado={ocupado}>
            {cambiando ? "Cerrar" : "Cambiar a crédito"}
          </Boton>
        </div>
        {cambiando && (
          <div role="group" aria-label="Cambiar a crédito" className="mov-aparece flex flex-col gap-3 border-t border-linea pt-3 pb-1">
            <p className="text-secundario font-bold">¿Dejar este pedido a crédito? Quedará debiendo {formatearPesos(pedido.total)}.</p>
            <SelectorFechaPago valor={fecha} alCambiar={elegirFecha} deshabilitado={ocupado} diaVacio />
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
              <Etiqueta tono="atencion">A crédito</Etiqueta>
            )}
          </div>

          <div aria-live="polite">
            {cancelado ? (
              <p className="mt-3 text-secundario text-texto-secundario">Cancelado: no genera deuda</p>
            ) : pedido.saldo > 0 ? (
              // El detalle: monto con "Debe", la fecha (o "Atrasado N días" con el reloj), la barra y "Abonó X de Y"
              <BloqueDeuda saldo={pedido.saldo} total={pedido.total} fecha={pedido.pagoFechaAcordada} ahora={ahora} leyenda />
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <BarraAbonado abonado={pedido.pagado} total={pedido.total} />
                <p className="text-secundario text-texto-secundario">Abonó {formatearPesos(pedido.pagado)} de {formatearPesos(pedido.total)}</p>
              </div>
            )}
          </div>

          {pedido.abonos.length > 0 && (
            <ul aria-label="Abonos" className="-mx-4 mt-3 border-t border-linea">
              {pedido.abonos.map((a) => (
                <FilaLista
                  key={a.id}
                  inicio={
                    <IconoMoneda tamano={24} className="text-exito-texto" />
                  }
                  titulo={`Abono · ${nombreMetodo(a.metodo)}`}
                  detalle={`${fechaDelAbono(a)}${a.nota ? ` · ${a.nota}` : ""}`}
                  fin={formatearPesos(a.monto)}
                  onClick={() => setViendo(a.id)}
                />
              ))}
            </ul>
          )}

          {!cancelado && pedido.saldo > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {recordatorio && (
                <Boton anchoCompleto icono={<IconoWhatsApp tamano={18} />} href={recordatorio} target="_blank" rel="noreferrer">
                  Recordarle por WhatsApp
                </Boton>
              )}
              <Boton jerarquia="terciario" anchoCompleto icono={<IconoMas tamano={18} strokeWidth={2.6} />} onClick={() => setAbonando(true)}>
                Registrar abono
              </Boton>
            </div>
          )}
        </Tarjeta>
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
      {pedido.clienteId && (
        <HojaDetalleAbono
          abono={pedido.abonos.find((x) => x.id === viendo) ?? null}
          alCerrar={() => setViendo(null)}
          numeroPedido={pedido.numero}
          clienteId={pedido.clienteId}
          nombreCliente={cliente?.nombre ?? "El cliente"}
          saldoPedido={pedido.saldo}
        />
      )}
    </>
  );
}

/** "22 sep" del abono (día de Santo Domingo). */
function fechaDelAbono(a: Abono): string {
  return diaCorto(diaDeSantoDomingo(Date.parse(a.fecha)));
}
