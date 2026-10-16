// La animación del aro del Círculo (components/panel/aro-circulo.css): solo transform y opacity, quieta con movimiento reducido.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../components/panel/aro-circulo.css", import.meta.url), "utf8");
const tsx = readFileSync(new URL("../components/panel/logo-tienda.tsx", import.meta.url), "utf8");

test("los keyframes solo mueven transform y opacity", () => {
  const bloques = [...css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  assert.ok(bloques.length >= 3);
  for (const b of bloques) {
    const props = [...b.matchAll(/^\s{4}([\w-]+):/gm)].map((m) => m[1]);
    assert.ok(props.length > 0 && props.every((p) => p === "transform" || p === "opacity"), `propiedades: ${props}`);
  }
});

test("con movimiento reducido el aro no lleva animación y las ondas no se ven", () => {
  const reducido = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducido, /\.aro-c\[data-animacion\] \.aro-c-anillo,\s*\.aro-c\[data-animacion\] \.aro-c-sello \{\s*animation: none;/);
  assert.match(reducido, /\.aro-c\[data-animacion\] \.aro-c-onda \{\s*display: none;/);
});

test("el aro quieto (animacion «ninguna») no recibe data-animacion: ninguna regla de movimiento le aplica", () => {
  assert.match(tsx, /animacion = "ninguna"/);
  assert.match(tsx, /if \(animacion === "ninguna"\)/);
  // Todo el movimiento (`animation:`) cuelga de [data-animacion]; el aro quieto no lo tiene.
  const sinMedia = css.replace(/@keyframes [\w-]+ \{[\s\S]*?\n\}/g, "").replace(/@media[\s\S]*$/, "");
  for (const [, selector, cuerpo] of sinMedia.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (/\banimation:/.test(cuerpo)) assert.match(selector, /\[data-animacion/, `sin data-animacion: ${selector.trim()}`);
  }
  assert.match(css, /\.aro-c:not\(\[data-animacion="ondas"\]\) \.aro-c-onda \{\s*display: none;/);
});

test("las ondas: tres, cada 0,8 s, ciclo de 2,4 s, hasta ~1,45 veces, y se pausan fuera de pantalla", () => {
  assert.match(css, /animation: aro-c-onda 2\.4s/);
  assert.match(css, /transform: scale\(1\.45\)/);
  assert.equal([...tsx.matchAll(/\["#[0-9A-Fa-f]{6}", [0-9.]+\]/g)].length, 3);
  assert.match(tsx, /0\.8/);
  assert.match(css, /data-en-pantalla="no"[\s\S]*animation-play-state: paused/);
});
