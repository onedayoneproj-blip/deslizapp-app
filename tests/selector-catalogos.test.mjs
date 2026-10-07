import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { catalogoInicial, productosDeCatalogo, contarPorCatalogo } = await import("../lib/catalogo-activo.ts");

const tienda = { rubro: "ropa", rubros: ["ropa", "accesorios"] };
const prods = [{ id: 1, rubro: null }, { id: 2, rubro: "ropa" }, { id: 3, rubro: "accesorios" }, { id: 4, rubro: "accesorios" }];

test("catálogo inicial: el último visto; el principal si no hay o ya no existe", () => {
  assert.equal(catalogoInicial(tienda, "accesorios"), "accesorios");
  assert.equal(catalogoInicial(tienda, null), "ropa");
  assert.equal(catalogoInicial(tienda, "hogar"), "ropa");
  assert.equal(catalogoInicial({ rubro: "ropa", rubros: ["ropa"] }, "accesorios"), "ropa");
});

test("filtro sin «Todo»: el producto sin tipo cuenta como el principal", () => {
  assert.deepEqual(productosDeCatalogo(prods, tienda, "ropa").map((p) => p.id), [1, 2]);
  assert.deepEqual(productosDeCatalogo(prods, tienda, "accesorios").map((p) => p.id), [3, 4]);
  assert.deepEqual(productosDeCatalogo([], tienda, "accesorios"), []);
});

test("contadores por catálogo, con los vacíos en cero", () => {
  assert.deepEqual(contarPorCatalogo(prods, tienda), { ropa: 2, accesorios: 2 });
  assert.deepEqual(contarPorCatalogo([{ rubro: null }], tienda), { ropa: 1, accesorios: 0 });
});

test("un producto nuevo sale con el catálogo activo", () => {
  assert.equal(catalogoInicial(tienda, "accesorios"), "accesorios");
});
