// Video de producto en el teléfono (docs/12 §3; docs/prompts/producto-panel.md §2.2): se elige un tramo de hasta 30 s y se
// aligera ANTES de subir: 720p como máximo, apuntando a unos 8 MB y nunca más de 15 MB. Camino: MediaRecorder grabando un
// <canvas> (captureStream) donde se dibuja el video reducido, con el audio por WebAudio. Si el navegador no puede, se sube el
// original solo si ya cumple (≤ 30 s y ≤ 15 MB). La portada es el primer cuadro del tramo, en JPG.

import { ErrorClaro } from "./data/errores";

export const VIDEO_MAX_S = 30;
export const VIDEO_MAX_BYTES = 15 * 1024 * 1024;
const VIDEO_OBJETIVO_BYTES = 8 * 1024 * 1024;
/** Lado corto máximo (720p). */
const LADO_CORTO = 720;
const AUDIO_BPS = 96_000;
export const TIPOS_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

export type VideoElegido = { archivo: File; url: string; duracion: number; ancho: number; alto: number };
export type VideoListo = { blob: Blob; duracionS: number; portada: string };

/** Un <video> escondido en la página (iOS no reproduce uno que no está en el documento). */
function videoEscondido(url: string): HTMLVideoElement {
  const v = document.createElement("video");
  v.src = url;
  v.preload = "auto";
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.crossOrigin = "anonymous";
  Object.assign(v.style, { position: "fixed", left: "-9999px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
  document.body.appendChild(v);
  return v;
}

const esperar = (v: HTMLVideoElement, evento: string) =>
  new Promise<void>((bien, mal) => {
    const ok = () => {
      v.removeEventListener("error", ko);
      bien();
    };
    const ko = () => {
      v.removeEventListener(evento, ok);
      mal(new ErrorClaro("Ese video no quiso abrir. Prueba con otro."));
    };
    v.addEventListener(evento, ok, { once: true });
    v.addEventListener("error", ko, { once: true });
  });

async function irA(v: HTMLVideoElement, t: number) {
  if (Math.abs(v.currentTime - t) < 0.01 && v.readyState >= 2) return;
  const listo = esperar(v, "seeked");
  v.currentTime = t;
  await listo;
}

/** Lee la duración y el tamaño del video elegido. */
export async function leerVideo(archivo: File): Promise<VideoElegido> {
  const url = URL.createObjectURL(archivo);
  const v = videoEscondido(url);
  try {
    if (v.readyState < 1) await esperar(v, "loadedmetadata");
    let duracion = v.duration;
    // Algunos webm no traen la duración hasta llegar al final.
    if (!Number.isFinite(duracion)) {
      await irA(v, 1e6);
      duracion = v.duration;
    }
    if (!Number.isFinite(duracion) || duracion <= 0) throw new ErrorClaro("Ese video no quiso abrir. Prueba con otro.");
    return { archivo, url, duracion, ancho: v.videoWidth, alto: v.videoHeight };
  } catch (e) {
    URL.revokeObjectURL(url);
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

/** `n` miniaturas repartidas por el video, para la franja que elige el tramo. */
export async function cuadrosDelVideo(video: VideoElegido, n = 8): Promise<string[]> {
  const v = videoEscondido(video.url);
  try {
    if (v.readyState < 2) await esperar(v, "loadeddata");
    const fotos: string[] = [];
    for (let i = 0; i < n; i++) fotos.push(await cuadro(v, ((i + 0.5) / n) * video.duracion, 160, 0.6));
    return fotos;
  } finally {
    v.remove();
  }
}

/** El formato que este navegador sabe grabar (mp4 primero: Safari y Chrome nuevos; si no, webm). */
function formatoGrabable(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || !("captureStream" in HTMLCanvasElement.prototype)) return null;
  const candidatos = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/** ¿Este navegador puede aligerar un video antes de subirlo? */
export const puedeAligerar = () => typeof window !== "undefined" && formatoGrabable() !== null;

/**
 * Deja listo el tramo [inicio, inicio + 30 s] del video: aligerado (si el navegador puede), con su portada. `alProgreso` va de 0
 * a 100 mientras se graba. Lanza ErrorClaro con un mensaje para la dueña si no se puede.
 */
export async function prepararVideo(video: VideoElegido, inicio: number, alProgreso: (p: number) => void): Promise<VideoListo> {
  const fin = Math.min(video.duracion, inicio + VIDEO_MAX_S);
  const duracionS = Math.max(1, Math.round(fin - inicio));
  const formato = formatoGrabable();
  const v = videoEscondido(video.url);
  try {
    if (v.readyState < 2) await esperar(v, "loadeddata");
    const portada = await cuadro(v, inicio + 0.05, 1280);
    if (!formato) {
      // Sin forma de recomprimir: el original solo si ya cumple.
      const cumple = video.duracion <= VIDEO_MAX_S + 0.5 && video.archivo.size <= VIDEO_MAX_BYTES && TIPOS_VIDEO.includes(video.archivo.type);
      if (!cumple) throw new ErrorClaro("Este teléfono no puede aligerar el video. Súbelo de 30 s o menos y que pese menos de 15 MB.");
      alProgreso(100);
      return { blob: video.archivo, duracionS: Math.max(1, Math.round(video.duracion)), portada };
    }
    const blob = await grabar(v, video, inicio, fin, formato, alProgreso);
    if (blob.size > VIDEO_MAX_BYTES) throw new ErrorClaro("Quedó muy pesado. Prueba con un tramo más corto o un video más liviano.");
    return { blob, duracionS, portada };
  } finally {
    v.remove();
  }
}

async function grabar(v: HTMLVideoElement, video: VideoElegido, inicio: number, fin: number, formato: string, alProgreso: (p: number) => void): Promise<Blob> {
  const { ancho, alto } = medidas(v.videoWidth || video.ancho, v.videoHeight || video.alto);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;
  const flujo = lienzo.captureStream(30);

  // Audio: el video pasa por WebAudio hacia la grabación (y no a los parlantes). Si no se puede, va sin audio.
  let audio: AudioContext | null = null;
  try {
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Contexto) {
      audio = new Contexto();
      const fuente = audio.createMediaElementSource(v);
      const destino = audio.createMediaStreamDestination();
      fuente.connect(destino);
      for (const pista of destino.stream.getAudioTracks()) flujo.addTrack(pista);
    }
  } catch {
    audio = null;
  }

  const duracion = fin - inicio;
  const bitsVideo = Math.max(600_000, Math.min(2_500_000, Math.floor((VIDEO_OBJETIVO_BYTES * 8) / duracion - AUDIO_BPS)));
  const grabadora = new MediaRecorder(flujo, { mimeType: formato, videoBitsPerSecond: bitsVideo, audioBitsPerSecond: AUDIO_BPS });
  const trozos: Blob[] = [];
  grabadora.ondataavailable = (e) => {
    if (e.data.size > 0) trozos.push(e.data);
  };
  const terminada = new Promise<void>((bien) => (grabadora.onstop = () => bien()));

  await irA(v, inicio);
  ctx.drawImage(v, 0, 0, ancho, alto);
  let dibujando = true;
  const dibujar = () => {
    if (!dibujando) return;
    ctx.drawImage(v, 0, 0, ancho, alto);
    alProgreso(Math.min(99, ((v.currentTime - inicio) / duracion) * 100));
    if (v.currentTime >= fin || v.ended) {
      dibujando = false;
      v.pause();
      grabadora.stop();
      return;
    }
    const conCuadros = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (conCuadros.requestVideoFrameCallback) conCuadros.requestVideoFrameCallback(dibujar);
    else requestAnimationFrame(dibujar);
  };

  grabadora.start(1000);
  try {
    await audio?.resume();
    await v.play();
  } catch {
    // Sin permiso para sonar (sin gesto reciente): se graba mudo.
    v.muted = true;
    await v.play();
  }
  // Por si el video termina sin pasar por el último cuadro.
  v.addEventListener("ended", () => dibujar(), { once: true });
  dibujar();
  await terminada;
  await audio?.close().catch(() => undefined);
  alProgreso(100);
  return new Blob(trozos, { type: formato.split(";")[0] });
}
