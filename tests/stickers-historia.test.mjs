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
  assert.equal(S.stickersOfrecidos(prod()).includes("ultimas"), true);
  assert.equal(S.stickersOfrecidos(prod()).length, 34);
  assert.equal(S.stickersOfrecidos(prod({ stock: 0 })).length, 33);
});

test("texto de «Últimas N»: con número, uno solo, y sin número", () => {
  assert.equal(S.textoUltimas(3), "Últimas 3");
  assert.equal(S.textoUltimas(1), "Última unidad");
  assert.equal(S.textoUltimas(null), "Últimas unidades");
  assert.equal(S.textoSticker("ultimas", { stock: 2 }), "Últimas 2");
  assert.equal(S.textoSticker("ultimas", { stock: null }), "Últimas unidades");
  assert.equal(S.textoSticker("nuevo", { stock: 2 }), "¡Nuevo!");
});

test("posiciones por defecto: arriba, fuera de la tarjeta y del centro, y cada uno en un lugar libre", () => {
  for (const p of S.POSICIONES_STICKER) {
    assert.ok(p.y < 0.4, "arriba");
    assert.ok(p.x > 0.1 && p.x < 0.9);
  }
  // Poniendo uno tras otro, ninguno cae encima del anterior
  let l = [];
  for (const id of ["nuevo", "ultimas", "aaah", "te-amo", "halloween"]) l = S.alternarSticker(l, id, { stock: 2 });
  const claves = l.map((s) => `${s.x},${s.y}`);
  assert.equal(new Set(claves).size, l.length);
  assert.equal(l[0].k, 1);
  assert.equal(l[0].r, 0);
  assert.equal(l[1].r, -5);
  // Sin lugar libre, vuelve al primero
  assert.deepEqual(S.posicionLibre(S.POSICIONES_STICKER), S.POSICIONES_STICKER[0]);
});

test("grupos: Básicos, Temporadas y Marca con 12, 12 y 9; «Últimas» abre Básicos solo si se ofrece", () => {
  const g = S.gruposOfrecidos(prod());
  assert.deepEqual(g.map((x) => x.nombre), ["Básicos", "Temporadas", "Marca"]);
  assert.deepEqual(g.map((x) => x.ids.length), [13, 12, 9]);
  assert.equal(g[0].ids[0], "ultimas");
  assert.equal(S.gruposOfrecidos(prod({ stock: 0 }))[0].ids.includes("ultimas"), false);
  assert.ok(g.every((x) => x.disponible), "todos gratis por ahora");
});

test("giro: se normaliza a (-180, 180] y un valor roto cae a la inclinación de entrada", () => {
  const base = S.stickerPorDefecto("ultimas", { stock: 2 });
  assert.equal(S.limitarSticker({ ...base, r: 190 }).r, -170);
  assert.equal(S.limitarSticker({ ...base, r: -180 }).r, 180);
  assert.equal(S.limitarSticker({ ...base, r: 360 }).r, 0);
  assert.equal(S.limitarSticker({ ...base, r: NaN }).r, -5);
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
