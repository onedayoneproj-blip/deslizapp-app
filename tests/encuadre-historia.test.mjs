// Pruebas del encuadre de la foto en la historia (lib/encuadre-historia.ts): límites, zoom, pellizco y fondo difuminado por defecto.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const E = await import("../lib/encuadre-historia.ts");

const marco = { ancho: 1080, alto: 1920 };
const horizontal = { ancho: 4000, alto: 3000 };
const cuadrada = { ancho: 1000, alto: 1000 };
const vertical = { ancho: 1200, alto: 2000 };
const casi = (a, b, d = 1e-6) => assert.ok(Math.abs(a - b) < d, `${a} ≉ ${b}`);

test("fondo difuminado por defecto: encendido si ancho/alto > 0,75, apagado si es vertical", () => {
  assert.equal(E.difuminadoPorDefecto(horizontal), true);
  assert.equal(E.difuminadoPorDefecto(cuadrada), true);
  assert.equal(E.difuminadoPorDefecto({ ancho: 3, alto: 4 }), false); // justo 0,75: no
  assert.equal(E.difuminadoPorDefecto({ ancho: 3001, alto: 4000 }), true);
  assert.equal(E.difuminadoPorDefecto(vertical), false);
  assert.equal(E.difuminadoPorDefecto({ ancho: 1080, alto: 1920 }), false);
  assert.equal(E.difuminadoPorDefecto(null), false);
  assert.equal(E.difuminadoPorDefecto({ ancho: 0, alto: 0 }), false);
});

test("relleno: la foto cubre el marco y el centro es el inicial", () => {
  const r = E.rectFoto(E.ENCUADRE_INICIAL, marco, horizontal, false);
  casi(r.alto, 1920);
  assert.ok(r.ancho > 1080);
  casi(r.x, (1080 - r.ancho) / 2);
  casi(r.y, 0);
});

test("relleno: nunca quedan huecos, con cualquier movimiento y zoom", () => {
  for (const natural of [horizontal, cuadrada, vertical]) {
    for (const k of [1, 1.5, 2.7, 4]) {
      for (const [x, y] of [[9, 9], [-9, -9], [0.3, -0.2], [-9, 9]]) {
        const r = E.rectFoto({ k, x, y }, marco, natural, false);
        assert.ok(r.x <= 1e-6 && r.x + r.ancho >= 1080 - 1e-6, `hueco horizontal ${natural.ancho}x${natural.alto} k${k}`);
        assert.ok(r.y <= 1e-6 && r.y + r.alto >= 1920 - 1e-6, `hueco vertical ${natural.ancho}x${natural.alto} k${k}`);
      }
    }
  }
});

test("difuminado: la foto cabe entera a k=1 y no sale del marco al moverla; acercada no deja huecos", () => {
  const r = E.rectFoto({ k: 1, x: 9, y: 9 }, marco, horizontal, true);
  casi(r.ancho, 1080);
  casi(r.alto, 810);
  casi(r.x, 0);
  assert.ok(r.y >= -1e-6 && r.y + r.alto <= 1920 + 1e-6, "la foto sale del marco");
  // pegada arriba y pegada abajo
  casi(E.rectFoto({ k: 1, x: 0, y: -9 }, marco, horizontal, true).y, 0);
  casi(E.rectFoto({ k: 1, x: 0, y: 9 }, marco, horizontal, true).y + 810, 1920);
  // vertical con difuminado: llena el alto y queda centrada a lo ancho
  const v = E.rectFoto({ k: 1, x: 5, y: 5 }, marco, { ancho: 500, alto: 1000 }, true);
  assert.ok(v.x >= -1e-6 && v.x + v.ancho <= 1080 + 1e-6);
  // acercada: ya sobresale en x y no deja hueco
  const z = E.rectFoto({ k: 3, x: 9, y: 0 }, marco, horizontal, true);
  assert.ok(z.x <= 1e-6 && z.x + z.ancho >= 1080 - 1e-6);
});

test("limitar: zoom entre 1 y 4, valores raros no rompen", () => {
  assert.equal(E.limitar({ k: 0.2, x: 0, y: 0 }, marco, horizontal).k, 1);
  assert.equal(E.limitar({ k: 9, x: 0, y: 0 }, marco, horizontal).k, 4);
  const raro = E.limitar({ k: NaN, x: NaN, y: Infinity }, marco, horizontal);
  assert.equal(raro.k, 1);
  assert.equal(raro.x, 0);
  assert.ok(Number.isFinite(raro.y));
  assert.deepEqual(E.limitar({ k: 2, x: 0.4, y: 0.4 }, marco, null), { k: 2, x: 0, y: 0 });
});

test("mover: suma el arrastre como fracción del marco y respeta el límite", () => {
  const ini = { k: 2, x: 0, y: 0 };
  const m = E.mover(ini, 54, 0, marco, horizontal, false);
  casi(m.x, 0.05);
  const lejos = E.mover(ini, 99999, 99999, marco, horizontal, false);
  const tope = E.limitar({ k: 2, x: 9, y: 9 }, marco, horizontal, false);
  assert.deepEqual(lejos, tope);
});

test("el encuadre vale igual a otra escala (vista previa y 1080×1920)", () => {
  const enc = { k: 2.2, x: 0.1, y: -0.05 };
  const chico = { ancho: 180, alto: 320 };
  const a = E.rectFoto(enc, marco, horizontal, false);
  const b = E.rectFoto(enc, chico, horizontal, false);
  const f = 1080 / 180;
  casi(a.x, b.x * f, 1e-6);
  casi(a.y, b.y * f, 1e-6);
  casi(a.ancho, b.ancho * f, 1e-6);
});

test("acercarA: el deslizador y los botones escalan desde el centro, y limitan", () => {
  const z = E.acercarA({ k: 2, x: 0.1, y: 0.05 }, 3, marco, horizontal, false);
  assert.equal(z.k, 3);
  casi(z.x, 0.15);
  casi(E.acercarA({ k: 2, x: 0.2, y: 0 }, 1, marco, horizontal, false).x, 0.1);
  // foto justo 9:16 a k=1: no hay por dónde moverla
  assert.equal(E.acercarA({ k: 2, x: 0.2, y: 0 }, 1, marco, { ancho: 1080, alto: 1920 }, false).x, 0);
  assert.equal(E.acercarA(E.ENCUADRE_INICIAL, 99, marco, horizontal, false).k, 4);
});

test("pellizcar: el punto bajo los dedos se mantiene, dentro de los límites", () => {
  const c = { x: 0, y: 0 };
  const z = E.pellizcar(E.ENCUADRE_INICIAL, c, 100, c, 200, marco, horizontal, false);
  assert.equal(z.k, 2);
  casi(z.x, 0);
  // alejar más allá del 1 no baja de 1
  assert.equal(E.pellizcar({ k: 1.2, x: 0, y: 0 }, c, 100, c, 10, marco, horizontal, false).k, 1);
  // pellizcar hacia un punto a la derecha mueve la foto a la izquierda (se ve esa zona)
  const p = E.pellizcar(E.ENCUADRE_INICIAL, { x: 300, y: 0 }, 100, { x: 300, y: 0 }, 200, marco, horizontal, false);
  assert.ok(p.x < 0);
  // distancia inicial cero: no cambia
  assert.deepEqual(E.pellizcar(E.ENCUADRE_INICIAL, c, 0, c, 50, marco, horizontal, false), E.ENCUADRE_INICIAL);
});

test("rectFondo: la misma foto ampliada cubre todo el marco", () => {
  for (const natural of [horizontal, cuadrada, vertical]) {
    const r = E.rectFondo(marco, natural);
    assert.ok(r.x <= 0 && r.y <= 0 && r.x + r.ancho >= 1080 && r.y + r.alto >= 1920);
  }
});
