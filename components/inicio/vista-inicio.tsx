"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CREDITOS_POR_RETOQUE, NOMBRE_PLAN, STOCK_BAJO } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos, saludo } from "@/lib/formato";
import { aaahsDeLaSemana, calcularResumen, contarPedidosNuevos, diaDeLaSemana, stockBajo, textoVariacion, type Periodo, type Resumen } from "@/lib/resumen";
import type { Producto, Tienda } from "@/lib/types";
import { Segmentos } from "../controles";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { Foto } from "../foto";
import { IconoCorazon } from "../iconos";
import { Numero } from "../numero";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { usePanelUI } from "../panel/ui";
import { GraficoVentas } from "./grafico-ventas";

const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "semana", nombre: "7 días" },
  { id: "mes", nombre: "Este mes" },
];

const VACIO: Record<Periodo, string> = {
  hoy: "Hoy todavía está tranquilo.",
  semana: "Una semana calladita.",
  mes: "Este mes apenas arranca.",
};

const TITULO_GRAFICO: Record<Periodo, string> = {
  hoy: "Ventas de hoy por franja de 2 horas",
  semana: "Ventas de los últimos 7 días, por día",
  mes: "Ventas de este mes, por semana",
};

/** Resumen (Inicio). Todas las cifras salen de lib/resumen.ts con los datos de la tienda activa. */
export function VistaInicio() {
  const { getPedidos, getEventosAaah, getProductos } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  // "Ahora" se toma al consultar (no al pintar): cada cambio de datos (p. ej. un pedido simulado) lo renueva.
  const { data } = useConsulta(`resumen:${tiendaId}`, async () => {
    const [pedidos, eventos, productos] = await Promise.all([getPedidos(tiendaId), getEventosAaah(tiendaId), getProductos(tiendaId)]);
    return { pedidos, eventos, productos, ahora: Date.now() };
  });

  const resumen = useMemo(() => (data ? calcularResumen(data, periodo, data.ahora) : null), [data, periodo]);
  const nuevos = data ? contarPedidosNuevos(data.pedidos) : 0;
  const aaahsSemana = data ? aaahsDeLaSemana(data.eventos, data.ahora) : 0;

  return (
    <>
      <TituloPantalla
        titulo={
          <>
            {saludo(data ? new Date(data.ahora) : undefined)}
            {tienda ? `, ${tienda.nombre}` : ""}
            <span className="text-mandarina">.</span>
          </>
        }
        subtitulo={
          !data
            ? " "
            : aaahsSemana > 0
              ? `Esta semana tu tienda sacó ${aaahsSemana} ${aaahsSemana === 1 ? "aaah" : "aaahs"}. Nada mal para un ${diaDeLaSemana(data.ahora)}.`
              : "Esta semana todavía no hay aaahs. Comparte tu catálogo y que empiecen los suspiros."
        }
      />

      <div className="flex flex-col gap-4 px-5 pt-4">
        {nuevos > 0 && (
          <Link href="/pedidos" data-tarjeta-nuevos className="tocable flex w-full items-center gap-3.5 rounded-[22px] bg-mandarina px-4 py-3.5 text-left text-bosque">
            <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-bosque font-display text-[22px] text-papel">
              <Numero valor={nuevos} />
            </span>
            <span className="min-w-0 grow">
              <span className="block text-base font-extrabold">{nuevos === 1 ? "1 pedido nuevo" : `${nuevos} pedidos nuevos`}</span>
              <span className="block text-[13.5px] font-semibold">Alguien dijo aaah. No lo dejes en visto.</span>
            </span>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </Link>
        )}

        <Segmentos etiqueta="Periodo del resumen" valor={periodo} alCambiar={setPeriodo} opciones={PERIODOS.map((p) => ({ id: p.id, texto: p.nombre }))} />

        {!resumen && (
          <>
            <Esqueleto className="h-[248px] rounded-[26px]" />
            <Esqueleto className="h-[172px] rounded-[20px]" />
          </>
        )}

        {resumen && resumen.vacio && (
          <div data-resumen-vacio>
            <EstadoVacio
              ilustracion="inicio"
              titulo={VACIO[periodo]}
              remate="Cuando alguien suspire por tu catálogo o te haga un pedido, lo ves aquí primero."
              nota="tu vitrina te espera"
            />
          </div>
        )}

        {resumen && !resumen.vacio && (
          <>
            <TarjetaVentas resumen={resumen} />
            <Metricas resumen={resumen} />
            <TopProductos resumen={resumen} />
          </>
        )}

        {data && <OjoConElStock productos={data.productos} />}
        {data && tienda && <TarjetaPlan tienda={tienda} productos={data.productos.length} />}

        <p className="mt-0.5 text-center font-mano text-[21px] text-suave">tu pulgar tiene buen gusto. déjalo trabajar.</p>
      </div>
    </>
  );
}

function TarjetaVentas({ resumen: r }: { resumen: Resumen }) {
  const texto = textoVariacion(r.variacion);
  const tono = r.variacion === null ? "" : r.variacion > 0 ? "bg-menta text-bosque" : r.variacion < 0 ? "bg-rosa text-bosque" : "bg-papel/15 text-papel";
  return (
    <section data-tarjeta-ventas aria-label={`Ventas · ${r.rangos.etiqueta}`} className="rounded-[26px] bg-bosque px-[18px] pt-5 pb-4 text-papel">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-bold tracking-[0.08em] text-rosa uppercase">Ventas · {r.rangos.etiqueta}</p>
          <p data-ventas className="mt-1 font-display text-[38px] leading-[1.05]">
            {formatearPesos(r.ventas)}
          </p>
        </div>
        {texto && (
          <span data-variacion className={`mt-0.5 shrink-0 rounded-full px-2.5 py-[5px] text-[12.5px] font-extrabold whitespace-nowrap ${tono}`}>
            {texto}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[13px] text-[#D9E6DF]">{texto ? r.rangos.contra : "Todavía no hay ventas de antes para comparar."}</p>
      <GraficoVentas key={r.periodo} barras={r.rangos.barras} valores={r.ventasPorBarra} actual={r.rangos.barraActual} titulo={TITULO_GRAFICO[r.periodo]} />
    </section>
  );
}

function Metricas({ resumen: r }: { resumen: Resumen }) {
  const tarjeta = "rounded-[20px] p-3.5";
  const etiqueta = "text-[12.5px] font-semibold text-suave";
  const cifra = "font-display text-[26px] leading-tight";
  return (
    <div data-metricas className="grid grid-cols-2 gap-2.5">
      <div className={`${tarjeta} border border-linea bg-white`}>
        <p className={etiqueta}>Pedidos</p>
        <p data-metrica="pedidos" className={cifra}>
          <Numero valor={r.pedidos} />
        </p>
      </div>
      <div className={`${tarjeta} border border-linea bg-white`}>
        <p className={etiqueta}>Ticket promedio</p>
        <p data-metrica="ticket" className={cifra}>
          {r.ticketPromedio === null ? "—" : formatearPesos(r.ticketPromedio)}
        </p>
      </div>
      <div className={`${tarjeta} bg-rosa`}>
        <p className="flex items-center gap-[5px] text-[12.5px] font-bold">
          <IconoCorazon tamano={14} className="fill-bosque" />
          Aaahs
        </p>
        <p data-metrica="aaahs" className={cifra}>
          <Numero valor={r.aaahs.toLocaleString("en-US")} />
        </p>
      </div>
      <div className={`${tarjeta} border border-linea bg-white`}>
        <p className={etiqueta}>De aaah a pedido</p>
        <p data-metrica="conversion" className={cifra}>
          {r.conversion === null ? "—" : `${r.conversion.toFixed(1)}%`}
        </p>
      </div>
    </div>
  );
}

function TopProductos({ resumen: r }: { resumen: Resumen }) {
  const max = r.top[0]?.unidades ?? 1;
  return (
    <section data-top className="rounded-[24px] border border-linea bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl">Lo que más se vende</h2>
        <span className="font-mano text-[19px] text-mandarina">tu top 3</span>
      </div>
      {r.top.length === 0 ? (
        <p className="mt-2 text-[14px] text-suave">Todavía no se ha vendido nada en este periodo. Los aaahs ya están llegando.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {r.top.map((t) => (
            <li key={t.productoId}>
              <Link href={`/catalogo/${t.productoId}`} className="tocable flex items-center gap-3">
                {t.foto ? <Foto src={t.foto} alt="" className="h-12 w-12 shrink-0 rounded-[14px]" sizes="48px" /> : <span className="h-12 w-12 shrink-0 rounded-[14px] bg-arena" />}
                <span className="min-w-0 grow">
                  <span className="flex justify-between gap-2 text-[14.5px] font-bold">
                    <span className="truncate">{t.nombre}</span>
                    <span data-unidades className="shrink-0">
                      {t.unidades} {t.unidades === 1 ? "vendido" : "vendidos"}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-arena">
                    <span className="block h-2 origin-left rounded-full bg-mandarina" style={{ transform: `scaleX(${t.unidades / max})` }} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function OjoConElStock({ productos }: { productos: Producto[] }) {
  const bajos = stockBajo(productos, STOCK_BAJO);
  return (
    <section data-stock className="rounded-[24px] border border-linea bg-white p-4">
      <h2 className="font-display text-xl">Ojo con el stock</h2>
      {bajos.length === 0 ? (
        <p className="mt-0.5 text-[13.5px] text-suave">Todo con stock. Tu vitrina está lista para lo que venga.</p>
      ) : (
        <>
          <p className="mt-0.5 mb-2.5 text-[13.5px] text-suave">Lo que se agota, se desliza igual… pero no se vende.</p>
          <ul className="flex flex-col gap-1">
            {bajos.map((p) => (
              <li key={p.id}>
                <Link href={`/catalogo/${p.id}`} className="tocable flex w-full items-center gap-3 py-2 text-left">
                  {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-11 w-11 shrink-0 rounded-[12px]" sizes="44px" /> : <span className="h-11 w-11 shrink-0 rounded-[12px] bg-arena" />}
                  <span className="min-w-0 grow truncate text-[14.5px] font-bold">{p.nombre}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-extrabold ${p.stock === 0 ? "bg-bosque text-papel" : "bg-mandarina text-bosque-oscuro"}`}
                  >
                    {p.stock === 0 ? "Agotado" : p.stock === 1 ? "Queda 1" : `Quedan ${p.stock}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TarjetaPlan({ tienda, productos }: { tienda: Tienda; productos: number }) {
  const { abrirPlan } = usePanelUI();
  const limite = tienda.limiteProductos;
  const fotos = Math.floor(tienda.creditosRetoque / CREDITOS_POR_RETOQUE);
  return (
    <button type="button" onClick={abrirPlan} className="tocable block w-full rounded-[24px] bg-rosa p-4 text-left text-bosque">
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl">{NOMBRE_PLAN[tienda.plan]}</span>
        <span className="text-[13px] font-bold underline">Ver plan</span>
      </span>
      <span className="mt-1 block text-[14px] font-extrabold">
        {productos} de {limite} productos
      </span>
      <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-papel">
        <span className="block h-2.5 origin-left rounded-full bg-bosque" style={{ transform: `scaleX(${limite ? Math.min(1, productos / limite) : 0})` }} />
      </span>
      <span className="mt-2 block text-[13.5px] font-semibold">
        {tienda.creditosRetoque} créditos · te alcanzan para {fotos} {fotos === 1 ? "foto retocada" : "fotos retocadas"}
      </span>
    </button>
  );
}
