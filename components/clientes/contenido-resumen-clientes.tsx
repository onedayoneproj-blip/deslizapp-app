"use client";

import { LuzJugada } from "./luz-jugada";
import { Dona } from "../dona";
import type { FiltroClientes, ResumenClientes } from "@/lib/clientes-resumen";
import type { Jugada } from "@/lib/proxima-jugada";
import Image from "next/image";
import { FilaLista, ListaAgrupada, Tarjeta } from "../ui";

export const SEGMENTOS_CLIENTES = [
  { id: "repiten", nombre: "Repiten", color: "var(--accion)" },
  { id: "una", nombre: "Compraron una vez", color: "var(--resalte)" },
  { id: "sin", nombre: "Sin comprar todavía", color: "var(--borde-pastilla)" },
] as const;

export function ContenidoResumenClientes({ resumen, alFiltrar, alAbrirJugadas, destacada }: {
  resumen: ResumenClientes; alFiltrar: (filtro: FiltroClientes) => void; alAbrirJugadas: (elemento: HTMLElement) => void; destacada: Jugada | null;
}) {
  const { cuentas: c, totalVendido, porcentajeRepiten } = resumen;
  const elegir = (f: FiltroClientes) => alFiltrar(f);
  const porcentaje = (n: number) => c.todos ? Math.round(n * 100 / c.todos) : 0;
  const cuadros = [
    { id: "nuevos", nombre: "Nuevos", detalle: "primer pedido en 30 días" },
    { id: "dormidos", nombre: "Dormidos", detalle: "sin comprar hace 60+ días" },
    { id: "catalogo", nombre: "Del catálogo", detalle: "llegaron por el enlace" },
    { id: "manual", nombre: "A mano", detalle: "los agregaste tú" },
  ] as const;
  return <>
    <div className="flex flex-col gap-4.5">
      <button type="button" onClick={(e) => alAbrirJugadas(e.currentTarget)}
        aria-label={`Tu próxima jugada. ${destacada ? `${destacada.nombre}: ${destacada.cantidad} clientes, ${destacada.porcentaje} por ciento.` : "Aún no hay jugadas disponibles."} Ver tus jugadas`}
        className="tocable relative isolate grid min-h-37 grid-cols-[minmax(0,1fr)_7rem] items-start gap-2 overflow-hidden rounded-radio-l border-[1.5px] border-borde-pastilla bg-accion-suave px-4 py-3.5 text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco">
        <LuzJugada tarjeta />
        <span data-jugada-texto className="relative z-10 min-w-0">
          <span className="text-etiqueta font-extrabold uppercase tracking-wide text-exito-texto">Tu próxima jugada</span>
          <span className="mt-1 block font-display text-titulo-seccion text-texto">{destacada ? `${destacada.porcentaje} % ${destacada.id === "volver" ? "lleva tiempo sin comprar." : destacada.id === "segundo" ? "compró una sola vez." : destacada.id === "gracias" ? "volvió por más." : "espera su primer hola."}` : "La próxima conversación empieza aquí."}</span>
          <span className="mt-1.5 block text-etiqueta text-texto-secundario">{destacada ? `${destacada.cantidad} de tus ${c.todos} clientes. ${destacada.descripcion}` : "Cuando haya clientes disponibles, verás ideas para escribirles."}</span>
          <span className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accion px-4 text-etiqueta font-extrabold text-sobre-accion">Ver tus jugadas</span>
        </span>
        <span data-jugada-baraja aria-hidden="true" className="relative z-10 block h-32 w-28">
          {(["volver-a-saludar", "segundo-aaah", "gracias-por-volver", "primer-hola"] as const).map((id, i) => <span key={id} className={`jugada-mini jugada-mini-${i}`}>
            <Image src={`/ilustraciones/proxima-jugada/${id}.webp`} alt="" fill sizes="70px" className="object-contain" />
          </span>)}
        </span>
      </button>
      <div className="flex items-center gap-4.5" aria-label={`${c.todos} clientes; ${c.repiten} repiten, ${c.una} compraron una vez, ${c.sin} sin comprar. ${totalVendido > 0 ? `Los que repiten dejan el ${porcentajeRepiten} por ciento de tus ventas.` : "Sin ventas todavía."}`}>
        <Dona tamano={148} grosor={16} pista="var(--superficie-hundida)" segmentos={SEGMENTOS_CLIENTES.map((s) => ({ valor: c[s.id], color: s.color }))}>
          <b className="font-display text-cifra">{c.todos}</b><span className="mt-1 text-contador text-texto-secundario">CLIENTES</span>
        </Dona>
        <div className="min-w-0 flex-1 text-secundario">
          <p>{c.repiten ? <><b>1 de cada {Math.max(1, Math.round(c.todos / c.repiten))}</b> vuelve a comprar.</> : "Nadie repite todavía."}</p>
          {totalVendido > 0 && <p className="mt-2 text-texto-secundario">Los que repiten dejan el <b className="text-texto">{porcentajeRepiten} %</b> de tus ventas.</p>}
        </div>
      </div>
      <ListaAgrupada etiqueta="Tus clientes por tipo">
        {SEGMENTOS_CLIENTES.map((s) => <FilaLista key={s.id} onClick={() => elegir(s.id)}
          inicio={<span aria-hidden="true" className={`block size-3.5 rounded-full ${s.id === "sin" ? "border-[1.5px] border-borde-campo" : ""}`} style={{ background: s.color }} />}
          titulo={s.nombre}
          detalle={`${porcentaje(c[s.id])} %`}
          fin={c[s.id]} />)}
      </ListaAgrupada>
      <div className="grid grid-cols-2 gap-2.5">
        {cuadros.map((q) => <Tarjeta key={q.id} onClick={() => elegir(q.id)} etiqueta={`${q.nombre}: ${c[q.id]} clientes. ${q.detalle}. Ver clientes`}>
          <b className="font-display text-titulo-hoja">{c[q.id]}</b><span className="mt-0.5 block text-secundario font-bold">{q.nombre}</span>
          <span className="mt-0.5 block text-etiqueta text-texto-secundario">{q.detalle}</span>
        </Tarjeta>)}
      </div>
    </div>
  </>;
}
