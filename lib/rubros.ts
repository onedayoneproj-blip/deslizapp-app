// Detalles por rubro (docs/12-catalogo-conectado.md §1). La misma lista vive en la base (`public.campos_de_rubro`, migración
// 20261004010000) y `tests/rubros.test.mjs` compara las dos para que no se separen. Si cambias algo aquí, cámbialo también allá.

/** Los rubros de una tienda (`tiendas.rubro`). */
export const RUBROS = ["perfumes", "ropa", "accesorios", "belleza", "comida", "hogar", "general"] as const;
export type Rubro = (typeof RUBROS)[number];

/** Cómo se escribe cada detalle: texto (1 a 120), número entero > 0, lista (1 a 12 textos de 1 a 40) o uno de unos valores. */
export type TipoDetalle =
  | { tipo: "texto" }
  | { tipo: "numero" }
  | { tipo: "lista"; valores?: readonly string[] }
  | { tipo: "elegir"; valores: readonly string[] };

export type CampoDetalle = { llave: string; nombre: string } & TipoDetalle;

/** Valores de "Para" con su nombre visible. */
export const NOMBRE_PARA: Record<string, string> = { ella: "Ella", el: "Él", unisex: "Unisex", ninos: "Niños" };

/** Ocasiones de los perfumes: las mismas del catálogo de Esencias Michel (el filtro Día / Noche las usa). */
export const OCASIONES_PERFUME = [
  "Día",
  "Oficina",
  "Universidad",
  "Verano",
  "Primavera y verano",
  "Salidas casuales",
  "Noche",
  "Citas",
  "Cenas",
  "Fiestas",
  "Noches casuales",
  "Ocasiones especiales",
  "Todo el año",
  "Regalo",
] as const;

/** Las ocasiones que cuentan como "Noche" en el filtro del catálogo; las demás, como "Día". */
export const OCASIONES_NOCHE: readonly string[] = ["Noche", "Citas", "Cenas", "Fiestas", "Noches casuales", "Ocasiones especiales"];

export const CAMPOS_POR_RUBRO: Record<Rubro, readonly CampoDetalle[]> = {
  perfumes: [
    { llave: "marca", nombre: "Marca", tipo: "texto" },
    { llave: "para", nombre: "Para", tipo: "elegir", valores: ["ella", "el", "unisex"] },
    { llave: "tamano_ml", nombre: "Tamaño (ml)", tipo: "numero" },
    { llave: "concentracion", nombre: "Concentración", tipo: "elegir", valores: ["edp", "edt", "parfum", "extrait", "colonia"] },
    { llave: "familia", nombre: "Familia", tipo: "texto" },
    { llave: "ocasiones", nombre: "Ideal para", tipo: "lista", valores: OCASIONES_PERFUME },
    { llave: "notas_salida", nombre: "Notas de salida", tipo: "lista" },
    { llave: "notas_corazon", nombre: "Notas de corazón", tipo: "lista" },
    { llave: "notas_fondo", nombre: "Notas de fondo", tipo: "lista" },
  ],
  ropa: [
    { llave: "material", nombre: "Material", tipo: "texto" },
    { llave: "corte", nombre: "Corte", tipo: "texto" },
    { llave: "cuidado", nombre: "Cuidado", tipo: "texto" },
    { llave: "para", nombre: "Para", tipo: "elegir", valores: ["ella", "el", "unisex", "ninos"] },
  ],
  accesorios: [
    { llave: "material", nombre: "Material", tipo: "texto" },
    { llave: "medidas", nombre: "Medidas", tipo: "texto" },
    { llave: "para", nombre: "Para", tipo: "elegir", valores: ["ella", "el", "unisex"] },
  ],
  belleza: [
    { llave: "contenido", nombre: "Contenido (ml o g)", tipo: "texto" },
    { llave: "tipo_piel", nombre: "Tipo de piel", tipo: "texto" },
    { llave: "ingredientes", nombre: "Ingredientes", tipo: "lista" },
    { llave: "modo_uso", nombre: "Modo de uso", tipo: "texto" },
  ],
  comida: [
    { llave: "porcion", nombre: "Porción", tipo: "texto" },
    { llave: "ingredientes", nombre: "Ingredientes", tipo: "lista" },
    { llave: "conservacion", nombre: "Conservación", tipo: "texto" },
    { llave: "anticipacion", nombre: "Anticipación", tipo: "texto" },
  ],
  hogar: [
    { llave: "medidas", nombre: "Medidas", tipo: "texto" },
    { llave: "material", nombre: "Material", tipo: "texto" },
    { llave: "cuidado", nombre: "Cuidado", tipo: "texto" },
  ],
  general: [
    { llave: "marca", nombre: "Marca", tipo: "texto" },
    { llave: "tamano", nombre: "Tamaño", tipo: "texto" },
  ],
};

/** Cómo se ve cada valor de un campo "elegir" ("ella" → "Ella", "edp" → "EDP"). */
export const NOMBRE_VALOR: Record<string, string> = {
  ...NOMBRE_PARA,
  edp: "EDP",
  edt: "EDT",
  parfum: "Parfum",
  extrait: "Extrait",
  colonia: "Colonia",
};

export const nombreValor = (v: string) => NOMBRE_VALOR[v] ?? v;

/**
 * El problema de un valor para un campo (las mismas reglas que `detallesValidos` y la base), con el mensaje para la dueña; null si
 * está bien. Un valor vacío (borrar el detalle) siempre está bien: todos los detalles son opcionales.
 */
export function errorDeDetalle(campo: CampoDetalle | "descripcion", valor: string | number | string[] | undefined): string | null {
  if (valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0)) return null;
  if (campo === "descripcion") {
    return typeof valor === "string" && valor.length <= LARGO_DESCRIPCION ? null : `Hasta ${LARGO_DESCRIPCION} caracteres.`;
  }
  switch (campo.tipo) {
    case "texto":
      return typeof valor === "string" && valor.length <= LARGO_TEXTO ? null : `Hasta ${LARGO_TEXTO} caracteres.`;
    case "numero":
      return typeof valor === "number" && Number.isInteger(valor) && valor > 0 && valor <= 2147483647 ? null : "Escribe un número entero mayor que cero.";
    case "elegir":
      return typeof valor === "string" && campo.valores.includes(valor) ? null : "Elige una de las opciones.";
    case "lista":
      if (!Array.isArray(valor)) return "Agrega al menos uno.";
      if (valor.length > MAX_ITEMS_LISTA) return `Hasta ${MAX_ITEMS_LISTA}.`;
      if (valor.some((v) => v.length < 1 || v.length > LARGO_ITEM_LISTA)) return `Cada uno, hasta ${LARGO_ITEM_LISTA} caracteres.`;
      if (campo.valores && valor.some((v) => !campo.valores!.includes(v))) return "Elige de la lista.";
      return null;
  }
}

/** Opciones típicas de cada rubro: sugerencias del formulario, no obligación ("general": la tienda las nombra). */
export const OPCIONES_TIPICAS: Record<Rubro, readonly string[]> = {
  perfumes: [],
  ropa: ["Talla", "Color"],
  accesorios: ["Color"],
  belleza: ["Tono"],
  comida: ["Sabor", "Tamaño"],
  hogar: ["Color", "Tamaño"],
  general: [],
};

/** Detalles que valen en cualquier rubro: la descripción (≤ 600). Un servicio suma `duracion_min`. */
export const LARGO_DESCRIPCION = 600;
export const LARGO_TEXTO = 120;
export const LARGO_ITEM_LISTA = 40;
export const MAX_ITEMS_LISTA = 12;

/** Los detalles de un producto: llaves del rubro (todas opcionales), más `descripcion` y, en un servicio, `duracion_min`. */
export type Detalles = Record<string, string | number | string[]>;

/** ¿Son válidos estos detalles para el rubro? La misma regla que `public.detalles_validos` (y `duracion_min` en un servicio). */
export function detallesValidos(rubro: Rubro, detalles: Detalles, servicio = false): boolean {
  const campos = CAMPOS_POR_RUBRO[rubro];
  if (!campos) return false;
  for (const [llave, valor] of Object.entries(detalles)) {
    if (llave === "descripcion") {
      if (typeof valor !== "string" || valor.length < 1 || valor.length > LARGO_DESCRIPCION) return false;
      continue;
    }
    if (servicio && llave === "duracion_min") {
      if (!esEnteroPositivo(valor)) return false;
      continue;
    }
    const campo = campos.find((c) => c.llave === llave);
    if (!campo) return false;
    if (campo.tipo === "texto" && !(typeof valor === "string" && valor.length >= 1 && valor.length <= LARGO_TEXTO)) return false;
    if (campo.tipo === "numero" && !esEnteroPositivo(valor)) return false;
    if (campo.tipo === "elegir" && !(typeof valor === "string" && campo.valores.includes(valor))) return false;
    if (campo.tipo === "lista") {
      if (!Array.isArray(valor) || valor.length < 1 || valor.length > MAX_ITEMS_LISTA) return false;
      for (const v of valor) {
        if (typeof v !== "string" || v.length < 1 || v.length > LARGO_ITEM_LISTA) return false;
        if (campo.valores && !campo.valores.includes(v)) return false;
      }
    }
  }
  return true;
}

const esEnteroPositivo = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 2147483647;

/** La lista en la forma de la base (`campos_de_rubro`): "texto" | "numero" | "lista" | {"elegir": […]} | {"lista": […]}. */
export function camposComoEnLaBase(): Record<string, Record<string, unknown>> {
  const res: Record<string, Record<string, unknown>> = {};
  for (const [rubro, campos] of Object.entries(CAMPOS_POR_RUBRO)) {
    res[rubro] = Object.fromEntries(
      campos.map((c) => [
        c.llave,
        c.tipo === "elegir" ? { elegir: [...c.valores] } : c.tipo === "lista" && c.valores ? { lista: [...c.valores] } : c.tipo,
      ]),
    );
  }
  return res;
}

/** Sustantivo del catálogo público; no presupone perfumes en otras tiendas. */
export const NOMBRE_PRODUCTO: Record<Rubro,{singular:string;plural:string}> = {
 perfumes:{singular:'perfume',plural:'perfumes'},ropa:{singular:'prenda',plural:'prendas'},accesorios:{singular:'accesorio',plural:'accesorios'},belleza:{singular:'producto',plural:'productos'},comida:{singular:'producto',plural:'productos'},hogar:{singular:'producto',plural:'productos'},general:{singular:'producto',plural:'productos'},
};
