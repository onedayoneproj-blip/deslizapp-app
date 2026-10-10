import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { CATALOGO_GENERAL, catalogoInicial, contarPorCatalogo, guardarCatalogoActivo, leerCatalogoActivo, nombreCatalogoPanel, productosDeCatalogo, rubroInicialDeProducto } = await import("../lib/catalogo-activo.ts");

const tienda = { rubro: "ropa", rubros: ["ropa", "accesorios"] };
const prods = [{ id: "1", rubro: null }, { id: "2", rubro: "ropa" }, { id: "3", rubro: "accesorios" }, { id: "4", rubro: "accesorios" }];

test("catálogo inicial: el último visto; General sin preferencia; el principal si la guardada ya no existe", () => {
  assert.equal(catalogoInicial(tienda, "accesorios"), "accesorios");
  assert.equal(catalogoInicial(tienda, null), CATALOGO_GENERAL);
  assert.equal(catalogoInicial(tienda, "hogar"), "ropa");
  assert.equal(catalogoInicial({ rubro: "ropa", rubros: ["ropa"] }, "accesorios"), "ropa");
});

test("filtro sin «Todo»: el producto sin tipo cuenta como el principal", () => {
  assert.deepEqual(productosDeCatalogo(prods, tienda, "ropa").map((p) => p.id), ["1", "2"]);
  assert.deepEqual(productosDeCatalogo(prods, tienda, "accesorios").map((p) => p.id), ["3", "4"]);
  assert.deepEqual(productosDeCatalogo([], tienda, "accesorios"), []);
});

test("contadores por catálogo, con los vacíos en cero", () => {
  assert.deepEqual(contarPorCatalogo(prods, tienda), { ropa: 2, accesorios: 2 });
  assert.deepEqual(contarPorCatalogo([{ rubro: null }], tienda), { ropa: 1, accesorios: 0 });
});

test("un producto nuevo sale con el catálogo activo", () => {
  assert.equal(catalogoInicial(tienda, "accesorios"), "accesorios");
});

test("General agregado y De todo son opciones distintas; el rubro guardado no cambia", () => {
  const tiendaConGeneral = { rubro: "ropa", rubros: ["ropa", "general", "accesorios"] };
  assert.equal(nombreCatalogoPanel(CATALOGO_GENERAL), "General");
  assert.equal(nombreCatalogoPanel("general"), "De todo");
  assert.equal(catalogoInicial(tiendaConGeneral, "general"), "general");
  assert.equal(catalogoInicial(tiendaConGeneral, CATALOGO_GENERAL), CATALOGO_GENERAL);
  assert.deepEqual(productosDeCatalogo([
    { id: "de-todo", rubro: "general" },
    { id: "accesorio", rubro: "accesorios" },
  ], tiendaConGeneral, "general").map((p) => p.id), ["de-todo"]);
});

test("General agrega todos los catálogos y deduplica IDs compartidos", () => {
  const compartido = { id: "compartido", rubro: "ropa" };
  const productos = [compartido, { id: "accesorio", rubro: "accesorios" }, { ...compartido, rubro: "general" }];
  assert.deepEqual(productosDeCatalogo(productos, tienda, CATALOGO_GENERAL).map((p) => p.id), ["compartido", "accesorio"]);
  assert.equal(productosDeCatalogo(productos, tienda, CATALOGO_GENERAL).length, 2);
  assert.equal(productosDeCatalogo(productos, tienda, CATALOGO_GENERAL).length, new Set(productos.map((p) => p.id)).size);
});

test("desde General agregado, un producto nuevo usa el rubro principal real", () => {
  const tiendaConGeneral = { rubro: "ropa", rubros: ["ropa", "general"] };
  assert.equal(rubroInicialDeProducto(tiendaConGeneral, CATALOGO_GENERAL), "ropa");
  assert.equal(rubroInicialDeProducto(tiendaConGeneral, "general"), "general");
});

test("el selector guarda y recupera por separado la vista General y el rubro general", () => {
  const almacenOriginal = globalThis.localStorage;
  const datos = new Map();
  globalThis.localStorage = {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => datos.set(k, String(v)),
  };
  try {
    guardarCatalogoActivo("tienda", CATALOGO_GENERAL);
    assert.equal(leerCatalogoActivo("tienda"), CATALOGO_GENERAL);
    guardarCatalogoActivo("tienda", "general");
    assert.equal(leerCatalogoActivo("tienda"), "general");
  } finally {
    if (almacenOriginal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = almacenOriginal;
  }
});


test("primera visita multirrubro abre General, incluso con principal general; un rubro queda igual", () => {
  assert.equal(catalogoInicial({ rubro: "general", rubros: ["general", "ropa"] }, null), CATALOGO_GENERAL);
  assert.equal(catalogoInicial({ rubro: "general", rubros: ["general"] }, null), "general");
  assert.equal(catalogoInicial({ rubro: "ropa" }, CATALOGO_GENERAL), "ropa");
  assert.equal(rubroInicialDeProducto(tienda, null), "ropa");
});

test("primera visita, persistencia y A→B→A conservan preferencias independientes", () => {
  const original = globalThis.localStorage;
  const datos = new Map();
  globalThis.localStorage = { getItem: k => datos.get(k) ?? null, setItem: (k,v) => datos.set(k,String(v)) };
  const a = { rubro: "ropa", rubros: ["ropa", "general"] };
  const b = { rubro: "perfumes", rubros: ["perfumes", "accesorios"] };
  const entrar = (id,t) => catalogoInicial(t,leerCatalogoActivo(id));
  try {
    assert.equal(entrar("A",a),CATALOGO_GENERAL);
    guardarCatalogoActivo("A","general");
    assert.equal(entrar("A",a),"general");
    assert.equal(entrar("B",b),CATALOGO_GENERAL);
    guardarCatalogoActivo("B","accesorios");
    assert.equal(entrar("B",b),"accesorios");
    assert.equal(entrar("A",a),"general");
    guardarCatalogoActivo("A",CATALOGO_GENERAL);
    assert.equal(entrar("B",b),"accesorios");
    assert.equal(entrar("A",a),CATALOGO_GENERAL);
    assert.equal(rubroInicialDeProducto(a,entrar("A",a)),"ropa");
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
