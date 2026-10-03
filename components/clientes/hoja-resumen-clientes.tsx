"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Hoja, useIrArribaHoja } from "../hoja";
import { Avatar, Boton, FilaLista, ListaAgrupada } from "../ui";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { ContenidoResumenClientes } from "./contenido-resumen-clientes";
import { BotonVolver } from "../selector-busqueda";
import { menosMovimiento } from "@/lib/movimiento";
import { LuzJugada, TransicionJugada, type OrigenLuz } from "./luz-jugada";
import { HojaBorradoresJugada } from "./hoja-borradores-jugada";
import { calcularJugadas, diasDesde, type IdJugada, type Jugada } from "@/lib/proxima-jugada";
import type { ClienteAnalizado, FiltroClientes, ResumenClientes } from "@/lib/clientes-resumen";
import type { ClienteConResumen, Pedido } from "@/lib/types";
export { SEGMENTOS_CLIENTES } from "./contenido-resumen-clientes";

type Vista = "resumen" | "galeria" | IdJugada;

export function HojaResumenClientes({ resumen, clientes, pedidos, tiendaId, tienda, vendedora, urlCatalogo, ahora, alCerrar, alFiltrar }: {
  resumen: ResumenClientes; clientes: ClienteConResumen[]; pedidos: Pedido[]; tiendaId: string;
  tienda: string; vendedora: string; urlCatalogo: string | null; ahora: number;
  alCerrar: () => void; alFiltrar: (filtro: FiltroClientes) => void;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("resumen");
  const profundidad = useRef(0);
  const vistaActual = useRef<Vista>("resumen");
  const [borrador, setBorrador] = useState<{ id: IdJugada; nombre: string; cliente: ClienteAnalizado } | null>(null);
  const [pulso, setPulso] = useState(0);
  const [transicion, setTransicion] = useState<{ tipo: "galeria" | "detalle"; origen?: OrigenLuz; id: number } | null>(null);
  const secuencia = useRef(0);
  const { jugadas, destacada, total } = calcularJugadas(clientes, pedidos, tiendaId, ahora);
  const seleccionada = jugadas.find((j) => j.id === vista);
  useEffect(() => {
    const atras = (e: PopStateEvent) => {
      const siguiente = (e.state?.deslizappJugada as Vista | undefined) ?? "resumen";
      // Cerrar una hoja apilada también emite popstate; si la vista no cambió, no consume un nivel.
      if (profundidad.current === 0 || siguiente === vistaActual.current) return;
      profundidad.current--;
      vistaActual.current = siguiente;
      setTransicion(null);
      setVista(siguiente);
    };
    window.addEventListener("popstate", atras);
    return () => window.removeEventListener("popstate", atras);
  }, []);
  const navegar = (siguiente: Vista, elemento?: HTMLElement) => {
    if (siguiente === vistaActual.current) return;
    const efecto = vista === "resumen" && siguiente === "galeria" ? "galeria" : vista === "galeria" && siguiente !== "resumen" ? "detalle" : null;
    const r = elemento?.getBoundingClientRect();
    setTransicion(efecto && !menosMovimiento() ? { tipo: efecto, origen: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined, id: ++secuencia.current } : null);
    if (efecto) setPulso((n) => n + 1);
    window.history.pushState({ ...(window.history.state ?? {}), deslizappJugada: siguiente }, "");
    profundidad.current++;
    vistaActual.current = siguiente;
    setVista(siguiente);
  };
  const volver = () => {
    setTransicion(null);
    if (profundidad.current > 0) window.history.back();
    else setVista("resumen");
  };
  const cerrar = () => {
    setTransicion(null);
    if (profundidad.current > 0) window.history.go(-profundidad.current);
    alCerrar();
  };
  const irADatos = (clienteId: string) => {
    const destino = `/clientes/${encodeURIComponent(clienteId)}`;
    if (profundidad.current > 0) {
      window.addEventListener("popstate", () => router.push(destino, { scroll: false }), { once: true });
      window.history.go(-profundidad.current);
    } else router.push(destino, { scroll: false });
    alCerrar();
  };
  const elegir = (f: FiltroClientes) => { cerrar(); alFiltrar(f); };
  const titulo = vista === "resumen" ? "Tus clientes" : vista === "galeria" ? "Tu próxima jugada" : seleccionada?.nombre ?? "Tu próxima jugada";

  return <Hoja abierta alCerrar={cerrar} titulo={titulo} altura="grande"
    decoracionAbajo={vista !== "resumen" ? <LuzJugada pulso={pulso} /> : undefined}
    decoracionEncima={transicion ? <TransicionJugada key={transicion.id} tipo={transicion.tipo} origen={transicion.origen} alTerminar={() => setTransicion(null)} /> : undefined}
    fijoArriba={vista !== "resumen" ? <div className="flex items-center gap-2 text-secundario font-extrabold text-texto">
      <BotonVolver onClick={volver} etiqueta={`Volver a ${vista === "galeria" ? "Tus clientes" : "Tu próxima jugada"}`} />
      <span aria-hidden="true">{vista === "galeria" ? "Tus clientes" : "Todas las jugadas"}</span>
    </div> : undefined}>
    <Contenido vista={vista} resumen={resumen} jugadas={jugadas} destacada={destacada} total={total}
      seleccionada={seleccionada} ahora={ahora}
      tiendaId={tiendaId} navegar={navegar} elegir={elegir} irADatos={irADatos} alPulsar={() => setPulso((n) => n + 1)} alEscribir={(id, nombre, cliente) => { setTransicion(null); setBorrador({ id, nombre, cliente }); }} />
    {borrador && <HojaBorradoresJugada key={`${borrador.id}:${borrador.cliente.id}`} id={borrador.id} nombreJugada={borrador.nombre}
      cliente={borrador.cliente.nombre} telefono={borrador.cliente.telefono!} vendedora={vendedora} tienda={tienda} urlCatalogo={urlCatalogo}
      alCerrar={() => setBorrador(null)} />}
  </Hoja>;
}

function Contenido({ vista, resumen, jugadas, destacada, total, seleccionada, ahora, tiendaId, navegar, elegir, irADatos, alEscribir, alPulsar }: {
  vista: Vista; resumen: ResumenClientes; jugadas: Jugada[]; destacada: Jugada | null; total: number;
  seleccionada?: Jugada; ahora: number;
  tiendaId: string; navegar: (vista: Vista, elemento?: HTMLElement) => void; alPulsar: () => void; elegir: (f: FiltroClientes) => void; irADatos: (clienteId: string) => void; alEscribir: (id: IdJugada, nombre: string, cliente: ClienteAnalizado) => void;
}) {
  const irArriba = useIrArribaHoja();
  useEffect(() => { irArriba(); }, [vista, irArriba]);
  const paginadas = useVerMas(seleccionada?.clientes ?? [], `${tiendaId}:${vista}`, 5);
  if (vista === "resumen") return <ContenidoResumenClientes resumen={resumen} alFiltrar={elegir} alAbrirJugadas={(el) => navegar("galeria", el)} destacada={destacada} />;
  return <div className="relative min-h-full pb-6">
    {vista === "galeria" ? <>
      <p className="mb-4 text-secundario text-texto-secundario">Cuatro maneras de acercarte a tu gente. Los números salen de tus pedidos.</p>
      {jugadas.length ? <div className="grid grid-cols-2 gap-2.5">{jugadas.map((j) => <button key={j.id} type="button" onClick={() => navegar(j.id)}
        aria-label={`${j.nombre}: ${j.cantidad} ${j.cantidad === 1 ? "cliente" : "clientes"}. Ver jugada`}
        className="tocable relative isolate flex min-h-62 flex-col overflow-hidden rounded-radio-l border border-borde-campo p-3.5 text-left text-marca-bosque outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco" style={{ backgroundColor: j.color }}>
        <Image src={j.imagen} alt="" width={180} height={180} sizes="(max-width: 430px) 42vw, 180px" className="pointer-events-none absolute inset-x-0 top-3 mx-auto size-35 object-contain" />
        <span aria-hidden="true" className="jugada-tarjeta-degradado absolute inset-0" />
        <span className="relative z-10 ml-auto rounded-full bg-marca-papel/90 px-2.5 py-1 text-etiqueta font-extrabold">{j.cantidad} {j.cantidad === 1 ? "cliente" : "clientes"}</span>
        <span className="relative z-10 mt-auto block"><b className="block font-display text-titulo-seccion">{j.nombre}</b><span className="mt-1.5 block pr-5 text-etiqueta">{j.descripcion}</span></span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="absolute right-2.5 bottom-3 z-10 text-marca-bosque"><path d="M9 6l6 6-6 6" /></svg>
      </button>)}</div> : <div className="rounded-radio-l bg-superficie p-6 text-center"><b className="font-display text-titulo-seccion">Por ahora, todo tranquilo.</b><p className="mt-2 text-secundario text-texto-secundario">Cuando haya clientes sin pedidos en curso, aquí encontrarás ideas para conversar.</p></div>}
      <p className="mt-5 text-center text-etiqueta text-texto-secundario">Toca una jugada para ver a quién podrías escribir.</p>
      <p className="mt-3 rounded-radio-m bg-superficie p-3.5 text-etiqueta text-texto">Una persona puede encajar en más de una jugada. Tú eliges con quién conversar.</p>
    </> : seleccionada ? <Detalle jugada={seleccionada} total={total} ahora={ahora} irADatos={irADatos} alEscribir={alEscribir} alPulsar={alPulsar} paginadas={paginadas} /> : null}
  </div>;
}

function Detalle({ jugada: j, total, ahora, irADatos, alEscribir, alPulsar, paginadas }: {
  jugada: Jugada; total: number; ahora: number; alPulsar: () => void;
  alEscribir: (id: IdJugada, nombre: string, cliente: ClienteAnalizado) => void; irADatos: (clienteId: string) => void; paginadas: ReturnType<typeof useVerMas<ClienteAnalizado>>;
}) {
  return <>
    <div className="relative min-h-41 overflow-hidden rounded-radio-l p-4 text-marca-bosque" style={{ backgroundColor: j.color }}>
      <Image src={j.imagen} alt="" width={180} height={180} sizes="160px" className="pointer-events-none absolute top-0 -right-2 size-40 object-contain" />
      <div className="relative z-10 max-w-[62%]"><b className="font-display text-cifra">{j.porcentaje} %</b>
        <p className="mt-2 text-secundario font-bold">de tus clientes {j.explicacion}</p>
        <p className="mt-2 text-etiqueta">{j.cantidad} de {total} clientes · solo pedidos despachados</p>
      </div>
    </div>
    <p className="my-5 text-secundario"><b>{j.consejo.split(".")[0]}.</b>{j.consejo.slice(j.consejo.indexOf(".") + 1)}</p>
    <h3 className="font-display text-titulo-seccion">{j.cantidad > 5 ? "Empieza con estos 5" : "Clientes para esta jugada"}</h3>
    <p className="mb-3 text-etiqueta text-texto-secundario">Escribir te deja elegir y editar un borrador antes de abrir WhatsApp.</p>
    <ListaAgrupada etiqueta="Clientes para esta jugada">{paginadas.visibles.map((c) => {
      const dias = diasDesde(c.ultimaVenta, ahora);
      const detalle = j.id === "volver" ? `Última compra hace ${dias} días` : j.id === "segundo" ? `Compró hace ${dias} días` : j.id === "gracias" ? `${c.compras} compras despachadas` : "Aún no compra";
      return <FilaLista key={c.id} inicio={<Avatar nombre={c.nombre} />} titulo={c.nombre} detalle={detalle}
        accion={c.telefono ? <Boton tamano="compacto" onClick={() => alEscribir(j.id, j.nombre, c)} aria-label={`Escribir a ${c.nombre} por WhatsApp sobre ${j.nombre}`}>Escribir</Boton> :
          <Boton jerarquia="secundario" tamano="compacto" onClick={() => irADatos(c.id)} aria-label={`Sin WhatsApp. Ver datos de ${c.nombre}`}>Sin WhatsApp · Ver datos</Boton>} />;
    })}</ListaAgrupada>
    <BotonVerMas quedan={paginadas.quedan} mostrados={paginadas.mostrados} total={j.cantidad} alTocar={() => { paginadas.verMas(); alPulsar(); }} texto="Ver más clientes" />
    <p className="mt-4 text-etiqueta text-texto-secundario">La cifra incluye a todos los clientes elegibles, incluso si no tienen WhatsApp. Ningún mensaje se envía solo.</p>
  </>;
}
