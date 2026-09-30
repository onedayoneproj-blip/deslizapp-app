"use client";

import Link from "next/link";
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
import { IconoBuscar } from "../iconos";
import { Numero } from "../numero";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { Segmentos } from "../controles";
import { FilaPorCobrar, TarjetaPorCobrar } from "../credito/por-cobrar";
import { Avatar, EtiquetaRepite } from "./comunes";
import { TextoResaltado } from "./texto-resaltado";

/**
 * Pantalla de Clientes. Vive en el layout de /clientes para que la búsqueda siga ahí al abrir y
 * cerrar un cliente: /clientes/nuevo y /clientes/[id] solo agregan la hoja encima.
 */
export function VistaClientes({ children }: { children: ReactNode }) {
  const { getClientes, getCuentasPorCobrar, getDueno } = useData();
  const { tiendaId, tienda } = useTiendaActiva();
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: cuentas } = useConsulta(`cuentas:${tiendaId}`, () => getCuentasPorCobrar(tiendaId));
  const { data: dueno } = useConsulta(`dueno:${tiendaId}`, () => getDueno(tiendaId));
  const [busqueda, setBusqueda] = useState("");
  const [aplicada, setAplicada] = useState("");
  // "Todos" o "Deben" (los que tienen un pedido a crédito con saldo). Inicio puede pedir abrir directo en "Deben".
  const [filtro, setFiltro] = useState<"todos" | "deben">(() => (hayClientesQueDeben() ? "deben" : "todos"));
  useEffect(() => {
    consumirClientesQueDeben();
  }, []);

  const todos = useMemo(() => buscarClientes(clientes ?? [], aplicada), [clientes, aplicada]);
  // "Deben": las cuentas en su orden (atrasados, con fecha, sin fecha), filtradas por lo que se busca
  const deben = useMemo(() => {
    const lista = cuentas?.cuentas ?? [];
    if (aplicada.trim() === "") return lista;
    const ids = new Set(todos.map((r) => r.cliente.id));
    return lista.filter((c) => ids.has(c.clienteId));
  }, [cuentas, todos, aplicada]);
  // De 30 en 30 (con ~110 clientes la lista es larga); las tarjetas de arriba siguen contando a todos
  const { visibles, quedan, mostrados, verMas } = useVerMas(todos, `${tiendaId}:${aplicada}`);
  const debenPaginados = useVerMas(deben, `${tiendaId}:${aplicada}:deben`);
  const mensajeDe = (nombre: string, deuda: number) =>
    mensajeRecordatorio({ cliente: nombre, vendedora: dueno?.nombre ?? "", tienda: tienda?.nombre ?? "la tienda", deuda });

  const total = clientes?.length ?? 0;
  const repiten = clientes?.filter((c) => c.repite).length ?? 0;
  const delCatalogo = clientes?.filter((c) => c.origen === "catalogo").length ?? 0;

  return (
    <>
      <TituloPantalla titulo="Clientes" subtitulo="Los que ya dijeron aaah. Y los que están por decirlo." />
      <div className="flex flex-col gap-3.5 px-5 pt-3.5">
        <label className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-borde bg-white px-4">
          <IconoBuscar tamano={20} className="shrink-0 text-suave" />
          <span className="sr-only">Buscar cliente</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              const valor = e.target.value;
              setBusqueda(valor);
              startTransition(() => setAplicada(valor));
            }}
            placeholder="Nombre o WhatsApp"
            className="min-w-0 flex-1 bg-transparent text-base text-bosque outline-none placeholder:text-suave/80"
          />
        </label>

        <Segmentos
          etiqueta="Qué clientes ver"
          valor={filtro}
          alCambiar={setFiltro}
          opciones={[
            { id: "todos", texto: "Todos" },
            { id: "deben", texto: "Deben", cantidad: cuentas?.clientes },
          ]}
        />

        {filtro === "todos" && (
          <div className="grid grid-cols-3 gap-2">
            <Contador valor={clientes ? total : null} texto="clientes" />
            <Contador valor={clientes ? repiten : null} texto="repiten" rosa />
            <Contador valor={clientes ? delCatalogo : null} texto="del catálogo" />
          </div>
        )}

        {filtro === "deben" && (
          <>
            {!cuentas && <Esqueleto className="h-[210px] rounded-[24px]" />}
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
                    <ul className="flex flex-col gap-3">
                      {debenPaginados.visibles.map((c) => (
                        <li key={c.clienteId}>
                          <FilaPorCobrar cuenta={c} mensaje={mensajeDe(c.nombre, c.deuda)} />
                        </li>
                      ))}
                    </ul>
                    <BotonVerMas quedan={debenPaginados.quedan} mostrados={debenPaginados.mostrados} total={deben.length} alTocar={debenPaginados.verMas} texto="Ver más clientes" />
                  </>
                )}
              </>
            )}
          </>
        )}

        {filtro === "todos" && !clientes && <Esqueleto className="h-[210px] rounded-[24px]" />}
        {filtro === "todos" && clientes && total === 0 && (
          <EstadoVacio
            ilustracion="clientes"
            titulo="Aún no tienes clientes."
            remate="Cuando alguien pida por tu catálogo, aparece aquí. O agrégalo tú."
            accion={{ texto: "Agregar cliente", href: "/clientes/nuevo" }}
          />
        )}
        {filtro === "todos" && clientes && total > 0 && todos.length === 0 && (
          <EstadoVacio pequeno ilustracion="clientes" titulo="Nadie con ese nombre. Todavía." remate="Prueba con otro nombre o con el WhatsApp." />
        )}
        {filtro === "todos" && todos.length > 0 && (
          <>
            <ul className="rounded-[24px] border border-linea bg-white px-3.5">
              {visibles.map(({ cliente, coincide }) => (
                <li key={cliente.id} className="border-b border-arena last:border-b-0">
                  <FilaCliente cliente={cliente} coincide={coincide} consulta={aplicada} />
                </li>
              ))}
            </ul>
            <BotonVerMas quedan={quedan} mostrados={mostrados} total={todos.length} alTocar={verMas} texto="Ver más clientes" />
          </>
        )}
      </div>

      {/* Sin clientes, el botón del estado vacío ya invita a agregar: no se duplica */}
      {!(clientes && total === 0) && <BotonFlotante href="/clientes/nuevo" texto="Cliente" />}
      {children}
    </>
  );
}

function Contador({ valor, texto, rosa = false }: { valor: number | null; texto: string; rosa?: boolean }) {
  return (
    <div className={`rounded-[18px] px-3 py-2.5 ${rosa ? "bg-rosa" : "border border-linea bg-white"}`}>
      <div className="font-display text-[22px] leading-tight">{valor === null ? "–" : <Numero valor={valor} />}</div>
      <div className={`text-xs ${rosa ? "font-bold" : "font-semibold text-suave"}`}>{texto}</div>
    </div>
  );
}

function FilaCliente({ cliente: c, coincide, consulta }: { cliente: ClienteConResumen; coincide: DondeCoincide; consulta: string }) {
  return (
    <Link href={`/clientes/${c.id}`} scroll={false} className="tocable flex items-center gap-3 py-3 text-bosque">
      <Avatar nombre={c.nombre} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[15.5px] font-extrabold">
          <span className="truncate">
            <TextoResaltado trozos={resaltar(c.nombre, coincide === "nombre" ? consulta : "")} />
          </span>
          {c.repite && <EtiquetaRepite />}
        </span>
        <span className="block truncate text-[13px] text-suave">
          {/* Si salió por el teléfono o por la nota, se muestra eso para ver por qué coincidió */}
          {coincide === "telefono" && c.telefono ? (
            <TextoResaltado trozos={resaltarTelefono(formatearTelefono(c.telefono), consulta)} />
          ) : coincide === "nota" && c.nota ? (
            <TextoResaltado trozos={resaltar(c.nota, consulta)} />
          ) : c.pedidos > 0 ? (
            `${c.pedidos} ${c.pedidos === 1 ? "pedido" : "pedidos"} · ${formatearPesos(c.totalGastado)}`
          ) : (
            "Todavía no pide. Todavía."
          )}
        </span>
      </span>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-suave">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
