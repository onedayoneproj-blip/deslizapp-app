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

test("agregar una suelta: suma el valor al eje, no duplica y respeta los límites", () => {
  const lista = P.crearTodas([TALLA, COLOR]);
  const r = P.agregarSuelta([TALLA, COLOR], lista, { Talla: "XXL", Color: "Negro" });
  assert.equal(r.presentaciones.length, 13);
  assert.deepEqual(r.opciones[0].valores, ["S", "M", "L", "XL", "XXL"]);
  assert.throws(() => P.agregarSuelta([TALLA, COLOR], lista, { Talla: "S", Color: "Negro" }), /ya existe/);
  assert.throws(() => P.agregarSuelta([TALLA, COLOR], lista, { Talla: "S", Color: "" }), /Elige/);
  const oculta = lista.map((p, i) => (i === 0 ? { ...p, activa: false } : p));
  assert.throws(() => P.agregarSuelta([TALLA, COLOR], oculta, { Talla: "S", Color: "Negro" }), /ya existe/, "una oculta tampoco se duplica");
  const llena = { nombre: "Talla", valores: Array.from({ length: 12 }, (_, i) => `T${i}`) };
  assert.throws(() => P.agregarSuelta([llena], P.crearTodas([llena]), { Talla: "nueva" }), /12/);
});

test("cambiar qué varía: agregar un eje nuevo deja «Sin color» y conserva stock y precio", () => {
  const antes = P.crearTodas([TALLA]).map((p, i) => ({ ...p, stock: i + 1, precio: p.valores.Talla === "XL" ? 2900 : null }));
  const r = P.cambiarQueVaria(antes, [TALLA, { nombre: "Color", valores: ["Negro", "Arena"] }]);
  assert.equal(r.presentaciones.length, 4, "nada se duplica");
  assert.ok(r.presentaciones.every((p) => p.valores.Color === "Sin color"));
  assert.deepEqual(r.opciones[1].valores, ["Negro", "Arena", "Sin color"]);
  assert.deepEqual(r.presentaciones.map((p) => p.stock), [1, 2, 3, 4]);
  assert.equal(r.presentaciones[3].precio, 2900);
  assert.match(r.aviso, /Sin color/);
  assert.doesNotMatch(r.aviso, /[!¡]/);
});

test("cambiar qué varía: quitar un eje junta las iguales y suma su stock; un valor que sale, se va", () => {
  const antes = P.crearTodas([TALLA, COLOR]).map((p) => ({ ...p, stock: 1 }));
  const r = P.cambiarQueVaria(antes, [TALLA]);
  assert.equal(r.presentaciones.length, 4);
  assert.ok(r.presentaciones.every((p) => p.stock === 3), "3 colores × 1 = 3 por talla");
  assert.match(r.aviso, /sumamos su stock/);
  const sin = P.cambiarQueVaria(antes, [{ nombre: "Talla", valores: ["S", "M"] }, COLOR]);
  assert.equal(sin.presentaciones.length, 6);
  assert.match(sin.aviso, /se van/);
  assert.equal(P.cuantasSeVan(antes, [{ nombre: "Talla", valores: ["S", "M"] }, COLOR]), 6);
  assert.throws(() => P.cambiarQueVaria(antes, []), /Elige/);
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
  const lista = P.cambiarQueVaria(P.crearTodas([TALLA]), [TALLA, { nombre: "Color", valores: ["Negro"] }]).presentaciones;
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
  assert.deepEqual(P.estadoDe({ valores: {}, stock: 0, precio: null, activa: true }), { estado: "agotada", texto: "Agotada" });
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
