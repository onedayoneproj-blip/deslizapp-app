"use client";

import { MOTIVOS_INVENTARIO } from "@/lib/data/inventario";
import { useState } from "react";
import type { MotivoAjusteInventario } from "@/lib/types";
import { Hoja } from "../hoja";
import { Boton, CampoMultilinea, GrupoOpciones } from "../ui";

export type { FotoBorrador } from "./hoja-presentacion";

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
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿Por qué baja el stock?" altura="grande">
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
