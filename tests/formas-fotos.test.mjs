import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Regla de formas (docs/09 §11): círculo = foto de tienda y de persona; foto de producto = cuadrado redondeado.
const css = readFileSync("app/tienda/catalogo.css", "utf8");
const reglas = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, cuerpo]) => ({ sel: sel.trim(), cuerpo }));

// Selectores del catálogo del comprador que dibujan la foto de un producto.
const FOTOS_DE_PRODUCTO = [".sritem img", ".hcov img", ".coitem .cc img", ".coitem .cc", ".finimgs img", ".hl img", ".hl .hl-carta", ".a8 .res img"];

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

test("superposición: se separa con recorte transparente (máscara), nunca con borde blanco (docs/09)", () => {
  const hcov = reglas.filter((x) => x.sel.includes(".hcov"));
  for (const x of hcov) assert.doesNotMatch(x.cuerpo, /border:\s*[0-9.]+px solid/, `${x.sel} no lleva borde`);
  assert.ok(hcov.some((x) => /mask-image/.test(x.cuerpo)), "las cartas de atrás del abanico llevan máscara");
  const fin = reglas.filter((x) => x.sel.includes(".finimgs img"));
  for (const x of fin) assert.doesNotMatch(x.cuerpo, /border:\s*[0-9.]+px solid/, "las fotos apiladas no llevan borde");
  assert.ok(fin.some((x) => /mask-image/.test(x.cuerpo)), "las fotos apiladas llevan máscara");
  assert.doesNotMatch(css, /\.cnt\s*\{[^}]*box-shadow:\s*0 0 0 2px/, "el contador no lleva aro");
});

test("carátula de colección: simple, redondeada, sin capas ni borde (docs/09)", () => {
  assert.doesNotMatch(css, /\.mazo|\.mz\b/, "ya no hay mazo");
  const cc = reglas.filter((x) => /\.coitem \.cc|\.hl \.hl-carta|\.hl img/.test(x.sel));
  for (const x of cc) assert.doesNotMatch(x.cuerpo, /border:\s*[0-9.]+px solid/, `${x.sel} no lleva borde`);
});

test("hoja Colecciones: la X queda fuera del scroll y tocar el fondo cierra", () => {
  const co = reglas.find((x) => x.sel.endsWith(".coov"));
  assert.match(co.cuerpo, /overflow:\s*hidden/);
  assert.ok(reglas.find((x) => x.sel.endsWith(".coscroll") && /overflow-y:\s*auto/.test(x.cuerpo)));
  const tsx = readFileSync("components/tienda/catalogo.tsx", "utf8");
  assert.match(tsx, /className="coscroll"/);
  assert.match(tsx, /t\.matches\("\.colist, \.colist > li"\)\) cerrar\(\)/);
});
