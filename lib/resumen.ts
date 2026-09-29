// Resumen (pantalla Inicio): cálculos puros sobre pedidos, pedido_items, eventos_aaah y productos de UNA tienda.
// Sin imports de valores (solo tipos): se prueba directo con Node (tests/resumen.test.mjs).
//
// Fechas en hora de Santo Domingo: UTC-4 todo el año (no tiene horario de verano), así que se calcula con un
// desfase fijo en vez de Intl. Cada periodo se compara contra el MISMO TRAMO de tiempo hacia atrás (ver
// docs/03-modelo-de-datos.md, "Resumen"): así "hoy a las 11 a. m." no se compara contra un día completo.

import type { EstadoPedido } from "./types";

export type Periodo = "hoy" | "semana" | "mes";

/** Santo Domingo = UTC−4. */
const DESFASE_MS = -4 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const INICIAL_DIA = ["D", "L", "M", "M", "J", "V", "S"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Fecha "de pared" en Santo Domingo, leída con getUTC*. */
const local = (ms: number) => new Date(ms + DESFASE_MS);
/** Instante real de una fecha de pared de Santo Domingo. */
const desdeLocal = (anio: number, mes: number, dia: number, hora = 0) => Date.UTC(anio, mes, dia, hora) - DESFASE_MS;

/** Las 00:00 (Santo Domingo) del día de `ms`. */
export function inicioDelDia(ms: number): number {
  const l = local(ms);
  return desdeLocal(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate());
}

/** Nombre del día de la semana en Santo Domingo ("lunes"). */
export const diaDeLaSemana = (ms: number) => DIAS[local(ms).getUTCDay()]!;

export type Tramo = { desde: number; hasta: number };

export type Barra = Tramo & {
  /** Etiqueta corta bajo la barra ("L", "2p", "Sem 1"). */
  etiqueta: string;
  /** Nombre completo para el valor elegido y los lectores de pantalla ("Lunes", "2 a 4 p. m."). */
  nombre: string;
};

export type Rangos = {
  /** Tramo del periodo: desde su inicio hasta ahora (incluido). */
  actual: Tramo;
  /** El mismo tramo, hacia atrás: el mismo día de la semana pasada, los 7 días anteriores o el mes anterior. */
  comparacion: Tramo;
  barras: Barra[];
  /** La barra de "ahora" (elegida al entrar; en Mandarina). */
  barraActual: number;
  /** "Hoy" · "7 días" · "Septiembre" (para "VENTAS · …"). */
  etiqueta: string;
  /** "vs. el lunes pasado, a esta hora" · "vs. los 7 días anteriores" · "vs. agosto, a esta altura". */
  contra: string;
};

const hora12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12}`;
const sufijo = (h: number) => (h < 12 || h === 24 ? "a. m." : "p. m.");

export function rangos(periodo: Periodo, ahora: number): Rangos {
  const hoy = inicioDelDia(ahora);
  const l = local(ahora);

  if (periodo === "hoy") {
    const barras: Barra[] = Array.from({ length: 12 }, (_, i) => {
      const h = i * 2;
      return {
        desde: hoy + h * HORA_MS,
        hasta: hoy + (h + 2) * HORA_MS,
        etiqueta: `${hora12(h)}${h < 12 ? "a" : "p"}`,
        nombre: `De ${hora12(h)} ${sufijo(h)} a ${hora12(h + 2)} ${sufijo(h + 2)}`,
      };
    });
    return {
      actual: { desde: hoy, hasta: ahora },
      comparacion: { desde: hoy - 7 * DIA_MS, hasta: ahora - 7 * DIA_MS },
      barras,
      barraActual: Math.floor(l.getUTCHours() / 2),
      etiqueta: "Hoy",
      contra: `vs. el ${diaDeLaSemana(ahora)} pasado, a esta hora`,
    };
  }

  if (periodo === "semana") {
    const desde = hoy - 6 * DIA_MS;
    const barras: Barra[] = Array.from({ length: 7 }, (_, i) => {
      const d = desde + i * DIA_MS;
      return {
        desde: d,
        hasta: d + DIA_MS,
        etiqueta: INICIAL_DIA[local(d).getUTCDay()]!,
        nombre: i === 6 ? "Hoy" : i === 5 ? "Ayer" : mayuscula(diaDeLaSemana(d)),
      };
    });
    return {
      actual: { desde, hasta: ahora },
      comparacion: { desde: desde - 7 * DIA_MS, hasta: ahora - 7 * DIA_MS },
      barras,
      barraActual: 6,
      etiqueta: "7 días",
      contra: "vs. los 7 días anteriores",
    };
  }

  // Este mes: del día 1 a ahora, contra el mes anterior hasta la misma altura (sin pasarse de su último día)
  const anio = l.getUTCFullYear();
  const mes = l.getUTCMonth();
  const desde = desdeLocal(anio, mes, 1);
  const finMes = desdeLocal(anio, mes + 1, 1);
  const desdeAnterior = desdeLocal(anio, mes - 1, 1);
  const diasDelMes = Math.round((finMes - desde) / DIA_MS);
  // Una barra por semana del mes: 1–7, 8–14, 15–21, 22–28 y, si hay, 29–fin
  const barras: Barra[] = Array.from({ length: Math.ceil(diasDelMes / 7) }, (_, i) => {
    const d = desde + i * 7 * DIA_MS;
    const h = Math.min(d + 7 * DIA_MS, finMes);
    const ultimo = local(h - 1).getUTCDate();
    return { desde: d, hasta: h, etiqueta: `Sem ${i + 1}`, nombre: `Del ${i * 7 + 1} al ${ultimo} de ${MESES[mes]}` };
  });
  return {
    actual: { desde, hasta: ahora },
    comparacion: { desde: desdeAnterior, hasta: Math.min(desdeAnterior + (ahora - desde), desde) },
    barras,
    barraActual: Math.floor((l.getUTCDate() - 1) / 7),
    etiqueta: mayuscula(MESES[mes]!),
    contra: `vs. ${MESES[(mes + 11) % 12]}, a esta altura`,
  };
}

// ---------------------------------------------------------------------------
// Cifras
// ---------------------------------------------------------------------------

type PedidoResumen = {
  estado: EstadoPedido;
  total: number;
  creadoEn: string;
  items: { productoId: string; nombreProducto: string; cantidad: number }[];
};
type EventoResumen = { creadoEn: string };
type ProductoResumen = { id: string; nombre: string; fotos: string[]; stock: number | null };

/** ¿`iso` cae en el tramo? Incluye `hasta` (un pedido creado justo "ahora" cuenta). */
const dentro = (iso: string, t: Tramo) => {
  const ms = Date.parse(iso);
  return ms >= t.desde && ms <= t.hasta;
};

/** Variación en % entera contra el periodo anterior. `null` si no hay con qué comparar (anterior = 0). */
export function variacion(actual: number, anterior: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(anterior) || anterior <= 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** "+18%" · "−7%" · "0%". Sin comparación: `null` (la pantalla lo dice con palabras, nunca "-%"). */
export function textoVariacion(v: number | null): string | null {
  if (v === null) return null;
  if (v > 0) return `+${v}%`;
  if (v < 0) return `−${Math.abs(v)}%`;
  return "0%";
}

export type ProductoTop = { productoId: string; nombre: string; foto: string | null; unidades: number };

export type Resumen = {
  periodo: Periodo;
  rangos: Rangos;
  /** Suma de `total` de los pedidos no cancelados del periodo. */
  ventas: number;
  ventasComparacion: number;
  /** % entero; `null` = sin datos para comparar. */
  variacion: number | null;
  pedidos: number;
  /** RD$ redondeado; `null` sin pedidos. */
  ticketPromedio: number | null;
  aaahs: number;
  /** "De aaah a pedido": pedidos ÷ aaahs en %, con un decimal; `null` sin aaahs. */
  conversion: number | null;
  /** Ventas por barra; `null` en las barras que aún no llegan (futuras). */
  ventasPorBarra: (number | null)[];
  /** Top 3 por unidades vendidas en pedidos no cancelados del periodo. */
  top: ProductoTop[];
  /** Sin pedidos ni aaahs en el periodo: la pantalla muestra el estado vacío. */
  vacio: boolean;
};

export function calcularResumen(
  datos: { pedidos: PedidoResumen[]; eventos: EventoResumen[]; productos: ProductoResumen[] },
  periodo: Periodo,
  ahora: number,
): Resumen {
  const r = rangos(periodo, ahora);
  const validos = datos.pedidos.filter((p) => p.estado !== "cancelado");
  const delPeriodo = validos.filter((p) => dentro(p.creadoEn, r.actual));
  const ventas = delPeriodo.reduce((s, p) => s + p.total, 0);
  const ventasComparacion = validos.filter((p) => dentro(p.creadoEn, r.comparacion)).reduce((s, p) => s + p.total, 0);
  const pedidos = delPeriodo.length;
  const aaahs = datos.eventos.filter((e) => dentro(e.creadoEn, r.actual)).length;

  const ventasPorBarra = r.barras.map((b) =>
    b.desde > ahora
      ? null
      : delPeriodo.filter((p) => {
          const ms = Date.parse(p.creadoEn);
          return ms >= b.desde && ms < b.hasta;
        }).reduce((s, p) => s + p.total, 0),
  );

  const unidades = new Map<string, { nombre: string; unidades: number }>();
  for (const p of delPeriodo)
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
    periodo,
    rangos: r,
    ventas,
    ventasComparacion,
    variacion: variacion(ventas, ventasComparacion),
    pedidos,
    ticketPromedio: pedidos > 0 ? Math.round(ventas / pedidos) : null,
    aaahs,
    conversion: aaahs > 0 ? Math.round((pedidos / aaahs) * 1000) / 10 : null,
    ventasPorBarra,
    top,
    vacio: pedidos === 0 && aaahs === 0,
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
  const t = rangos("semana", ahora).actual;
  return eventos.filter((e) => dentro(e.creadoEn, t)).length;
};
