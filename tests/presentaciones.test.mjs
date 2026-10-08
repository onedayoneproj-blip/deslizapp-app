import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const P = await import("../lib/presentaciones.ts");
const { guardarVariantesEnDB, guardarFotoValorEnDB } = await import("../lib/data/catalogo.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { modificarProducto, conVariantes } = await import("../lib/data/productos.ts");
const D = await import("../lib/data/equipo-demo.ts");
const R = await import("../lib/rubros.ts");

const TALLA = { nombre: "Talla", valores: ["S", "M", "L", "XL"] };
const COLOR = { nombre: "Color", valores: ["Negro", "Arena", "Verde"] };
const LINO = "a1000000-0000-4000-8000-000000000003";
const MICHEL = "a1000000-0000-4000-8000-000000000001";
let n = 0;
const nuevoId = () => `id-${++n}`;
const AHORA = "2026-10-08T12:00:00.000Z";

test("crear N combinaciones: 4 tallas × 3 colores salen 12, en el orden de los ejes y con stock 0", () => {
  assert.equal(P.cuantasSalen([TALLA, COLOR]), 12);
  const todas = P.crearTodas([TALLA, COLOR]);
  assert.equal(todas.length, 12);
  assert.deepEqual(todas[0].valores, { Talla: "S", Color: "Negro" });
  assert.deepEqual(todas[11].valores, { Talla: "XL", Color: "Verde" });
  assert.ok(todas.every((p) => p.stock === 0 && p.precio === null && p.activa));
  assert.equal(P.cuantasSalen([]), 0);
  assert.equal(P.cuantasSalen([TALLA, { nombre: "Color", valores: [] }]), 0);
});

test("los límites de la base: 2 ejes, 12 valores, 20 letras, sin repetir, 144", () => {
  assert.equal(P.errorDeEjes([TALLA, COLOR]), null);
  assert.match(P.errorDeEjes([]), /Elige/);
  assert.match(P.errorDeEjes([TALLA, COLOR, { nombre: "Tamaño", valores: ["a"] }]), /Hasta 2/);
  assert.match(P.errorDeEjes([{ nombre: "Talla", valores: ["S", "S"] }]), /repetido/);
  assert.match(P.errorDeEjes([{ nombre: "Talla", valores: Array.from({ length: 13 }, (_, i) => `T${i}`) }]), /Hasta 12/);
  assert.match(P.errorDeEjes([{ nombre: "Talla", valores: ["x".repeat(21)] }]), /20 letras/);
  assert.match(P.errorDeEjes([{ nombre: "A", valores: ["a"] }, { nombre: "a", valores: ["b"] }]), /nombre/);
  const doce = (nombre) => ({ nombre, valores: Array.from({ length: 12 }, (_, i) => `v${i}`) });
  assert.equal(P.errorDeEjes([doce("A"), doce("B")]), null, "12 × 12 = 144 cabe");
  assert.equal(P.MAX_EJES, 2);
  assert.equal(P.MAX_PRESENTACIONES, 144);
});

const con = (lista, stocks) => lista.map((p, i) => ({ ...p, stock: stocks[i] ?? 0 }));
const claves = (lista) => lista.map((p) => P.claveVariante(p.valores));

test("crear con 1 cosa: salen sus filas con 0 y sin nada que repartir", () => {
  const r = P.cambiarEjes([], [], [COLOR]);
  assert.equal(r.presentaciones.length, 3);
  assert.deepEqual(r.origenes, []);
  assert.equal(r.confirmar, null);
});

test("crear con 2 cosas: todas las combinaciones, en el orden de los ejes", () => {
  const r = P.cambiarEjes([], [], [COLOR, { nombre: "Tamaño", valores: ["Pequeño", "Grande"] }]);
  assert.equal(r.presentaciones.length, 6);
  assert.deepEqual(r.presentaciones[1].valores, { Color: "Negro", Tamaño: "Grande" });
  assert.throws(() => P.cambiarEjes([], [], []), /Elige/);
  assert.throws(() => P.cambiarEjes([], [], [{ nombre: "Talla", valores: [] }]), /Falta/);
});

test("agregar un valor: se suman sus filas con 0 y lo que había no se toca", () => {
  const antes = con(P.crearTodas([TALLA]), [5, 4, 3, 2]).map((p, i) => ({ ...p, precio: i === 3 ? 2900 : null }));
  const r = P.cambiarEjes([TALLA], antes, [{ nombre: "Talla", valores: ["S", "M", "L", "XL", "XXL"] }]);
  assert.equal(r.presentaciones.length, 5);
  assert.deepEqual(r.presentaciones.map((p) => p.stock), [5, 4, 3, 2, 0]);
  assert.equal(r.presentaciones[3].precio, 2900);
  assert.deepEqual(r.origenes, []);
  assert.equal(r.confirmar, null);
  // Con 2 cosas faltan las combinaciones del valor nuevo, todas en 0.
  const dos = con(P.crearTodas([TALLA, COLOR]), [1, 1, 1]);
  const r2 = P.cambiarEjes([TALLA, COLOR], dos, [TALLA, { nombre: "Color", valores: ["Negro", "Arena", "Verde", "Rojo"] }]);
  assert.equal(r2.presentaciones.length, 16);
  assert.equal(r2.presentaciones.filter((p) => p.valores.Color === "Rojo").length, 4);
  assert.ok(r2.presentaciones.filter((p) => p.valores.Color === "Rojo").every((p) => p.stock === 0));
});

test("quitar un valor: sus filas se van y se pregunta, diciendo cuántas y cuánto stock", () => {
  const antes = con(P.crearTodas([TALLA, COLOR]), [1, 1, 1, 2, 2, 2]);
  const nuevos = [{ nombre: "Talla", valores: ["S", "M"] }, COLOR];
  const r = P.cambiarEjes([TALLA, COLOR], antes, nuevos);
  assert.equal(r.presentaciones.length, 6);
  assert.equal(r.perdidas, 6);
  assert.equal(r.unidadesPerdidas, 0);
  assert.match(r.confirmar, /6 presentaciones se van/);
  assert.match(r.confirmar, /pedidos/);
  assert.equal(P.cuantasSeVan([TALLA, COLOR], antes, nuevos), 6);
  const conStock = con(P.crearTodas([TALLA]), [3, 3, 4, 4]);
  const r2 = P.cambiarEjes([TALLA], conStock, [{ nombre: "Talla", valores: ["S", "M", "L"] }]);
  assert.match(r2.confirmar, /Una presentación se va con 4 unidades/);
  assert.doesNotMatch(r2.confirmar, /[!¡]/);
});

test("quitar una cosa entera: las que quedan iguales se juntan y suman su stock, y se pregunta", () => {
  const antes = con(P.crearTodas([TALLA, COLOR]), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  const r = P.cambiarEjes([TALLA, COLOR], antes, [TALLA]);
  assert.equal(r.presentaciones.length, 4);
  assert.ok(r.presentaciones.every((p) => p.stock === 3), "3 colores × 1 = 3 por talla");
  assert.equal(r.juntadas, 8);
  assert.match(r.confirmar, /se juntan y suman su stock/);
  assert.deepEqual(r.origenes, [], "juntar no deja nada por repartir");
  const total = (l) => l.reduce((s, p) => s + p.stock, 0);
  assert.equal(total(r.presentaciones), total(antes), "no se pierde ni se duplica stock");
});

test("agregar una 2.ª cosa: todas las combinaciones, y el stock de cada valor viejo se reparte", () => {
  const antes = con(P.crearTodas([COLOR]), [5, 3, 0]);
  const talla = { nombre: "Talla", valores: ["S", "M", "L"] };
  const r = P.cambiarEjes([COLOR], antes, [COLOR, talla]);
  assert.equal(r.presentaciones.length, 9);
  assert.ok(r.presentaciones.every((p) => p.stock === 0), "nada se reparte solo");
  assert.deepEqual(r.origenes.map((o) => [o.titulo, o.total, o.filas.length]), [["Negro", 5, 3], ["Arena", 3, 3]], "Verde tenía 0: no hay nada que repartir");
  assert.equal(r.confirmar, null);
  // Al repartir, lo que falta se dice en palabras y «Listo» espera a que cuadre.
  let lista = r.presentaciones.map((p) => (p.valores.Color === "Negro" && p.valores.Talla === "S" ? { ...p, stock: 3 } : p));
  const e = P.estadoDeReparto(r.origenes, lista);
  assert.deepEqual(e.map((x) => x.faltan), [2, 3]);
  assert.equal(P.textoDeReparto(e[0], "entre las tallas"), "Tenías 5 de Negro. Repártelas entre las tallas: faltan 2.");
  assert.equal(P.repartoCuadra(r.origenes, lista), false);
  lista = lista.map((p) => {
    if (p.valores.Color === "Negro" && p.valores.Talla === "M") return { ...p, stock: 2 };
    if (p.valores.Color === "Arena") return { ...p, stock: 1 };
    return p;
  });
  assert.equal(P.repartoCuadra(r.origenes, lista), true);
  const pasado = lista.map((p) => (p.valores.Color === "Negro" && p.valores.Talla === "L" ? { ...p, stock: 1 } : p));
  const e2 = P.estadoDeReparto(r.origenes, pasado);
  assert.equal(e2[0].faltan, -1);
  assert.equal(P.textoDeReparto(e2[0], "entre las tallas"), "Tenías 5 de Negro. Te pasaste por 1.");
  // «Ponerlas todas en …»: todo el stock del valor en una fila.
  const una = P.ponerTodasEn(r.presentaciones, r.origenes[0], P.claveVariante({ Color: "Negro", Talla: "M" }));
  assert.equal(una.find((p) => p.valores.Color === "Negro" && p.valores.Talla === "M").stock, 5);
  assert.equal(P.repartoCuadra([r.origenes[0]], una), true);
  // El precio propio y «oculta» de cada valor viejo pasan a sus filas.
  const propio = antes.map((p, i) => (i === 0 ? { ...p, precio: 1200 } : p));
  const r2 = P.cambiarEjes([COLOR], propio, [COLOR, talla]);
  assert.ok(r2.presentaciones.filter((p) => p.valores.Color === "Negro").every((p) => p.precio === 1200));
});

test("pasar de stock simple a presentaciones: un solo origen con el total y nada se pierde en silencio", () => {
  const r = P.cambiarEjes([], [], [COLOR], 8);
  assert.deepEqual(r.origenes.map((o) => [o.titulo, o.total, o.filas.length]), [["", 8, 3]]);
  assert.equal(P.textoDeReparto(P.estadoDeReparto(r.origenes, r.presentaciones)[0], "entre ellas"), "Tenías 8. Repártelas entre ellas: faltan 8.");
  assert.equal(P.repartoCuadra(r.origenes, r.presentaciones), false);
  const todas = P.ponerTodasEn(r.presentaciones, r.origenes[0], claves(r.presentaciones)[1]);
  assert.deepEqual(todas.map((p) => p.stock), [0, 8, 0]);
  assert.equal(P.repartoCuadra(r.origenes, todas), true);
  assert.deepEqual(P.cambiarEjes([], [], [COLOR], 0).origenes, [], "sin stock no hay nada que repartir");
  assert.deepEqual(P.cambiarEjes([], [], [COLOR], null).origenes, [], "sin llevar la cuenta tampoco");
});

test("cambiar una cosa por otra: lo que tenías se reparte entre las nuevas y se pregunta antes", () => {
  const antes = con(P.crearTodas([COLOR]), [2, 3, 4]);
  const r = P.cambiarEjes([COLOR], antes, [TALLA]);
  assert.equal(r.presentaciones.length, 4);
  assert.deepEqual(r.origenes.map((o) => [o.titulo, o.total]), [["", 9]]);
  assert.match(r.confirmar, /se reemplazan/);
});

test("«Poner a todas» y lo ya tocado en el paso 2 sobrevive a volver al paso 1", () => {
  const lista = P.crearTodas([TALLA]).map((p, i) => ({ ...p, activa: i !== 3 }));
  const todas = P.ponerATodas(lista, 4);
  assert.deepEqual(todas.map((p) => p.stock), [4, 4, 4, 0], "la oculta no cambia");
  assert.equal(P.ponerATodas(lista, -3)[0].stock, 0);
  const nuevas = P.cambiarEjes([TALLA], P.crearTodas([TALLA]), [{ nombre: "Talla", valores: ["S", "M", "L", "XL", "XXL"] }]).presentaciones;
  const editadas = nuevas.map((p, i) => ({ ...p, stock: i + 1, precio: i === 0 ? 900 : null }));
  const otra = P.cambiarEjes([TALLA], P.crearTodas([TALLA]), [{ nombre: "Talla", valores: ["S", "M", "L", "XL", "XXL", "XXXL"] }]).presentaciones;
  const vuelta = P.conservarEdicion(otra, editadas);
  assert.deepEqual(vuelta.map((p) => p.stock), [1, 2, 3, 4, 5, 0]);
  assert.equal(vuelta[0].precio, 900);
  assert.equal(P.mismosEjes([TALLA], [{ ...TALLA }]), true);
  assert.equal(P.mismosEjes([TALLA], [COLOR]), false);
});

test("quitar: sin pedidos se va; con pedidos solo se oculta (y dice por qué)", () => {
  const lista = P.crearTodas([TALLA]);
  const k = P.claveVariante({ Talla: "XL" });
  const sin = P.quitar(lista, k, false);
  assert.equal(sin.presentaciones.length, 3);
  assert.equal(sin.oculta, false);
  const con = P.quitar(lista, k, true);
  assert.equal(con.presentaciones.length, 4);
  assert.equal(con.presentaciones[3].activa, false);
  assert.equal(con.oculta, true);
  assert.match(P.TEXTO_CON_PEDIDOS, /Ya tiene pedidos: la ocultamos para no perder tu historial/);
});

test("completar una «Sin color»: cambia sus valores y no choca con otra", () => {
  const lista = P.crearTodas([TALLA]).map((p) => ({ ...p, valores: { ...p.valores, Color: "Sin color" } }));
  const k = P.claveVariante({ Talla: "S", Color: "Sin color" });
  const hecha = P.cambiarValores(lista, k, { Talla: "S", Color: "Negro" });
  assert.deepEqual(hecha[0].valores, { Talla: "S", Color: "Negro" });
  assert.throws(() => P.cambiarValores(hecha, P.claveVariante({ Talla: "M", Color: "Sin color" }), { Talla: "S", Color: "Negro" }), /ya existe/);
});

test("precio propio, «Desde», conteos y estados", () => {
  const lista = P.crearTodas([TALLA, COLOR]).map((p) => ({
    ...p,
    stock: p.valores.Talla === "L" ? 0 : 3,
    precio: p.valores.Talla === "XL" ? 2900 : null,
  }));
  const r = P.resumenDe(lista, 2300);
  assert.equal(r.total, 12);
  assert.equal(r.agotadas, 3);
  assert.equal(r.desde, 2300);
  assert.equal(r.enTotal, 27);
  assert.equal(r.conPrecioPropio, true);
  assert.equal(P.precioDe(lista[9], 2300), 2900);
  assert.equal(P.precioDe(lista[0], 2300), 2300);
  // «Desde» con una más barata que el producto (el perfume: 30 ml a 1,200 y el producto a 2,800).
  const perfume = P.resumenDe([{ valores: { Tamaño: "30 ml" }, stock: 6, precio: 1200, activa: true }, { valores: { Tamaño: "100 ml" }, stock: 3, precio: null, activa: true }], 2800);
  assert.equal(perfume.desde, 1200);
  // Las ocultas no cuentan para el cliente.
  const oculta = P.resumenDe([{ valores: { Talla: "S" }, stock: 5, precio: 100, activa: false }, { valores: { Talla: "M" }, stock: 1, precio: null, activa: true }], 500);
  assert.deepEqual([oculta.total, oculta.ocultas, oculta.enTotal, oculta.desde], [1, 1, 1, 500]);
  assert.equal(P.resumenDe([], 500).desde, null);
  assert.deepEqual(P.estadoDe({ id: "v1", valores: {}, stock: 0, precio: null, activa: true }), { estado: "agotada", texto: "Agotada" });
  // «Agotada» solo en lo que ya existía en un producto publicado: una recién creada, o la de un producto nuevo, dice «0».
  assert.equal(P.estadoDe({ valores: {}, stock: 0, precio: null, activa: true }).texto, null);
  assert.equal(P.estadoDe({ id: "v1", valores: {}, stock: 0, precio: null, activa: true }, false).texto, null);
  assert.equal(P.estadoDe({ valores: {}, stock: 2, precio: null, activa: true }).texto, "Quedan 2");
  assert.equal(P.estadoDe({ valores: {}, stock: 3, precio: null, activa: true }).texto, null);
  assert.equal(P.estadoDe({ valores: {}, stock: null, precio: null, activa: true }).texto, null);
  assert.equal(P.estadoDe({ valores: {}, stock: 5, precio: null, activa: false }).texto, "Oculta");
  assert.equal(P.textoPresentaciones(1), "1 presentación");
  assert.equal(P.textoPresentaciones(12), "12 presentaciones");
});

test("sin presentaciones un producto no cambia: ni resumen ni lista", () => {
  const sinNada = { tipo: "producto", precio: 950, opciones: [], variantes: [] };
  assert.equal(P.resumenDeProducto(sinNada), null);
  assert.deepEqual(P.presentacionesDe(sinNada), []);
  assert.equal(P.resumenDeProducto({ tipo: "servicio", precio: 1, opciones: [{ nombre: "A", valores: ["a"] }], variantes: [] }), null);
});

test("atajos: Talla siempre; «30 · 50 · 100 ml» solo en el Tamaño de los perfumes", () => {
  assert.deepEqual(P.atajosDe("Talla").map((a) => a.texto), ["XS a XL", "36 a 42", "Única"]);
  assert.deepEqual(P.atajosDe("Tamaño", "perfumes")[0].valores, ["30 ml", "50 ml", "100 ml"]);
  assert.deepEqual(P.atajosDe("Tamaño", "hogar"), []);
  assert.deepEqual(P.atajosDe("Color", "ropa"), []);
  assert.deepEqual(R.OPCIONES_TIPICAS.perfumes, ["Tamaño"], "los perfumes sugieren Tamaño");
  assert.deepEqual(R.OPCIONES_TIPICAS.ropa, ["Talla", "Color"], "los demás rubros no cambian");
});

test("foto por color: el eje, asignar, quitar y la limpieza (foto o valor que salen)", () => {
  assert.equal(P.ejeDeFoto([TALLA, COLOR]).nombre, "Color");
  assert.equal(P.ejeDeFoto([TALLA]).nombre, "Talla");
  assert.equal(P.ejeDeFoto([]), null);
  const medios = [{ tipo: "foto", url: "u1", retocada: false }, { tipo: "foto", url: "u2", retocada: false }, { tipo: "video", url: "v", portada: null, duracionS: 5 }];
  const p = { opciones: [TALLA, COLOR], medios, fotosPorValor: {} };
  const f1 = P.asignarFotoValor(p, "Color", "Negro", "u1");
  assert.deepEqual(f1, { Color: { Negro: "u1" } });
  assert.throws(() => P.asignarFotoValor(p, "Color", "Negro", "otra"), /no es de este producto/);
  assert.throws(() => P.asignarFotoValor(p, "Color", "Rojo", "u1"), /no es de este producto/);
  assert.throws(() => P.asignarFotoValor(p, "Color", "Negro", "v"), /no es de este producto/, "un video no es foto");
  const f2 = P.asignarFotoValor({ ...p, fotosPorValor: f1 }, "Color", "Arena", "u2");
  assert.deepEqual(P.asignarFotoValor({ ...p, fotosPorValor: f2 }, "Color", "Negro", null), { Color: { Arena: "u2" } });
  assert.deepEqual(P.asignarFotoValor({ ...p, fotosPorValor: f1 }, "Color", "Negro", null), {}, "sin valores el eje se va");
  assert.equal(P.fotoDeValor(f2, "Color", "Arena"), "u2");
  assert.equal(P.fotoDeValor(f2, "Color", "Verde"), null);
  // Limpieza: sale la foto, sale el valor, sale el eje.
  assert.deepEqual(P.limpiarFotosPorValor(f2, p.opciones, [medios[0]]), { Color: { Negro: "u1" } }, "sale la foto de Arena, queda la de Negro");
  assert.deepEqual(P.limpiarFotosPorValor(f2, p.opciones, [medios[1]]), { Color: { Arena: "u2" } });
  assert.deepEqual(P.limpiarFotosPorValor(f2, p.opciones, []), {}, "ninguna de sus fotos sigue en medios");
  assert.deepEqual(P.limpiarFotosPorValor(f2, [TALLA, { nombre: "Color", valores: ["Negro"] }], medios), { Color: { Negro: "u1" } }, "sale el valor Arena");
  assert.deepEqual(P.limpiarFotosPorValor(f2, [TALLA], medios), {});
  assert.deepEqual(P.limpiarFotosPorValor(undefined, [TALLA], medios), {});
});

test("demo: el Pantalón de algodón trae 12 presentaciones, fotos por color y la XL con precio propio", () => {
  const db = construirDesdeSeed();
  const pantalon = conVariantes(db, db.productos.find((p) => p.slug === "pantalon-de-algodon" && p.tiendaId === LINO));
  const lista = P.presentacionesDe(pantalon);
  assert.equal(lista.length, 12);
  assert.ok(lista.filter((p) => p.valores.Talla === "XL").every((p) => p.precio === 2900));
  assert.ok(lista.filter((p) => p.valores.Talla !== "XL").every((p) => p.precio === null));
  assert.equal(Object.keys(pantalon.fotosPorValor.Color).length, 3);
  assert.ok(Object.values(pantalon.fotosPorValor.Color).every((u) => pantalon.medios.some((m) => m.url === u)));
  const r = P.resumenDeProducto(pantalon);
  assert.equal(r.desde, 2300);
  assert.equal(r.total, 12);
  assert.equal(r.agotadas, 2);
  const perfume = conVariantes(db, db.productos.find((p) => p.slug === "majestic-oud" && p.tiendaId === MICHEL));
  const rp = P.resumenDeProducto(perfume);
  assert.deepEqual([rp.total, rp.desde, rp.enTotal], [3, 1200, 14]);
  // La camisa de siempre no cambia.
  const camisa = conVariantes(db, db.productos.find((p) => p.slug === "camisa-de-lino"));
  assert.equal(P.presentacionesDe(camisa).length, 6);
  assert.deepEqual(camisa.fotosPorValor, {});
});

test("demo: guardar variantes limpia la foto de un color que sale; la foto del color vive en las fotos del producto", () => {
  let db = construirDesdeSeed();
  const pantalon = db.productos.find((p) => p.slug === "pantalon-de-algodon" && p.tiendaId === LINO);
  const datos = (opciones) => P.combinaciones(opciones).map((valores) => ({ valores, stock: 1, precio: null }));
  const sinVerde = [TALLA, { nombre: "Color", valores: ["Negro", "Arena"] }];
  const r = guardarVariantesEnDB(db, LINO, pantalon.id, sinVerde, datos(sinVerde), "u", nuevoId, AHORA);
  assert.deepEqual(Object.keys(r.producto.fotosPorValor.Color).sort(), ["Arena", "Negro"]);
  // Fuera el eje Color: ya no hay fotos por color.
  const soloTalla = [TALLA];
  const r2 = guardarVariantesEnDB(r.db, LINO, pantalon.id, soloTalla, datos(soloTalla), "u", nuevoId, AHORA);
  assert.deepEqual(r2.producto.fotosPorValor, {});
  // Quitar la foto de medios limpia su color.
  const fresco = construirDesdeSeed();
  const p0 = fresco.productos.find((p) => p.slug === "pantalon-de-algodon" && p.tiendaId === LINO);
  const urlNegro = p0.fotosPorValor.Color.Negro;
  const m = modificarProducto(fresco, LINO, p0.id, { medios: p0.medios.filter((x) => x.url !== urlNegro) }, AHORA);
  assert.equal(m.producto.fotosPorValor.Color.Negro, undefined);
  assert.ok(m.producto.fotosPorValor.Color.Arena);
});

test("demo: guardar y quitar la foto de un color con la misma regla de la base", () => {
  const db = construirDesdeSeed();
  const p = db.productos.find((x) => x.slug === "pantalon-de-algodon" && x.tiendaId === LINO);
  const foto = p.medios[0].url;
  const r = guardarFotoValorEnDB(db, LINO, p.id, "Color", "Verde", foto, AHORA);
  assert.equal(r.producto.fotosPorValor.Color.Verde, foto);
  assert.throws(() => guardarFotoValorEnDB(db, LINO, p.id, "Color", "Verde", "https://otra", AHORA), /no es de este producto/);
  assert.throws(() => guardarFotoValorEnDB(db, LINO, p.id, "Color", "Rojo", foto, AHORA), /no es de este producto/);
  assert.throws(() => guardarFotoValorEnDB(db, MICHEL, p.id, "Color", "Verde", foto, AHORA), /ya no existe/, "otra tienda no toca este producto");
  const q = guardarFotoValorEnDB(r.db, LINO, p.id, "Color", "Verde", null, AHORA);
  assert.equal(q.producto.fotosPorValor.Color.Verde, undefined);
});

test("permisos: todo lo de presentaciones es del grupo catalogo; el Ayudante no escribe y Ver como tampoco", async () => {
  assert.equal(D.GRUPO_DE_OPERACION.guardarFotoValor, "catalogo");
  assert.equal(D.GRUPO_DE_OPERACION.guardarVariantes, "catalogo");
  let llamadas = 0;
  const base = { guardarVariantes: async () => llamadas++, guardarFotoValor: async () => llamadas++, getProducto: async () => "lectura" };
  const comoAyudante = D.conPermisosDeLaDemo(base, () => ({ nivelDemo: "ayudante" }));
  await assert.rejects(() => comoAyudante.guardarVariantes(), /quien administra/);
  await assert.rejects(() => comoAyudante.guardarFotoValor(), /quien administra/);
  assert.equal(llamadas, 0);
  assert.equal(await comoAyudante.getProducto(), "lectura");
  const comoEditor = D.conPermisosDeLaDemo(base, () => ({ nivelDemo: "editor" }));
  await comoEditor.guardarFotoValor();
  assert.equal(llamadas, 1);
  const { LECTURAS_SOLO_MIRAR } = await import("../lib/data/solo-mirar.ts");
  assert.ok(!LECTURAS_SOLO_MIRAR.includes("guardarFotoValor"), "Ver como no la deja pasar");
  assert.ok(!LECTURAS_SOLO_MIRAR.includes("guardarVariantes"));
});

test("la migración trae lo que la app espera: función, permisos, limpieza y lectura pública", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261007125411_presentaciones_fotos_por_valor.sql", import.meta.url), "utf8");
  assert.match(sql, /add column fotos_por_valor jsonb not null default '\{\}'/);
  assert.match(sql, /perform public\.exigir_no_viendo\(p_tienda_id\);\s*perform public\.exigir_permiso\(p_tienda_id, 'catalogo'\);/);
  assert.match(sql, /revoke execute on function public\.guardar_foto_valor\(uuid, uuid, text, text, text\) from public, anon;/);
  assert.doesNotMatch(sql, /drop function/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /create or replace function public\.(guardar_variantes|opciones_validas)/i);
});

test("lista de cosas que cambian: lo típico primero, «Otras» sin repetir; General deja solo «Otras»", () => {
  const ropa = P.listaDeCosas(R.OPCIONES_TIPICAS.ropa);
  assert.deepEqual(ropa.tipicas, ["Talla", "Color"]);
  assert.deepEqual(ropa.otras, ["Tamaño", "Material", "Modelo", "Sabor", "Tono"]);
  const perfumes = P.listaDeCosas(R.OPCIONES_TIPICAS.perfumes);
  assert.deepEqual(perfumes.tipicas, ["Tamaño"]);
  assert.ok(!perfumes.otras.includes("Tamaño"));
  const general = P.listaDeCosas(R.OPCIONES_TIPICAS.general);
  assert.deepEqual(general.tipicas, []);
  assert.deepEqual(general.otras, [...P.COSAS_QUE_CAMBIAN]);
  for (const r of R.RUBROS) {
    const l = P.listaDeCosas(R.OPCIONES_TIPICAS[r]);
    assert.equal(new Set([...l.tipicas, ...l.otras]).size, l.tipicas.length + l.otras.length);
  }
});

test("hasta 2 cosas que cambian por producto, las propias incluidas", () => {
  assert.equal(P.puedeElegirOtra(0), true);
  assert.equal(P.puedeElegirOtra(1), true);
  assert.equal(P.puedeElegirOtra(2), false);
  assert.equal(P.MAX_EJES, 2);
  assert.match(P.errorDeEjes([{ nombre: "A", valores: ["x"] }, { nombre: "B", valores: ["x"] }, { nombre: "C", valores: ["x"] }]), /Hasta 2/);
});

test("nombre de una cosa propia: vacío, largo, repetido o del catálogo", () => {
  assert.ok(P.errorDeNombrePropio("   ", []));
  assert.ok(P.errorDeNombrePropio("a".repeat(21), []));
  assert.equal(P.errorDeNombrePropio("a".repeat(20), []), null);
  assert.equal(P.errorDeNombrePropio("Aroma", []), null);
  assert.ok(P.errorDeNombrePropio("aroma", ["Aroma"]));
  assert.ok(P.errorDeNombrePropio("color", []));
  assert.ok(P.errorDeNombrePropio(" COLOR ", ["Aroma"]));
  assert.ok(P.errorDeNombrePropio("Tamaño", [], ["Tamaño"]));
});

test("valores sugeridos: cortos, por cosa, y perfumes con sus ml", () => {
  assert.deepEqual(P.valoresSugeridos("Talla"), ["XS", "S", "M", "L", "XL"]);
  assert.deepEqual(P.valoresSugeridos("Tamaño"), ["Pequeño", "Mediano", "Grande"]);
  assert.deepEqual(P.valoresSugeridos("Tamaño", "perfumes"), ["30 ml", "50 ml", "100 ml"]);
  assert.deepEqual(P.valoresSugeridos("Modelo"), []);
  assert.deepEqual(P.valoresSugeridos("Aroma"), []);
  for (const c of P.COSAS_QUE_CAMBIAN) {
    const v = P.valoresSugeridos(c);
    if (c !== "Modelo") assert.ok(v.length >= 3 && v.length <= 11, c);
    assert.ok(v.every((x) => x.length <= P.LARGO_VALOR));
  }
});

test("valores propios: máximo 12, 20 letras, sin repetir; el orden sigue al de la lista", () => {
  let v = [];
  for (let i = 0; i < 15; i++) v = P.alternarValor(v, `V${i}`);
  assert.equal(v.length, 12);
  assert.deepEqual(P.alternarValor(["Dorado"], "dorado"), ["Dorado"]);
  assert.deepEqual(P.alternarValor(["Dorado"], "Dorado"), []);
  assert.deepEqual(P.alternarValor([], "  "), []);
  assert.equal(P.alternarValor([], "x".repeat(30))[0].length, 20);
  const sug = P.valoresSugeridos("Color");
  assert.deepEqual(P.ordenarValores(sug, ["Negro", "Turquesa", "Dorado"]), ["Dorado", "Negro", "Turquesa"]);
  assert.deepEqual(P.valoresVisibles(["A", "B"], ["B", "Z"]), ["A", "B", "Z"]);
});

test("cuántas salen: Color × Tamaño", () => {
  assert.equal(P.cuantasSalen([{ nombre: "Color", valores: ["Dorado", "Plateado"] }, { nombre: "Tamaño", valores: ["Pequeño", "Mediano", "Grande"] }]), 6);
});

test("tarjetas de la lista: con 2 elegidas se apagan las que no lo están; las elegidas no", () => {
  assert.equal(P.tarjetaApagada(false, 0), false);
  assert.equal(P.tarjetaApagada(false, 1), false);
  assert.equal(P.tarjetaApagada(false, 2), true);
  assert.equal(P.tarjetaApagada(true, 2), false);
});

test("resumen de una tarjeta colapsada: los valores elegidos, o «Elige cuáles tienes»", () => {
  assert.equal(P.resumenDeValores(["Dorado", "Plateado"]), "Dorado, Plateado");
  assert.equal(P.resumenDeValores(["Única"]), "Única");
  assert.equal(P.resumenDeValores([]), "Elige cuáles tienes");
});
