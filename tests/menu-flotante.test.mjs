import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { indiceConTecla, posicionMenu } = await import("../lib/menu-flotante.ts");

test("flechas: bajan y suben dando la vuelta; sin foco, abajo va al primero y arriba al último", () => {
  assert.equal(indiceConTecla(-1, 3, "ArrowDown"), 0);
  assert.equal(indiceConTecla(-1, 3, "ArrowUp"), 2);
  assert.equal(indiceConTecla(2, 3, "ArrowDown"), 0);
  assert.equal(indiceConTecla(0, 3, "ArrowUp"), 2);
  assert.equal(indiceConTecla(1, 3, "ArrowDown"), 2);
  assert.equal(indiceConTecla(1, 3, "Home"), 0);
  assert.equal(indiceConTecla(0, 3, "End"), 2);
  assert.equal(indiceConTecla(0, 0, "ArrowDown"), -1);
});

test("la tarjeta queda debajo del disparador y dentro de la pantalla", () => {
  const a = posicionMenu({ left: 20, bottom: 100 }, { ancho: 390, alto: 844 });
  assert.deepEqual([a.left, a.top, a.width], [20, 106, 252]);
  const b = posicionMenu({ left: 300, bottom: 100 }, { ancho: 390, alto: 844 });
  assert.equal(b.left + b.width, 390 - 12);
  const c = posicionMenu({ left: 0, bottom: 100 }, { ancho: 360, alto: 640 });
  assert.equal(c.left, 12);
  assert.ok(c.maxHeight <= 640 - c.top);
  const d = posicionMenu({ left: 0, bottom: 0 }, { ancho: 200, alto: 600 });
  assert.equal(d.width, 176);
});
