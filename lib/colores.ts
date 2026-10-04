// Colores conocidos por su nombre en español, para el círculo de una variante de Color (docs/12 §2; tablero Producto «Ropa»).
// Si el nombre no está aquí, no se dibuja nada: nunca un color inventado.

const COLORES: Record<string, string> = {
  negro: "#2b2b2b",
  blanco: "#ffffff",
  arena: "#e8d9c4",
  beige: "#e6d5b8",
  crema: "#f3e9d2",
  nude: "#e3c3a8",
  gris: "#9a9a9a",
  plateado: "#c9ccd1",
  plata: "#c9ccd1",
  dorado: "#d4af37",
  oro: "#d4af37",
  rojo: "#c8352b",
  vino: "#6e1f2f",
  rosa: "#f2a9c0",
  fucsia: "#d6338a",
  morado: "#7b4fa0",
  lila: "#c3a6dd",
  azul: "#2f5fb3",
  celeste: "#8cc8ec",
  "azul marino": "#1f2f57",
  marino: "#1f2f57",
  verde: "#3f8f5a",
  oliva: "#7a7a3a",
  menta: "#a8dcc4",
  amarillo: "#f2cf3c",
  mostaza: "#d6a42b",
  naranja: "#f08a3c",
  coral: "#f27c6b",
  "marrón": "#7a4b2a",
  marron: "#7a4b2a",
  "café": "#6f4a2f",
  cafe: "#6f4a2f",
  camel: "#c19a6b",
  "terracota": "#c0633f",
};

/** El color (hex) de un nombre conocido ("Arena", "Azul marino"); null si no se conoce. */
export function colorPorNombre(nombre: string): string | null {
  return COLORES[nombre.trim().toLocaleLowerCase("es")] ?? null;
}

/** ¿Este eje de opciones es de color? ("Color", "Colores"). */
export const esEjeColor = (nombreEje: string) => /^colou?r(es)?$/i.test(nombreEje.trim());
