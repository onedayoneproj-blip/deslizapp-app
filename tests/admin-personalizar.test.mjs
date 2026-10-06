import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const P = await import("../lib/admin/personalizar.ts");
const { modoOpiniones } = await import("../lib/tienda/tema.ts");

const actual = { tema: { fuentes: { display: "Cormorant Garamond", body: "Manrope" }, colores: { bg: "#FFF8F5", ink: "#3A1F2B" } }, mensajes: { boton_comprar: "¡Lo quiero!" }, secciones: { chat: true } };
const productos = [
  { id: "p1", nombre: "A", slug: "a", activo: true, orden: null, opiniones: [], medios: [], creadoEn: "", actualizadoEn: "" },
  { id: "p2", nombre: "B", slug: "b", activo: true, orden: null, opiniones: [], medios: [], creadoEn: "", actualizadoEn: "" },
];

test("el borrador mezcla y un null borra la clave al guardar, sin tocar lo demás", () => {
  let b = P.cambiar(P.BORRADOR_VACIO, "mensajes", { boton_comprar: null, saludo_whatsapp: "¡Hola!" });
  b = P.cambiar(b, "secciones", { busqueda: false });
  b = P.cambiar(b, "tema", { colores: { ink: null } });
  const v = P.vistaPrevia(actual, b);
  assert.deepEqual(v.mensajes, { saludo_whatsapp: "¡Hola!" });
  assert.deepEqual(v.secciones, { chat: true, busqueda: false });
  assert.deepEqual(v.tema.colores, { bg: "#FFF8F5" });
  assert.deepEqual(v.tema.fuentes, actual.tema.fuentes, "no borra lo que no se tocó");
  const c = P.cambiosParaGuardar(b, productos);
  assert.equal(c.mensajes.boton_comprar, null, "el null viaja a la RPC");
  assert.equal(c.productos, undefined);
  assert.equal(P.hayCambios(b), true);
  assert.equal(P.hayCambios(P.BORRADOR_VACIO), false);
});

test("orden y opiniones van por producto; productos que ya no existen se ignoran", () => {
  const op = { usuario: "Ana", fuente: "Fragrantica", url: "https://x.example/a", texto: "Divino", estrellas: 5, traducida: false };
  const b = { ...P.BORRADOR_VACIO, orden: ["p2", "p1", "borrado"], opiniones: { p1: [op] } };
  assert.deepEqual(P.cambiosParaGuardar(b, productos).productos, [{ id: "p2", orden: 1 }, { id: "p1", orden: 2, opiniones: [op] }]);
});

test("problemas: cabecera insegura y opiniones inválidas no se guardan", () => {
  const malo = P.cambiar(P.BORRADOR_VACIO, "tema", { cabecera: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>' });
  assert.match(P.problemas(actual, malo)[0], /^Cabecera:/);
  const op = { ...P.BORRADOR_VACIO, opiniones: { p1: [{ usuario: "", fuente: "x", url: "http://inseguro", texto: "t", estrellas: 9, traducida: false }] } };
  assert.equal(P.problemas(actual, op).length, 1);
  assert.deepEqual(P.problemas(actual, P.cambiar(P.BORRADOR_VACIO, "mensajes", { boton_comprar: "Me lo llevo" })), []);
});

test("yaAplicado reconoce lo guardado aunque la base cambie el orden de las claves", () => {
  const b = P.cambiar(P.BORRADOR_VACIO, "secciones", { busqueda: false, chat: null });
  const guardada = { secciones: { busqueda: false }, mensajes: { boton_comprar: "¡Lo quiero!" }, tema: { colores: { ink: "#3A1F2B", bg: "#FFF8F5" }, fuentes: actual.tema.fuentes } };
  assert.equal(P.yaAplicado(guardada, b, productos), true);
  assert.equal(P.yaAplicado(actual, b, productos), false);
  const conOrden = { ...P.BORRADOR_VACIO, orden: ["p2", "p1"] };
  assert.equal(P.yaAplicado(actual, conOrden, productos), false);
  assert.equal(P.yaAplicado(actual, conOrden, [productos[1], productos[0]]), true);
});

test("contraste: avisa si el texto o los botones no llegan a AA", () => {
  assert.match(P.avisoContraste("ink", { bg: "#FFFFFF", ink: "#EEEEEE" }), /no llega a AA/);
  assert.equal(P.avisoContraste("ink", { bg: "#FFFFFF", ink: "#222222" }), null);
  assert.match(P.avisoContraste("accent", { accent: "#FFD0E0" }), /no llegan a AA/);
});

test("opiniones: encendidas, «Pronto» (opiniones_pronto) o apagadas, y lo viejo «pronto» se respeta", () => {
  for (const m of ["si", "pronto", "no"]) {
    const s = Object.fromEntries(Object.entries(P.seccionesOpiniones(m)).filter(([, v]) => v !== null));
    assert.equal(modoOpiniones(s), m);
  }
  assert.equal(modoOpiniones({ opiniones: "pronto" }), "pronto");
  assert.equal(modoOpiniones(undefined), "si");
});
