import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const P = await import("../lib/tienda/presentaciones.ts");
const { catalogoPublicoDeDB } = await import("../lib/data/catalogo.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { lineaDe } = await import("../lib/tienda/carrito.ts");

const cat = (slug) => catalogoPublicoDeDB(construirDesdeSeed(), slug, new Date());
const pantalon = () => cat("lino-y-algodon").productos.find((p) => p.slug === "pantalon-de-algodon");
const camisa = () => cat("lino-y-algodon").productos.find((p) => p.slug === "camisa-de-lino");
const oud = () => cat("esencias-michel").productos.find((p) => p.slug === "majestic-oud");
const sinNada = () => cat("esencias-michel").productos.find((p) => p.slug === "kiara-pink" || p.opciones.length === 0);

test("el catálogo público de la demo trae la foto de cada color", () => {
  const p = pantalon();
  assert.equal(Object.keys(p.fotosPorValor.Color).length, 3);
  assert.deepEqual(camisa().fotosPorValor, {});
});

test("sin presentaciones nada de esto aplica: el producto se comporta como hoy", () => {
  const p = sinNada();
  assert.equal(P.tienePresentaciones(p), false);
  assert.equal(P.desde(p), null);
  assert.deepEqual(P.combinaciones(p.opciones), []);
  assert.equal(P.eleccionPorDefecto(p), null);
  assert.equal(P.agotadoPara(p, null), p.disponibilidad === "agotado");
  assert.equal(P.fotoDeEleccion(p, { Talla: "M" }), null);
});

test("cada celda: hay, quedan pocas, agotada o no existe; y el precio propio", () => {
  const p = pantalon();
  const l = P.celda(p, { Talla: "L", Color: "Negro" });
  assert.equal(l.estado, "agotada");
  assert.equal(P.sinStock(l), true);
  const s = P.celda(p, { Talla: "S", Color: "Verde" });
  assert.equal(s.estado, "quedan");
  assert.equal(s.quedan, 2);
  const m = P.celda(p, { Talla: "M", Color: "Arena" });
  assert.equal(m.estado, "hay");
  assert.equal(m.precio, 2300);
  assert.equal(P.celda(p, { Talla: "XL", Color: "Negro" }).precio, 2900, "la XL cuesta más");
  assert.equal(P.celda(p, { Talla: "XXL", Color: "Negro" }).estado, "no_existe");
});

test("la elección por defecto: la primera que se puede pedir", () => {
  const p = pantalon();
  assert.deepEqual(P.eleccionPorDefecto(p), { Color: "Negro", Talla: "S" });
  const todasAgotadas = { ...p, variantes: p.variantes.map((v) => ({ ...v, disponibilidad: "agotado", quedan: null })) };
  assert.deepEqual(P.eleccionPorDefecto(todasAgotadas), { Color: "Negro", Talla: "S" }, "si no queda ninguna, la primera");
  const primeraAgotada = { ...p, variantes: p.variantes.map((v, i) => (i === 0 ? { ...v, disponibilidad: "agotado", quedan: null } : v)) };
  assert.notDeepEqual(P.eleccionPorDefecto(primeraAgotada), P.eleccionPorDefecto(p));
});

test("los ejes de la cuadrícula: el color en filas; un solo eje es lista", () => {
  const g = P.ejesDeCuadricula(pantalon().opciones);
  assert.equal(g.filas.nombre, "Color");
  assert.equal(g.columnas.nombre, "Talla");
  assert.equal(P.ejesDeCuadricula(oud().opciones).columnas, null);
  assert.equal(P.combinaciones(pantalon().opciones).length, 12);
  assert.equal(P.combinaciones(oud().opciones).length, 3);
});

test("«Desde»: solo cambia si los precios son distintos; ignora las agotadas", () => {
  const p = pantalon();
  assert.deepEqual(P.desde(p), { precio: 2300, varia: true });
  assert.deepEqual(P.desde(oud()), { precio: 1200, varia: true });
  const igual = { variantes: p.variantes.map((v) => ({ ...v, precio: 2300, precioPromo: null })) };
  assert.equal(P.desde(igual).varia, false, "si todas valen lo mismo, no cambia nada");
  const barataAgotada = { variantes: [{ ...p.variantes[0], precio: 100, precioPromo: null, disponibilidad: "agotado" }, { ...p.variantes[1], precio: 500, precioPromo: null, disponibilidad: "hay" }] };
  assert.equal(P.desde(barataAgotada).precio, 500);
  const conPromo = { variantes: [{ ...p.variantes[0], precio: 1000, precioPromo: 800 }, { ...p.variantes[1], precio: 1200, precioPromo: 900 }] };
  assert.equal(P.desde(conPromo).precio, 800, "con promo cuenta el precio con descuento");
});

test("la foto sigue al color: con foto asignada se mueve, sin ella no", () => {
  const p = pantalon();
  const arena = p.fotosPorValor.Color.Arena;
  assert.equal(P.fotoDeEleccion(p, { Talla: "M", Color: "Arena" }), arena);
  assert.equal(P.indiceDeFoto(p, { Talla: "M", Color: "Arena" }), p.medios.findIndex((m) => m.url === arena));
  const sinFotoVerde = { ...p, fotosPorValor: { Color: { Negro: p.fotosPorValor.Color.Negro } } };
  assert.equal(P.fotoDeEleccion(sinFotoVerde, { Talla: "M", Color: "Verde" }), null);
  assert.equal(P.indiceDeFoto(sinFotoVerde, { Talla: "M", Color: "Verde" }), null);
  assert.equal(P.fotoDeEleccion(p, null), null);
  const huérfana = { ...p, fotosPorValor: { Color: { Negro: "https://otra" } } };
  assert.equal(P.fotoDeEleccion(huérfana, { Color: "Negro", Talla: "S" }), null, "una foto que ya no es del producto no se usa");
  assert.equal(P.fotoDeEleccion({ ...p, fotosPorValor: undefined }, { Color: "Negro", Talla: "S" }), null);
});

test("el corazón: sin elegir abre la hoja; elegida agrega; agotada avisa; ya en el pedido, quita", () => {
  const p = pantalon();
  const nada = () => false;
  assert.deepEqual(P.accionCorazon(p, null, nada), { tipo: "hoja" });
  const m = P.celda(p, { Talla: "M", Color: "Arena" }).variante;
  assert.deepEqual(P.accionCorazon(p, { Talla: "M", Color: "Arena" }, nada), { tipo: "agregar", varianteId: m.id });
  assert.deepEqual(P.accionCorazon(p, { Talla: "M", Color: "Arena" }, (id) => id === m.id), { tipo: "quitar", varianteId: m.id });
  const agotada = P.celda(p, { Talla: "L", Color: "Negro" }).variante;
  assert.deepEqual(P.accionCorazon(p, { Talla: "L", Color: "Negro" }, nada), { tipo: "avisar", varianteId: agotada.id });
  assert.deepEqual(P.accionCorazon(p, { Talla: "XXL", Color: "Negro" }, nada), { tipo: "avisar", varianteId: null });
});

test("agotado «solo para esa combinación»; todas agotadas = Agotado como hoy", () => {
  const p = pantalon();
  assert.equal(P.agotadoPara(p, null), false);
  assert.equal(P.agotadoPara(p, { Talla: "L", Color: "Negro" }), true);
  assert.equal(P.agotadoPara(p, { Talla: "M", Color: "Negro" }), false);
  assert.equal(P.disponibilidadPara(p, { Talla: "S", Color: "Verde" }), "quedan");
  const todas = { ...p, disponibilidad: "agotado", variantes: p.variantes.map((v) => ({ ...v, disponibilidad: "agotado" })) };
  assert.equal(P.agotadoPara(todas, null), true);
});

test("textos: ejes, título de la hoja, colores y etiquetas accesibles", () => {
  assert.equal(P.textoEjes(pantalon().opciones), "4 tallas · 3 colores");
  assert.equal(P.textoEjes(oud().opciones), "3 tamaños");
  assert.equal(P.textoEjes([{ nombre: "Talla", valores: ["Única"] }]), "1 talla");
  assert.equal(P.tituloHoja([{ nombre: "Talla", valores: ["S"] }]), "Elige tu talla");
  assert.equal(P.tituloHoja(oud().opciones), "Elige tu tamaño");
  assert.equal(P.tituloHoja(pantalon().opciones), "Elige la tuya");
  assert.equal(P.tituloHoja([{ nombre: "Sabor", valores: ["a"] }]), "Elige la tuya");
  assert.equal(P.coloresDelEje(pantalon().opciones).length, 3);
  assert.deepEqual(P.coloresDelEje([{ nombre: "Color", valores: ["Verde menta fresco"] }]), [], "un color que no se conoce no se dibuja");
  assert.deepEqual(P.coloresDelEje(oud().opciones), []);
  assert.equal(P.textoEleccion(pantalon().opciones, { Talla: "M", Color: "Negro" }), "M · Negro");
  const p = pantalon();
  const e = { Talla: "S", Color: "Verde" };
  assert.equal(P.etiquetaCelda(p.opciones, e, P.celda(p, e), p.precio), "Talla S, color Verde, quedan 2");
  const l = { Talla: "L", Color: "Negro" };
  assert.equal(P.etiquetaCelda(p.opciones, l, P.celda(p, l), p.precio), "Talla L, color Negro, agotada");
  const xl = { Talla: "XL", Color: "Negro" };
  assert.match(P.etiquetaCelda(p.opciones, xl, P.celda(p, xl), p.precio), /RD\$2,900/);
  assert.equal(P.estadoDeEleccion(P.celda(p, e)), "Quedan 2");
});

test("el pedido: la línea lleva la presentación y la foto del color elegido", () => {
  const p = pantalon();
  const v = P.celda(p, { Talla: "M", Color: "Arena" }).variante;
  const l = lineaDe(p, v.id);
  assert.equal(l.varianteTexto, "Talla M · Arena");
  assert.equal(l.foto, p.fotosPorValor.Color.Arena);
  const sinFoto = lineaDe({ ...p, fotosPorValor: {} }, v.id);
  assert.equal(sinFoto.foto, p.medios.find((m) => m.tipo === "foto").url, "sin foto de color, la del producto");
  assert.notEqual(lineaDe(p, P.celda(p, { Talla: "S", Color: "Negro" }).variante.id).foto, l.foto, "la misma camisa en dos colores, dos fotos");
  const sinVariante = lineaDe(sinNada(), null);
  assert.equal(sinVariante.varianteTexto, null);
});
