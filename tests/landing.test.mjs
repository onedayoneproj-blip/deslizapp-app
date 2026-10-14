// Landing de deslizapp.com (lib/landing): un solo pedido en toda la historia, el mensaje real, la tabla de escenas y los CTA.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const demo = await import("../lib/landing/pedido-demo.ts");
const { PASOS, CAPITULOS, estadoPaso, indicePaso } = await import("../lib/landing/pasos.ts");
const dbDemo = await import("../lib/landing/db-demo.ts");
const enlaces = await import("../lib/landing/enlaces.ts");
const { codigoPedidoValido } = await import("../lib/tienda/imagen-pedido.ts");

test("el pedido de la demo: la gorra pasa sin like; termo y tote, RD$1,500, con un código con el formato real", () => {
  assert.equal(demo.PRODUCTOS_DEMO.length, 3);
  assert.deepEqual(demo.PEDIDO_DEMO.map((p) => p.id), ["termo", "tote"]);
  assert.equal(demo.TOTAL_DEMO, 1500);
  assert.ok(codigoPedidoValido(demo.CODIGO_DEMO));
  assert.equal(demo.pesos(demo.TOTAL_DEMO), "RD$1,500");
});

test("el mensaje de WhatsApp sale de mensajePedido, con los productos, el total y el enlace", () => {
  const m = demo.MENSAJE_DEMO;
  assert.match(m, /^¡Hola La Vuelta! Vi tu catálogo y quiero:/);
  for (const p of demo.PEDIDO_DEMO) assert.ok(m.includes(`• ${p.nombre} (${demo.pesos(p.precio)})`), p.nombre);
  assert.ok(!m.includes("Gorra verde"), "la gorra no va en el pedido");
  assert.ok(m.includes("Total: RD$1,500"));
  assert.ok(m.includes(`Mi pedido #${demo.CODIGO_DEMO}:\nhttps://deslizapp.com/pedido/${demo.CODIGO_DEMO}`));
});

test("lo que ve la compradora usa estadoComprador", () => {
  assert.equal(demo.ESTADO_ENVIADO.titulo, "Le llegó a La Vuelta");
  assert.equal(demo.ESTADO_ENVIADO.linea, "2 productos · te responde por WhatsApp");
  assert.equal(demo.ESTADO_DESPACHADO.titulo, "Va en camino");
  assert.equal(demo.VISTA_PREVIA_DEMO.descripcion, "2 productos · RD$1,500");
});

test("los pasos siguen el guion: compradora, luego tienda, y todos los capítulos", () => {
  assert.deepEqual(
    PASOS.map((p) => p.id),
    ["hola", "pasa", "aaah-termo", "aaah-tote", "bolsa", "whatsapp", "seguimiento", "cambio", "aviso", "chat-tienda", "eres-tienda", "registrar", "pedidos", "confirmar", "despachar"],
  );
  const primeroTienda = PASOS.findIndex((p) => p.telefono === "tienda");
  assert.ok(PASOS.slice(0, primeroTienda).every((p) => p.lado === "compras" && p.telefono === "compradora"));
  assert.ok(PASOS.slice(primeroTienda).every((p) => p.lado === "tienda" && p.telefono === "tienda"));
  assert.deepEqual([...new Set(PASOS.map((p) => p.capitulo))], Array.from({ length: CAPITULOS }, (_, i) => i + 1));
  for (const p of PASOS) assert.ok(p.burbuja.texto.trim() && p.duracion > 0, p.id);
  // El ♥ nace en el «aaah» del termo y desde ahí siempre tiene dónde estar.
  const nace = PASOS.findIndex((p) => p.naceEn);
  assert.equal(PASOS[nace].id, "aaah-termo");
  assert.ok(PASOS.slice(0, nace).every((p) => p.ancla === null));
  assert.ok(PASOS.slice(nace).every((p) => p.ancla !== null));
});

test("la bolsa cuenta con los pasos y retrocede igual", () => {
  assert.equal(estadoPaso(0).bolsa, 0);
  assert.equal(estadoPaso(indicePaso("pasa")).bolsa, 0, "la gorra pasa sin like");
  assert.equal(estadoPaso(indicePaso("aaah-termo")).total, 950);
  assert.equal(estadoPaso(indicePaso("aaah-tote")).total, 1500);
  assert.equal(estadoPaso(PASOS.length - 1).bolsa, 2);
  assert.equal(estadoPaso(indicePaso("bolsa")).codigoVisible, false);
  assert.equal(estadoPaso(indicePaso("whatsapp")).codigoVisible, true);
});

test("la base de la demo: La Vuelta con sus 3 productos y la solicitud del pedido, sin tocar el seed", () => {
  const db = dbDemo.dbBase();
  assert.deepEqual(db.tiendas.map((t) => t.nombre), ["La Vuelta"]);
  const c = dbDemo.catalogoDemo(db);
  assert.deepEqual(c.productos.map((p) => p.slug), ["gorra", "termo", "tote"]);
  const v = dbDemo.vistaSolicitudDemo(db);
  assert.equal(v.codigo, demo.CODIGO_DEMO);
  assert.equal(v.total, 1500);
  assert.equal(v.estado, "enviado");
  const r = dbDemo.dbRegistrada();
  assert.equal(r.db.pedidos.length, 1);
  assert.equal(r.db.pedidos[0].estado, "nuevo");
  assert.equal(r.db.pedidos[0].total, 1500);
  assert.equal(r.pedidoId, dbDemo.dbRegistrada().pedidoId, "el pedido registrado es siempre el mismo");
});

test("los CTA van a destinos reales", () => {
  assert.equal(enlaces.ENLACE_CATALOGO_EJEMPLO, "/tienda/tienda-de-ensayo");
  assert.ok(enlaces.ENLACE_QUIERO_VENDER.startsWith("https://wa.me/18297898061?text="));
  assert.equal(decodeURIComponent(enlaces.ENLACE_QUIERO_VENDER.split("text=")[1]), enlaces.TEXTO_QUIERO_VENDER);
  assert.equal(enlaces.RUTA_ENTRAR, "/entrar");
});
