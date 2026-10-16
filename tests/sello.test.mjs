// El sello «-30 %» del Círculo (lib/planes/sello.ts): una estrella de 12 puntas redondeadas, r(θ) = 50 + 6,5·cos(12θ), ~240 puntos.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const { PATH_SELLO, pathEstrella, CAPAS_SELLO, RELLENO_SELLO, PUNTOS_SELLO } = await import("../lib/planes/sello.ts");
const { textoSelloCirculo, DESCUENTO_CIRCULO } = await import("../lib/circulo.ts");

const puntos = (d) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

test("el path tiene 240 puntos y su radio sigue 50 + 6,5·cos(12θ): entre 43,5 y 56,5", () => {
  const p = puntos(PATH_SELLO);
  assert.equal(p.length, PUNTOS_SELLO);
  assert.ok(PATH_SELLO.startsWith("M0.00 -56.50") && PATH_SELLO.endsWith("Z"));
  const radios = p.map(([x, y]) => Math.hypot(x, y));
  assert.ok(Math.max(...radios) <= 56.51 && Math.max(...radios) >= 56.4, `máx ${Math.max(...radios)}`);
  assert.ok(Math.min(...radios) >= 43.49 && Math.min(...radios) <= 43.6, `mín ${Math.min(...radios)}`);
  // 12 puntas: 12 máximos locales del radio.
  const n = radios.length;
  const maximos = radios.filter((r, i) => r > radios[(i + n - 1) % n] && r >= radios[(i + 1) % n]).length;
  assert.equal(maximos, 12);
  assert.equal(pathEstrella(PUNTOS_SELLO), PATH_SELLO);
});

test("las capas de abajo arriba y el relleno crema", () => {
  assert.deepEqual(CAPAS_SELLO.map((c) => [c.stroke, c.ancho]), [["#FFF9EE", 27], ["#174B3A", 23], ["#F5C9D6", 15], ["#FF834F", 7]]);
  assert.equal(RELLENO_SELLO, "#FFF9EE");
});

test("el «-30%» del sello sale de la constante del Círculo, no escrito a mano", () => {
  assert.equal(textoSelloCirculo, `-${DESCUENTO_CIRCULO}%`);
  assert.equal(textoSelloCirculo, "-30%");
});
