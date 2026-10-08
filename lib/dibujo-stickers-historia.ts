// Dibujo de los stickers de la historia. Un solo dibujo para todo: la hoja, «Ajustar foto» y la imagen 1080×1920 usan el mismo mapa
// de bits, así que se ven igual. Los ilustrados (WebP en public/stickers/) se pintan con su sombra; «Últimas N» se dibuja con su texto
// (borde blanco grueso, sombra, forma propia). Solo cliente (usa <canvas>).

import type { IdSticker, IdStickerImagen } from "./catalogo-stickers";

/** Grosor del borde blanco y margen para la sombra, en píxeles de la imagen de 1080. */
const BORDE = 14;
const MARGEN = 46;
const AMARILLO = "#f2b53a";
/** La etiqueta con agujero (caja de 90×37). */
const ETIQUETA = "M14,0 H84 Q90,0 90,6 V31 Q90,37 84,37 H14 L0,18.5 Z";

export type SelloDibujado = { lienzo: HTMLCanvasElement; ancho: number; alto: number };

/** Texto centrado que baja de tamaño hasta caber en `ancho`. */
function textoCentrado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, tamano: number, familia: string, color: string) {
  let t = tamano;
  ctx.font = `700 ${t}px ${familia}`;
  while (t > 18 && ctx.measureText(texto).width > ancho) {
    t -= 2;
    ctx.font = `700 ${t}px ${familia}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x, y);
}

/** Ancho y alto máximos de un sticker ilustrado a tamaño 1, en píxeles de la historia (~32 % del ancho; el origen mide ~350 px). */
export const ANCHO_STICKER_IMAGEN = 346;
export const ALTO_MAX_STICKER_IMAGEN = 380;

/** Dibuja un sticker ilustrado (sin girar) con su sombra, en un lienzo propio del tamaño de la imagen más el margen de la sombra. */
function dibujarStickerImagen(img: HTMLImageElement): SelloDibujado {
  const e = Math.min(ANCHO_STICKER_IMAGEN / img.naturalWidth, ALTO_MAX_STICKER_IMAGEN / img.naturalHeight);
  const w = Math.round(img.naturalWidth * e);
  const h = Math.round(img.naturalHeight * e);
  const ancho = w + MARGEN * 2;
  const alto = h + MARGEN * 2;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, MARGEN, MARGEN, w, h);
  return { lienzo, ancho, alto };
}

/** Dibuja un sticker (sin girar). `display` es la fuente Fredoka de la marca; `imagen` es el WebP ya cargado de los ilustrados. */
export function dibujarSticker(id: IdSticker, texto: string, display: string, imagen?: HTMLImageElement | null): SelloDibujado {
  if (id !== "ultimas") {
    if (!imagen) throw new Error(`Falta la imagen del sticker ${id}.`);
    return dibujarStickerImagen(imagen);
  }
  return dibujarUltimas(texto, display);
}

/** El sticker es un WebP ilustrado (hay que cargarlo antes de dibujarlo). */
export const necesitaImagen = (id: IdSticker): id is IdStickerImagen => id !== "ultimas";

function dibujarUltimas(texto: string, display: string): SelloDibujado {
  const forma = { w: 378, h: 155 };
  const ancho = Math.ceil(forma.w + (MARGEN + BORDE) * 2);
  const alto = Math.ceil(forma.h + (MARGEN + BORDE) * 2);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;
  ctx.translate(ancho / 2, alto / 2);

  const e = 4.2;
  const forma2D = new Path2D();
  forma2D.addPath(new Path2D(ETIQUETA), new DOMMatrix().translate((-90 * e) / 2, (-37 * e) / 2).scale(e));

  // Borde blanco (trazo grueso con la sombra) y, encima, el relleno
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  ctx.lineJoin = "round";
  ctx.lineWidth = BORDE * 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke(forma2D);
  ctx.fillStyle = "#fff";
  ctx.fill(forma2D);
  ctx.restore();
  ctx.fillStyle = AMARILLO;
  ctx.fill(forma2D);

  // El agujero de la etiqueta
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-189 + 12.6 * 4.2, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  textoCentrado(ctx, texto, 24, 3, 250, 58, display, "#3a2600");
  return { lienzo, ancho, alto };
}
