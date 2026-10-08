// Hoja de producto rediseñada: cuándo se habilita «Publicar» y los resúmenes de las pastillas y de las filas.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const H = await import("../lib/hoja-producto.ts");

test("«Publicar» pide foto, nombre y un precio mayor que cero", () => {
  const ok = { nombre: "Aros dorados", precio: "1850", fotos: 1 };
  assert.equal(H.puedePublicar(ok), true);
  assert.equal(H.puedePublicar({ ...ok, fotos: 0 }), false);
  assert.equal(H.puedePublicar({ ...ok, nombre: "   " }), false);
  assert.equal(H.puedePublicar({ ...ok, precio: "" }), false);
  assert.equal(H.puedePublicar({ ...ok, precio: "0" }), false);
  assert.equal(H.puedePublicar({ ...ok, preparando: true }), false);
});

test("las pastillas de «Cosas que cambian»", () => {
  assert.deepEqual(H.pastillasDeOpciones([{ nombre: "Color", valores: ["Negro", "Arena"] }, { nombre: "Tamaño", valores: ["S", "M", "L"] }]), ["Color · 2", "Tamaño · 3"]);
  assert.deepEqual(H.pastillasDeOpciones([]), []);
});

test("el stock con presentaciones", () => {
  assert.equal(H.resumenStockPresentaciones(6, 18), "6 presentaciones · 18 en total");
  assert.equal(H.resumenStockPresentaciones(1, 3), "1 presentación · 3 en total");
});

test("el resumen de la descripción corta en una palabra entera", () => {
  assert.equal(H.resumenDescripcion("   "), null);
  assert.equal(H.resumenDescripcion("Corta"), "Corta");
  assert.equal(H.resumenDescripcion("Aros dorados con baño de oro de 18 quilates, livianos y cómodos", 30), "Aros dorados con baño de oro…");
});

test("la fila Por encargo y el contador de fotos", () => {
  assert.equal(H.resumenEncargo(false, "Llega en 7 días"), "Se puede pedir aunque no haya.");
  assert.equal(H.resumenEncargo(true, ""), "Se puede pedir aunque no haya.");
  assert.equal(H.resumenEncargo(true, " Llega en 7 días "), "Llega en 7 días");
  assert.equal(H.contadorMedios(1, 10), "1 / 10");
});
