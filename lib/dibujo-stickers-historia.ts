// Dibujo de los stickers de la historia (borde blanco grueso, sombra, forma propia). Un solo dibujo para todo: la hoja, «Ajustar foto»
// y la imagen 1080×1920 usan el mismo mapa de bits, así que se ven igual. Solo cliente (usa <canvas>).

import type { IdSticker } from "./stickers-historia";

/** Grosor del borde blanco y margen para la sombra, en píxeles de la imagen de 1080. */
const BORDE = 14;
const MARGEN = 46;
const NARANJA = "#f26b3a";
const AMARILLO = "#f2b53a";
const ROSA = "#f4c6d4";
const BOSQUE = "#174b3a";
/** El corazón del dibujo (caja de 100) y la etiqueta con agujero (caja de 90×37). */
const CORAZON = "M50,86 C20,64 6,48 6,30 C6,16 17,6 30,6 C39,6 46,11 50,18 C54,11 61,6 70,6 C83,6 94,16 94,30 C94,48 80,64 50,86 Z";
const ETIQUETA = "M14,0 H84 Q90,0 90,6 V31 Q90,37 84,37 H14 L0,18.5 Z";

export type SelloDibujado = { lienzo: HTMLCanvasElement; ancho: number; alto: number };

function estrella(puntas: number, radioMayor: number, radioMenor: number): Path2D {
  const p = new Path2D();
  for (let i = 0; i < puntas * 2; i++) {
    const a = (Math.PI * i) / puntas - Math.PI / 2;
    const r = i % 2 === 0 ? radioMayor : radioMenor;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

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

/** Dibuja un sticker (sin inclinar) en un lienzo propio, del tamaño de su forma más el margen de la sombra. `display` es la fuente Fredoka de la marca. */
export function dibujarSticker(id: IdSticker, texto: string, display: string): SelloDibujado {
  const forma = { w: 300, h: 300 };
  if (id === "ultimas") Object.assign(forma, { w: 378, h: 155 });
  if (id === "aaah") Object.assign(forma, { w: 300, h: 270 });
  const ancho = Math.ceil(forma.w + (MARGEN + BORDE) * 2);
  const alto = Math.ceil(forma.h + (MARGEN + BORDE) * 2);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d")!;
  ctx.translate(ancho / 2, alto / 2);

  // Forma centrada en (0, 0) y la tinta que lleva
  let forma2D: Path2D;
  let relleno: string;
  if (id === "nuevo") {
    forma2D = estrella(12, 138, 112);
    relleno = NARANJA;
  } else if (id === "ultimas") {
    const e = 4.2;
    const p = new Path2D();
    p.addPath(new Path2D(ETIQUETA), new DOMMatrix().translate((-90 * e) / 2, (-37 * e) / 2).scale(e));
    forma2D = p;
    relleno = AMARILLO;
  } else {
    const e = 3.2;
    const p = new Path2D();
    // La caja del corazón es de 6 a 94 de ancho y de 6 a 86 de alto: centro en (50, 46)
    p.addPath(new Path2D(CORAZON), new DOMMatrix().scale(e).translate(-50, -46));
    forma2D = p;
    relleno = ROSA;
  }

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
  ctx.fillStyle = relleno;
  ctx.fill(forma2D);

  if (id === "nuevo") {
    textoCentrado(ctx, texto, 0, 4, 190, 62, display, "#fff");
  } else if (id === "ultimas") {
    // El agujero de la etiqueta
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-189 + 12.6 * 4.2, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    textoCentrado(ctx, texto, 24, 3, 250, 58, display, "#3a2600");
  } else {
    textoCentrado(ctx, texto, 0, -10, 200, 84, display, BOSQUE);
  }
  return { lienzo, ancho, alto };
}
