"use client";

import { MOTIVOS_INVENTARIO } from "@/lib/data/inventario";
import { pastillasDeOpciones } from "@/lib/hoja-producto";
import { useState } from "react";
import type { EstadoPresentaciones } from "@/lib/presentaciones";
import type { Rubro } from "@/lib/rubros";
import type { MotivoAjusteInventario } from "@/lib/types";
import { IconoChevronDerecha } from "../iconos";
import { Hoja } from "../hoja";
import { Boton, CampoMultilinea, Etiqueta, GrupoOpciones } from "../ui";
import { FlujoPresentaciones } from "./flujo-presentaciones";
import type { FotoBorrador } from "./hoja-presentacion";

export type { FotoBorrador } from "./hoja-presentacion";

/**
 * «Presentaciones» en la hoja de producto: solo el resumen (una pastilla por cosa y «N presentaciones · M»). Tocarlo abre el
 * flujo de dos pasos: sin presentaciones en el paso 1 («Qué cambia»); con ellas, directo en el paso 2 («Cuántas tienes»).
 * Todo edita el borrador de la ficha: se guarda con «Guardar cambios» del producto.
 */
export function SeccionPresentaciones({
  abierta,
  alAlternar,
  rubro,
  precioProducto,
  estado,
  alCambiar,
  stockSimple,
  publicado,
  fotos,
  agregarFoto,
  sinPermiso,
  porque,
  avisar,
  deshabilitado,
  tienePedidos,
}: {
  /** La hoja de presentaciones: la maneja la ficha para que el Precio («Desde…») también pueda abrirla. */
  abierta: boolean;
  alAlternar: (abierta: boolean) => void;
  rubro: Rubro;
  precioProducto: number;
  estado: EstadoPresentaciones;
  alCambiar: (e: EstadoPresentaciones) => void;
  /** El stock simple de antes de tener presentaciones (se reparte al crearlas); null = no llevaba la cuenta. */
  stockSimple: number | null;
  /** ¿El producto ya se publicó? Un producto nuevo no dice «Agotada». */
  publicado: boolean;
  fotos: FotoBorrador[];
  /** Sube una foto nueva a las del producto y devuelve su id (null si no se pudo). */
  agregarFoto: (archivo: File) => Promise<string | null>;
  sinPermiso: boolean;
  porque: string;
  avisar: (mensaje: string) => void;
  deshabilitado?: boolean;
  /** ¿Esta presentación (por id de variante) ya tiene pedidos? */
  tienePedidos: (varianteId: string) => Promise<boolean>;
}) {
  const { opciones, pres } = estado;
  const tiene = pres.length > 0 && opciones.length > 0;
  return (
    <div data-presentaciones="" data-cosas-que-cambian="" className="border-t border-linea">
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => (sinPermiso ? avisar(porque) : alAlternar(true))}
        className="tocable flex min-h-15 w-full items-center gap-3 px-4 py-2 text-left outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-foco disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-destacado text-texto">Presentaciones</span>
          {tiene ? (
            <span className="flex flex-wrap gap-1.5">
              {pastillasDeOpciones(opciones).map((t) => (
                <Etiqueta key={t} tono="exito">{t}</Etiqueta>
              ))}
            </span>
          ) : (
            <span className="text-secundario text-texto-secundario">Talla, color, tamaño. Cada una lleva su stock.</span>
          )}
        </span>
        <IconoChevronDerecha tamano={20} strokeWidth={2.2} className="shrink-0 text-texto-secundario" />
      </button>
      <FlujoPresentaciones
        abierta={abierta}
        alCerrar={() => alAlternar(false)}
        rubro={rubro}
        precioProducto={precioProducto}
        estado={estado}
        stockSimple={stockSimple}
        publicado={publicado}
        fotos={fotos}
        agregarFoto={agregarFoto}
        tienePedidos={tienePedidos}
        avisar={avisar}
        alConfirmar={(nuevo) => {
          alCambiar(nuevo);
          alAlternar(false);
        }}
      />
    </div>
  );
}

/**
 * Por qué baja el stock de unas variantes (como el ajuste del producto): daño, pérdida, corrección u otro (con nota). Las subidas
 * van como reposición sin preguntar.
 */
export function HojaMotivoVariantes({
  abierta,
  unidades,
  guardando,
  alCerrar,
  alConfirmar,
}: {
  abierta: boolean;
  unidades: number;
  guardando: boolean;
  alCerrar: () => void;
  alConfirmar: (motivo: MotivoAjusteInventario, nota: string | null) => void;
}) {
  const [motivo, setMotivo] = useState<MotivoAjusteInventario | null>(null);
  const [nota, setNota] = useState("");
  const listo = motivo !== null && (motivo !== "otro" || nota.trim().length > 0);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿Por qué baja el stock?">
      <div className="flex flex-col gap-4">
        <p className="text-secundario text-texto-secundario">
          Retirarás {unidades} {unidades === 1 ? "unidad" : "unidades"}. Se guarda como ajuste, no como venta.
        </p>
        <GrupoOpciones
          etiqueta="Motivo del ajuste"
          valor={motivo}
          alCambiar={setMotivo}
          opciones={(["dano", "perdida", "correccion_inventario", "otro"] as const).map((m) => ({ id: m, texto: MOTIVOS_INVENTARIO[m] }))}
        />
        {motivo === "otro" && <CampoMultilinea etiqueta="Cuéntanos el motivo" maxLength={200} filas={3} value={nota} onChange={(e) => setNota(e.target.value)} />}
        <Boton tamano="grande" anchoCompleto cargando={guardando} deshabilitado={!listo} onClick={() => motivo && alConfirmar(motivo, motivo === "otro" ? nota.trim() : null)}>
          Guardar ajuste
        </Boton>
      </div>
    </Hoja>
  );
}
