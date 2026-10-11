// Crear producto «como una historia»: los pasos, qué deja seguir, «¿Cuándo llega?» y la celebración.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const H = await import("../lib/historia-producto.ts");

test("los pasos con barra: un servicio se salta el stock", () => {
  assert.deepEqual(H.pasosDeHistoria(), ["foto", "nombre", "precio", "stock", "vista"]);
  assert.deepEqual(H.pasosDeHistoria(true), ["foto", "nombre", "precio", "vista"]);
});

test("seguir y atrás recorren la historia sin saltos raros", () => {
  assert.equal(H.pasoSiguiente("foto"), "nombre");
  assert.equal(H.pasoSiguiente("precio"), "stock");
  assert.equal(H.pasoSiguiente("precio", true), "vista");
  assert.equal(H.pasoSiguiente("vista"), "listo");
  assert.equal(H.pasoSiguiente("listo"), "listo");
  assert.equal(H.pasoAnterior("foto"), null);
  assert.equal(H.pasoAnterior("vista"), "stock");
  assert.equal(H.pasoAnterior("vista", true), "precio");
  assert.equal(H.pasoAnterior("listo"), null);
});

test("las barras: llenas las hechas y la actual; en la celebración, todas", () => {
  assert.equal(H.barrasLlenas("foto"), 1);
  assert.equal(H.barrasLlenas("stock"), 4);
  assert.equal(H.barrasLlenas("vista", true), 4);
  assert.equal(H.barrasLlenas("listo"), 5);
});

test("qué deja seguir: la foto es opcional; nombre, precio y cuándo llega (por encargo) no", () => {
  const d = { nombre: "", precio: "", porEncargo: false, encargoTexto: "" };
  assert.equal(H.puedeSeguir("foto", d), true);
  assert.equal(H.puedeSeguir("nombre", d), false);
  assert.equal(H.puedeSeguir("nombre", { ...d, nombre: "  " }), false);
  assert.equal(H.puedeSeguir("nombre", { ...d, nombre: "Hoodie" }), true);
  assert.equal(H.puedeSeguir("precio", { ...d, precio: "0" }), false);
  assert.equal(H.puedeSeguir("precio", { ...d, precio: "1450" }), true);
  assert.equal(H.puedeSeguir("stock", d), true);
  assert.equal(H.puedeSeguir("stock", { ...d, porEncargo: true }), false);
  assert.equal(H.puedeSeguir("stock", { ...d, porEncargo: true, encargoTexto: "Llega en 1 mes" }), true);
});

test("por encargo, el paso de stock pregunta cuándo llega", () => {
  assert.equal(H.textosDelPaso("stock").titulo, "¿Cuántos tienes ahora?");
  assert.equal(H.textosDelPaso("stock", true).titulo, "¿Cuándo llega?");
  // Sin exclamaciones fuera de la celebración (docs/11).
  for (const p of ["foto", "nombre", "precio", "stock", "vista"]) assert.ok(!H.textosDelPaso(p).titulo.includes("!"));
});

test("«¿Cuándo llega?»: las opciones rápidas se guardan como «Llega en …» y se reconocen al volver", () => {
  assert.equal(H.textoCuandoLlega("3 a 5 días"), "Llega en 3 a 5 días");
  for (const o of H.OPCIONES_CUANDO_LLEGA) {
    assert.ok(H.textoCuandoLlega(o).length <= 40);
    assert.equal(H.opcionDeCuandoLlega(H.textoCuandoLlega(o)), o);
  }
  assert.equal(H.opcionDeCuandoLlega("Llega el martes"), null);
  assert.equal(H.opcionDeCuandoLlega(""), null);
});

test("la celebración", () => {
  assert.equal(H.tituloCelebracion(true), "¡Ya está en tu catálogo!");
  assert.equal(H.lineaCelebracion(" Hoodie ", true), "Hoodie ya se puede deslizar.");
  assert.match(H.lineaCelebracion("Hoodie", false), /sin publicar/);
  assert.equal(H.lineaArranque(1), "Van 1 de 5 para arrancar.");
  assert.equal(H.lineaArranque(4), "Van 4 de 5 para arrancar.");
  assert.equal(H.lineaArranque(5), null);
  assert.equal(H.lineaArranque(0), null);
});
