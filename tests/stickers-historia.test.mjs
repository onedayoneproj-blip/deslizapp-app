// Pruebas de los stickers de la historia (lib/stickers-historia.ts): cuándo se sugiere cada uno, el texto de «Últimas N» y las posiciones.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const S = await import("../lib/stickers-historia.ts");

const AHORA = new Date("2026-10-08T12:00:00Z");
const dias = (n) => new Date(AHORA.getTime() - n * 86_400_000).toISOString();
const prod = (extra = {}) => ({ creadoEn: dias(30), stock: 10, porEncargo: false, ...extra });

test("«¡Nuevo!» se sugiere con 7 días o menos, no con 8", () => {
  assert.deepEqual(S.stickersSugeridos(prod({ creadoEn: dias(0) }), AHORA), ["nuevo"]);
  assert.deepEqual(S.stickersSugeridos(prod({ creadoEn: dias(7) }), AHORA), ["nuevo"]);
  assert.deepEqual(S.stickersSugeridos(prod({ creadoEn: dias(8) }), AHORA), []);
  assert.deepEqual(S.stickersSugeridos(prod({ creadoEn: "" }), AHORA), []);
});

test("«Últimas N» se sugiere con stock de 1 a 3", () => {
  for (const n of [1, 2, 3]) assert.deepEqual(S.stickersSugeridos(prod({ stock: n }), AHORA), ["ultimas"]);
  assert.deepEqual(S.stickersSugeridos(prod({ stock: 4 }), AHORA), []);
  assert.deepEqual(S.stickersSugeridos(prod({ stock: 2, creadoEn: dias(1) }), AHORA), ["nuevo", "ultimas"]);
});

test("agotado o por encargo: «Últimas» ni se ofrece ni se sugiere", () => {
  assert.equal(S.stickersOfrecidos(prod({ stock: 0 })).includes("ultimas"), false);
  assert.equal(S.stickersOfrecidos(prod({ porEncargo: true, stock: 2 })).includes("ultimas"), false);
  assert.deepEqual(S.stickersSugeridos(prod({ porEncargo: true, stock: 2 }), AHORA), []);
  assert.deepEqual(S.stickersOfrecidos(prod()), ["nuevo", "ultimas", "aaah"]);
});

test("texto de «Últimas N»: con número, uno solo, y sin número", () => {
  assert.equal(S.textoUltimas(3), "Últimas 3");
  assert.equal(S.textoUltimas(1), "Última unidad");
  assert.equal(S.textoUltimas(null), "Últimas unidades");
  assert.equal(S.textoSticker("ultimas", { stock: 2 }), "Últimas 2");
  assert.equal(S.textoSticker("ultimas", { stock: null }), "Últimas unidades");
  assert.equal(S.textoSticker("nuevo", { stock: 2 }), "¡Nuevo!");
});

test("posiciones por defecto: arriba, fuera de la tarjeta y del centro, y sin encimarse", () => {
  const lista = S.IDS_STICKERS.map((id) => S.stickerPorDefecto(id, { stock: 2 }));
  for (const s of lista) {
    assert.ok(s.y < 0.3, `${s.id} arriba`);
    assert.ok(s.x > 0.1 && s.x < 0.9);
    assert.equal(s.k, 1);
  }
  // Cajas de sus formas (con el borde), en píxeles de la imagen: no se tocan
  const tamano = { nuevo: [328, 328], ultimas: [406, 183], aaah: [328, 298] };
  const caja = (s) => ({ x0: s.x * 1080 - tamano[s.id][0] / 2, x1: s.x * 1080 + tamano[s.id][0] / 2, y0: s.y * 1920 - tamano[s.id][1] / 2, y1: s.y * 1920 + tamano[s.id][1] / 2 });
  const tocan = (p, q) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
  const cajas = lista.map(caja);
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) assert.equal(tocan(cajas[i], cajas[j]), false);
});

test("alternar pone el sticker en su lugar y lo quita; arrastrar lo deja dentro de la imagen", () => {
  let l = S.alternarSticker([], "aaah", { stock: 5 });
  assert.deepEqual(l.map((s) => s.id), ["aaah"]);
  const movido = S.moverSticker(l[0], 5000, -5000, { ancho: 200, alto: 355 });
  assert.equal(movido.x, 0.95);
  assert.equal(movido.y, 0.04);
  assert.deepEqual(S.alternarSticker(l, "aaah", { stock: 5 }), []);
  assert.equal(S.limitarSticker({ ...l[0], k: 9 }).k, S.K_STICKER_MAX);
  assert.equal(S.limitarSticker({ ...l[0], k: NaN }).k, 1);
});
