"use client";

import { useState } from "react";
import { situacionVariantes } from "@/lib/inventario-catalogo";
import type { AvisoLlegada, Producto } from "@/lib/types";
import { Hoja } from "../hoja";
import { Etiqueta } from "../ui";
import { TarjetaYaLlego } from "./tarjeta-ya-llego";

/** La segunda línea de un producto: con variantes, su situación corta ("L · Arena agotada · 11 en total"); si no, el stock. */
export function DetalleStock({ producto: p }: { producto: Producto }) {
  const s = situacionVariantes(p);
  if (s) {
    return (
      <>
        {s.resaltado && <b className="font-extrabold text-atencion-texto">{s.resaltado}</b>}
        {s.resaltado ? " · " : ""}
        {s.resto}
      </>
    );
  }
  return <>{p.stock === null ? "Sin control de stock" : p.stock === 0 ? "Agotado" : p.stock === 1 ? "Queda 1" : `${p.stock} en stock`}</>;
}

/**
 * "N esperan" (Etiqueta rosa): quienes pidieron "Avísame cuando llegue". Se toca y abre la tarjeta "Ya llegó" con un "Avisar"
 * por persona. Los avisos se toman al abrir (marcar uno como avisado no lo saca de la lista mientras está abierta).
 */
export function Esperan({ producto, avisos }: { producto: Producto; avisos: AvisoLlegada[] }) {
  const [abiertos, setAbiertos] = useState<AvisoLlegada[] | null>(null);
  if (avisos.length === 0) return null;
  return (
    <>
      <button type="button" onClick={() => setAbiertos(avisos)} className="tocable relative shrink-0 rounded-full after:absolute after:-inset-2.5 after:content-['']" aria-label={`${avisos.length} esperan que llegue ${producto.nombre}. Ver quiénes`}>
        <Etiqueta tono="marca">{avisos.length} esperan</Etiqueta>
      </button>
      <Hoja abierta={abiertos !== null} alCerrar={() => setAbiertos(null)} titulo={producto.nombre}>
        {abiertos && <TarjetaYaLlego producto={producto} avisos={abiertos} />}
      </Hoja>
    </>
  );
}

