"use client";

import { useMemo, useState, type RefObject } from "react";
import { buscarProductos, cantidadMaxima, sePuedeAgregar } from "@/lib/buscar-productos";
import { formatearPesos } from "@/lib/formato";
import { precioConPromo } from "@/lib/promos";
import { resaltar } from "@/lib/texto";
import type { Producto, Promo } from "@/lib/types";
import { Segmentos } from "../controles";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { Foto } from "../foto";
import { IconoMas, IconoMenos } from "../iconos";
import { FilaLista, ListaSeleccion, PildoraSeleccion, SelectorBusqueda } from "../selector-busqueda";

const TODAS = "__todas";

/**
 * Selector de productos de "+ Pedido", dentro de la misma hoja: buscador (nombre o colección), pastillas de
 * colección, y en cada fila − cantidad + para agregar sin salir de la lista. Abajo, flotando: el resumen y "Listo".
 * Sin texto: los más vendidos primero. Agotados y ocultos, atenuados y sin poder agregarse (ocultos al final).
 */
export function SelectorProducto({
  productos,
  promos,
  vendidas,
  cantidades,
  alCambiar,
  entrada,
  alTerminar,
}: {
  productos: Producto[];
  promos: Promo[];
  vendidas: Map<string, number>;
  cantidades: Record<string, number>;
  /** Cambia la cantidad de un producto en `delta` (el formulario respeta el stock). */
  alCambiar: (producto: Producto, delta: number) => void;
  entrada: RefObject<HTMLInputElement | null>;
  alTerminar: () => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [coleccion, setColeccion] = useState<string>(TODAS);
  const q = consulta.trim();

  const colecciones = useMemo(
    () => [...new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "es")),
    [productos],
  );
  const resultados = useMemo(
    () => buscarProductos(productos, q, coleccion === TODAS ? null : coleccion, vendidas),
    [productos, q, coleccion, vendidas],
  );

  const unidades = productos.reduce((suma, p) => suma + (cantidades[p.id] ?? 0), 0);
  const total = productos.reduce((suma, p) => suma + (cantidades[p.id] ?? 0) * precioConPromo(p, promos).precio, 0);

  const fijo =
    colecciones.length > 0 ? (
      <Segmentos
        etiqueta="Colección"
        valor={coleccion}
        alCambiar={setColeccion}
        opciones={[{ id: TODAS, texto: "Todas" }, ...colecciones.map((c) => ({ id: c, texto: c }))]}
      />
    ) : undefined;
  // Solo con algo elegido: la píldora flotante con el resumen y "Listo"
  const pildora =
    unidades > 0 ? (
      <PildoraSeleccion detalle={`${unidades} ${unidades === 1 ? "producto" : "productos"}`} total={formatearPesos(total)} alListo={alTerminar} />
    ) : undefined;

  return (
    <SelectorBusqueda
      entrada={entrada}
      consulta={consulta}
      alCambiarConsulta={setConsulta}
      placeholder="Busca un producto"
      etiqueta="Buscar producto"
      alVolver={alTerminar}
      fijo={fijo}
      abajo={pildora}
    >
      {resultados.length === 0 ? (
        <p className="rounded-[18px] bg-arena p-4 text-center font-semibold text-suave">
          {productos.length === 0 ? "Aún no tienes productos. Publica uno en el Catálogo." : "Ni un suspiro con ese nombre. Prueba con otra palabra u otra colección."}
        </p>
      ) : (
        <ListaSeleccion>
          {resultados.map((p) => (
            <FilaLista key={p.id}>
              <FilaProducto producto={p} promos={promos} cantidad={cantidades[p.id] ?? 0} consulta={q} alCambiar={alCambiar} />
            </FilaLista>
          ))}
        </ListaSeleccion>
      )}
    </SelectorBusqueda>
  );
}

function FilaProducto({
  producto: p,
  promos,
  cantidad,
  consulta,
  alCambiar,
}: {
  producto: Producto;
  promos: Promo[];
  cantidad: number;
  consulta: string;
  alCambiar: (producto: Producto, delta: number) => void;
}) {
  const precio = precioConPromo(p, promos);
  const bloqueado = !sePuedeAgregar(p);
  const etiqueta = !p.activo ? "Oculto" : p.stock === 0 ? "Agotado" : null;
  const tope = cantidadMaxima(p);
  const enTope = cantidad >= tope;
  return (
    <div className={`flex items-center gap-3 py-2.5 ${bloqueado ? "opacity-55" : ""}`}>
      <span className={`h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-arena ${p.stock === 0 ? "grayscale" : ""}`}>
        {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="44px" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] leading-tight font-extrabold text-bosque">
          <TextoResaltado trozos={resaltar(p.nombre, consulta)} />
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-suave">
          <span className="font-bold text-bosque">{formatearPesos(precio.precio)}</span>
          {precio.precioAntes && <s className="ml-1">{formatearPesos(precio.precioAntes)}</s>}
          {" · "}
          {p.stock === null ? "Sin control de stock" : p.stock === 0 ? "Sin stock" : `${p.stock} en stock`}
        </p>
      </div>
      {etiqueta ? (
        <span className="shrink-0 rounded-full bg-bosque px-2.5 py-[3px] text-xs font-extrabold text-papel">{etiqueta}</span>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          {cantidad > 0 && (
            <>
              <button type="button" onClick={() => alCambiar(p, -1)} aria-label={`Quitar uno de ${p.nombre}`} className="tocable grid h-10 w-10 place-items-center rounded-[13px] bg-arena">
                <IconoMenos tamano={18} />
              </button>
              <span className="min-w-[26px] text-center font-display text-xl tabular-nums" aria-live="polite">
                {cantidad}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => alCambiar(p, 1)}
            disabled={enTope}
            aria-label={`Agregar ${p.nombre}`}
            className="tocable grid h-10 w-10 place-items-center rounded-[13px] bg-bosque text-papel disabled:opacity-35"
          >
            <IconoMas tamano={18} />
          </button>
        </div>
      )}
    </div>
  );
}
