"use client";

import { enlaceWhatsAppCliente, type CuentaPorCobrar, type CuentasPorCobrar } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import { Avatar, Boton, FilaLista, Tarjeta } from "../ui";
import { EtiquetaDeuda } from "./comunes";

/** Tarjeta destacada "Por cobrar": el total, cuántos clientes y pedidos, y lo cobrado este mes (referencias/credito-abonos/PorCobrar.dc.html). */
export function TarjetaPorCobrar({ datos }: { datos: CuentasPorCobrar }) {
  return (
    <Tarjeta tono="destacada" etiqueta="Por cobrar">
      <p className="text-secundario">Por cobrar</p>
      <p aria-live="polite" className="font-display text-cifra">
        {formatearPesos(datos.total)}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-x-4.5 gap-y-1 text-secundario">
        <span>
          {datos.clientes} {datos.clientes === 1 ? "cliente" : "clientes"} · {datos.pedidos} {datos.pedidos === 1 ? "pedido" : "pedidos"}
        </span>
        <span>
          Cobrado este mes: <b>{formatearPesos(datos.cobradoEsteMes)}</b>
        </span>
      </div>
    </Tarjeta>
  );
}

/** "Pedido #1006 · pagó RD$1,500 de 4,300" · "Pedido #1008 · sin abonos todavía" · "2 pedidos · el más viejo hace 26 días". */
function linea(c: CuentaPorCobrar): string {
  if (c.unico) {
    return c.unico.pagado > 0
      ? `Pedido #${c.unico.numero} · pagó ${formatearPesos(c.unico.pagado)} de ${c.unico.total.toLocaleString("en-US")}`
      : `Pedido #${c.unico.numero} · sin abonos todavía`;
  }
  const dias = c.pedidoMasViejo.dias;
  return `${c.pedidos} pedidos · el más viejo ${dias === 0 ? "es de hoy" : `hace ${dias} ${dias === 1 ? "día" : "días"}`}`;
}

/**
 * Una fila de "Deben": avatar, nombre, línea con el pedido, etiqueta de estado, lo que debe y, si tiene teléfono, el botón "Escribir"
 * de WhatsApp. Toda la fila lleva a la cuenta del cliente; el botón va fuera del enlace (un enlace no puede ir dentro de otro).
 * Va dentro de una `ListaAgrupada`.
 */
export function FilaPorCobrar({ cuenta: c, mensaje }: { cuenta: CuentaPorCobrar; mensaje: string }) {
  return (
    <FilaLista
      href={`/clientes/${c.clienteId}`}
      inicio={<Avatar nombre={c.nombre} />}
      titulo={c.nombre}
      pie={
        <span className="flex flex-col gap-1">
          <span className="text-secundario text-texto-secundario">{linea(c)}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <b className="text-destacado text-atencion-texto">{formatearPesos(c.deuda)}</b>
            <EtiquetaDeuda fecha={c.fechaAcordada} atrasoDias={c.atrasoDias} />
          </span>
        </span>
      }
      accion={
        c.telefono ? (
          <Boton whatsapp href={enlaceWhatsAppCliente(c.telefono, mensaje)} target="_blank" rel="noreferrer" aria-label={`Recordarle a ${c.nombre} por WhatsApp`}>
            Escribir
          </Boton>
        ) : undefined
      }
    />
  );
}
