"use client";

import { enlaceWhatsAppCliente, textoFechaDeudaAccesible, type CuentaPorCobrar, type CuentasPorCobrar } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import { Avatar, BloqueDeuda, Boton, Tarjeta } from "../ui";

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
 * Una cuenta de "Deben": tarjeta suelta con Avatar, nombre, la línea del pedido y el bloque de deuda (suma TODOS los pedidos con
 * saldo del cliente). Toda la tarjeta lleva a la cuenta del cliente; el botón "Escribir" va encima, en la esquina (un enlace no puede
 * ir dentro de otro).
 */
export function FilaPorCobrar({ cuenta: c, mensaje, ahora, repite = false }: { cuenta: CuentaPorCobrar; mensaje: string; ahora: number; repite?: boolean }) {
  return (
    <li className="relative">
      <Tarjeta href={`/clientes/${c.clienteId}`} etiqueta={`${c.nombre}${repite ? ", repite" : ""}. ${linea(c)}. Debe ${formatearPesos(c.deuda)}. ${textoFechaDeudaAccesible(c.fechaAcordada, ahora)}`}>
        <div className={`flex items-center gap-3 ${c.telefono ? "pr-28" : ""}`}>
          <Avatar nombre={c.nombre} repite={repite} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-destacado text-texto">{c.nombre}</span>
            <span className="text-secundario text-texto-secundario">{linea(c)}</span>
          </div>
        </div>
        <BloqueDeuda prefijo={false} saldo={c.deuda} total={c.totalPedidos} fecha={c.fechaAcordada} ahora={ahora} />
      </Tarjeta>
      {c.telefono && (
        <div className="absolute top-4 right-4">
          <Boton whatsapp href={enlaceWhatsAppCliente(c.telefono, mensaje)} target="_blank" rel="noreferrer" aria-label={`Recordarle a ${c.nombre} por WhatsApp`}>
            Escribir
          </Boton>
        </div>
      )}
    </li>
  );
}
