"use client";

import Link from "next/link";
import { useState } from "react";
import { enlaceCatalogo } from "@/lib/enlace-catalogo";
import { pideConfirmarPublicar, tituloConfirmarPublicar } from "@/lib/publicar-catalogo";
import { PRODUCTOS_PROHIBIDOS } from "@/lib/productos-prohibidos";
import { Hoja } from "../hoja";

/**
 * Confirmación antes de publicar el catálogo (RPC `publicar_mi_catalogo`): qué va a pasar, el enlace que tendrá y lo que no se
 * puede vender. Al publicar se aceptan los Términos. La lista de prohibidos vive en lib/productos-prohibidos.ts.
 * Sin mínimo: con menos de los productos sugeridos la hoja lo dice con suavidad («Tu catálogo tiene N productos», «Publicar igual»
 * y «Agregar más»); nunca impide publicar.
 */
export function HojaPublicarCatalogo({
  abierta,
  alCerrar,
  enlace,
  productos,
  alAgregarMas,
  alConfirmar,
}: {
  abierta: boolean;
  alCerrar: () => void;
  /** La dirección que tendrá el catálogo (https). */
  enlace: string;
  /** Productos visibles con foto que tiene ahora. */
  productos: number;
  /** «Agregar más»: cierra y lleva a crear un producto. */
  alAgregarMas: () => void;
  alConfirmar: () => Promise<void>;
}) {
  const pocos = pideConfirmarPublicar(productos);
  const [enviando, setEnviando] = useState(false);
  const partes = enlaceCatalogo(enlace);
  const confirmar = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await alConfirmar();
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={pocos ? tituloConfirmarPublicar(productos) : "¿Publicamos tu catálogo?"}>
      <div className="flex flex-col gap-3">
        {pocos && (
          <p className="text-[15px] leading-snug" data-publicar-pocos="">
            Así lo verán tus clientes. Puedes publicarlo y seguir agregando.
          </p>
        )}
        <div className="rounded-[20px] border border-linea bg-white px-4 py-3">
          <p className="text-[14.5px] leading-snug">Tus clientes lo verán en este enlace:</p>
          {partes && (
            <p className="mt-1 flex min-w-0 text-[15px]">
              <span className="min-w-0 truncate">
                <span className="font-extrabold">{partes.dominio}</span>
                <span className="text-suave">{partes.resto}</span>
              </span>
            </p>
          )}
        </div>
        <div className="rounded-[20px] border border-linea bg-white px-4 py-3.5">
          <p className="text-[14.5px] font-extrabold">Lo que no se puede vender</p>
          <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-5 text-[14px] leading-snug">
            {PRODUCTOS_PROHIBIDOS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <p className="text-center text-[12.5px] leading-snug text-suave">
          Al publicar aceptas los{" "}
          <Link href="/terminos" target="_blank" className="font-extrabold text-bosque underline">
            Términos
          </Link>
          .
        </p>
        <button type="button" onClick={confirmar} disabled={enviando} className="tocable h-14 rounded-full bg-bosque text-[16.5px] font-extrabold text-papel disabled:opacity-60">
          {pocos ? "Publicar igual" : "Publicar"}
        </button>
        {pocos ? (
          <button type="button" onClick={alAgregarMas} disabled={enviando} className="tocable h-12 rounded-full border-[1.5px] border-bosque text-[15px] font-extrabold text-bosque">
            Agregar más
          </button>
        ) : (
          <button type="button" onClick={alCerrar} disabled={enviando} className="tocable h-11 text-[14.5px] font-extrabold text-bosque">
            Ahora no
          </button>
        )}
      </div>
    </Hoja>
  );
}
