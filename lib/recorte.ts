import type { CSSProperties } from "react";

/**
 * Recorte transparente: donde dos elementos se superponen, el de atrás lleva un hueco con la forma del de adelante
 * (máscara), en vez de un borde blanco. Deja ver lo que haya detrás. docs/09, «Superposición».
 * Medidas en px dentro de la caja del elemento de atrás (`ancho` × `alto`): el hueco es un rectángulo redondeado.
 */
export function recorteRect(o: { ancho: number; alto: number; x: number; y: number; w: number; h: number; radio: number }): CSSProperties {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${o.ancho}' height='${o.alto}' viewBox='0 0 ${o.ancho} ${o.alto}'>` +
    `<rect x='${o.x}' y='${o.y}' width='${o.w}' height='${o.h}' rx='${o.radio}'/></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return {
    WebkitMaskImage: `linear-gradient(#000,#000), ${url}`,
    maskImage: `linear-gradient(#000,#000), ${url}`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
  };
}

/** Pila de cuadrados que se montan por la derecha de uno sobre otro (cada uno tapa `solape` px del anterior). Estilo del que va detrás. */
export function recortePila(lado: number, solape: number, radio: number, hueco = 2): CSSProperties {
  return recorteRect({ ancho: lado, alto: lado, x: lado - solape - hueco, y: -hueco, w: lado + 2 * hueco, h: lado + 2 * hueco, radio: radio + hueco });
}
