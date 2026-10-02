// Resumen (pantalla Inicio): cálculos puros sobre pedidos, pedido_items, eventos_aaah y productos de UNA tienda.
// Sin imports de valores (solo tipos): se prueba directo con Node (tests/resumen.test.mjs).
//
// La pantalla SOLO llama a estas funciones (rangos, barras y cifras). Cuando llegue Supabase, `calcularResumen` se
// cambia por consultas agregadas con los mismos rangos, sin tocar la interfaz (docs/05-arquitectura.md).
//
// Fechas en hora de Santo Domingo: UTC−4 todo el año (sin horario de verano), así que se calcula con un desfase
// fijo en vez de Intl. Todos los tramos son semiabiertos [desde, hasta); "hasta ahora" es `ahora + 1`.
// Reglas de comparación: docs/03-modelo-de-datos.md, "Resumen".

import type { EstadoPedido } from "./types";

export type Vista = "hoy" | "semana" | "mes" | "anio";
/** Mes (0–11) y año que se miran en las vistas Mes y Año. En Hoy y 7 días no se usa. */
export type Ancla = { anio: number; mes: number };
export type Tramo = { desde: number; hasta: number };

/** Santo Domingo = UTC−4. */
const DESFASE_MS = -4 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const INICIAL_DIA = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Fecha "de pared" en Santo Domingo, leída con getUTC*. */
const local = (ms: number) => new Date(ms + DESFASE_MS);
/** Instante real de una fecha de pared de Santo Domingo (acepta desbordes: mes 12 = enero siguiente). */
const desdeLocal = (anio: number, mes: number, dia = 1, hora = 0) => Date.UTC(anio, mes, dia, hora) - DESFASE_MS;

/** Las 00:00 (Santo Domingo) del día de `ms`. */
export function inicioDelDia(ms: number): number {
  const l = local(ms);
  return desdeLocal(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate());
}

/** Mes y año (Santo Domingo) de `ms`. */
export function anclaDe(ms: number): Ancla {
  const l = local(ms);
  return { anio: l.getUTCFullYear(), mes: l.getUTCMonth() };
}

/** Nombre del día de la semana en Santo Domingo ("lunes"). */
export const diaDeLaSemana = (ms: number) => DIAS[local(ms).getUTCDay()]!;

export const nombreMes = (mes: number) => mayuscula(MESES[((mes % 12) + 12) % 12]!);

/** "12 sept" · "12 de septiembre" */
const diaCorto = (ms: number) => `${local(ms).getUTCDate()} ${MESES_CORTOS[local(ms).getUTCMonth()]}`;
/** "12 de sept" (píldora y tarjeta) */
const diaDe = (ms: number) => `${local(ms).getUTCDate()} de ${MESES_CORTOS[local(ms).getUTCMonth()]}`;
const diaLargo = (ms: number) => `${local(ms).getUTCDate()} de ${MESES[local(ms).getUTCMonth()]}`;
/** "15–21 sept" · "29 ago–4 sept" (el tramo termina en `hasta` − 1 ms). */
function tramoDias(t: Tramo): string {
  const a = local(t.desde);
  const b = local(t.hasta - 1);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear())
    return a.getUTCDate() === b.getUTCDate() ? diaCorto(t.desde) : `${a.getUTCDate()}–${b.getUTCDate()} ${MESES_CORTOS[a.getUTCMonth()]}`;
  return `${diaCorto(t.desde)}–${diaCorto(t.hasta - 1)}`;
}

const hora12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12}`;
const sufijo = (h: number) => (h < 12 || h === 24 ? "a. m." : "p. m.");
const franja = (h: number) => `de ${hora12(h)} ${sufijo(h)} a ${hora12(h + 2)} ${sufijo(h + 2)}`;

const esMesActual = (a: Ancla, ahora: number) => {
  const b = anclaDe(ahora);
  return a.anio === b.anio && a.mes === b.mes;
};

// ---------------------------------------------------------------------------
// Rangos del periodo y su comparación
// ---------------------------------------------------------------------------

/** Tramo del periodo. En curso: hasta ahora (incluido). Pasado: completo. */
export function rangoPeriodo(vista: Vista, ancla: Ancla, ahora: number): Tramo {
  const hoy = inicioDelDia(ahora);
  const tope = ahora + 1;
  if (vista === "hoy") return { desde: hoy, hasta: tope };
  if (vista === "semana") return { desde: hoy - 6 * DIA_MS, hasta: tope };
  if (vista === "mes") return { desde: desdeLocal(ancla.anio, ancla.mes), hasta: Math.min(desdeLocal(ancla.anio, ancla.mes + 1), tope) };
  return { desde: desdeLocal(ancla.anio, 0), hasta: Math.min(desdeLocal(ancla.anio + 1, 0), tope) };
}

/** Los mismos días (del 1 al día de `ahora`) del mes anterior a `ancla`, sin pasarse de su último día. */
function mismosDiasDelMesAnterior(ancla: Ancla, ahora: number): Tramo {
  const desde = desdeLocal(ancla.anio, ancla.mes - 1);
  const dia = local(ahora).getUTCDate();
  return { desde, hasta: Math.min(desdeLocal(ancla.anio, ancla.mes - 1, dia + 1), desdeLocal(ancla.anio, ancla.mes)) };
}

export type Comparacion = Tramo & { /** "vs. 1–5 sept", "vs. agosto", "vs. ene–sept 2025"… */ texto: string };

/**
 * Contra qué se compara el periodo:
 * - Hoy: el mismo día de la semana pasada, hasta la misma hora.
 * - 7 días: los 7 días anteriores.
 * - Mes en curso: los mismos días del mes anterior (1 a hoy; si tiene menos días, hasta su último día).
 * - Mes pasado: el mes anterior completo.
 * - Año en curso: del 1 de enero a la misma fecha del año anterior. Año pasado: el año anterior completo.
 */
export function rangoComparacion(vista: Vista, ancla: Ancla, ahora: number): Comparacion {
  const p = rangoPeriodo(vista, ancla, ahora);
  if (vista === "hoy") {
    const t = { desde: p.desde - 7 * DIA_MS, hasta: p.hasta - 7 * DIA_MS };
    return { ...t, texto: `vs. ${DIAS_CORTOS[local(t.desde).getUTCDay()]} ${diaCorto(t.desde)}, a esta hora` };
  }
  if (vista === "semana") {
    const t = { desde: p.desde - 7 * DIA_MS, hasta: p.desde };
    return { ...t, texto: `vs. ${tramoDias(t)}` };
  }
  if (vista === "mes") {
    const anterior = anclaDe(desdeLocal(ancla.anio, ancla.mes - 1));
    const conAnio = anterior.anio !== ancla.anio ? ` ${anterior.anio}` : "";
    if (esMesActual(ancla, ahora)) {
      const t = mismosDiasDelMesAnterior(ancla, ahora);
      return { ...t, texto: `vs. ${tramoDias(t)}${conAnio}` };
    }
    return { desde: desdeLocal(ancla.anio, ancla.mes - 1), hasta: desdeLocal(ancla.anio, ancla.mes), texto: `vs. ${MESES[anterior.mes]}${conAnio}` };
  }
  const actual = anclaDe(ahora);
  if (ancla.anio === actual.anio) {
    const dia = local(ahora).getUTCDate();
    const t = {
      desde: desdeLocal(ancla.anio - 1, 0),
      hasta: Math.min(desdeLocal(ancla.anio - 1, actual.mes, dia + 1), desdeLocal(ancla.anio - 1, actual.mes + 1)),
    };
    const meses = actual.mes === 0 ? "ene" : `ene–${MESES_CORTOS[actual.mes]}`;
    return { ...t, texto: `vs. ${meses} ${ancla.anio - 1}` };
  }
  return { desde: desdeLocal(ancla.anio - 1, 0), hasta: desdeLocal(ancla.anio, 0), texto: `vs. ${ancla.anio - 1}` };
}

// ---------------------------------------------------------------------------
// Barras
// ---------------------------------------------------------------------------

export type EstadoBarra = "normal" | "futura" | "antes";

export type Barra = Tramo & {
  /** Etiqueta del eje ("L", "2p", "12", "Ene"); vacía cuando no toca mostrarla (Mes: cada ~5 días). */
  etiqueta: string;
  /** Para lectores de pantalla: "12 de septiembre", "de 2 p. m. a 4 p. m.", "mayo de 2026". */
  nombre: string;
  /** Para la píldora: "el 12 de sept", "agosto", "de 2 a 4 p. m.". */
  solo: string;
  /** Para la tarjeta de ventas: "del 12 de sept", "de agosto", "de 2 a 4 p. m.". */
  de: string;
  /** "futura": aún no llega. "antes": antes de que la tienda empezara. Ninguna de las dos se puede elegir. */
  estado: EstadoBarra;
  /** La barra de "ahora" (hoy, este mes…): va en Mandarina. */
  actual: boolean;
};

/**
 * Barras de la vista: Hoy, 12 franjas de 2 h · 7 días, una por día · Mes, una por día (28–31) · Año, una por mes.
 * `inicio`: desde cuándo hay datos de la tienda (ver `inicioDeDatos`).
 */
export function barras(vista: Vista, ancla: Ancla, ahora: number, inicio: number): Barra[] {
  const estado = (t: Tramo): EstadoBarra => (t.desde > ahora ? "futura" : t.hasta <= inicio ? "antes" : "normal");
  const conEstado = (b: Omit<Barra, "estado" | "actual">): Barra => ({ ...b, estado: estado(b), actual: b.desde <= ahora && ahora < b.hasta });
  const hoy = inicioDelDia(ahora);

  if (vista === "hoy")
    return Array.from({ length: 12 }, (_, i) => {
      const h = i * 2;
      const texto = `de ${hora12(h)} a ${hora12(h + 2)} ${sufijo(h + 2)}`;
      return conEstado({
        desde: hoy + h * HORA_MS,
        hasta: hoy + (h + 2) * HORA_MS,
        etiqueta: i % 2 === 0 ? `${hora12(h)}${h < 12 ? "a" : "p"}` : "",
        nombre: `Hoy ${franja(h)}`,
        solo: texto,
        de: texto,
      });
    });

  if (vista === "semana")
    return Array.from({ length: 7 }, (_, i) => {
      const d = hoy - (6 - i) * DIA_MS;
      return conEstado({
        desde: d,
        hasta: d + DIA_MS,
        etiqueta: INICIAL_DIA[local(d).getUTCDay()]!,
        nombre: `${mayuscula(DIAS[local(d).getUTCDay()]!)} ${diaLargo(d)}`,
        solo: `el ${diaDe(d)}`,
        de: `del ${diaDe(d)}`,
      });
    });

  if (vista === "mes") {
    const desde = desdeLocal(ancla.anio, ancla.mes);
    const dias = Math.round((desdeLocal(ancla.anio, ancla.mes + 1) - desde) / DIA_MS);
    return Array.from({ length: dias }, (_, i) => {
      const d = desdeLocal(ancla.anio, ancla.mes, i + 1);
      const n = i + 1;
      return conEstado({
        desde: d,
        hasta: desdeLocal(ancla.anio, ancla.mes, i + 2),
        etiqueta: n === 1 || n % 5 === 0 ? String(n) : "",
        nombre: diaLargo(d),
        solo: `el ${diaDe(d)}`,
        de: `del ${diaDe(d)}`,
      });
    });
  }

  return Array.from({ length: 12 }, (_, i) =>
    conEstado({
      desde: desdeLocal(ancla.anio, i),
      hasta: desdeLocal(ancla.anio, i + 1),
      etiqueta: mayuscula(MESES_CORTOS[i]!.slice(0, 3)),
      nombre: `${MESES[i]} de ${ancla.anio}`,
      solo: MESES[i]!,
      de: `de ${MESES[i]}`,
    }),
  );
}

/** Tramo de una barra (la de "ahora", hasta ahora). */
export function rangoBarra(vista: Vista, indice: number, ancla: Ancla, ahora: number, inicio = 0): Tramo {
  const b = barras(vista, ancla, ahora, inicio)[indice];
  if (!b) throw new RangeError(`No hay barra ${indice} en la vista ${vista}.`);
  return { desde: b.desde, hasta: Math.min(b.hasta, ahora + 1) };
}

/**
 * Contra qué se compara una barra elegida:
 * - Franja de 2 h: la misma franja del mismo día de la semana pasada.
 * - Día (7 días o Mes): el mismo día de la semana anterior ("vs. jue 5 sept").
 * - Mes (Año): el mes anterior completo ("vs. julio"); si es el mes en curso, los mismos días del mes anterior.
 * En todos, si la barra es la de ahora, hasta la misma hora.
 */
export function rangoComparacionBarra(vista: Vista, indice: number, ancla: Ancla, ahora: number): Comparacion {
  const t = rangoBarra(vista, indice, ancla, ahora);
  if (vista === "hoy") {
    const c = { desde: t.desde - 7 * DIA_MS, hasta: t.hasta - 7 * DIA_MS };
    return { ...c, texto: `vs. ${DIAS_CORTOS[local(c.desde).getUTCDay()]} ${diaCorto(c.desde)}, misma franja` };
  }
  if (vista === "semana" || vista === "mes") {
    const c = { desde: t.desde - 7 * DIA_MS, hasta: t.hasta - 7 * DIA_MS };
    return { ...c, texto: `vs. ${DIAS_CORTOS[local(c.desde).getUTCDay()]} ${diaCorto(c.desde)}` };
  }
  const mes: Ancla = { anio: ancla.anio, mes: indice };
  const anterior = anclaDe(desdeLocal(ancla.anio, indice - 1));
  const conAnio = anterior.anio !== ancla.anio ? ` ${anterior.anio}` : "";
  if (esMesActual(mes, ahora)) {
    const c = mismosDiasDelMesAnterior(mes, ahora);
    return { ...c, texto: `vs. ${tramoDias(c)}${conAnio}` };
  }
  return { desde: desdeLocal(ancla.anio, indice - 1), hasta: desdeLocal(ancla.anio, indice), texto: `vs. ${MESES[anterior.mes]}${conAnio}` };
}

// ---------------------------------------------------------------------------
// Cifras
// ---------------------------------------------------------------------------

type PedidoResumen = {
  estado: EstadoPedido;
  total: number;
  creadoEn: string;
  /** Cuándo se despachó (o la fecha elegida en una venta pasada). Nulo si aún no se despacha. */
  despachadoEn?: string | null;
  items: { productoId: string; nombreProducto: string; cantidad: number }[];
};
type EventoResumen = { creadoEn: string };
type ProductoResumen = { id: string; nombre: string; fotos: string[]; stock: number | null };
export type DatosResumen = { pedidos: PedidoResumen[]; eventos: EventoResumen[]; productos: ProductoResumen[] };

const dentro = (iso: string, t: Tramo) => {
  const ms = Date.parse(iso);
  return ms >= t.desde && ms < t.hasta;
};

// Reglas del Resumen (un solo lugar):
// - VENTA: pedido "despachado". Su fecha es `despachadoEn` (si viniera nulo, `creadoEn`).
// - PEDIDO RECIBIDO: cualquier pedido no cancelado, contado por `creadoEn`.
// - PEDIDO PENDIENTE: "nuevo" o "por_despachar" (todavía no es venta).

/** Pedidos recibidos: todos los no cancelados. Se cuentan por `creadoEn`. */
const validos = (pedidos: PedidoResumen[]) => pedidos.filter((p) => p.estado !== "cancelado");
/** Ventas: solo los pedidos despachados. Se cuentan por `fechaDeVenta`. */
export const ventasDe = <P extends { estado: EstadoPedido }>(pedidos: P[]): P[] => pedidos.filter((p) => p.estado === "despachado");
/** Pendientes: pedidos "nuevo" o "por_despachar". */
export const pendientesDe = <P extends { estado: EstadoPedido }>(pedidos: P[]): P[] =>
  pedidos.filter((p) => p.estado === "nuevo" || p.estado === "por_despachar");
/** Fecha de una venta: cuándo se despachó (si viniera nulo por algún motivo, cuándo se creó). */
export const fechaDeVenta = (p: { creadoEn: string; despachadoEn?: string | null }) => p.despachadoEn ?? p.creadoEn;

/** Cantidad y monto de los pedidos pendientes de toda la tienda (sin importar el periodo). */
export function resumenPendientes(pedidos: PedidoResumen[]): { cantidad: number; monto: number } {
  const p = pendientesDe(pedidos);
  return { cantidad: p.length, monto: p.reduce((s, x) => s + x.total, 0) };
}

/** Desde cuándo hay datos de la tienda: su primer pedido o aaah; si no hay ninguno, cuando se creó. */
export function inicioDeDatos(datos: Pick<DatosResumen, "pedidos" | "eventos">, creadaEn: string): number {
  const fechas = [...datos.pedidos.map((p) => Date.parse(p.creadoEn)), ...datos.eventos.map((e) => Date.parse(e.creadoEn))];
  return fechas.length ? Math.min(...fechas) : Date.parse(creadaEn);
}

/** Primer mes navegable (‹ se desactiva ahí). */
export const primerMesConDatos = (datos: Pick<DatosResumen, "pedidos" | "eventos">, creadaEn: string): Ancla => anclaDe(inicioDeDatos(datos, creadaEn));

/** Ventas (pedidos despachados, por fecha de venta) de cada día de un tramo, en hora de Santo Domingo. */
export function ventasPorDia(pedidos: PedidoResumen[], t: Tramo): number[] {
  const primero = inicioDelDia(t.desde);
  const n = Math.max(0, Math.ceil((t.hasta - primero) / DIA_MS));
  const res = Array.from({ length: n }, () => 0);
  for (const p of ventasDe(pedidos)) {
    const f = fechaDeVenta(p);
    if (dentro(f, t)) res[Math.floor((Date.parse(f) - primero) / DIA_MS)]! += p.total;
  }
  return res;
}

/** Ventas (pedidos despachados, por fecha de venta) de cada mes de un año (enero = 0), en hora de Santo Domingo. */
export function ventasPorMes(pedidos: PedidoResumen[], anio: number): number[] {
  const res = Array.from({ length: 12 }, () => 0);
  for (const p of ventasDe(pedidos)) {
    const l = local(Date.parse(fechaDeVenta(p)));
    if (l.getUTCFullYear() === anio) res[l.getUTCMonth()]! += p.total;
  }
  return res;
}

/** Variación en % entera. `null` si no hay con qué comparar (antes = 0) o no hay ventas ahora (nunca "−100%"). */
export function variacion(actual: number, anterior: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior) || anterior <= 0 || actual <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** "+18%" · "−7%" · "0%". Sin comparación: `null` (la pantalla dice "Sin comparación todavía"). */
export function textoVariacion(v: number | null): string | null {
  if (v === null) return null;
  if (v > 0) return `+${v}%`;
  if (v < 0) return `−${Math.abs(v)}%`;
  return "0%";
}

/** "RD$950" · "RD$12k" · "RD$1.2M" (eje del gráfico; el monto completo va en la tarjeta). */
export function montoCorto(monto: number): string {
  if (monto >= 1_000_000) return `RD$${(monto / 1_000_000).toFixed(monto >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (monto >= 1_000) return `RD$${(monto / 1_000).toFixed(monto >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `RD$${Math.round(monto)}`;
}

export type ProductoTop = { productoId: string; nombre: string; foto: string | null; unidades: number };

export type Cifras = {
  /** Suma de `total` de los pedidos despachados (ventas) del tramo, por fecha de venta. */
  ventas: number;
  /** Cantidad de ventas (pedidos despachados) del tramo. */
  ventasCantidad: number;
  ventasComparacion: number;
  /** Suma de pedidos `por_despachar` del tramo (no son ventas confirmadas). */
  porDespachar: number;
  /** Suma de pedidos `por_despachar` del tramo de comparación. */
  porDespacharComparacion: number;
  /** Total que representa la tarjeta y el gráfico: despachados + por despachar. */
  totalGrafico: number;
  totalGraficoComparacion: number;
  variacionGrafico: number | null;
  /** % entero; `null` = sin comparación. */
  variacion: number | null;
  /** Pedidos recibidos (no cancelados) del tramo, por fecha de creación. */
  pedidos: number;
  /** Total despachado ÷ cantidad de despachados, RD$ redondeado; `null` sin ventas. */
  ticketPromedio: number | null;
  aaahs: number;
  /** "De aaah a pedido": pedidos ÷ aaahs en %, con un decimal; `null` sin aaahs. */
  conversion: number | null;
  /** Top 3 por unidades vendidas en pedidos despachados. */
  top: ProductoTop[];
};

/** Todas las cifras de un tramo contra su comparación. */
export function cifras(datos: DatosResumen, t: Tramo, comparacion: Tramo): Cifras {
  const recibidos = validos(datos.pedidos).filter((p) => dentro(p.creadoEn, t));
  const despachados = ventasDe(datos.pedidos);
  const del = despachados.filter((p) => dentro(fechaDeVenta(p), t));
  const ventas = del.reduce((s, p) => s + p.total, 0);
  const ventasComparacion = despachados.filter((p) => dentro(fechaDeVenta(p), comparacion)).reduce((s, p) => s + p.total, 0);
  const porDespachar = datos.pedidos.filter((p) => p.estado === "por_despachar" && dentro(p.creadoEn, t)).reduce((s, p) => s + p.total, 0);
  const porDespacharComparacion = datos.pedidos
    .filter((p) => p.estado === "por_despachar" && dentro(p.creadoEn, comparacion))
    .reduce((s, p) => s + p.total, 0);
  const totalGrafico = ventas + porDespachar;
  const totalGraficoComparacion = ventasComparacion + porDespacharComparacion;
  const aaahs = datos.eventos.filter((e) => dentro(e.creadoEn, t)).length;

  const unidades = new Map<string, { nombre: string; unidades: number }>();
  for (const p of del)
    for (const it of p.items) {
      const u = unidades.get(it.productoId) ?? { nombre: it.nombreProducto, unidades: 0 };
      u.unidades += it.cantidad;
      unidades.set(it.productoId, u);
    }
  const top = [...unidades.entries()]
    .filter(([, u]) => u.unidades > 0)
    .sort((a, b) => b[1].unidades - a[1].unidades || a[1].nombre.localeCompare(b[1].nombre, "es"))
    .slice(0, 3)
    .map(([productoId, u]) => {
      const prod = datos.productos.find((x) => x.id === productoId);
      return { productoId, nombre: prod?.nombre ?? u.nombre, foto: prod?.fotos[0] ?? null, unidades: u.unidades };
    });

  return {
    ventas,
    ventasCantidad: del.length,
    ventasComparacion,
    porDespachar,
    porDespacharComparacion,
    totalGrafico,
    totalGraficoComparacion,
    variacionGrafico: variacion(totalGrafico, totalGraficoComparacion),
    variacion: variacion(ventas, ventasComparacion),
    pedidos: recibidos.length,
    ticketPromedio: del.length > 0 ? Math.round(ventas / del.length) : null,
    aaahs,
    conversion: aaahs > 0 ? Math.round((recibidos.length / aaahs) * 1000) / 10 : null,
    top,
  };
}

/** Ventas confirmadas y pedidos por despachar agrupados por fecha de creación. */
export type BarraConValor = Barra & {
  ventas: number | null;
  ventasCantidad: number | null;
  porDespachar: number | null;
  porDespacharCantidad: number | null;
  pedidos: number | null;
};

export type Resumen = Cifras & {
  vista: Vista;
  ancla: Ancla;
  /** Tramo mirado (el periodo o la barra elegida). */
  tramo: Tramo;
  comparacion: Comparacion;
  /** "de septiembre", "de los últimos 7 días", "del 12 de sept"… (para "Ventas …"). */
  titulo: string;
  barras: BarraConValor[];
  /** Barra elegida (`null` = todo el periodo). */
  seleccion: number | null;
  /** Total del gráfico del periodo completo: despachados + por despachar. */
  ventasDelPeriodo: number;
  /** Sin pedidos ni aaahs en todo el periodo: la pantalla muestra el estado vacío. */
  vacio: boolean;
};

function tituloPeriodo(vista: Vista, ancla: Ancla, ahora: number): string {
  if (vista === "hoy") return "de hoy";
  if (vista === "semana") return "de los últimos 7 días";
  if (vista === "mes") return `de ${MESES[ancla.mes]}${ancla.anio !== anclaDe(ahora).anio ? ` ${ancla.anio}` : ""}`;
  return `de ${ancla.anio}`;
}

/**
 * El Resumen de una vista (y, si hay, de la barra elegida). `inicio`: `inicioDeDatos(...)`.
 * Una barra futura o anterior al inicio no se puede elegir: se ignora.
 */
export function calcularResumen(
  datos: DatosResumen,
  vista: Vista,
  ancla: Ancla,
  ahora: number,
  { inicio = 0, seleccion = null }: { inicio?: number; seleccion?: number | null } = {},
): Resumen {
  const periodo = rangoPeriodo(vista, ancla, ahora);
  const bs = barras(vista, ancla, ahora, inicio);
  const recibidos = validos(datos.pedidos);
  const despachados = ventasDe(datos.pedidos);
  const porDespachar = datos.pedidos.filter((p) => p.estado === "por_despachar");
  const conValor: BarraConValor[] = bs.map((b) => {
    if (b.estado !== "normal") return { ...b, ventas: null, ventasCantidad: null, porDespachar: null, porDespacharCantidad: null, pedidos: null };
    const ventas = despachados.filter((p) => dentro(fechaDeVenta(p), b));
    const pendientes = porDespachar.filter((p) => dentro(p.creadoEn, b));
    return {
      ...b,
      ventas: ventas.reduce((s, p) => s + p.total, 0),
      ventasCantidad: ventas.length,
      porDespachar: pendientes.reduce((s, p) => s + p.total, 0),
      porDespacharCantidad: pendientes.length,
      pedidos: recibidos.filter((p) => dentro(p.creadoEn, b)).length,
    };
  });
  const elegida = seleccion !== null && bs[seleccion]?.estado === "normal" ? seleccion : null;
  const tramo = elegida === null ? periodo : rangoBarra(vista, elegida, ancla, ahora);
  const comparacion = elegida === null ? rangoComparacion(vista, ancla, ahora) : rangoComparacionBarra(vista, elegida, ancla, ahora);
  const delPeriodo = cifras(datos, periodo, comparacion);
  const c = elegida === null ? delPeriodo : cifras(datos, tramo, comparacion);
  return {
    ...c,
    vista,
    ancla,
    tramo,
    comparacion,
    titulo: elegida === null ? tituloPeriodo(vista, ancla, ahora) : bs[elegida]!.de,
    barras: conValor,
    seleccion: elegida,
    ventasDelPeriodo: delPeriodo.totalGrafico,
    vacio: delPeriodo.pedidos === 0 && delPeriodo.ventasCantidad === 0 && delPeriodo.aaahs === 0,
  };
}

/** Pedidos por confirmar (estado `nuevo`), sin importar el periodo. */
export const contarPedidosNuevos = (pedidos: { estado: EstadoPedido }[]) => pedidos.filter((p) => p.estado === "nuevo").length;

/** "Ojo con el stock": con stock contado y `<= umbral`. Primero los agotados, luego los que tienen menos. */
export function stockBajo<P extends ProductoResumen>(productos: P[], umbral: number): P[] {
  return productos
    .filter((p) => p.stock !== null && p.stock <= umbral)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0) || a.nombre.localeCompare(b.nombre, "es"));
}

/** Aaahs de los últimos 7 días (para el remate bajo el saludo). */
export const aaahsDeLaSemana = (eventos: EventoResumen[], ahora: number) => {
  const t = rangoPeriodo("semana", anclaDe(ahora), ahora);
  return eventos.filter((e) => dentro(e.creadoEn, t)).length;
};
