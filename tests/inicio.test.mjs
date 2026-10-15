// La página principal (lib/inicio/fotos.ts): las fotos de la tienda Deslizapp, completadas con las de la landing si faltan.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const { completarFotos, FOTOS_RESPALDO, MINIMO_FOTOS_INICIO, SLUG_TIENDA_INICIO } = await import("../lib/inicio/fotos.ts");

test("las fotos de la tienda van tal cual cuando hay suficientes", () => {
  const nueve = Array.from({ length: 9 }, (_, i) => ({ src: `https://x.supabase.co/storage/v1/object/public/productos/${i}.jpg`, nombre: `P${i}` }));
  assert.deepEqual(completarFotos(nueve), nueve);
  assert.equal(SLUG_TIENDA_INICIO, "deslizapp");
});

test("con menos de 6, se completan con las de la landing; sin ninguna, solo las de la landing", () => {
  const dos = [{ src: "a.jpg", nombre: "A" }, { src: "b.jpg", nombre: "B" }];
  const r = completarFotos(dos);
  assert.equal(r.length, MINIMO_FOTOS_INICIO);
  assert.deepEqual(r.slice(0, 2), dos);
  assert.ok(r.slice(2).every((f) => FOTOS_RESPALDO.some((x) => x.src === f.src)));
  assert.ok(completarFotos([]).every((f) => f.src.startsWith("/landing/feed-")));
});
