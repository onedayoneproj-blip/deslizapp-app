// El sello «-30 %» del Círculo junto al selector de /planes (referencias/planes/sello-circulo.dc.html, tablero F). Puro: tests/sello.test.mjs.

/** Puntas de la estrella y su forma: radio r(θ) = RADIO + AMPLITUD · cos(PUNTAS · θ). */
export const PUNTAS_SELLO = 12;
export const RADIO_SELLO = 50;
export const AMPLITUD_SELLO = 6.5;
/** Puntos con que se dibuja (de sobra para que las puntas se vean redondas). */
export const PUNTOS_SELLO = 240;
/** El sello se dibuja en un viewBox cuadrado de -72 a 72. */
export const VIEWBOX_SELLO = "-72 -72 144 144";

/** El path cerrado de la estrella (θ = 0 arriba, hacia la derecha), con 2 decimales. */
export function pathEstrella(puntos = PUNTOS_SELLO): string {
  const partes: string[] = [];
  for (let i = 0; i < puntos; i++) {
    const t = (2 * Math.PI * i) / puntos;
    const r = RADIO_SELLO + AMPLITUD_SELLO * Math.cos(PUNTAS_SELLO * t);
    partes.push(`${i === 0 ? "M" : "L"}${(r * Math.sin(t)).toFixed(2)} ${(-r * Math.cos(t)).toFixed(2)}`);
  }
  return partes.join(" ") + " Z";
}

/** Generado una vez. */
export const PATH_SELLO = pathEstrella();

/** Las capas del sello, de abajo arriba, todas con el mismo path (el último es el relleno crema, sin trazo). */
export const CAPAS_SELLO = [
  { stroke: "#FFF9EE", ancho: 27 },
  { stroke: "#174B3A", ancho: 23 },
  { stroke: "#F5C9D6", ancho: 15 },
  { stroke: "#FF834F", ancho: 7 },
] as const;
export const RELLENO_SELLO = "#FFF9EE";
