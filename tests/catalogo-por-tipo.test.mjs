import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";
const { catalogosDe, catalogoFiltrado, coleccionesDe, filtroVigente } = await import("../lib/tienda/catalogo.ts");

const p = (slug, rubro, extra = {}) => ({ id: slug, slug, nombre: slug, rubro, categoria: null, detalles: {}, medios: [], ...extra });
const cat = (rubros, productos) => ({ tienda: { rubro: "perfumes", rubros }, productos });

test("catalogosDe cuenta el null como rubro principal y omite vacíos", () => {
  const c = cat(["perfumes", "accesorios", "ropa"], [p("a", null), p("b", "perfumes"), p("c", "accesorios")]);
  assert.deepEqual(catalogosDe(c), [{ rubro: "perfumes", cantidad: 2 }, { rubro: "accesorios", cantidad: 1 }]);
});

test("catalogoFiltrado: null es Todo y filtra por tipo", () => {
  const c = cat(["perfumes", "accesorios"], [p("a", null), p("c", "accesorios")]);
  assert.equal(catalogoFiltrado(c, null), c);
  assert.deepEqual(catalogoFiltrado(c, "perfumes").productos.map((x) => x.slug), ["a"]);
  assert.deepEqual(catalogoFiltrado(c, "accesorios").productos.map((x) => x.slug), ["c"]);
});

test("colecciones sin vacías y reinicio de la colección que desaparece", () => {
  const c = cat(["perfumes", "accesorios"], [p("a", "perfumes", { categoria: "Árabes" }), p("c", "accesorios", { categoria: "Bolsos" })]);
  const cols = coleccionesDe(catalogoFiltrado(c, "accesorios"));
  assert.deepEqual(cols.map((x) => x.id), ["all", "categoria:Bolsos"]);
  assert.equal(filtroVigente(cols, "categoria:Árabes"), "all");
  assert.equal(filtroVigente(cols, "categoria:Bolsos"), "categoria:Bolsos");
  assert.equal(cols[1].productos.length, 1);
});

test("un solo rubro: un solo catálogo (sin selector)", () => {
  assert.equal(catalogosDe(cat(["perfumes"], [p("a", null)])).length, 1);
});
