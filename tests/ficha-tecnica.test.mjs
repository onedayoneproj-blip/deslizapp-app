// Ficha técnica y descripción (docs/prompts/ficha-tecnica.md): reglas puras, la demo y el catálogo del comprador.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const F = await import("../lib/ficha-tecnica.ts");
const Z = await import("../lib/tienda/zoom.ts");
const { guardarFichaEnDB, catalogoPublicoDeDB } = await import("../lib/data/catalogo.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const D = await import("../lib/data/equipo-demo.ts");
const R = await import("../lib/rubros.ts");

const LINO = "a1000000-0000-4000-8000-000000000003";
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const AHORA = "2026-10-08T12:00:00.000Z";

test("los Detalles por rubro solo se piden si el producto ya los tiene (la descripción sola no cuenta)", () => {
  assert.equal(F.tieneDetallesPorRubro({}), false);
  assert.equal(F.tieneDetallesPorRubro(undefined), false);
  assert.equal(F.tieneDetallesPorRubro({ descripcion: "Algo" }), false);
  assert.equal(F.tieneDetallesPorRubro({ descripcion: "Algo", marca: "Michel" }), true);
  assert.equal(F.tieneDetallesPorRubro({ notas_salida: ["rosa"] }), true);
});

test("el contador de la descripción: «43 / 600»", () => {
  assert.equal(R.LARGO_DESCRIPCION, 600);
  assert.equal(F.contadorDescripcion("Oud ahumado con vainilla. Dura todo el día."), "43 / 600");
  assert.equal(F.contadorDescripcion(""), "0 / 600");
});

test("la ficha: subir, cambiar y quitar", () => {
  assert.equal(F.fichaVisible(null, { tipo: "igual" }), null, "sin ficha");
  assert.equal(F.fichaVisible("u1", { tipo: "igual" }), "u1", "con ficha");
  assert.equal(F.fichaVisible("u1", { tipo: "nueva", foto: "data:x" }), "data:x", "cambiar muestra la nueva");
  assert.equal(F.fichaVisible(null, { tipo: "nueva", foto: "data:x" }), "data:x", "subir");
  assert.equal(F.fichaVisible("u1", { tipo: "quitada" }), null, "quitar");
  assert.equal(F.fichaCambiada({ tipo: "igual" }), false);
  assert.equal(F.fichaCambiada({ tipo: "nueva", foto: "d" }), true);
  assert.equal(F.fichaCambiada({ tipo: "quitada" }), true);
  assert.deepEqual(F.borradorAlQuitar("u1"), { tipo: "quitada" });
  assert.deepEqual(F.borradorAlQuitar(null), { tipo: "igual" }, "una foto que aún no se subió solo se descarta");
});

test("el texto del reel: corto, sin «…» propio, y sin texto si no hay nada", () => {
  const defecto = "¿Te llama la atención?";
  assert.equal(F.textoCortoDelReel({}, defecto), null, "sin descripción ni Detalles: ni texto ni «…»");
  assert.equal(F.textoCortoDelReel({ descripcion: "   " }, defecto), null);
  assert.equal(F.textoCortoDelReel({ descripcion: "Oud ahumado con vainilla." }, defecto), "Oud ahumado con vainilla.");
  const larga = "Oud ahumado con vainilla y un fondo de ámbar que dura todo el día, sale contigo a la calle y vuelve a casa contigo.";
  const corta = F.textoCortoDelReel({ descripcion: larga }, defecto);
  assert.ok(corta.length <= 78 && !corta.endsWith("…") && larga.startsWith(corta), "se corta en una palabra completa");
  assert.equal(F.textoCortoDelReel({ marca: "Michel" }, defecto), defecto, "Detalles de siempre sin descripción: el texto de siempre");
});

test("la forma del botón de la ficha: círculo, píldora o ninguno", () => {
  assert.equal(F.formaBotonFicha({ fichaUrl: "u" }, true), "circulo");
  assert.equal(F.formaBotonFicha({ fichaUrl: "u" }, false), "pildora");
  assert.equal(F.formaBotonFicha({ fichaUrl: null }, true), null);
  assert.equal(F.formaBotonFicha({}, false), null);
});

test("zoom: ajustada no se mueve; acercada se mueve sin salirse; el toque alterna", () => {
  const A = Z.AJUSTADA;
  assert.deepEqual(Z.mover(A, 50, 50, 300, 500), A);
  const cerca = Z.alternar(A, { x: 0, y: 0 }, 300, 500);
  assert.equal(cerca.k, Z.K_TOQUE);
  const movida = Z.mover(cerca, 1000, -1000, 300, 500);
  assert.equal(movida.x, ((Z.K_TOQUE - 1) * 300) / 2);
  assert.equal(movida.y, -((Z.K_TOQUE - 1) * 500) / 2);
  assert.deepEqual(Z.alternar(cerca, { x: 0, y: 0 }, 300, 500), A, "otro toque vuelve a ajustar");
});

test("zoom: pellizcar respeta los límites y mantiene el punto bajo los dedos", () => {
  const c = { x: 20, y: 10 };
  const p = Z.pellizcar(Z.AJUSTADA, c, 100, c, 200, 300, 500);
  assert.equal(p.k, 2);
  // El punto de la imagen que estaba bajo los dedos sigue ahí: x = c - k·q con q = c.
  assert.deepEqual([p.x, p.y], [-20, -10]);
  assert.equal(Z.pellizcar(Z.AJUSTADA, c, 100, c, 5000, 300, 500).k, Z.K_MAX);
  assert.equal(Z.pellizcar(p, c, 200, c, 20, 300, 500).k, 1, "pellizcar hacia adentro vuelve a ajustar");
  assert.deepEqual(Z.pellizcar(p, c, 0, c, 20, 300, 500), p, "distancia inicial 0: no hace nada");
});

test("la demo: guardar y quitar la ficha, solo del producto de esa tienda", () => {
  const db = construirDesdeSeed();
  const lino = db.productos.find((p) => p.tiendaId === LINO && !p.fichaUrl);
  assert.ok(lino);
  const r = guardarFichaEnDB(db, LINO, lino.id, "https://x/y.webp", AHORA);
  assert.equal(r.producto.fichaUrl, "https://x/y.webp");
  const q = guardarFichaEnDB(r.db, LINO, lino.id, null, AHORA);
  assert.equal(q.producto.fichaUrl, null);
  assert.throws(() => guardarFichaEnDB(db, MICHEL, lino.id, "u", AHORA), /ya no existe/, "tienda ajena");
  assert.throws(() => guardarFichaEnDB(db, LINO, "no-existe", "u", AHORA), /ya no existe/);
});

test("la demo trae fichas de muestra y el catálogo público las devuelve", () => {
  const db = construirDesdeSeed();
  const oud = db.productos.find((p) => p.nombre === "Majestic Oud");
  assert.ok(oud.fichaUrl?.includes("ficha-majestic-oud"));
  const michel = catalogoPublicoDeDB(db, "esencias-michel", new Date(AHORA));
  assert.equal(michel.productos.find((p) => p.nombre === "Majestic Oud").fichaUrl, oud.fichaUrl);
  assert.equal(michel.productos.find((p) => p.nombre !== "Majestic Oud").fichaUrl, null, "sin ficha: null");
  const lino = catalogoPublicoDeDB(db, "lino-y-algodon", new Date(AHORA));
  const formas = lino.productos.map((p) => [p.nombre, F.formaBotonFicha(p, p.opciones.length > 0)]);
  assert.deepEqual(formas.find(([n]) => n === "Pantalón de algodón"), ["Pantalón de algodón", "circulo"]);
  assert.deepEqual(formas.find(([n]) => n === "Cinturón de cuero"), ["Cinturón de cuero", "pildora"]);
});

test("permisos: guardar la ficha es del grupo catalogo", () => {
  assert.equal(D.GRUPO_DE_OPERACION.guardarFicha, "catalogo");
});
