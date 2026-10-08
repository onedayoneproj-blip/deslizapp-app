// Hoja de producto rediseñada: cuándo se habilita «Publicar» y los resúmenes de las pastillas y de las filas.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const H = await import("../lib/hoja-producto.ts");

test("«Publicar» pide foto, nombre y un precio mayor que cero", () => {
  const ok = { nombre: "Aros dorados", precio: "1850", fotos: 1 };
  assert.equal(H.puedePublicar(ok), true);
  assert.equal(H.puedePublicar({ ...ok, fotos: 0 }), false);
  assert.equal(H.puedePublicar({ ...ok, nombre: "   " }), false);
  assert.equal(H.puedePublicar({ ...ok, precio: "" }), false);
  assert.equal(H.puedePublicar({ ...ok, precio: "0" }), false);
  assert.equal(H.puedePublicar({ ...ok, preparando: true }), false);
});

test("las pastillas de «Cosas que cambian»", () => {
  assert.deepEqual(H.pastillasDeOpciones([{ nombre: "Color", valores: ["Negro", "Arena"] }, { nombre: "Tamaño", valores: ["S", "M", "L"] }]), ["Color · 2", "Tamaño · 3"]);
  assert.deepEqual(H.pastillasDeOpciones([]), []);
});

test("el stock con presentaciones", () => {
  assert.equal(H.resumenStockPresentaciones(6, 18), "6 presentaciones · 18 en total");
  assert.equal(H.resumenStockPresentaciones(1, 3), "1 presentación · 3 en total");
});

test("el resumen de la descripción corta en una palabra entera", () => {
  assert.equal(H.resumenDescripcion("   "), null);
  assert.equal(H.resumenDescripcion("Corta"), "Corta");
  assert.equal(H.resumenDescripcion("Aros dorados con baño de oro de 18 quilates, livianos y cómodos", 30), "Aros dorados con baño de oro…");
});

test("la fila Por encargo y el contador de fotos", () => {
  assert.equal(H.resumenEncargo(false, "Llega en 7 días"), "Se puede pedir aunque no haya.");
  assert.equal(H.resumenEncargo(true, ""), "Se puede pedir aunque no haya.");
  assert.equal(H.resumenEncargo(true, " Llega en 7 días "), "Llega en 7 días");
  assert.equal(H.contadorMedios(1, 10), "1 / 10");
});

// «Cómo se ve» = el reel real del comprador: el borrador convertido a `ProductoPublico`.
test("vista previa: el borrador se ve como el catálogo lo lee (precio, presentaciones, agotado y por encargo)", async () => {
  await import("./cargar-ts.mjs");
  const V = await import("../lib/vista-previa-producto.ts");
  const base = { nombre: " Aros de luna ", precio: 950, medios: [{ tipo: "foto", url: "u1", retocada: false }], detalles: { descripcion: "Plata" }, opciones: [], presentaciones: [], stock: 4, porEncargo: false, encargoTexto: "", categoria: "Aretes", rubro: "accesorios", fichaUrl: null };
  const simple = V.productoPublicoDeBorrador(base);
  assert.equal(simple.nombre, "Aros de luna");
  assert.equal(simple.disponibilidad, "hay");
  assert.deepEqual([simple.likes, simple.opiniones.length, simple.promo, simple.variantes.length], [0, 0, null, 0]);
  assert.equal(V.productoPublicoDeBorrador({ ...base, stock: 2 }).quedan, 2);
  assert.equal(V.productoPublicoDeBorrador({ ...base, stock: 0 }).disponibilidad, "agotado");
  const encargo = V.productoPublicoDeBorrador({ ...base, stock: 0, porEncargo: true, encargoTexto: " Llega en 7 días " });
  assert.deepEqual([encargo.disponibilidad, encargo.encargoTexto], ["por_encargo", "Llega en 7 días"]);
  const color = { nombre: "Color", valores: ["Plateado", "Dorado", "Negro"] };
  const pres = [
    { valores: { Color: "Plateado" }, stock: 5, precio: 1200, activa: true },
    { valores: { Color: "Dorado" }, stock: 0, precio: null, activa: true },
    { valores: { Color: "Negro" }, stock: 9, precio: null, activa: false },
  ];
  const con = V.productoPublicoDeBorrador({ ...base, opciones: [color], presentaciones: pres, stock: 0 });
  assert.equal(con.variantes.length, 2, "las ocultas no las ve el comprador");
  assert.equal(con.variantes[0].precio, 1200);
  assert.equal(con.variantes[1].precio, 950, "sin precio propio, el del producto");
  assert.equal(con.variantes[1].disponibilidad, "agotado");
  assert.equal(con.disponibilidad, "hay", "con 5 en una, el producto no está agotado");
  assert.equal(V.productoPublicoDeBorrador({ ...base, opciones: [color], presentaciones: pres.map((p) => ({ ...p, stock: 0 })) }).disponibilidad, "agotado");
});
