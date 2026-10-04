// Video de producto en el teléfono (docs/12 §3; docs/prompts/producto-panel.md §2.2): se elige un tramo de hasta 30 s y se
// aligera ANTES de subir: 720p como máximo, apuntando a unos 8 MB y nunca más de 15 MB. Camino: MediaRecorder grabando un
// <canvas> (captureStream) donde se dibuja el video reducido, con el audio por WebAudio solo si el AudioContext arranca. Si la
// grabación no se puede o se pasa del tiempo, se sube el original solo si ya cumple (≤ 30 s y ≤ 15 MB). La portada es el
// primer cuadro del tramo, en JPG.
//
// Safari de iPhone: no carga cuadros de un <video> que no se reproduce (readyState se queda en 1 y 'loadeddata' no llega), y
// un AudioContext sin gesto reciente arranca suspendido y frena el video. Por eso: el <video> siempre mudo y "despertado" con
// play() + pause(), cada espera con tiempo límite (nunca un anillo eterno) y el audio solo si el contexto queda corriendo.
// Con ?depurar=video, los pasos se ven debajo de la tira (anotar → DepuracionVideo).

import { ErrorClaro } from "./data/errores";

export const VIDEO_MAX_S = 30;
export const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
const VIDEO_OBJETIVO_BYTES = 8 * 1024 * 1024;
/** Lado corto máximo (720p). */
const LADO_CORTO = 720;
const AUDIO_BPS = 96_000;
export const TIPOS_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

/** Tiempos límite (ms). */
const LIMITE_ABRIR = 10_000;
const LIMITE_CUADRO = 8_000;
const LIMITE_SEEK = 6_000;
/** Para despertar el video no hace falta que play() termine: se pausa enseguida. */
const LIMITE_PLAY = 2_500;

const NO_ABRE = "Ese video no quiso abrir. Prueba con otro.";
const SE_TRABO = "Este video se trabó al prepararlo. Prueba otra vez o con otro video.";
export const NO_ALIGERA = "Este teléfono no puede aligerar este video. Súbelo de 30 s o menos y que pese menos de 15 MB.";

export type VideoElegido = { archivo: File; url: string; duracion: number; ancho: number; alto: number };
export type VideoListo = { blob: Blob; duracionS: number; portada: string | null };

// ---- Registro de pasos (?depurar=video) ----

export type PasoVideo = { id: number; ms: number; texto: string; mal?: boolean };
let pasos: PasoVideo[] = [];
let siguiente = 0;
let inicioPasos = 0;
const oyentes = new Set<() => void>();

/** Anota un paso del video (se ve con ?depurar=video y en la consola). `nuevo` empieza la lista de un video nuevo. */
export function anotar(texto: string, { mal = false, nuevo = false }: { mal?: boolean; nuevo?: boolean } = {}) {
  const ahora = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (nuevo || pasos.length === 0) {
    pasos = [];
    inicioPasos = ahora;
  }
  pasos = [...pasos.slice(-19), { id: siguiente++, ms: Math.round(ahora - inicioPasos), texto, mal }];
  for (const f of oyentes) f();
  if (typeof console !== "undefined") console.info(`[video] ${texto}`);
}
export const pasosVideo = () => pasos;
export function oirPasosVideo(f: () => void) {
  oyentes.add(f);
  return () => void oyentes.delete(f);
}

// ---- El <video> escondido ----

/** Un <video> escondido en la página (iOS no reproduce uno que no está en el documento), siempre mudo y en línea. */
function videoEscondido(url: string): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  Object.assign(v.style, { position: "fixed", left: "-9999px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
  v.src = url;
  document.body.appendChild(v);
  return v;
}

/** La promesa, o ErrorClaro(`mensaje`) si tarda más de `ms`. */
function conLimite<T>(promesa: Promise<T>, ms: number, mensaje: string, paso: string): Promise<T> {
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<never>((_, mal) => {
    reloj = setTimeout(() => {
      anotar(`${paso}: se pasó del tiempo (${(ms / 1000).toFixed(1)} s)`, { mal: true });
      mal(new ErrorClaro(mensaje));
    }, ms);
  });
  return Promise.race([promesa, vencido]).finally(() => clearTimeout(reloj));
}

/** El primero de estos eventos del video (o error). */
const esperar = (v: HTMLVideoElement, eventos: string[]) =>
  new Promise<string>((bien, mal) => {
    const limpiar = () => {
      for (const e of eventos) v.removeEventListener(e, ok);
      v.removeEventListener("error", ko);
    };
    const ok = (e: Event) => {
      limpiar();
      bien(e.type);
    };
    const ko = () => {
      limpiar();
      anotar(`el video dio error (${v.error?.code ?? "?"})`, { mal: true });
      mal(new ErrorClaro(NO_ABRE));
    };
    for (const e of eventos) v.addEventListener(e, ok, { once: true });
    v.addEventListener("error", ko, { once: true });
  });

/** Espera los metadatos (duración y tamaño). */
async function abrir(v: HTMLVideoElement) {
  if (v.readyState >= 1) return;
  await conLimite(esperar(v, ["loadedmetadata"]), LIMITE_ABRIR, NO_ABRE, "metadatos");
}

/**
 * Deja el video con un cuadro listo para dibujar. En iPhone, sin reproducir no carga cuadros: play() mudo y pause() enseguida
 * (mudo se permite sin gesto) y se espera 'loadeddata', 'canplay' o el primer 'seeked', lo que llegue primero.
 */
async function despertar(v: HTMLVideoElement) {
  await abrir(v);
  if (v.readyState >= 2) {
    anotar("primer cuadro: ya estaba");
    return;
  }
  const listo = esperar(v, ["loadeddata", "canplay", "seeked"]);
  listo.catch(() => undefined);
  try {
    await conLimite(v.play(), LIMITE_PLAY, SE_TRABO, "play");
  } catch {
    anotar("play() no arrancó; se espera igual", { mal: true });
  }
  v.pause();
  const evento = v.readyState >= 2 ? "cargó con play/pause" : await conLimite(listo, LIMITE_CUADRO, SE_TRABO, "primer cuadro");
  anotar(`primer cuadro (${evento}, readyState ${v.readyState})`);
}

async function irA(v: HTMLVideoElement, t: number) {
  if (Math.abs(v.currentTime - t) < 0.01 && v.readyState >= 2) return;
  const listo = esperar(v, ["seeked"]);
  v.currentTime = t;
  await conLimite(listo, LIMITE_SEEK, SE_TRABO, `ir a ${t.toFixed(1)} s`);
}

/** Lee la duración y el tamaño del video elegido. */
export async function leerVideo(archivo: File): Promise<VideoElegido> {
  anotar(`elegido: ${archivo.type || "sin tipo"}, ${(archivo.size / 1024 / 1024).toFixed(1)} MB`, { nuevo: true });
  const url = URL.createObjectURL(archivo);
  const v = videoEscondido(url);
  try {
    await abrir(v);
    let duracion = v.duration;
    // Algunos webm no traen la duración hasta llegar al final.
    if (!Number.isFinite(duracion)) {
      await irA(v, 1e6);
      duracion = v.duration;
    }
    if (!Number.isFinite(duracion) || duracion <= 0) throw new ErrorClaro(NO_ABRE);
    anotar(`metadatos: ${duracion.toFixed(1)} s, ${v.videoWidth}×${v.videoHeight}`);
    return { archivo, url, duracion, ancho: v.videoWidth, alto: v.videoHeight };
  } catch (e) {
    URL.revokeObjectURL(url);
    if (!(e instanceof ErrorClaro)) anotar(`no abrió: ${String(e)}`, { mal: true });
    throw e;
  } finally {
    v.remove();
  }
}

/** Tamaño de salida: el lado corto a 720 como máximo, sin agrandar, en números pares. */
function medidas(ancho: number, alto: number) {
  const escala = Math.min(1, LADO_CORTO / Math.max(1, Math.min(ancho, alto)));
  const par = (n: number) => Math.max(2, Math.round((n * escala) / 2) * 2);
  return { ancho: par(ancho), alto: par(alto) };
}

/** Un cuadro del video en `t` como JPG (data URL), con el lado mayor hasta `lado`. */
async function cuadro(v: HTMLVideoElement, t: number, lado: number, calidad = 0.82): Promise<string> {
  await irA(v, t);
  const escala = Math.min(1, lado / Math.max(v.videoWidth, v.videoHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(v.videoWidth * escala));
  c.height = Math.max(1, Math.round(v.videoHeight * escala));
  c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", calidad);
}

/** `n` miniaturas repartidas por el video, para la franja que elige el tramo. Si algo se traba, las que alcanzó (o ninguna). */
export async function cuadrosDelVideo(video: VideoElegido, n = 8): Promise<string[]> {
  const v = videoEscondido(video.url);
  const fotos: string[] = [];
  try {
    await despertar(v);
    for (let i = 0; i < n; i++) fotos.push(await cuadro(v, ((i + 0.5) / n) * video.duracion, 160, 0.6));
    anotar(`miniaturas: ${fotos.length}`);
  } catch {
    anotar(`miniaturas: se quedó en ${fotos.length} de ${n}; se sigue sin ellas`, { mal: true });
  } finally {
    v.remove();
  }
  return fotos;
}

/** El formato que este navegador sabe grabar (mp4 primero: Safari y Chrome nuevos; si no, webm). */
function formatoGrabable(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || !("captureStream" in HTMLCanvasElement.prototype)) return null;
  const candidatos = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/** ¿Este navegador puede aligerar un video antes de subirlo? */
export const puedeAligerar = () => typeof window !== "undefined" && formatoGrabable() !== null;

/** ¿El original ya cumple para subirlo tal cual? */
const originalCumple = (video: VideoElegido) =>
  video.duracion <= VIDEO_MAX_S + 0.5 && video.archivo.size <= VIDEO_MAX_BYTES && TIPOS_VIDEO.includes(video.archivo.type);

/**
 * Deja listo el tramo [inicio, inicio + 30 s] del video: aligerado (si el navegador puede), con su portada. `alProgreso` va de 0
 * a 100 mientras se graba. Si grabar falla o se pasa del tiempo, el original si ya cumple; si no, ErrorClaro con el mensaje.
 */
export async function prepararVideo(video: VideoElegido, inicio: number, alProgreso: (p: number) => void): Promise<VideoListo> {
  const fin = Math.min(video.duracion, inicio + VIDEO_MAX_S);
  const duracionS = Math.max(1, Math.round(fin - inicio));
  const formato = formatoGrabable();
  anotar(`preparar: tramo ${inicio.toFixed(1)}–${fin.toFixed(1)} s, formato ${formato ?? "ninguno"}`);
  const v = videoEscondido(video.url);
  let portada: string | null = null;
  const planB = (por: string): VideoListo => {
    if (!originalCumple(video)) {
      anotar(`falló (${por}) y el original no cumple: ${video.duracion.toFixed(1)} s, ${(video.archivo.size / 1024 / 1024).toFixed(1)} MB, ${video.archivo.type || "sin tipo"}`, { mal: true });
      throw new ErrorClaro(NO_ALIGERA);
    }
    anotar(`plan B (${por}): se sube el original`);
    alProgreso(100);
    return { blob: video.archivo, duracionS: Math.max(1, Math.round(video.duracion)), portada };
  };
  try {
    try {
      await despertar(v);
      portada = await cuadro(v, inicio + 0.05, 1280);
      anotar("portada lista");
    } catch {
      anotar("sin portada (no hubo cuadro)", { mal: true });
      return planB("no hubo cuadro");
    }
    if (!formato) return planB("este navegador no graba video");
    let blob: Blob;
    const corte = new AbortController();
    try {
      blob = await conLimite(grabar(v, video, inicio, fin, formato, alProgreso, corte.signal), 2 * (fin - inicio) * 1000 + 15_000, SE_TRABO, "grabación");
    } catch (e) {
      corte.abort();
      if (!(e instanceof ErrorClaro)) anotar(`la grabación falló: ${String(e)}`, { mal: true });
      return planB("la grabación no terminó");
    }
    if (blob.size === 0) return planB("la grabación salió vacía");
    if (blob.size > VIDEO_MAX_BYTES) {
      anotar(`quedó de ${(blob.size / 1024 / 1024).toFixed(1)} MB`, { mal: true });
      throw new ErrorClaro("Quedó muy pesado. Prueba con un tramo más corto o un video más liviano.");
    }
    anotar(`terminó: ${(blob.size / 1024 / 1024).toFixed(1)} MB, ${blob.type}`);
    return { blob, duracionS, portada };
  } finally {
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
  }
}

/** Audio hacia la grabación, solo si el AudioContext queda corriendo; si no, null y el video se graba mudo. */
async function prepararAudio(v: HTMLVideoElement): Promise<{ contexto: AudioContext; pistas: MediaStreamTrack[] } | null> {
  const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contexto) {
    anotar("audio: no hay AudioContext; va mudo");
    return null;
  }
  let contexto: AudioContext | null = null;
  try {
    contexto = new Contexto();
    if (contexto.state !== "running") await conLimite(contexto.resume(), 1_500, SE_TRABO, "audio").catch(() => undefined);
    if (contexto.state !== "running") {
      anotar(`audio: el contexto quedó ${contexto.state}; va mudo`);
      await contexto.close().catch(() => undefined);
      return null;
    }
    const fuente = contexto.createMediaElementSource(v);
    const destino = contexto.createMediaStreamDestination();
    fuente.connect(destino);
    anotar("audio: corriendo");
    return { contexto, pistas: destino.stream.getAudioTracks() };
  } catch (e) {
    anotar(`audio: no se pudo (${String(e)}); va mudo`);
    await contexto?.close().catch(() => undefined);
    return null;
  }
}

async function grabar(
  v: HTMLVideoElement,
  video: VideoElegido,
  inicio: number,
  fin: number,
  formato: string,
  alProgreso: (p: number) => void,
  corte: AbortSignal,
): Promise<Blob> {
  const { ancho, alto } = medidas(v.videoWidth || video.ancho, v.videoHeight || video.alto);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;
  const flujo = lienzo.captureStream(30);

  const audio = await prepararAudio(v);
  if (audio) {
    for (const pista of audio.pistas) flujo.addTrack(pista);
    // Con el audio por WebAudio el video ya no suena por los parlantes: se desmuta para que llegue a la grabación.
    v.muted = false;
  }

  const duracion = fin - inicio;
  const bitsVideo = Math.max(600_000, Math.min(2_500_000, Math.floor((VIDEO_OBJETIVO_BYTES * 8) / duracion - AUDIO_BPS)));
  const grabadora = new MediaRecorder(flujo, { mimeType: formato, videoBitsPerSecond: bitsVideo, ...(audio ? { audioBitsPerSecond: AUDIO_BPS } : {}) });
  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => {
    if (e.data.size > 0) trozos.push(e.data);
  };
  const terminada = new Promise<void>((bien, mal) => {
    grabadora.onstop = () => bien();
    grabadora.onerror = (e) => mal(new Error(`MediaRecorder: ${(e as Event & { error?: Error }).error?.message ?? "error"}`));
  });

  let dibujando = true;
  let ultimo = -25;
  // Si se vence el tiempo, se corta todo: la grabadora se detiene y se sueltan el video y el AudioContext.
  corte.addEventListener("abort", () => {
    dibujando = false;
    v.pause();
    if (grabadora.state !== "inactive") grabadora.stop();
  });
  try {
    await irA(v, inicio);
    ctx.drawImage(v, 0, 0, ancho, alto);
    const dibujar = () => {
      if (!dibujando) return;
      ctx.drawImage(v, 0, 0, ancho, alto);
      const p = Math.min(99, ((v.currentTime - inicio) / duracion) * 100);
      alProgreso(p);
      if (p - ultimo >= 25) {
        ultimo = p;
        anotar(`grabando ${Math.floor(p)} %`);
      }
      if (v.currentTime >= fin || v.ended) {
        dibujando = false;
        v.pause();
        if (grabadora.state !== "inactive") grabadora.stop();
        return;
      }
      const conCuadros = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
      if (conCuadros.requestVideoFrameCallback) conCuadros.requestVideoFrameCallback(dibujar);
      else requestAnimationFrame(dibujar);
    };

    grabadora.start(1000);
    anotar(`grabando: ${ancho}×${alto}, ${Math.round(bitsVideo / 1000)} kb/s${audio ? " con audio" : " sin audio"}`);
    try {
      await conLimite(v.play(), LIMITE_CUADRO, SE_TRABO, "play");
    } catch {
      // Sin permiso para sonar (sin gesto reciente): se sigue mudo.
      anotar("play() con sonido no arrancó; se intenta mudo", { mal: true });
      v.muted = true;
      await conLimite(v.play(), LIMITE_CUADRO, SE_TRABO, "play mudo");
    }
    // Por si el video termina sin pasar por el último cuadro.
    v.addEventListener("ended", () => dibujar(), { once: true });
    dibujar();
    await terminada;
  } finally {
    dibujando = false;
    v.pause();
    if (grabadora.state !== "inactive") grabadora.stop();
    for (const pista of flujo.getTracks()) pista.stop();
    await audio?.contexto.close().catch(() => undefined);
  }
  alProgreso(100);
  return new Blob(trozos, { type: formato.split(";")[0] });
}
