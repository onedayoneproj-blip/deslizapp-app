// Pruebas del catálogo de stickers ilustrados (lib/catalogo-stickers.ts): que cada uno tenga su archivo WebP liviano y de nuestro host.
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { test } from "node:test";
import "./cargar-ts.mjs";
const C = await import("../lib/catalogo-stickers.ts");

test("33 stickers en tres grupos gratis, sin ids repetidos", () => {
  assert.deepEqual(C.GRUPOS_STICKERS.map((g) => [g.id, g.stickers.length]), [["basicos", 12], ["temporadas", 12], ["marca", 9]]);
  const ids = C.GRUPOS_STICKERS.flatMap((g) => g.stickers.map((s) => s.id));
  assert.equal(new Set(ids).size, 33);
  assert.ok(C.GRUPOS_STICKERS.every((g) => g.gratis && C.grupoDisponible(g)));
  assert.equal(C.grupoDisponible({ gratis: false }), false);
});

test("cada sticker tiene su WebP en public/stickers, de menos de 40 KB, servido desde la raíz del sitio", () => {
  for (const g of C.GRUPOS_STICKERS) {
    for (const s of g.stickers) {
      const url = C.urlStickerImagen(s.id);
      assert.match(url, /^\/stickers\/(basicos|temporadas|marca)\/[a-z0-9-]+\.webp$/);
      const ruta = new URL(`../public${url}`, import.meta.url);
      assert.ok(existsSync(ruta), url);
      assert.ok(statSync(ruta).size < 40_000, `${url} pesa de más`);
    }
  }
  assert.equal(C.esStickerImagen("nuevo"), true);
  assert.equal(C.esStickerImagen("ultimas"), false);
});
