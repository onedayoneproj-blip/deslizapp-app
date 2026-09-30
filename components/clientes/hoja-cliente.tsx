"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { enlaceWhatsApp, fechaCorta, formatearPesos } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import type { CuentaCliente } from "@/lib/credito";
import type { ClienteConResumen, PedidoConItems } from "@/lib/types";
import { Hoja } from "../hoja";
import { useToast } from "../toast";
import { CampoNota } from "./campo-nota";
import { IconoWhatsApp } from "../iconos";
import { ChipEstado } from "../pedidos/comunes";
import { CuentaDelCliente } from "../credito/cuenta-cliente";
import { Avatar, EtiquetaRepite } from "./comunes";

/** Hoja del cliente sobre Clientes. Al cerrar vuelve a /clientes sin perder la búsqueda (la guarda el layout). */
export function HojaCliente({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const { getCliente, getPedidos, getCuentaCliente, getDueno } = useData();
  const { tiendaId } = useTiendaActiva();
  const cerrar = useCallback(() => router.push("/clientes", { scroll: false }), [router]);

  const { data: cliente, cargando } = useConsulta(`cliente:${tiendaId}:${clienteId}`, () => getCliente(tiendaId, clienteId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const { data: cuenta } = useConsulta(`cuenta:${tiendaId}:${clienteId}`, () => getCuentaCliente(tiendaId, clienteId));
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));

  if (cliente === undefined && cargando) return null;
  if (!cliente) {
    return (
      <Hoja abierta alCerrar={cerrar} titulo="Cliente">
        <div className="py-6 text-center">
          <p className="font-display text-xl">Esta persona no vive aquí.</p>
          <p className="mt-1 text-suave">Quizá es cliente de otra tienda. Los clientes no se mezclan.</p>
          <button type="button" onClick={cerrar} className="mt-5 h-12 w-full rounded-full bg-bosque font-extrabold text-papel">
            Volver a clientes
          </button>
        </div>
      </Hoja>
    );
  }
  if (!pedidos || !cuenta) return null;

  // "grande": tiene un campo de texto (la nota) y la hoja no cambia de tamaño con el teclado
  return (
    <Hoja abierta alCerrar={cerrar} titulo="Cliente" altura="grande">
      <Detalle cliente={cliente} pedidos={pedidos.filter((p) => p.clienteId === cliente.id)} cuenta={cuenta} vendedora={dueno?.nombre ?? ""} />
    </Hoja>
  );
}

function Detalle({ cliente, pedidos, cuenta, vendedora }: { cliente: ClienteConResumen; pedidos: PedidoConItems[]; cuenta: CuentaCliente; vendedora: string }) {
  const { actualizarNotaCliente } = useData();
  const { tienda, tiendaId } = useTiendaActiva();
  const toast = useToast();
  const [nota, setNota] = useState(cliente.nota ?? "");
  const [guardando, setGuardando] = useState(false);
  const cambiada = nota.trim() !== (cliente.nota ?? "");
  const guardarNota = async () => {
    setGuardando(true);
    try {
      await actualizarNotaCliente(tiendaId, cliente.id, nota);
      toast(nota.trim() ? "Nota guardada." : "Nota borrada.");
    } catch (e) {
      toast(mensajeDeError(e, "No se pudo guardar. Inténtalo otra vez."));
    } finally {
      setGuardando(false);
    }
  };
  const historial = useMemo(() => [...pedidos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)), [pedidos]);
  const primerNombre = cliente.nombre.split(" ")[0];
  const mensaje = `Hola ${primerNombre}, te escribo de ${tienda?.nombre ?? "la tienda"}.`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col items-center gap-1 text-center">
        <Avatar nombre={cliente.nombre} tamano={78} />
        <h2 className="mt-1.5 flex items-center gap-2 font-display text-[26px] leading-tight">
          {cliente.nombre}
          {cliente.repite && <EtiquetaRepite />}
        </h2>
        <p className="text-sm font-semibold text-suave">
          {cliente.telefono ? formatearTelefono(cliente.telefono) : "Sin WhatsApp"} · {cliente.origen === "catalogo" ? "Del catálogo" : "Manual"}
        </p>
      </div>

      {cliente.telefono && (
        <a
          href={enlaceWhatsApp(cliente.telefono, mensaje)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Escribir a ${cliente.nombre} por WhatsApp`}
          className="tocable flex h-12 items-center justify-center gap-2 rounded-full bg-bosque text-[14.5px] font-extrabold text-papel"
        >
          <IconoWhatsApp tamano={18} />
          Escribir
        </a>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[18px] border border-linea bg-white px-3 py-2.5">
          <div className="font-display text-[22px] leading-tight">{cliente.pedidos}</div>
          <div className="text-xs font-semibold text-suave">{cliente.pedidos === 1 ? "pedido" : "pedidos"}</div>
        </div>
        <div className="col-span-2 rounded-[18px] bg-rosa px-3 py-2.5">
          <div className="font-display text-[22px] leading-tight">{formatearPesos(cliente.totalGastado)}</div>
          <div className="text-xs font-bold">en total{cliente.ultimaCompra ? ` · última compra ${fechaCorta(cliente.ultimaCompra).toLowerCase()}` : ""}</div>
        </div>
      </div>

      <CuentaDelCliente cliente={cliente} cuenta={cuenta} vendedora={vendedora} tienda={tienda?.nombre ?? "la tienda"} />

      <div className="flex flex-col gap-2">
        <CampoNota valor={nota} alCambiar={setNota} />
        {cambiada && (
          <button
            type="button"
            onClick={guardarNota}
            disabled={guardando}
            className="tocable h-11 rounded-full bg-bosque text-[14.5px] font-extrabold text-papel disabled:opacity-60"
          >
            Guardar nota
          </button>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[13.5px] font-bold">Historial</p>
        {historial.length === 0 ? (
          <p className="rounded-[18px] bg-arena p-3.5 text-center font-semibold text-suave">Todavía no pide. Todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historial.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pedidos/${p.id}`}
                  scroll={false}
                  className="tocable flex items-center justify-between gap-2.5 rounded-[18px] border border-linea bg-white px-3.5 py-3"
                >
                  <span>
                    <span className="block font-extrabold">#{p.numero}</span>
                    <span className="block text-[12.5px] text-suave">{fechaCorta(p.creadoEn)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ChipEstado estado={p.estado} />
                    <span className="font-extrabold">{formatearPesos(p.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
