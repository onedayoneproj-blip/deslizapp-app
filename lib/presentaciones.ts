// Presentaciones del producto (docs/prompts/presentaciones-panel.md): un producto con sus tallas, colores o tamaños. Lógica pura,
// sin pantalla ni datos: la comparten el panel y la demo, y las pruebas la ejercitan directo. Los límites son los de la base
// (`opciones_validas`, `guardar_variantes`): 2 ejes, 12 valores de hasta 20 letras por eje, 144 presentaciones.

import { colorPorNombre, esEjeColor } from "./colores";
import type { Rubro } from "./rubros";
import type { FotosPorValor, Medio, OpcionProducto, Producto } from "./types";

export const MAX_EJES = 2;
export const MAX_VALORES = 12;
export const LARGO_VALOR = 20;
export const MAX_PRESENTACIONES = 144;
/** Cuántas filas se ven antes de «Ver las N». */
export const VISIBLES = 5;

/** Una presentación en edición: lo que se guardará con `guardarVariantes`. `id` solo si ya existía en la base. */
export type Presentacion = {
  id?: string;
  valores: Record<string, string>;
  stock: number | null;
  /** null = el mismo precio del producto. */
  precio: number | null;
  activa: boolean;
};

/** La llave de una combinación: igual sin importar el orden de los ejes en el objeto. */
export const claveVariante = (valores: Record<string, string>) =>
  Object.keys(valores)
    .sort()
    .map((k) => `${k}=${valores[k]}`)
    .join("|");

/** Todas las combinaciones de los ejes, en el orden de los ejes y de sus valores ("S · Arena", "S · Negro", "M · Arena"…). */
export function combinaciones(opciones: OpcionProducto[]): Record<string, string>[] {
  if (opciones.length === 0) return [];
  return opciones.reduce<Record<string, string>[]>((acc, eje) => acc.flatMap((c) => eje.valores.map((v) => ({ ...c, [eje.nombre]: v }))), [{}]);
}

export const textoCombinacion = (opciones: OpcionProducto[], valores: Record<string, string>) =>
  opciones.map((o) => valores[o.nombre]).filter(Boolean).join(" · ");

/** ¿Estos valores son una combinación posible de estos ejes (un valor por eje, de los que el eje tiene)? */
export const esDeLosEjes = (opciones: OpcionProducto[], valores: Record<string, string>) =>
  opciones.length > 0 &&
  Object.keys(valores).length === opciones.length &&
  opciones.every((o) => o.valores.includes(valores[o.nombre] ?? ""));

/**
 * Las presentaciones de un producto tal como están guardadas: las activas y las ocultas que siguen siendo una combinación de sus
 * ejes. Una que quedó inactiva porque se quitó un valor del eje (con pedidos) ya no es combinación y no se muestra.
 */
export function presentacionesDe(producto: Pick<Producto, "opciones" | "variantes"> | null): Presentacion[] {
  if (!producto) return [];
  const vistas = new Set<string>();
  const lista: Presentacion[] = [];
  const ordenadas = [...(producto.variantes ?? [])].sort((a, b) => a.orden - b.orden);
  for (const v of ordenadas) {
    const k = claveVariante(v.valores);
    if (!esDeLosEjes(producto.opciones, v.valores) || vistas.has(k)) continue;
    vistas.add(k);
    lista.push({ id: v.id, valores: v.valores, stock: v.stock, precio: v.precio, activa: v.activa });
  }
  return lista;
}

/** El orden de las filas: el de los ejes y sus valores (como las combinaciones), no el de creación. */
export function ordenarPresentaciones(opciones: OpcionProducto[], lista: Presentacion[]): Presentacion[] {
  const peso = (p: Presentacion) => opciones.reduce((n, o) => n * (MAX_VALORES + 1) + Math.max(0, o.valores.indexOf(p.valores[o.nombre] ?? "")), 0);
  return [...lista].sort((a, b) => peso(a) - peso(b));
}

// ---------------------------------------------------------------------------------------------------------------------
// Crear varias a la vez («Elegir»)
// ---------------------------------------------------------------------------------------------------------------------

/** Cuántas presentaciones salen de estos ejes (el producto de sus valores); 0 si falta algún valor. */
export const cuantasSalen = (ejes: OpcionProducto[]) => (ejes.length === 0 ? 0 : ejes.reduce((n, e) => n * e.valores.length, 1));

/** Los ejes están completos y dentro de los límites: nombre, valores sin repetir, ≤ 12 valores, ≤ 20 letras, ≤ 144 en total. */
export function errorDeEjes(ejes: OpcionProducto[]): string | null {
  if (ejes.length === 0) return "Elige qué cambia de una a otra.";
  if (ejes.length > MAX_EJES) return `Hasta ${MAX_EJES} cosas pueden cambiar.`;
  const nombres = new Set<string>();
  for (const e of ejes) {
    const nombre = e.nombre.trim();
    if (!nombre) return "Ponle nombre a lo que cambia.";
    if (nombre.length > LARGO_VALOR) return `El nombre va hasta ${LARGO_VALOR} letras.`;
    if (nombres.has(nombre.toLocaleLowerCase("es"))) return "Ya tienes una opción con ese nombre.";
    nombres.add(nombre.toLocaleLowerCase("es"));
    if (e.valores.length === 0) return `Falta algún valor en ${nombre}.`;
    if (e.valores.length > MAX_VALORES) return `Hasta ${MAX_VALORES} valores en ${nombre}.`;
    if (new Set(e.valores).size !== e.valores.length) return `Hay un valor repetido en ${nombre}.`;
    if (e.valores.some((v) => !v.trim() || v.length > LARGO_VALOR)) return `Cada valor va hasta ${LARGO_VALOR} letras.`;
  }
  if (cuantasSalen(ejes) > MAX_PRESENTACIONES) return `Son demasiadas: el máximo es ${MAX_PRESENTACIONES} presentaciones.`;
  return null;
}

/** Todas las combinaciones de los ejes como presentaciones nuevas (stock 0, el mismo precio). Las que ya existían se conservan. */
export function crearTodas(ejes: OpcionProducto[], existentes: Presentacion[] = []): Presentacion[] {
  const previas = new Map(existentes.map((p) => [claveVariante(p.valores), p]));
  return combinaciones(ejes).map((valores) => previas.get(claveVariante(valores)) ?? { valores, stock: 0, precio: null, activa: true });
}

/** Atajos de valores para un eje: «XS a XL», «36 a 42», «Única» en Talla; «30 · 50 · 100 ml» en el Tamaño de los perfumes. */
export function atajosDe(nombre: string, rubro: Rubro | null = null): { texto: string; valores: string[] }[] {
  const n = nombre.trim();
  if (/^talla/i.test(n)) {
    return [
      { texto: "XS a XL", valores: ["XS", "S", "M", "L", "XL"] },
      { texto: "36 a 42", valores: ["36", "37", "38", "39", "40", "41", "42"] },
      { texto: "Única", valores: ["Única"] },
    ];
  }
  if (rubro === "perfumes" && /^tama[ñn]o/i.test(n)) return [{ texto: "30 · 50 · 100 ml", valores: ["30 ml", "50 ml", "100 ml"] }];
  return [];
}

// ---------------------------------------------------------------------------------------------------------------------
// La lista de «cosas que cambian» y sus valores sugeridos (hoja «¿Qué cambia de una a otra?»)
// ---------------------------------------------------------------------------------------------------------------------

/** Las cosas que cambian que ofrece cualquier tienda, además de lo típico de su tipo. */
export const COSAS_QUE_CAMBIAN = ["Color", "Tamaño", "Talla", "Material", "Modelo", "Sabor", "Tono"] as const;

/** «Lo típico en {tipo}»: cómo se dice el tipo en esa frase. */
export const TIPO_EN_FRASE: Record<Rubro, string> = {
  perfumes: "perfumes", ropa: "ropa", accesorios: "accesorios", belleza: "belleza", comida: "comida", hogar: "hogar", general: "general",
};

const mismo = (a: string, b: string) => a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");

/** Los dos grupos de la hoja: lo típico del tipo (primero) y las otras del catálogo fijo, sin repetir las de arriba. */
export function listaDeCosas(tipicas: readonly string[]): { tipicas: string[]; otras: string[] } {
  const arriba = [...tipicas];
  return { tipicas: arriba, otras: COSAS_QUE_CAMBIAN.filter((c) => !arriba.some((t) => mismo(t, c))) };
}

/** Valores sugeridos de cada cosa (corta, en español dominicano). Modelo: ninguno. */
const SUGERIDOS: Record<string, string[]> = {
  talla: ["XS", "S", "M", "L", "XL"],
  color: ["Dorado", "Plateado", "Negro", "Blanco", "Rojo", "Azul", "Rosado", "Verde", "Beige", "Gris", "Marrón"],
  tamano: ["Pequeño", "Mediano", "Grande"],
  material: ["Algodón", "Lino", "Cuero", "Metal"],
  sabor: ["Vainilla", "Chocolate", "Fresa", "Limón"],
  tono: ["Claro", "Medio", "Oscuro"],
};

export function valoresSugeridos(nombre: string, rubro: Rubro | null = null): string[] {
  const n = nombre.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n === "tamano" && rubro === "perfumes") return ["30 ml", "50 ml", "100 ml"];
  return [...(SUGERIDOS[n] ?? [])];
}

/** Los valores como se ven: primero los sugeridos y después los que el dueño escribió o ya tenía (en el orden en que los puso). */
export const valoresVisibles = (sugeridos: string[], elegidos: string[]) => [...sugeridos, ...elegidos.filter((v) => !sugeridos.includes(v))];

/** Los valores elegidos, en el orden en que se ven (así las combinaciones salen en un orden estable). */
export const ordenarValores = (sugeridos: string[], elegidos: string[]) => valoresVisibles(sugeridos, elegidos).filter((v) => elegidos.includes(v));

/** Agrega o quita un valor; no pasa de `MAX_VALORES` ni de `LARGO_VALOR` letras, ni repite (sin distinguir mayúsculas). */
export function alternarValor(valores: string[], valor: string): string[] {
  if (valores.includes(valor)) return valores.filter((v) => v !== valor);
  const limpio = valor.trim().replace(/\s+/g, " ").slice(0, LARGO_VALOR);
  if (!limpio || valores.length >= MAX_VALORES || valores.some((v) => mismo(v, limpio))) return valores;
  return [...valores, limpio];
}

/** ¿Se puede elegir otra cosa que cambie? Hasta `MAX_EJES` por producto, las del catálogo y las propias juntas. */
export const puedeElegirOtra = (cuantas: number) => cuantas < MAX_EJES;

/** El error de un nombre propio («+ Otra cosa»): vacío, largo, repetido o igual a una del catálogo. null si sirve. */
export function errorDeNombrePropio(nombre: string, elegidas: readonly string[], tipicas: readonly string[] = []): string | null {
  const n = nombre.trim();
  if (!n) return "Escribe qué cambia.";
  if (n.length > LARGO_VALOR) return `Hasta ${LARGO_VALOR} letras.`;
  if (elegidas.some((e) => mismo(e, n))) return "Ya la elegiste.";
  if (COSAS_QUE_CAMBIAN.some((c) => mismo(c, n)) || tipicas.some((t) => mismo(t, n))) return "Esa ya está en la lista: tócala arriba.";
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Agregar una suelta
// ---------------------------------------------------------------------------------------------------------------------

export type ResultadoCambio = { opciones: OpcionProducto[]; presentaciones: Presentacion[]; aviso: string | null };

/**
 * Agrega UNA presentación con estos valores (uno por eje). Un valor que el eje todavía no tiene lo suma al eje. Si ya existe
 * (también si está oculta) lanza el aviso en vez de duplicar.
 */
export function agregarSuelta(opciones: OpcionProducto[], lista: Presentacion[], valores: Record<string, string>): ResultadoCambio {
  const limpios: Record<string, string> = {};
  for (const o of opciones) limpios[o.nombre] = (valores[o.nombre] ?? "").trim();
  if (opciones.some((o) => !limpios[o.nombre])) throw new Error("Elige un valor en cada uno.");
  if (opciones.some((o) => limpios[o.nombre].length > LARGO_VALOR)) throw new Error(`Cada valor va hasta ${LARGO_VALOR} letras.`);
  if (lista.some((p) => claveVariante(p.valores) === claveVariante(limpios))) throw new Error("Esa presentación ya existe.");
  if (lista.length >= MAX_PRESENTACIONES) throw new Error(`El máximo es ${MAX_PRESENTACIONES} presentaciones.`);
  const nuevasOpciones = opciones.map((o) => {
    if (o.valores.includes(limpios[o.nombre])) return o;
    if (o.valores.length >= MAX_VALORES) throw new Error(`${o.nombre} llega hasta ${MAX_VALORES} valores.`);
    return { ...o, valores: [...o.valores, limpios[o.nombre]] };
  });
  return { opciones: nuevasOpciones, presentaciones: [...lista, { valores: limpios, stock: 0, precio: null, activa: true }], aviso: null };
}

// ---------------------------------------------------------------------------------------------------------------------
// Cambiar qué varía
// ---------------------------------------------------------------------------------------------------------------------

/** El valor de «todavía no lo sé» de un eje nuevo: «Sin color», «Sin talla». */
export const valorSin = (eje: string) => `Sin ${eje.trim().toLocaleLowerCase("es")}`.slice(0, LARGO_VALOR);

/**
 * Pasa de unos ejes a otros conservando lo que existe, con su stock y su precio:
 *  - un eje que sigue (mismo nombre) conserva el valor de cada presentación; si su valor ya no está, la presentación se va;
 *  - un eje nuevo pone «Sin <eje>» en las que ya existían (y se suma a los valores del eje): el dueño las completa después;
 *  - un eje que se quita puede dejar dos iguales: se juntan en una y se suma su stock (no se pierde ni se duplica nada).
 * `aviso` dice, en la voz de la app, qué pasó con lo que existía.
 */
export function cambiarQueVaria(antes: Presentacion[], nuevos: OpcionProducto[]): ResultadoCambio {
  const error = errorDeEjes(nuevos);
  if (error) throw new Error(error);
  const sinValor = new Map<string, string>();
  const ejes = nuevos.map((e) => ({ ...e, valores: [...e.valores] }));
  const nombresAntes = new Set(antes.flatMap((p) => Object.keys(p.valores)));
  for (const e of ejes) {
    if (nombresAntes.has(e.nombre) || antes.length === 0) continue;
    const sin = valorSin(e.nombre);
    if (!e.valores.includes(sin)) {
      if (e.valores.length >= MAX_VALORES) throw new Error(`Deja un lugar libre en ${e.nombre}: ahí va «${sin}» para las que ya tienes.`);
      e.valores.push(sin);
    }
    sinValor.set(e.nombre, sin);
  }
  if (cuantasSalen(ejes) > MAX_PRESENTACIONES && antes.length > 0) throw new Error(`Son demasiadas: el máximo es ${MAX_PRESENTACIONES} presentaciones.`);
  const resultado = new Map<string, Presentacion>();
  let perdidas = 0;
  let juntadas = 0;
  for (const p of antes) {
    const valores: Record<string, string> = {};
    let cabe = true;
    for (const e of ejes) {
      const v = sinValor.get(e.nombre) ?? p.valores[e.nombre];
      if (v === undefined || !e.valores.includes(v)) cabe = false;
      else valores[e.nombre] = v;
    }
    if (!cabe) {
      perdidas++;
      continue;
    }
    const k = claveVariante(valores);
    const previa = resultado.get(k);
    if (previa) {
      juntadas++;
      resultado.set(k, { ...previa, stock: previa.stock === null && p.stock === null ? null : (previa.stock ?? 0) + (p.stock ?? 0), activa: previa.activa || p.activa });
    } else resultado.set(k, { ...p, valores });
  }
  const partes: string[] = [];
  if (sinValor.size > 0 && antes.length > 0) partes.push(`Las que tienes pasan a «${[...sinValor.values()].join("» y «")}»: ponles el valor cuando puedas.`);
  if (juntadas > 0) partes.push(`${juntadas === 1 ? "Dos se juntaron en una" : `${juntadas + 1} se juntaron`}: sumamos su stock.`);
  if (perdidas > 0) partes.push(`${perdidas === 1 ? "Una se va" : `${perdidas} se van`}: su valor ya no está. Si tiene pedidos, solo queda oculta.`);
  return { opciones: ejes, presentaciones: ordenarPresentaciones(ejes, [...resultado.values()]), aviso: partes.length ? partes.join(" ") : null };
}

/** Cuántas de las que existen se perderían al pasar a estos ejes (para avisar antes de guardar). */
export const cuantasSeVan = (antes: Presentacion[], nuevos: OpcionProducto[]) => {
  try {
    return antes.length - cambiarQueVaria(antes, nuevos).presentaciones.length;
  } catch {
    return 0;
  }
};

/** Completar una presentación «Sin color»: le pone otros valores si no chocan con otra. Lanza el aviso si ya existe. */
export function cambiarValores(lista: Presentacion[], clave: string, valores: Record<string, string>): Presentacion[] {
  const nueva = claveVariante(valores);
  if (nueva !== clave && lista.some((p) => claveVariante(p.valores) === nueva)) throw new Error("Esa presentación ya existe.");
  return lista.map((p) => (claveVariante(p.valores) === clave ? { ...p, valores } : p));
}

// ---------------------------------------------------------------------------------------------------------------------
// Quitar
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Quitar una presentación. Sin pedidos se va (la base la borra al guardar); con pedidos solo se oculta, para no perder el
 * historial (docs: «Ya tiene pedidos: la ocultamos para no perder tu historial»).
 */
export function quitar(lista: Presentacion[], clave: string, tienePedidos: boolean): { presentaciones: Presentacion[]; oculta: boolean } {
  if (tienePedidos) return { presentaciones: lista.map((p) => (claveVariante(p.valores) === clave ? { ...p, activa: false } : p)), oculta: true };
  return { presentaciones: lista.filter((p) => claveVariante(p.valores) !== clave), oculta: false };
}

export const TEXTO_CON_PEDIDOS = "Ya tiene pedidos: la ocultamos para no perder tu historial.";

// ---------------------------------------------------------------------------------------------------------------------
// Lo que se ve de cada presentación
// ---------------------------------------------------------------------------------------------------------------------

/** El color (hex) de una presentación si algún eje es Color y el nombre se conoce. */
export function colorDe(opciones: OpcionProducto[], valores: Record<string, string>): string | null {
  const eje = opciones.find((o) => esEjeColor(o.nombre));
  return eje ? colorPorNombre(valores[eje.nombre] ?? "") : null;
}

/** El precio que se cobra por una presentación: el suyo o el del producto. */
export const precioDe = (p: Pick<Presentacion, "precio">, precioProducto: number) => p.precio ?? precioProducto;

export type EstadoPresentacion = "oculta" | "agotada" | "quedan" | "normal";

/** «Oculta» (no la ve el cliente), «Agotada» (0), «Quedan N» (1 o 2) o normal. Sin control de stock (null) es normal. */
export function estadoDe(p: Presentacion): { estado: EstadoPresentacion; texto: string | null } {
  if (!p.activa) return { estado: "oculta", texto: "Oculta" };
  if (p.stock === 0) return { estado: "agotada", texto: "Agotada" };
  if (p.stock !== null && p.stock <= 2) return { estado: "quedan", texto: `Quedan ${p.stock}` };
  return { estado: "normal", texto: null };
}

export type ResumenPresentaciones = {
  /** Las que el cliente ve (activas). */
  total: number;
  agotadas: number;
  ocultas: number;
  /** Suma del stock de las activas. */
  enTotal: number;
  /** El precio más bajo entre las activas; null si no hay. */
  desde: number | null;
  /** ¿Alguna cuesta distinto al producto? */
  conPrecioPropio: boolean;
};

export function resumenDe(lista: Presentacion[], precioProducto: number): ResumenPresentaciones {
  const activas = lista.filter((p) => p.activa);
  const precios = activas.map((p) => precioDe(p, precioProducto));
  return {
    total: activas.length,
    agotadas: activas.filter((p) => p.stock === 0).length,
    ocultas: lista.length - activas.length,
    enTotal: activas.reduce((s, p) => s + (p.stock ?? 0), 0),
    desde: precios.length ? Math.min(...precios) : null,
    conPrecioPropio: activas.some((p) => p.precio !== null && p.precio !== precioProducto),
  };
}

/** El resumen de un producto ya guardado (null si no tiene presentaciones activas): lo que dice su tarjeta del catálogo del panel. */
export function resumenDeProducto(producto: Producto): ResumenPresentaciones | null {
  if ((producto.tipo ?? "producto") !== "producto" || producto.opciones.length === 0) return null;
  const r = resumenDe(presentacionesDe(producto), producto.precio);
  return r.total > 0 ? r : null;
}

export const textoPresentaciones = (n: number) => `${n} ${n === 1 ? "presentación" : "presentaciones"}`;

/** Quedan por elegir: «Camisa de lino · L · Negro» (el nombre del producto y la combinación). */
export const nombreCompleto = (producto: Pick<Producto, "nombre" | "opciones">, valores: Record<string, string>) =>
  [producto.nombre, textoCombinacion(producto.opciones, valores)].filter(Boolean).join(" · ");

// ---------------------------------------------------------------------------------------------------------------------
// La foto de cada color
// ---------------------------------------------------------------------------------------------------------------------

/** El eje que lleva foto: Color si existe; si no, el primero. null si no hay ejes. */
export function ejeDeFoto(opciones: OpcionProducto[]): OpcionProducto | null {
  return opciones.find((o) => esEjeColor(o.nombre)) ?? opciones[0] ?? null;
}

/** Como `public.fotos_por_valor_limpias`: solo las entradas cuyo eje y valor existen y cuya url es una foto del producto. */
export function limpiarFotosPorValor(fotos: FotosPorValor | undefined, opciones: OpcionProducto[], medios: Medio[]): FotosPorValor {
  const urls = new Set(medios.flatMap((m) => (m.tipo === "foto" ? [m.url] : [])));
  const salida: FotosPorValor = {};
  for (const [eje, valores] of Object.entries(fotos ?? {})) {
    const def = opciones.find((o) => o.nombre === eje);
    if (!def || typeof valores !== "object" || valores === null) continue;
    for (const [valor, url] of Object.entries(valores)) {
      if (typeof url === "string" && def.valores.includes(valor) && urls.has(url)) (salida[eje] ??= {})[valor] = url;
    }
  }
  return salida;
}

/** Guarda (o, con url nula, quita) la foto de un valor; lanza si no es de este producto. Como `public.guardar_foto_valor`. */
export function asignarFotoValor(producto: Pick<Producto, "opciones" | "medios" | "fotosPorValor">, eje: string, valor: string, url: string | null): FotosPorValor {
  const actual = producto.fotosPorValor ?? {};
  const valores = { ...(actual[eje] ?? {}) };
  if (url === null) delete valores[valor];
  else valores[valor] = url;
  const siguiente: FotosPorValor = { ...actual };
  if (Object.keys(valores).length === 0) delete siguiente[eje];
  else siguiente[eje] = valores;
  if (url !== null && JSON.stringify(limpiarFotosPorValor(siguiente, producto.opciones, producto.medios)) !== JSON.stringify(siguiente)) {
    throw new Error("Esa foto no es de este producto, o el valor ya no existe.");
  }
  return siguiente;
}

/** La foto de un valor, si tiene. */
export const fotoDeValor = (fotos: FotosPorValor | undefined, eje: string, valor: string): string | null => fotos?.[eje]?.[valor] ?? null;

/** Cuántas presentaciones (activas) usan la foto de este valor. */
export const cuantasUsan = (lista: Presentacion[], eje: string, valor: string) => lista.filter((p) => p.activa && p.valores[eje] === valor).length;

/** Las presentaciones de la base a partir del borrador, como las pide `guardarVariantes`. */
export function datosParaGuardar(lista: Presentacion[], stockDe: (p: Presentacion) => number | null) {
  return lista.map((p) => ({ valores: p.valores, stock: stockDe(p), precio: p.precio, activa: p.activa }));
}
