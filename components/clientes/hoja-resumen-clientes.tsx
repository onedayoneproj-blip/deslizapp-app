"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { getImageProps } from "next/image";
import { Hoja, useIrArribaHoja } from "../hoja";
import { Avatar, Boton, FilaLista, ListaAgrupada } from "../ui";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { ContenidoResumenClientes, NOMBRE_GRUPO_CLIENTES } from "./contenido-resumen-clientes";
import { FilaCliente } from "./fila-cliente";
import { BotonVolver } from "../selector-busqueda";
import { menosMovimiento } from "@/lib/movimiento";
import { FUNCIONES } from "@/lib/funciones";
import { BarridoContenido, BarridoFranja, BrilloJugada, CruceTexto, EntradaCapas, medirEntrada, posicionAtras, type OrigenEntrada } from "./transiciones-jugada";
import { HojaEscribirJugada } from "./hoja-escribir-jugada";
import { useConsulta } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { ordenarPorEnvio } from "@/lib/jugada-envios";
import { CARTAS_JUGADAS, calcularJugadas, diasDesde, type IdJugada, type Jugada } from "@/lib/proxima-jugada";
import { cumpleFiltroCliente, ordenarClientes, type ClienteAnalizado, type FiltroClientes, type GrupoClientes, type ResumenClientes } from "@/lib/clientes-resumen";
import type { ClienteConResumen, Pedido } from "@/lib/types";
export { SEGMENTOS_CLIENTES } from "./contenido-resumen-clientes";

type Vista = "resumen" | "galeria" | IdJugada | `grupo:${GrupoClientes}`;
const esGrupo = (v: Vista): v is `grupo:${GrupoClientes}` => v.startsWith("grupo:");
/** Con Tu próxima jugada apagada (lib/funciones.ts) solo existen el resumen y los grupos: la galería y las jugadas no se alcanzan. */
const vistaPermitida = (v: Vista) => FUNCIONES.proximaJugada || v === "resumen" || esGrupo(v);
const SIN_JUGADAS: { jugadas: Jugada[]; destacada: Jugada | null; total: number } = { jugadas: [], destacada: null, total: 0 };

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
  // Barrido al elegir una jugada desde la galería (decoración; la navegación ya ocurrió)
  const [barrido, setBarrido] = useState<number | null>(null);
  // Entrada a la galería: la vista anterior se queda detrás mientras la malla crece y los cuadros vuelan desde el mazo
  const [entrada, setEntrada] = useState<{ origen: OrigenEntrada; id: number } | null>(null);
  const secuencia = useRef(0);
  const { jugadas, destacada, total } = FUNCIONES.proximaJugada ? calcularJugadas(clientes, pedidos, tiendaId, ahora) : SIN_JUGADAS;
  const seleccionada = jugadas.find((j) => j.id === vista);
  const { enviosJugada } = useData();
  // Apagada: no se pide nada (la clave distinta evita mezclar con la caché de la función encendida)
  const { data: envios } = useConsulta(FUNCIONES.proximaJugada ? `envios:${tiendaId}` : "envios:apagado", () => (FUNCIONES.proximaJugada ? enviosJugada(tiendaId) : Promise.resolve([])));
  // Los que ya recibieron un mensaje de una jugada en los últimos 7 días van al final, con "Le escribiste…"
  const porEnvio = ordenarPorEnvio(seleccionada?.clientes ?? [], envios ?? [], ahora);
  const cerrarBorrador = useCallback(() => setBorrador(null), []);
  // Las ilustraciones de la galería y del detalle se piden al abrir "Tus clientes": al volver ya están
  useEffect(() => {
    if (!FUNCIONES.proximaJugada) return;
    for (const c of CARTAS_JUGADAS) for (const p of [IMAGEN_CUADRO, IMAGEN_DETALLE]) {
      const { props } = getImageProps({ src: c.imagen, alt: "", ...p });
      preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "high" });
    }
  }, []);
  useEffect(() => {
    const atras = (e: PopStateEvent) => {
      const guardada = (e.state?.deslizappJugada as Vista | undefined) ?? "resumen";
      const siguiente = vistaPermitida(guardada) ? guardada : "resumen";
      // Cerrar una hoja apilada también emite popstate; si la vista no cambió, no consume un nivel.
      if (profundidad.current === 0 || siguiente === vistaActual.current) return;
      profundidad.current--;
      vistaActual.current = siguiente;
      setBarrido(null);
      setEntrada(null);
      setVista(siguiente);
    };
    window.addEventListener("popstate", atras);
    return () => window.removeEventListener("popstate", atras);
  }, []);
  const navegar = (siguiente: Vista, elemento?: HTMLElement) => {
    if (siguiente === vistaActual.current || !vistaPermitida(siguiente)) return;
    setBarrido(vista === "galeria" && siguiente !== "resumen" && !menosMovimiento() ? ++secuencia.current : null);
    const origenEntrada = vista === "resumen" && siguiente === "galeria" && elemento && !menosMovimiento() ? medirEntrada(elemento) : null;
    setEntrada(origenEntrada ? { origen: origenEntrada, id: ++secuencia.current } : null);
    window.history.pushState({ ...(window.history.state ?? {}), deslizappJugada: siguiente }, "");
    profundidad.current++;
    vistaActual.current = siguiente;
    setVista(siguiente);
  };
  const volver = () => {
    setBarrido(null);
    setEntrada(null);
    if (profundidad.current > 0) window.history.back();
    else setVista("resumen");
  };
  const cerrar = () => {
    setBarrido(null);
    setEntrada(null);
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
  const filtrar = (f: FiltroClientes) => { cerrar(); alFiltrar(f); };
  const titulo = vista === "resumen" ? "Tus clientes" : vista === "galeria" ? "Tu próxima jugada" : esGrupo(vista) ? `${NOMBRE_GRUPO_CLIENTES[vista.slice(6) as GrupoClientes]}\u00a0·\u00a0${resumen.cuentas[vista.slice(6) as GrupoClientes]}` : seleccionada?.nombre ?? "Tu próxima jugada";
  const fila = vista === "galeria" || esGrupo(vista) ? "Tus clientes" : "Todas las jugadas";
  // Durante la entrada y el barrido, el título y la fila de arriba cruzan cuando la malla o la franja ya los cubren (no en el primer cuadro)
  const tituloHoja = entrada ? <CruceTexto antes="Tus clientes" despues={titulo} /> : barrido !== null ? <CruceTexto antes="Tu próxima jugada" despues={titulo} /> : titulo;
  const filaHoja = barrido !== null ? <CruceTexto antes="Tus clientes" despues={fila} /> : fila;
  const terminarEntrada = useCallback(() => setEntrada(null), []);

  return <Hoja abierta alCerrar={cerrar} titulo={tituloHoja} altura="grande"
    decoracionEncima={barrido !== null ? <BarridoFranja key={barrido} alTerminar={() => setBarrido(null)} /> : undefined}
    fijoArriba={vista !== "resumen" ? <div data-entrada-resto={entrada ? true : undefined} style={entrada ? { opacity: 0 } : undefined} className="flex items-center gap-2 text-secundario font-extrabold text-texto">
      <BotonVolver onClick={volver} etiqueta={`Volver a ${vista === "galeria" || esGrupo(vista) ? "Tus clientes" : "Tu próxima jugada"}`} />
      <span aria-hidden="true">{filaHoja}</span>
    </div> : undefined}>
    <Contenido vista={vista} resumen={resumen} jugadas={jugadas} destacada={destacada} total={total} entrada={entrada} alTerminarEntrada={terminarEntrada} barrido={barrido}
      seleccionada={seleccionada} porEnvio={porEnvio} ahora={ahora}
      tiendaId={tiendaId} navegar={navegar} filtrar={filtrar} irADatos={irADatos} alEscribir={(id, nombre, cliente) => { setBarrido(null); setBorrador({ id, nombre, cliente }); }} />
    {borrador && <HojaEscribirJugada key={`${borrador.id}:${borrador.cliente.id}`} jugada={borrador.id}
      cliente={{ id: borrador.cliente.id, nombre: borrador.cliente.nombre, telefono: borrador.cliente.telefono! }} tiendaId={tiendaId}
      vendedora={vendedora} tienda={tienda} urlCatalogo={urlCatalogo} alCerrar={cerrarBorrador} />}
  </Hoja>;
}

function Contenido({ vista, resumen, jugadas, destacada, total, entrada, alTerminarEntrada, barrido, seleccionada, porEnvio, ahora, tiendaId, navegar, filtrar, irADatos, alEscribir }: {
  vista: Vista; resumen: ResumenClientes; jugadas: Jugada[]; destacada: Jugada | null; total: number;
  /** Entrada a la galería: la vista de "Tus clientes" sigue montada detrás (la misma, sin volver a montarse) mientras crece la malla. */
  entrada: { origen: OrigenEntrada; id: number } | null; alTerminarEntrada: () => void;
  /** Mientras dura el barrido, la galería sigue detrás (atenuada) y el detalle se descubre con la máscara. */
  barrido: number | null;
  seleccionada?: Jugada; porEnvio: ReturnType<typeof ordenarPorEnvio<ClienteAnalizado>>; ahora: number;
  tiendaId: string; navegar: (vista: Vista, elemento?: HTMLElement) => void; filtrar: (f: FiltroClientes) => void; irADatos: (clienteId: string) => void; alEscribir: (id: IdJugada, nombre: string, cliente: ClienteAnalizado) => void;
}) {
  const irArriba = useIrArribaHoja();
  // Antes de pintar: la entrada mide los cuadros con el contenido ya arriba
  useLayoutEffect(() => { irArriba(); }, [vista, irArriba]);
  const paginadas = useVerMas(porEnvio.lista, `${tiendaId}:${vista}`, 5);
  if (esGrupo(vista)) return <VistaGrupoClientes grupo={vista.slice(6) as GrupoClientes} resumen={resumen} ahora={ahora} tiendaId={tiendaId} irADatos={irADatos} />;
  const conResumen = vista === "resumen" || entrada !== null;
  const detalle = (j: Jugada) => <Detalle jugada={j} total={total} recientes={porEnvio.recientes} ahora={ahora} irADatos={irADatos} alEscribir={alEscribir} paginadas={paginadas} />;
  // Misma estructura en las tres vistas: "Tus clientes" no se vuelve a montar al empezar la entrada (sigue su malla y su mazo)
  return <div className={vista === "resumen" ? "relative" : "relative min-h-full pb-6"}>
    {vista !== "resumen" && <BrilloJugada />}
    {conResumen && <div data-entrada-atras={vista !== "resumen" || undefined} aria-hidden={vista !== "resumen" || undefined} inert={vista !== "resumen" || undefined}
      className={vista === "resumen" ? undefined : "pointer-events-none absolute inset-x-0 z-[2]"} style={vista !== "resumen" && entrada ? posicionAtras(entrada.origen) : undefined}>
      <ContenidoResumenClientes resumen={resumen} alAbrirGrupo={(g) => navegar(`grupo:${g}`)} alFiltrar={filtrar} alAbrirJugadas={(el) => navegar("galeria", el)} destacada={destacada} />
    </div>}
    {entrada && vista === "galeria" && <EntradaCapas key={entrada.id} origen={entrada.origen} alTerminar={alTerminarEntrada} />}
    {vista === "galeria" ? <div className="relative z-[3]"><Galeria jugadas={jugadas} navegar={navegar} enEntrada={entrada !== null} /></div>
    : seleccionada ? <BarridoContenido activo={barrido} atras={<Galeria jugadas={jugadas} navegar={() => {}} enEntrada={false} />}>{detalle(seleccionada)}</BarridoContenido>
    : null}
  </div>;
}

/** Tamaños de las ilustraciones (los mismos en la precarga). */
const IMAGEN_CUADRO = { width: 180, height: 180, sizes: "(max-width: 430px) 42vw, 180px" };
const IMAGEN_DETALLE = { width: 180, height: 180, sizes: "160px" };

function Galeria({ jugadas, navegar, enEntrada }: { jugadas: Jugada[]; navegar: (vista: Vista, elemento?: HTMLElement) => void;
  /** Durante la entrada: los cuadros esperan invisibles hasta despegar desde su carta, y el resto entra al 60 % de la malla. */
  enEntrada: boolean }) {
  const resto = enEntrada ? { "data-entrada-resto": true, style: { opacity: 0 } } : {};
  return <>
      <p {...resto} className="mb-4 text-secundario text-texto-secundario">Cuatro maneras de acercarte a tu gente. Los números salen de tus pedidos.</p>
      {jugadas.length ? <div className="grid grid-cols-2 gap-2.5">{jugadas.map((j) => <button key={j.id} type="button" data-jugada-cuadro={j.id} onClick={() => navegar(j.id)}
        aria-label={`${j.nombre}: ${j.cantidad} ${j.cantidad === 1 ? "cliente" : "clientes"}. Ver jugada`}
        className="tocable relative isolate flex min-h-62 flex-col overflow-hidden rounded-radio-l border border-borde-campo p-3.5 text-left text-marca-bosque outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco" style={{ backgroundColor: j.color, opacity: enEntrada ? 0 : 1 }}>
        <Image data-cuadro-imagen src={j.imagen} alt="" {...IMAGEN_CUADRO} priority loading="eager" className="pointer-events-none absolute inset-x-0 top-3 mx-auto size-35 object-contain" />
        <span data-cuadro-detalle aria-hidden="true" className="jugada-tarjeta-degradado absolute inset-0" />
        <span data-cuadro-detalle className="relative z-10 ml-auto rounded-full bg-marca-papel/90 px-2.5 py-1 text-etiqueta font-extrabold">{j.cantidad} {j.cantidad === 1 ? "cliente" : "clientes"}</span>
        <span data-cuadro-detalle className="relative z-10 mt-auto block"><b className="block font-display text-titulo-seccion">{j.nombre}</b><span className="mt-1.5 block pr-5 text-etiqueta">{j.descripcion}</span></span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-cuadro-detalle className="absolute right-2.5 bottom-3 z-10 text-marca-bosque"><path d="M9 6l6 6-6 6" /></svg>
      </button>)}</div> : <div className="rounded-radio-l bg-superficie p-6 text-center"><b className="font-display text-titulo-seccion">Por ahora, todo tranquilo.</b><p className="mt-2 text-secundario text-texto-secundario">Cuando haya clientes sin pedidos en curso, aquí encontrarás ideas para conversar.</p></div>}
      <p {...resto} className="mt-5 text-center text-etiqueta text-texto-secundario">Toca una jugada para ver a quién podrías escribir.</p>
      <p {...resto} className="mt-3 rounded-radio-m bg-superficie p-3.5 text-etiqueta text-texto">Una persona puede encajar en más de una jugada. Tú eliges con quién conversar.</p>
  </>;
}
function Detalle({ jugada: j, total, recientes, ahora, irADatos, alEscribir, paginadas }: {
  jugada: Jugada; total: number; recientes: Map<string, string>; ahora: number;
  alEscribir: (id: IdJugada, nombre: string, cliente: ClienteAnalizado) => void; irADatos: (clienteId: string) => void; paginadas: ReturnType<typeof useVerMas<ClienteAnalizado>>;
}) {
  return <>
    <div className="relative min-h-41 overflow-hidden rounded-radio-l p-4 text-marca-bosque" style={{ backgroundColor: j.color }}>
      <Image src={j.imagen} alt="" {...IMAGEN_DETALLE} loading="eager" className="pointer-events-none absolute top-0 -right-2 size-40 object-contain" />
      <div className="relative z-10 max-w-[62%]"><b className="font-display text-cifra">{j.porcentaje} %</b>
        <p className="mt-2 text-secundario font-bold">de tus clientes {j.explicacion}</p>
        <p className="mt-2 text-etiqueta">{j.cantidad} de {total} clientes · solo pedidos despachados</p>
      </div>
    </div>
    <p className="my-5 text-secundario"><b>{j.consejo.split(".")[0]}.</b>{j.consejo.slice(j.consejo.indexOf(".") + 1)}</p>
    <h3 className="font-display text-titulo-seccion">{j.cantidad > 5 ? "Empieza con estos 5" : "Clientes para esta jugada"}</h3>
    <p className="mb-3 text-etiqueta text-texto-secundario">Escribir te deja mandar un saludo, un código o productos. Tú revisas el mensaje antes de enviarlo.</p>
    <ListaAgrupada etiqueta="Clientes para esta jugada">{paginadas.visibles.map((c) => {
      const dias = diasDesde(c.ultimaVenta, ahora);
      const detalle = recientes.get(c.id) ?? (j.id === "volver" ? `Última compra hace ${dias} días` : j.id === "segundo" ? `Compró hace ${dias} días` : j.id === "gracias" ? `${c.compras} compras despachadas` : "Aún no compra");
      return <FilaLista key={c.id} inicio={<Avatar nombre={c.nombre} />} titulo={c.nombre} detalle={detalle}
        accion={c.telefono ? <Boton tamano="compacto" onClick={() => alEscribir(j.id, j.nombre, c)} aria-label={`Escribir a ${c.nombre} por WhatsApp sobre ${j.nombre}`}>Escribir</Boton> :
          <Boton jerarquia="secundario" tamano="compacto" onClick={() => irADatos(c.id)} aria-label={`Sin WhatsApp. Ver datos de ${c.nombre}`}>Sin WhatsApp · Ver datos</Boton>} />;
    })}
      <BotonVerMas forma="fila" pagina={5} quedan={paginadas.quedan} mostrados={paginadas.mostrados} total={j.cantidad} alTocar={paginadas.verMas} />
    </ListaAgrupada>
    <p className="mt-4 text-etiqueta text-texto-secundario">La cifra incluye a todos los clientes elegibles, incluso si no tienen WhatsApp. Ningún mensaje se envía solo.</p>
  </>;
}

/** Vista interna de un grupo del resumen: sus clientes (el mismo FilaCliente de la lista) en tramos de 30; tocar uno abre su ficha. */
function VistaGrupoClientes({ grupo, resumen, ahora, tiendaId, irADatos }: { grupo: GrupoClientes; resumen: ResumenClientes; ahora: number; tiendaId: string; irADatos: (clienteId: string) => void }) {
  const lista = resumen.lista.filter((c) => cumpleFiltroCliente(c, grupo)).sort((a, b) => ordenarClientes(a, b, grupo === "repiten" || grupo === "nuevos" || grupo === "dormidos" ? grupo : "todos"));
  const paginada = useVerMas(lista, `${tiendaId}:grupo:${grupo}`);
  return <div className="pb-6">
    <ListaAgrupada etiqueta={NOMBRE_GRUPO_CLIENTES[grupo]}>
      {paginada.visibles.map((c) => <FilaCliente key={c.id} cliente={c} ahora={ahora} senalRepite={grupo !== "repiten"} alAbrir={() => irADatos(c.id)} />)}
      <BotonVerMas forma="fila" quedan={paginada.quedan} mostrados={paginada.mostrados} total={lista.length} alTocar={paginada.verMas} />
    </ListaAgrupada>
  </div>;
}
