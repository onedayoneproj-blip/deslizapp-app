"use client";

import Link from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { formatearPesos, rangoFechas } from "@/lib/formato";
import { estadoPromo, pedidosConCodigo } from "@/lib/promos";
import type { EstadoPromo, Producto, Promo } from "@/lib/types";
import { Segmentos } from "../controles";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { Foto } from "../foto";
import { Numero } from "../numero";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";

const PESTANAS: { id: EstadoPromo; nombre: string }[] = [
  { id: "activa", nombre: "Activas" },
  { id: "programada", nombre: "Programadas" },
  { id: "terminada", nombre: "Terminadas" },
];

const VACIO: Record<EstadoPromo, { titulo: string; remate: string }> = {
  activa: { titulo: "Ninguna promo activa.", remate: "Ponle un descuento a lo que quieras mover y mira cómo se deslizan." },
  programada: { titulo: "Nada programado.", remate: "Deja una promo lista para más adelante: arranca sola el día que elijas." },
  terminada: { titulo: "Aún no ha terminado ninguna.", remate: "Las que se vencen, o que termines tú, se guardan aquí." },
};

const Contexto = createContext<((p: EstadoPromo) => void) | null>(null);

/** Cambia la pestaña de la lista (ej. al crear una promo, para ver dónde quedó). */
export function useElegirPestanaPromos() {
  const elegir = useContext(Contexto);
  if (!elegir) throw new Error("useElegirPestanaPromos() debe usarse dentro de <VistaPromos>.");
  return elegir;
}

/**
 * Pantalla de Promos. Vive en el layout de /promos para que la pestaña siga ahí al abrir y cerrar una
 * promo: /promos/nueva y /promos/[id] solo agregan la hoja encima.
 * El estado de cada promo se CALCULA (lib/promos.ts): nada se mueve de pestaña a mano.
 */
export function VistaPromos({ children }: { children: ReactNode }) {
  const { getPromos, getProductos, getPedidos } = useData();
  const { tiendaId } = useTiendaActiva();
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos:${tiendaId}`, () => getProductos(tiendaId));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const [pestana, setPestana] = useState<EstadoPromo>("activa");

  const conEstado = useMemo(() => (promos ?? []).map((p) => ({ promo: p, estado: estadoPromo(p) })), [promos]);
  const cuentas = useMemo(() => {
    const c: Record<EstadoPromo, number> = { activa: 0, programada: 0, terminada: 0 };
    for (const p of conEstado) c[p.estado]++;
    return c;
  }, [conEstado]);
  const visibles = conEstado.filter((p) => p.estado === pestana);
  const productosPorId = useMemo(() => new Map((productos ?? []).map((p) => [p.id, p])), [productos]);
  const sinPromos = promos !== undefined && promos.length === 0;
  const vacio = sinPromos ? { titulo: "Aún no tienes promos.", remate: "Crea la primera y mira cómo se deslizan tus productos." } : VACIO[pestana];

  return (
    <Contexto.Provider value={setPestana}>
      <TituloPantalla titulo="Promos" subtitulo="Ponle un descuento y mira cómo se deslizan." />
      <div className="flex flex-col gap-3.5 px-5 pt-3.5">
        <Segmentos
          etiqueta="Estado de las promos"
          valor={pestana}
          alCambiar={setPestana}
          opciones={PESTANAS.map((t) => ({
            id: t.id,
            texto: (
              <>
                {t.nombre} {promos ? <Numero valor={cuentas[t.id]} /> : ""}
              </>
            ),
          }))}
        />

        {!promos && (
          <>
            <Esqueleto className="h-[120px] rounded-[22px]" />
            <Esqueleto className="h-[120px] rounded-[22px]" />
          </>
        )}
        {promos && visibles.length === 0 && (
          <EstadoVacio
            ilustracion="promos"
            titulo={vacio.titulo}
            remate={vacio.remate}
            accion={pestana !== "terminada" || sinPromos ? { texto: "Crear promo", href: "/promos/nueva" } : undefined}
          />
        )}
        {visibles.length > 0 && (
          <ul className="flex flex-col gap-3">
            {visibles.map(({ promo, estado }) => (
              <li key={promo.id}>
                <TarjetaPromo
                  promo={promo}
                  terminada={estado === "terminada"}
                  producto={promo.productoId ? productosPorId.get(promo.productoId) : undefined}
                  productosDeColeccion={promo.coleccion ? (productos ?? []).filter((p) => p.categoria === promo.coleccion).length : 0}
                  usos={pedidos ? pedidosConCodigo(pedidos, promo) : null}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sin ninguna promo, el botón del estado vacío ya invita a crear: no se duplica */}
      {!sinPromos && <BotonFlotante href="/promos/nueva" texto="Promo" />}
      {children}
    </Contexto.Provider>
  );
}

const ETIQUETA_TIPO = { codigo: "Código", coleccion: "Por colección", producto: "Por producto" } as const;

function TarjetaPromo({
  promo,
  terminada,
  producto,
  productosDeColeccion,
  usos,
}: {
  promo: Promo;
  terminada: boolean;
  producto?: Producto;
  productosDeColeccion: number;
  usos: number | null;
}) {
  return (
    <Link
      href={`/promos/${promo.id}`}
      scroll={false}
      aria-label={`Promo ${promo.nombre}`}
      className={`tocable block rounded-[22px] border border-linea bg-white px-4 py-3.5 text-bosque ${terminada ? "opacity-65" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {promo.tipo === "producto" && (
            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-arena">
              {producto?.fotos[0] ? <Foto src={producto.fotos[0]} alt="" className="h-full w-full" sizes="56px" /> : null}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11.5px] font-extrabold tracking-wide text-suave uppercase">{ETIQUETA_TIPO[promo.tipo]}</p>
            <p className="truncate text-[17px] font-extrabold">{promo.nombre}</p>
            {promo.tipo === "coleccion" && (
              <p className="truncate text-[13px] text-suave">
                Colección {promo.coleccion} · {productosDeColeccion} {productosDeColeccion === 1 ? "producto" : "productos"}
              </p>
            )}
            {promo.tipo === "producto" && producto && (
              <p className="truncate text-[13px] text-suave">
                {producto.nombre} · <s>{formatearPesos(producto.precio)}</s>{" "}
                <span className="font-bold text-bosque">{formatearPesos(producto.precio - Math.round((producto.precio * (promo.valorPorcentaje ?? 0)) / 100))}</span>
              </p>
            )}
            {promo.tipo === "codigo" && <p className="text-[13px] text-suave">En todo el pedido</p>}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-mandarina px-3 py-1 font-display text-lg leading-tight text-bosque-oscuro">
          {promo.tipo === "producto" ? "−" : ""}
          {promo.valorPorcentaje}%
        </span>
      </div>
      {promo.tipo === "codigo" && (
        <p className="mt-2.5 inline-block rounded-xl border-[1.5px] border-dashed border-bosque px-3 py-1 font-display text-lg tracking-wider">{promo.codigo}</p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[13px] text-suave">
        <span>{rangoFechas(promo.fechaInicio, promo.fechaFin)}</span>
        {promo.tipo === "codigo" && usos !== null && (
          <span className="font-bold text-bosque">
            Usada en {usos} {usos === 1 ? "pedido" : "pedidos"}
          </span>
        )}
      </div>
    </Link>
  );
}
