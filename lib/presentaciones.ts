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

/** Lo que la ficha del producto edita de las presentaciones: los ejes, cada presentación y la foto de cada valor (por id de foto). */
export type EstadoPresentaciones = {
  opciones: OpcionProducto[];
  pres: Presentacion[];
  /** valor del eje que lleva foto → id de la foto en el borrador de la ficha. */
  fotosColor: Record<string, string>;
};

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

/** Cosas cuyo nombre acaba en «a» pero se dicen en masculino («el aroma»). */
const MASCULINAS = new Set(["aroma", "idioma", "sistema", "tema", "diseño"]);
const esFemenina = (nombre: string) => /a$/i.test(nombre.trim()) && !MASCULINAS.has(nombre.trim().toLocaleLowerCase("es"));

/** «Otro color», «Otra talla»: el botón que abre el campo de un valor propio. */
export const otroDe = (nombre: string) => `${esFemenina(nombre) ? "Otra" : "Otro"} ${nombre.trim().toLocaleLowerCase("es")}`;

/** «las tallas», «los colores»: para «Repártelas entre las tallas». */
export function entreLos(nombre: string): string {
  const n = nombre.trim().toLocaleLowerCase("es");
  const plural = /[aeiouáéíóú]$/.test(n) ? `${n}s` : `${n}es`;
  return `${esFemenina(n) ? "las" : "los"} ${plural}`;
}

/** Por qué todavía no se puede seguir al paso 2 (null si ya se puede). Dice la cosa que falta, no solo que falta algo. */
export function pistaDeEjes(ejes: { nombre: string; valores: string[] }[]): string | null {
  if (ejes.length === 0) return "Elige qué cambia de una a otra.";
  const sin = ejes.filter((e) => e.valores.length === 0).map((e) => e.nombre);
  if (sin.length > 0) return `Elige al menos un valor de ${sin.join(" y de ")}.`;
  return errorDeEjes(ejes);
}

/** Una tarjeta sin elegir se apaga (no se toca) cuando ya hay `MAX_EJES` elegidas; las elegidas nunca se apagan. */
export const tarjetaApagada = (elegida: boolean, cuantasElegidas: number) => !elegida && !puedeElegirOtra(cuantasElegidas);

/** Lo que dice una tarjeta colapsada debajo del nombre: los valores elegidos, o «Elige cuáles tienes». */
export const resumenDeValores = (valores: readonly string[]) => (valores.length > 0 ? valores.join(", ") : "Elige cuáles tienes");

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
// Cambiar qué cambia (paso 1) y repartir lo que había (paso 2)
// ---------------------------------------------------------------------------------------------------------------------

export type ResultadoCambio = { opciones: OpcionProducto[]; presentaciones: Presentacion[] };

/** Stock que había antes del cambio y hay que repartir entre las filas nuevas: «Tenías 5 de Plateado» o «Tenías 8». */
export type Origen = {
  id: string;
  /** «Plateado», «Plateado · Algodón»; vacío cuando era el stock simple del producto o el de todas juntas. */
  titulo: string;
  total: number;
  /** Las filas (por `claveVariante`) entre las que se reparte. */
  filas: string[];
};

export type Cambio = ResultadoCambio & {
  origenes: Origen[];
  /** Presentaciones que se van porque su valor ya no está. */
  perdidas: number;
  /** Unidades de stock que se van con ellas. */
  unidadesPerdidas: number;
  /** Cuántas se juntaron en otra al quitar una cosa. */
  juntadas: number;
  /** La pregunta antes de aplicar (null si el cambio no pierde ni mueve nada que importe). */
  confirmar: string | null;
};

const sumaStock = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));
const unidades = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

/**
 * Pasa de unos ejes a otros (paso 1 → paso 2) sin perder stock en silencio:
 *  - un valor nuevo suma sus filas con 0; un valor que se quita se lleva las suyas (con pedidos, la base solo las oculta);
 *  - quitar una cosa junta las filas que quedan iguales y suma su stock;
 *  - agregar una cosa crea todas las combinaciones con 0 y devuelve un `Origen` por cada valor viejo con stock: el dueño
 *    lo reparte en el paso 2 y «Listo» no se enciende hasta que cuadre;
 *  - pasar de stock simple (`stockSimple`) a presentaciones deja un solo origen con ese total.
 * `antes` son las presentaciones de `opcionesAntes`; las de los ejes que siguen conservan su precio y si están ocultas.
 */
export function cambiarEjes(opcionesAntes: OpcionProducto[], antes: Presentacion[], nuevos: OpcionProducto[], stockSimple: number | null = null): Cambio {
  const error = errorDeEjes(nuevos);
  if (error) throw new Error(error);
  const ejes = nuevos.map((e) => ({ ...e, valores: [...e.valores] }));
  const nombresAntes = new Set(opcionesAntes.map((o) => o.nombre));
  const comunes = ejes.filter((e) => nombresAntes.has(e.nombre));
  const agregados = ejes.filter((e) => !nombresAntes.has(e.nombre));
  const quitados = opcionesAntes.filter((o) => !ejes.some((e) => e.nombre === o.nombre)).length;

  // Lo que había, mirado solo por las cosas que siguen: las que ya no caben se pierden y las que quedan iguales se juntan.
  const proyectadas = new Map<string, Presentacion>();
  let perdidas = 0;
  let unidadesPerdidas = 0;
  let juntadas = 0;
  if (comunes.length > 0) {
    for (const p of antes) {
      const valores: Record<string, string> = {};
      const cabe = comunes.every((e) => {
        const v = p.valores[e.nombre];
        if (v === undefined || !e.valores.includes(v)) return false;
        valores[e.nombre] = v;
        return true;
      });
      if (!cabe) {
        perdidas++;
        if (p.activa) unidadesPerdidas += p.stock ?? 0;
        continue;
      }
      const k = claveVariante(valores);
      const previa = proyectadas.get(k);
      if (previa) {
        juntadas++;
        proyectadas.set(k, { ...previa, stock: sumaStock(previa.stock, p.stock), activa: previa.activa || p.activa });
      } else proyectadas.set(k, { ...p, valores });
    }
  }

  const origenes: Origen[] = [];
  let presentaciones: Presentacion[];
  if (agregados.length === 0) {
    presentaciones = crearTodas(ejes, [...proyectadas.values()]);
  } else {
    // El stock de antes que no tiene a dónde ir solo (porque se creó una cosa nueva) se reparte.
    const todas = combinaciones(ejes);
    if (comunes.length === 0) {
      const total = antes.length > 0 ? antes.filter((p) => p.activa).reduce((s, p) => s + (p.stock ?? 0), 0) : (stockSimple ?? 0);
      presentaciones = todas.map((valores) => ({ valores, stock: 0, precio: null, activa: true }));
      if (total > 0) origenes.push({ id: "todo", titulo: "", total, filas: presentaciones.map((p) => claveVariante(p.valores)) });
    } else {
      presentaciones = todas.map((valores) => {
        const de = proyectadas.get(claveVariante(Object.fromEntries(comunes.map((e) => [e.nombre, valores[e.nombre]!]))));
        return { valores, stock: de && de.stock === null ? null : 0, precio: de?.precio ?? null, activa: de?.activa ?? true };
      });
      for (const [, de] of proyectadas) {
        if (!de.activa || !de.stock) continue;
        const filas = presentaciones.filter((p) => comunes.every((e) => p.valores[e.nombre] === de.valores[e.nombre])).map((p) => claveVariante(p.valores));
        origenes.push({ id: claveVariante(de.valores), titulo: textoCombinacion(comunes, de.valores), total: de.stock, filas });
      }
    }
  }
  presentaciones = ordenarPresentaciones(ejes, presentaciones);

  // La pregunta: solo cuando algo se va o se mueve.
  const partes: string[] = [];
  if (comunes.length === 0 && antes.length > 0) partes.push("Las que tienes se reemplazan por las nuevas y su stock lo repartes en el paso 2.");
  else {
    if (perdidas > 0) partes.push(`${perdidas === 1 ? "Una presentación se va" : `${perdidas} presentaciones se van`}${unidadesPerdidas > 0 ? ` con ${unidades(unidadesPerdidas)}` : ""}. Si ya tiene pedidos, solo queda oculta.`);
    if (quitados > 0 && juntadas > 0) partes.push(`Las que quedan iguales se juntan y suman su stock (${juntadas === 1 ? "una se junta" : `${juntadas} se juntan`}).`);
  }
  return { opciones: ejes, presentaciones, origenes, perdidas, unidadesPerdidas, juntadas, confirmar: partes.length ? partes.join(" ") : null };
}

/** Cuántas de las que existen se perderían al pasar a estos ejes (para avisar antes de guardar). */
export const cuantasSeVan = (opcionesAntes: OpcionProducto[], antes: Presentacion[], nuevos: OpcionProducto[]) => {
  try {
    return cambiarEjes(opcionesAntes, antes, nuevos).perdidas;
  } catch {
    return 0;
  }
};

/** Los ejes son los mismos (nombres y valores, en el mismo orden): no hay nada que recalcular. */
export const mismosEjes = (a: OpcionProducto[], b: OpcionProducto[]) => JSON.stringify(a) === JSON.stringify(b);

/** Quita de cada cosa los valores que se quedaron sin ninguna presentación (así «Cómo se ve» y el catálogo no ofrecen lo que no hay). */
export function podarValores(opciones: OpcionProducto[], pres: Presentacion[]): OpcionProducto[] {
  return opciones.map((o) => ({ ...o, valores: o.valores.filter((v) => pres.some((p) => p.valores[o.nombre] === v)) }));
}

/** Pone encima de lo recalculado lo que el dueño ya había tocado en el paso 2 (stock, precio propio, oculta) en las filas que siguen. */
export function conservarEdicion(nuevas: Presentacion[], editadas: Presentacion[]): Presentacion[] {
  const previas = new Map(editadas.map((p) => [claveVariante(p.valores), p]));
  return nuevas.map((p) => {
    const e = previas.get(claveVariante(p.valores));
    return e ? { ...p, stock: e.stock, precio: e.precio, activa: e.activa } : p;
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// El reparto: «Tenías 5 de Plateado. Repártelas entre las tallas: faltan 2.»
// ---------------------------------------------------------------------------------------------------------------------

export type EstadoReparto = { origen: Origen; repartido: number; /** Positivo: faltan; negativo: sobran; 0: cuadra. */ faltan: number };

/** Cuánto lleva repartido cada origen: la suma del stock de sus filas (las activas que siguen en la lista). */
export function estadoDeReparto(origenes: Origen[], pres: Presentacion[]): EstadoReparto[] {
  const porClave = new Map(pres.map((p) => [claveVariante(p.valores), p]));
  return origenes.map((origen) => {
    const repartido = origen.filas.reduce((s, k) => {
      const p = porClave.get(k);
      return s + (p && p.activa ? (p.stock ?? 0) : 0);
    }, 0);
    return { origen, repartido, faltan: origen.total - repartido };
  });
}

/** ¿Todo lo que había quedó repartido? Mientras no, «Listo» no se enciende. */
export const repartoCuadra = (origenes: Origen[], pres: Presentacion[]) => estadoDeReparto(origenes, pres).every((e) => e.faltan === 0);

/** Lo que se dice de un origen: «Tenías 5 de Plateado. Repártelas entre las tallas: faltan 2.» */
export function textoDeReparto(e: EstadoReparto, entre: string): string {
  const tenia = e.origen.titulo ? `Tenías ${e.origen.total} de ${e.origen.titulo}.` : `Tenías ${e.origen.total}.`;
  if (e.faltan === 0) return `${tenia} Ya las repartiste.`;
  if (e.faltan > 0) return `${tenia} Repártelas ${entre}: ${e.faltan === 1 ? "falta 1" : `faltan ${e.faltan}`}.`;
  return `${tenia} Te pasaste por ${-e.faltan}.`;
}

/** «Ponerlas todas en …»: todo el stock del origen en una fila y las demás del origen en 0. */
export function ponerTodasEn(pres: Presentacion[], origen: Origen, clave: string): Presentacion[] {
  return pres.map((p) => {
    const k = claveVariante(p.valores);
    return origen.filas.includes(k) ? { ...p, stock: k === clave ? origen.total : 0 } : p;
  });
}

/** «Poner a todas»: la misma cantidad en todas las filas (las ocultas se quedan como están). */
export const ponerATodas = (pres: Presentacion[], cantidad: number): Presentacion[] => pres.map((p) => (p.activa ? { ...p, stock: Math.max(0, Math.floor(cantidad)) } : p));

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

/** ¿Alguna presentación activa tiene un precio distinto al del producto? Con esto el interruptor «Cada una tiene su precio» arranca encendido. */
export const tienePreciosPropios = (lista: Presentacion[], precioProducto: number) =>
  lista.some((p) => p.activa && p.precio !== null && p.precio !== precioProducto);

/** ¿Los precios de las presentaciones activas no son todos iguales? Entonces la tarjeta de Precio dice «Desde». */
export const preciosVarian = (lista: Presentacion[], precioProducto: number) =>
  new Set(lista.filter((p) => p.activa).map((p) => precioDe(p, precioProducto))).size > 1;

/** Apagar «Cada una tiene su precio»: todas vuelven al precio del producto. */
export const unificarPrecios = (lista: Presentacion[]): Presentacion[] => lista.map((p) => (p.precio === null ? p : { ...p, precio: null }));

/** El precio que escribió el dueño en una fila (solo dígitos): vacío, 0 o igual al del producto = sin precio propio. */
export const precioDeTexto = (digitos: string, precioProducto: number): number | null => {
  const n = Number(digitos.replace(/\D/g, "").slice(0, 7));
  return n > 0 && n !== precioProducto ? n : null;
};

export type EstadoPresentacion = "oculta" | "agotada" | "quedan" | "normal";

/**
 * «Oculta» (no la ve el cliente), «Agotada» (0), «Quedan N» (1 o 2) o normal. Sin control de stock (null) es normal. «Agotada»
 * es de una presentación que ya existía en un producto ya publicado: la que recién se crea, o la de un producto que aún no se
 * publicó, solo muestra su «0» (todavía no se ha puesto stock).
 */
export function estadoDe(p: Presentacion, publicado = true): { estado: EstadoPresentacion; texto: string | null } {
  if (!p.activa) return { estado: "oculta", texto: "Oculta" };
  if (p.stock === 0) return publicado && p.id ? { estado: "agotada", texto: "Agotada" } : { estado: "normal", texto: null };
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

/** Si cambian los ejes, la foto de un valor solo sigue si el eje que lleva foto es el mismo y el valor sigue existiendo. */
export function podarFotosColor(fotos: Record<string, string>, antes: OpcionProducto[], despues: OpcionProducto[]): Record<string, string> {
  const a = ejeDeFoto(antes);
  const d = ejeDeFoto(despues);
  if (!a || !d || a.nombre !== d.nombre) return {};
  return Object.fromEntries(Object.entries(fotos).filter(([valor]) => d.valores.includes(valor)));
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
