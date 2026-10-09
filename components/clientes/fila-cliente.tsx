"use client";

import { textoFechaDeudaAccesible, type CuentaPorCobrar } from "@/lib/credito";
import type { DondeCoincide } from "@/lib/buscar-clientes";
import { formatearPesos } from "@/lib/formato";
import { formatearTelefono, resaltarTelefono } from "@/lib/telefono";
import { resaltar } from "@/lib/texto";
import type { ClienteConResumen } from "@/lib/types";
import { BarraAbonado, Boton, FilaLista, MontoDeuda } from "../ui";
import { TextoResaltado } from "./texto-resaltado";
import { AvatarCliente } from "./avatar-cliente";

/** Fila de un cliente (lista de Clientes y vistas internas de la hoja de resumen). Con `alAbrir` no navega por enlace: llama a esa función. */
export function FilaCliente({ cliente: c, coincide = "nombre", consulta = "", cuenta, ahora, senalRepite, escribir, alAbrir }: { cliente: ClienteConResumen; coincide?: DondeCoincide; consulta?: string; cuenta?: CuentaPorCobrar; ahora: number; /** En el filtro "Repiten" no se muestra (ya lo dice el filtro). */ senalRepite: boolean; escribir?: { href: string; nombre: string }; alAbrir?: () => void }) {
  return (
    <FilaLista
      href={alAbrir ? undefined : `/clientes/${c.id}`}
      onClick={alAbrir}
      inicio={<AvatarCliente cliente={c} repite={c.repite && senalRepite} />}
      titulo={
        <>
          <TextoResaltado trozos={resaltar(c.nombre, coincide === "nombre" ? consulta : "")} />
          {c.repite && senalRepite && <span className="sr-only">, repite</span>}
          {cuenta && cuenta.deuda > 0 && <span className="sr-only">, debe {formatearPesos(cuenta.deuda)}, {textoFechaDeudaAccesible(cuenta.fechaAcordada, ahora)}</span>}
        </>
      }
      detalle={
        // Si salió por el teléfono o por la nota, se muestra eso para ver por qué coincidió
        coincide === "telefono" && c.telefono ? (
          <TextoResaltado trozos={resaltarTelefono(formatearTelefono(c.telefono), consulta)} />
        ) : coincide === "nota" && c.nota ? (
          <TextoResaltado trozos={resaltar(c.nota, consulta)} />
        ) : c.pedidos > 0 ? (
          `${c.pedidos} ${c.pedidos === 1 ? "pedido" : "pedidos"} · ${formatearPesos(c.totalGastado)}`
        ) : (
          "Todavía no pide. Todavía."
        )
      }
      fin={cuenta && cuenta.deuda > 0 ? <MontoDeuda saldo={cuenta.deuda} fecha={cuenta.fechaAcordada} ahora={ahora} /> : undefined}
      pie={cuenta && cuenta.deuda > 0 ? <BarraAbonado mini abonado={cuenta.abonado} total={cuenta.totalPedidos} /> : undefined}
      accion={escribir && <Boton whatsapp href={escribir.href} target="_blank" rel="noreferrer" aria-label={`Escribirle a ${escribir.nombre} por WhatsApp`}>Escribir</Boton>}
    />
  );
}
