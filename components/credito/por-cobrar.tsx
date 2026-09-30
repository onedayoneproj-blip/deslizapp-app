"use client";

import Link from "next/link";
import { enlaceWhatsAppCliente, type CuentaPorCobrar, type CuentasPorCobrar } from "@/lib/credito";
import { formatearPesos } from "@/lib/formato";
import { IconoWhatsApp } from "../iconos";
import { EtiquetaDeuda } from "./comunes";

/** Tarjeta Verde Bosque "Por cobrar": el total, cuántos clientes y pedidos, y lo cobrado este mes (referencias/credito-abonos/PorCobrar.dc.html). */
export function TarjetaPorCobrar({ datos }: { datos: CuentasPorCobrar }) {
  return (
    <section aria-label="Por cobrar" className="rounded-[22px] bg-bosque px-[18px] py-4 text-papel">
      <p className="text-[13px] text-menta">Por cobrar</p>
      <p aria-live="polite" className="font-display text-[36px] leading-[1.15]">
        {formatearPesos(datos.total)}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-x-[18px] gap-y-1 text-[13px] text-menta">
        <span>
          {datos.clientes} {datos.clientes === 1 ? "cliente" : "clientes"} · {datos.pedidos} {datos.pedidos === 1 ? "pedido" : "pedidos"}
        </span>
        <span>
          Cobrado este mes: <b className="text-papel">{formatearPesos(datos.cobradoEsteMes)}</b>
        </span>
      </div>
    </section>
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
 * Una fila de "Deben": inicial en círculo rosa, nombre, línea con el pedido, etiqueta de estado, lo que debe y el botón de WhatsApp
 * (solo si tiene teléfono). Toda la tarjeta es UN enlace real a la cuenta del cliente (tocar en cualquier parte la abre); el botón de
 * WhatsApp es otro enlace que va encima, en la esquina (un enlace no puede ir dentro de otro). Antes el enlace era solo el nombre y se
 * estiraba con un pseudo-elemento, pero el `overflow: hidden` del nombre recortaba el toque y la tarjeta no respondía fuera del texto.
 */
export function FilaPorCobrar({ cuenta: c, mensaje }: { cuenta: CuentaPorCobrar; mensaje: string }) {
  return (
    <div className="relative">
      <Link
        href={`/clientes/${c.clienteId}`}
        scroll={false}
        className="tocable flex items-center gap-3 rounded-[22px] border border-linea bg-white py-3 pr-[88px] pl-3.5 text-bosque"
      >
        <span aria-hidden="true" className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-rosa font-display text-[17px]">
          {c.nombre.trim().charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[15px] font-extrabold">{c.nombre}</span>
          <span className="text-[12.5px] leading-snug text-suave">{linea(c)}</span>
          <EtiquetaDeuda fecha={c.fechaAcordada} atrasoDias={c.atrasoDias} />
        </span>
        <span className="absolute top-3 right-3.5 text-[16px] font-extrabold text-mandarina-texto">{formatearPesos(c.deuda)}</span>
      </Link>
      {c.telefono ? (
        <a
          href={enlaceWhatsAppCliente(c.telefono, mensaje)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Recordarle a ${c.nombre} por WhatsApp`}
          className="tocable absolute right-3 bottom-3 grid h-11 w-11 place-items-center rounded-full bg-menta text-bosque"
        >
          <IconoWhatsApp tamano={18} />
        </a>
      ) : null}
    </div>
  );
}
