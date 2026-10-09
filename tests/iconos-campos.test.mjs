// Iconos en los campos de texto (components/ui/campo.tsx): contraste 3:1 y medidas (docs/09).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const campo = readFileSync(new URL("../components/ui/campo.tsx", import.meta.url), "utf8");

const luz = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a, b) => (Math.max(luz(a), luz(b)) + 0.05) / (Math.min(luz(a), luz(b)) + 0.05);
const token = (bloque, nombre) => bloque.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`))[1];

test("el icono (texto-secundario) contrasta 3:1 con el fondo del campo, en claro y en oscuro", () => {
  const claro = css.slice(css.indexOf(":root"));
  const oscuro = css.slice(css.indexOf("--superficie: #16281f") - 400);
  assert.ok(contraste(token(claro, "texto-secundario"), token(claro, "superficie")) >= 3);
  assert.ok(contraste(token(oscuro, "texto-secundario"), token(oscuro, "superficie")) >= 3);
});

test("el icono mide 22 px a 18 px del borde y el texto empieza a 52 px (sin cambiar la altura)", () => {
  assert.match(campo, /tamano=\{22\} strokeWidth=\{2\}/);
  assert.match(campo, /left-4\.5/);
  assert.match(campo, /"pl-13"/);
  assert.match(campo, /h-\(--alto-campo\)/);
});
