import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";
const { recortePila } = await import("../lib/recorte.ts");

test("recortePila: hueco con la forma de la carta de adelante, resta con máscara", () => {
  const e = recortePila(36, 8, 10, 2);
  assert.equal(e.maskComposite, "exclude");
  assert.equal(e.WebkitMaskComposite, "xor");
  const svg = decodeURIComponent(e.maskImage);
  assert.match(svg, /x='26'/); // 36 − 8 − 2
  assert.match(svg, /width='40'/); // 36 + 2·2
  assert.match(svg, /rx='12'/); // radio 10 + hueco 2
});
