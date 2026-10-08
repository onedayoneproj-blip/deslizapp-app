/**
 * Encuadre de la foto en la imagen de la historia (9:16). Funciones puras: la vista de ajuste (pantalla) y el canvas 1080×1920
 * usan las mismas, así que lo que se ve al ajustar es lo que sale.
 *
 * La foto se coloca sobre un marco de `marco` (ancho × alto, en cualquier unidad). Su tamaño base depende del modo:
 * - relleno (`cover`): la foto cubre todo el marco (se recorta lo que sobra).
 * - fondo difuminado (`contain`): la foto cabe entera en el marco; el resto lo llena la misma foto ampliada y desenfocada.
 * `k` acerca desde ese tamaño base (1 = base, hasta K_MAX). `x` e `y` mueven el centro de la foto respecto al centro del marco,
 * como fracción del ANCHO y del ALTO del marco (así valen igual en la vista previa y en la imagen final).
 *
 * Límites: en cada eje, si la foto sobresale del marco no se deja ver un hueco; si cabe dentro, no se deja salir del marco.
 * En modo relleno la foto siempre sobresale (k ≥ 1), así que nunca quedan huecos.
 */
export type Encuadre = { k: number; x: number; y: number };
export type Medida = { ancho: number; alto: number };
export type Punto = { x: number; y: number };
export type Rect = { x: number; y: number; ancho: number; alto: number };

export const K_MIN = 1;
export const K_MAX = 4;
export const K_PASO = 0.25;
/** Por encima de esta proporción ancho/alto la foto no llena una historia vertical: se ofrece el fondo difuminado. */
export const PROPORCION_VERTICAL = 0.75;
export const ENCUADRE_INICIAL: Encuadre = { k: 1, x: 0, y: 0 };

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const valido = (n?: Medida | null): n is Medida => !!n && n.ancho > 0 && n.alto > 0;

/** Por defecto el fondo difuminado va encendido si la foto es horizontal o cuadrada (ancho/alto > 0,75) y apagado si ya es vertical. */
export function difuminadoPorDefecto(natural?: Medida | null): boolean {
  if (!valido(natural)) return false;
  return natural.ancho / natural.alto > PROPORCION_VERTICAL;
}

/** Cuánto hay que escalar la foto para llenar el marco (`cover`) o para que quepa entera (`contain`). */
export function escalaBase(marco: Medida, natural: Medida, difuminado: boolean): number {
  const ex = marco.ancho / natural.ancho;
  const ey = marco.alto / natural.alto;
  return difuminado ? Math.min(ex, ey) : Math.max(ex, ey);
}

/** Lo que mide la foto con zoom `k` dentro del marco (en las unidades del marco). */
export function medidaFoto(marco: Medida, natural: Medida, difuminado: boolean, k: number): Medida {
  const e = escalaBase(marco, natural, difuminado) * k;
  return { ancho: natural.ancho * e, alto: natural.alto * e };
}

/** Deja el encuadre dentro de lo permitido (zoom entre 1 y 4; sin huecos ni foto fuera del marco). Sin medidas de la foto, no mueve. */
export function limitar(enc: Encuadre, marco: Medida, natural?: Medida | null, difuminado = false): Encuadre {
  const k = entre(Number.isFinite(enc.k) ? enc.k : 1, K_MIN, K_MAX);
  if (!valido(natural) || marco.ancho <= 0 || marco.alto <= 0) return { k, x: 0, y: 0 };
  const foto = medidaFoto(marco, natural, difuminado, k);
  const mx = Math.abs(foto.ancho - marco.ancho) / 2 / marco.ancho;
  const my = Math.abs(foto.alto - marco.alto) / 2 / marco.alto;
  return { k, x: entre(Number.isFinite(enc.x) ? enc.x : 0, -mx, mx), y: entre(Number.isFinite(enc.y) ? enc.y : 0, -my, my) };
}

/** Mover con un dedo: `dx` y `dy` en los mismos píxeles que `marco`. */
export function mover(enc: Encuadre, dx: number, dy: number, marco: Medida, natural?: Medida | null, difuminado = false): Encuadre {
  return limitar({ ...enc, x: enc.x + dx / marco.ancho, y: enc.y + dy / marco.alto }, marco, natural, difuminado);
}

/** Cambiar el zoom desde el centro del marco (deslizador y botones − / +). */
export function acercarA(enc: Encuadre, k: number, marco: Medida, natural?: Medida | null, difuminado = false): Encuadre {
  const k1 = entre(k, K_MIN, K_MAX);
  const r = k1 / enc.k;
  return limitar({ k: k1, x: enc.x * r, y: enc.y * r }, marco, natural, difuminado);
}

/** Pellizcar: el punto de la foto que estaba bajo el centro de los dedos se queda bajo el centro nuevo. Puntos relativos al centro del marco, en píxeles. */
export function pellizcar(inicio: Encuadre, c0: Punto, d0: number, c1: Punto, d1: number, marco: Medida, natural?: Medida | null, difuminado = false): Encuadre {
  if (d0 <= 0) return inicio;
  const k = entre(inicio.k * (d1 / d0), K_MIN, K_MAX);
  const qx = (c0.x - inicio.x * marco.ancho) / inicio.k;
  const qy = (c0.y - inicio.y * marco.alto) / inicio.k;
  return limitar({ k, x: (c1.x - k * qx) / marco.ancho, y: (c1.y - k * qy) / marco.alto }, marco, natural, difuminado);
}

/** Dónde queda la foto dentro del marco (esquina superior izquierda y tamaño), en las unidades del marco. */
export function rectFoto(enc: Encuadre, marco: Medida, natural: Medida, difuminado: boolean): Rect {
  const l = limitar(enc, marco, natural, difuminado);
  const foto = medidaFoto(marco, natural, difuminado, l.k);
  return { x: (marco.ancho - foto.ancho) / 2 + l.x * marco.ancho, y: (marco.alto - foto.alto) / 2 + l.y * marco.alto, ancho: foto.ancho, alto: foto.alto };
}

/** Rectángulo de la misma foto ampliada (`cover`) que llena el fondo cuando hay fondo difuminado; ligeramente mayor para que el borde del desenfoque no deje huecos. */
export function rectFondo(marco: Medida, natural: Medida, extra = 1.12): Rect {
  const e = escalaBase(marco, natural, false) * extra;
  const ancho = natural.ancho * e;
  const alto = natural.alto * e;
  return { x: (marco.ancho - ancho) / 2, y: (marco.alto - alto) / 2, ancho, alto };
}

/** ¿El encuadre es el de siempre? (no hay nada que guardar). */
export const esEncuadreInicial = (enc: Encuadre) => enc.k === 1 && enc.x === 0 && enc.y === 0;

/** Lo que se guarda al tocar «Listo». */
export type AjusteFoto = { difuminado: boolean; encuadre: Encuadre };
