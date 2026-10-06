import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const T = await import("../lib/retoque-textos.ts");
const C = await import("../lib/config.ts");

test("los textos del retoque Beta son literalmente los del prompt, con los créditos de config", () => {
  assert.equal(C.CREDITOS_POR_RETOQUE, 5);
  assert.equal(T.textoFichaRetoque(), "Se retoca con tu marca como guía. Cuesta 5 créditos.");
  assert.equal(T.textoEnTaller(), "Tu foto está en proceso, con tu marca como guía. Reservamos 5 créditos; se cobran cuando esté lista.");
  assert.equal(T.REMATE_TALLER, "Hecho con criterio de marca.");
  assert.equal(T.avisoFotoEnProceso(), "Tu foto está en proceso. Reservamos 5 créditos; se cobran cuando esté lista.");
});

test("la etiqueta es un solo texto y el tiempo estimado no se inventa: vacío no se muestra", () => {
  assert.equal(C.ETIQUETA_RETOQUE_BETA, "Beta");
  assert.equal(C.TIEMPO_RETOQUE_TEXTO, "", "Lewis fija el tiempo; hoy está vacío");
  assert.equal(T.tiempoRetoque(), null);
  assert.equal(T.tiempoRetoque("   "), null);
  assert.equal(T.tiempoRetoque(" hasta 48 horas "), "hasta 48 horas");
});

test("los textos hablan en tú y no usan jerga ni exclamaciones (docs/11)", () => {
  for (const t of [T.textoFichaRetoque(), T.textoEnTaller(), T.REMATE_TALLER, T.avisoFotoEnProceso()]) {
    assert.doesNotMatch(t, /[!¡]|IA\b|solución|plataforma|optimiz/i, t);
  }
});
