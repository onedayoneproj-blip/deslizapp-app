// Imagen (PNG vertical 1080×1350) de una promo para compartir en WhatsApp, estados e historias.
// Se dibuja en un <canvas> en el navegador (no hay servidor con los datos). Solo cliente.
// Lleva la MARCA DE LA TIENDA (colores y fuentes de "Mi marca"), como el componente CuponTienda.

import { datosCupon, type DatosCupon } from "./cupon";
import { iniciales } from "./formato";
import { cargarFuentesMarca, familiaTexto, familiaTitulo } from "./fuentes-marca";
import { coloresCupon, contraste, hexARgb, rgbAHex, TEXTO_OSCURO, type Marca } from "./marca";
import type { EstadoPromo, Producto, Promo, Tienda } from "./types";

const ANCHO = 1080;
const ALTO = 1350;
const PESO_MAXIMO = 400 * 1024;

/** Línea diminuta al pie de la imagen. Vacía ("") para quitarla. */
export const PIE_IMAGEN = "Hecho con Deslizapp";

/** Fondo de la imagen: el color principal de la marca muy aclarado (mezclado con blanco). */
export function fondoClaro(principal: string): string {
  const [r, g, b] = hexARgb(principal);
  const m = (c: number) => Math.round(c * 0.1 + 255 * 0.9);
  return rgbAHex([m(r), m(g), m(b)]);
}

type Colores = ReturnType<typeof coloresCupon>;
type Fuentes = { display: string; texto: string };

const alfa = (hex: string, a: number) => {
  const [r, g, b] = hexARgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolver) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = src;
  });
}

/** Recorta con "…" hasta que quepa en `ancho`. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** El cupón (opción C: referencias/promos-cupon/opcion-c-ticket-verde.dc.html) dibujado a escala `k`. */
function dibujarCupon(ctx: CanvasRenderingContext2D, d: DatosCupon, col: Colores, x: number, y: number, k: number, f: Fuentes) {
  const w = 350 * k;
  const h = 148 * k;
  // Cupón en un lienzo aparte para poder recortar las muescas (destination-out) y que la sombra siga la forma
  const aparte = document.createElement("canvas");
  aparte.width = Math.ceil(w);
  aparte.height = Math.ceil(h);
  const c = aparte.getContext("2d")!;
  c.fillStyle = col.fondo;
  rectRedondo(c, 0, 0, w, h, 18 * k);
  c.fill();
  c.globalCompositeOperation = "destination-out";
  for (const cy of [0, h]) {
    c.beginPath();
    c.arc(116 * k, cy, 10 * k, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = "source-over";

  // Talón
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.font = `700 ${44 * k}px ${f.display}`;
  c.fillStyle = col.acento;
  c.fillText(`${d.porcentaje}%`, 58 * k, h / 2 + 8 * k);
  c.font = `700 ${10 * k}px ${f.texto}`;
  c.fillStyle = alfa(col.texto, 0.8);
  c.letterSpacing = `${1 * k}px`;
  c.fillText(d.bajoPorcentaje, 58 * k, h / 2 + 24 * k);
  c.letterSpacing = "0px";
  // Perforación
  c.strokeStyle = alfa(col.texto, 0.4);
  c.lineWidth = 2 * k;
  c.setLineDash([6 * k, 5 * k]);
  c.beginPath();
  c.moveTo(116 * k, 18 * k);
  c.lineTo(116 * k, h - 18 * k);
  c.stroke();
  c.setLineDash([]);
  // Cuerpo
  const cx = 142 * k;
  const ancho = w - cx - 18 * k;
  c.textAlign = "left";
  c.fillStyle = alfa(col.texto, 0.85);
  c.font = `700 ${11 * k}px ${f.texto}`;
  c.letterSpacing = `${1.1 * k}px`;
  c.fillText(d.tipo.toUpperCase(), cx, 36 * k);
  c.letterSpacing = "0px";
  if (d.esCodigo) {
    c.font = `600 ${20 * k}px ${f.display}`;
    c.letterSpacing = `${1.6 * k}px`;
    const t = ajustar(c, d.titulo, ancho - 28 * k);
    const tw = c.measureText(t).width;
    c.strokeStyle = col.acento;
    c.lineWidth = 2 * k;
    c.setLineDash([6 * k, 4 * k]);
    rectRedondo(c, cx, 44 * k, tw + 24 * k, 36 * k, 10 * k);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = col.texto;
    c.fillText(t, cx + 12 * k, 69 * k);
    c.letterSpacing = "0px";
  } else {
    c.font = `600 ${21 * k}px ${f.display}`;
    c.fillStyle = col.texto;
    c.fillText(ajustar(c, d.titulo, ancho), cx, 68 * k);
  }
  c.font = `400 ${14 * k}px ${f.texto}`;
  c.fillStyle = alfa(col.texto, 0.85);
  c.fillText(ajustar(c, d.detalle, ancho), cx, 98 * k);
  c.font = `600 ${13 * k}px ${f.texto}`;
  c.fillStyle = alfa(col.texto, 0.92);
  const fechas = d.aviso ? ajustar(c, d.fechas, ancho - c.measureText(d.aviso).width - 12 * k) : ajustar(c, d.fechas, ancho);
  c.fillText(fechas, cx, 124 * k);
  if (d.aviso) {
    c.textAlign = "right";
    c.fillText(d.aviso, w - 18 * k, 124 * k);
  }

  ctx.save();
  ctx.shadowColor = alfa(col.fondo, 0.28);
  ctx.shadowBlur = 12 * k;
  ctx.shadowOffsetY = 8 * k;
  ctx.drawImage(aparte, x, y, w, h);
  ctx.restore();
}

export type EntradaImagenPromo = {
  promo: Promo;
  estado: EstadoPromo;
  tienda: Pick<Tienda, "nombre" | "logoUrl">;
  /** Mi marca de la tienda (colores y estilo de letra). */
  marca: Marca;
  producto?: Producto;
  productosDeColeccion?: number;
};

export type ImagenPromo = {
  /** PNG (o JPEG si el PNG pasara de ~400 KB), listo para compartir. */
  blob: Blob;
  /** JPEG de alta calidad para el PDF (se pide al exportar, no antes). */
  jpegParaPdf: () => Promise<Blob>;
};

/** Genera el PNG (o un JPEG si el PNG pasara de ~400 KB). Espera a las tipografías de marca. */
export async function generarImagenPromo({ promo, estado, tienda, marca, producto, productosDeColeccion = 0 }: EntradaImagenPromo): Promise<ImagenPromo> {
  // Antes de dibujar, las fuentes del estilo de la tienda tienen que estar cargadas (si no, sale letra genérica)
  await cargarFuentesMarca(marca.estilo);
  const f: Fuentes = { display: familiaTitulo(marca.estilo), texto: familiaTexto(marca.estilo) };
  const col = coloresCupon(marca);
  // Textos sobre el fondo crema: el principal si se lee bien; si no, oscuro
  const papel = fondoClaro(col.fondo);
  const tinta = contraste(col.fondo, papel) >= 4.5 ? col.fondo : TEXTO_OSCURO;
  const logo = tienda.logoUrl ? await cargarImagen(tienda.logoUrl) : null;
  const d = datosCupon(promo, estado, { producto, productosDeColeccion });

  const dibujar = (conLogo: boolean) => {
    const lienzo = document.createElement("canvas");
    lienzo.width = ANCHO;
    lienzo.height = ALTO;
    const ctx = lienzo.getContext("2d")!;
    // Fondo claro derivado de la marca, con dos manchas suaves
    ctx.fillStyle = papel;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = alfa(col.acento, 0.22);
    ctx.beginPath();
    ctx.arc(1010, 250, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = alfa(col.fondo, 0.1);
    ctx.beginPath();
    ctx.arc(60, 1130, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cabecera: logo o iniciales + nombre de la tienda
    const lado = 132;
    const lx = 90;
    const ly = 110;
    if (conLogo && logo) {
      ctx.save();
      rectRedondo(ctx, lx, ly, lado, lado, 41);
      ctx.clip();
      ctx.drawImage(logo, lx, ly, lado, lado);
      ctx.restore();
    } else {
      ctx.fillStyle = col.fondo;
      rectRedondo(ctx, lx, ly, lado, lado, 41);
      ctx.fill();
      ctx.fillStyle = col.acento;
      ctx.font = `700 54px ${f.display}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(iniciales(tienda.nombre), lx + lado / 2, ly + lado / 2 + 3);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = tinta;
    ctx.font = `700 58px ${f.display}`;
    ctx.fillText(ajustar(ctx, tienda.nombre, ANCHO - lx - lado - 40 - 90), lx + lado + 36, ly + lado / 2 + 20);

    // Frase corta arriba del cupón
    ctx.font = `600 50px ${f.display}`;
    ctx.textAlign = "center";
    ctx.fillText(promo.tipo === "codigo" ? "Una promo para ti" : "Mira lo que tenemos", ANCHO / 2, 470);

    // Cupón grande, centrado
    const k = 900 / 350;
    dibujarCupon(ctx, d, col, (ANCHO - 900) / 2, 540, k, f);

    // Cómo usarla
    ctx.fillStyle = tinta;
    ctx.font = `600 44px ${f.texto}`;
    ctx.fillText(promo.tipo === "codigo" ? "Escribe el código al hacer tu pedido" : "Ya la ves en nuestro catálogo", ANCHO / 2, 1010);

    // Pie discreto
    if (PIE_IMAGEN) {
      ctx.globalAlpha = 0.55;
      ctx.font = `600 30px ${f.texto}`;
      ctx.fillText(PIE_IMAGEN, ANCHO / 2, 1260);
      ctx.globalAlpha = 1;
    }
    return lienzo;
  };

  const aBlob = (lienzo: HTMLCanvasElement, tipo: string, calidad?: number) =>
    new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, tipo, calidad));

  let lienzo = dibujar(true);
  let blob: Blob | null;
  try {
    blob = await aBlob(lienzo, "image/png");
  } catch {
    // El logo "ensució" el canvas (CORS): se cae a las iniciales
    lienzo = dibujar(false);
    blob = await aBlob(lienzo, "image/png");
  }
  if (blob && blob.size > PESO_MAXIMO) blob = (await aBlob(lienzo, "image/jpeg", 0.92)) ?? blob;
  if (!blob) throw new Error("No se pudo generar la imagen.");
  const final = lienzo;
  return {
    blob,
    jpegParaPdf: async () => (await aBlob(final, "image/jpeg", 0.95)) ?? blob!,
  };
}
