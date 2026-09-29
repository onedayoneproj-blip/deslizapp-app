"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CREDITOS_POR_RETOQUE, NOMBRE_PLAN, STOCK_BAJO } from "@/lib/config";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos, saludo } from "@/lib/formato";
import {
  aaahsDeLaSemana,
  anclaDe,
  calcularResumen,
  contarPedidosNuevos,
  diaDeLaSemana,
  inicioDeDatos,
  nombreMes,
  primerMesConDatos,
  stockBajo,
  textoVariacion,
  type Ancla,
  type BarraConValor,
  type Resumen,
  type Vista,
} from "@/lib/resumen";
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

const VISTAS: { id: Vista; nombre: string }[] = [
  { id: "hoy", nombre: "Hoy" },
  { id: "semana", nombre: "7 días" },
  { id: "mes", nombre: "Mes" },
  { id: "anio", nombre: "Año" },
];

const VACIO: Record<Vista, string> = {
  hoy: "Hoy todavía está tranquilo.",
  semana: "Una semana calladita.",
  mes: "Un mes calladito.",
  anio: "Un año en blanco… por ahora.",
};

const POR: Record<Vista, string> = { hoy: "por franja de 2 horas", semana: "por día", mes: "por día", anio: "por mes" };
const SIN_DATOS: Record<Vista, string> = {
  hoy: "Aún no hay datos de esta franja",
  semana: "Aún no hay datos de este día",
  mes: "Aún no hay datos de este día",
  anio: "Aún no hay datos de este mes",
};

/** La pastilla elegida se recuerda mientras la app esté abierta (en memoria, no en localStorage). */
let vistaRecordada: Vista = "semana";

const mismoMes = (a: Ancla, b: Ancla) => a.anio === b.anio && a.mes === b.mes;

/** Resumen (Inicio). Todas las cifras salen de lib/resumen.ts con los datos de la tienda activa. */
export function VistaInicio() {
  const { tiendaId } = useTiendaActiva();
  // Otra tienda empieza de cero (su mes actual, sin barra elegida): nada se mezcla.
  return <Inicio key={tiendaId} />;
}

function Inicio() {
  const { getPedidos, getEventosAaah, getProductos } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const [vista, setVistaEstado] = useState<Vista>(vistaRecordada);
  /** Mes/año mirado en Mes y Año; `null` = el actual. */
  const [ancla, setAncla] = useState<Ancla | null>(null);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // "Ahora" se toma al consultar (no al pintar): cada cambio de datos (p. ej. un pedido simulado) lo renueva.
  const { data } = useConsulta(`resumen:${tiendaId}`, async () => {
    const [pedidos, eventos, productos] = await Promise.all([getPedidos(tiendaId), getEventosAaah(tiendaId), getProductos(tiendaId)]);
    return { pedidos, eventos, productos, ahora: Date.now() };
  });

  const inicio = data && tienda ? inicioDeDatos(data, tienda.creadoEn) : null;
  const actual = data ? anclaDe(data.ahora) : null;
  const primero = data && tienda ? primerMesConDatos(data, tienda.creadoEn) : null;
  const mirado = ancla ?? actual;
  const resumen = useMemo(
    () => (data && mirado && inicio !== null ? calcularResumen(data, vista, mirado, data.ahora, { inicio, seleccion }) : null),
    [data, vista, mirado?.anio, mirado?.mes, inicio, seleccion], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // El aviso "Aún no hay datos…" se va solo
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2200);
    return () => clearTimeout(t);
  }, [aviso]);

  const cambiarVista = (v: Vista) => {
    vistaRecordada = v;
    setVistaEstado(v);
    setAncla(null);
    setSeleccion(null);
    setAviso(null);
  };
  const irA = (a: Ancla | null) => {
    setAncla(a && actual && mismoMes(a, actual) ? null : a);
    setSeleccion(null);
    setAviso(null);
  };
  const verMes = (mes: number) => {
    if (!mirado) return;
    vistaRecordada = "mes";
    setVistaEstado("mes");
    irA({ anio: mirado.anio, mes });
  };
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

        <Segmentos etiqueta="Periodo del resumen" valor={vista} alCambiar={cambiarVista} opciones={VISTAS.map((p) => ({ id: p.id, texto: p.nombre }))} />

        {(vista === "mes" || vista === "anio") && mirado && actual && primero && (
          <NavegadorPeriodo vista={vista} mirado={mirado} actual={actual} primero={primero} irA={irA} />
        )}

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
              titulo={VACIO[vista]}
              remate="Cuando alguien suspire por tu catálogo o te haga un pedido, lo ves aquí primero."
              nota="tu vitrina te espera"
            />
          </div>
        )}

        {resumen && !resumen.vacio && (
          <>
            <TarjetaVentas
              resumen={resumen}
              alElegir={(i) => {
                setAviso(null);
                setSeleccion(i);
              }}
              alLimpiar={() => setSeleccion(null)}
              alTocarVacia={() => setAviso(SIN_DATOS[vista])}
            />
            <AvisoFiltro resumen={resumen} aviso={aviso} alLimpiar={() => setSeleccion(null)} verMes={verMes} />
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

function NavegadorPeriodo({ vista, mirado, actual, primero, irA }: { vista: "mes" | "anio"; mirado: Ancla; actual: Ancla; primero: Ancla; irA: (a: Ancla | null) => void }) {
  const esMes = vista === "mes";
  const enActual = esMes ? mismoMes(mirado, actual) : mirado.anio === actual.anio;
  const enPrimero = esMes ? mismoMes(mirado, primero) : mirado.anio <= primero.anio;
  const mover = (paso: number) =>
    irA(esMes ? anclaDe(Date.UTC(mirado.anio, mirado.mes + paso, 15)) : { anio: mirado.anio + paso, mes: paso > 0 && mirado.anio + 1 === actual.anio ? actual.mes : 0 });
  const flecha = "tocable grid h-11 w-11 shrink-0 place-items-center rounded-full text-bosque disabled:text-apagado";
  return (
    <div data-navegador className="-mt-1.5 flex flex-col items-center">
      <div className="flex w-full items-center justify-between">
        <button type="button" onClick={() => mover(-1)} disabled={enPrimero} aria-label={esMes ? "Mes anterior" : "Año anterior"} className={flecha}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <p data-periodo className="font-display text-[19px]" aria-live="polite">
          {esMes ? `${nombreMes(mirado.mes)} ${mirado.anio}` : mirado.anio}
        </p>
        <button type="button" onClick={() => mover(1)} disabled={enActual} aria-label={esMes ? "Mes siguiente" : "Año siguiente"} className={flecha}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {!enActual && (
        <button type="button" onClick={() => irA(null)} className="tocable -mt-1 text-[13px] font-bold text-suave underline underline-offset-2">
          {esMes ? "Volver a este mes" : "Volver a este año"}
        </button>
      )}
    </div>
  );
}

function TarjetaVentas({
  resumen: r,
  alElegir,
  alLimpiar,
  alTocarVacia,
}: {
  resumen: Resumen;
  alElegir: (i: number) => void;
  alLimpiar: () => void;
  alTocarVacia: (b: BarraConValor) => void;
}) {
  const texto = textoVariacion(r.variacion);
  const tono = r.variacion === null ? "" : r.variacion > 0 ? "bg-menta text-bosque" : r.variacion < 0 ? "bg-rosa text-bosque" : "bg-papel/15 text-papel";
  return (
    <section data-tarjeta-ventas aria-label={`Ventas ${r.titulo}`} className="rounded-[26px] bg-bosque px-[18px] pt-5 pb-4 text-papel">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p data-titulo-ventas className="text-[13px] font-bold tracking-[0.08em] text-rosa uppercase">
            Ventas {r.titulo}
          </p>
          <p data-ventas className="mt-1 font-display text-[36px] leading-[1.05]">
            {formatearPesos(r.ventas)}
          </p>
        </div>
        <div className="mt-0.5 flex max-w-[132px] shrink-0 flex-col items-end gap-1 text-right">
          {texto ? (
            <>
              <span data-variacion className={`rounded-full px-2.5 py-[5px] text-[12.5px] font-extrabold whitespace-nowrap ${tono}`}>
                {texto}
              </span>
              <span data-contra className="text-[11.5px] leading-tight text-[#D9E6DF]">
                {r.comparacion.texto}
              </span>
            </>
          ) : (
            <span data-sin-comparacion className="text-[12px] leading-tight font-semibold text-[#D9E6DF]">
              Sin comparación todavía
            </span>
          )}
        </div>
      </div>
      <GraficoVentas
        barras={r.barras}
        seleccion={r.seleccion}
        titulo={`Ventas ${r.seleccion === null ? r.titulo : ""} ${POR[r.vista]}`.replace(/\s+/g, " ")}
        alElegir={alElegir}
        alLimpiar={alLimpiar}
        alTocarVacia={alTocarVacia}
      />
    </section>
  );
}

/** Píldora "Mostrando solo el 12 de sept" (con ✕ y, en Año, "Ver mes →"), o el aviso breve de una barra vacía. */
function AvisoFiltro({ resumen: r, aviso, alLimpiar, verMes }: { resumen: Resumen; aviso: string | null; alLimpiar: () => void; verMes: (mes: number) => void }) {
  if (aviso)
    return (
      <p role="status" data-aviso-vacio className="-mt-1.5 self-center rounded-full bg-arena px-4 py-2 text-[13.5px] font-bold text-suave">
        {aviso}
      </p>
    );
  if (r.seleccion === null) return null;
  const barra = r.barras[r.seleccion]!;
  return (
    <div role="status" data-filtro className="-mt-1.5 flex items-center gap-1 self-center rounded-full bg-rosa py-1 pr-1 pl-4 text-bosque">
      <span className="text-[13.5px] font-extrabold">Mostrando solo {barra.solo}</span>
      {r.vista === "anio" && (
        <button type="button" onClick={() => verMes(r.seleccion!)} className="tocable ml-1 h-9 rounded-full bg-papel px-3 text-[13px] font-extrabold">
          Ver mes →
        </button>
      )}
      <button type="button" onClick={alLimpiar} aria-label="Ver todo el periodo" className="tocable grid h-9 w-9 place-items-center rounded-full">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
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
