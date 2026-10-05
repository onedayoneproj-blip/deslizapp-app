// Salud del inventario, orden de "Por reponer", mensaje y candidatos de "Hacer espacio" (lib/inventario-catalogo.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { etiquetaSalud, saludDelInventario, textoSalud } from "../lib/inventario-catalogo.ts";

const p = (stock, activo = true) => ({ activo, stock });

test("salud: con stock (3+ o sin control), queda 1 o 2 y agotados; solo visibles", () => {
  const s = saludDelInventario([p(10), p(3), p(null), p(2), p(1), p(0), p(0), p(5, false), p(0, false), p(1, false)]);
  assert.deepEqual(s, { conStock: 3, quedan: 2, agotados: 2, disponibles: 5, total: 7 });
});

test("salud: textos de la dona", () => {
  assert.equal(textoSalud({ disponibles: 9, agotados: 6 }), "9 disponibles · 6 agotados");
  assert.equal(textoSalud({ disponibles: 9, agotados: 0 }), "9 disponibles");
  assert.equal(textoSalud({ disponibles: 1, agotados: 1 }), "1 disponible · 1 agotado");
  assert.equal(
    etiquetaSalud({ conStock: 0, quedan: 9, agotados: 6, disponibles: 9, total: 15 }),
    "9 productos disponibles: 9 por agotarse, 6 agotados. Ver tu inventario",
  );
  assert.equal(etiquetaSalud({ conStock: 4, quedan: 0, agotados: 0, disponibles: 4, total: 4 }), "4 productos disponibles. Ver tu inventario");
});

import { candidatosAEspacio, mensajeReposicion, porReponer, sinMovimiento, ventasPorProducto } from "../lib/inventario-catalogo.ts";

const AHORA = Date.parse("2026-10-03T15:00:00Z");
const dia = (n) => new Date(AHORA - n * 86_400_000).toISOString();
const prod = (id, stock, extra = {}) => ({ id, nombre: id, activo: true, stock, ...extra });
const pedido = (cuando, items, estado = "despachado") => ({ estado, despachadoEn: cuando, creadoEn: cuando, items });

test("ventas: solo pedidos despachados; última venta y unidades de los últimos 30 días", () => {
  const v = ventasPorProducto(
    [
      pedido(dia(2), [{ productoId: "a", cantidad: 2 }]),
      pedido(dia(40), [{ productoId: "a", cantidad: 5 }, { productoId: "b", cantidad: 1 }]),
      pedido(dia(1), [{ productoId: "c", cantidad: 9 }], "cancelado"),
    ],
    AHORA,
  );
  assert.deepEqual(v.get("a"), { ultima: dia(2), vendidas30: 2 });
  assert.deepEqual(v.get("b"), { ultima: dia(40), vendidas30: 0 });
  assert.equal(v.has("c"), false);
});

test("Por reponer: orden y preselección", () => {
  const productos = [
    prod("zakat", 0),
    prod("oxana", 0),
    prod("asad", 0),
    prod("nunca", 0),
    prod("oculto-agotado", 0, { activo: false }),
    prod("queda2", 2),
    prod("queda1", 1),
    prod("sano", 8),
    prod("sin-control", null),
    prod("oculto-queda1", 1, { activo: false }),
  ];
  const ventas = ventasPorProducto(
    [
      pedido(dia(10), [{ productoId: "oxana", cantidad: 2 }, { productoId: "zakat", cantidad: 1 }]),
      pedido(dia(3), [{ productoId: "oxana", cantidad: 1 }, { productoId: "asad", cantidad: 4 }]),
      pedido(dia(60), [{ productoId: "oculto-agotado", cantidad: 3 }]),
    ],
    AHORA,
  );
  const r = porReponer(productos, ventas);
  // más reciente primero: oxana y asad (día 3, desempate alfabético), luego zakat (día 10), luego el viejo
  assert.deepEqual(r.vendidos.map((l) => l.producto.id), ["asad", "oxana", "zakat", "oculto-agotado"]);
  assert.deepEqual(r.vendidos.map((l) => l.sugerida), [4, 3, 1, 1]); // vendido en 30 días, mínimo 1
  assert.ok(r.vendidos.every((l) => l.preseleccionado));
  assert.deepEqual(r.sinVentas.map((l) => l.producto.id), ["nunca"]);
  assert.equal(r.sinVentas[0].preseleccionado, false);
  assert.deepEqual(r.seAcaban.map((l) => l.producto.id), ["queda1", "queda2"]);
  assert.ok(r.seAcaban.every((l) => !l.preseleccionado));
});

test("mensaje de reposición", () => {
  assert.equal(
    mensajeReposicion([
      { cantidad: 2, nombre: "Oxana Black" },
      { cantidad: 1, nombre: "Orientica Pistache Absolu" },
    ]),
    "¡Hola! Para reponer:\n• 2 Oxana Black\n• 1 Orientica Pistache Absolu\n¿Me confirmas precio y cuándo llegan? ¡Gracias!",
  );
});

test("Hacer espacio: agotados marcados (menos los que se van a reponer) y sin moverse 30 días", () => {
  const productos = [
    prod("vendido", 0),
    prod("reponer", 0),
    prod("oculto", 0, { activo: false }),
    prod("se-mueve", 1),
    prod("quieto", 1),
    prod("quieto-viejo", 5),
    prod("sin-control", null),
  ];
  const ventas = ventasPorProducto(
    [
      pedido(dia(5), [{ productoId: "vendido", cantidad: 1 }, { productoId: "se-mueve", cantidad: 1 }]),
      pedido(dia(45), [{ productoId: "quieto-viejo", cantidad: 1 }]),
    ],
    AHORA,
  );
  const c = candidatosAEspacio(productos, ventas, AHORA, new Set(["reponer"]));
  assert.deepEqual(c.agotados.map((a) => [a.producto.id, a.marcado, a.porReponer]), [
    ["vendido", true, false],
    ["reponer", false, true],
  ]);
  assert.equal(c.agotados[0].ultimaVenta, dia(5));
  assert.deepEqual(c.sinMoverse.map((s) => s.producto.id), ["quieto", "quieto-viejo"]);
  assert.equal(c.sinMoverse[1].ultimaVenta, dia(45));
  assert.equal(sinMovimiento(productos, ventas, AHORA).length, 2);
});

import { seleccionInicial } from "../lib/inventario-catalogo.ts";

test("Por reponer: viene marcado lo vendido y agotado, con lo vendido en 30 días", () => {
  const ventas = ventasPorProducto([pedido(dia(3), [{ productoId: "a", cantidad: 3 }])], AHORA);
  const r = porReponer([prod("a", 0), prod("b", 0), prod("c", 1)], ventas);
  assert.deepEqual(seleccionInicial(r), { a: 3 });
});

import { lecturaInventario, porcentajeDe } from "../lib/inventario-catalogo.ts";

test("hoja de resumen: lectura del inventario y porcentajes", () => {
  assert.deepEqual(lecturaInventario({ quedan: 9, agotados: 6 }), { titulo: "9 se están acabando", linea: "6 ya se agotaron" });
  assert.deepEqual(lecturaInventario({ quedan: 1, agotados: 1 }), { titulo: "1 se está acabando", linea: "1 ya se agotó" });
  assert.deepEqual(lecturaInventario({ quedan: 0, agotados: 0 }), { titulo: "Todo con buen stock", linea: null });
  assert.equal(porcentajeDe(1, 3), 33);
  assert.equal(porcentajeDe(0, 0), 0);
});

// ---- Variantes (docs/12 §2; tablero Producto «Inventario») ----
import { lineasDeReposicion, situacionVariantes, stockParaSalud } from "../lib/inventario-catalogo.ts";

const camisa = (stocks) => ({
  id: "c",
  activo: true,
  stock: stocks.reduce((s, x) => s + (x ?? 0), 0),
  opciones: [
    { nombre: "Talla", valores: ["S", "M", "L"] },
    { nombre: "Color", valores: ["Arena"] },
  ],
  variantes: ["S", "M", "L"].map((t, i) => ({ id: `v${i}`, valores: { Talla: t, Color: "Arena" }, stock: stocks[i], activa: true })),
});

test("stockParaSalud: agotado si todas en 0, la menor si queda 1 o 2, si no la suma; sin control, null", () => {
  assert.equal(stockParaSalud(camisa([0, 0, 0])), 0);
  assert.equal(stockParaSalud(camisa([5, 2, 0])), 2);
  assert.equal(stockParaSalud(camisa([5, 4, 0])), 9);
  assert.equal(stockParaSalud(camisa([5, null, 0])), null);
  assert.equal(stockParaSalud({ activo: true, stock: 7 }), 7);
});

test("situacionVariantes: la agotada resaltada (femenino con Talla) y lo que queda", () => {
  assert.deepEqual(situacionVariantes(camisa([2, 0, 6])), { resaltado: "M · Arena agotada", resto: "quedan 2 de S · Arena" });
  assert.deepEqual(situacionVariantes(camisa([4, 5, 6])), { resaltado: null, resto: "15 en total" });
  assert.equal(situacionVariantes({ activo: true, stock: 3 }), null);
});

test("lineasDeReposicion: una fila por variante agotada o con 1 o 2 (agotadas primero); sin variantes, una por producto", () => {
  const filas = lineasDeReposicion([
    { producto: camisa([2, 0, 6]), sugerida: 3, preseleccionado: true },
    { producto: { id: "x", activo: true, stock: 0 }, sugerida: 2, preseleccionado: true },
  ]);
  assert.deepEqual(
    filas.map((f) => [f.clave, f.varianteTexto, f.stock, f.sugerida, f.preseleccionado]),
    [
      ["c:v1", "M · Arena", 0, 1, true],
      ["c:v0", "S · Arena", 2, 1, false],
      ["x", null, 0, 2, true],
    ],
  );
});


test("agotadosVisibles usa la regla común: todas las variantes activas en cero; excluye ocultos y sin control", async () => {
  const { agotadosVisibles } = await import("../lib/inventario-catalogo.ts");
  const base = { nombre: "Producto", stock: 0, activo: true };
  const variantes = stock => ({ ...base, stock: stock.reduce((n, x) => n + (x ?? 0), 0), opciones: [{ nombre: "Talla", valores: ["S", "M"] }], variantes: stock.map((x, i) => ({ id: String(i), valores: { Talla: String(i) }, stock: x, activa: true })) });
  const elegible = { ...base, id: "base" };
  const todasCero = { ...variantes([0, 0]), id: "todas-cero" };
  const disponible = { ...variantes([0, 4]), id: "con-stock" };
  const sinControl = { ...variantes([0, null]), id: "sin-control" };
  const oculto = { ...base, id: "oculto", activo: false };
  assert.deepEqual(agotadosVisibles([elegible, todasCero, disponible, sinControl, oculto]).map(p => p.id), ["base", "todas-cero"]);
});


test("ocultarAgotadosElegibles revalida tienda y stock y continúa si una actualización falla", async () => {
  const { ocultarAgotadosElegibles } = await import("../lib/inventario-catalogo.ts");
  const items = new Map([
    ["ok", { id: "ok", nombre: "OK", activo: true, stock: 0 }],
    ["repuesto", { id: "repuesto", nombre: "Repuesto", activo: true, stock: 0 }],
    ["fallo", { id: "fallo", nombre: "Fallo", activo: true, stock: 0 }],
  ]);
  const lecturas = [], cambios = [];
  const resultado = await ocultarAgotadosElegibles("tienda-fixture", ["ok", "repuesto", "fallo"], async (tienda, id) => {
    lecturas.push([tienda, id]);
    return id === "repuesto" ? { ...items.get(id), stock: 4 } : items.get(id);
  }, async (tienda, id, cambio) => {
    cambios.push([tienda, id, cambio]);
    if (id === "fallo") throw new Error("fallo de red");
  });
  assert.deepEqual(resultado.ocultados, ["ok"]);
  assert.deepEqual(resultado.yaNoElegibles, ["repuesto"]);
  assert.deepEqual(resultado.fallidos.map(f => f.id), ["fallo"]);
  assert.deepEqual(lecturas, [["tienda-fixture", "ok"], ["tienda-fixture", "repuesto"], ["tienda-fixture", "fallo"]]);
  assert.deepEqual(cambios, [["tienda-fixture", "ok", { activo: false }], ["tienda-fixture", "fallo", { activo: false }]]);
  // La acción de reintento recibe solo los pendientes; los ya ocultados y los repuestos no se vuelven a enviar.
  const reintentos = [];
  const reintento = await ocultarAgotadosElegibles("tienda-fixture", resultado.fallidos.map(f => f.id), async (tienda, id) => items.get(id), async (tienda, id, cambio) => reintentos.push([tienda, id, cambio]));
  assert.deepEqual(reintentos, [["tienda-fixture", "fallo", { activo: false }]]);
  assert.deepEqual(reintento.ocultados, ["fallo"]);
});
