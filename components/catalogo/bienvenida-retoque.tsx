"use client";

import { useState } from "react";
import { CREDITOS_POR_RETOQUE } from "@/lib/config";
import { Hoja } from "../hoja";
import { IconoCheck } from "../iconos";
import { Boton } from "../ui";
import { EtiquetaBeta } from "./etiqueta-beta";

/** Lo que la bienvenida necesita para dibujarse. `n` cambia en cada apertura, así la escena corre otra vez. */
export type DatosBienvenida = {
  n: number;
  /** La foto real del producto que se va a retocar. */
  foto: string | null;
  /** Hasta 3 referencias reales de la tienda. */
  referencias: string[];
};

/**
 * Bienvenida del retoque (tablero «Bienvenida»): sale la primera vez que una tienda manda una foto al taller, y otra vez desde
 * «Cómo funciona». Cuenta con la foto del producto y las referencias de la tienda; la versión «después» es una ilustración
 * (la misma foto con más luz y un fondo suave), no un resultado. «Retocar foto» confirma; Cancelar o cerrar no manda nada.
 */
export function BienvenidaRetoque({
  datos,
  alConfirmar,
  alCancelar,
}: {
  datos: DatosBienvenida | null;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  // Lo último abierto se sigue viendo mientras la hoja baja.
  const [visto, setVisto] = useState(datos);
  if (datos && datos !== visto) setVisto(datos);
  const d = datos ?? visto;
  return (
    <Hoja abierta={datos !== null} alCerrar={alCancelar} titulo="Retoque con tu marca">
      {d && (
        <div className="flex flex-col gap-4" data-bienvenida-retoque="">
          <div className="flex items-center gap-2.5">
            <EtiquetaBeta />
            <span className="text-secundario font-bold text-texto-secundario">{CREDITOS_POR_RETOQUE} créditos</span>
          </div>

          <Escena key={d.n} foto={d.foto} referencias={d.referencias.slice(0, 3)} />

          <div className="bv-titulo">
            <h2 className="font-display text-titulo-hoja text-texto">Tu foto, con tu marca.</h2>
            <p className="mt-1 text-secundario text-texto-secundario">Tus fotos de referencia son la guía.</p>
          </div>

          <div className="flex items-start gap-2.5 rounded-radio-m bg-accion-suave px-3.5 py-3">
            <IconoCheck tamano={20} className="mt-0.5 shrink-0 text-exito-texto" />
            <p className="text-secundario font-semibold text-texto">
              Tu producto sigue siendo tu producto. Mejoramos la foto, no lo cambiamos: lo que ve tu cliente es lo que recibe.
            </p>
          </div>

          <p className="rounded-radio-m bg-atencion-suave px-3.5 py-3 text-secundario font-semibold text-atencion-texto">
            Beta: cada foto se revisa con cuidado y eso toma su tiempo. Si no sale como debe, te devolvemos los créditos.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <Boton jerarquia="secundario" anchoCompleto onClick={alCancelar}>
              Cancelar
            </Boton>
            <Boton anchoCompleto onClick={alConfirmar}>
              Retocar foto
            </Boton>
          </div>
        </div>
      )}
    </Hoja>
  );
}

/** La escena de 212 px: la foto tal cual → llegan las referencias y se funden → un barrido de luz la cambia por la ilustración. */
function Escena({ foto, referencias }: { foto: string | null; referencias: string[] }) {
  /* Foto del producto: la misma en «antes» (apagada) y en «después» (más luz, sobre un fondo suave). Es decoración. */
  const imagen = (clase: string, estilo?: React.CSSProperties) =>
    foto ? (
      // eslint-disable-next-line @next/next/no-img-element -- foto de la propia tienda (data URL o Storage); es una ilustración
      <img src={foto} alt="" aria-hidden="true" className={clase} style={estilo} />
    ) : null;
  return (
    <div className="relative h-[212px] overflow-hidden rounded-radio-l bg-superficie-hundida" role="img" aria-label="Tu foto, retocada con tus fotos de referencia como guía (ilustración)">
      {/* Antes: la foto tal cual la mandó, apagada */}
      <div className="absolute inset-0">
        {imagen("h-full w-full object-cover")}
        <div className="absolute inset-0 bg-[rgba(60,50,40,0.22)]" />
      </div>

      {/* Después: la misma foto, con más luz y un fondo suave (ilustración) */}
      <div className="bv-barrido absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bv-barrido-dentro absolute inset-0 bg-marca-rosa">
          <div className="absolute top-[18px] left-1/2 -ml-[88px] size-[176px] rounded-full bg-[#fff2e6]" />
          <div className="absolute bottom-5 left-1/2 -ml-[60px] h-4 w-[120px] rounded-full bg-[rgba(16,54,42,0.13)]" />
          <div className="absolute top-[22px] left-1/2 -ml-[80px] size-40 overflow-hidden rounded-radio-l shadow-[0_6px_16px_rgba(16,54,42,0.18)]">
            {imagen("h-full w-full object-cover", { filter: "brightness(1.12) saturate(1.08) contrast(1.02)" })}
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.35),rgba(255,255,255,0)_55%)]" />
          </div>
        </div>
      </div>
      <div className="bv-luz absolute top-0 bottom-0 left-0 w-9 bg-[rgba(255,249,238,0.7)]" aria-hidden="true" />

      {/* Sus fotos de referencia: llegan y se funden en la foto */}
      {referencias.length > 0 && (
        <>
          <div className="bv-tumarca absolute top-3 right-3.5 flex h-[22px] items-center rounded-full bg-fondo px-2 text-contador font-extrabold tracking-wide text-texto" aria-hidden="true">
            TU MARCA
          </div>
          <div className="absolute top-[42px] right-3.5 flex flex-col gap-1.5" aria-hidden="true">
            {referencias.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- referencia de la tienda (URL firmada o data URL)
              <img key={i} src={url} alt="" className={`bv-ref bv-ref${i + 1} size-11 rounded-[10px] border-2 border-fondo object-cover`} />
            ))}
          </div>
        </>
      )}

      <div className="bv-chispa absolute top-3 right-3.5 grid size-9 place-items-center rounded-full bg-resalte" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-sobre-resalte">
          <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
        </svg>
      </div>
      <div className="bv-mano absolute bottom-2.5 left-4 font-mano text-mano text-atencion-texto" aria-hidden="true">
        a tu estilo
      </div>
    </div>
  );
}
