"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CREDITOS_POR_RETOQUE } from "@/lib/config";
import { ErrorClaro } from "@/lib/data/errores";
import { nuevoId } from "@/lib/data/db";
import { reducirFoto } from "@/lib/imagen";
import type { Medio, Producto } from "@/lib/types";
import { cuadrosDelVideo, leerVideo, oirPasosVideo, pasosVideo, prepararVideo, VIDEO_MAX_S, type PasoVideo, type VideoElegido } from "@/lib/video";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { Boton, Etiqueta, FilaLista, Interruptor, ListaAgrupada, TiraMedios, VideoProducto, duracionCorta } from "../ui";
import { REMATE_TALLER, TEXTO_SE_MANDA_AL_GUARDAR, TITULO_RETOCAR_ESTA, textoEnTaller, textoFichaRetoque, tiempoRetoque } from "@/lib/retoque-textos";
import { estadoInterruptor } from "@/lib/retoque-al-subir";
import { EtiquetaBeta } from "./etiqueta-beta";
import type { Taller } from "./taller";

export const MAX_MEDIOS = 10;
export const MAX_VIDEOS = 2;

/** Un medio en el borrador de la ficha. */
export type MedioBorrador =
  // `retocar`: la intención de mandarla al taller al guardar (solo fotos nuevas; no se guarda con el producto).
  | { id: string; tipo: "foto"; url: string; retocada: boolean; retocar?: boolean }
  | { id: string; tipo: "video"; url: string | null; portada: string | null; duracionS: number; progreso?: number | null };

/** Los medios del producto (o, si es viejo y solo tiene `fotos`, sus fotos) como borrador. */
export function mediosIniciales(producto: Producto | null): MedioBorrador[] {
  if (!producto) return [];
  const medios = producto.medios.length > 0 ? producto.medios : producto.fotos.map((url, i) => ({ tipo: "foto" as const, url, retocada: i === 0 && producto.fotoRetocada }));
  return medios.map((m) =>
    m.tipo === "foto" ? { id: nuevoId(), tipo: "foto", url: m.url, retocada: m.retocada } : { id: nuevoId(), tipo: "video", url: m.url, portada: m.portada, duracionS: m.duracionS },
  );
}

/** El borrador listo para guardar (sin los videos que todavía se preparan). */
export function mediosParaGuardar(medios: MedioBorrador[]): Medio[] {
  return medios.flatMap((m): Medio[] =>
    m.tipo === "foto" ? [{ tipo: "foto", url: m.url, retocada: m.retocada }] : m.url ? [{ tipo: "video", url: m.url, portada: m.portada, duracionS: m.duracionS }] : [],
  );
}

/**
 * Una foto que el taller entregó mientras la ficha estaba abierta: en el borrador se cambia la original por la retocada, así
 * guardar no la vuelve atrás. Devuelve la misma lista si no hay nada que cambiar.
 */
export function conEntregadas(medios: MedioBorrador[], entregadas: { medioUrlOriginal: string; medioUrlRetocado: string | null }[]): MedioBorrador[] {
  let cambio = false;
  const nuevos = medios.map((m) => {
    const t = m.tipo === "foto" ? entregadas.find((e) => e.medioUrlOriginal === m.url && e.medioUrlRetocado) : undefined;
    if (!t || m.tipo !== "foto") return m;
    cambio = true;
    return { ...m, url: t.medioUrlRetocado!, retocada: true };
  });
  return cambio ? nuevos : medios;
}

/**
 * Fotos y video de la ficha (tablero Producto «Perfume» y «Video»): la TiraMedios, la hoja chica de cada miniatura (portada,
 * mover, quitar y, en fotos, mandarla al taller de retoque) y, si un video dura más de 30 s, la hoja que elige el tramo.
 */
export function SeccionMedios({
  medios,
  alCambiar,
  taller,
  avisar,
}: {
  medios: MedioBorrador[];
  alCambiar: (cambio: (medios: MedioBorrador[]) => MedioBorrador[]) => void;
  taller: Taller;
  avisar: (mensaje: string) => void;
}) {
  // Si el taller entrega una foto con la ficha abierta, el borrador toma la retocada.
  const ultimaEntregada = taller.entregadas[0]?.id;
  useEffect(() => {
    if (ultimaEntregada) alCambiar((l) => conEntregadas(l, taller.entregadas));
    // Solo al aparecer una entrega nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimaEntregada]);
  const entrada = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [tramo, setTramo] = useState<{ video: VideoElegido; cuadros: string[] } | null>(null);
  const videos = medios.filter((m) => m.tipo === "video").length;
  const preparando = medios.some((m) => m.tipo === "video" && typeof m.progreso === "number");
  const bloqueo = medios.length >= MAX_MEDIOS ? `Ya tiene ${MAX_MEDIOS}. Quita uno para agregar otro.` : null;

  const agregarFoto = async (archivo: File) => {
    try {
      const url = await reducirFoto(archivo);
      alCambiar((l) => (l.length >= MAX_MEDIOS ? l : [...l, { id: nuevoId(), tipo: "foto", url, retocada: false }]));
    } catch {
      avisar("Esa foto no quiso cargar. Prueba con otra.");
    }
  };

  const subirTramo = async (video: VideoElegido, inicio: number) => {
    const id = nuevoId();
    alCambiar((l) => [...l, { id, tipo: "video", url: null, portada: null, duracionS: Math.min(VIDEO_MAX_S, Math.round(video.duracion)), progreso: 0 }]);
    try {
      const listo = await prepararVideo(video, inicio, (p) =>
        alCambiar((l) => l.map((m) => (m.id === id && m.tipo === "video" ? { ...m, progreso: p } : m))),
      );
      const url = URL.createObjectURL(listo.blob);
      alCambiar((l) => l.map((m) => (m.id === id ? { id, tipo: "video", url, portada: listo.portada, duracionS: listo.duracionS, progreso: null } : m)));
    } catch (e) {
      alCambiar((l) => l.filter((m) => m.id !== id));
      avisar(e instanceof ErrorClaro ? e.message : "Ese video no se dejó preparar. Prueba con otro.");
    } finally {
      URL.revokeObjectURL(video.url);
    }
  };

  const agregarVideo = async (archivo: File) => {
    if (videos >= MAX_VIDEOS) {
      avisar(`Hasta ${MAX_VIDEOS} videos por producto. Quita uno para agregar otro.`);
      return;
    }
    let video: VideoElegido;
    try {
      video = await leerVideo(archivo);
    } catch (e) {
      avisar(e instanceof ErrorClaro ? e.message : "Ese video no quiso abrir. Prueba con otro.");
      return;
    }
    if (video.duracion > VIDEO_MAX_S + 0.5) {
      const cuadros = await cuadrosDelVideo(video).catch(() => []);
      setTramo({ video, cuadros });
    } else void subirTramo(video, 0);
  };

  const elegir = (archivos: FileList | null) => {
    if (!archivos) return;
    const lista = [...archivos].slice(0, MAX_MEDIOS - medios.length);
    for (const archivo of lista) {
      if (archivo.type.startsWith("video/")) void agregarVideo(archivo);
      else void agregarFoto(archivo);
    }
  };

  /** Fotos nuevas marcadas para el taller: cuentan todas contra los créditos libres. */
  const marcadas = medios.filter((m) => m.tipo === "foto" && m.retocar && !taller.guardada(m.url)).length;
  const elegido = medios.find((m) => m.id === abierto) ?? null;
  const indice = elegido ? medios.indexOf(elegido) : -1;
  const mover = (desde: number, hasta: number) =>
    alCambiar((l) => {
      const copia = [...l];
      const [m] = copia.splice(desde, 1);
      copia.splice(hasta, 0, m!);
      return copia;
    });

  return (
    <section aria-label="Fotos y video" className="flex flex-col gap-2">
      <input
        ref={entrada}
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-entrada-medios
        onChange={(e) => {
          elegir(e.target.files);
          e.target.value = "";
        }}
      />
      <TiraMedios
        elementos={medios.map((m) =>
          m.tipo === "foto"
            ? { id: m.id, tipo: "foto", imagen: m.url, taller: tallerDeMiniatura(taller.estado(m.url)) }
            : { id: m.id, tipo: "video", imagen: m.portada, duracionS: m.duracionS, progreso: m.progreso ?? null },
        )}
        alTocar={setAbierto}
        alMover={mover}
        alAgregar={() => entrada.current?.click()}
        bloqueo={bloqueo}
        nota={preparando ? "Lo dejamos liviano para que cargue rápido." : `Hasta ${MAX_MEDIOS}. Mantén presionado para ordenar.`}
      />
      <DepuracionVideo />
      <HojaMedio
        medio={elegido}
        indice={indice}
        total={medios.length}
        marcadas={marcadas}
        taller={taller}
        alCerrar={() => setAbierto(null)}
        alCambiar={(nuevo) => alCambiar((l) => l.map((m) => (m.id === nuevo.id ? nuevo : m)))}
        alMover={(hasta) => mover(indice, hasta)}
        alQuitar={() => {
          alCambiar((l) => l.filter((m) => m.id !== abierto));
          setAbierto(null);
        }}
        avisar={avisar}
      />
      <HojaTramo
        tramo={tramo}
        alCerrar={() => {
          if (tramo) URL.revokeObjectURL(tramo.video.url);
          setTramo(null);
        }}
        alElegir={(inicio) => {
          const v = tramo!.video;
          setTramo(null);
          void subirTramo(v, inicio);
        }}
      />
    </section>
  );
}

const tallerDeMiniatura = (e: ReturnType<Taller["estado"]>) => (e?.estado === "pendiente" ? "pendiente" : e?.estado === "devuelto" ? "devuelta" : null);

/** Hoja chica de una miniatura: la foto, el taller de retoque (solo fotos) y las acciones. */
function HojaMedio({
  medio,
  indice,
  total,
  marcadas,
  taller,
  alCerrar,
  alCambiar,
  alMover,
  alQuitar,
  avisar,
}: {
  medio: MedioBorrador | null;
  indice: number;
  total: number;
  /** Cuántas fotos nuevas hay marcadas en el borrador. */
  marcadas: number;
  taller: Taller;
  alCerrar: () => void;
  alCambiar: (m: MedioBorrador) => void;
  alMover: (hasta: number) => void;
  alQuitar: () => void;
  avisar: (mensaje: string) => void;
}) {
  // Lo último abierto se sigue viendo mientras la hoja baja.
  const [visto, setVisto] = useState(medio);
  const otra = useRef<HTMLInputElement>(null);
  if (medio && medio !== visto) setVisto(medio);
  const m = medio ?? visto;
  if (!m) return null;
  const foto = m.tipo === "foto" ? m : null;
  const imagen = foto ? foto.url : m.tipo === "video" ? m.portada : null;
  const enTaller = foto ? taller.estado(foto.url) : null;

  /** «Subir otra» de una devuelta: la foto nueva reemplaza a esta en el borrador (al guardar se puede mandar de nuevo). */
  const subirOtra = async (archivo: File | undefined) => {
    if (!archivo || !foto) return;
    try {
      alCambiar({ ...foto, url: await reducirFoto(archivo), retocada: false });
    } catch {
      avisar("Esa foto no quiso cargar. Prueba con otra.");
    }
  };

  /** El título de cada estado del taller lleva «Beta» al lado: el retoque no es automático y por eso tarda. */
  const conBeta = (titulo: string) => (
    <span className="flex items-center gap-2">
      {titulo}
      <EtiquetaBeta />
    </span>
  );
  const textoSecundario = "text-secundario text-texto-secundario";
  const tiempo = tiempoRetoque();

  const retoque = (() => {
    if (!foto) return null;
    if (enTaller?.estado === "pendiente")
      return {
        titulo: conBeta("En el taller"),
        detalle: undefined,
        pie: (
          <>
            <span className={`block ${textoSecundario}`}>{textoEnTaller()}</span>
            {tiempo && <span className={`mt-1 block ${textoSecundario}`}>{tiempo}</span>}
            <span className="mt-1 block font-mano text-mano text-mandarina-texto">{REMATE_TALLER}</span>
          </>
        ),
        accion: null,
      };
    if (enTaller?.estado === "devuelto")
      return {
        titulo: conBeta("Te la devolvimos"),
        detalle: "No se cobró.",
        pie: <span className={textoSecundario}>{`«${enTaller.trabajo.motivoDevolucion ?? "No se pudo retocar."}»`}</span>,
        accion: (
          <Boton tamano="compacto" jerarquia="secundario" deshabilitado={taller.soloMirar} onClick={() => otra.current?.click()}>
            Subir otra
          </Boton>
        ),
      };
    if (foto.retocada) return { titulo: conBeta("Retocada por el equipo"), detalle: "Ya tiene luz y fondo de estudio.", pie: null, accion: null };
    if (!taller.guardada(foto.url)) {
      // Foto nueva: el interruptor solo anota la intención; se manda al taller cuando el producto se guarde.
      const marcada = !!foto.retocar;
      const { deshabilitado, motivo: sinMotivo } = estadoInterruptor({ soloMirar: taller.soloMirar, libres: taller.libres, marcadas, estaMarcada: marcada });
      return {
        titulo: conBeta(TITULO_RETOCAR_ESTA),
        detalle: sinMotivo ?? (marcada ? TEXTO_SE_MANDA_AL_GUARDAR : undefined),
        pie: <span className={textoSecundario}>{textoFichaRetoque()}</span>,
        accion: (
          <Interruptor
            etiqueta={TITULO_RETOCAR_ESTA}
            encendido={marcada}
            deshabilitado={deshabilitado}
            alCambiar={(v) => alCambiar({ ...foto, retocar: v })}
            alTocarBloqueado={() => sinMotivo && avisar(sinMotivo)}
          />
        ),
      };
    }
    const motivo = taller.soloMirar ? "Solo mirar: aquí no se manda nada al taller." : taller.libres < CREDITOS_POR_RETOQUE ? "Te faltan créditos para esta." : null;
    return {
      titulo: conBeta("Retocar foto"),
      detalle: motivo ?? undefined,
      pie: <span className={textoSecundario}>{textoFichaRetoque()}</span>,
      accion: (
        <Boton tamano="compacto" deshabilitado={!!motivo} cargando={taller.pidiendo === foto.url} onClick={() => void taller.pedir(foto.url)}>
          Retocar
        </Boton>
      ),
    };
  })();

  return (
    <Hoja abierta={medio !== null} alCerrar={alCerrar} titulo={m.tipo === "video" ? "Video" : indice === 0 ? "Portada" : "Foto"}>
      <div className="flex flex-col gap-4">
        {m.tipo === "video" && m.url ? (
          // El video mismo (recién preparado, en URL local, o ya subido): solo, mudo y en bucle; tocarlo activa el sonido.
          <VideoProducto
            src={m.url}
            portada={m.portada}
            className="mx-auto aspect-square w-full max-w-60 rounded-radio-m"
            esquina={<span className="pointer-events-none absolute right-2 bottom-2"><Etiqueta tono="fuerte">{duracionCorta(m.duracionS)}</Etiqueta></span>}
          />
        ) : (
          <div className={`relative mx-auto aspect-square w-full max-w-60 overflow-hidden rounded-radio-m bg-superficie-hundida ${enTaller?.estado === "pendiente" ? "ring-3 ring-resalte" : ""}`}>
            {imagen && <Foto src={imagen} alt={m.tipo === "video" ? "Portada del video" : "Foto del producto"} className="h-full w-full" sizes="240px" />}
            {m.tipo === "video" && <span className="absolute right-2 bottom-2"><Etiqueta tono="fuerte">{duracionCorta(m.duracionS)}</Etiqueta></span>}
          </div>
        )}
        {retoque && (
          <ListaAgrupada etiqueta="Retoque">
            <FilaLista
              titulo={retoque.titulo}
              detalle={retoque.detalle}
              pie={retoque.pie ?? undefined}
              accion={retoque.accion ?? undefined}
            />
          </ListaAgrupada>
        )}
        <input ref={otra} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void subirOtra(e.target.files?.[0]); e.target.value = ""; }} />
        {total > 1 && (
          <ListaAgrupada etiqueta="Acciones">
            {indice > 0 && <FilaLista titulo="Hacer portada" onClick={() => { alMover(0); alCerrar(); }} />}
            {indice > 0 && <FilaLista titulo="Mover a la izquierda" onClick={() => alMover(indice - 1)} />}
            {indice < total - 1 && <FilaLista titulo="Mover a la derecha" onClick={() => alMover(indice + 1)} />}
          </ListaAgrupada>
        )}
        <Boton jerarquia="terciario" tono="peligro" anchoCompleto onClick={alQuitar}>
          {m.tipo === "video" ? "Quitar video" : "Quitar foto"}
        </Boton>
      </div>
    </Hoja>
  );
}

/**
 * Un video de más de 30 s: la franja de miniaturas con una ventana de 30 s que se arrastra (tablero «Video»). El tramo empieza
 * donde quede la ventana.
 */
function HojaTramo({ tramo, alCerrar, alElegir }: { tramo: { video: VideoElegido; cuadros: string[] } | null; alCerrar: () => void; alElegir: (inicio: number) => void }) {
  const [inicio, setInicio] = useState(0);
  const franja = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; inicio: number } | null>(null);
  const [visto, setVisto] = useState(tramo);
  if (tramo && tramo !== visto) {
    setVisto(tramo);
    setInicio(0);
  }
  const t = tramo ?? visto;
  if (!t) return null;
  const duracion = t.video.duracion;
  const ventana = Math.min(1, VIDEO_MAX_S / duracion);
  const maximo = Math.max(0, duracion - VIDEO_MAX_S);
  const mover = (dx: number) => {
    const ancho = franja.current?.clientWidth ?? 1;
    setInicio(Math.max(0, Math.min(maximo, arrastre.current!.inicio + (dx / ancho) * duracion)));
  };
  return (
    <Hoja abierta={tramo !== null} alCerrar={alCerrar} titulo={`Este dura ${Math.round(duracion)} s`}>
      <div className="flex flex-col gap-4">
        <p className="text-cuerpo text-texto-secundario">En el catálogo se ven hasta {VIDEO_MAX_S}. Elige desde dónde.</p>
        <div
          ref={franja}
          className="relative h-14 touch-none overflow-hidden rounded-radio-m bg-superficie-hundida select-none"
          onPointerDown={(e) => {
            arrastre.current = { x: e.clientX, inicio };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => arrastre.current && mover(e.clientX - arrastre.current.x)}
          onPointerUp={() => (arrastre.current = null)}
          onPointerCancel={() => (arrastre.current = null)}
        >
          <div className="flex h-full">
            {t.cuadros.map((c, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={c} alt="" className="h-full min-w-0 flex-1 object-cover" />
            ))}
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Desde dónde empieza el video"
            aria-valuemin={0}
            aria-valuemax={Math.round(maximo)}
            aria-valuenow={Math.round(inicio)}
            aria-valuetext={`Desde ${duracionCorta(inicio)} hasta ${duracionCorta(inicio + VIDEO_MAX_S)}`}
            onKeyDown={(e) => {
              const paso = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!paso) return;
              e.preventDefault();
              setInicio((v) => Math.max(0, Math.min(maximo, v + paso)));
            }}
            className="absolute inset-y-0 rounded-radio-s border-[3px] border-resalte outline-none focus-visible:outline-3 focus-visible:outline-foco"
            style={{ left: `${(inicio / duracion) * 100}%`, width: `${ventana * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-secundario text-texto-secundario tabular-nums">
          <span>{duracionCorta(inicio)}</span>
          <span>{duracionCorta(Math.min(duracion, inicio + VIDEO_MAX_S))}</span>
        </div>
        <Boton tamano="grande" anchoCompleto onClick={() => alElegir(inicio)}>
          Usar este tramo
        </Boton>
        <DepuracionVideo />
      </div>
    </Hoja>
  );
}

const SIN_PASOS: PasoVideo[] = [];
const nada = () => () => {};

/**
 * Solo con ?depurar=video en la URL: los pasos del último video (abrió, metadatos, primer cuadro, miniaturas, grabando %,
 * terminó o falló y por qué), para saber dónde se detiene en un teléfono. Sin el parámetro no se pinta nada.
 */
function DepuracionVideo() {
  const activo = useSyncExternalStore(nada, () => new URLSearchParams(window.location.search).get("depurar") === "video", () => false);
  const lista = useSyncExternalStore(oirPasosVideo, pasosVideo, () => SIN_PASOS);
  if (!activo) return null;
  return (
    <section aria-label="Pasos del video (depuración)" className="rounded-radio-m bg-superficie-hundida px-3 py-2">
      <p className="text-etiqueta font-extrabold text-texto-secundario">Depuración del video</p>
      {lista.length === 0 ? (
        <p className="text-etiqueta text-texto-secundario">Elige un video para ver los pasos.</p>
      ) : (
        <ol className="flex flex-col font-mono text-etiqueta">
          {lista.map((p) => (
            <li key={p.id} className={p.mal ? "text-peligro" : "text-texto"}>
              <span className="text-texto-secundario tabular-nums">{(p.ms / 1000).toFixed(1)} s</span> {p.texto}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
