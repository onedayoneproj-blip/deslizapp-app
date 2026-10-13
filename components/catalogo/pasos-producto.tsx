"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { colorPorNombre, esEjeColor } from "@/lib/colores";
import {
  agregarValor,
  atajosDe,
  COSAS_QUE_CAMBIAN,
  errorDeNombrePropio,
  LARGO_VALOR,
  listaDeCosas,
  MAX_EJES,
  MAX_VALORES,
  otroDe,
  valoresSugeridos,
  valoresVisibles,
} from "@/lib/presentaciones";
import { formatearPesos } from "@/lib/formato";
import { SIN_FOTO } from "@/lib/historia-producto";
import { OPCIONES_TIPICAS, type Rubro } from "@/lib/rubros";
import type { OpcionProducto } from "@/lib/types";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { IconoCamara } from "../iconos";
import { MENSAJE_VISTA_PREVIA, type DatosVistaPrevia } from "../tienda/vista-previa-reel";
import { Boton, Campo, Cantidad, Chip, Eleccion, FilaInterruptor } from "../ui";
import { clases, FOCO } from "../ui/comunes";
import { BotonAtras } from "./boton-atras-historia";
import { SelectorFotos, type FotoBorrador } from "./hoja-presentacion";
import { CuandoLlega } from "./inventario-historia";
import { mediosParaGuardar, SeccionMedios, type MedioBorrador } from "./ficha-medios";
import type { Taller } from "./taller";

/**
 * Los pasos de la historia de producto como piezas con props, sin estado propio de la historia: los usa crear (`historia-producto.tsx`)
 * y los usará la hoja resumen de editar. Cada paso es solo su contenido; el pie y la navegación los pone quien lo compone.
 */

/**
 * La tarjeta «así se verá» de las preguntas, como el lienzo: 372 px de alto, de margen a margen, la misma y en el mismo lugar en
 * los tres pasos (no se encoge con el teclado ni con la pantalla: lo demás se desplaza). La portada la cubre (`cover`); encima, el
 * velo del catálogo con el nombre, el precio y «Llega en …» a medida que se responden (nada antes de tiempo).
 */
export function TarjetaAsiSeVera({ portada, nombre, precio, llega }: { portada: string | null; nombre: string; precio: string | null; llega: string | null }) {
  const n = nombre.trim();
  return (
    <div
      className="relative h-[372px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida"
      data-tarjeta-asi-se-vera="" aria-label={`Así se verá: ${n || "sin nombre"}${precio ? `, ${precio}` : ""}${llega ? `, ${llega}` : ""}`} role="img"
    >
      {portada ? (
        <>
          <Foto src={portada} alt="" className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" />
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 bottom-0 bg-linear-to-t from-velo to-transparent" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-texto-secundario">
          <IconoCamara tamano={44} strokeWidth={1.8} />
          <span className="text-secundario font-bold">Sin foto</span>
        </div>
      )}
      <span aria-hidden="true" className={clases("absolute top-2.5 left-3.5 font-mano text-mano", portada ? "text-papel [text-shadow:0_1px_4px_rgb(0_0_0/0.35)]" : "text-texto-secundario")}>así se verá</span>
      {(n || precio) && (
        <div aria-hidden="true" className={clases("absolute inset-x-4 bottom-3.5", portada ? "text-papel" : "text-texto")}>
          {n && <p className="line-clamp-2 font-display text-titulo-hoja break-words">{n}</p>}
          {precio && <p className="mt-0.5 text-cuerpo font-extrabold tabular-nums" data-precio-tarjeta="">{precio}</p>}
          {llega && <p className="mt-0.5 text-secundario font-bold opacity-90" data-llega-tarjeta="">{llega}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * El marco de la foto (paso 1), como el lienzo: sin fotos, el hueco punteado «Toca para agregar fotos», que es un botón y abre el
 * selector nativo del teléfono (Fototeca / Tomar foto / Elegir archivo); con fotos, la portada en grande y «1/N» (tocarla no abre nada).
 */
export function MarcoFoto({ portada, total }: { portada: string | null; total: number }) {
  const caja = "relative h-[372px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida";
  if (portada) {
    return (
      <div className={caja} data-marco-foto="">
        <Foto src={portada} alt="Portada del producto" className="absolute inset-0" sizes="(max-width: 480px) 100vw, 440px" />
        <span aria-hidden="true" className="absolute top-3 right-3 inline-flex h-[26px] items-center rounded-full bg-velo px-2.5 text-[0.8125rem] font-extrabold text-papel tabular-nums">1/{total}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label="Agregar fotos"
      // El selector vive en la sección de fotos del mismo paso (hermana de este botón): sin `capture`, para que el teléfono ofrezca su menú.
      onClick={(e) => e.currentTarget.parentElement?.querySelector<HTMLInputElement>("[data-entrada-medios]")?.click()}
      className={clases(caja, "tocable block outline-none focus-visible:outline-3 focus-visible:outline-foco")}
      data-marco-foto=""
      data-marco-vacio=""
    >
      <span aria-hidden="true" className="absolute inset-3.5 flex flex-col items-center justify-center gap-2 rounded-radio-m border-2 border-dashed border-borde-campo text-texto-secundario">
        <IconoCamara tamano={44} strokeWidth={1.8} />
        <span className="text-secundario font-bold">Toca para agregar fotos</span>
      </span>
    </button>
  );
}

export type EjeHistoria = { nombre: string; valores: string[]; propia: boolean };

/**
 * La tarjeta «así se verá» de las pantallas de presentaciones (prototipo v4, b11–b14): 350×212, la foto en `cover`, el nombre, «Desde
 * RD$…» y, a medida que se eligen, la píldora de la otra cosa («Talla S · M · L») y los puntos de color.
 */
export function TarjetaPresentaciones({ portada, nombre, precio, opciones }: { portada: string | null; nombre: string; precio: string | null; opciones: OpcionProducto[] }) {
  const n = nombre.trim();
  const otra = opciones.find((o) => !esEjeColor(o.nombre));
  const color = opciones.find((o) => esEjeColor(o.nombre));
  return (
    <div className="relative h-[212px] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-tarjeta-presentaciones="" role="img"
      aria-label={`Así se verá: ${[n || "sin nombre", precio, otra ? `${otra.nombre} ${otra.valores.join(", ")}` : null, color ? `${color.valores.join(", ")}` : null].filter(Boolean).join(", ")}`}
    >
      {portada ? (
        <>
          <Foto src={portada} alt="" className="absolute inset-0 [&_img]:object-[50%_30%]" sizes="(max-width: 480px) 100vw, 440px" />
          <div aria-hidden="true" className="absolute inset-x-0 top-[40%] bottom-0 bg-linear-to-t from-velo to-transparent" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center text-texto-secundario"><IconoCamara tamano={36} strokeWidth={1.8} /></div>
      )}
      <span aria-hidden="true" className={clases("absolute top-2 left-3.5 font-mano text-mano", portada ? "text-papel [text-shadow:0_1px_4px_rgb(0_0_0/0.35)]" : "text-texto-secundario")}>así se verá</span>
      <div aria-hidden="true" className={clases("absolute inset-x-3.5 bottom-3", portada ? "text-papel" : "text-texto")}>
        {n && <p className="truncate font-display text-[1.375rem] leading-tight">{n}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
          {precio && <span className="text-cuerpo font-extrabold tabular-nums" data-precio-tarjeta="">{precio}</span>}
          {otra && otra.valores.length > 0 && (
            <span className="inline-flex h-[22px] items-center rounded-full bg-white/20 px-2 text-etiqueta" data-pildora-eje="">{otra.nombre} {otra.valores.join(" · ")}</span>
          )}
          {color && color.valores.length > 0 && (
            <span className="inline-flex items-center gap-1" data-puntos-color="">
              {color.valores.slice(0, 6).map((v) => (
                <span key={v} className="size-[18px] rounded-full border-[1.5px] border-white/70" style={{ background: colorPorNombre(v) ?? undefined }} />
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** «¿En qué cambia?» (b11): lo típico del catálogo y otras cosas, hasta 2, y «+ Otra» para una propia. */
export function QueCambia({ rubro, ejes, alCambiar, avisar, empezarEnOtra = false, alUsarOtra }: { rubro: Rubro; ejes: EjeHistoria[]; alCambiar: (e: EjeHistoria[]) => void; avisar: (m: string) => void; empezarEnOtra?: boolean; alUsarOtra?: () => void }) {
  const { tipicas, otras } = listaDeCosas(OPCIONES_TIPICAS[rubro]);
  const lista = [...new Set([...[...tipicas, ...otras].slice(0, 4), ...ejes.map((e) => e.nombre)])];
  const [otra, setOtra] = useState<string | null>(empezarEnOtra ? "" : null);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  // «Otra» de la pregunta del precio vale para ESTA apertura: se consume al montar (si no, volver desde los valores reabriría el campo).
  useEffect(() => {
    if (empezarEnOtra) alUsarOtra?.();
  }, [empezarEnOtra, alUsarOtra]);
  const llenos = ejes.length >= MAX_EJES;
  // Con 2 elegidas las demás se ven igual (como el lienzo); tocarlas explica el máximo.
  const lleno = () => avisar(`Ya elegiste ${MAX_EJES}: quita una para elegir otra.`);
  const alternar = (nombre: string) => {
    if (ejes.some((e) => e.nombre === nombre)) return alCambiar(ejes.filter((e) => e.nombre !== nombre));
    if (llenos) return lleno();
    alCambiar([...ejes, { nombre, valores: [], propia: !COSAS_QUE_CAMBIAN.some((c) => c === nombre) }]);
  };
  const listoOtra = () => {
    if (llenos) return lleno();
    const e = errorDeNombrePropio(otra ?? "", ejes.map((x) => x.nombre), [...tipicas, ...otras]);
    if (e) return setError(e);
    alCambiar([...ejes, { nombre: (otra ?? "").trim(), valores: [], propia: true }]);
    setOtra(null);
    setError(null);
  };
  return (
    <div ref={caja} className="mt-3.5" data-que-cambia="">
      <div role="group" aria-label="Lo que cambia" className="flex flex-wrap gap-2">
        {lista.map((nombre) => {
          const elegida = ejes.some((e) => e.nombre === nombre);
          return <Eleccion key={nombre} casilla elegida={elegida} onClick={() => alternar(nombre)}>{nombre}</Eleccion>;
        })}
        {otra === null && (
          <Eleccion
            accion elegida={false}
            onClick={() => {
              if (llenos) return lleno();
              flushSync(() => setOtra(""));
              caja.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            + Otra
          </Eleccion>
        )}
      </div>
      {otra !== null && (
        <div className="mt-3 flex items-start gap-2">
          <Campo
            className="flex-1" etiqueta="¿Qué otra cosa cambia?" placeholder="Por ejemplo: Aroma" maxLength={LARGO_VALOR} value={otra} error={error} data-campo-paso=""
            enterKeyHint="done" onChange={(e) => { setOtra(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); listoOtra(); } }}
          />
          <Boton tamano="compacto" className="mt-7" deshabilitado={!otra.trim()} onClick={listoOtra}>Listo</Boton>
        </div>
      )}
      <p className="mx-0.5 mt-2.5 text-[0.8125rem] text-texto-secundario">Hasta {MAX_EJES}. Para la mayoría basta con talla y color.</p>
    </div>
  );
}

/** Los valores de una cosa (b12, b13): los sugeridos y los propios para tocar, «+ Otra» para escribir uno y los atajos («XS a XL»). */
export function ValoresDeEje({ eje, rubro, alAlternar, alPoner }: { eje: EjeHistoria; rubro: Rubro; alAlternar: (v: string) => void; alPoner: (v: string[]) => void }) {
  const sugeridos = eje.propia ? [] : valoresSugeridos(eje.nombre, rubro);
  const atajos = atajosDe(eje.nombre, rubro).filter((a) => a.texto !== "30 · 50 · 100 ml" || rubro === "perfumes").filter((a) => a.texto !== "36 a 42");
  const color = esEjeColor(eje.nombre);
  const [otro, setOtro] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const agregar = () => {
    // Solo suma: escribir uno que ya está («Negro», «negro ») no lo quita.
    if (otro?.trim()) {
      const valores = agregarValor(eje.valores, otro);
      if (valores !== eje.valores) alPoner(valores);
    }
    setOtro(null);
  };
  return (
    <div ref={caja} className="mt-3.5" data-valores-eje={eje.nombre}>
      <div role="group" aria-label={eje.nombre} className="flex flex-wrap gap-2">
        {valoresVisibles(sugeridos, eje.valores).map((v) => {
          const elegida = eje.valores.includes(v);
          const c = color ? colorPorNombre(v) : null;
          return (
            <Eleccion key={v} casilla elegida={elegida} deshabilitada={!elegida && eje.valores.length >= MAX_VALORES} onClick={() => alAlternar(v)}>
              {c && <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-[1.5px] border-borde-pastilla" style={{ background: c }} />}
              {v}
            </Eleccion>
          );
        })}
        {otro === null ? (
          <Eleccion
            accion elegida={false} deshabilitada={eje.valores.length >= MAX_VALORES}
            onClick={() => {
              flushSync(() => setOtro(""));
              caja.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            + {otroDe(eje.nombre).split(" ")[0]}
          </Eleccion>
        ) : (
          <input
            type="text" enterKeyHint="done" autoComplete="off" aria-label={otroDe(eje.nombre)} placeholder="Escríbelo y toca Enter" maxLength={LARGO_VALOR}
            value={otro} onChange={(e) => setOtro(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); agregar(); }
              else if (e.key === "Escape") setOtro(null);
            }}
            onBlur={agregar}
            className="h-(--alto-control) w-52 min-w-0 rounded-full border-2 border-accion bg-superficie px-4 text-cuerpo text-texto outline-none placeholder:text-texto-secundario"
          />
        )}
      </div>
      {atajos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2" data-atajos="">
          {atajos.map((a) => <Boton key={a.texto} jerarquia="secundario" tamano="compacto" onClick={() => alPoner(a.valores)}>{a.texto}</Boton>)}
        </div>
      )}
    </div>
  );
}

/** «Foto de cada color · opcional» (b13): una tarjeta punteada por color elegido; sin fotos subidas, apagadas con una pista. */
export function FotoDeCadaColor({ valores, fotos, fotosColor, alAbrir }: { valores: string[]; fotos: FotoBorrador[]; fotosColor: Record<string, string>; alAbrir: (valor: string) => void }) {
  const sinFotos = fotos.length === 0;
  return (
    <section aria-labelledby="titulo-foto-color" className="mt-3.5" data-foto-cada-color="">
      <p id="titulo-foto-color" className="mx-0.5 mb-2 text-secundario font-extrabold text-texto-secundario">Foto de cada color · opcional</p>
      <div className="grid grid-cols-2 gap-2.5">
        {valores.map((v) => {
          const i = fotos.findIndex((f) => f.id === fotosColor[v]);
          const f = i >= 0 ? fotos[i]! : null;
          return (
            <button
              key={v} type="button" disabled={sinFotos} onClick={() => alAbrir(v)} aria-label={`Foto de ${v}: ${f ? `foto ${i + 1}` : "elegir"}`}
              className={clases("tocable flex min-w-0 items-center gap-2.5 rounded-radio-m border-[1.5px] border-dashed border-borde-campo bg-superficie p-2 text-left disabled:opacity-40", FOCO)}
            >
              <span aria-hidden="true" className="relative block h-[54px] w-11 shrink-0 overflow-hidden rounded-radio-s bg-superficie-hundida">
                {(f ?? fotos[0]) && <Foto src={(f ?? fotos[0])!.url} alt="" className="size-full" sizes="44px" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-secundario font-extrabold text-texto">{v}</span>
                <span className="text-etiqueta font-normal text-texto-secundario">{f ? `Foto ${i + 1}` : "Elegir foto"}</span>
              </span>
            </button>
          );
        })}
      </div>
      {sinFotos && <p className="mx-0.5 mt-2 text-[0.8125rem] text-texto-secundario" data-pista-foto-color="">Sube fotos en el primer paso para elegir la de cada color.</p>}
    </section>
  );
}

/** Elegir la foto de un color entre las del producto (o subir otra), con «‹» y «Listo» abajo como toda la historia. */
export function HojaFotoDeColor({
  valor, fotos, fotosColor, alCerrar, alElegir, alSubir,
}: {
  valor: string | null;
  fotos: FotoBorrador[];
  fotosColor: Record<string, string>;
  alCerrar: () => void;
  alElegir: (valor: string, id: string | null) => void;
  alSubir: (archivo: File) => Promise<string | null>;
}) {
  const [ultimo, setUltimo] = useState<string | null>(valor);
  if (valor && valor !== ultimo) setUltimo(valor);
  const v = valor ?? ultimo;
  return (
    <Hoja abierta={valor !== null} alCerrar={alCerrar} titulo={`Foto de ${v ?? ""}`} altura="auto">
      {v && (
        <div className="flex flex-col gap-4">
          <p className="text-secundario text-texto-secundario">Tu cliente la ve al elegir {v}. Escoges entre las fotos del producto.</p>
          <SelectorFotos
            fotos={fotos} elegida={fotosColor[v] ?? null} usadas={Object.fromEntries(Object.entries(fotosColor).filter(([x]) => x !== v))}
            alElegir={(id) => alElegir(v, id)} alQuitar={fotosColor[v] ? () => alElegir(v, null) : undefined}
            alSubir={async (archivo) => { const id = await alSubir(archivo); if (id) alElegir(v, id); }}
          />
          <div className="flex items-center gap-2.5">
            <BotonAtras alTocar={alCerrar} />
            <Boton tamano="grande" className="flex-1" onClick={alCerrar}>Listo</Boton>
          </div>
        </div>
      )}
    </Hoja>
  );
}

/** Una pastilla de «Hazlo brillar»: abre su hoja; hecha, lleva el check y dice qué tiene. */
export function PastillaOpcional({ texto, hecha, detalle, alTocar }: { texto: string; hecha: boolean; detalle?: string | null; alTocar: () => void }) {
  return (
    <Chip hecho={hecha} onClick={alTocar} className="h-[34px]! gap-1! px-2.5! text-[0.8125rem]!" aria-label={hecha ? `${texto}: ${detalle ?? "lista"}. Cambiar` : `Agregar ${texto.toLowerCase()}`} data-opcional={texto} data-hecha={hecha ? "" : undefined}>
      {texto}
    </Chip>
  );
}

/** Las hojas de los opcionales: lo de hoy (descripción, ficha, detalles) en su propia hoja con «Listo». */
export function HojaOpcional({ abierta, titulo, grande = false, alCerrar, children }: { abierta: boolean; titulo: string; grande?: boolean; alCerrar: () => void; children: ReactNode }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo} altura={grande ? "grande" : "auto"}>
      <div className="flex flex-col gap-4">
        {children}
        <div className="flex items-center gap-2.5">
          <BotonAtras alTocar={alCerrar} />
          <Boton tamano="grande" className="flex-1" onClick={alCerrar}>Listo</Boton>
        </div>
      </div>
    </Hoja>
  );
}

/**
 * El reel real del comprador con el borrador, solo (sin la cabecera ni las pestañas del catálogo): `/vista-previa-reel` en un
 * iframe del mismo sitio, con `components/tienda/reel.tsx`, su CSS y el tema de la tienda. Como el lienzo, se arma a su tamaño de
 * siempre (390×488) y se REDUCE en proporción al ancho de la tarjeta (350×438 a 390 px), sin recortar ni reacomodar su contenido.
 * Se le vuelve a mandar el borrador cuando cambia (al volver de un opcional).
 */
const REEL_W = 390;
const REEL_H = 488;
export function ReelEnVivo({ datos }: { datos: () => DatosVistaPrevia | null }) {
  const marco = useRef<HTMLIFrameElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const listo = useRef(false);
  const ultimos = useRef(datos);
  useEffect(() => {
    ultimos.current = datos;
  });
  const mandar = () => {
    const d = ultimos.current();
    if (d && listo.current) marco.current?.contentWindow?.postMessage({ tipo: MENSAJE_VISTA_PREVIA, datos: d }, location.origin);
  };
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== marco.current?.contentWindow || e.data?.tipo !== `${MENSAJE_VISTA_PREVIA}-listo`) return;
      listo.current = true;
      const d = ultimos.current();
      if (d) marco.current?.contentWindow?.postMessage({ tipo: MENSAJE_VISTA_PREVIA, datos: d }, location.origin);
    };
    window.addEventListener("message", alMensaje);
    return () => window.removeEventListener("message", alMensaje);
  }, []);
  // La escala sale del ancho de la tarjeta (no del teclado ni del alto): se escribe directo en el estilo, sin estado de React.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ajustar = () => {
      if (marco.current) marco.current.style.transform = `scale(${el.clientWidth / REEL_W})`;
    };
    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const d = datos();
  const clave = JSON.stringify(d && "producto" in d ? d.producto : null);
  useEffect(mandar, [clave]);
  return (
    <div ref={caja} className="relative aspect-[390/488] w-full shrink-0 overflow-hidden rounded-radio-l bg-superficie-hundida" data-reel-historia="">
      <iframe
        ref={marco} src="/vista-previa-reel" title="Así lo verá tu cliente" className="absolute top-0 left-0 origin-top-left border-0"
        style={{ width: REEL_W, height: REEL_H }}
      />
    </div>
  );
}

/** El encabezado de un paso: la pregunta (Fredoka 26) y su línea de ayuda; `separacion` es el margen de arriba según el paso. */
export function EncabezadoPaso({ titulo, ayuda, separacion = "mt-3", ayudaArriba = "mt-[5px]" }: { titulo: string; ayuda: string; separacion?: string; ayudaArriba?: string }) {
  return (
    <div className={separacion}>
      <h2 tabIndex={-1} data-titulo-paso="" className="font-display text-[1.625rem] leading-[1.1] text-texto outline-none">{titulo}</h2>
      <p className={clases(ayudaArriba, "text-[0.9375rem] text-texto-secundario")}>{ayuda}</p>
    </div>
  );
}

/** Paso «Foto»: el marco, las fotos y el remate «Con foto se vende más.»; el encabezado solo sale mientras no hay fotos. */
export function PasoFoto({ medios, alCambiar, taller, avisar, titulo, ayuda }: {
  medios: MedioBorrador[]; alCambiar: (cambio: (medios: MedioBorrador[]) => MedioBorrador[]) => void; taller: Taller; avisar: (m: string) => void; titulo: string; ayuda: string;
}) {
  const fotos = mediosParaGuardar(medios).filter((m) => m.tipo === "foto");
  return (
    <>
      <MarcoFoto portada={fotos[0]?.url ?? null} total={fotos.length} />
      {medios.length === 0 && <EncabezadoPaso titulo={titulo} ayuda={ayuda} />}
      <div className={medios.length === 0 ? "mt-3.5" : "mt-2"}>
        <SeccionMedios medios={medios} alCambiar={alCambiar} taller={taller} avisar={avisar} historia />
      </div>
      {/* El momento de voz de la foto, al final de la pantalla: sin regañar (se puede seguir sin ella). */}
      <p className="mt-2 text-center font-mano text-[1.625rem] leading-[1.1] text-atencion-texto" data-con-foto="">{SIN_FOTO}</p>
      {/* Debajo irá «Pedir a Deslizapp que retoque tu foto» (ronda futura): se deja el sitio. */}
      {medios.length > 0 && <div aria-hidden="true" className="mt-1 h-9" data-hueco-retoque="" />}
    </>
  );
}

/** Paso «Nombre»: encabezado y campo grande. */
export function PasoNombre({ titulo, ayuda, valor, alCambiar, alEnter }: {
  titulo: string; ayuda: string; valor: string; alCambiar: (v: string) => void; alEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <EncabezadoPaso titulo={titulo} ayuda={ayuda} />
      <Campo
        className="mt-3" grande etiqueta="Nombre del producto" value={valor} onChange={(e) => alCambiar(e.target.value)}
        maxLength={120} enterKeyHint="next" onKeyDown={alEnter} data-campo-paso=""
      />
    </>
  );
}

/** Paso «Precio» (sin la pregunta de las opciones): el campo de precio, o «Varía por presentación · desde …» si el precio lo dan las presentaciones. */
export function PasoPrecio({ titulo, ayuda, precio, alCambiar, variaDesde, enterKeyHint, alEnter }: {
  titulo: string; ayuda: string; precio: string; alCambiar: (v: string) => void; variaDesde: number | null;
  enterKeyHint: "done" | "next"; alEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <EncabezadoPaso titulo={titulo} ayuda={ayuda} />
      {variaDesde !== null ? (
        <p className="mt-4 text-destacado text-texto" data-precio-desde="">Varía por presentación · desde {formatearPesos(variaDesde)}</p>
      ) : (
        <Campo
          className="mt-3" grande etiqueta="Precio" aria-label="Precio (RD$)" prefijo="RD$" inputMode="numeric" enterKeyHint={enterKeyHint} onKeyDown={alEnter}
          precio={{ digitos: precio, alCambiar }} placeholder="Escribe tu precio" data-precio="" data-campo-paso=""
        />
      )}
    </>
  );
}

/** «¿Viene en varias opciones?»: las cosas típicas del catálogo y «Otra» (`null`). Pieza aparte del paso del precio. */
export function PreguntaOpciones({ rubro, alElegir }: { rubro: Rubro; alElegir: (cosa: string | null) => void }) {
  return (
    <>
      <h2 className="font-display text-titulo-seccion text-texto" data-pregunta-opciones="">¿Viene en varias opciones?</h2>
      <div role="group" aria-label="¿Viene en varias opciones?" className="mt-2.5 flex flex-wrap gap-2">
        {OPCIONES_TIPICAS[rubro].slice(0, MAX_EJES).map((cosa) => (
          <Eleccion key={cosa} accion elegida={false} onClick={() => alElegir(cosa)}>{cosa}</Eleccion>
        ))}
        <Eleccion accion elegida={false} onClick={() => alElegir(null)}>Otra</Eleccion>
      </div>
    </>
  );
}

/** Paso «Stock»: la cantidad grande (o «Cuándo llega» si es por encargo) y el interruptor «Es por encargo, no llevo stock». */
export function PasoStock({ titulo, ayuda, stock, alCambiarStock, porEncargo, alCambiarEncargo, encargoTexto, alCambiarEncargoTexto, alEnter }: {
  titulo: string; ayuda: string; stock: number; alCambiarStock: (n: number) => void; porEncargo: boolean; alCambiarEncargo: (v: boolean) => void;
  encargoTexto: string; alCambiarEncargoTexto: (t: string) => void; alEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <EncabezadoPaso titulo={titulo} ayuda={ayuda} />
      {porEncargo ? (
        <div className="mt-3.5 flex flex-col gap-3">
          <FilaInterruptor texto="Es por encargo, no llevo stock" encendido alCambiar={alCambiarEncargo} />
          <CuandoLlega texto={encargoTexto} alCambiar={alCambiarEncargoTexto} alEnter={alEnter} />
        </div>
      ) : (
        <>
          <div className="mt-2.5 flex justify-center" data-contador-stock="">
            <Cantidad grande valor={stock} max={2147483647} alCambiar={alCambiarStock} etiquetaQuitar="Quitar uno" etiquetaAgregar="Agregar uno" />
          </div>
          <div className="mt-1.5">
            <FilaInterruptor texto="Es por encargo, no llevo stock" encendido={false} alCambiar={alCambiarEncargo} />
          </div>
        </>
      )}
    </>
  );
}
