"use client";

import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { buscarClientes, type DondeCoincide } from "@/lib/buscar-clientes";
import { resaltar } from "@/lib/texto";
import { mensajeRecordatorio } from "@/lib/credito";
import { consumirClientesQueDeben, hayClientesQueDeben } from "@/lib/destello";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos } from "@/lib/formato";
import { formatearTelefono, resaltarTelefono } from "@/lib/telefono";
import type { ClienteConResumen } from "@/lib/types";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { Dona } from "../dona";
import { HojaResumenClientes, SEGMENTOS_CLIENTES } from "./hoja-resumen-clientes";
import { analizarClientes, cumpleFiltroCliente, ordenarClientes, mensajeDormido, type FiltroClientes, type ClienteAnalizado } from "@/lib/clientes-resumen";
import { enlaceWhatsApp } from "@/lib/formato";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { Boton, Buscador, FilaLista, FilaPastillas, ListaAgrupada } from "../ui";
import { FilaPorCobrar, TarjetaPorCobrar } from "../credito/por-cobrar";
import { Avatar } from "../ui";
import { EtiquetaRepite } from "./comunes";
import { TextoResaltado } from "./texto-resaltado";

/**
 * Pantalla de Clientes. Vive en el layout de /clientes para que la búsqueda siga ahí al abrir y
 * cerrar un cliente: /clientes/nuevo y /clientes/[id] solo agregan la hoja encima.
 */
export function VistaClientes({ children }: { children: ReactNode }) {
  const { getClientes, getCuentasPorCobrar, getDueno, getPedidos } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: cuentas } = useConsulta(`cuentas:${tiendaId}`, () => getCuentasPorCobrar(tiendaId));
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const actualizar = () => { if (document.visibilityState === "visible") setAhora(Date.now()); };
    const timer = setInterval(actualizar, 60000);
    document.addEventListener("visibilitychange", actualizar);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", actualizar); };
  }, []);
  const [hoja, setHoja] = useState(false);
  const resumen = useMemo(() => analizarClientes(clientes ?? [], pedidos ?? [], tiendaId, ahora), [clientes, pedidos, tiendaId, ahora]);
  const [busqueda, setBusqueda] = useState("");
  const [aplicada, setAplicada] = useState("");
  // Inicio puede pedir abrir directo en "Deben" (crédito con saldo).
  const [filtro, setFiltro] = useState<FiltroClientes>(() => (hayClientesQueDeben() ? "deben" : "todos"));
  useEffect(() => {
    consumirClientesQueDeben();
  }, []);

  const todos = useMemo(() => buscarClientes(resumen.lista, aplicada), [resumen, aplicada]);
  // "Deben": las cuentas en su orden (atrasados, con fecha, sin fecha), filtradas por lo que se busca
  const deben = useMemo(() => {
    const lista = cuentas?.cuentas ?? [];
    if (aplicada.trim() === "") return lista;
    const ids = new Set(todos.map((r) => r.cliente.id));
    return lista.filter((c) => ids.has(c.clienteId));
  }, [cuentas, todos, aplicada]);
  const filtrados = useMemo(() => todos.filter((r) => cumpleFiltroCliente(r.cliente as ClienteAnalizado, filtro))
    .sort((a, b) => ordenarClientes(a.cliente as ClienteAnalizado, b.cliente as ClienteAnalizado, filtro)), [todos, filtro]);
  // De 30 en 30 (con ~110 clientes la lista es larga); la dona sigue contando a todos.
  const { visibles, quedan, mostrados, verMas } = useVerMas(filtrados, `${tiendaId}:${aplicada}:${filtro}`);
  const debenPaginados = useVerMas(deben, `${tiendaId}:${aplicada}:deben`);
  const mensajeDe = (nombre: string, deuda: number) =>
    mensajeRecordatorio({ cliente: nombre, vendedora: dueno?.nombre ?? "", tienda: tienda?.nombre ?? "la tienda", deuda });

  const total = resumen.cuentas.todos;
  const etiquetas: Record<FiltroClientes, string> = { todos: "Todos", deben: "Deben", repiten: "Repiten", nuevos: "Nuevos", dormidos: "Dormidos", catalogo: "Del catálogo", manual: "A mano", una: "Compraron una vez", sin: "Sin comprar" };
  const fijos: FiltroClientes[] = ["todos", "deben", "repiten", "nuevos", "dormidos", "catalogo"];
  const ids = fijos.includes(filtro) ? fijos : [...fijos, filtro];
  const cantidad = (id: FiltroClientes) => id === "deben" ? cuentas?.clientes ?? 0 : resumen.cuentas[id];
  const opciones = ids.filter((id) => id === "todos" || id === filtro || cantidad(id) > 0)
    .map((id) => ({ id, texto: etiquetas[id], cantidad: id === "todos" ? undefined : cantidad(id), atencion: id === "deben", condicional: id !== "todos" }));
  const vacios: Partial<Record<FiltroClientes, string>> = { dormidos: "Nadie dormido. Tus clientes están despiertos.", nuevos: "Los nuevos están por llegar.", repiten: "Todavía no vuelven. Dales otro aaah.", una: "Nadie con una sola compra.", sin: "Todos han dicho aaah. Y han comprado.", catalogo: "Todavía no llegan por el catálogo.", manual: "Todavía no agregas clientes a mano." };
  const listo = Boolean(clientes && pedidos);

  return (
    <>
      <TituloPantalla titulo="Clientes" subtitulo="Los que ya dijeron aaah. Y los que están por decirlo." derecha={
        listo ? <button type="button" onClick={() => setHoja(true)}
          aria-label={`${total} clientes: ${resumen.cuentas.repiten} repiten, ${resumen.cuentas.una} compraron una vez, ${resumen.cuentas.sin} sin comprar. Ver detalle`}
          className="tocable flex shrink-0 flex-col items-center gap-1 rounded-radio-m">
          <Dona className="dona-cabecera" pista="var(--superficie-hundida)" segmentos={SEGMENTOS_CLIENTES.map((x) => ({ valor: resumen.cuentas[x.id], color: x.color }))}>
            <b className="font-display text-titulo-seccion">{total}</b><span className="mt-0.5 text-contador text-texto-secundario">CLIENTES</span>
          </Dona>
          <span className="text-etiqueta font-bold text-texto-secundario">{resumen.cuentas.repiten} repiten</span>
        </button> : <Esqueleto className="h-24 w-19 shrink-0 rounded-full" />
      } />
      <div className="flex flex-col gap-3.5 px-5 pt-3.5">
        <Buscador
          etiqueta="Buscar cliente"
          valor={busqueda}
          alCambiar={(valor) => {
            setBusqueda(valor);
            startTransition(() => setAplicada(valor));
          }}
          placeholder="Nombre o WhatsApp"
        />

        <FilaPastillas etiqueta="Qué clientes ver" valor={filtro} alCambiar={setFiltro} opciones={opciones} />

        {filtro === "deben" && (
          <>
            {!cuentas && <Esqueleto className="h-52 rounded-radio-l" />}
            {cuentas && cuentas.clientes === 0 && (
              <EstadoVacio pequeno ilustracion="clientes" titulo="Nadie te debe." remate="Cuando vendas a crédito, aquí ves quién falta por pagar." />
            )}
            {cuentas && cuentas.clientes > 0 && (
              <>
                <TarjetaPorCobrar datos={cuentas} />
                {deben.length === 0 && (
                  <EstadoVacio pequeno ilustracion="clientes" titulo="Nadie con ese nombre debe." remate="Prueba con otro nombre o con el WhatsApp." />
                )}
                {deben.length > 0 && (
                  <>
                    <ListaAgrupada etiqueta="Clientes que deben">
                      {debenPaginados.visibles.map((c) => (
                        <FilaPorCobrar key={c.clienteId} cuenta={c} mensaje={mensajeDe(c.nombre, c.deuda)} />
                      ))}
                    </ListaAgrupada>
                    <BotonVerMas quedan={debenPaginados.quedan} mostrados={debenPaginados.mostrados} total={deben.length} alTocar={debenPaginados.verMas} texto="Ver más clientes" />
                  </>
                )}
              </>
            )}
          </>
        )}

        {filtro !== "deben" && !listo && <Esqueleto className="h-52 rounded-radio-l" />}
        {filtro !== "deben" && listo && total === 0 && (
          <EstadoVacio
            ilustracion="clientes"
            titulo="Aún no tienes clientes."
            remate="Cuando alguien pida por tu catálogo, aparece aquí. O agrégalo tú."
            accion={{ texto: "Agregar cliente", href: "/clientes/nuevo" }}
          />
        )}
        {filtro !== "deben" && listo && total > 0 && filtrados.length === 0 && (
          <EstadoVacio pequeno ilustracion="clientes" titulo={aplicada.trim() ? "Nadie con ese nombre. Todavía." : vacios[filtro] ?? "Todavía no hay clientes aquí."} remate={aplicada.trim() ? "Prueba con otro nombre o con el WhatsApp." : "Aquí aparecerán cuando lleguen."} />
        )}
        {filtro !== "deben" && listo && filtrados.length > 0 && (
          <>
            <ListaAgrupada etiqueta="Clientes">
              {visibles.map(({ cliente, coincide }) => (
                <FilaCliente key={cliente.id} cliente={cliente} coincide={coincide} consulta={aplicada}
                  escribir={filtro === "dormidos" && cliente.telefono ? { href: enlaceWhatsApp(cliente.telefono, mensajeDormido(cliente.nombre, dueno?.nombre ?? "", tienda?.nombre ?? "la tienda", tienda?.urlCatalogo ?? null)), nombre: cliente.nombre } : undefined} />
              ))}
            </ListaAgrupada>
            <BotonVerMas quedan={quedan} mostrados={mostrados} total={filtrados.length} alTocar={verMas} texto="Ver más clientes" />
          </>
        )}
      </div>

      {/* Sin clientes, el botón del estado vacío ya invita a agregar: no se duplica */}
      {!(clientes && total === 0) && <BotonFlotante href="/clientes/nuevo" texto="Cliente" />}
      {hoja && listo && <HojaResumenClientes resumen={resumen} clientes={clientes!} pedidos={pedidos!} tiendaId={tiendaId}
        tienda={tienda?.nombre ?? "la tienda"} vendedora={dueno?.nombre ?? ""} urlCatalogo={tienda?.urlCatalogo ?? null}
        ahora={ahora} alCerrar={() => setHoja(false)} alFiltrar={setFiltro} />}
      {children}
    </>
  );
}

function FilaCliente({ cliente: c, coincide, consulta, escribir }: { cliente: ClienteConResumen; coincide: DondeCoincide; consulta: string; escribir?: { href: string; nombre: string } }) {
  return (
    <FilaLista
      href={`/clientes/${c.id}`}
      inicio={<Avatar nombre={c.nombre} />}
      titulo={
        <span className="flex items-center gap-1.5">
          <span className="truncate">
            <TextoResaltado trozos={resaltar(c.nombre, coincide === "nombre" ? consulta : "")} />
          </span>
          {c.repite && <EtiquetaRepite />}
        </span>
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
      accion={escribir && <Boton whatsapp href={escribir.href} target="_blank" rel="noreferrer" aria-label={`Escribirle a ${escribir.nombre} por WhatsApp`}>Escribir</Boton>}
    />
  );
}
