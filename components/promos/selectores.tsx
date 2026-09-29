"use client";

import { useMemo, useState, type RefObject } from "react";
import { buscarProductos, unidadesVendidas } from "@/lib/buscar-productos";
import { formatearPesos } from "@/lib/formato";
import { contieneTodas, palabras, resaltar } from "@/lib/texto";
import type { PedidoConItems, Producto } from "@/lib/types";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { Foto } from "../foto";
import { FilaLista, ListaSeleccion, SelectorBusqueda } from "../selector-busqueda";

/** Elegir UN producto para una promo (mismo selector con búsqueda de "+ Pedido", dentro de la misma hoja). */
export function SelectorProductoPromo({
  productos,
  pedidos,
  elegido,
  entrada,
  alElegir,
  alVolver,
}: {
  productos: Producto[];
  pedidos: PedidoConItems[];
  elegido: string | null;
  entrada: RefObject<HTMLInputElement | null>;
  alElegir: (producto: Producto) => void;
  alVolver: () => void;
}) {
  const [consulta, setConsulta] = useState("");
  const q = consulta.trim();
  const vendidas = useMemo(() => unidadesVendidas(pedidos), [pedidos]);
  const resultados = useMemo(() => buscarProductos(productos, q, null, vendidas), [productos, q, vendidas]);
  return (
    <SelectorBusqueda
      entrada={entrada}
      consulta={consulta}
      alCambiarConsulta={setConsulta}
      placeholder="Busca un producto"
      etiqueta="Buscar producto"
      alVolver={alVolver}
    >
      {resultados.length === 0 ? (
        <p className="rounded-[18px] bg-arena p-4 text-center font-semibold text-suave">Ni un suspiro con ese nombre.</p>
      ) : (
        <ListaSeleccion>
          {resultados.map((p) => (
            <FilaLista key={p.id}>
              <button
                type="button"
                onClick={() => alElegir(p)}
                aria-pressed={p.id === elegido}
                className={`tocable flex w-full items-center gap-3 py-2.5 text-left text-bosque ${p.activo ? "" : "opacity-60"}`}
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-arena">
                  {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="44px" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-extrabold">
                    <TextoResaltado trozos={resaltar(p.nombre, q)} />
                  </span>
                  <span className="block truncate text-[12.5px] text-suave">
                    {formatearPesos(p.precio)}
                    {p.categoria ? ` · ${p.categoria}` : ""}
                    {!p.activo ? " · Oculto" : ""}
                  </span>
                </span>
                {p.id === elegido && <span className="shrink-0 rounded-full bg-bosque px-2.5 py-[3px] text-xs font-extrabold text-papel">Elegido</span>}
              </button>
            </FilaLista>
          ))}
        </ListaSeleccion>
      )}
    </SelectorBusqueda>
  );
}

/** Elegir UNA colección para una promo, con cuántos productos tiene cada una. */
export function SelectorColeccionPromo({
  productos,
  elegida,
  entrada,
  alElegir,
  alVolver,
}: {
  productos: Producto[];
  elegida: string | null;
  entrada: RefObject<HTMLInputElement | null>;
  alElegir: (coleccion: string) => void;
  alVolver: () => void;
}) {
  const [consulta, setConsulta] = useState("");
  const q = palabras(consulta);
  const colecciones = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of productos) if (p.categoria) cuenta.set(p.categoria, (cuenta.get(p.categoria) ?? 0) + 1);
    return [...cuenta].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [productos]);
  const visibles = colecciones.filter(([nombre]) => q.length === 0 || contieneTodas(nombre, q));
  return (
    <SelectorBusqueda
      entrada={entrada}
      consulta={consulta}
      alCambiarConsulta={setConsulta}
      placeholder="Busca una colección"
      etiqueta="Buscar colección"
      alVolver={alVolver}
    >
      {visibles.length === 0 ? (
        <p className="rounded-[18px] bg-arena p-4 text-center font-semibold text-suave">
          {colecciones.length === 0 ? "Aún no hay colecciones. Se crean al publicar productos en el Catálogo." : "Ninguna colección se llama así."}
        </p>
      ) : (
        <ListaSeleccion>
          {visibles.map(([nombre, cantidad]) => (
            <FilaLista key={nombre}>
              <button type="button" onClick={() => alElegir(nombre)} aria-pressed={nombre === elegida} className="tocable flex w-full items-center gap-3 py-3 text-left text-bosque">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold">
                    <TextoResaltado trozos={resaltar(nombre, consulta)} />
                  </span>
                  <span className="block text-[12.5px] text-suave">
                    {cantidad} {cantidad === 1 ? "producto" : "productos"}
                  </span>
                </span>
                {nombre === elegida && <span className="shrink-0 rounded-full bg-bosque px-2.5 py-[3px] text-xs font-extrabold text-papel">Elegida</span>}
              </button>
            </FilaLista>
          ))}
        </ListaSeleccion>
      )}
    </SelectorBusqueda>
  );
}
