"use client";

import { useMemo, useState } from "react";
import { useTiendaActiva } from "@/lib/data/consulta";
import { mensajeDeError } from "@/lib/data/errores";
import { useData } from "@/lib/data/provider";
import { diaMesCorto } from "@/lib/formato";
import { candidatosAEspacio, DIAS_SIN_MOVIMIENTO, type VentasProducto } from "@/lib/inventario-catalogo";
import type { Producto } from "@/lib/types";
import { BotonVerMas, useVerMas } from "../ver-mas";
import { Boton, CheckSeleccion, FilaLista, ListaAgrupada, useToastUI } from "../ui";
import { MiniaturaProducto } from "./miniatura-producto";

/** Cuántos "sin moverse" se ven de entrada y por cada "Ver más". */
const PASO_SIN_MOVERSE = 5;

const lugares = (n: number) => (n === 1 ? "1 lugar" : `${n} lugares`);

/**
 * "Hacer espacio": elige qué ocultar del catálogo para liberar lugares del plan. Ocultar es reversible (activo = false; los ocultos no
 * cuentan en el plan). No hay "eliminar para siempre": los pedidos y el historial de stock apuntan a los productos.
 * `enReposicion`: lo marcado en "Por reponer" en esta sesión; esos agotados no se marcan para ocultar.
 */
export function VistaHacerEspacio({
  productos,
  ventas,
  enReposicion,
  alTerminar,
}: {
  productos: Producto[];
  ventas: Map<string, VentasProducto>;
  enReposicion: Record<string, number> | null;
  alTerminar: () => void;
}) {
  const { tiendaId } = useTiendaActiva();
  const { cambiarVisibilidad } = useData();
  const { mostrarToast } = useToastUI();
  const [ahora] = useState(() => Date.now());
  const candidatos = useMemo(
    () => candidatosAEspacio(productos, ventas, ahora, new Set(Object.keys(enReposicion ?? {}))),
    [productos, ventas, ahora, enReposicion],
  );
  const [elegidos, setElegidos] = useState<Set<string>>(() => new Set(candidatos.agotados.filter((a) => a.marcado).map((a) => a.producto.id)));
  const [ocultando, setOcultando] = useState(false);
  const quietos = useVerMas(candidatos.sinMoverse, "sin-moverse", PASO_SIN_MOVERSE);

  const alternar = (id: string) =>
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (!nuevo.delete(id)) nuevo.add(id);
      return nuevo;
    });

  const ids = [...elegidos];
  const n = ids.length;

  const ocultar = async () => {
    setOcultando(true);
    try {
      await cambiarVisibilidad(tiendaId, ids, false);
      mostrarToast(`Liberaste ${lugares(n)}`, {
        accion: {
          texto: "Deshacer",
          alTocar: () => void cambiarVisibilidad(tiendaId, ids, true).catch((e) => mostrarToast(mensajeDeError(e, "No se pudo deshacer."))),
        },
      });
      alTerminar();
    } catch (e) {
      mostrarToast(mensajeDeError(e, "No se pudo ocultar. Inténtalo otra vez."));
    } finally {
      setOcultando(false);
    }
  };

  const hayAlgo = candidatos.agotados.length > 0 || candidatos.sinMoverse.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mano text-mano text-atencion-texto">Que entren los nuevos</p>

      {!hayAlgo && <p className="text-secundario text-texto-secundario">Nada por ocultar por ahora.</p>}

      {candidatos.agotados.length > 0 && (
        <section aria-labelledby="espacio-agotados" className="flex flex-col gap-2">
          <h3 id="espacio-agotados" className="text-destacado text-texto">
            Agotados a la vista
          </h3>
          <ListaAgrupada>
            {candidatos.agotados.map(({ producto: p, ultimaVenta, porReponer }) => (
              <FilaLista
                key={p.id}
                marcada={elegidos.has(p.id)}
                onClick={() => alternar(p.id)}
                inicio={
                  <span className="flex items-center gap-3">
                    <CheckSeleccion marcado={elegidos.has(p.id)} />
                    <MiniaturaProducto producto={p} atenuada />
                  </span>
                }
                titulo={p.nombre}
                detalle={porReponer ? "Lo vas a reponer" : ultimaVenta ? `Se fue volando el ${diaMesCorto(ultimaVenta)}` : "Nunca se vendió"}
              />
            ))}
          </ListaAgrupada>
        </section>
      )}

      {candidatos.sinMoverse.length > 0 && (
        <section aria-labelledby="espacio-quietos" className="flex flex-col gap-2">
          <h3 id="espacio-quietos" className="text-destacado text-texto">
            Sin moverse en {DIAS_SIN_MOVIMIENTO} días
          </h3>
          <ListaAgrupada>
            {quietos.visibles.map(({ producto: p, ultimaVenta }) => (
              <FilaLista
                key={p.id}
                marcada={elegidos.has(p.id)}
                onClick={() => alternar(p.id)}
                inicio={
                  <span className="flex items-center gap-3">
                    <CheckSeleccion marcado={elegidos.has(p.id)} />
                    <MiniaturaProducto producto={p} atenuada />
                  </span>
                }
                titulo={p.nombre}
                detalle={`${p.stock === 1 ? "Queda 1" : `Quedan ${p.stock}`} · ${ultimaVenta ? `vendido ${diaMesCorto(ultimaVenta)}` : "sin ventas"}`}
              />
            ))}
            <BotonVerMas forma="fila" quedan={quietos.quedan} mostrados={quietos.mostrados} total={candidatos.sinMoverse.length} pagina={PASO_SIN_MOVERSE} alTocar={quietos.verMas} />
          </ListaAgrupada>
        </section>
      )}

      {hayAlgo && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-secundario text-texto-secundario">{n === 0 ? "Marca lo que quieras ocultar" : `Liberas ${lugares(n)} · los vuelves a mostrar cuando quieras`}</p>
          <Boton tamano="grande" anchoCompleto deshabilitado={n === 0} cargando={ocultando} onClick={() => void ocultar()}>
            {n === 0 ? "Ocultar del catálogo" : `Ocultar ${n} del catálogo`}
          </Boton>
        </div>
      )}
    </div>
  );
}
