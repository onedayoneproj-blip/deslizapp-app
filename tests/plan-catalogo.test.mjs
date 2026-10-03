// Espacio del plan: cuenta solo productos visibles (lib/plan-catalogo.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { estadoDelPlan, resumenDelPlan } from "../lib/plan-catalogo.ts";

const prods = (visibles, ocultos = 0) => [
  ...Array.from({ length: visibles }, () => ({ activo: true })),
  ...Array.from({ length: ocultos }, () => ({ activo: false })),
];

test("los productos ocultos no cuentan en el plan", () => {
  const r = resumenDelPlan(prods(14, 1), 20);
  assert.equal(r.usados, 14);
  assert.equal(r.libres, 6);
  assert.equal(r.limite, 20);
  assert.equal(r.uso, 0.7);
});

test("estados del plan en los cortes 70 / 90 / 100 %", () => {
  assert.equal(estadoDelPlan(13, 20), "sobra"); // 65 %
  assert.equal(estadoDelPlan(14, 20), "quedan"); // 70 %
  assert.equal(estadoDelPlan(17, 20), "quedan"); // 85 %
  assert.equal(estadoDelPlan(18, 20), "casi"); // 90 %
  assert.equal(estadoDelPlan(19, 20), "casi"); // 95 %
  assert.equal(estadoDelPlan(20, 20), "lleno");
  assert.equal(estadoDelPlan(25, 20), "lleno");
  assert.equal(estadoDelPlan(0, 20), "sobra");
});

test("ocultar productos libera lugares y baja el estado", () => {
  assert.equal(resumenDelPlan(prods(20), 20).estado, "lleno");
  const r = resumenDelPlan(prods(15, 5), 20);
  assert.equal(r.estado, "quedan");
  assert.equal(r.libres, 5);
});

test("sin límite no se rompe", () => {
  const r = resumenDelPlan(prods(0), 0);
  assert.equal(r.uso, 0);
  assert.equal(r.libres, 0);
  assert.equal(r.estado, "sobra");
  assert.equal(resumenDelPlan(prods(3), 0).estado, "lleno");
});

test("libres nunca es negativo si hay más visibles que el límite", () => {
  const r = resumenDelPlan(prods(22), 20);
  assert.equal(r.libres, 0);
  assert.equal(r.uso, 1);
});
