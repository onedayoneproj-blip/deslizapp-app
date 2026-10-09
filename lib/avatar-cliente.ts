// Avatar de un cliente: iniciales por defecto, o un emoji con un color de fondo de la marca (solo emoji, nunca fotos).
// Se guarda en `clientes.avatar_emoji` y `clientes.avatar_color`.

export type ColorAvatar = "crema" | "rosa" | "dorado" | "menta" | "durazno";

/** Los 5 colores de fondo (referencias/cliente-nuevo-nota). `crema` es el de partida. */
export const COLORES_AVATAR: { id: ColorAvatar; nombre: string; hex: string }[] = [
  { id: "crema", nombre: "Crema", hex: "#F2E9DA" },
  { id: "rosa", nombre: "Rosa", hex: "#F4C6D4" },
  { id: "dorado", nombre: "Dorado", hex: "#F3E2B3" },
  { id: "menta", nombre: "Menta", hex: "#CFE3D8" },
  { id: "durazno", nombre: "Durazno", hex: "#FAD3C2" },
];

export const hexDeColor = (color: ColorAvatar | null | undefined) => COLORES_AVATAR.find((c) => c.id === color)?.hex ?? null;

export const esColorAvatar = (valor: unknown): valor is ColorAvatar => COLORES_AVATAR.some((c) => c.id === valor);

/** Hasta cuántos caracteres (unidades UTF-16; la base cuenta puntos de código, que nunca son más) cabe un emoji: `avatar_emoji` ≤ 16. */
export const MAX_EMOJI = 16;

/** Emoji limpio: texto corto o null (vacío = iniciales). */
export function limpiarEmoji(emoji: string | null | undefined): string | null {
  const limpio = (emoji ?? "").trim();
  return limpio === "" || limpio.length > MAX_EMOJI ? null : limpio;
}

export type AvatarDeCliente = { avatarEmoji?: string | null; avatarColor?: ColorAvatar | null };

// ---- Color automático: un tono pastel que sale del emoji ----
//
// Regla del color del avatar (`avatar_color`):
//  - con emoji y color nulo = «Automático»: el círculo toma un pastel derivado del color predominante del emoji;
//  - con un color elegido (crema, rosa, dorado, menta, durazno) = ese color, con emoji o con iniciales (crema también se guarda);
//  - sin emoji y color nulo = iniciales con el rosa de siempre.

/** Tono de respaldo (el «crema» de la marca) mientras no se pueda calcular el del emoji (servidor, canvas sin emoji…). */
export const TONO_RESPALDO = "#F2E9DA";

function aHsl(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b) / 255;
  const mn = Math.min(r, g, b) / 255;
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  let h = mx === rr ? ((gg - bb) / d) % 6 : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

function deHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

/**
 * El pastel del color predominante de unos píxeles RGBA (los de un emoji dibujado en un canvas pequeño). Ignora lo transparente y lo casi
 * blanco o casi negro; cuenta más lo saturado; agrupa por tono (cada 20°). Un emoji sin color claro (café, gris) da un pastel casi neutro.
 * Devuelve `null` si no hay píxeles útiles (el llamador cae al respaldo). Mismo emoji → mismo tono.
 */
export function tonoPastelDePixeles(datos: ArrayLike<number>): string | null {
  const cubos = Array.from({ length: 18 }, () => ({ peso: 0, sen: 0, cos: 0, sat: 0 }));
  let neutroPeso = 0;
  let neutroL = 0;
  for (let i = 0; i + 3 < datos.length; i += 4) {
    const a = datos[i + 3]! / 255;
    if (a < 0.5) continue;
    const [h, s, l] = aHsl(datos[i]!, datos[i + 1]!, datos[i + 2]!);
    if (l < 0.1 || l > 0.93) continue;
    if (s < 0.22) {
      neutroPeso += a;
      neutroL += l * a;
      continue;
    }
    const cubo = cubos[Math.min(17, Math.floor(h / 20))]!;
    const peso = s * a;
    cubo.peso += peso;
    cubo.sen += Math.sin((h * Math.PI) / 180) * peso;
    cubo.cos += Math.cos((h * Math.PI) / 180) * peso;
    cubo.sat += s * peso;
  }
  const mejor = cubos.reduce((m, c) => (c.peso > m.peso ? c : m), cubos[0]!);
  if (mejor.peso > 0) {
    const h = ((Math.atan2(mejor.sen, mejor.cos) * 180) / Math.PI + 360) % 360;
    const sat = mejor.sat / mejor.peso;
    // Pastel: claro (88 %) y con la saturación justa para que se note el tono sin apagar el emoji
    return deHsl(h, Math.min(0.7, 0.35 + sat * 0.3), 0.88);
  }
  if (neutroPeso > 0) return deHsl(30, 0.12, Math.min(0.9, Math.max(0.84, neutroL / neutroPeso + 0.4)));
  return null;
}

const CLAVE_TONOS = "deslizapp-tono-emoji-v1";
const tonosEnMemoria = new Map<string, string>();
let tonosLeidos = false;

function leerTonosGuardados() {
  if (tonosLeidos) return;
  tonosLeidos = true;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_TONOS) ?? "{}") as Record<string, unknown>;
    for (const [emoji, tono] of Object.entries(guardado)) if (typeof tono === "string" && /^#[0-9A-F]{6}$/.test(tono)) tonosEnMemoria.set(emoji, tono);
  } catch {
    // Sin almacenamiento: se calcula cada vez (es barato)
  }
}

function guardarTonos() {
  try {
    localStorage.setItem(CLAVE_TONOS, JSON.stringify(Object.fromEntries(tonosEnMemoria)));
  } catch {
    // Sin almacenamiento: no pasa nada
  }
}

/**
 * El pastel de un emoji, calculado dibujándolo en un canvas de 48 px del navegador (así sale del emoji real del teléfono) y guardado por
 * emoji (memoria + localStorage): la primera vez cuesta una fracción de milisegundo y después es inmediato, sin parpadeo. En el servidor, o
 * si el canvas no dibuja el emoji, devuelve el tono de respaldo (y NO lo guarda, para volver a intentarlo).
 */
export function tonoDeEmoji(emoji: string): string {
  if (typeof document === "undefined") return TONO_RESPALDO;
  leerTonosGuardados();
  const guardado = tonosEnMemoria.get(emoji);
  if (guardado) return guardado;
  try {
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = 48;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return TONO_RESPALDO;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "36px sans-serif";
    ctx.fillText(emoji, 24, 26);
    const tono = tonoPastelDePixeles(ctx.getImageData(0, 0, 48, 48).data);
    if (!tono) return TONO_RESPALDO;
    tonosEnMemoria.set(emoji, tono);
    guardarTonos();
    return tono;
  } catch {
    return TONO_RESPALDO;
  }
}
