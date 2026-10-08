"use client";

import { useRef, useState } from "react";
import { formatearPesos } from "@/lib/formato";
import { claveVariante, colorDe, cuantasUsan, ejeDeFoto, TEXTO_CON_PEDIDOS, textoCombinacion, textoPresentaciones, type Presentacion } from "@/lib/presentaciones";
import { colorPorNombre } from "@/lib/colores";
import type { OpcionProducto } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { Alerta, Boton, CampoMonto, Cantidad, GrupoOpciones, ListaAgrupada, Tarjeta } from "../ui";

export type FotoBorrador = { id: string; url: string };

/** La hoja de UNA presentación (tablero «Hoja»): stock, precio (el mismo o uno propio), foto del color, ocultar y quitar. */
export function HojaPresentacion({
  abierta,
  presentacion,
  opciones,
  precioProducto,
  fotos,
  fotosColor,
  alCerrar,
  alCambiar,
  alCompletar,
  alElegirFoto,
  alQuitar,
}: {
  abierta: boolean;
  presentacion: Presentacion | null;
  opciones: OpcionProducto[];
  precioProducto: number;
  fotos: FotoBorrador[];
  fotosColor: Record<string, string>;
  alCerrar: () => void;
  alCambiar: (cambio: Partial<Presentacion>) => void;
  alCompletar: (valores: Record<string, string>) => void;
  alElegirFoto: (valor: string, id: string | null) => void;
  alQuitar: () => Promise<{ con: boolean; hacer: () => void } | null>;
}) {
  // Se recuerda la última presentación para que la hoja no se vacíe mientras sale.
  const [ultima, setUltima] = useState<Presentacion | null>(null);
  if (presentacion && presentacion !== ultima) setUltima(presentacion);
  const p = presentacion ?? ultima;
  const [propio, setPropio] = useState(false);
  const [textoPrecio, setTextoPrecio] = useState("");
  const [eligiendoFoto, setEligiendoFoto] = useState(false);
  const [quitando, setQuitando] = useState<{ con: boolean; hacer: () => void } | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const clave = p ? claveVariante(p.valores) : "";
  const [claveAntes, setClaveAntes] = useState("");
  const [abiertaAntes, setAbiertaAntes] = useState(false);
  if (p && (clave !== claveAntes || abierta !== abiertaAntes)) {
    setClaveAntes(clave);
    setAbiertaAntes(abierta);
    if (abierta) {
      setPropio(p.precio !== null);
      setTextoPrecio(p.precio !== null ? String(p.precio) : "");
      setEligiendoFoto(false);
    }
  }
  if (!p) return <Hoja abierta={false} alCerrar={alCerrar} titulo="Presentación" altura="auto">{null}</Hoja>;
  const texto = textoCombinacion(opciones, p.valores);
  const color = colorDe(opciones, p.valores);
  const eje = ejeDeFoto(opciones);
  const valorFoto = eje ? p.valores[eje.nombre] : null;
  const idFoto = valorFoto ? fotosColor[valorFoto] : undefined;
  const foto = idFoto ? fotos.find((f) => f.id === idFoto) ?? null : null;
  const usan = eje && valorFoto ? cuantasUsan([p], eje.nombre, valorFoto) : 0;
  void usan;
  const conSin = opciones.some((o) => /^sin /i.test(p.valores[o.nombre] ?? ""));
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={<span className="flex items-center gap-2.5">{color && <span aria-hidden="true" className="size-6 rounded-full border border-linea" style={{ background: color }} />}{texto}</span>} altura="auto">
      <div className="flex flex-col gap-4" data-hoja-presentacion="">
        <Tarjeta className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-destacado text-texto">Stock</p>
            <p className="text-secundario text-texto-secundario">Al despachar, baja solito.</p>
          </div>
          <Cantidad valor={p.stock ?? 0} max={2147483647} alCambiar={(v) => alCambiar({ stock: v })} etiquetaQuitar={`Quitar uno de ${texto}`} etiquetaAgregar={`Agregar uno de ${texto}`} />
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-destacado text-texto">Precio</p>
            <p className="text-secundario text-texto-secundario">El del producto: {formatearPesos(precioProducto)}</p>
          </div>
          <GrupoOpciones
            etiqueta="Precio de esta presentación"
            compacta
            valor={propio ? "propio" : "mismo"}
            alCambiar={(v) => {
              setPropio(v === "propio");
              if (v === "mismo") {
                setTextoPrecio("");
                alCambiar({ precio: null });
              }
            }}
            opciones={[{ id: "mismo", texto: "El mismo" }, { id: "propio", texto: "Uno propio" }]}
          />
          {propio && (
            <CampoMonto
              etiqueta="Precio de esta presentación"
              etiquetaAccesible="Precio de esta presentación, en pesos"
              valor={textoPrecio}
              maxDigitos={7}
              alCambiar={(d) => {
                const limpio = d.replace(/\D/g, "").slice(0, 7);
                setTextoPrecio(limpio);
                alCambiar({ precio: limpio ? Number(limpio) : null });
              }}
            />
          )}
        </Tarjeta>

        {conSin && (
          <Tarjeta className="flex flex-col gap-3 p-4">
            <p className="text-destacado text-texto">¿Cuál es?</p>
            {opciones.map((o) => (
              <GrupoOpciones
                key={o.nombre}
                titulo={o.nombre}
                compacta
                valor={p.valores[o.nombre] ?? null}
                alCambiar={(v) => alCompletar({ ...p.valores, [o.nombre]: v })}
                opciones={o.valores.map((v) => ({ id: v, texto: v }))}
              />
            ))}
          </Tarjeta>
        )}

        {eje && valorFoto && (
          <Tarjeta className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="relative block size-14 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida">
                {foto ? <Foto src={foto.url} alt="" className="size-full" sizes="56px" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-destacado text-texto">Foto</p>
                <p className="text-secundario text-texto-secundario">
                  {foto ? `La del ${eje.nombre.toLocaleLowerCase("es")} ${valorFoto}. Sirve para todas las ${valorFoto.toLocaleLowerCase("es")}.` : "Sin foto: se ve la del producto."}
                </p>
              </div>
              <Boton jerarquia="terciario" tamano="compacto" onClick={() => setEligiendoFoto((v) => !v)}>
                {foto ? "Cambiar" : "Elegir"}
              </Boton>
            </div>
            {eligiendoFoto && (
              <SelectorFotos
                fotos={fotos}
                elegida={idFoto ?? null}
                usadas={fotosColor}
                alElegir={(id) => {
                  alElegirFoto(valorFoto, id);
                  setEligiendoFoto(false);
                }}
                alQuitar={foto ? () => { alElegirFoto(valorFoto, null); setEligiendoFoto(false); } : undefined}
              />
            )}
          </Tarjeta>
        )}

        <Boton tamano="grande" anchoCompleto onClick={alCerrar}>Listo</Boton>
        <div className="flex items-center justify-between gap-3">
          <Boton jerarquia="terciario" onClick={() => alCambiar({ activa: !p.activa })}>
            {p.activa ? "Ocultar esta presentación" : "Mostrar de nuevo"}
          </Boton>
          <Boton
            jerarquia="terciario"
            tono="peligro"
            cargando={comprobando}
            onClick={async () => {
              setComprobando(true);
              const r = await alQuitar();
              setComprobando(false);
              if (r) setQuitando(r);
            }}
          >
            Quitar
          </Boton>
        </div>
      </div>
      <Alerta
        abierta={quitando !== null}
        titulo={quitando?.con ? `Quitar ${texto}` : `¿Quitar ${texto}?`}
        descripcion={quitando?.con ? TEXTO_CON_PEDIDOS : "Se va con su stock al guardar el producto."}
        alCancelar={() => setQuitando(null)}
        accion={{ texto: quitando?.con ? `Ocultar ${texto}` : "Quitar", tono: quitando?.con ? "accion" : "peligro", alConfirmar: () => { const q = quitando!; setQuitando(null); q.hacer(); } }}
      />
    </Hoja>
  );
}

/** Las fotos del producto para elegir una: cuadros con su número y, si otro valor ya la usa, cuál. */
function SelectorFotos({
  fotos,
  elegida,
  usadas,
  alElegir,
  alQuitar,
  alSubir,
}: {
  fotos: FotoBorrador[];
  elegida: string | null;
  usadas: Record<string, string>;
  alElegir: (id: string) => void;
  alQuitar?: () => void;
  alSubir?: (archivo: File) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const valorDe = (id: string) => Object.entries(usadas).find(([, f]) => f === id)?.[0];
  if (fotos.length === 0 && !alSubir) return <p className="text-secundario text-texto-secundario">Primero sube una foto del producto.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Fotos del producto" className="grid grid-cols-4 gap-2">
        {fotos.map((f, i) => {
          const es = f.id === elegida;
          const otro = valorDe(f.id);
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={es}
              aria-label={`Foto ${i + 1}${otro ? `, de ${otro}` : ""}${es ? ", elegida" : ""}`}
              onClick={() => alElegir(f.id)}
              className={`tocable relative aspect-[4/5] overflow-hidden rounded-radio-m bg-superficie-hundida ${es ? "ring-3 ring-accion" : ""}`}
            >
              <Foto src={f.url} alt="" className="size-full" sizes="25vw" />
              <span className="absolute bottom-1 left-1 rounded-full bg-superficie px-1.5 text-etiqueta text-texto">
                {i + 1}{otro ? ` · ${otro}` : ""}{es ? " ✓" : ""}
              </span>
            </button>
          );
        })}
        {alSubir && (
          <button type="button" onClick={() => entrada.current?.click()} className="tocable grid aspect-[4/5] place-items-center rounded-radio-m border-2 border-dashed border-borde-pastilla text-secundario font-extrabold text-texto-secundario">
            + Subir otra
          </button>
        )}
      </div>
      {alSubir && (
        <input ref={entrada} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; if (a) alSubir(a); }} />
      )}
      {alQuitar && (
        <Boton jerarquia="terciario" tamano="compacto" tono="peligro" onClick={alQuitar} className="self-start">
          Quitar la foto de este color
        </Boton>
      )}
    </div>
  );
}

/** «Foto de cada color» (tablero «Foto»): una fila por valor del eje, su foto actual y el selector de las fotos del producto. */
export function HojaFotoColor({
  abierta,
  eje,
  pres,
  fotos,
  fotosColor,
  agregarFoto,
  alCerrar,
  alElegir,
}: {
  abierta: boolean;
  eje: OpcionProducto | null;
  pres: Presentacion[];
  fotos: FotoBorrador[];
  fotosColor: Record<string, string>;
  agregarFoto: (archivo: File) => Promise<string | null>;
  alCerrar: () => void;
  alElegir: (valor: string, id: string | null) => void;
}) {
  const [valor, setValor] = useState<string | null>(null);
  const [abiertaAntes, setAbiertaAntes] = useState(abierta);
  if (abierta !== abiertaAntes) {
    setAbiertaAntes(abierta);
    if (abierta) setValor(null);
  }
  if (!eje) return <Hoja abierta={false} alCerrar={alCerrar} titulo="Foto" altura="auto">{null}</Hoja>;
  const esColor = /^colou?r(es)?$/i.test(eje.nombre);
  const nombre = eje.nombre.toLocaleLowerCase("es");
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={esColor ? "Foto de cada color" : `Foto de cada ${nombre}`} altura="auto">
      <div className="flex flex-col gap-4" data-hoja-foto-color="">
        <p className="text-secundario text-texto-secundario">
          Así ve tu cliente el producto del {esColor ? "color" : nombre} que elige. Una foto por {nombre}, no por combinación.
        </p>
        <ListaAgrupada etiqueta={`Foto de cada ${nombre}`}>
          {eje.valores.map((v) => {
            const f = fotos.find((x) => x.id === fotosColor[v]) ?? null;
            const n = fotos.findIndex((x) => x.id === fotosColor[v]) + 1;
            const c = esColor ? colorPorNombre(v) : null;
            const usan = cuantasUsan(pres, eje.nombre, v);
            return (
              <li key={v} className="flex min-h-18 items-center gap-3 border-t border-linea px-4 py-2 first:border-t-0">
                <span aria-hidden="true" className="relative block size-12 shrink-0 overflow-hidden rounded-radio-s border border-dashed border-borde-pastilla bg-superficie-hundida">
                  {f && <Foto src={f.url} alt="" className="size-full" sizes="48px" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-destacado text-texto">
                    {c && <span aria-hidden="true" className="size-3.5 rounded-full border border-linea" style={{ background: c }} />}
                    {v}
                  </span>
                  <span className={f ? "text-secundario text-texto-secundario" : "text-secundario font-extrabold text-atencion-texto"}>
                    {f ? `Foto ${n} · ${textoPresentaciones(usan)}` : "Sin foto: se ve la del producto"}
                  </span>
                </span>
                <Boton jerarquia="terciario" tamano="compacto" onClick={() => setValor(valor === v ? null : v)}>
                  {f ? "Cambiar" : "Elegir"}
                </Boton>
              </li>
            );
          })}
        </ListaAgrupada>
        {valor && (
          <div className="flex flex-col gap-2">
            <p className="font-display text-titulo-hoja text-texto">Elegir foto para {valor}</p>
            <SelectorFotos
              fotos={fotos}
              elegida={fotosColor[valor] ?? null}
              usadas={Object.fromEntries(Object.entries(fotosColor).filter(([v]) => v !== valor))}
              alElegir={(id) => {
                alElegir(valor, id);
                setValor(null);
              }}
              alQuitar={fotosColor[valor] ? () => { alElegir(valor, null); setValor(null); } : undefined}
              alSubir={async (archivo) => {
                const id = await agregarFoto(archivo);
                if (id) {
                  alElegir(valor, id);
                  setValor(null);
                }
              }}
            />
            <p className="text-secundario text-texto-secundario">Escoges entre las fotos que ya subiste al producto. ¿Falta una? Súbela aquí mismo.</p>
          </div>
        )}
        <Boton tamano="grande" anchoCompleto onClick={alCerrar}>Listo</Boton>
      </div>
    </Hoja>
  );
}
