"use client";

import { useId, useRef } from "react";
import { INSTAGRAM_DESLIZAPP } from "@/lib/config";
import { nuevoId } from "@/lib/data/db";
import { reducirFoto } from "@/lib/imagen";
import {
  EVITA_MAX,
  instagramLimpio,
  marcaLista,
  PALABRA_MAX,
  PALABRAS_MARCA,
  REFERENCIAS_MAX,
  textoFalta,
  TEXTO_MARCA_LISTA,
  type MarcaRetoque,
} from "@/lib/marca-retoque";
import { IconoCheck, IconoCerrar, IconoMas } from "../iconos";
import { Aviso, Boton, Campo, CampoMultilinea } from "../ui";

/** Lo que la persona va escribiendo en «Para el retoque» (se guarda con el botón de la hoja). */
export type BorradorRetoque = {
  instagram: string;
  palabras: string[];
  evita: string;
  /** Ids de referencias ya guardadas que se quitan al guardar. */
  quitar: string[];
  /** Fotos nuevas, todavía sin guardar. */
  nuevas: { id: string; url: string }[];
};

export const borradorDeMarca = (m: MarcaRetoque): BorradorRetoque => ({
  instagram: m.instagram ?? "",
  palabras: Array.from({ length: PALABRAS_MARCA }, (_, i) => m.palabras[i] ?? ""),
  evita: m.evita ?? "",
  quitar: [],
  nuevas: [],
});

/** ¿Cambió algo respecto a lo guardado? */
export const borradorCambio = (b: BorradorRetoque, m: MarcaRetoque): boolean =>
  JSON.stringify({ ...b, instagram: b.instagram.trim().replace(/^@/, ""), palabras: b.palabras.map((p) => p.trim()), evita: b.evita.trim() }) !==
  JSON.stringify({ ...borradorDeMarca(m), instagram: m.instagram ?? "" });

/** La marca tal como quedaría con el borrador: de ahí salen el aviso de estado y la regla «marca lista» en vivo. */
export function marcaConBorrador(m: MarcaRetoque, b: BorradorRetoque): Pick<MarcaRetoque, "palabras" | "referencias"> {
  return {
    palabras: b.palabras,
    referencias: [...m.referencias.filter((r) => !b.quitar.includes(r.id)), ...b.nuevas.map((n, i) => ({ id: n.id, url: n.url, orden: 1000 + i }))],
  };
}

/**
 * «Para el retoque» (tableros MiMarca y MiMarcaVacia): Instagram, tu marca en 3 palabras, las fotos de referencia (3 a 6) y lo
 * que no quieres. Con Ver como (`soloLectura`) se ve y no se edita.
 */
export function SeccionRetoque({
  marca,
  borrador,
  alCambiar,
  soloLectura,
  tieneLogo,
  alAvisar,
  errorInstagram,
}: {
  marca: MarcaRetoque;
  borrador: BorradorRetoque;
  alCambiar: (b: BorradorRetoque) => void;
  soloLectura: boolean;
  tieneLogo: boolean;
  alAvisar: (mensaje: string) => void;
  errorInstagram: boolean;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const idIg = useId();
  const visibles = [
    ...marca.referencias.filter((r) => !borrador.quitar.includes(r.id)).map((r) => ({ id: r.id, url: r.url, nueva: false })),
    ...borrador.nuevas.map((n) => ({ id: n.id, url: n.url, nueva: true })),
  ];
  const vista = marcaConBorrador(marca, borrador);
  const lista = marcaLista(vista);
  const falta = textoFalta(vista);
  const quedan = REFERENCIAS_MAX - visibles.length;
  const sinMarca = !tieneLogo && visibles.length === 0;

  const agregar = async (archivos: FileList | null) => {
    if (!archivos) return;
    const elegidas = [...archivos].slice(0, Math.max(0, quedan));
    if (archivos.length > elegidas.length) alAvisar(`Hasta ${REFERENCIAS_MAX} fotos de referencia.`);
    const nuevas: { id: string; url: string }[] = [];
    for (const f of elegidas) {
      try {
        nuevas.push({ id: nuevoId(), url: await reducirFoto(f) });
      } catch {
        alAvisar("Esa foto no quiso cargar. Prueba con otra.");
      }
    }
    if (nuevas.length) alCambiar({ ...borrador, nuevas: [...borrador.nuevas, ...nuevas] });
  };

  const quitar = (f: { id: string; nueva: boolean }) =>
    alCambiar(f.nueva ? { ...borrador, nuevas: borrador.nuevas.filter((n) => n.id !== f.id) } : { ...borrador, quitar: [...borrador.quitar, f.id] });

  // «Hablemos» lleva al Instagram de Deslizapp (todavía no hay WhatsApp de Deslizapp).
  const hablemos = `https://instagram.com/${INSTAGRAM_DESLIZAPP}`;

  return (
    <section aria-label="Para el retoque" className="flex flex-col gap-4 border-t border-linea pt-5" data-seccion-retoque="">
      <div>
        <h3 className="font-display text-titulo-seccion text-texto">Para el retoque</h3>
        <p className="text-secundario text-texto-secundario">Con esto el taller retoca tus fotos a tu estilo.</p>
      </div>

      <div role="status" data-estado-marca={lista ? "lista" : "falta"}>
        {lista ? (
          <Aviso tono="exito" icono={<IconoCheck tamano={20} className="text-exito-texto" />}>
            <span className="font-extrabold">{TEXTO_MARCA_LISTA}</span>
          </Aviso>
        ) : (
          <Aviso tono="atencion">
            <span className="font-extrabold text-atencion-texto">
              {soloLectura ? "Esta marca todavía no está lista para el taller." : `Para retocar tus fotos necesitamos conocer tu marca. ${falta}.`}
            </span>
          </Aviso>
        )}
      </div>

      <fieldset disabled={soloLectura} className="flex min-w-0 flex-col gap-5 border-0 p-0">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={idIg} className="text-secundario font-extrabold text-texto">
            Instagram <span className="font-semibold text-texto-secundario">(opcional)</span>
          </label>
          <div
            className={`flex h-(--alto-campo) min-w-0 items-center rounded-radio-m border-2 bg-superficie px-3.5 focus-within:border-accion ${errorInstagram ? "border-peligro" : "border-borde-campo"}`}
          >
            <span aria-hidden="true" className="pr-0.5 text-cuerpo text-texto-secundario">
              @
            </span>
            <input
              id={idIg}
              value={borrador.instagram}
              onChange={(e) => alCambiar({ ...borrador, instagram: e.target.value.replace(/^@+/, "") })}
              placeholder="tutienda"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              aria-invalid={errorInstagram || undefined}
              className="h-full min-w-0 flex-1 bg-transparent text-cuerpo text-texto outline-none placeholder:text-texto-secundario"
            />
          </div>
          {errorInstagram && <p className="text-secundario font-bold text-peligro">Ese Instagram no se ve bien. Solo letras, números, punto y guion bajo.</p>}
        </div>

        <div>
          <p className="mb-2 text-secundario font-extrabold text-texto">Tu marca en 3 palabras</p>
          <div className="grid grid-cols-3 gap-2">
            {borrador.palabras.map((p, i) => (
              <Campo
                key={i}
                etiqueta={<span className="sr-only">{`Palabra ${i + 1}`}</span>}
                value={p}
                placeholder={`palabra ${i + 1}`}
                maxLength={PALABRA_MAX}
                autoCapitalize="none"
                autoComplete="off"
                onChange={(e) => alCambiar({ ...borrador, palabras: borrador.palabras.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-secundario font-extrabold text-texto">Así quiero que se vean mis fotos</p>
          <p className="mb-2 text-secundario text-texto-secundario">
            Tus mejores fotos de Instagram, o fotos de otra marca que te gusten. El taller las usa de guía. De 3 a {REFERENCIAS_MAX}.
          </p>
          <ul className="grid grid-cols-3 gap-2" aria-label="Fotos de referencia">
            {visibles.map((f, i) => (
              <li key={f.id} className="relative aspect-square overflow-hidden rounded-radio-m bg-superficie-hundida">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada o data URL: no hay nada que optimizar */}
                <img src={f.url} alt={`Referencia ${i + 1}`} className="h-full w-full object-cover" />
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => quitar(f)}
                    aria-label={`Quitar referencia ${i + 1}`}
                    className="tocable absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-fondo/90 text-texto"
                  >
                    <IconoCerrar tamano={14} />
                  </button>
                )}
              </li>
            ))}
            {!soloLectura && quedan > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => entrada.current?.click()}
                  className="tocable flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-radio-m border-2 border-dashed border-borde-campo text-secundario font-extrabold text-texto-secundario"
                >
                  <IconoMas tamano={22} />
                  Añadir
                </button>
              </li>
            )}
          </ul>
          <input ref={entrada} type="file" accept="image/*" multiple hidden aria-label="Añadir fotos de referencia" onChange={(e) => { void agregar(e.target.files); e.target.value = ""; }} />
        </div>

        <CampoMultilinea
          etiqueta={
            <>
              Lo que no quiero <span className="font-semibold text-texto-secundario">(opcional)</span>
            </>
          }
          value={borrador.evita}
          filas={2}
          maxLength={EVITA_MAX}
          placeholder="Ej: nada de fondo blanco ni brillos exagerados"
          onChange={(e) => alCambiar({ ...borrador, evita: e.target.value })}
        />
      </fieldset>

      {sinMarca && (
        <div className="flex flex-col gap-2 rounded-radio-l border-2 border-accion bg-superficie p-4" data-tarjeta-sin-marca="">
          <h4 className="font-display text-titulo-seccion text-texto">¿Todavía no tienes marca?</h4>
          <p className="text-cuerpo text-texto-secundario">
            Te la hacemos. Buscamos lo que tu tienda quiere decir y lo convertimos en logo, colores y estilo, como hicimos con Deslizapp.
          </p>
          <div className="flex justify-end">
            <Boton href={hablemos} target="_blank" rel="noreferrer" tamano="compacto" jerarquia="resalte">
              Hablemos
            </Boton>
          </div>
        </div>
      )}
    </section>
  );
}

export { instagramLimpio };
