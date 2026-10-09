// Pruebas de compartir en historia (lib/historia.ts): qué se muestra, precio, presentaciones y enlace.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const H = await import("../lib/historia.ts");

const base = {
  id: "p1", tiendaId: "t1", nombre: "Majestic Oud", precio: 3200, fotos: ["https://x/a.jpg"], fotoRetocada: false, categoria: null, activo: true,
  destacado: false, stock: 5, likes: 0, creadoEn: "", actualizadoEn: "", slug: "majestic-oud", tipo: "producto", medios: [], detalles: {},
  opciones: [], porEncargo: false, encargoTexto: null,
};
const vari = (valores, stock = 3, precio = null) => ({ id: JSON.stringify(valores), valores, stock, precio, activa: true, orden: 0 });
const perfume = { ...base, opciones: [{ nombre: "Tamaño", valores: ["30 ml", "50 ml", "100 ml"] }], variantes: [vari({ Tamaño: "30 ml" }, 3, 1800), vari({ Tamaño: "50 ml" }, 3, 2500), vari({ Tamaño: "100 ml" }, 3, 3200)] };
const ropa = {
  ...base, nombre: "Camisa de lino", precio: 1500,
  opciones: [{ nombre: "Color", valores: ["Negro", "Arena", "Raro"] }, { nombre: "Talla", valores: ["S", "M"] }],
  variantes: ["Negro", "Arena", "Raro"].flatMap((c) => ["S", "M"].map((t) => vari({ Color: c, Talla: t }))),
};
const promo = (extra = {}) => ({ id: "pr", tiendaId: "t1", tipo: "producto", productoId: "p1", valorPorcentaje: 20, pausada: false, estado: "activa", ...extra });

test("sin presentaciones ni promo: precio normal", () => {
  assert.deepEqual(H.precioHistoria(base, []), { desde: false, precio: 3200, antes: null });
});

test("con promo vigente: precio de promo y el normal tachado; con promo vencida, el normal", () => {
  const ahora = new Date("2026-10-08T12:00:00Z");
  const vigente = promo({ nombre: "P", codigo: null, coleccion: null, fechaInicio: "2026-10-01", fechaFin: "2026-10-31", limiteUsos: null, clienteId: null });
  assert.deepEqual(H.precioHistoria(base, [vigente], ahora), { desde: false, precio: 2560, antes: 3200 });
  const vencida = { ...vigente, fechaInicio: "2026-09-01", fechaFin: "2026-09-30" };
  assert.deepEqual(H.precioHistoria(base, [vencida], ahora), { desde: false, precio: 3200, antes: null });
});

test("presentaciones de precio distinto: «Desde» el más bajo", () => {
  assert.deepEqual(H.precioHistoria(perfume, []), { desde: true, precio: 1800, antes: null });
});

test("presentaciones del mismo precio no dicen «Desde»", () => {
  assert.equal(H.precioHistoria(ropa, []).desde, false);
});

test("colores conocidos son punto con su color, el resto pastilla; los desconocidos también pastilla", () => {
  const r = H.presentacionesHistoria(ropa);
  const colores = r.elementos.filter((e) => e.color).map((e) => e.texto);
  assert.deepEqual(colores, ["Negro", "Arena"]);
  assert.deepEqual(r.elementos.filter((e) => !e.color).map((e) => e.texto), ["Raro", "S", "M"]);
  assert.equal(r.mas, 0);
});

test("más de las que caben: se cortan y suma «+N»", () => {
  const r = H.presentacionesHistoria(ropa, 3);
  assert.equal(r.elementos.length, 3);
  assert.equal(r.mas, 2);
});

test("no anuncia presentaciones agotadas ni ocultas", () => {
  const p = { ...perfume, variantes: [vari({ Tamaño: "30 ml" }, 0), { ...vari({ Tamaño: "50 ml" }), activa: false }, vari({ Tamaño: "100 ml" })] };
  assert.deepEqual(H.presentacionesHistoria(p).elementos.map((e) => e.texto), ["100 ml"]);
});

test("sin presentaciones: nada que mostrar", () => {
  assert.equal(H.presentacionesHistoria(base), null);
  assert.equal(H.tienePresentaciones(base), false);
  assert.equal(H.tienePresentaciones(perfume), true);
});

test("los interruptores deciden qué sale", () => {
  const todo = H.datosHistoria(perfume, [], { precio: true, presentaciones: true, fotoTienda: true });
  assert.ok(todo.precio && todo.presentaciones && todo.fotoTienda);
  const nada = H.datosHistoria(perfume, [], { precio: false, presentaciones: false, fotoTienda: false });
  assert.equal(nada.precio, null);
  assert.equal(nada.presentaciones, null);
  assert.equal(nada.fotoTienda, false);
  assert.equal(nada.nombre, "Majestic Oud");
});

test("enlace directo al producto con ?ref=historia", () => {
  assert.equal(H.enlaceProductoHistoria("https://deslizapp-app.vercel.app/tienda/esencias-michel", "majestic-oud"), "https://deslizapp-app.vercel.app/tienda/esencias-michel?ref=historia#p/majestic-oud");
  assert.equal(H.enlaceProductoHistoria("https://a.com/c?x=1", "s"), "https://a.com/c?x=1&ref=historia#p/s");
  assert.equal(H.enlaceProductoHistoria("http://a.com", "s"), null);
  assert.equal(H.enlaceProductoHistoria(null, "s"), null);
});

test("dirección corta y texto de WhatsApp", () => {
  assert.equal(H.direccionCorta("https://www.esenciasmichel.com/tienda/x/?a=1#z"), "esenciasmichel.com/tienda/x");
  assert.equal(H.direccionCorta("https://esenciasmichel.com/"), "esenciasmichel.com");
  assert.equal(H.textoWhatsAppHistoria("Majestic Oud", "https://a.com/x"), "Majestic Oud · Pídelo aquí: https://a.com/x");
});

test("el catálogo abre solo si está publicado, activo y con enlace", () => {
  const ok = { catalogoEstado: "publicado", estado: "activa", urlCatalogo: "https://a.com/x" };
  assert.equal(H.catalogoAbre(ok), true);
  assert.equal(H.catalogoAbre({ ...ok, catalogoEstado: "revisar" }), false);
  assert.equal(H.catalogoAbre({ ...ok, estado: "pausada" }), false);
  assert.equal(H.catalogoAbre({ ...ok, urlCatalogo: null }), false);
});

test("dirección en líneas: dominio completo y ruta aparte, sin https", () => {
  assert.deepEqual(H.direccionEnLineas("https://deslizapp-app.vercel.app/tienda/esencias-michel"), { dominio: "deslizapp-app.vercel.app", ruta: "/tienda/esencias-michel" });
  assert.deepEqual(H.direccionEnLineas("https://www.esenciasmichel.com/"), { dominio: "esenciasmichel.com", ruta: null });
  assert.equal(H.direccionEnLineas("http://x.com"), null);
  assert.equal(H.direccionEnLineas(null), null);
});

test("«Desde» ignora las presentaciones agotadas mientras haya otras que se puedan pedir", () => {
  const p = { ...perfume, variantes: [vari({ Tamaño: "30 ml" }, 0, 1800), vari({ Tamaño: "50 ml" }, 3, 2500), vari({ Tamaño: "100 ml" }, 3, 3200)] };
  assert.deepEqual(H.precioHistoria(p, []), { desde: true, precio: 2500, antes: null });
  // todas agotadas: el más bajo de todas
  const todas = { ...perfume, variantes: perfume.variantes.map((v) => ({ ...v, stock: 0 })) };
  assert.deepEqual(H.precioHistoria(todas, []), { desde: true, precio: 1800, antes: null });
});

test("agotado para la tarjeta: sin stock en todo, no por encargo", () => {
  assert.equal(H.productoAgotadoParaHistoria({ ...base, stock: 0 }), true);
  assert.equal(H.productoAgotadoParaHistoria(base), false);
  assert.equal(H.productoAgotadoParaHistoria({ ...base, stock: null }), false);
  assert.equal(H.productoAgotadoParaHistoria({ ...base, stock: 0, porEncargo: true }), false);
  const todas = { ...perfume, variantes: perfume.variantes.map((v) => ({ ...v, stock: 0 })) };
  assert.equal(H.productoAgotadoParaHistoria(todas), true);
  assert.equal(H.productoAgotadoParaHistoria({ ...todas, porEncargo: true }), false);
  assert.equal(H.productoAgotadoParaHistoria({ ...perfume, variantes: [vari({ Tamaño: "30 ml" }, 0), vari({ Tamaño: "50 ml" }, 2)] }), false);
  assert.equal(H.productoAgotadoParaHistoria({ ...perfume, variantes: [vari({ Tamaño: "30 ml" }, 0), { ...vari({ Tamaño: "50 ml" }, 4), activa: false }] }), true);
});

test("tarjeta de agotado: etiqueta en lugar del precio y pie «Avísame cuando vuelva»; con stock, igual que antes", () => {
  const opc = { precio: true, presentaciones: true, fotoTienda: true };
  const agotado = H.datosHistoria({ ...base, stock: 0 }, [], opc);
  assert.equal(agotado.precio, null);
  assert.equal(agotado.etiquetaAgotado, true);
  assert.equal(agotado.agotado, true);
  assert.equal(H.textoPieHistoria(agotado.agotado), "Aaah… se lo llevaron. Escríbeme y te lo guardo la próxima");
  const conStock = H.datosHistoria(base, [], opc);
  assert.deepEqual(conStock.precio, { desde: false, precio: 3200, antes: null });
  assert.equal(conStock.etiquetaAgotado, false);
  assert.equal(H.textoPieHistoria(conStock.agotado), "Pídelo en mi catálogo");
  const sinPrecio = H.datosHistoria({ ...base, stock: 0 }, [], { ...opc, precio: false });
  assert.equal(sinPrecio.etiquetaAgotado, false);
  assert.equal(sinPrecio.agotado, true);
});
