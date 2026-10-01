"use client";

import { Dona } from "../dona";
import { Hoja } from "../hoja";
import type { FiltroClientes, ResumenClientes } from "@/lib/clientes-resumen";

export const SEGMENTOS_CLIENTES = [
  { id: "repiten", nombre: "Repiten", color: "#174b3a" },
  { id: "una", nombre: "Compraron una vez", color: "#ff834f" },
  { id: "sin", nombre: "Sin comprar todavía", color: "#e7dcc8" },
] as const;

export function HojaResumenClientes({ resumen, alCerrar, alFiltrar }: {
  resumen: ResumenClientes; alCerrar: () => void; alFiltrar: (filtro: FiltroClientes) => void;
}) {
  const { cuentas: c, totalVendido, porcentajeRepiten } = resumen;
  const elegir = (f: FiltroClientes) => { alCerrar(); alFiltrar(f); };
  const porcentaje = (n: number) => c.todos ? Math.round(n * 100 / c.todos) : 0;
  const cuadros = [
    { id: "nuevos", nombre: "Nuevos", detalle: "primer pedido en 30 días" },
    { id: "dormidos", nombre: "Dormidos", detalle: "sin comprar hace 60+ días" },
    { id: "catalogo", nombre: "Del catálogo", detalle: "llegaron por el enlace" },
    { id: "manual", nombre: "A mano", detalle: "los agregaste tú" },
  ] as const;
  return <Hoja abierta alCerrar={alCerrar} titulo="Tus clientes" altura="grande">
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-[18px]" aria-label={`${c.todos} clientes; ${c.repiten} repiten, ${c.una} compraron una vez, ${c.sin} sin comprar. ${totalVendido > 0 ? `Los que repiten dejan el ${porcentajeRepiten} por ciento de tus ventas.` : "Sin ventas todavía."}`}>
        <Dona tamano={148} grosor={16} segmentos={SEGMENTOS_CLIENTES.map((s) => ({ valor: c[s.id], color: s.color }))}>
          <b className="font-display text-[36px]">{c.todos}</b><span className="mt-1 text-[10px] font-extrabold text-suave">CLIENTES</span>
        </Dona>
        <div className="min-w-0 flex-1 text-[14px] leading-[1.4]">
          <p>{c.repiten ? <><b>1 de cada {Math.max(1, Math.round(c.todos / c.repiten))}</b> vuelve a comprar.</> : "Nadie repite todavía."}</p>
          {totalVendido > 0 && <p className="mt-2 text-suave">Los que repiten dejan el <b className="text-bosque">{porcentajeRepiten} %</b> de tus ventas.</p>}
        </div>
      </div>
      <div>
        {SEGMENTOS_CLIENTES.map((s) => <button key={s.id} type="button" onClick={() => elegir(s.id)}
          aria-label={`${s.nombre}: ${c[s.id]} clientes, ${porcentaje(c[s.id])} por ciento. Ver clientes`}
          className="tocable flex min-h-[52px] w-full items-center gap-2.5 border-b border-linea py-3 text-left">
          <span aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 rounded-full ${s.id === "sin" ? "border-[1.5px] border-apagado" : ""}`} style={{ background: s.color }} />
          <span className="min-w-0 flex-1 text-[14px] font-bold">{s.nombre}</span>
          <span className="text-[13px] text-suave">{porcentaje(c[s.id])} %</span>
          <b className="min-w-6 text-right">{c[s.id]}</b>
        </button>)}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {cuadros.map((q) => <button key={q.id} type="button" onClick={() => elegir(q.id)} aria-label={`${q.nombre}: ${c[q.id]} clientes. ${q.detalle}. Ver clientes`}
          className="tocable rounded-[18px] border border-linea bg-white px-3.5 py-3 text-left">
          <b className="font-display text-2xl">{c[q.id]}</b><span className="mt-0.5 block text-[13px] font-bold">{q.nombre}</span>
          <span className="mt-0.5 block text-xs text-suave">{q.detalle}</span>
        </button>)}
      </div>
      <button type="button" onClick={() => elegir("dormidos")} className="tocable min-h-12 rounded-full border-[1.5px] border-bosque text-[15px] font-extrabold">Escribirle a los dormidos</button>
    </div>
  </Hoja>;
}
