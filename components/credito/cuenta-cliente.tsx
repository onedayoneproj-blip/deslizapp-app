"use client";

import Link from "next/link";
import { useState } from "react";
import { diaCorto, diaDeSantoDomingo, enlaceWhatsAppCliente, mensajeRecordatorio, nombreMetodo, type CuentaCliente } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { Cliente } from "@/lib/types";
import { IconoMas, IconoWhatsApp } from "../iconos";
import { EtiquetaDeuda } from "./comunes";
import { HojaAbono } from "./hoja-abono";

/**
 * "Te debe" en el detalle del cliente (referencias/credito-abonos/Cliente.dc.html): lo que debe, cómo va, en cuántos pedidos, el
 * historial de compras a crédito y abonos, la vista previa del recordatorio y los botones "Recordarle" y "+ Abono". Solo si debe algo.
 */
export function CuentaDelCliente({ cliente, cuenta, vendedora, tienda }: { cliente: Cliente; cuenta: CuentaCliente; vendedora: string; tienda: string }) {
  const [abonando, setAbonando] = useState(false);
  if (cuenta.deuda <= 0) return null;

  const mensaje = mensajeRecordatorio({ cliente: cliente.nombre, vendedora, tienda, deuda: cuenta.deuda });
  const n = cuenta.pedidos.length;
  const dia = (iso: string) => diaCorto(diaDeSantoDomingo(Date.parse(iso)));

  return (
    <>
      <section aria-label="Lo que te debe" className="rounded-[22px] border border-linea bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-suave">Te debe</span>
          <EtiquetaDeuda fecha={cuenta.fechaAcordada} atrasoDias={cuenta.atrasoDias} grande />
        </div>
        <p aria-live="polite" className="font-display text-[36px] leading-[1.15] text-mandarina-texto">
          {formatearPesos(cuenta.deuda)}
        </p>
        <p className="text-[13px] text-suave">
          En {n} {n === 1 ? "pedido" : "pedidos"}. Los abonos se aplican primero al más viejo.
        </p>

        <ul className="mt-2">
          {cuenta.historial.map((m) => (
            <li key={m.tipo === "abono" ? m.abonoId : `compra-${m.pedidoId}`} className="border-t border-linea">
              <Link href={`/pedidos/${m.pedidoId}`} scroll={false} className="tocable flex min-h-11 items-center gap-2.5 py-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-bold">{m.tipo === "compra" ? `Compra · pedido #${m.numero}` : `Abono · ${nombreMetodo(m.metodo)}`}</span>
                  <span className="text-[12px] text-suave">
                    {dia(m.fecha)}
                    {m.tipo === "compra" && m.pagoFechaAcordada ? ` · quedó en pagar el ${diaCorto(m.pagoFechaAcordada)}` : ""}
                    {m.tipo === "abono" && m.nota ? ` · ${m.nota}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[14.5px] font-extrabold text-bosque">
                  {m.tipo === "abono" ? "– " : ""}
                  {formatearPesos(m.monto)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-[22px] bg-menta p-3.5">
        <p className="mb-2 text-[12.5px] font-extrabold">Así le llega el recordatorio</p>
        <p className="rounded-2xl rounded-bl-[4px] bg-white px-3 py-2.5 text-[14px] leading-snug">{mensaje}</p>
      </div>

      <div className="flex gap-2.5">
        {cliente.telefono && (
          <a
            href={enlaceWhatsAppCliente(cliente.telefono, mensaje)}
            target="_blank"
            rel="noreferrer"
            className="tocable flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-bosque text-[15px] font-extrabold text-bosque"
          >
            <IconoWhatsApp tamano={18} />
            Recordarle
          </a>
        )}
        <button type="button" onClick={() => setAbonando(true)} className="tocable flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-bosque text-[15px] font-extrabold text-papel">
          <IconoMas tamano={18} strokeWidth={2.6} />
          Abono
        </button>
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
