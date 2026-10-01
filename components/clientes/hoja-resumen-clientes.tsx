"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Hoja, useIrArribaHoja } from "../hoja";
import { Avatar } from "./comunes";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { ContenidoResumenClientes } from "./contenido-resumen-clientes";
import { enlaceWhatsApp } from "@/lib/formato";
import { calcularJugadas, diasDesde, mensajeJugada, type IdJugada, type Jugada } from "@/lib/proxima-jugada";
import type { ClienteAnalizado, FiltroClientes, ResumenClientes } from "@/lib/clientes-resumen";
import type { ClienteConResumen, Pedido } from "@/lib/types";
export { SEGMENTOS_CLIENTES } from "./contenido-resumen-clientes";

type Vista = "resumen" | "galeria" | IdJugada;

export function HojaResumenClientes({ resumen, clientes, pedidos, tiendaId, tienda, vendedora, urlCatalogo, ahora, alCerrar, alFiltrar }: {
  resumen: ResumenClientes; clientes: ClienteConResumen[]; pedidos: Pedido[]; tiendaId: string;
  tienda: string; vendedora: string; urlCatalogo: string | null; ahora: number;
  alCerrar: () => void; alFiltrar: (filtro: FiltroClientes) => void;
}) {
  const [vista, setVista] = useState<Vista>("resumen");
  const profundidad = useRef(0);
  const { jugadas, destacada, total } = calcularJugadas(clientes, pedidos, tiendaId, ahora);
  const seleccionada = jugadas.find((j) => j.id === vista);
  useEffect(() => {
    const atras = (e: PopStateEvent) => {
      if (profundidad.current === 0) return;
      profundidad.current--;
      const siguiente = e.state?.deslizappJugada as Vista | undefined;
      setVista(siguiente && siguiente !== "resumen" ? siguiente : "resumen");
    };
    window.addEventListener("popstate", atras);
    return () => window.removeEventListener("popstate", atras);
  }, []);
  const navegar = (siguiente: Vista) => {
    window.history.pushState({ ...(window.history.state ?? {}), deslizappJugada: siguiente }, "");
    profundidad.current++;
    setVista(siguiente);
  };
  const volver = () => {
    if (profundidad.current > 0) window.history.back();
    else setVista("resumen");
  };
  const cerrar = () => {
    if (profundidad.current > 0) window.history.go(-profundidad.current);
    alCerrar();
  };
  const elegir = (f: FiltroClientes) => { cerrar(); alFiltrar(f); };
  const titulo = vista === "resumen" ? "Tus clientes" : vista === "galeria" ? "Tu próxima jugada" : seleccionada?.nombre ?? "Tu próxima jugada";

  return <Hoja abierta alCerrar={cerrar} titulo={titulo} altura="grande"
    fijoArriba={vista !== "resumen" ? <button type="button" onClick={volver}
      className="tocable flex min-h-11 items-center gap-2 rounded-full text-sm font-extrabold text-bosque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque"
      aria-label={`Volver a ${vista === "galeria" ? "Tus clientes" : "Tu próxima jugada"}`}>
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full border border-borde bg-white text-xl">‹</span>
      {vista === "galeria" ? "Tus clientes" : "Todas las jugadas"}
    </button> : undefined}>
    <Contenido vista={vista} resumen={resumen} jugadas={jugadas} destacada={destacada} total={total}
      seleccionada={seleccionada} ahora={ahora} tienda={tienda} vendedora={vendedora} urlCatalogo={urlCatalogo}
      tiendaId={tiendaId} navegar={navegar} elegir={elegir} cerrar={cerrar} />
  </Hoja>;
}

function Contenido({ vista, resumen, jugadas, destacada, total, seleccionada, ahora, tienda, vendedora, urlCatalogo, tiendaId, navegar, elegir, cerrar }: {
  vista: Vista; resumen: ResumenClientes; jugadas: Jugada[]; destacada: Jugada | null; total: number;
  seleccionada?: Jugada; ahora: number; tienda: string; vendedora: string; urlCatalogo: string | null;
  tiendaId: string; navegar: (vista: Vista) => void; elegir: (f: FiltroClientes) => void; cerrar: () => void;
}) {
  const irArriba = useIrArribaHoja();
  useEffect(() => { irArriba(); }, [vista, irArriba]);
  const paginadas = useVerMas(seleccionada?.clientes ?? [], `${tiendaId}:${vista}`, 5);
  if (vista === "resumen") return <ContenidoResumenClientes resumen={resumen} alFiltrar={elegir} alAbrirJugadas={() => navegar("galeria")} destacada={destacada} />;
  return <div className="relative isolate min-h-full pb-6">
    <Resplandor />
    <div className="relative z-10">
    {vista === "galeria" ? <>
      <p className="mb-4 text-[14px] leading-[1.45] text-suave">Cuatro maneras de acercarte a tu gente. Los números salen de tus pedidos.</p>
      {jugadas.length ? <div className="grid grid-cols-2 gap-2.5">{jugadas.map((j) => <button key={j.id} type="button" onClick={() => navegar(j.id)}
        aria-label={`${j.nombre}: ${j.cantidad} ${j.cantidad === 1 ? "cliente" : "clientes"}. Ver jugada`}
        className="tocable relative flex min-h-[250px] flex-col overflow-hidden rounded-[22px] p-3.5 text-left text-bosque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque" style={{ backgroundColor: j.color }}>
        <Image src={j.imagen} alt="" width={180} height={180} sizes="(max-width: 430px) 42vw, 180px" className="pointer-events-none absolute inset-x-0 top-3 mx-auto h-[140px] w-[140px] object-contain" />
        <span className="relative z-10 ml-auto rounded-full bg-papel/90 px-2.5 py-1 text-[11px] font-extrabold">{j.cantidad} {j.cantidad === 1 ? "cliente" : "clientes"}</span>
        <span className="relative z-10 mt-auto block"><b className="block font-display text-[22px] leading-[1.05]">{j.nombre}</b><span className="mt-1.5 block text-[11.5px] leading-[1.3]">{j.descripcion}</span></span>
      </button>)}</div> : <div className="rounded-[22px] bg-white p-6 text-center"><b className="font-display text-xl">Por ahora, todo tranquilo.</b><p className="mt-2 text-sm text-suave">Cuando haya clientes sin pedidos en curso, aquí encontrarás ideas para conversar.</p></div>}
      <p className="mt-5 text-center text-[12px] text-suave">Toca una jugada para ver a quién podrías escribir.</p>
      <p className="mt-3 rounded-2xl bg-white/85 p-3.5 text-[12px] leading-[1.4] text-bosque">Una persona puede encajar en más de una jugada. Tú eliges con quién conversar.</p>
    </> : seleccionada ? <Detalle jugada={seleccionada} total={total} ahora={ahora} tienda={tienda}
      vendedora={vendedora} urlCatalogo={urlCatalogo} cerrar={cerrar} paginadas={paginadas} /> : null}
    </div>
  </div>;
}

function Detalle({ jugada: j, total, ahora, tienda, vendedora, urlCatalogo, cerrar, paginadas }: {
  jugada: Jugada; total: number; ahora: number; tienda: string; vendedora: string; urlCatalogo: string | null;
  cerrar: () => void; paginadas: ReturnType<typeof useVerMas<ClienteAnalizado>>;
}) {
  return <>
    <div className="relative min-h-[164px] overflow-hidden rounded-[22px] p-4" style={{ backgroundColor: j.color }}>
      <Image src={j.imagen} alt="" width={180} height={180} sizes="160px" className="pointer-events-none absolute -right-2 top-0 h-[160px] w-[160px] object-contain" />
      <div className="relative z-10 max-w-[62%]"><b className="font-display text-[40px] leading-none">{j.porcentaje} %</b>
        <p className="mt-2 text-[14px] font-bold leading-[1.25]">de tus clientes {j.explicacion}</p>
        <p className="mt-2 text-[11px] leading-[1.3]">{j.cantidad} de {total} clientes · solo pedidos despachados</p>
      </div>
    </div>
    <p className="my-5 text-[14px] leading-[1.5]"><b>{j.consejo.split(".")[0]}.</b>{j.consejo.slice(j.consejo.indexOf(".") + 1)}</p>
    <h3 className="font-display text-[21px]">{j.cantidad > 5 ? "Empieza con estos 5" : "Clientes para esta jugada"}</h3>
    <p className="mb-3 text-[12px] text-suave">Escribir abre WhatsApp con un mensaje listo para editar.</p>
    <ul className="space-y-2.5">{paginadas.visibles.map((c) => {
      const dias = diasDesde(c.ultimaVenta, ahora);
      const detalle = j.id === "volver" ? `Última compra hace ${dias} días` : j.id === "segundo" ? `Compró hace ${dias} días` : j.id === "gracias" ? `${c.compras} compras despachadas` : "Aún no compra";
      return <li key={c.id} className="flex min-h-[66px] items-center gap-2 rounded-[17px] border border-linea bg-white px-2.5 py-2">
        <Avatar nombre={c.nombre} /><span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{c.nombre}</b><span className="block text-[11px] text-suave">{detalle}</span></span>
        {c.telefono ? <a href={enlaceWhatsApp(c.telefono, mensajeJugada(j.id, c.nombre, vendedora, tienda, urlCatalogo))} target="_blank" rel="noreferrer"
          aria-label={`Escribir a ${c.nombre} por WhatsApp sobre ${j.nombre}`}
          className="tocable inline-flex min-h-11 items-center rounded-full bg-bosque px-3 text-[12px] font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque">Escribir</a> :
          <Link href={`/clientes/${c.id}`} scroll={false} onClick={cerrar} aria-label={`Sin WhatsApp. Ver datos de ${c.nombre}`}
            className="tocable inline-flex min-h-11 items-center rounded-full border border-bosque px-2.5 text-[11px] font-extrabold text-bosque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bosque">Sin WhatsApp · Ver datos</Link>}
      </li>;
    })}</ul>
    <BotonVerMas quedan={paginadas.quedan} mostrados={paginadas.mostrados} total={j.cantidad} alTocar={paginadas.verMas} texto="Ver más clientes" />
    <p className="mt-4 text-[12px] leading-[1.4] text-suave">La cifra incluye a todos los clientes elegibles, incluso si no tienen WhatsApp. Ningún mensaje se envía solo.</p>
  </>;
}

function Resplandor() {
  return <div className="jugada-resplandor" aria-hidden="true"><div className="jugada-resplandor-color" /><div className="jugada-resplandor-grano" /></div>;
}
