import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const C = await import("../lib/config.ts");

test("el video está apagado: el selector solo acepta imágenes y un video elegido se ignora", () => {
  assert.equal(C.VIDEO_PERMITIDO, false);
  assert.equal(C.tiposDeMedioElegibles(), "image/*");
  assert.equal(C.esVideoAgregable("video/mp4"), false);
  assert.equal(C.esVideoAgregable("image/png"), false);
});

test("encendiendo la constante vuelve el video", () => {
  assert.equal(C.tiposDeMedioElegibles(true), "image/*,video/*");
  assert.equal(C.esVideoAgregable("video/mp4", true), true);
  assert.equal(C.esVideoAgregable("image/png", true), false);
});

test("la migración deja el bucket con solo imágenes", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261007161952_bucket_productos_solo_imagenes.sql", import.meta.url), "utf8");
  assert.match(sql, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ""), /video\/|drop /i);
});
