import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./cargar-ts.mjs";
const { buscarCatalogo, buscarConPrecio, leerPrecio, etiquetaPrecio } = await import("../lib/tienda/busqueda.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { catalogoPublicoDeDB } = await import("../lib/data/catalogo.ts");

const prod = (id, nombre, precio, extra = {}) => ({
  id, slug: id, nombre, rubro: "accesorios", categoria: null, precio, precioPromo: null, detalles: {}, opciones: [], variantes: [], medios: [], ...extra,
});
const tienda = { rubro: "accesorios", rubros: ["accesorios"] };
const cat = (productos, t = tienda) => ({ tienda: t, productos });
const ids = (c, q) => buscarCatalogo(c, q).map((p) => p.id);

const c = cat([
  prod("aro", "Aro", 300, { opciones: [{ nombre: "Color", valores: ["Dorado", "Plateado"] }], detalles: { descripcion: "Argolla liviana para diario" } }),
  prod("aretes", "Aretes perla", 450),
  prod("collar", "Collar largo", 800),
  prod("pulsera", "Pulsera", 1200),
  prod("bolso", "Bolso", 2000),
  prod("sombrero", "Sombrero 2000", 650),
  prod("perfume", "Colonia fresca", 1800, { detalles: { tamano: "100 ml" } }),
  prod("promo", "Cartera", 2400, { precioPromo: 1900 }),
  prod("var", "Camisa", 900, {
    opciones: [{ nombre: "Talla", valores: ["38", "40"] }],
    variantes: [
      { id: "v1", valores: { Talla: "38" }, precio: 900, precioPromo: null, disponibilidad: "disponible", quedan: null },
      { id: "v2", valores: { Talla: "40" }, precio: 1500, precioPromo: null, disponibilidad: "disponible", quedan: null },
    ],
  }),
]);

test("tope en todas sus formas", () => {
  for (const q of ["menos de 500", "hasta 500", "bajo 500", "debajo de 500", "por debajo de 500", "maximo 500", "max 500", "no mas de 500", "menor a 500", "menor de 500", "menor que 500", "< 500", "<500", "Menos de RD$500", "menos de $ 500"])
    assert.deepEqual(leerPrecio(c, q).precio, { tipo: "tope", max: 500 }, q);
  assert.deepEqual(ids(c, "menos de 500"), ["aretes", "aro"]); // el más cercano al tope primero
});

test("piso en todas sus formas", () => {
  for (const q of ["mas de 1000", "mayor a 1000", "mayor de 1000", "mayor que 1000", "desde 1000", "minimo 1000", "min 1000", "arriba de 1000", "por encima de 1000", "> 1000", ">1000"])
    assert.deepEqual(leerPrecio(c, q).precio, { tipo: "piso", min: 1000 }, q);
  assert.deepEqual(ids(c, "mas de 1000"), ["pulsera", "var", "perfume", "promo", "bolso"]); // de menor a mayor
});

test("rango en todas sus formas, sin importar el orden", () => {
  for (const q of ["entre 500 y 1500", "entre 1500 y 500", "de 500 a 1500", "500-1500", "500 - 1500", "mas de 500 menos de 1500", "menos de 1500 desde 500"])
    assert.deepEqual(leerPrecio(c, q).precio, { tipo: "rango", min: 500, max: 1500 }, q);
  assert.deepEqual(ids(c, "entre 500 y 1500"), ["sombrero", "collar", "var", "pulsera"]);
});

test("formatos del número", () => {
  for (const q of ["menos de 2000", "menos de 2,000", "menos de 2.000", "menos de RD$2000", "menos de $ 2,000", "menos de 2 mil", "menos de 2k", "menos de 2K"])
    assert.deepEqual(leerPrecio(c, q).precio, { tipo: "tope", max: 2000 }, q);
  assert.deepEqual(leerPrecio(c, "menos de 1.5k").precio, { tipo: "tope", max: 1500 });
  assert.deepEqual(leerPrecio(c, "hasta RD$ 1,500,000").precio, { tipo: "tope", max: 1500000 });
});

test("número suelto: cerca de (±25 %), lo más cercano primero", () => {
  assert.deepEqual(leerPrecio(c, "1900").precio, { tipo: "cerca", valor: 1900 });
  assert.deepEqual(leerPrecio(c, "RD$1,900").precio, { tipo: "cerca", valor: 1900 });
  assert.deepEqual(ids(c, "1900"), ["promo", "bolso", "perfume", "var"]);
  assert.deepEqual(ids(c, "1.9k"), ["promo", "bolso", "perfume", "var"]);
  assert.equal(leerPrecio(c, "2 mil").precio, null); // 2000 está en «Sombrero 2000»: es texto
});

test("número suelto que está en el catálogo, o menor de 100, es texto", () => {
  assert.equal(leerPrecio(c, "2000").precio, null); // «Sombrero 2000»
  assert.deepEqual(ids(c, "2000"), ["sombrero"]);
  assert.equal(leerPrecio(c, "100").precio, null); // «100 ml»
  assert.deepEqual(ids(c, "100 ml"), ["perfume"]);
  assert.equal(leerPrecio(c, "38").precio, null);
  assert.equal(leerPrecio(c, "50").precio, null);
  assert.equal(leerPrecio(c, "1500 ml").precio, null);
});

test("palabras y precio juntos", () => {
  assert.deepEqual(ids(c, "aretes menos de 500"), ["aretes"]);
  assert.equal(buscarConPrecio(c, "collar menos de 500").cercanos, true); // el collar existe, pero no a ese precio
  assert.deepEqual(ids(c, "dorado menos de 500"), ["aro"]);
  assert.deepEqual(ids(c, "bolso 1900").slice(0, 1), ["bolso"]);
  const r = buscarConPrecio(c, "aretes menos de 500");
  assert.equal(r.etiqueta, "Hasta RD$500");
  assert.equal(r.sinPrecio, "aretes");
  assert.equal(buscarConPrecio(c, "Menos de RD$500 aretes").sinPrecio, "aretes");
});

test("precio que ve el comprador: promo y presentaciones", () => {
  assert.ok(ids(c, "menos de 2000").includes("promo")); // 1900 con promo
  assert.ok(!ids(c, "mas de 2000").includes("promo"));
  assert.ok(ids(c, "menos de 1000").includes("var")); // una presentación a 900
  assert.ok(ids(c, "mas de 1400").includes("var")); // otra a 1500
  assert.ok(!ids(c, "entre 1000 y 1400").includes("var"));
});

test("sin resultados de precio: lo más cercano (hasta 6)", () => {
  const r = buscarConPrecio(c, "hasta 200");
  assert.equal(r.cercanos, true);
  assert.equal(r.productos.length, 6);
  assert.equal(r.productos[0].id, "aro");
  assert.equal(r.etiqueta, "Hasta RD$200");
  const q = buscarConPrecio(c, "bolso hasta 200");
  assert.deepEqual(q.productos.map((p) => p.id), ["bolso"]);
  assert.equal(q.cercanos, true);
  assert.equal(buscarConPrecio(c, "xyzxyz hasta 200").productos.length, 0);
});

test("la etiqueta", () => {
  assert.equal(etiquetaPrecio({ tipo: "tope", max: 500 }), "Hasta RD$500");
  assert.equal(etiquetaPrecio({ tipo: "piso", min: 1000 }), "Desde RD$1,000");
  assert.equal(etiquetaPrecio({ tipo: "rango", min: 500, max: 1500 }), "Entre RD$500 y RD$1,500");
  assert.equal(etiquetaPrecio({ tipo: "cerca", valor: 2000 }), "Cerca de RD$2,000");
  assert.equal(buscarConPrecio(c, "aretes").etiqueta, null);
});

test("presentaciones, descripción y tipo se encuentran", () => {
  assert.deepEqual(ids(c, "dorado"), ["aro"]);
  assert.deepEqual(ids(c, "plateados"), ["aro"]);
  assert.deepEqual(ids(c, "argolla"), ["aro"]);
  assert.ok(ids(c, "accesorios").length === c.productos.length);
  assert.deepEqual(ids(c, "talla 40"), ["var"]);
  assert.deepEqual(ids(c, "100 ml"), ["perfume"]);
});

test("sin precio en la consulta todo sigue igual (orden: relevancia y luego precio)", () => {
  assert.deepEqual(buscarCatalogo(c, "").map((p) => p.id), c.productos.map((p) => p.id));
  assert.deepEqual(ids(c, "barato").slice(0, 2), ["aro", "aretes"]);
});

test("Esencias Michel: la búsqueda por palabras no cambia", () => {
  const base = JSON.parse(readFileSync(new URL("./fixtures/michel-busqueda-base.json", import.meta.url), "utf8"));
  const m = catalogoPublicoDeDB(construirDesdeSeed(), "esencias-michel", new Date("2026-10-08T12:00:00Z"));
  assert.ok(Object.keys(base).length >= 15);
  for (const [q, esperado] of Object.entries(base)) assert.deepEqual(buscarCatalogo(m, q).map((p) => p.id), esperado, q);
});

test("Michel: «Menos de RD$2,000» (la idea de búsqueda) sigue dando perfumes bajo ese tope", () => {
  const m = catalogoPublicoDeDB(construirDesdeSeed(), "esencias-michel", new Date("2026-10-08T12:00:00Z"));
  const r = buscarCatalogo(m, "Menos de RD$2,000");
  assert.ok(r.length > 0);
  assert.ok(r.every((p) => [p.precioPromo ?? p.precio, ...p.variantes.map((v) => v.precioPromo ?? v.precio)].some((x) => x <= 2000))); // «Majestic Oud» entra por su tamaño más barato
});
