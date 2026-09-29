"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { estadoPromo, pedidosConCodigo } from "@/lib/promos";
import type { EstadoPromo } from "@/lib/types";
import { Segmentos } from "../controles";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { Numero } from "../numero";
import { BotonFlotante } from "../panel/boton-flotante";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { TarjetaPromo } from "./tarjeta-promo";

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
          <ul className="flex flex-col gap-[18px]">
            {visibles.map(({ promo, estado }) => (
              <li key={promo.id}>
                <TarjetaPromo
                  promo={promo}
                  estado={estado}
                  href={`/promos/${promo.id}`}
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
