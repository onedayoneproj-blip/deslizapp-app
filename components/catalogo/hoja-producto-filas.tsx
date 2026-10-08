"use client";

import type { ReactNode } from "react";
import { formatearPesos } from "@/lib/formato";
import { resumenDe, type Presentacion } from "@/lib/presentaciones";
import { contadorMedios } from "@/lib/hoja-producto";
import type { OpcionProducto } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoChevronAbajo, IconoChevronDerecha } from "../iconos";
import { Etiqueta } from "../ui";

/**
 * Una fila de «Más opciones» que se pliega: muestra su valor cerrada y, al tocarla, se abre en el mismo lugar. Abrir y cerrar es
 * instantáneo (nada de animar la altura) y no toca el foco de ningún campo.
 */
export function FilaPlegable({ id, titulo, detalle, abierta, alAlternar, children }: { id: string; titulo: string; detalle?: ReactNode; abierta: boolean; alAlternar: () => void; children: ReactNode }) {
  return (
    <li className="border-t border-linea first:border-t-0" data-fila-plegable={id}>
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={`fila-${id}`}
        onClick={alAlternar}
        className="tocable flex min-h-15 w-full items-center gap-3 px-4 text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco"
      >
        <span className="flex min-w-0 flex-1 flex-col py-2">
          <span className="truncate text-destacado text-texto">{titulo}</span>
          {detalle && <span className="truncate text-secundario text-texto-secundario">{detalle}</span>}
        </span>
        {abierta ? <IconoChevronAbajo tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" /> : <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />}
      </button>
      {abierta && (
        <div id={`fila-${id}`} className="px-4 pb-4">
          {children}
        </div>
      )}
    </li>
  );
}

export type BorradorVista = {
  nombre: string;
  precio: number;
  foto: string | null;
  cantidadFotos: number;
  descripcion: string;
  opciones: OpcionProducto[];
  presentaciones: Presentacion[];
  stock: number | null;
  porEncargo: boolean;
  encargoTexto: string;
  coleccion: string | null;
  visible: boolean;
  conFicha: boolean;
};

/**
 * «Cómo se ve»: el producto tal como lo verá quien compra, armado con el borrador (aún sin guardar). El catálogo del comprador
 * solo lee productos ya guardados, así que esto es una vista mínima con los mismos datos: foto, nombre, precio, presentaciones,
 * descripción y si es por encargo.
 */
export function HojaComoSeVe({ abierta, alCerrar, borrador }: { abierta: boolean; alCerrar: () => void; borrador: BorradorVista }) {
  const conPres = borrador.opciones.length > 0 && borrador.presentaciones.length > 0;
  const r = conPres ? resumenDe(borrador.presentaciones, borrador.precio) : null;
  const agotado = conPres ? r!.total > 0 && r!.enTotal === 0 : borrador.stock === 0;
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Cómo se ve" altura="auto">
      <div className="flex flex-col gap-4 text-texto" data-como-se-ve="">
        {!borrador.visible && <p className="rounded-radio-m bg-atencion-suave p-3 text-secundario font-bold text-atencion-texto">Está oculto: nadie lo ve en el catálogo.</p>}
        <div className="relative aspect-square w-full overflow-hidden rounded-radio-l bg-superficie-hundida">
          {borrador.foto ? <Foto src={borrador.foto} alt="" className="h-full w-full" sizes="(max-width: 480px) 100vw, 440px" /> : <span className="grid h-full place-items-center text-secundario text-texto-secundario">Falta la foto</span>}
          {borrador.cantidadFotos > 1 && <span aria-hidden="true" className="absolute top-3 right-3 rounded-full bg-accion px-2.5 py-1 text-etiqueta text-sobre-accion tabular-nums">{contadorMedios(1, borrador.cantidadFotos)}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <p className="break-words text-destacado">{borrador.nombre.trim() || "Sin nombre"}</p>
          <p className="font-display text-cifra">
            {conPres && r!.desde !== null && r!.conPrecioPropio ? `Desde ${formatearPesos(r!.desde)}` : borrador.precio > 0 ? formatearPesos(borrador.precio) : "Sin precio"}
          </p>
          {borrador.coleccion && <p className="text-secundario text-texto-secundario">{borrador.coleccion}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {agotado && !borrador.porEncargo && <Etiqueta tono="fuerte">Agotado</Etiqueta>}
          {borrador.porEncargo && <Etiqueta tono="marca">{borrador.encargoTexto.trim() || "Por encargo"}</Etiqueta>}
        </div>
        {conPres && (
          <ul aria-label="Presentaciones" className="flex flex-col gap-2">
            {borrador.opciones.map((o) => (
              <li key={o.nombre} className="flex flex-wrap items-center gap-1.5">
                <span className="text-secundario font-extrabold">{o.nombre}</span>
                {o.valores.map((v) => <Etiqueta key={v}>{v}</Etiqueta>)}
              </li>
            ))}
          </ul>
        )}
        {borrador.descripcion.trim() && <p className="whitespace-pre-line break-words text-cuerpo text-texto-secundario">{borrador.descripcion.trim()}</p>}
        {borrador.conFicha && <p className="text-secundario text-texto-secundario">Lleva ficha técnica.</p>}
      </div>
    </Hoja>
  );
}
