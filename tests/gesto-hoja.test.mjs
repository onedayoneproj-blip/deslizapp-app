import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";
const { decidirGesto: d, resultadoSoltar: r } = await import("../lib/gesto-hoja.ts");

test("un toque casi quieto espera; uno más horizontal que vertical se ignora", () => {
  assert.equal(d({ dx: 3, dy: -4, full: false, scrollTop: 0 }), "esperar");
  assert.equal(d({ dx: 30, dy: -12, full: false, scrollTop: 0 }), "ignorar");
  assert.equal(d({ dx: -30, dy: 12, full: true, scrollTop: 0 }), "ignorar");
});
test("a media altura, hacia arriba expande aunque no haya scroll; hacia abajo arrastra", () => {
  assert.equal(d({ dx: 0, dy: -20, full: false, scrollTop: 0 }), "expandir");
  assert.equal(d({ dx: 0, dy: 20, full: false, scrollTop: 0 }), "arrastrar");
  assert.equal(d({ dx: 0, dy: 20, full: false, scrollTop: 50 }), "arrastrar", "a media altura el cuerpo no se desplaza");
});
test("expandida, hacia arriba hace scroll; hacia abajo arrastra solo con el cuerpo arriba", () => {
  assert.equal(d({ dx: 0, dy: -20, full: true, scrollTop: 0 }), "scroll");
  assert.equal(d({ dx: 0, dy: 20, full: true, scrollTop: 0 }), "arrastrar");
  assert.equal(d({ dx: 0, dy: 20, full: true, scrollTop: 1 }), "scroll");
});
test("al soltar: más de 90 px cierra o reduce; menos vuelve", () => {
  assert.equal(r(91, false), "cerrar");
  assert.equal(r(91, true), "reducir");
  assert.equal(r(90, false), "volver");
  assert.equal(r(-10, true), "volver");
});
