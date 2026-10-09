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

const tienda = (stickers, extra = {}) => ({ slug: "soft-era", nombre: "Soft Era", personalizacion: stickers === undefined ? {} : { stickers_propios: stickers }, ...extra });

test("sin lista de stickers propios no hay grupo de tienda", () => {
  assert.equal(C.grupoStickersDeTienda(tienda(undefined)), null);
  assert.equal(C.grupoStickersDeTienda(tienda([])), null);
  assert.equal(C.grupoStickersDeTienda(tienda("ofertas")), null);
  assert.equal(C.grupoStickersDeTienda({ slug: "soft-era", nombre: "Soft Era" }), null);
});

test("con lista: grupo «De {tienda}» con ids tienda:<slug>/<id> y su archivo en public/stickers/tiendas", () => {
  const g = C.grupoStickersDeTienda(tienda([{ id: "ofertas", nombre: "Ofertas" }, { id: "abraza-tu-yo-puro", nombre: "Abraza tu yo puro" }]));
  assert.equal(g.id, "tienda");
  assert.equal(g.nombre, "De Soft Era");
  assert.equal(g.gratis, true);
  assert.deepEqual(g.stickers, [{ id: "tienda:soft-era/ofertas", nombre: "Ofertas" }, { id: "tienda:soft-era/abraza-tu-yo-puro", nombre: "Abraza tu yo puro" }]);
  assert.equal(C.urlStickerImagen(g.stickers[0].id), "/stickers/tiendas/soft-era/ofertas.webp");
  assert.equal(C.esStickerImagen("tienda:soft-era/ofertas"), true);
});

test("ids o slug inseguros, repetidos o sin forma se ignoran", () => {
  const g = C.grupoStickersDeTienda(tienda([
    { id: "../x", nombre: "a" }, { id: "Ofertas", nombre: "b" }, { id: "a/b", nombre: "c" }, { id: "", nombre: "d" }, { id: "dos--guiones" }, { id: "-x" },
    null, "ofertas", { nombre: "sin id" }, { id: 7 }, { id: "ok", nombre: "  Bien  " }, { id: "ok", nombre: "repetido" }, { id: "sin-nombre" },
  ]));
  assert.deepEqual(g.stickers, [{ id: "tienda:soft-era/ok", nombre: "Bien" }, { id: "tienda:soft-era/sin-nombre", nombre: "sin nombre" }]);
  assert.equal(C.grupoStickersDeTienda(tienda([{ id: "ok" }], { slug: "../otra" })), null);
  assert.equal(C.grupoStickersDeTienda(tienda([{ id: "ok" }], { slug: "Soft-Era" })), null);
  assert.equal(C.grupoStickersDeTienda(tienda([{ id: "../../etc" }])), null);
  assert.equal(C.idStickerPropio("soft-era", "a/b"), null);
  assert.equal(C.esStickerPropio("tienda:soft-era/../x"), false);
  assert.equal(C.esStickerImagen("tienda:../x/y"), false);
});

test("máximo de stickers propios y nombre de tienda largo", () => {
  const muchos = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, nombre: `S${i}` }));
  assert.equal(C.grupoStickersDeTienda(tienda(muchos)).stickers.length, C.MAX_STICKERS_PROPIOS);
  assert.equal(C.grupoStickersDeTienda(tienda([{ id: "ok" }], { nombre: "Una tienda con un nombre larguísimo" })).nombre, "De Una tienda con un…");
});

test("cada sticker de Soft Era declarado tiene su WebP liviano en public/stickers/tiendas/soft-era", () => {
  const ids = ["ofertas", "abraza-tu-yo-puro", "abraza-tu-yo-puro-beso", "amor-propio", "eres-unica", "belleza-genuina", "soft-era", "cuidado-con-amor"];
  const g = C.grupoStickersDeTienda(tienda(ids.map((id) => ({ id, nombre: id }))));
  assert.equal(g.stickers.length, 8);
  for (const s of g.stickers) {
    const ruta = new URL(`../public${C.urlStickerImagen(s.id)}`, import.meta.url);
    assert.ok(existsSync(ruta), s.id);
    assert.ok(statSync(ruta).size < 60_000, `${s.id} pesa de más`);
  }
});
