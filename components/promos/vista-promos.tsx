"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useConsulta, useTiendaActiva } from "@/lib/data/consulta";
import { useData } from "@/lib/data/provider";
import { estadoPromo, estadoVisible, pedidosConCodigo } from "@/lib/promos";
import type { EstadoPromo } from "@/lib/types";
import { Segmentos } from "../controles";
import { EstadoVacio } from "../estado-vacio";
import { Esqueleto } from "../esqueleto";
import { BotonFlotante } from "../panel/boton-flotante";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { TituloPantalla } from "../panel/titulo-pantalla";
import { TarjetaPromo } from "./tarjeta-promo";

const PESTANAS: { id: EstadoPromo; nombre: string }[] = [
  { id: "activa", nombre: "Activas" },
  { id: "programada", nombre: "Programadas" },
  { id: "terminada", nombre: "Terminadas" },
];

const VACIO: Record<EstadoPromo, { titulo: string; remate: string }> = {
  activa: { titulo: "Ninguna promo activa.", remate: "Toca + Promo y ponle un descuento a lo que quieras mover." },
  programada: { titulo: "Nada programado.", remate: "Toca + Promo y déjala lista: arranca sola el día que elijas." },
  terminada: { titulo: "Aún no ha terminado ninguna.", remate: "Las que se vencen, o que termines tú, se guardan aquí." },
};

const Contexto = createContext<((p: EstadoPromo) => void) | null>(null);
const ContextoOferta = createContext<((promo: { id: string; programada: boolean }) => void) | null>(null);

/** Tras crear una promo: "¡Lista! ¿La compartes ahora?" con "Compartir" y "Después". */
export function useOfrecerCompartir() {
  const ofrecer = useContext(ContextoOferta);
  if (!ofrecer) throw new Error("useOfrecerCompartir() debe usarse dentro de <VistaPromos>.");
  return ofrecer;
}

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
  const { getPromos, getProductos, getPedidos, getClientes } = useData();
  const { tiendaId } = useTiendaActiva();
  const { data: clientes } = useConsulta(`clientes:${tiendaId}`, () => getClientes(tiendaId));
  const { data: promos } = useConsulta(`promos:${tiendaId}`, () => getPromos(tiendaId));
  const { data: productos } = useConsulta(`productos-historial:${tiendaId}`, () => getProductos(tiendaId, true));
  const { data: pedidos } = useConsulta(`pedidos:${tiendaId}`, () => getPedidos(tiendaId));
  const [pestana, setPestana] = useState<EstadoPromo>("activa");
  const router = useRouter();
  const [oferta, setOferta] = useState<{ id: string; programada: boolean } | null>(null);
  const ofrecer = useCallback((p: { id: string; programada: boolean }) => setOferta(p), []);
  // El aviso se va solo a los 9 s
  useEffect(() => {
    if (!oferta) return;
    const t = setTimeout(() => setOferta(null), 9000);
    return () => clearTimeout(t);
  }, [oferta]);

  // La pestaña sale del estado por fechas (una pausada o agotada sigue en su pestaña); la tarjeta muestra el estado visible.
  const conEstado = useMemo(
    () =>
      (promos ?? []).map((p) => {
        const usos = pedidos ? pedidosConCodigo(pedidos, p) : null;
        return { promo: p, pestana: estadoPromo(p), estado: estadoVisible(p, usos), usos };
      }),
    [promos, pedidos],
  );
  const cuentas = useMemo(() => {
    const c: Record<EstadoPromo, number> = { activa: 0, programada: 0, terminada: 0 };
    for (const p of conEstado) c[p.pestana]++;
    return c;
  }, [conEstado]);
  const todas = useMemo(() => conEstado.filter((p) => p.pestana === pestana), [conEstado, pestana]);
  const { visibles, quedan, mostrados, verMas } = useVerMas(todas, `${tiendaId}:${pestana}`);
  const productosPorId = useMemo(() => new Map((productos ?? []).map((p) => [p.id, p])), [productos]);
  const sinPromos = promos !== undefined && promos.length === 0;
  const vacio = sinPromos ? { titulo: "Aún no tienes promos.", remate: "Toca + Promo y crea la primera para ver cómo se deslizan tus productos." } : VACIO[pestana];

  return (
    <ContextoOferta.Provider value={ofrecer}>
    <Contexto.Provider value={setPestana}>
      <TituloPantalla titulo="Promos" subtitulo="Ponle un descuento y mira cómo se deslizan." />
      <div className="flex flex-col gap-3.5 px-5 pt-3.5">
        <Segmentos
          etiqueta="Estado de las promos"
          valor={pestana}
          alCambiar={setPestana}
          opciones={PESTANAS.map((t) => ({
            id: t.id,
            texto: t.nombre,
              cantidad: promos ? cuentas[t.id] : undefined,
          }))}
        />

        {!promos && (
          <>
            <Esqueleto className="h-[120px] rounded-[22px]" />
            <Esqueleto className="h-[120px] rounded-[22px]" />
          </>
        )}
        {promos && todas.length === 0 && (
          <EstadoVacio
            ilustracion="promos"
            titulo={vacio.titulo}
            remate={vacio.remate}
          />
        )}
        {todas.length > 0 && (
          <>
          <ul className="flex flex-col gap-[18px]">
            {visibles.map(({ promo, estado, usos }) => (
              <li key={promo.id}>
                <TarjetaPromo
                  promo={promo}
                  estado={estado}
                  href={`/promos/${promo.id}?desde=lista`}
                  producto={promo.productoId ? productosPorId.get(promo.productoId) : undefined}
                  productosDeColeccion={promo.coleccion ? (productos ?? []).filter((p) => p.categoria === promo.coleccion).length : 0}
                  usos={usos}
                  paraCliente={promo.clienteId ? (clientes?.find((c) => c.id === promo.clienteId)?.nombre ?? "un cliente") : null}
                />
              </li>
            ))}
            <BotonVerMas quedan={quedan} mostrados={mostrados} total={todas.length} alTocar={verMas} />
          </ul>
          </>
        )}
      </div>

      <BotonFlotante href="/promos/nueva" texto="Promo" />
      {children}
      {oferta && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-[calc(14px+env(safe-area-inset-top))] z-[60] mx-auto max-w-[480px] px-4">
          <div className="mov-baja pointer-events-auto flex items-center gap-3 rounded-[20px] bg-bosque py-2.5 pr-2.5 pl-4 text-papel shadow-[0_14px_30px_-12px_rgba(23,75,58,0.6)]">
            <p className="min-w-0 flex-1 text-[14.5px] leading-snug font-bold">
              ¡Lista! ¿La compartes ahora?
            </p>
            <button type="button" onClick={() => setOferta(null)} className="tocable h-11 shrink-0 rounded-full px-3 text-[14px] font-extrabold text-papel/80">
              Después
            </button>
            <button
              type="button"
              onClick={() => {
                const id = oferta.id;
                setOferta(null);
                router.push(`/promos/${id}/compartir?desde=lista`, { scroll: false });
              }}
              className="tocable h-11 shrink-0 rounded-full bg-mandarina px-4 text-[14px] font-extrabold text-bosque-oscuro"
            >
              Compartir
            </button>
          </div>
        </div>
      )}
    </Contexto.Provider>
    </ContextoOferta.Provider>
  );
}
