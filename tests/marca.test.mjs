// Pruebas de lib/marca.ts (node --test; Node 22 lee TypeScript sin compilar).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  acentoLegible,
  coloresCupon,
  coloresDominantes,
  contraste,
  esNeutro,
  MARCA_NEUTRA,
  marcaLegible,
  normalizarUrl,
  principalLegible,
  proponerCombinaciones,
  textoSobre,
  TEXTO_CLARO,
  TEXTO_OSCURO,
} from "../lib/marca.ts";

const VERDE_DESLIZAPP = "#174B3A";

test("contraste WCAG conocido", () => {
  assert.equal(Math.round(contraste("#000000", "#FFFFFF") * 10) / 10, 21);
  assert.equal(contraste("#777777", "#777777"), 1);
});

test("texto sobre el principal: crema en oscuros, oscuro en claros", () => {
  assert.equal(textoSobre("#1F3A5F"), TEXTO_CLARO);
  assert.equal(textoSobre("#F7D774"), TEXTO_OSCURO);
});

test("un principal de contraste medio se ajusta hasta 4.5:1", () => {
  for (const c of ["#E88FAE", "#3FA7D6", "#FF834F", "#9B9B9B", "#FFD400", "#00B050"]) {
    const p = principalLegible(c);
    assert.ok(contraste(textoSobre(p), p) >= 4.5, `${c} → ${p}`);
  }
});

test("el acento llega a 3:1 contra el principal", () => {
  const p = "#2E3F66";
  const a = acentoLegible("#3B4F7A", p); // casi igual al principal
  assert.ok(contraste(a, p) >= 3, a);
  const q = "#F7E7B4";
  assert.ok(contraste(acentoLegible("#F2D98A", q), q) >= 3);
});

test("marcaLegible y coloresCupon siempre cumplen", () => {
  const m = marcaLegible({ principal: "#E88FAE", acento: "#F5C9D6", estilo: "divertida" });
  const c = coloresCupon(m);
  assert.ok(contraste(c.texto, c.fondo) >= 4.5);
  assert.ok(contraste(c.acento, c.fondo) >= 3);
});

test("colores dominantes: encuentra los dos colores de un logo e ignora lo transparente", () => {
  const px = [];
  const agregar = (rgb, n, a = 255) => { for (let i = 0; i < n; i++) px.push(...rgb, a); };
  agregar([120, 40, 110], 600); // ciruela
  agregar([240, 190, 70], 300); // dorado
  agregar([255, 255, 255], 100); // blanco
  agregar([10, 200, 10], 500, 0); // transparente: no cuenta
  const d = coloresDominantes(px);
  const cerca = (a, b) => contraste(a, b) < 1.1; // casi el mismo color
  assert.ok(cerca(d[0].color, "#782870"), d[0].color);
  assert.ok(d[0].peso > 0.5);
  assert.ok(d.some((x) => cerca(x.color, "#F0BE46")));
  assert.ok(!d.some((x) => cerca(x.color, "#0AC80A")));
});

test("esNeutro descarta blancos, negros y grises", () => {
  for (const c of ["#FFFFFF", "#000000", "#808080", "#F5F5F4"]) assert.ok(esNeutro(c), c);
  for (const c of ["#782870", "#2E3F66", "#F0BE46"]) assert.ok(!esNeutro(c), c);
});

test("proponerCombinaciones: 3 distintas, legibles y basadas en el logo", () => {
  const combos = proponerCombinaciones([
    { color: "#782870", peso: 0.6 },
    { color: "#F0BE46", peso: 0.3 },
    { color: "#FFFFFF", peso: 0.1 },
  ]);
  assert.equal(combos.length, 3);
  assert.equal(combos[0].principal, "#782870");
  for (const m of combos) {
    const c = coloresCupon(m);
    assert.ok(contraste(c.texto, c.fondo) >= 4.5 && contraste(c.acento, c.fondo) >= 3, JSON.stringify(m));
    assert.notEqual(m.principal, VERDE_DESLIZAPP);
  }
  assert.equal(new Set(combos.map((m) => m.principal + m.acento)).size, 3);
});

test("logo sin color (blanco y negro): paleta neutra, nunca el verde de Deslizapp", () => {
  const combos = proponerCombinaciones([
    { color: "#000000", peso: 0.7 },
    { color: "#FFFFFF", peso: 0.3 },
  ]);
  assert.equal(combos.length, 3);
  assert.equal(combos[0].principal, MARCA_NEUTRA.principal);
  assert.ok(combos.every((m) => m.principal !== VERDE_DESLIZAPP));
});

test("normalizarUrl", () => {
  assert.equal(normalizarUrl(""), null);
  assert.equal(normalizarUrl("mitienda.com/catalogo"), "https://mitienda.com/catalogo");
  assert.equal(normalizarUrl("https://instagram.com/luna"), "https://instagram.com/luna");
  assert.equal(normalizarUrl("hola mundo"), null);
  assert.equal(normalizarUrl("ftp://x.com"), null);
});
