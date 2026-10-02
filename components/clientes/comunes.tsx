"use client";

import Image from "next/image";
import { useState } from "react";
import { useData } from "@/lib/data/provider";
import { fotoClienteDemo } from "@/lib/fotos-demo";
import { iniciales } from "@/lib/formato";

const COLORES = ["bg-rosa", "bg-menta", "bg-arena"];

/** Foto de un contacto ficticio en demo; iniciales en real o si no hay foto. */
export function Avatar({ nombre, clienteId, tamano = 46 }: { nombre: string; clienteId?: string; tamano?: number }) {
  const { modo } = useData();
  const foto = fotoClienteDemo(modo, clienteId);
  const [fotoFallida, setFotoFallida] = useState<string>();
  const color = COLORES[[...nombre].reduce((suma, c) => suma + c.charCodeAt(0), 0) % COLORES.length];
  return (
    <span
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.37 }}
      className={`grid shrink-0 overflow-hidden place-items-center rounded-full font-display text-bosque ${color}`}
    >
      {foto && foto !== fotoFallida ? (
        <Image src={foto} alt="" width={tamano} height={tamano} unoptimized className="h-full w-full object-cover" onError={() => setFotoFallida(foto)} />
      ) : iniciales(nombre)}
    </span>
  );
}

export const EtiquetaRepite = () => (
  <span className="shrink-0 rounded-full bg-mandarina px-2 py-px text-[11px] font-extrabold text-bosque-oscuro">Repite</span>
);
