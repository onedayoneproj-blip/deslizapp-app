import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { aaahsDeLaSemana, calcularResumen, inicioDelDia, rangos, stockBajo, textoVariacion, variacion } from "../lib/resumen.ts";

const iso = (ms) => new Date(ms).toISOString();
const seed = (n) => JSON.parse(readFileSync(new URL(`../lib/data/seed/${n}.json`, import.meta.url), "utf8"));

// Lunes 28 de septiembre de 2026, 12:00 del mediodía en Santo Domingo (= fecha de referencia del seed)
const REF = Date.parse("2026-09-28T16:00:00.000Z");

test("el día empieza a las 00:00 de Santo Domingo (UTC−4), no a las 00:00 UTC", () => {
  assert.equal(iso(inicioDelDia(REF)), "2026-09-28T04:00:00.000Z");
  // 23:30 del 28 en Santo Domingo ya es 29 en UTC: sigue siendo el 28
  assert.equal(iso(inicioDelDia(Date.parse("2026-09-29T03:30:00.000Z"))), "2026-09-28T04:00:00.000Z");
  // 00:30 del 29 en Santo Domingo
  assert.equal(iso(inicioDelDia(Date.parse("2026-09-29T04:30:00.000Z"))), "2026-09-29T04:00:00.000Z");
});

test("Hoy: desde las 00:00, contra el mismo día de la semana pasada hasta la misma hora; 12 franjas de 2 h", () => {
  const r = rangos("hoy", REF);
  assert.equal(iso(r.actual.desde), "2026-09-28T04:00:00.000Z");
  assert.equal(r.actual.hasta, REF);
  assert.equal(iso(r.comparacion.desde), "2026-09-21T04:00:00.000Z");
  assert.equal(iso(r.comparacion.hasta), "2026-09-21T16:00:00.000Z");
  assert.equal(r.barras.length, 12);
  assert.equal(r.barraActual, 6); // 12:00 → franja 12–2 p. m.
  assert.equal(r.barras[6].nombre, "De 12 p. m. a 2 p. m.");
  assert.equal(r.contra, "vs. el lunes pasado, a esta hora");
});

test("7 días: hoy incluido, contra los 7 días anteriores; una barra por día", () => {
  const r = rangos("semana", REF);
  assert.equal(iso(r.actual.desde), "2026-09-22T04:00:00.000Z");
  assert.equal(iso(r.comparacion.desde), "2026-09-15T04:00:00.000Z");
  assert.equal(iso(r.comparacion.hasta), "2026-09-21T16:00:00.000Z");
  assert.deepEqual(r.barras.map((b) => b.etiqueta), ["M", "M", "J", "V", "S", "D", "L"]);
  assert.equal(r.barras[6].nombre, "Hoy");
  assert.equal(r.barras[5].nombre, "Ayer");
});

test("Este mes: desde el día 1, contra el mes anterior hasta la misma altura; una barra por semana", () => {
  const r = rangos("mes", REF);
  assert.equal(iso(r.actual.desde), "2026-09-01T04:00:00.000Z");
  assert.equal(iso(r.comparacion.desde), "2026-08-01T04:00:00.000Z");
  assert.equal(r.comparacion.hasta - r.comparacion.desde, REF - r.actual.desde);
  assert.equal(r.barras.length, 5); // 1–7, 8–14, 15–21, 22–28, 29–30
  assert.equal(r.barras[4].nombre, "Del 29 al 30 de septiembre");
  assert.equal(r.barraActual, 3);
  assert.equal(r.etiqueta, "Septiembre");
  assert.equal(r.contra, "vs. agosto, a esta altura");
  // 31 de marzo: la comparación no se pasa del 28 de febrero
  const m = rangos("mes", Date.parse("2027-03-31T20:00:00.000Z"));
  assert.equal(iso(m.comparacion.hasta), "2027-03-01T04:00:00.000Z");
  // Enero compara contra diciembre del año anterior
  const e = rangos("mes", Date.parse("2027-01-10T16:00:00.000Z"));
  assert.equal(iso(e.comparacion.desde), "2026-12-01T04:00:00.000Z");
  assert.equal(e.contra, "vs. diciembre, a esta altura");
});

test("variación: con signo, redondeada, y sin comparación cuando no hay periodo anterior", () => {
  assert.equal(variacion(118, 100), 18);
  assert.equal(variacion(93, 100), -7);
  assert.equal(variacion(100, 100), 0);
  assert.equal(variacion(50, 0), null);
  assert.equal(variacion(0, 0), null);
  assert.equal(textoVariacion(18), "+18%");
  assert.equal(textoVariacion(-7), "−7%");
  assert.equal(textoVariacion(0), "0%");
  assert.equal(textoVariacion(null), null);
});

test("sin datos: nada de NaN ni Infinity, y el resumen queda vacío", () => {
  for (const p of ["hoy", "semana", "mes"]) {
    const r = calcularResumen({ pedidos: [], eventos: [], productos: [] }, p, REF);
    assert.equal(r.vacio, true);
    assert.equal(r.ventas, 0);
    assert.equal(r.ticketPromedio, null);
    assert.equal(r.conversion, null);
    assert.equal(r.variacion, null);
    assert.deepEqual(r.top, []);
    assert.ok(r.ventasPorBarra.every((v) => v === null || v === 0));
    assert.ok(!/NaN|Infinity/.test(JSON.stringify(r)));
  }
});

test("un pedido cancelado no cuenta en ventas, pedidos ni top", () => {
  const ped = (estado, total, cantidad) => ({ estado, total, creadoEn: iso(REF - 60_000), items: [{ productoId: "x", nombreProducto: "X", cantidad }] });
  const r = calcularResumen({ pedidos: [ped("nuevo", 1000, 1), ped("cancelado", 5000, 9)], eventos: [], productos: [] }, "hoy", REF);
  assert.equal(r.ventas, 1000);
  assert.equal(r.pedidos, 1);
  assert.equal(r.ticketPromedio, 1000);
  assert.deepEqual(r.top.map((t) => t.unidades), [1]);
  assert.equal(r.conversion, null); // sin aaahs
  assert.equal(r.vacio, false);
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

test("seed · Esencias Michel · 7 días: la variación coincide con el cálculo a mano", () => {
  const r = calcularResumen(datosDe(MICHEL), "semana", REF);
  // Del martes 22 (00:00) al lunes 28 a mediodía: #1038 1,300 + #1039 1,800 + #1040 5,400 + #1041 3,000 + #1042 1,921
  assert.equal(r.ventas, 1300 + 1800 + 5400 + 3000 + 1921); // 13,421
  assert.equal(r.pedidos, 5);
  assert.equal(r.ticketPromedio, Math.round(13421 / 5)); // 2,684
  // Del martes 15 al lunes 21 a mediodía: #1033 1,200 + #1034 1,100 + #1036 1,100 (el #1035 está cancelado)
  assert.equal(r.ventasComparacion, 1200 + 1100 + 1100); // 3,400
  // (13,421 − 3,400) / 3,400 = 2.947… → +295%
  assert.equal(r.variacion, 295);
  assert.equal(textoVariacion(r.variacion), "+295%");
  // Barras: martes 1,300 (#1038 el jueves 24 → índice 2), domingo 7,200 (#1039 + #1040), hoy 4,921
  assert.deepEqual(r.ventasPorBarra, [0, 0, 1300, 0, 0, 7200, 4921]);
  // Wild Flower Gold (2 unidades en #1040) encabeza el top por unidades
  assert.equal(r.top[0].nombre, "Wild Flower Gold");
  assert.equal(r.top[0].unidades, 2);
  assert.equal(r.aaahs, aaahsDeLaSemana(datosDe(MICHEL).eventos, REF));
  assert.equal(r.conversion, Math.round((5 / r.aaahs) * 1000) / 10);
});

test("seed · Esencias Michel · Hoy: contra el lunes pasado hasta mediodía", () => {
  const r = calcularResumen(datosDe(MICHEL), "hoy", REF);
  // Hoy: #1041 3,000 + #1042 1,921 = 4,921. Lunes pasado antes de mediodía: #1036 1,100 → (4,921 − 1,100) / 1,100 = +347%
  assert.equal(r.ventas, 4921);
  assert.equal(r.ventasComparacion, 1100);
  assert.equal(r.variacion, 347);
  // Franjas futuras (de 2 p. m. en adelante) quedan sin valor
  assert.deepEqual(r.ventasPorBarra.slice(7), [null, null, null, null, null]);
  assert.equal(r.ventasPorBarra[5], 4921); // 10 a. m.–12 p. m.
});

test("seed · las dos tiendas dan cifras distintas", () => {
  const m = calcularResumen(datosDe(MICHEL), "semana", REF);
  const l = calcularResumen(datosDe(LUNA), "semana", REF);
  // Luna: #1002 1,300 + #1003 1,700 + #1004 2,120 = 5,120 contra #1001 850 → +502%
  assert.equal(l.ventas, 5120);
  assert.equal(l.variacion, 502);
  assert.notEqual(m.ventas, l.ventas);
  assert.notEqual(m.aaahs, l.aaahs);
});
