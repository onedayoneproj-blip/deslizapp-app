// Imagen (1080×1920) de un producto para una historia de WhatsApp o Instagram. Se dibuja en un <canvas> del teléfono: nada sale a un
// servidor. Los dibujos están en referencias/compartir-historia/. Solo cliente.

import { formatearPesos, iniciales } from "./formato";
import { ENCUADRE_INICIAL, rectFoto, rectFondo, type AjusteFoto } from "./encuadre-historia";
import type { DatosHistoria, DireccionHistoria } from "./historia";
import { urlStickerImagen } from "./catalogo-stickers";
import { dibujarSticker, necesitaImagen } from "./dibujo-stickers-historia";
import { limitarSticker, type IdSticker, type StickerPuesto } from "./stickers-historia";

export const ANCHO_HISTORIA = 1080;
export const ALTO_HISTORIA = 1920;

const BOSQUE = "#174b3a";
const SUAVE = "#4f6a5e";
const MANDARINA = "#ff834f";
/** El corazón de los «aaah» de la app (el mismo trazo de components/tienda/iconos.tsx, caja de 24). */
const CORAZON_AAAH = "M12 20.3s-7.3-4.4-9.2-8.9C1.3 7.9 3.4 4.6 6.8 4.6c2.1 0 3.5 1.1 5.2 3 1.7-1.9 3.1-3 5.2-3 3.4 0 5.5 3.3 4 6.8-1.9 4.5-9.2 8.9-9.2 8.9z";
const BORDE = "#e7dcc8";

type Fuentes = { display: string; texto: string };

export type EntradaImagenHistoria = {
  datos: DatosHistoria;
  /** La foto principal del producto. */
  foto: string;
  /** Logo de la tienda; sin él, sus iniciales. */
  logoUrl: string | null;
  nombreTienda: string;
  /** Dirección del catálogo en dos partes (dominio y ruta), sin https. */
  direccion: DireccionHistoria | null;
  /** Cómo va la foto: con o sin fondo difuminado y su encuadre. Sin esto, relleno centrado. */
  ajuste?: AjusteFoto;
  /** Stickers puestos (posición y tamaño en fracción de la imagen). Los dibuja igual que la hoja y «Ajustar foto». */
  stickers?: StickerPuesto[];
  /** Solo la tarjeta, sobre un lienzo transparente: la guía de la vista «Ajustar foto». */
  soloTarjeta?: boolean;
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

/** Lo que mide la foto (para el encuadre y para decidir el fondo difuminado por defecto); null si no se pudo leer. */
export async function medirFoto(src: string): Promise<{ ancho: number; alto: number } | null> {
  const img = await cargarImagen(src);
  return img ? medidaDe(img) : null;
}

/** Las fuentes de la marca (Fredoka y Figtree, las de la app) listas para dibujar. Sin internet usa las de respaldo. */
export async function fuentesListas(): Promise<Fuentes> {
  const estilo = getComputedStyle(document.documentElement);
  const familia = (variable: string, respaldo: string) => estilo.getPropertyValue(variable).trim() || respaldo;
  const display = `${familia("--font-fredoka", "Fredoka")}, ui-rounded, system-ui, sans-serif`;
  const texto = `${familia("--font-figtree", "Figtree")}, system-ui, sans-serif`;
  await Promise.all([
    ...[600, 700].map((p) => document.fonts.load(`${p} 48px ${display}`, "Aa0RD$")),
    ...[400, 700, 800].map((p) => document.fonts.load(`${p} 32px ${texto}`, "Aa0Ññé")),
  ]).catch(() => undefined);
  return { display, texto };
}

/** Parte el texto en hasta `max` líneas que caben en `ancho`; si sobra, la última termina en «…». */
function partirLineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, max: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (let i = 0; i < palabras.length; i++) {
    const prueba = actual ? `${actual} ${palabras[i]}` : palabras[i]!;
    if (ctx.measureText(prueba).width <= ancho || !actual) {
      actual = prueba;
      continue;
    }
    lineas.push(actual);
    actual = palabras[i]!;
    if (lineas.length === max - 1) {
      actual = palabras.slice(i).join(" ");
      break;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.map((l, i) => (i === lineas.length - 1 ? recortar(ctx, l, ancho) : l));
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

const medidaDe = (img: HTMLImageElement) => ({ ancho: img.naturalWidth || img.width, alto: img.naturalHeight || img.height });
const MARCO = { ancho: ANCHO_HISTORIA, alto: ALTO_HISTORIA };

let filtroCanvas: boolean | null = null;
/** ¿Este navegador dibuja `ctx.filter` de verdad? (Safari de iPhone lo ignora en versiones viejas: se prueba con un píxel, no con la propiedad.) */
function filtroDisponible(): boolean {
  if (filtroCanvas !== null) return filtroCanvas;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 12;
    const x = c.getContext("2d")!;
    x.filter = "blur(3px)";
    x.fillStyle = "#fff";
    x.fillRect(5, 5, 2, 2);
    filtroCanvas = x.getImageData(2, 6, 1, 1).data[3]! > 0;
  } catch {
    filtroCanvas = false;
  }
  return filtroCanvas;
}

/** Foto ampliada y desenfocada llenando todo el lienzo. Con `ctx.filter` si anda; si no, se achica mucho y se vuelve a agrandar por pasos. */
function dibujarFondoDifuminado(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const r = rectFondo(MARCO, medidaDe(img));
  if (filtroDisponible()) {
    ctx.save();
    ctx.filter = "blur(48px)";
    ctx.drawImage(img, r.x, r.y, r.ancho, r.alto);
    ctx.restore();
  } else {
    // Respaldo: bajar a ~1/32 por mitades y subir por mitades (cada paso suaviza)
    let w = Math.round(r.ancho);
    let h = Math.round(r.alto);
    let fuente: CanvasImageSource = img;
    const pasos: number[] = [];
    while (w / 2 >= ANCHO_HISTORIA / 32) {
      w = Math.round(w / 2);
      h = Math.round(h / 2);
      pasos.push(w);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d")!;
      x.imageSmoothingQuality = "high";
      x.drawImage(fuente, 0, 0, w, h);
      fuente = c;
    }
    for (let i = 0; i < pasos.length; i++) {
      w = Math.round(w * 2);
      h = Math.round(h * 2);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d")!;
      x.imageSmoothingQuality = "high";
      x.drawImage(fuente, 0, 0, w, h);
      fuente = c;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(fuente, r.x, r.y, r.ancho, r.alto);
  }
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(0, 0, ANCHO_HISTORIA, ALTO_HISTORIA);
}

/** La foto con su encuadre: llena la historia (relleno) o va entera sobre el fondo difuminado. */
function dibujarFoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, ajuste: AjusteFoto) {
  if (ajuste.difuminado) dibujarFondoDifuminado(ctx, img);
  const r = rectFoto(ajuste.encuadre, MARCO, medidaDe(img), ajuste.difuminado);
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, r.x, r.y, r.ancho, r.alto);
  ctx.restore();
}

/** Escribe una línea que cabe en `ancho`: baja el tamaño de la letra hasta `minimo` antes de cortar con «…». */
function lineaQueCabe(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number, peso: number, tamano: number, minimo: number, familia: string) {
  let t = tamano;
  ctx.font = `${peso} ${t}px ${familia}`;
  while (t > minimo && ctx.measureText(texto).width > ancho) {
    t -= 1;
    ctx.font = `${peso} ${t}px ${familia}`;
  }
  ctx.fillText(recortar(ctx, texto, ancho), x, y);
}

type Pastilla = { texto: string; color: string | null; ancho: number };

/** La foto de la tienda en círculo; la miniatura del aaah de deslizapp abajo a la derecha, separada por un recorte (se ve la tarjeta). */
function dibujarTienda(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, logo: HTMLImageElement | null, nombre: string, f: Fuentes) {
  const aparte = document.createElement("canvas");
  aparte.width = aparte.height = d;
  const c = aparte.getContext("2d")!;
  c.beginPath();
  c.arc(d / 2, d / 2, d / 2, 0, Math.PI * 2);
  c.clip();
  if (logo) {
    const lado = Math.min(logo.naturalWidth || logo.width, logo.naturalHeight || logo.height);
    c.drawImage(logo, ((logo.naturalWidth || logo.width) - lado) / 2, ((logo.naturalHeight || logo.height) - lado) / 2, lado, lado, 0, 0, d, d);
  } else {
    const g = c.createRadialGradient(d * 0.4, d * 0.35, 0, d * 0.4, d * 0.35, d * 0.8);
    g.addColorStop(0, "#2f6b55");
    g.addColorStop(1, BOSQUE);
    c.fillStyle = g;
    c.fillRect(0, 0, d, d);
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `600 ${d * 0.34}px ${f.display}`;
    c.fillText(iniciales(nombre), d / 2, d / 2 + d * 0.02);
  }
  // Recorte (no borde) donde va la miniatura
  const m = d * 0.38;
  const cx = d * 0.82;
  c.globalCompositeOperation = "destination-out";
  c.beginPath();
  c.arc(cx, cx, m / 2 + d * 0.035, 0, Math.PI * 2);
  c.fill();
  ctx.drawImage(aparte, x, y);

  // Miniatura de deslizapp: el corazón mandarina de los «aaah» sobre un círculo verde bosque de la marca
  const mx = x + cx;
  const my = y + cx;
  ctx.fillStyle = BOSQUE;
  ctx.beginPath();
  ctx.arc(mx, my, m / 2, 0, Math.PI * 2);
  ctx.fill();
  const e = (m * 0.62) / 24;
  ctx.save();
  ctx.translate(mx - 12 * e, my - 12.4 * e);
  ctx.scale(e, e);
  ctx.fillStyle = MANDARINA;
  ctx.fill(new Path2D(CORAZON_AAAH));
  ctx.restore();
}

const cacheStickers = new Map<string, Promise<HTMLImageElement | null>>();

/** El WebP de un sticker ilustrado, del propio sitio (mismo origen: no ensucia el lienzo). Se guarda para no pedirlo dos veces. */
function imagenSticker(id: IdSticker): Promise<HTMLImageElement | null> {
  if (!necesitaImagen(id)) return Promise.resolve(null);
  let p = cacheStickers.get(id);
  if (!p) {
    p = cargarImagen(urlStickerImagen(id)).then((img) => {
      if (!img) cacheStickers.delete(id);
      return img;
    });
    cacheStickers.set(id, p);
  }
  return p;
}

/** Carga las imágenes de los stickers ilustrados que se van a dibujar; falla si alguna no llega. */
async function imagenesCargadas(ids: IdSticker[]): Promise<Map<IdSticker, HTMLImageElement | null>> {
  const unicos = [...new Set(ids)];
  const imgs = await Promise.all(unicos.map(imagenSticker));
  const m = new Map<IdSticker, HTMLImageElement | null>();
  unicos.forEach((id, i) => {
    if (necesitaImagen(id) && !imgs[i]) throw new Error(`No pudimos leer el sticker ${id}.`);
    m.set(id, imgs[i]!);
  });
  return m;
}

/** Los stickers como imágenes sueltas (PNG con sombra), para la hoja y «Ajustar foto»: el mismo dibujo que sale en la imagen final. */
export async function imagenesStickers(items: { id: IdSticker; texto: string }[]): Promise<Record<string, { url: string; ancho: number; alto: number }>> {
  const [f, imgs] = await Promise.all([fuentesListas(), imagenesCargadas(items.map((i) => i.id))]);
  const salida: Record<string, { url: string; ancho: number; alto: number }> = {};
  for (const { id, texto } of items) {
    const d = dibujarSticker(id, texto, f.display, imgs.get(id));
    salida[`${id}|${texto}`] = { url: d.lienzo.toDataURL("image/png"), ancho: d.ancho, alto: d.alto };
  }
  return salida;
}

/** Dibuja la historia y devuelve el archivo (JPG de alta calidad). */
export async function generarImagenHistoria(entrada: EntradaImagenHistoria): Promise<Blob> {
  const [f, foto, logo, imgsStickers] = await Promise.all([
    fuentesListas(),
    cargarImagen(entrada.foto),
    entrada.logoUrl ? cargarImagen(entrada.logoUrl) : Promise.resolve(null),
    imagenesCargadas(entrada.soloTarjeta ? [] : (entrada.stickers ?? []).map((s) => s.id)),
  ]);
  if (!foto) throw new Error("No pudimos leer la foto del producto.");

  const dibujar = (conLogo: boolean): HTMLCanvasElement => {
    const lienzo = document.createElement("canvas");
    lienzo.width = ANCHO_HISTORIA;
    lienzo.height = ALTO_HISTORIA;
    const ctx = lienzo.getContext("2d")!;
    ctx.textBaseline = "alphabetic";
    if (!entrada.soloTarjeta) {
      ctx.fillStyle = "#1d1a17";
      ctx.fillRect(0, 0, ANCHO_HISTORIA, ALTO_HISTORIA);
      dibujarFoto(ctx, foto, entrada.ajuste ?? { difuminado: false, encuadre: ENCUADRE_INICIAL });
    }

    const { datos } = entrada;
    const margen = 48;
    const relleno = 52;
    const anchoCaja = ANCHO_HISTORIA - margen * 2;
    const x0 = margen + relleno;
    const anchoUtil = anchoCaja - relleno * 2;

    // --- Medir: nombre, precio, presentaciones, pie ---
    ctx.font = `800 58px ${f.texto}`;
    const lineasNombre = partirLineas(ctx, datos.nombre, anchoUtil, 2);
    const altoNombre = lineasNombre.length * 68;

    const altoPrecio = datos.precio ? 118 : 0;

    const pastillas: Pastilla[][] = [];
    if (datos.presentaciones) {
      ctx.font = `800 36px ${f.texto}`;
      const elementos: Pastilla[] = datos.presentaciones.elementos.map((e) => ({ texto: e.texto, color: e.color, ancho: ctx.measureText(e.texto).width + 56 + (e.color ? 46 : 0) }));
      if (datos.presentaciones.mas > 0) elementos.push({ texto: `+${datos.presentaciones.mas}`, color: null, ancho: ctx.measureText(`+${datos.presentaciones.mas}`).width + 56 });
      let fila: Pastilla[] = [];
      let usado = 0;
      for (const p of elementos) {
        if (fila.length && usado + p.ancho > anchoUtil) {
          pastillas.push(fila);
          fila = [];
          usado = 0;
        }
        fila.push(p);
        usado += p.ancho + 14;
      }
      if (fila.length) pastillas.push(fila);
      // Máximo dos líneas: lo que sobra va en «+N» de la última
      if (pastillas.length > 2) {
        const sobran = pastillas.slice(2).flat().filter((p) => !p.texto.startsWith("+")).length;
        const previo = datos.presentaciones.mas;
        pastillas.length = 2;
        const ultima = pastillas[1]!;
        if (ultima[ultima.length - 1]?.texto.startsWith("+")) ultima.pop();
        // quita lo necesario para que quepa «+N»
        const total = sobran + previo;
        const etiqueta = `+${total}`;
        const anchoEt = ctx.measureText(etiqueta).width + 56;
        const suma = () => ultima.reduce((s, p) => s + p.ancho + 14, 0);
        let quitadas = 0;
        while (ultima.length > 1 && suma() + anchoEt > anchoUtil) {
          ultima.pop();
          quitadas++;
        }
        const etiquetaFinal = `+${total + quitadas}`;
        ultima.push({ texto: etiquetaFinal, color: null, ancho: ctx.measureText(etiquetaFinal).width + 56 });
      }
    }
    const altoPastillas = pastillas.length ? pastillas.length * 76 + (pastillas.length - 1) * 14 : 0;

    const circulo = 150;
    const altoPie = circulo;

    let alto = relleno + altoNombre;
    if (datos.precio) alto += 6 + altoPrecio;
    if (altoPastillas) alto += 22 + altoPastillas;
    alto += 34 + 2 + 34 + altoPie + relleno;

    const yCaja = ALTO_HISTORIA - 130 - alto;

    // Degradado suave bajo la tarjeta para fotos claras
    const g = ctx.createLinearGradient(0, yCaja - 360, 0, ALTO_HISTORIA);
    g.addColorStop(0, "rgba(16,54,42,0)");
    g.addColorStop(1, "rgba(16,54,42,0.45)");
    if (!entrada.soloTarjeta) {
      ctx.fillStyle = g;
      ctx.fillRect(0, yCaja - 360, ANCHO_HISTORIA, ALTO_HISTORIA - (yCaja - 360));
    }

    // --- Tarjeta crema ---
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 80;
    ctx.shadowOffsetY = 26;
    ctx.fillStyle = "rgba(255,249,238,0.96)";
    ctx.beginPath();
    ctx.roundRect(margen, yCaja, anchoCaja, alto, 70);
    ctx.fill();
    ctx.restore();

    let y = yCaja + relleno;
    ctx.textAlign = "left";
    ctx.fillStyle = BOSQUE;
    ctx.font = `800 58px ${f.texto}`;
    for (const l of lineasNombre) {
      y += 68;
      ctx.fillText(l, x0, y - 16);
    }

    if (datos.precio) {
      y += 6;
      const base = y + 94;
      let x = x0;
      if (datos.precio.desde) {
        ctx.font = `800 44px ${f.texto}`;
        ctx.fillStyle = SUAVE;
        ctx.fillText("Desde", x, base - 8);
        x += ctx.measureText("Desde ").width + 6;
      }
      ctx.font = `700 96px ${f.display}`;
      if ("fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "semi-expanded";
      ctx.fillStyle = BOSQUE;
      const texto = formatearPesos(datos.precio.precio);
      ctx.fillText(texto, x, base);
      x += ctx.measureText(texto).width + 26;
      if ("fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "normal";
      if (datos.precio.antes != null) {
        ctx.font = `700 46px ${f.texto}`;
        ctx.fillStyle = SUAVE;
        const antes = formatearPesos(datos.precio.antes);
        ctx.fillText(antes, x, base - 6);
        const w = ctx.measureText(antes).width;
        ctx.strokeStyle = SUAVE;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 2, base - 22);
        ctx.lineTo(x + w + 2, base - 22);
        ctx.stroke();
      }
      y += altoPrecio;
    }

    if (altoPastillas) {
      y += 22;
      for (const fila of pastillas) {
        let x = x0;
        for (const p of fila) {
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = BORDE;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y + 1.5, p.ancho - 3, 73, 38);
          ctx.fill();
          ctx.stroke();
          let tx = x + 28;
          if (p.color) {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(tx + 17, y + 38, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.18)";
            ctx.lineWidth = 2;
            ctx.stroke();
            tx += 46;
          }
          ctx.fillStyle = BOSQUE;
          ctx.font = `800 36px ${f.texto}`;
          ctx.fillText(p.texto, tx, y + 50);
          x += p.ancho + 14;
        }
        y += 76 + 14;
      }
      y -= 14;
    }

    // Separador punteado y pie
    y += 34;
    ctx.strokeStyle = "#e2d5bf";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + anchoUtil, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 2 + 34;

    let xt = x0;
    if (datos.fotoTienda) {
      dibujarTienda(ctx, x0, y, circulo, conLogo ? logo : null, entrada.nombreTienda, f);
      xt = x0 + circulo + 34;
    }
    ctx.fillStyle = BOSQUE;
    const centro = y + circulo / 2;
    const anchoTexto = x0 + anchoUtil - xt;
    const d = entrada.direccion;
    if (d) {
      // «Pídelo en mi catálogo», el dominio completo y, debajo, la ruta: sin «https://» y sin cortar a mitad
      const lineas = d.ruta ? 3 : 2;
      const arriba = centro - (lineas === 3 ? 44 : 22);
      lineaQueCabe(ctx, "Pídelo en mi catálogo", xt, arriba + 12, anchoTexto, 700, 40, 32, f.texto);
      ctx.fillStyle = BOSQUE;
      lineaQueCabe(ctx, d.dominio, xt, arriba + 62, anchoTexto, 700, 36, 24, f.texto);
      if (d.ruta) {
        ctx.fillStyle = SUAVE;
        lineaQueCabe(ctx, d.ruta, xt, arriba + 106, anchoTexto, 600, 32, 22, f.texto);
      }
    } else {
      ctx.font = `700 40px ${f.texto}`;
      ctx.fillText("Pídelo en mi catálogo", xt, centro + 14);
    }
    if (!entrada.soloTarjeta) {
      for (const puesto of entrada.stickers ?? []) {
        const st = limitarSticker(puesto);
        const d = dibujarSticker(st.id, st.texto, f.display, imgsStickers.get(st.id));
        ctx.save();
        ctx.translate(st.x * ANCHO_HISTORIA, st.y * ALTO_HISTORIA);
        ctx.rotate((st.r * Math.PI) / 180);
        ctx.scale(st.k, st.k);
        ctx.drawImage(d.lienzo, -d.ancho / 2, -d.alto / 2);
        ctx.restore();
      }
    }
    return lienzo;
  };

  const aBlob = (lienzo: HTMLCanvasElement) =>
    new Promise<Blob>((resolver, rechazar) => lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No se pudo generar la imagen."))), entrada.soloTarjeta ? "image/png" : "image/jpeg", 0.92));

  try {
    return await aBlob(dibujar(true));
  } catch (e) {
    // La foto de la tienda "ensució" el lienzo (CORS): se cae a las iniciales
    if (logo) return aBlob(dibujar(false));
    throw e;
  }
}
