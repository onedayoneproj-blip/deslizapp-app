// Identidad visual de cada tienda ("Mi marca"): colores y estilo tipográfico que se usan en todo lo que ve el
// CLIENTE FINAL (cupones, imágenes para compartir, PDF y, luego, el catálogo público). El panel no cambia:
// sigue con la marca Deslizapp.
//
// Este archivo no importa nada (solo lógica pura), así se prueba con `npm test` (tests/marca.test.mjs).

export type EstiloMarca = "elegante" | "moderna" | "divertida" | "clasica";

export type Marca = {
  /** Fondo de los cupones. */
  principal: string;
  /** El número grande del % y los detalles. */
  acento: string;
  estilo: EstiloMarca;
};

/** Pares de Google Fonts (título + texto) de cada estilo. Pesos que se cargan: los que usa el cupón. */
export const ESTILOS: Record<EstiloMarca, { nombre: string; titulo: string; texto: string; pesosTitulo: number[]; pesosTexto: number[] }> = {
  elegante: { nombre: "Elegante", titulo: "Playfair Display", texto: "Figtree", pesosTitulo: [600, 700], pesosTexto: [400, 600, 700] },
  moderna: { nombre: "Moderna", titulo: "Poppins", texto: "Inter", pesosTitulo: [600, 700], pesosTexto: [400, 600, 700] },
  divertida: { nombre: "Divertida", titulo: "Fredoka", texto: "Nunito", pesosTitulo: [600, 700], pesosTexto: [400, 600, 700] },
  clasica: { nombre: "Clásica", titulo: "Libre Baskerville", texto: "Source Sans 3", pesosTitulo: [400, 700], pesosTexto: [400, 600, 700] },
};

/** Sin logo (o con un logo sin color): paleta neutra elegante. Nunca el verde de Deslizapp. */
export const MARCA_NEUTRA: Marca = { principal: "#2E2A27", acento: "#E2B77A", estilo: "elegante" };

/** Textos sobre el color principal: crema u oscuro, el que se lea mejor. */
export const TEXTO_CLARO = "#FFF9EE";
export const TEXTO_OSCURO = "#1D1A17";

export const CONTRASTE_TEXTO = 4.5;
/** El número grande del % (texto grande): basta 3:1. */
export const CONTRASTE_GRANDE = 3;

// ---- Color ----

export type RGB = [number, number, number];

export function hexARgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function rgbAHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export const esHex = (texto: string) => /^#[0-9a-f]{6}$/i.test(texto.trim());

/** Luminancia relativa (WCAG 2). */
export function luminancia(hex: string): number {
  const [r, g, b] = hexARgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

type HSL = [number, number, number];

export function rgbAHsl([r, g, b]: RGB): HSL {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

export function hslARgb([h, s, l]: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const conLuz = (hex: string, l: number) => {
  const [h, s] = rgbAHsl(hexARgb(hex));
  return rgbAHex(hslARgb([h, s, Math.min(1, Math.max(0, l))]));
};

/** ¿Blanco, negro o gris casi puro? (no sirve como color principal de una marca) */
export function esNeutro(hex: string): boolean {
  const [, s, l] = rgbAHsl(hexARgb(hex));
  return s < 0.18 || l < 0.08 || l > 0.94;
}

// ---- Legibilidad ----

/** El texto (crema u oscuro) que mejor se lee sobre `fondo`. */
export function textoSobre(fondo: string): string {
  return contraste(TEXTO_CLARO, fondo) >= contraste(TEXTO_OSCURO, fondo) ? TEXTO_CLARO : TEXTO_OSCURO;
}

/**
 * Ajusta la luminosidad del principal hasta que su texto (crema u oscuro) llegue a 4.5:1. Se mueve hacia el
 * lado que menos lo cambia (oscurecer para texto crema, aclarar para texto oscuro).
 */
export function principalLegible(principal: string): string {
  if (contraste(textoSobre(principal), principal) >= CONTRASTE_TEXTO) return principal;
  const l0 = rgbAHsl(hexARgb(principal))[2];
  for (let paso = 0.01; paso <= 1; paso += 0.01) {
    for (const l of [l0 - paso, l0 + paso]) {
      if (l < 0 || l > 1) continue;
      const c = conLuz(principal, l);
      if (contraste(textoSobre(c), c) >= CONTRASTE_TEXTO) return c;
    }
  }
  return MARCA_NEUTRA.principal;
}

/** Ajusta la luminosidad del acento hasta 3:1 contra el principal (se aleja de la luz del principal). */
export function acentoLegible(acento: string, principal: string): string {
  if (contraste(acento, principal) >= CONTRASTE_GRANDE) return acento;
  const lp = rgbAHsl(hexARgb(principal))[2];
  const la = rgbAHsl(hexARgb(acento))[2];
  const direcciones = lp < 0.5 ? [1, -1] : [-1, 1];
  for (const dir of direcciones) {
    for (let l = la; l >= 0 && l <= 1; l += dir * 0.01) {
      const c = conLuz(acento, l);
      if (contraste(c, principal) >= CONTRASTE_GRANDE) return c;
    }
  }
  return textoSobre(principal);
}

/** La marca con el principal y el acento ya ajustados para que todo se lea. */
export function marcaLegible(m: Marca): Marca {
  const principal = principalLegible(m.principal);
  return { ...m, principal, acento: acentoLegible(m.acento, principal) };
}

/** Colores listos para pintar un cupón con la marca. */
export function coloresCupon(m: Marca) {
  const { principal, acento } = marcaLegible(m);
  const texto = textoSobre(principal);
  return { fondo: principal, acento, texto, esOscuro: texto === TEXTO_CLARO };
}

// ---- Colores desde el logo ----

type Caja = RGB[];

function rango(caja: Caja, canal: 0 | 1 | 2) {
  let min = 255;
  let max = 0;
  for (const p of caja) {
    min = Math.min(min, p[canal]);
    max = Math.max(max, p[canal]);
  }
  return max - min;
}

/**
 * Colores dominantes de una imagen (median cut). `pixeles` es el RGBA de un canvas (Uint8ClampedArray).
 * Ignora los transparentes. Devuelve hasta `cuantos` colores, del más al menos presente, con su peso (0–1).
 */
export function coloresDominantes(pixeles: ArrayLike<number>, cuantos = 6): { color: string; peso: number }[] {
  const puntos: Caja = [];
  for (let i = 0; i + 3 < pixeles.length; i += 4) {
    if (pixeles[i + 3]! < 128) continue;
    puntos.push([pixeles[i]!, pixeles[i + 1]!, pixeles[i + 2]!]);
  }
  if (puntos.length === 0) return [];
  const cajas: Caja[] = [puntos];
  while (cajas.length < 12) {
    // Parte la caja con más rango (por su canal más largo), por la mediana
    let mejor = -1;
    let canal: 0 | 1 | 2 = 0;
    let ancho = 0;
    cajas.forEach((c, i) => {
      if (c.length < 2) return;
      for (const k of [0, 1, 2] as const) {
        const r = rango(c, k);
        if (r > ancho) [ancho, mejor, canal] = [r, i, k];
      }
    });
    if (mejor < 0 || ancho < 8) break;
    const caja = [...cajas[mejor]!].sort((a, b) => a[canal] - b[canal]);
    const mitad = caja.length >> 1;
    cajas.splice(mejor, 1, caja.slice(0, mitad), caja.slice(mitad));
  }
  const total = puntos.length;
  const promedios = cajas
    .filter((c) => c.length)
    .map((c) => {
      const s = c.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as RGB, [0, 0, 0] as RGB);
      return { color: rgbAHex([s[0] / c.length, s[1] / c.length, s[2] / c.length]), peso: c.length / total };
    });
  // Junta colores casi iguales
  const unidos: { color: string; peso: number }[] = [];
  for (const p of promedios.sort((a, b) => b.peso - a.peso)) {
    const igual = unidos.find((u) => distancia(u.color, p.color) < 28);
    if (igual) igual.peso += p.peso;
    else unidos.push({ ...p });
  }
  return unidos.sort((a, b) => b.peso - a.peso).slice(0, cuantos);
}

function distancia(a: string, b: string) {
  const [x, y] = [hexARgb(a), hexARgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Un acento que combine con `principal` cuando el logo no trae un segundo color: su tono girado y claro. */
function acentoDerivado(principal: string, giro: number): string {
  const [h, s] = rgbAHsl(hexARgb(principal));
  return rgbAHex(hslARgb([(h + giro + 360) % 360, Math.max(0.55, s), 0.68]));
}

/**
 * Tres combinaciones (principal + acento) a partir de los colores de un logo, ya legibles. Si el logo no tiene
 * color (solo blancos, negros o grises), variaciones de la paleta neutra.
 */
export function proponerCombinaciones(colores: { color: string; peso: number }[], estilo: EstiloMarca = "elegante"): Marca[] {
  const vivos = colores.map((c) => c.color).filter((c) => !esNeutro(c));
  const pares: [string, string][] = [];
  const [a, b, c] = vivos;
  if (a && b) pares.push([a, b], [b, a]);
  if (a && c) pares.push([a, c]);
  if (a) pares.push([a, acentoDerivado(a, 40)], [a, acentoDerivado(a, 180)], [a, "#F2C14E"]);
  // Siempre hay 3: completar con la paleta neutra y variaciones
  pares.push([MARCA_NEUTRA.principal, MARCA_NEUTRA.acento], ["#3B3350", "#F0B3C8"], ["#4A3A2E", "#F2C14E"]);
  const propuestas: Marca[] = [];
  for (const [p, ac] of pares) {
    const m = marcaLegible({ principal: p, acento: ac, estilo });
    if (!propuestas.some((x) => distancia(x.principal, m.principal) < 20 && distancia(x.acento, m.acento) < 30)) propuestas.push(m);
    if (propuestas.length === 3) break;
  }
  return propuestas;
}

// ---- Enlace del catálogo ----

/** "tienda.com/x" → "https://tienda.com/x"; null si no parece un enlace. Vacío = sin enlace (null). */
export function normalizarUrl(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const conEsquema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(conEsquema);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || /\s/.test(t)) return null;
    return u.toString();
  } catch {
    return null;
  }
}
