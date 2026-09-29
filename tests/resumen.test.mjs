import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  aaahsDeLaSemana,
  anclaDe,
  barras,
  calcularResumen,
  cifras,
  inicioDelDia,
  montoCorto,
  primerMesConDatos,
  rangoBarra,
  rangoComparacion,
  rangoComparacionBarra,
  rangoPeriodo,
  stockBajo,
  textoVariacion,
  variacion,
  ventasPorDia,
  ventasPorMes,
} from "../lib/resumen.ts";

const iso = (ms) => new Date(ms).toISOString();
const T = (s) => Date.parse(s);
const seed = (n) => JSON.parse(readFileSync(new URL(`../lib/data/seed/${n}.json`, import.meta.url), "utf8"));

// Lunes 28 de septiembre de 2026, 12:00 del mediodía en Santo Domingo (= fecha de referencia del seed)
const REF = T("2026-09-28T16:00:00.000Z");
const SEPT = anclaDe(REF);
const tramo = (t) => [iso(t.desde), iso(t.hasta)];
const ped = (creadoEn, total, estado = "despachado", items = []) => ({ estado, total, creadoEn, items });

test("el día empieza a las 00:00 de Santo Domingo (UTC−4), no a las 00:00 UTC", () => {
  assert.equal(iso(inicioDelDia(REF)), "2026-09-28T04:00:00.000Z");
  assert.equal(iso(inicioDelDia(T("2026-09-29T03:30:00.000Z"))), "2026-09-28T04:00:00.000Z"); // 11:30 p. m. del 28
  assert.equal(iso(inicioDelDia(T("2026-09-29T04:30:00.000Z"))), "2026-09-29T04:00:00.000Z");
  assert.deepEqual(anclaDe(T("2026-10-01T03:59:00.000Z")), { anio: 2026, mes: 8 }); // 11:59 p. m. del 30 de sept
});

test("Hoy: desde las 00:00 contra el mismo día de la semana pasada hasta la misma hora", () => {
  assert.deepEqual(tramo(rangoPeriodo("hoy", SEPT, REF)), ["2026-09-28T04:00:00.000Z", iso(REF + 1)]);
  const c = rangoComparacion("hoy", SEPT, REF);
  assert.deepEqual(tramo(c), ["2026-09-21T04:00:00.000Z", iso(REF + 1 - 7 * 864e5)]);
  assert.equal(c.texto, "vs. lun 21 sept, a esta hora");
});

test("7 días: hoy incluido, contra los 7 días anteriores completos", () => {
  assert.equal(iso(rangoPeriodo("semana", SEPT, REF).desde), "2026-09-22T04:00:00.000Z");
  const c = rangoComparacion("semana", SEPT, REF);
  assert.deepEqual(tramo(c), ["2026-09-15T04:00:00.000Z", "2026-09-22T04:00:00.000Z"]);
  assert.equal(c.texto, "vs. 15–21 sept");
  const b = barras("semana", SEPT, REF, 0);
  assert.deepEqual(b.map((x) => x.etiqueta), ["M", "M", "J", "V", "S", "D", "L"]);
  assert.ok(b[6].actual);
});

test("Mes en curso: del 1 a hoy contra los mismos días del mes anterior (el día 3 → 1–3)", () => {
  const ahora = T("2026-09-03T14:00:00.000Z"); // 3 de sept, 10:00 a. m.
  const a = anclaDe(ahora);
  assert.deepEqual(tramo(rangoPeriodo("mes", a, ahora)), ["2026-09-01T04:00:00.000Z", iso(ahora + 1)]);
  const c = rangoComparacion("mes", a, ahora);
  assert.deepEqual(tramo(c), ["2026-08-01T04:00:00.000Z", "2026-08-04T04:00:00.000Z"]);
  assert.equal(c.texto, "vs. 1–3 ago");
  // Con datos: el 2 y el 3 de agosto cuentan; el 4 de agosto no
  const datos = {
    pedidos: [ped("2026-09-02T15:00:00.000Z", 1000), ped("2026-08-02T15:00:00.000Z", 400), ped("2026-08-03T23:00:00.000Z", 400), ped("2026-08-04T15:00:00.000Z", 9000)],
    eventos: [],
    productos: [],
  };
  const r = calcularResumen(datos, "mes", a, ahora);
  assert.equal(r.ventas, 1000);
  assert.equal(r.ventasComparacion, 800);
  assert.equal(r.variacion, 25);
});

test("Mes pasado: completo, contra el mes anterior completo", () => {
  const ago = { anio: 2026, mes: 7 };
  assert.deepEqual(tramo(rangoPeriodo("mes", ago, REF)), ["2026-08-01T04:00:00.000Z", "2026-09-01T04:00:00.000Z"]);
  const c = rangoComparacion("mes", ago, REF);
  assert.deepEqual(tramo(c), ["2026-07-01T04:00:00.000Z", "2026-08-01T04:00:00.000Z"]);
  assert.equal(c.texto, "vs. julio");
  // Enero compara contra diciembre del año anterior (y lo dice)
  assert.equal(rangoComparacion("mes", { anio: 2026, mes: 0 }, REF).texto, "vs. diciembre 2025");
});

test("cambio de año, febrero y bisiestos", () => {
  // 31 de marzo de 2027: los mismos días de febrero terminan el 28
  const m31 = T("2027-03-31T20:00:00.000Z");
  assert.deepEqual(tramo(rangoComparacion("mes", anclaDe(m31), m31)), ["2027-02-01T04:00:00.000Z", "2027-03-01T04:00:00.000Z"]);
  assert.equal(rangoComparacion("mes", anclaDe(m31), m31).texto, "vs. 1–28 feb");
  // 10 de enero de 2027: contra el 1–10 de diciembre de 2026
  const e10 = T("2027-01-10T16:00:00.000Z");
  const c = rangoComparacion("mes", anclaDe(e10), e10);
  assert.deepEqual(tramo(c), ["2026-12-01T04:00:00.000Z", "2026-12-11T04:00:00.000Z"]);
  assert.equal(c.texto, "vs. 1–10 dic 2026");
  // Barras por día: 28, 29 (2028 es bisiesto), 30 y 31
  assert.equal(barras("mes", { anio: 2027, mes: 1 }, REF, 0).length, 28);
  assert.equal(barras("mes", { anio: 2028, mes: 1 }, REF, 0).length, 29);
  assert.equal(barras("mes", { anio: 2026, mes: 8 }, REF, 0).length, 30);
  assert.equal(barras("mes", { anio: 2026, mes: 7 }, REF, 0).length, 31);
  // 29 de feb de 2028 (año en curso): contra el 1 de ene–28 de feb de 2027, sin pasarse a marzo
  const b29 = T("2028-02-29T16:00:00.000Z");
  assert.deepEqual(tramo(rangoComparacion("anio", anclaDe(b29), b29)), ["2027-01-01T04:00:00.000Z", "2027-03-01T04:00:00.000Z"]);
});

test("Año en curso contra el mismo tramo del año anterior; año pasado contra el anterior completo", () => {
  const c = rangoComparacion("anio", SEPT, REF);
  assert.deepEqual(tramo(c), ["2025-01-01T04:00:00.000Z", "2025-09-29T04:00:00.000Z"]);
  assert.equal(c.texto, "vs. ene–sept 2025");
  assert.deepEqual(tramo(rangoPeriodo("anio", { anio: 2025, mes: 0 }, REF)), ["2025-01-01T04:00:00.000Z", "2026-01-01T04:00:00.000Z"]);
  const p = rangoComparacion("anio", { anio: 2025, mes: 0 }, REF);
  assert.deepEqual(tramo(p), ["2024-01-01T04:00:00.000Z", "2025-01-01T04:00:00.000Z"]);
  assert.equal(p.texto, "vs. 2024");
});

test("un pedido a las 11:30 p. m. del último día del mes cuenta en ese mes, no en el siguiente", () => {
  const p = ped("2026-09-01T03:30:00.000Z", 700); // 31 de agosto, 11:30 p. m. en Santo Domingo
  const ago = { anio: 2026, mes: 7 };
  const datos = { pedidos: [p], eventos: [], productos: [] };
  assert.equal(calcularResumen(datos, "mes", ago, REF).ventas, 700);
  assert.equal(calcularResumen(datos, "mes", SEPT, REF).ventas, 0);
  assert.equal(ventasPorMes([p], 2026)[7], 700);
  assert.equal(ventasPorMes([p], 2026)[8], 0);
  assert.equal(calcularResumen(datos, "mes", ago, REF).barras[30].ventas, 700); // barra del 31
  assert.deepEqual(ventasPorDia([p], rangoPeriodo("mes", ago, REF)).slice(29), [0, 700]);
});

test("barras: futuras y anteriores al inicio no tienen valor ni se pueden elegir", () => {
  const inicio = T("2026-04-06T16:00:00.000Z");
  const b = barras("anio", SEPT, REF, inicio);
  assert.deepEqual(b.map((x) => x.estado), ["antes", "antes", "antes", "normal", "normal", "normal", "normal", "normal", "normal", "futura", "futura", "futura"]);
  assert.ok(b[8].actual);
  const r = calcularResumen({ pedidos: [], eventos: [], productos: [] }, "anio", SEPT, REF, { inicio, seleccion: 10 });
  assert.equal(r.seleccion, null); // noviembre (futuro) no filtra
  assert.equal(r.barras[10].ventas, null);
  assert.equal(r.barras[1].ventas, null);
  assert.equal(r.barras[5].ventas, 0);
  const m = barras("mes", SEPT, REF, 0);
  assert.equal(m.filter((x) => x.estado === "futura").length, 2); // 29 y 30
  assert.deepEqual(m.map((x) => x.etiqueta).filter(Boolean), ["1", "5", "10", "15", "20", "25", "30"]);
});

test("rangos de barra y su comparación", () => {
  // Día 12 de septiembre (mes pasado del todo): contra el sábado 5
  assert.deepEqual(tramo(rangoBarra("mes", 11, SEPT, REF)), ["2026-09-12T04:00:00.000Z", "2026-09-13T04:00:00.000Z"]);
  const c = rangoComparacionBarra("mes", 11, SEPT, REF);
  assert.deepEqual(tramo(c), ["2026-09-05T04:00:00.000Z", "2026-09-06T04:00:00.000Z"]);
  assert.equal(c.texto, "vs. sáb 5 sept");
  // Hoy (la barra de ahora): hasta la misma hora
  assert.deepEqual(tramo(rangoComparacionBarra("mes", 27, SEPT, REF)), ["2026-09-21T04:00:00.000Z", iso(REF + 1 - 7 * 864e5)]);
  // Franja de 10 a 12 de hoy: la misma franja del lunes pasado
  const f = rangoComparacionBarra("hoy", 5, SEPT, REF);
  assert.deepEqual(tramo(f), ["2026-09-21T14:00:00.000Z", "2026-09-21T16:00:00.000Z"]);
  assert.equal(f.texto, "vs. lun 21 sept, misma franja");
  // Año: julio contra junio completo; septiembre (en curso) contra 1–28 ago; enero contra diciembre del año anterior
  assert.equal(rangoComparacionBarra("anio", 6, SEPT, REF).texto, "vs. junio");
  const s = rangoComparacionBarra("anio", 8, SEPT, REF);
  assert.deepEqual(tramo(s), ["2026-08-01T04:00:00.000Z", "2026-08-29T04:00:00.000Z"]);
  assert.equal(s.texto, "vs. 1–28 ago");
  assert.equal(rangoComparacionBarra("anio", 0, SEPT, REF).texto, "vs. diciembre 2025");
});

test("variación: con signo, y sin comparación cuando no hay datos (nunca Infinity ni −100%)", () => {
  assert.equal(variacion(118, 100), 18);
  assert.equal(variacion(93, 100), -7);
  assert.equal(variacion(100, 100), 0);
  assert.equal(variacion(50, 0), null);
  assert.equal(variacion(0, 0), null);
  assert.equal(variacion(0, 500), null);
  assert.equal(textoVariacion(18), "+18%");
  assert.equal(textoVariacion(-7), "−7%");
  assert.equal(textoVariacion(null), null);
  assert.equal(montoCorto(950), "RD$950");
  assert.equal(montoCorto(12_400), "RD$12k");
  assert.equal(montoCorto(4_360), "RD$4.4k");
  assert.equal(montoCorto(1_200_000), "RD$1.2M");
});

test("sin datos: nada de NaN ni Infinity, y el resumen queda vacío", () => {
  for (const v of ["hoy", "semana", "mes", "anio"]) {
    const r = calcularResumen({ pedidos: [], eventos: [], productos: [] }, v, SEPT, REF);
    assert.equal(r.vacio, true);
    assert.equal(r.ticketPromedio, null);
    assert.equal(r.conversion, null);
    assert.equal(r.variacion, null);
    assert.ok(!/NaN|Infinity/.test(JSON.stringify(r)));
  }
});

test("un pedido cancelado no cuenta en ventas, pedidos ni top", () => {
  const items = (cantidad) => [{ productoId: "x", nombreProducto: "X", cantidad }];
  const t = { desde: REF - 864e5, hasta: REF + 1 };
  const r = cifras({ pedidos: [ped(iso(REF - 60_000), 1000, "nuevo", items(1)), ped(iso(REF - 60_000), 5000, "cancelado", items(9))], eventos: [], productos: [] }, t, t);
  assert.equal(r.ventas, 1000);
  assert.equal(r.pedidos, 1);
  assert.deepEqual(r.top.map((x) => x.unidades), [1]);
});

test("stock bajo: con stock contado y <= umbral, agotados primero", () => {
  const p = (nombre, stock) => ({ id: nombre, nombre, fotos: [], stock });
  assert.deepEqual(stockBajo([p("A", 3), p("B", 2), p("C", 0), p("D", null), p("E", 1)], 2).map((x) => x.nombre), ["C", "E", "B"]);
});

// ---- Con los datos del seed (fecha de referencia = "ahora"), cálculo hecho a mano ----
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LUNA = "a1000000-0000-4000-8000-000000000002";
function datosDe(tiendaId) {
  const items = seed("pedido_items");
  const pedidos = seed("pedidos")
    .filter((p) => p.tienda_id === tiendaId)
    .map((p) => ({
      estado: p.estado,
      total: p.total,
      creadoEn: p.creado_en,
      items: items.filter((i) => i.pedido_id === p.id).map((i) => ({ productoId: i.producto_id, nombreProducto: i.nombre_producto, cantidad: i.cantidad })),
    }));
  const eventos = seed("eventos_aaah").filter((e) => e.tienda_id === tiendaId).map((e) => ({ creadoEn: e.creado_en }));
  const productos = seed("productos").filter((p) => p.tienda_id === tiendaId).map((p) => ({ id: p.id, nombre: p.nombre, fotos: p.fotos, stock: p.stock }));
  return { pedidos, eventos, productos };
}
const creada = (id) => seed("tiendas").find((t) => t.id === id).creado_en;

test("seed · Esencias Michel · 7 días: la variación coincide con el cálculo a mano", () => {
  const r = calcularResumen(datosDe(MICHEL), "semana", SEPT, REF);
  // Del martes 22 al lunes 28 a mediodía: #1038 1,300 + #1039 1,800 + #1040 5,400 + #1041 3,000 + #1042 1,921
  assert.equal(r.ventas, 13421);
  assert.equal(r.pedidos, 5);
  assert.equal(r.ticketPromedio, 2684);
  // Del martes 15 al lunes 21: #1033 1,200 + #1034 1,100 + #1036 1,100 (el #1035 está cancelado)
  assert.equal(r.ventasComparacion, 3400);
  // (13,421 − 3,400) / 3,400 = 2.947… → +295%
  assert.equal(r.variacion, 295);
  assert.deepEqual(r.barras.map((b) => b.ventas), [0, 0, 1300, 0, 0, 7200, 4921]);
  assert.equal(r.top[0].nombre, "Wild Flower Gold");
  assert.equal(r.aaahs, aaahsDeLaSemana(datosDe(MICHEL).eventos, REF));
});

test("seed · Esencias Michel · Hoy: contra el lunes pasado hasta mediodía (+347%)", () => {
  const r = calcularResumen(datosDe(MICHEL), "hoy", SEPT, REF);
  assert.equal(r.ventas, 4921);
  assert.equal(r.ventasComparacion, 1100);
  assert.equal(r.variacion, 347);
  assert.deepEqual(r.barras.slice(7).map((b) => b.estado), ["futura", "futura", "futura", "futura", "futura"]);
});

test("seed · la suma de las barras es el total del periodo, en todas las vistas", () => {
  for (const id of [MICHEL, LUNA]) {
    const datos = datosDe(id);
    const inicio = Date.parse(creada(id));
    for (const v of ["hoy", "semana", "mes", "anio"])
      for (const ancla of [SEPT, { anio: 2025, mes: 11 }, { anio: 2026, mes: 4 }]) {
        const r = calcularResumen(datos, v, ancla, REF, { inicio });
        assert.equal(r.barras.reduce((s, b) => s + (b.ventas ?? 0), 0), r.ventas, `${id} ${v} ${JSON.stringify(ancla)}`);
      }
  }
});

test("seed · historia: ~14 meses en Michel, Luna empieza en abril 2026, y diciembre y mayo venden más", () => {
  assert.deepEqual(primerMesConDatos(datosDe(MICHEL), creada(MICHEL)), { anio: 2025, mes: 6 });
  assert.deepEqual(primerMesConDatos(datosDe(LUNA), creada(LUNA)), { anio: 2026, mes: 3 });
  const m25 = ventasPorMes(datosDe(MICHEL).pedidos, 2025);
  const m26 = ventasPorMes(datosDe(MICHEL).pedidos, 2026);
  assert.ok(m25[11] > Math.max(m25[9], m25[10]) * 1.5, "diciembre vende más");
  assert.ok(m26[4] > Math.max(m26[3], m26[5]) * 1.3, "mayo (Día de las Madres) vende más");
  assert.equal(ventasPorMes(datosDe(LUNA).pedidos, 2026).slice(0, 3).reduce((a, b) => a + b, 0), 0);
});

test("seed · las dos tiendas dan cifras distintas", () => {
  const m = calcularResumen(datosDe(MICHEL), "semana", SEPT, REF);
  const l = calcularResumen(datosDe(LUNA), "semana", SEPT, REF);
  // Luna: #1002 1,300 + #1003 1,700 + #1004 2,120 = 5,120 contra #1001 850 → +502%
  assert.equal(l.ventas, 5120);
  assert.equal(l.variacion, 502);
  assert.notEqual(m.ventas, l.ventas);
});
