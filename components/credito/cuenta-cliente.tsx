"use client";

import { useState } from "react";
import { diaCorto, diaDeSantoDomingo, enlaceWhatsAppCliente, mensajesRecordatorio, nombreMetodo, type CuentaCliente, type IdMensajeRecordatorio } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import type { Cliente } from "@/lib/types";
import { Hoja } from "../hoja";
import { IconoPedidos, IconoChevronAbajo, IconoMas, IconoMoneda, IconoWhatsApp } from "../iconos";
import { BarraAbonado, Boton, FechaDeuda, FilaLista, GrupoOpciones, ListaAgrupada, Tarjeta } from "../ui";
import { HojaAbono } from "./hoja-abono";

/**
 * "Te debe" en el detalle del cliente: la tarjeta con lo que debe (fecha, monto, barra y "Abonó X de Y"), los movimientos (compras a
 * crédito y abonos, con su ícono), "Registrar abono" y la tarjeta del recordatorio con el mensaje elegido ("Elige el mensaje") y
 * "Recordarle por WhatsApp". Solo si debe algo.
 */
export function CuentaDelCliente({ cliente, cuenta, vendedora, tienda }: { cliente: Cliente; cuenta: CuentaCliente; vendedora: string; tienda: string }) {
  const [abonando, setAbonando] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const [ahora] = useState(Date.now);
  const { mensajes, elegido: porDefecto } = mensajesRecordatorio({ cliente: cliente.nombre, vendedora, tienda, deuda: cuenta.deuda, fecha: cuenta.fechaAcordada, ahora });
  const [elegidoId, setElegidoId] = useState<IdMensajeRecordatorio | null>(null);
  if (cuenta.deuda <= 0) return null;

  const mensaje = mensajes.find((m) => m.id === elegidoId) ?? mensajes.find((m) => m.id === porDefecto) ?? mensajes[0]!;
  const n = cuenta.pedidos.length;
  const dia = (iso: string) => diaCorto(diaDeSantoDomingo(Date.parse(iso)));

  return (
    <>
      <section aria-label="Lo que te debe" className="flex flex-col gap-2">
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
              {cuenta.abonado > 0 ? `Abonó ${formatearPesos(cuenta.abonado)} de ${formatearPesos(cuenta.totalPedidos)}` : "Sin abonos todavía"}
            </p>
          </div>
        </Tarjeta>
        <ListaAgrupada etiqueta="Compras a crédito y abonos">
          {cuenta.historial.map((m) => (
            <FilaLista
              key={m.tipo === "abono" ? m.abonoId : `compra-${m.pedidoId}`}
              href={`/pedidos/${m.pedidoId}`}
              inicio={
                <span className={`grid size-10 place-items-center rounded-full ${m.tipo === "abono" ? "bg-accion-suave" : "bg-superficie-hundida"} text-texto`}>
                  {m.tipo === "abono" ? <IconoMoneda tamano={20} /> : <IconoPedidos tamano={20} strokeWidth={2.2} />}
                </span>
              }
              titulo={m.tipo === "compra" ? `Compra · pedido #${m.numero}` : `Abono · ${nombreMetodo(m.metodo)}`}
              detalle={`${dia(m.fecha)}${m.tipo === "compra" && m.pagoFechaAcordada ? ` · quedó en pagar el ${diaCorto(m.pagoFechaAcordada)}` : ""}${m.tipo === "abono" && m.nota ? ` · ${m.nota}` : ""}`}
              fin={m.tipo === "abono" ? <span className="text-exito-texto">– {formatearPesos(m.monto)}</span> : formatearPesos(m.monto)}
            />
          ))}
        </ListaAgrupada>
        <Boton jerarquia="secundario" tamano="grande" anchoCompleto icono={<IconoMas tamano={18} strokeWidth={2.6} />} onClick={() => setAbonando(true)}>
          Registrar abono
        </Boton>
      </section>

      <section aria-label="Recordatorio" className="flex flex-col gap-3 rounded-radio-l bg-accion-suave p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-secundario font-extrabold text-texto">Así le llega el recordatorio</p>
          <button
            type="button"
            onClick={() => setEligiendo(true)}
            aria-label={`Cambiar el mensaje. Ahora: ${mensaje.titulo}`}
            className="tocable relative flex h-(--alto-compacto) shrink-0 items-center gap-1 rounded-full bg-superficie px-3 text-secundario font-extrabold whitespace-nowrap text-texto outline-none after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            {mensaje.titulo}
            <IconoChevronAbajo tamano={18} strokeWidth={2.2} />
          </button>
        </div>
        <p className="rounded-radio-m rounded-bl-sm bg-superficie px-3 py-2.5 text-secundario text-texto">{mensaje.texto}</p>
        {cliente.telefono && (
          <Boton tamano="grande" anchoCompleto icono={<IconoWhatsApp tamano={20} />} href={enlaceWhatsAppCliente(cliente.telefono, mensaje.texto)} target="_blank" rel="noreferrer">
            Recordarle por WhatsApp
          </Boton>
        )}
      </section>

      <Hoja abierta={eligiendo} alCerrar={() => setEligiendo(false)} titulo="Elige el mensaje">
        <GrupoOpciones
          etiqueta="Mensaje del recordatorio"
          valor={mensaje.id}
          alCambiar={(id) => {
            setElegidoId(id);
            setEligiendo(false);
          }}
          opciones={mensajes.map((m) => ({ id: m.id, texto: m.titulo, descripcion: m.texto }))}
        />
      </Hoja>

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
