"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos, haceCuanto } from "@/lib/formato";
import type { EstadoPedido, PedidoConItems, Producto } from "@/lib/types";
import { Segmentos } from "../controles";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { Foto } from "../foto";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { ChipEstado } from "./comunes";

type Pestana = Extract<EstadoPedido, "nuevo" | "por_despachar" | "despachado">;

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "nuevo", nombre: "Nuevos" },
  { id: "por_despachar", nombre: "Por despachar" },
  { id: "despachado", nombre: "Despachados" },
];

const VACIO: Record<Pestana, { titulo: string; remate: string }> = {
  nuevo: { titulo: "Todo al día.", remate: "Disfruta el silencio. Dura poco." },
  por_despachar: { titulo: "Nada por despachar.", remate: "Tu mostrador respira. Aprovecha." },
  despachado: { titulo: "Aún no hay despachos.", remate: "Cuando despaches el primero, se guarda aquí." },
};

const SIN_PEDIDOS = { titulo: "Aún no tienes pedidos.", remate: "Cuando alguien pida por tu catálogo, aparece aquí." };

const Contexto = createContext<((p: Pestana) => void) | null>(null);

/** Cambia la pestaña de la lista (ej. al guardar un pedido manual, para que se vea dónde quedó). */
export function useElegirPestanaPedidos() {
  const elegir = useContext(Contexto);
  if (!elegir) throw new Error("useElegirPestanaPedidos() debe usarse dentro de <VistaPedidos>.");
  return elegir;
}

/**
 * Pantalla de Pedidos. Vive en el layout de /pedidos para que la pestaña elegida siga ahí al
 * abrir y cerrar un pedido: /pedidos/nuevo y /pedidos/[id] solo agregan la hoja encima.
 */
export function VistaPedidos({ children }: { children: ReactNode }) {
  const { getPedidos, getProductos, getClientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const [pestana, setPestana] = useState<Pestana>("nuevo");

  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));

  const nombres = useMemo(() => new Map((clientes ?? []).map((c) => [c.id, c.nombre])), [clientes]);
  const fotos = useMemo(() => new Map((productos ?? []).map((p) => [p.id, p])), [productos]);
  const cuentas = useMemo(() => {
    const c: Record<Pestana, number> = { nuevo: 0, por_despachar: 0, despachado: 0 };
    for (const p of pedidos ?? []) if (p.estado in c) c[p.estado as Pestana]++;
    return c;
  }, [pedidos]);
  const visibles = (pedidos ?? []).filter((p) => p.estado === pestana);
  // Sin ningún pedido todavía, el mensaje es uno solo; si no, depende de la pestaña.
  const vacio = pedidos?.length === 0 ? SIN_PEDIDOS : VACIO[pestana];

  return (
    <Contexto.Provider value={setPestana}>
      <TituloPantalla titulo="Pedidos" subtitulo="Del suspiro al chat. Y del chat, aquí." />
      <div className="flex flex-col gap-3.5 px-5 pt-3.5">
        <Segmentos
            etiqueta="Estado de los pedidos"
            valor={pestana}
            alCambiar={setPestana}
            opciones={PESTANAS.map((t) => ({
              id: t.id,
              texto: t.nombre,
              cantidad: pedidos ? cuentas[t.id] : undefined,
            }))}
          />

        {!pedidos && (
          <>
            <Esqueleto className="h-[112px] rounded-[22px]" />
            <Esqueleto className="h-[112px] rounded-[22px]" />
          </>
        )}
        {pedidos && visibles.length === 0 && (
          <EstadoVacio ilustracion="pedidos" titulo={vacio.titulo} remate={vacio.remate} />
        )}
        {pedidos && visibles.length > 0 && (
          <ul className="flex flex-col gap-3">
            {visibles.map((p) => (
              <li key={p.id}>
                <TarjetaPedido pedido={p} cliente={p.clienteId ? nombres.get(p.clienteId) : undefined} productos={fotos} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <BotonFlotante href="/pedidos/nuevo" texto="Pedido" />
      {children}
    </Contexto.Provider>
  );
}

function TarjetaPedido({ pedido: p, cliente, productos }: { pedido: PedidoConItems; cliente?: string; productos: Map<string, Producto> }) {
  const unidades = p.items.reduce((suma, i) => suma + i.cantidad, 0);
  return (
    <Link
      href={`/pedidos/${p.id}`}
      scroll={false}
      aria-label={`Pedido ${p.numero}`}
      className="tocable block rounded-[22px] border border-linea bg-white px-4 py-3.5 text-bosque"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13.5px] font-bold text-suave">
          #{p.numero} · {haceCuanto(p.creadoEn)}
        </span>
        <ChipEstado estado={p.estado} />
      </div>
      <p className="mt-1 truncate text-[17px] font-extrabold">{cliente ?? "Cliente sin nombre"}</p>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 -space-x-2">
            {p.items.slice(0, 3).map((i) => {
              const foto = productos.get(i.productoId)?.fotos[0];
              return (
                <span key={i.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-arena">
                  {foto ? <Foto src={foto} alt="" className="h-full w-full" sizes="36px" /> : null}
                </span>
              );
            })}
          </div>
          <span className="min-w-0 truncate text-[13px] text-suave">
            {unidades} {unidades === 1 ? "producto" : "productos"} · {p.origen === "catalogo" ? "Del catálogo" : "Manual"}
          </span>
        </div>
        <span className="shrink-0 font-display text-xl">{formatearPesos(p.total)}</span>
      </div>
    </Link>
  );
}
