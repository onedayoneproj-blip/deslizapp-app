import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const R = await import("../lib/rubros.ts");
const { buscarCatalogo, tiposDelCatalogo, tiposEnConsulta } = await import("../lib/tienda/busqueda.ts");
const { catalogoPublicoDeDB } = await import("../lib/data/catalogo.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { modificarRubros } = await import("../lib/data/tiendas.ts");
const { insertarProducto, modificarProducto } = await import("../lib/data/productos.ts");
const { aTienda, aCatalogoPublico, filaCambiosProducto, filaProductoNuevo } = await import("../lib/data/filas.ts");
const { DatosInvalidos } = await import("../lib/data/errores.ts");

const LINO = "a1000000-0000-4000-8000-000000000003";
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const cat = (slug) => catalogoPublicoDeDB(construirDesdeSeed(), slug, new Date());
const base = (extra = {}) => ({ nombre: "Prueba", precio: 100, fotos: [], fotoRetocada: false, categoria: null, activo: true, destacado: false, stock: 1, likes: 0, ...extra });

test("rubrosDeTienda: el principal primero y sin repetir; sin rubros, solo el principal", () => {
  assert.deepEqual(R.rubrosDeTienda({ rubro: "ropa", rubros: ["accesorios", "ropa"] }), ["ropa", "accesorios"]);
  assert.deepEqual(R.rubrosDeTienda({ rubro: "perfumes" }), ["perfumes"]);
});

test("errorDeRubros: al menos uno, de la lista y sin repetir", () => {
  assert.ok(R.errorDeRubros([]));
  assert.ok(R.errorDeRubros(["zapatos"]));
  assert.ok(R.errorDeRubros(["ropa", "ropa"]));
  assert.equal(R.errorDeRubros(["ropa", "accesorios"]), null);
});

test("tipo por defecto: el del último producto creado si la tienda lo sigue vendiendo; si no, el principal", () => {
  const t = { rubro: "ropa", rubros: ["ropa", "accesorios"] };
  assert.equal(R.tipoPorDefecto(t, "accesorios"), "accesorios");
  assert.equal(R.tipoPorDefecto(t, "hogar"), "ropa");
  assert.equal(R.tipoPorDefecto(t, null), "ropa");
  assert.equal(R.tipoDeProducto({ rubro: null }, t), "ropa");
  assert.equal(R.tipoDeProducto({ rubro: "accesorios" }, t), "accesorios");
});

test("presentaciones típicas por tipo del producto", () => {
  assert.notDeepEqual([...R.OPCIONES_TIPICAS.ropa], [...R.OPCIONES_TIPICAS.perfumes]);
  assert.ok(R.OPCIONES_TIPICAS.accesorios);
});

test("las filas de la base: sin rubros la tienda vende solo el principal; con ellos, el principal va primero", () => {
  const f = { id: "x", slug: "x", nombre: "X", rubro: "ropa" };
  assert.deepEqual(aTienda({ ...f, creado_en: "2026-01-01T00:00:00Z", logo_url: null, plan: "p20", limite_productos: 20, creditos_retoque: 0, creditos_retoque_mensuales: 0, marca_color_principal: "#000000", marca_color_acento: "#000000", marca_estilo: "moderna", url_catalogo: null }).rubros, ["ropa"]);
  assert.deepEqual(filaCambiosProducto({ rubro: "accesorios" }), { rubro: "accesorios" });
  assert.deepEqual(filaCambiosProducto({ rubro: null }), { rubro: null });
  assert.ok(!("rubro" in filaCambiosProducto({ nombre: "a" })));
  assert.ok(!("rubro" in filaProductoNuevo("t", base())));
});

test("Lino & Algodón vende ropa y accesorios; Michel y Luna, uno solo", () => {
  const db = construirDesdeSeed();
  const rubros = (id) => db.tiendas.find((t) => t.id === id).rubros;
  assert.deepEqual(rubros(LINO), ["ropa", "accesorios"]);
  assert.deepEqual(rubros(MICHEL), ["perfumes"]);
  const accesorios = db.productos.filter((p) => p.tiendaId === LINO && p.rubro === "accesorios");
  assert.ok(accesorios.length >= 2);
});

test("el tipo de un producto debe ser uno de los de la tienda", () => {
  const db = construirDesdeSeed();
  assert.throws(() => insertarProducto(db, MICHEL, base({ rubro: "ropa" }), "p-1", "2026-10-07T00:00:00Z"), DatosInvalidos);
  const { producto } = insertarProducto(db, LINO, base({ rubro: "accesorios" }), "p-2", "2026-10-07T00:00:00Z");
  assert.equal(producto.rubro, "accesorios");
  assert.throws(() => modificarProducto(db, LINO, accesorioId(db), { rubro: "hogar" }, "2026-10-07T00:00:00Z"), DatosInvalidos);
  const { producto: cambiado } = modificarProducto(db, LINO, accesorioId(db), { rubro: null }, "2026-10-07T00:00:00Z");
  assert.equal(cambiado.rubro, null);
});
const accesorioId = (db) => db.productos.find((p) => p.tiendaId === LINO && p.rubro === "accesorios").id;

test("quitar de la tienda un tipo que algún producto usa no se puede, y dice cuáles", () => {
  const db = construirDesdeSeed();
  assert.throws(() => modificarRubros(db, LINO, ["ropa"]), (e) => e instanceof DatosInvalidos && /Cinturón de cuero/.test(e.message));
  assert.throws(() => modificarRubros(db, LINO, []), DatosInvalidos);
  const ok = modificarRubros(db, LINO, ["accesorios", "ropa", "hogar"]);
  assert.equal(ok.tienda.rubro, "accesorios");
  assert.deepEqual(ok.tienda.rubros, ["accesorios", "ropa", "hogar"]);
  // Un tipo que ningún producto usa sí se puede quitar
  const sin = modificarRubros(ok.db, LINO, ["accesorios", "ropa"]);
  assert.deepEqual(sin.tienda.rubros, ["accesorios", "ropa"]);
  // Un producto sin tipo propio sigue al principal: no bloquea
  assert.deepEqual(modificarRubros(db, MICHEL, ["perfumes"]).tienda.rubros, ["perfumes"]);
});

test("el catálogo público trae los rubros de la tienda y el tipo ya resuelto de cada producto", () => {
  const l = cat("lino-y-algodon");
  assert.deepEqual(l.tienda.rubros, ["ropa", "accesorios"]);
  assert.equal(l.productos.find((p) => p.slug === "camisa-de-lino").rubro, "ropa");
  assert.equal(l.productos.find((p) => p.slug === "cinturon-de-cuero").rubro, "accesorios");
  const m = cat("esencias-michel");
  assert.deepEqual(m.tienda.rubros, ["perfumes"]);
  assert.ok(m.productos.every((p) => p.rubro === "perfumes"));
  // y desde la fila de la base (RPC catalogo_publico)
  const doble = aCatalogoPublico({ tienda: { desde: "", ventas: null, slug: "x", nombre: "X", logo_url: null, foto_perfil_url: null, marca_color_principal: "#000", marca_color_acento: "#000", marca_estilo: "moderna", personalizacion: null, whatsapp: null, instagram: null, descripcion: null, nombre_vendedora: null, rubro: "ropa", rubros: ["ropa", "hogar"] }, productos: [] });
  assert.deepEqual(doble.tienda.rubros, ["ropa", "hogar"]);
});

test("búsqueda con un solo rubro: idéntica a la de antes (comparada con un caso fijo de main)", () => {
  const esperado = JSON.parse(readFileSync(new URL("./fixtures/busqueda-michel.json", import.meta.url), "utf8"));
  const c = cat("esencias-michel");
  assert.equal(tiposDelCatalogo(c).length, 1);
  for (const [q, slugs] of Object.entries(esperado)) assert.deepEqual(buscarCatalogo(c, q).map((p) => p.slug), slugs, `«${q}»`);
});

test("búsqueda con varios rubros: «ropa» y «accesorios» filtran por tipo; la pastilla también", () => {
  const c = cat("lino-y-algodon");
  assert.deepEqual(tiposDelCatalogo(c), ["ropa", "accesorios"]);
  const slugs = (q, t) => buscarCatalogo(c, q, t).map((p) => p.slug).sort();
  assert.deepEqual(slugs("accesorios"), ["cinturon-de-cuero", "sombrero-de-paja"]);
  assert.deepEqual(slugs("ropa"), ["camisa-de-lino", "pantalon-de-algodon"]);
  assert.deepEqual(slugs("", "accesorios"), ["cinturon-de-cuero", "sombrero-de-paja"]);
  // el tipo y otra palabra se combinan
  assert.deepEqual(slugs("sombrero accesorios"), ["sombrero-de-paja"]);
  assert.deepEqual(slugs("cuero", "accesorios"), ["cinturon-de-cuero"]);
  assert.deepEqual(tiposEnConsulta(c, "ropa de lino").tipos, ["ropa"]);
  assert.equal(tiposEnConsulta(c, "ropa de lino").resto, "de lino");
  // sin tipo ni palabra de tipo, como siempre
  assert.equal(slugs("").length, 4);
});

test("una tienda de un solo rubro ignora las palabras de tipo (no hay nada que filtrar)", () => {
  const c = cat("esencias-michel");
  assert.deepEqual(tiposEnConsulta(c, "perfumes").tipos, []);
  assert.equal(buscarCatalogo(c, "perfumes").length, c.productos.length);
});
