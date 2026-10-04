"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { CREDITOS_POR_RETOQUE, RETOQUE_REAL } from "@/lib/config";
import { ErrorClaro } from "@/lib/data/errores";
import { nuevoId } from "@/lib/data/db";
import { reducirFoto, retocarFoto } from "@/lib/imagen";
import type { Medio, Producto } from "@/lib/types";
import { cuadrosDelVideo, leerVideo, oirPasosVideo, pasosVideo, prepararVideo, VIDEO_MAX_S, type PasoVideo, type VideoElegido } from "@/lib/video";
import { Foto } from "../foto";
import { Hoja } from "../hoja";
import { Boton, ControlSegmentado, Etiqueta, FilaLista, Interruptor, ListaAgrupada, TiraMedios, VideoProducto, duracionCorta } from "../ui";

export const MAX_MEDIOS = 10;
export const MAX_VIDEOS = 2;

/** Un medio en el borrador de la ficha. Una foto recién retocada guarda la `original` para poder volver atrás. */
export type MedioBorrador =
  | { id: string; tipo: "foto"; url: string; retocada: boolean; original?: string; retoquePendiente?: boolean }
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

export const retoquesPendientes = (medios: MedioBorrador[]) => medios.filter((m) => m.tipo === "foto" && m.retoquePendiente).length;

/**
 * Fotos y video de la ficha (tablero Producto «Perfume» y «Video»): la TiraMedios, la hoja chica de cada miniatura (portada,
 * mover, quitar y, en fotos, el retoque con sus créditos) y, si un video dura más de 30 s, la hoja que elige el tramo.
 */
export function SeccionMedios({
  medios,
  alCambiar,
  creditos,
  avisar,
}: {
  medios: MedioBorrador[];
  alCambiar: (cambio: (medios: MedioBorrador[]) => MedioBorrador[]) => void;
  creditos: number;
  avisar: (mensaje: string) => void;
}) {
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
            ? { id: m.id, tipo: "foto", imagen: m.url }
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
        creditos={creditos}
        pendientes={retoquesPendientes(medios)}
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

/** Hoja chica de una miniatura: la foto, el retoque (solo fotos) y las acciones. */
function HojaMedio({
  medio,
  indice,
  total,
  creditos,
  pendientes,
  alCerrar,
  alCambiar,
  alMover,
  alQuitar,
  avisar,
}: {
  medio: MedioBorrador | null;
  indice: number;
  total: number;
  creditos: number;
  pendientes: number;
  alCerrar: () => void;
  alCambiar: (m: MedioBorrador) => void;
  alMover: (hasta: number) => void;
  alQuitar: () => void;
  avisar: (mensaje: string) => void;
}) {
  // Lo último abierto se sigue viendo mientras la hoja baja.
  const [visto, setVisto] = useState(medio);
  const [retocando, setRetocando] = useState(false);
  const [vista, setVista] = useState<"antes" | "despues">("despues");
  if (medio && medio !== visto) {
    // Otra miniatura: se empieza viendo el resultado.
    if (medio.id !== visto?.id) setVista("despues");
    setVisto(medio);
  }
  const m = medio ?? visto;
  if (!m) return null;
  const foto = m.tipo === "foto" ? m : null;
  const alcanzan = creditos >= CREDITOS_POR_RETOQUE * (pendientes + (foto?.retoquePendiente ? 0 : 1));

  const retocar = async (prender: boolean) => {
    if (!foto) return;
    if (!prender) {
      alCambiar({ ...foto, url: foto.original ?? foto.url, retocada: false, original: undefined, retoquePendiente: false });
      return;
    }
    setRetocando(true);
    try {
      const url = await retocarFoto(foto.url);
      alCambiar({ ...foto, original: foto.url, url, retocada: true, retoquePendiente: true });
      setVista("despues");
    } catch {
      avisar("Esta foto no se dejó retocar. Prueba con otra.");
    } finally {
      setRetocando(false);
    }
  };

  const verAntes = foto?.retoquePendiente && vista === "antes";
  const imagen = foto ? (verAntes ? foto.original! : foto.url) : m.tipo === "video" ? m.portada : null;

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
          <div className="relative mx-auto aspect-square w-full max-w-60 overflow-hidden rounded-radio-m bg-superficie-hundida">
            {imagen && <Foto src={imagen} alt={m.tipo === "video" ? "Portada del video" : "Foto del producto"} className="h-full w-full" sizes="240px" />}
            {m.tipo === "video" && <span className="absolute right-2 bottom-2"><Etiqueta tono="fuerte">{duracionCorta(m.duracionS)}</Etiqueta></span>}
            {retocando && <span className="absolute inset-0 grid place-items-center bg-[rgb(0_0_0/0.35)]"><Etiqueta tono="fuerte">Poniéndole la luz…</Etiqueta></span>}
          </div>
        )}
        {foto?.retoquePendiente && (
          <ControlSegmentado
            etiqueta="Comparar foto"
            valor={vista}
            alCambiar={setVista}
            opciones={[
              { id: "antes", texto: "Antes" },
              { id: "despues", texto: "Después" },
            ]}
          />
        )}
        {foto && (
          <ListaAgrupada etiqueta="Retoque">
            <FilaLista
              titulo={
                <span className="flex items-center gap-2">
                  {foto.retocada && !foto.retoquePendiente ? "Retocar otra vez" : "Retocar foto"}
                  {!RETOQUE_REAL && <Etiqueta>Demo</Etiqueta>}
                </span>
              }
              detalle={
                foto.retoquePendiente
                  ? `Al guardar usa ${CREDITOS_POR_RETOQUE} créditos.`
                  : alcanzan
                    ? `Luz, fondo y color de estudio. ${CREDITOS_POR_RETOQUE} créditos.`
                    : `Te faltan créditos (tienes ${creditos}). Se recargan el día 1.`
              }
              accion={
                <Interruptor
                  encendido={Boolean(foto.retoquePendiente)}
                  alCambiar={(v) => void retocar(v)}
                  etiqueta="Retocar foto"
                  deshabilitado={retocando || (!foto.retoquePendiente && !alcanzan)}
                  alTocarBloqueado={() => avisar("Te faltan créditos para retocar. Se recargan el día 1.")}
                />
              }
            />
          </ListaAgrupada>
        )}
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
