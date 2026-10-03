"use client";

import { useState } from "react";
import { diaCorto, diaDeSantoDomingo, enlaceWhatsAppCliente, mensajeRecordatorio, nombreMetodo, type CuentaCliente } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { Cliente } from "@/lib/types";
import { IconoMas, IconoWhatsApp } from "../iconos";
import { BarraAbonado, Boton, FechaDeuda, FilaLista, ListaAgrupada, Tarjeta } from "../ui";
import { HojaAbono } from "./hoja-abono";

/**
 * "Te debe" en el detalle del cliente (referencias/credito-abonos/Cliente.dc.html): lo que debe, cómo va, en cuántos pedidos, el
 * historial de compras a crédito y abonos, la vista previa del recordatorio y los botones "Recordarle" y "+ Abono". Solo si debe algo.
 */
export function CuentaDelCliente({ cliente, cuenta, vendedora, tienda }: { cliente: Cliente; cuenta: CuentaCliente; vendedora: string; tienda: string }) {
  const [abonando, setAbonando] = useState(false);
  const [ahora] = useState(Date.now);
  if (cuenta.deuda <= 0) return null;

  const mensaje = mensajeRecordatorio({ cliente: cliente.nombre, vendedora, tienda, deuda: cuenta.deuda });
  const n = cuenta.pedidos.length;
  const dia = (iso: string) => diaCorto(diaDeSantoDomingo(Date.parse(iso)));

  return (
    <>
      <section aria-label="Lo que te debe">
        <Tarjeta>
          <div className="flex items-center justify-between gap-2">
            <span className="text-secundario text-texto-secundario">Te debe</span>
            <FechaDeuda fecha={cuenta.fechaAcordada} ahora={ahora} />
          </div>
          <p aria-live="polite" className="font-display text-cifra text-atencion-texto">
            {formatearPesos(cuenta.deuda)}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <BarraAbonado abonado={cuenta.abonado} total={cuenta.totalPedidos} />
            <p className="text-secundario text-texto-secundario">
              {cuenta.abonado > 0 ? `Abonó ${formatearPesos(cuenta.abonado)} de ${formatearPesos(cuenta.totalPedidos)}` : "Sin abonos todavía"} · En {n} {n === 1 ? "pedido" : "pedidos"}. Los abonos se aplican primero al más viejo.
            </p>
          </div>
        </Tarjeta>
        <ListaAgrupada etiqueta="Compras a crédito y abonos" className="mt-2">
          {cuenta.historial.map((m) => (
            <FilaLista
              key={m.tipo === "abono" ? m.abonoId : `compra-${m.pedidoId}`}
              href={`/pedidos/${m.pedidoId}`}
              titulo={m.tipo === "compra" ? `Compra · pedido #${m.numero}` : `Abono · ${nombreMetodo(m.metodo)}`}
              detalle={`${dia(m.fecha)}${m.tipo === "compra" && m.pagoFechaAcordada ? ` · quedó en pagar el ${diaCorto(m.pagoFechaAcordada)}` : ""}${m.tipo === "abono" && m.nota ? ` · ${m.nota}` : ""}`}
              fin={m.tipo === "abono" ? <span className="text-exito-texto">– {formatearPesos(m.monto)}</span> : formatearPesos(m.monto)}
            />
          ))}
        </ListaAgrupada>
      </section>

      <div className="rounded-radio-l bg-accion-suave p-3.5">
        <p className="mb-2 text-etiqueta font-extrabold text-texto">Así le llega el recordatorio</p>
        <p className="rounded-radio-m rounded-bl-sm bg-superficie px-3 py-2.5 text-secundario text-texto">{mensaje}</p>
      </div>

      <div className="flex gap-2.5">
        {cliente.telefono && (
          <Boton tamano="grande" icono={<IconoWhatsApp tamano={20} />} href={enlaceWhatsAppCliente(cliente.telefono, mensaje)} target="_blank" rel="noreferrer" className="flex-1">
            Recordarle
          </Boton>
        )}
        <Boton jerarquia="secundario" tamano="grande" icono={<IconoMas tamano={18} strokeWidth={2.6} />} onClick={() => setAbonando(true)} className="flex-1">
          Abono
        </Boton>
      </div>

      <HojaAbono
        abierta={abonando}
        alCerrar={() => setAbonando(false)}
        clienteId={cliente.id}
        nombreCliente={cliente.nombre}
        pedidos={n}
        deuda={cuenta.deuda}
      />
    </>
  );
}
