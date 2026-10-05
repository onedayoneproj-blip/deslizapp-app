"use client";

import { useState } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { textoEspera } from "@/lib/avisos";
import type { Producto } from "@/lib/types";
import { Hoja } from "../hoja";
import { BotonVolver } from "../selector-busqueda";
import { Aviso, FilaLista, ListaAgrupada } from "../ui";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { usePanelUI } from "../panel/ui";
import { MiniaturaProducto } from "./miniatura-producto";
import { TarjetaYaLlego } from "./tarjeta-ya-llego";
import { useHistorialInventario } from "./inventario-producto";

/** Misma lista/acciones de Ya llegó; el error nunca se interpreta como cero pendientes. */
export function ListaEsperaProducto({ producto }: { producto: Producto }) {
  const { espera } = usePanelUI();
  if (espera.error) return <Aviso tono="peligro" accion={{ texto: "Reintentar", alTocar: espera.reintentar }}>No pudimos leer quiénes esperan.</Aviso>;
  if (!espera.resumen || espera.cargando) return <p role="status" className="py-3 text-texto-secundario">Buscando quiénes esperan…</p>;
  const avisos = espera.resumen.porProducto.get(producto.id) ?? [];
  if (!avisos.length) return <p className="py-3 text-texto-secundario">Nadie esperando por ahora.</p>;
  return <TarjetaYaLlego producto={producto} avisos={avisos} modo="espera" />;
}

/** Productos → lista de espera dentro de una sola Hoja, también con stock y ocultos. */
export function HojaEspera({ productoInicial, alSalir }: { productoInicial?: Producto; alSalir: () => void }) {
  const [abierta, setAbierta] = useState(true);
  const [elegido, setElegido] = useState(productoInicial);
  const navegar = useHistorialInventario();
  const { espera } = usePanelUI();
  const { tiendaId } = useTiendaActiva();
  const { getProductos } = useData();
  const consulta = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId), true);
  const lista = (consulta.data ?? []).filter(p => espera.resumen?.porProducto.has(p.id));
  const pagina = useVerMas(lista, `espera:${tiendaId}`);
  const detalle = productoInicial || navegar.abierto ? elegido : undefined;
  return <Hoja abierta={abierta} alCerrar={() => setAbierta(false)} alSalir={alSalir} protegerAtras titulo={detalle?.nombre ?? "Personas esperando"} altura="grande" alVolverInterno={productoInicial ? undefined : navegar.volver}
    fijoArriba={!productoInicial && navegar.abierto ? <div data-volver-historial><BotonVolver etiqueta="Volver a los productos en espera" onClick={navegar.volver}/></div> : undefined}>
    {!productoInicial && <div className={detalle ? "hidden" : "contents"}>
      {espera.error || consulta.error ? <Aviso tono="peligro" accion={{texto:"Reintentar",alTocar:()=>{espera.reintentar();consulta.reintentar();}}}>No pudimos leer los productos en espera.</Aviso>
        : !espera.resumen || !consulta.data || espera.cargando ? <p role="status">Buscando quiénes esperan…</p>
        : !lista.length ? <p>Nadie esperando por ahora.</p> : <ListaAgrupada etiqueta="Productos en espera">
          {pagina.visibles.map(p => <FilaLista key={p.id} inicio={<MiniaturaProducto producto={p}/>} titulo={p.nombre} detalle={textoEspera(espera.resumen!.personasPorProducto.get(p.id)!)} onClick={e => { setElegido(p); navegar.abrir(e.currentTarget); }}/>) }
          <BotonVerMas forma="fila" quedan={pagina.quedan} mostrados={pagina.mostrados} total={lista.length} alTocar={pagina.verMas}/>
        </ListaAgrupada>}
    </div>}
    {detalle && <ListaEsperaProducto key={detalle.id} producto={detalle}/>}
  </Hoja>;
}
