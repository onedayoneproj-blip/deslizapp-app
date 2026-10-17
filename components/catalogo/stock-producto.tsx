"use client";

import { resumenEspera, textoEspera } from "@/lib/avisos";
import type { AvisoLlegada, Producto } from "@/lib/types";
import { usePanelUI } from "../panel/ui";
import { IconoChevronDerecha } from "../iconos";
import { Etiqueta } from "../ui";
export { DetalleStock } from "./detalle-stock";

/**
 * "N esperan" (Etiqueta rosa): quienes pidieron "Avísame cuando llegue". Se toca y abre la tarjeta "Ya llegó" con un "Avisar"
 * por solicitud/variante. Comparte la lectura de pendientes y su invalidación con el resto del panel.
 */
export function Esperan({ producto, avisos, forma = "etiqueta" }: { producto: Producto; avisos: AvisoLlegada[]; forma?: "etiqueta" | "fila" }) {
  const { abrirEspera } = usePanelUI();
  const n = resumenEspera(avisos, producto.tiendaId).personas;
  if (n === 0) return null;
  return (
    <>
      <button type="button" onClick={() => abrirEspera(producto)} className={`tocable flex min-h-11 items-center gap-1 rounded-radio-s text-left text-etiqueta font-extrabold text-accion outline-none focus-visible:outline-3 focus-visible:outline-foco ${forma === "fila" ? "mt-1 w-full justify-between" : "shrink-0"}`} aria-label={`${textoEspera(n)} ${producto.nombre}. Ver quiénes`}>
        {forma === "fila" ? <><span>{textoEspera(n)}</span><IconoChevronDerecha tamano={18}/></> : <Etiqueta tono="marca">{n} esperan</Etiqueta>}
      </button>
    </>
  );
}
