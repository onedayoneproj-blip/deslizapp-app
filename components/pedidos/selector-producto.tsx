"use client";

import { useMemo, useState, type RefObject } from "react";
import { buscarProductos, cantidadMaxima, sePuedeAgregar } from "@/lib/buscar-productos";
import { formatearPesos } from "@/lib/formato";
import { precioConPromo } from "@/lib/promos";
import { resaltar } from "@/lib/texto";
import type { Producto, Promo } from "@/lib/types";
import { TextoResaltado } from "../clientes/texto-resaltado";
import { Foto } from "../foto";
import { FilaLista, ListaSeleccion, PildoraSeleccion, SelectorBusqueda } from "../selector-busqueda";
import { BotonCantidad, Cantidad, Etiqueta, FilaPastillas } from "../ui";

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
      <FilaPastillas
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
        <p className="rounded-radio-m bg-superficie-hundida p-4 text-center font-bold text-texto-secundario">
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
      <span className={`size-11 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida ${p.stock === 0 ? "grayscale" : ""}`}>
        {p.fotos[0] ? <Foto src={p.fotos[0]} alt="" className="h-full w-full" sizes="44px" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-cuerpo leading-tight font-extrabold text-texto">
          <TextoResaltado trozos={resaltar(p.nombre, consulta)} />
        </p>
        <p className="mt-0.5 truncate text-etiqueta font-normal text-texto-secundario">
          <span className="font-bold text-texto">{formatearPesos(precio.precio)}</span>
          {precio.precioAntes && <s className="ml-1">{formatearPesos(precio.precioAntes)}</s>}
          {" · "}
          {p.stock === null ? "Sin control de stock" : p.stock === 0 ? "Sin stock" : `${p.stock} en stock`}
        </p>
      </div>
      {etiqueta ? (
        <Etiqueta tono="fuerte">{etiqueta}</Etiqueta>
      ) : cantidad > 0 ? (
          <Cantidad valor={cantidad} max={enTope ? cantidad : undefined} alCambiar={(v) => alCambiar(p, v - cantidad)} etiquetaQuitar={`Quitar uno de ${p.nombre}`} etiquetaAgregar={`Agregar ${p.nombre}`} />
      ) : (
        <BotonCantidad tipo="mas" etiqueta={`Agregar ${p.nombre}`} onClick={() => alCambiar(p, 1)} deshabilitado={enTope} />
      )}
    </div>
  );
}
