import type { CatalogoPublico, ProductoPublico } from "../types";
import { dinero } from "./carrito";
import { OCASIONES_NOCHE, OCASIONES_DIA, rubrosDeTienda, type Rubro } from "../rubros";
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const words = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
const STOP = new Set(
  "de del la las el los un una unos unas y o con sin para por que me mi mis quiero busco buscando tienes tiene tienen hay algo alguno alguna uno perfume perfumes fragancia fragancias olor aroma huela huele oler en a al lo le se su sus tu tus muy mas bien bueno buena como cual cuales".split(
    " ",
  ),
);
const SYN: Record<string, string[]> = {
  ella: ["mujer"],
  dama: ["mujer"],
  damas: ["mujer"],
  mujeres: ["mujer"],
  femenino: ["mujer"],
  chica: ["mujer"],
  novia: ["mujer"],
  mama: ["mujer"],
  esposa: ["mujer"],
  hombre: ["unisex"],
  hombres: ["unisex"],
  caballero: ["unisex"],
  caballeros: ["unisex"],
  masculino: ["unisex"],
  novio: ["unisex"],
  papa: ["unisex"],
  esposo: ["unisex"],
  ambos: ["unisex"],
  pareja: ["unisex"],
  dulce: ["gourmand", "vainilla", "caramelo", "dulce", "chicle"],
  dulces: ["gourmand", "vainilla", "caramelo", "dulce", "chicle"],
  empalagoso: ["gourmand", "dulce"],
  fresco: ["fresca", "mandarina", "limon", "bergamota", "citrico", "coco"],
  fresca: ["fresca", "mandarina", "limon", "bergamota", "citrico"],
  fresquito: ["fresca"],
  limpio: ["fresca", "limpio"],
  ligero: ["fresca"],
  suave: ["fresca", "floral"],
  flor: ["floral"],
  flores: ["floral"],
  florar: ["floral"],
  fruta: ["frutal"],
  frutas: ["frutal"],
  frutado: ["frutal"],
  madera: ["amaderada", "sandalo", "cedro"],
  maderas: ["amaderada", "sandalo", "cedro"],
  amaderado: ["amaderada"],
  intenso: ["oriental", "ambar", "intense"],
  fuerte: ["oriental", "ambar", "intense"],
  elegante: ["oriental", "chipre", "ambar"],
  sexy: ["citas", "oriental"],
  seductor: ["citas", "oriental"],
  cita: ["citas"],
  romantico: ["citas"],
  romantica: ["citas"],
  intensa: ["oriental", "ambar", "intense"],
  elegantes: ["oriental", "chipre", "ambar"],
  trabajo: ["oficina"],
  diario: ["dia", "oficina"],
  manana: ["dia"],
  tarde: ["dia"],
  fiesta: ["fiestas"],
  discoteca: ["fiestas"],
  salir: ["salidas", "fiestas"],
  playa: ["verano"],
  calor: ["verano"],
  invierno: ["temporada"],
  frio: ["temporada"],
  regalar: ["regalo"],
  regalos: ["regalo"],
  cumpleanos: ["regalo"],
  universidad: ["universidad"],
  escuela: ["universidad"],
  cafe: ["cafe"],
  vainilla: ["vainilla"],
};
export const CHIPS_PERFUME = [
  "Para ella",
  "Para él",
  "Dulce",
  "Fresco",
  "Noche",
  "Para regalar",
  "Menos de RD$2,000",
];
function distancia(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    prev = cur;
  }
  return prev[b.length];
}
// ---- Precio (docs/prompts/busqueda-comprador-precio-y-presentaciones.md): se lee primero y lo que sobra se busca como texto ----

export type FiltroPrecio =
  | { tipo: "tope"; max: number }
  | { tipo: "piso"; min: number }
  | { tipo: "rango"; min: number; max: number }
  | { tipo: "cerca"; valor: number };

/** Cuánto se aparta de un precio «cerca de»: de −25 % a +25 %. */
const BANDA_CERCA = 0.25;
const NUM = "(\\d+(?:[.,]\\d+)*)(?:\\s*(mil|k)(?![a-z0-9]))?";
const UNIDAD = "(?!\\s*(?:ml|cm|mm|gr|g|oz|kg|lb|l|pulgadas|pulgada)(?![a-z0-9]))";

/** «2000», «2,000», «2.000», «2 mil», «2k», «1.5k» → 2000, 2000, 2000, 2000, 2000, 1500. NaN si no es un precio. */
function leerNumero(digitos: string, sufijo?: string): number {
  if (sufijo) {
    const v = parseFloat(digitos.replace(",", "."));
    return Number.isFinite(v) ? Math.round(v * 1000) : NaN;
  }
  if (/^\d+$/.test(digitos)) return +digitos;
  if (/^\d{1,3}([.,]\d{3})+$/.test(digitos)) return +digitos.replace(/[.,]/g, "");
  return NaN;
}

/** Los precios con los que se compara un producto: los de sus presentaciones si tienen precio propio, o el que ve el comprador. */
export function preciosDe(p: ProductoPublico): number[] {
  if (p.variantes.length) return p.variantes.map((v) => v.precioPromo ?? v.precio);
  return [p.precioPromo ?? p.precio];
}

const cumple = (f: FiltroPrecio, x: number) =>
  f.tipo === "tope" ? x <= f.max
  : f.tipo === "piso" ? x >= f.min
  : f.tipo === "rango" ? x >= f.min && x <= f.max
  : x >= f.valor * (1 - BANDA_CERCA) && x <= f.valor * (1 + BANDA_CERCA);

/** Qué tan lejos queda un precio de lo pedido (0 = dentro). */
const lejania = (f: FiltroPrecio, x: number) =>
  f.tipo === "tope" ? Math.max(0, x - f.max)
  : f.tipo === "piso" ? Math.max(0, f.min - x)
  : f.tipo === "rango" ? Math.max(0, f.min - x, x - f.max)
  : Math.abs(x - f.valor);

/** Palabras de todo lo que el catálogo escribe (nombres, presentaciones, detalles): un número que está ahí es texto, no precio. */
function palabrasDelCatalogo(c: CatalogoPublico): Set<string> {
  const out = new Set<string>();
  for (const p of c.productos) {
    const textos = [
      p.nombre, p.categoria ?? "",
      ...Object.values(p.detalles).flat().map(String),
      ...p.opciones.flatMap((o) => o.valores),
      ...p.variantes.flatMap((v) => Object.values(v.valores)),
    ];
    for (const t of textos) for (const w of words(t)) out.add(w);
  }
  return out;
}

export function etiquetaPrecio(f: FiltroPrecio): string {
  return f.tipo === "tope" ? "Hasta " + dinero(f.max)
    : f.tipo === "piso" ? "Desde " + dinero(f.min)
    : f.tipo === "rango" ? "Entre " + dinero(f.min) + " y " + dinero(f.max)
    : "Cerca de " + dinero(f.valor);
}

/** Saca de la consulta la parte del precio. `resto` es la consulta sin esa parte (para buscar el texto y para la ✕). */
export function leerPrecio(c: CatalogoPublico, q: string): { precio: FiltroPrecio | null; resto: string } {
  let w = norm(q);
  const spans: [number, number][] = [];
  const monedas: [number, number][] = [];
  const blanquear = (i: number, fin: number) => { w = w.slice(0, i) + " ".repeat(fin - i) + w.slice(fin); };
  const tomar = (re: RegExp, acepta: (m: RegExpExecArray) => boolean): RegExpExecArray | null => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(w))) {
      if (acepta(m)) { spans.push([m.index, m.index + m[0].length]); blanquear(m.index, m.index + m[0].length); return m; }
    }
    return null;
  };
  for (const m of w.matchAll(/\brd\$?|\$|pesos?\b/g)) { monedas.push([m.index!, m.index! + m[0].length]); blanquear(m.index!, m.index! + m[0].length); }
  let catalogo: Set<string> | null = null;
  // Un número que el catálogo ya escribe («100 ml», «Talla 38», «Sombrero 2000») es texto.
  const esTexto = (v: number) => (catalogo ??= palabrasDelCatalogo(c)).has(String(v));
  const preciable = (v: number, literal: boolean) => Number.isFinite(v) && v > 0 && (literal || (v >= 100 && !esTexto(v)));
  let precio: FiltroPrecio | null = null;
  const dos = (m: RegExpExecArray) => [leerNumero(m[1]!, m[2]), leerNumero(m[3]!, m[4])] as const;
  const rango = (a: number, b: number): FiltroPrecio => ({ tipo: "rango", min: Math.min(a, b), max: Math.max(a, b) });
  const sec = (re: RegExp, literal: boolean) => {
    const m = tomar(re, (m) => { const [a, b] = dos(m); return preciable(a, literal) && preciable(b, literal); });
    if (m) { const [a, b] = dos(m); precio = rango(a, b); }
  };
  sec(new RegExp(`\\bentre\\s+${NUM}\\s+y\\s+${NUM}`, "g"), true);
  if (!precio) sec(new RegExp(`\\bde\\s+${NUM}\\s+a\\s+${NUM}`, "g"), false);
  if (!precio) sec(new RegExp(`(?<![\\d.,-])${NUM}\\s*-\\s*${NUM}`, "g"), false);
  if (!precio) {
    let max: number | null = null, min: number | null = null;
    const uno = (re: RegExp) => {
      const m = tomar(re, (m) => preciable(leerNumero(m[1]!, m[2]), true));
      return m ? leerNumero(m[1]!, m[2]) : null;
    };
    max = uno(new RegExp(`(?:\\b(?:por debajo de|debajo de|menos de|menos que|menor a|menor de|menor que|no mas de|hasta|bajo|maximo|max)\\b|<)\\s*${NUM}`, "g"));
    min = uno(new RegExp(`(?:\\b(?:por encima de|arriba de|mas de|mas que|mayor a|mayor de|mayor que|desde|minimo|min)\\b|>)\\s*${NUM}`, "g"));
    if (max !== null && min !== null) precio = rango(min, max);
    else if (max !== null) precio = { tipo: "tope", max };
    else if (min !== null) precio = { tipo: "piso", min };
    else {
      const m = tomar(new RegExp(`(?<![a-z0-9.,-])${NUM}${UNIDAD}(?![a-z0-9])`, "g"), (m) => preciable(leerNumero(m[1]!, m[2]), false));
      if (m) precio = { tipo: "cerca", valor: leerNumero(m[1]!, m[2]) };
    }
  }
  if (!precio) return { precio: null, resto: q };
  // Con el precio entendido, también sale el RD$ que lo acompañaba.
  const fuera = [...spans, ...monedas].sort((x, y) => x[0] - y[0]);
  const base = q.length === w.length ? q : norm(q);
  let resto = "", desde = 0;
  for (const [i, f] of fuera) { if (i >= desde) resto += base.slice(desde, i) + " "; desde = Math.max(desde, f); }
  resto = (resto + base.slice(desde)).replace(/\s+/g, " ").trim();
  return { precio, resto };
}

type Fila = { p: ProductoPublico; score: number; precio: number };

/** La búsqueda por palabras de siempre (en perfumes, sin cambios). `ok` deja pasar solo lo que cumple el precio. */
function puntuar(c: CatalogoPublico, q: string, ok: (p: ProductoPublico) => boolean): { filas: Fila[] | null; cheap: boolean } {
  let n = " " + norm(q) + " ";
  let cheap = false;
  n = n
    .replace(/\bpara el\b/g, " hombre ")
    .replace(/\brd\$?|\$|pesos?\b/g, " ")
    .replace(/\b(barato|baratos|barata|baratas|economico|economicos|economica|precio bajo)\b/g, () => {
      cheap = true;
      return " ";
    });
  const terms = words(n).filter((w) => !STOP.has(w));
  if (!terms.length && !cheap) return { filas: null, cheap };
  const perfume = c.tienda.rubro === "perfumes";
  const rows = c.productos
    .filter(ok)
    .map((p) => {
      const ocasiones = Array.isArray(p.detalles.ocasiones) ? p.detalles.ocasiones : [];
      const fields: [number, string][] = perfume ? [
        [5,p.nombre], [4,String(p.detalles.marca ?? "")], [3,String(p.detalles.familia ?? "")],
        [3,p.detalles.para === "ella" ? "mujer ella" : p.detalles.para === "unisex" ? "unisex hombre mujer ambos" : p.detalles.para === "el" ? "hombre el" : "perfume"],
        [2,[p.detalles.notas_salida,p.detalles.notas_corazon,p.detalles.notas_fondo].flat().filter(Boolean).join(" ")],
        [2,ocasiones.join(" ") + (ocasiones.some(o=>OCASIONES_DIA.includes(o)) ? " dia" : "") + (ocasiones.some(o=>OCASIONES_NOCHE.includes(o)) ? " noche" : "")],
        [1,String(p.detalles.descripcion ?? "")], [1,[p.detalles.concentracion,p.detalles.tamano_ml,"ml"].filter(Boolean).join(" ")]
      ] : [
        [5,p.nombre], [4,String(p.detalles.marca ?? "")], [3,p.categoria ?? ""],
        [3,p.opciones.flatMap((o) => o.valores).join(" ")],
        [3,String(p.detalles.descripcion ?? "")],
        [2,PALABRAS_DE_TIPO[p.rubro]?.join(" ") ?? ""],
        [2,Object.entries(p.detalles).filter(([k]) => k !== "descripcion").flatMap(([, v]) => v).join(" ")],
      ];
      let hit = 0,
        score = 0;
      for (const term of terms) {
        const bases = [
          term,
          ...(term.length > 4 && term.endsWith("es") ? [term.slice(0,-2)] : []),
          ...(term.length > 3 && term.endsWith("s") ? [term.slice(0, -1)] : []),
        ];
        const syns = perfume ? [...new Set(bases.flatMap((b) => SYN[b] ?? []))].filter(x=>!bases.includes(x)) : [];
        let best = 0;
        for (const [weight, text] of fields)
          for (const d of words(text))
            for (const t of [...bases, ...syns]) {
              const s =
                d === t
                  ? 1
                  : t.length >= 3 && d.startsWith(t)
                    ? 0.85
                    : t.length === 2 && weight >= 4 && d.startsWith(t) ? 0.6
                    : t.length >= 4 &&
                        d.length >= 4 &&
                        distancia(t, d, t.length >= 7 ? 2 : 1) <=
                          (t.length >= 7 ? 2 : 1)
                      ? 0.7 - distancia(t,d,t.length>=7?2:1)*0.1
                      : 0;
              best = Math.max(best, s * weight * (syns.includes(t) ? 0.7 : 1));
            }
        if (best > 0) {
          hit++;
          score += best;
        }
      }
      return { p, hit, score, precio: p.precioPromo ?? p.precio };
    });
  let full = rows.filter((r) => r.hit === terms.length);
  if (terms.length && full.length) {
    const top = Math.max(...full.map((r) => r.score));
    full = full.filter((r) => r.score >= top * 0.7);
  }
  if (!full.length) full = rows.filter((r) => r.hit > 0);
  return { filas: full.map(({ p, score, precio }) => ({ p, score, precio })), cheap };
}

export type ResultadoBusqueda = {
  productos: ProductoPublico[];
  /** Cómo se entendió el precio de la consulta; null si no traía. */
  precio: FiltroPrecio | null;
  etiqueta: string | null;
  /** La consulta sin la parte del precio (lo que deja la ✕ de la etiqueta). */
  sinPrecio: string;
  /** Con precio y sin nada que lo cumpla: `productos` son lo más cercano (hasta 6), no resultados. */
  cercanos: boolean;
};

const MAS_CERCANOS = 6;

function buscarSinTipos(c: CatalogoPublico, q: string): ResultadoBusqueda {
  const { precio, resto } = leerPrecio(c, q);
  const ok = (p: ProductoPublico) => !precio || preciosDe(p).some((x) => cumple(precio, x));
  const { filas, cheap } = puntuar(c, resto, ok);
  const base = { precio, etiqueta: precio ? etiquetaPrecio(precio) : null, sinPrecio: resto, cercanos: false };
  // El precio que manda en el orden: el más cercano al tope, el más bajo que cumple, o el más cercano a lo pedido.
  const clave = (p: ProductoPublico) => {
    const xs = precio ? preciosDe(p).filter((x) => cumple(precio, x)) : [p.precioPromo ?? p.precio];
    if (!precio) return xs[0]!;
    if (precio.tipo === "tope") return -Math.max(...xs);
    if (precio.tipo === "cerca") return Math.min(...xs.map((x) => Math.abs(x - precio.valor)));
    return Math.min(...xs);
  };
  if (!filas && !precio) return { ...base, productos: c.productos };
  const lista = filas ?? c.productos.filter(ok).map((p) => ({ p, score: 0, precio: p.precioPromo ?? p.precio }));
  if (!lista.length && precio) {
    const texto = puntuar(c, resto, () => true).filas ?? c.productos.map((p) => ({ p, score: 0, precio: 0 }));
    const cercanos = texto
      .map((r) => ({ p: r.p, d: Math.min(...preciosDe(r.p).map((x) => lejania(precio, x))) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, MAS_CERCANOS)
      .map((r) => r.p);
    return { ...base, productos: cercanos, cercanos: cercanos.length > 0 };
  }
  const productos = lista
    .map((r) => ({ ...r, k: clave(r.p) }))
    .sort((a, b) => (cheap ? a.precio - b.precio || b.score - a.score : b.score - a.score || (precio ? a.k - b.k : a.precio - b.precio)))
    .map((r) => r.p);
  return { ...base, productos };
}

// ---- Tipos de producto (docs/prompts/tipo-de-producto.md): una dimensión más de la búsqueda, solo con más de un rubro ----

/** Palabras (ya sin tildes ni mayúsculas) con las que se pide cada tipo. */
const PALABRAS_DE_TIPO: Record<Rubro, string[]> = {
  perfumes: ["perfume", "perfumes", "fragancia", "fragancias"],
  ropa: ["ropa", "prenda", "prendas", "vestimenta"],
  accesorios: ["accesorio", "accesorios"],
  belleza: ["belleza", "maquillaje"],
  comida: ["comida", "comidas"],
  hogar: ["hogar"],
  general: [],
};

/** Los tipos de la tienda que tienen productos en el catálogo (con 1 o ninguno, no hay nada que filtrar). */
export function tiposDelCatalogo(c: CatalogoPublico): Rubro[] {
  const vendidos = rubrosDeTienda(c.tienda);
  return vendidos.filter((r) => c.productos.some((p) => p.rubro === r));
}

/** Los tipos que la persona escribió ("ropa", "perfumes") y lo que queda de la consulta sin esas palabras. */
export function tiposEnConsulta(c: CatalogoPublico, q: string): { tipos: Rubro[]; resto: string } {
  const vendidos = tiposDelCatalogo(c);
  if (vendidos.length < 2) return { tipos: [], resto: q };
  const tipos: Rubro[] = [];
  const resto = q
    .split(/\s+/)
    .filter((w) => {
      const palabra = norm(w).replace(/[^a-z0-9]/g, "");
      const r = vendidos.find((v) => PALABRAS_DE_TIPO[v].includes(palabra));
      if (r) { if (!tipos.includes(r)) tipos.push(r); return false; }
      return true;
    })
    .join(" ");
  return { tipos, resto };
}

/**
 * Busca en el catálogo. Con un solo tipo de producto es la búsqueda de siempre. Con más de uno, las palabras que nombran un tipo
 * ("perfumes", "ropa") filtran por él y `tipoElegido` (la pastilla) también; el resto de la consulta se busca como siempre.
 */
export function buscarCatalogo(c: CatalogoPublico, q: string, tipoElegido: Rubro | null = null): ProductoPublico[] {
  return buscarConPrecio(c, q, tipoElegido).productos;
}

/** Lo mismo que `buscarCatalogo`, y además cómo se entendió el precio de la consulta (para la etiqueta y el «lo más cercano»). */
export function buscarConPrecio(c: CatalogoPublico, q: string, tipoElegido: Rubro | null = null): ResultadoBusqueda {
  if (tiposDelCatalogo(c).length < 2) return buscarSinTipos(c, q);
  const { tipos, resto } = tiposEnConsulta(c, q);
  const filtro = tipoElegido ? [tipoElegido] : tipos;
  if (!filtro.length) return buscarSinTipos(c, q);
  const r = buscarSinTipos({ ...c, productos: c.productos.filter((p) => filtro.includes(p.rubro)) }, resto);
  // La ✕ quita solo el precio: las palabras de tipo («ropa») siguen en la consulta.
  return r.precio ? { ...r, sinPrecio: leerPrecio(c, q).resto } : r;
}
