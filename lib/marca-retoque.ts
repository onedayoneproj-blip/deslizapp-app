// «Mi marca» para el retoque: las 3 palabras, lo que la tienda no quiere y de 3 a 6 fotos de referencia (docs/prompts/mi-marca.md).
// Lógica pura, sin React ni Supabase: la usan la hoja de la tienda, la compuerta del retoque, el admin y las pruebas con node.
// «Marca lista» es UNA sola regla, aquí: 3 palabras y al menos 3 fotos de referencia. El logo y el Instagram no la condicionan.

export const PALABRAS_MARCA = 3;
export const PALABRA_MAX = 24;
export const REFERENCIAS_MIN = 3;
export const REFERENCIAS_MAX = 6;
export const EVITA_MAX = 160;

export type ReferenciaMarca = {
  id: string;
  /** Con qué se ve: URL firmada (Supabase, bucket privado) o data URL (demo). */
  url: string;
  orden: number;
};

export type MarcaRetoque = {
  /** Sin «@». */
  instagram: string | null;
  palabras: string[];
  evita: string | null;
  referencias: ReferenciaMarca[];
};

export const MARCA_VACIA: MarcaRetoque = { instagram: null, palabras: [], evita: null, referencias: [] };

/** Lo que se guarda desde la hoja: lo que cambia respecto a lo que ya había. */
export type DatosMarcaRetoque = {
  instagram: string | null;
  palabras: string[];
  evita: string | null;
  /** Ids de referencias que se quitan (se borra también su archivo). */
  quitar: string[];
  /** Fotos nuevas (data URL), en orden. */
  nuevas: string[];
};

/** Palabras sin espacios de sobra ni vacías, hasta 3. */
export const palabrasLimpias = (palabras: readonly string[]): string[] =>
  palabras.map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, PALABRAS_MARCA);

/** Cuánto falta para que la marca esté lista. */
export function faltaParaLista(m: Pick<MarcaRetoque, "palabras" | "referencias">): { palabras: number; fotos: number } {
  return {
    palabras: Math.max(0, PALABRAS_MARCA - palabrasLimpias(m.palabras).length),
    fotos: Math.max(0, REFERENCIAS_MIN - m.referencias.length),
  };
}

/** La regla única: 3 palabras y al menos 3 fotos de referencia. */
export const marcaLista = (m: Pick<MarcaRetoque, "palabras" | "referencias"> | null | undefined): boolean => {
  if (!m) return false;
  const f = faltaParaLista(m);
  return f.palabras === 0 && f.fotos === 0;
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «Faltan 3 fotos de referencia», «Falta 1 palabra», «Faltan 2 palabras y 1 foto de referencia». null si está lista. */
export function textoFalta(m: Pick<MarcaRetoque, "palabras" | "referencias">): string | null {
  const f = faltaParaLista(m);
  if (f.palabras === 0 && f.fotos === 0) return null;
  const partes = [f.palabras > 0 ? plural(f.palabras, "palabra", "palabras") : null, f.fotos > 0 ? `${plural(f.fotos, "foto", "fotos")} de referencia` : null].filter(Boolean);
  const total = f.palabras + f.fotos;
  return `${total === 1 ? "Falta" : "Faltan"} ${partes.join(" y ")}`;
}

export const TEXTO_MARCA_LISTA = "Tu marca está lista para el taller.";
export const TEXTO_MENU_MARCA_LISTA = "Lista para el taller";

/**
 * La línea gris de la fila «Mi marca» del menú, con la misma regla que bloquea el retoque. `null` mientras se lee la marca (o si
 * la lectura falló): no se muestra un estado inventado.
 */
export function detalleMiMarca(m: Pick<MarcaRetoque, "palabras" | "referencias"> | null | undefined): { texto: string; tono: "falta" | "lista" } | null {
  if (!m) return null;
  const falta = textoFalta(m);
  return falta ? { texto: falta, tono: "falta" } : { texto: TEXTO_MENU_MARCA_LISTA, tono: "lista" };
}

/** Instagram a como se guarda: sin «@» ni enlace. `valido` false si no cumple (letras, números, punto y guion bajo; hasta 30). */
export function instagramLimpio(texto: string): { valor: string | null; valido: boolean } {
  const t = texto
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "");
  if (!t) return { valor: null, valido: true };
  return { valor: t, valido: /^[A-Za-z0-9._]{1,30}$/.test(t) };
}

/**
 * El texto para pegar en la IA (docs/prompts/mi-marca.md §6). Las líneas sin dato no salen.
 * `Retoca esta foto para <tienda>. Marca: a, b, c. Estilo: como las fotos de referencia. Evita: x. No cambies el producto.`
 */
export function instruccionesDeRetoque(tienda: string, m: Pick<MarcaRetoque, "palabras" | "evita">): string {
  const palabras = palabrasLimpias(m.palabras);
  const evita = m.evita?.trim();
  return [
    `Retoca esta foto para ${tienda}.`,
    palabras.length ? `Marca: ${palabras.join(", ")}.` : null,
    "Estilo: como las fotos de referencia.",
    evita ? `Evita: ${evita.replace(/[.\s]+$/, "")}.` : null,
    "No cambies el producto.",
  ]
    .filter(Boolean)
    .join(" ");
}
