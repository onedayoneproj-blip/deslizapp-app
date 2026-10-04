import type { CatalogoPublico } from "../types";
export type TemaCatalogo = {
  colores: Record<string, string>;
  fuentes: { display: string; body: string };
  cabecera?: string;
  tintes: Record<string, { c: string; dark: boolean }>;
};
export function luminancia(color: string): number {
  const canales = /^#[a-f0-9]{6}$/i.test(color)
    ? [1, 3, 5]
        .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
        .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
    : [0, 0, 0];
  return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
}
export function contraste(a: string, b: string): number {
  const x = luminancia(a),
    y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const fuentes = {
  elegante: { display: "Cormorant Garamond", body: "Manrope" },
  moderna: { display: "Figtree", body: "Figtree" },
  divertida: { display: "Fredoka", body: "Figtree" },
  clasica: { display: "Georgia", body: "Manrope" },
};
const mezclar = (a: string, b: string, k: number) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(
        parseInt(a.slice(i, i + 2), 16) * (1 - k) +
          parseInt(b.slice(i, i + 2), 16) * k,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export function temaDeTienda(t: CatalogoPublico["tienda"]): TemaCatalogo {
  const propio = t.personalizacion.tema as Partial<TemaCatalogo> | undefined;
  const principal = /^#[a-f0-9]{6}$/i.test(t.marcaColorPrincipal)
    ? t.marcaColorPrincipal
    : "#174B3A";
  const acento = /^#[a-f0-9]{6}$/i.test(t.marcaColorAcento)
    ? t.marcaColorAcento
    : "#FF834F";
  const accion =
    contraste(principal, "#FFFFFF") >= 4.5
      ? principal
      : mezclar(principal, "#000000", 0.65);
  const fondo = mezclar(principal, "#FFFFFF", 0.97);
  const texto =
    contraste(principal, fondo) >= 4.5
      ? principal
      : mezclar(principal, "#000000", 0.8);
  return {
    colores: {
      bg: fondo,
      surface: "#FFFFFF",
      sunk: mezclar(principal, "#FFFFFF", 0.91),
      ink: texto,
      ink2: mezclar(texto, fondo, 0.12),
      muted: mezclar(texto, fondo, 0.3),
      line: mezclar(principal, "#FFFFFF", 0.8),
      accent: accion,
      "accent-hover": accion,
      "accent-soft": mezclar(acento, "#FFFFFF", 0.87),
      heart: acento,
      gold:
        contraste(acento, fondo) >= 4.5
          ? acento
          : mezclar(acento, "#000000", 0.6),
      ...propio?.colores,
    },
    fuentes: propio?.fuentes ?? fuentes[t.marcaEstilo] ?? fuentes.moderna,
    cabecera: propio?.cabecera,
    tintes: propio?.tintes ?? {},
  };
}
