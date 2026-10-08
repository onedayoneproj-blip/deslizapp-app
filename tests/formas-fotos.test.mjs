import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regla de formas (docs/09 §11): círculo = foto de tienda y de persona; foto de producto = cuadrado redondeado.
const css = readFileSync("app/tienda/catalogo.css", "utf8");
const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, cuerpo]) => ({ sel: sel.trim(), cuerpo }));

// Selectores del catálogo del comprador que dibujan la foto de un producto.
const FOTOS_DE_PRODUCTO = [".sritem img", ".hcov img", ".abz-c", ".abz-c img", ".finimgs img", ".a8 .res img"];

test("ninguna foto de producto del catálogo del comprador es circular", () => {
  for (const f of FOTOS_DE_PRODUCTO) {
    const r = reglas.filter((x) => x.sel.split(",").some((s) => s.trim().endsWith(" " + f) || s.trim().endsWith(f)));
    assert.ok(r.length > 0, `no encuentro ${f}`);
    for (const x of r) assert.doesNotMatch(x.cuerpo, /border-radius:\s*(50%|999px)/, `${f} no puede ser redonda`);
  }
});

test("el Avatar de tienda es un círculo, igual que el de persona", () => {
  const src = readFileSync("components/ui/avatar.tsx", "utf8");
  assert.match(src, /"rounded-full",/);
  assert.doesNotMatch(src, /rounded-radio/);
});

test("MiniaturaProducto es cuadrada con bordes redondeados, nunca rounded-full", () => {
  const src = readFileSync("components/catalogo/miniatura-producto.tsx", "utf8");
  assert.match(src, /rounded-radio-s/);
  assert.doesNotMatch(src, /rounded-full/);
});

test("el campo de búsqueda del comprador no dibuja recuadro al enfocarse", () => {
  const r = reglas.find((x) => x.sel.includes(".srbox input:focus-visible"));
  assert.ok(r, "falta la regla de foco de la búsqueda");
  assert.match(r.cuerpo, /outline:\s*none/);
  assert.match(css, /\.srbox:focus-within/);
});

test("las colecciones son cartas en abanico con contorno fino y sin anillo blanco grueso (docs/09)", () => {
  const carta = reglas.find((x) => x.sel.endsWith(".abz-c"));
  assert.ok(carta, "falta .abz-c");
  assert.match(carta.cuerpo, /border:\s*var\(--abz-grosor\) solid var\(--abz-borde\)/);
  assert.match(carta.cuerpo, /background:\s*transparent/);
  for (const sel of [".finimgs img", ".fly"]) {
    const r = reglas.find((x) => x.sel.endsWith(sel));
    assert.ok(r, `falta ${sel}`);
    assert.doesNotMatch(r.cuerpo, /border:\s*[2-9]px solid #fff/, `${sel} no lleva anillo blanco grueso`);
  }
});
