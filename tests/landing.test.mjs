// Landing de deslizapp.com (lib/landing): un solo pedido en toda la historia, el mensaje real, la tabla de escenas y los CTA.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const demo = await import("../lib/landing/pedido-demo.ts");
const { ESCENAS, DURACION, en, escenaEn, estadoDemo, fotoDe, momentoProducto, AGREGA_EN } = await import("../lib/landing/escenas.ts");
const enlaces = await import("../lib/landing/enlaces.ts");
const { codigoPedidoValido } = await import("../lib/tienda/imagen-pedido.ts");

test("el pedido de la demo: tres productos, RD$2,150 y un código con el formato real", () => {
  assert.equal(demo.PRODUCTOS_DEMO.length, 3);
  assert.equal(demo.TOTAL_DEMO, 2150);
  assert.ok(codigoPedidoValido(demo.CODIGO_DEMO));
  assert.equal(demo.pesos(demo.TOTAL_DEMO), "RD$2,150");
});

test("el mensaje de WhatsApp sale de mensajePedido, con los productos, el total y el enlace", () => {
  const m = demo.MENSAJE_DEMO;
  assert.match(m, /^¡Hola La Vuelta! Vi tu catálogo y quiero:/);
  for (const p of demo.PRODUCTOS_DEMO) assert.ok(m.includes(`• ${p.nombre} (${demo.pesos(p.precio)})`), p.nombre);
  assert.ok(m.includes("Total: RD$2,150"));
  assert.ok(m.includes(`Mi pedido #${demo.CODIGO_DEMO}:\nhttps://deslizapp.com/pedido/${demo.CODIGO_DEMO}`));
});

test("lo que ve la compradora usa estadoComprador", () => {
  assert.equal(demo.ESTADO_ENVIADO.titulo, "Le llegó a La Vuelta");
  assert.equal(demo.ESTADO_ENVIADO.linea, "3 productos · te responde por WhatsApp");
  assert.equal(demo.ESTADO_CONFIRMADO.titulo, "La Vuelta lo confirmó");
  assert.equal(demo.VISTA_PREVIA_DEMO.descripcion, "3 productos · RD$2,150");
});

test("las escenas siguen el guion y cubren todo el recorrido", () => {
  assert.deepEqual(
    ESCENAS.map((e) => e.id),
    ["bienvenida", "explorar", "revisar", "whatsapp-comprador", "seguimiento", "cambio", "notificacion", "whatsapp-tienda", "acceso", "gestion", "cierre"],
  );
  assert.ok(DURACION > 10);
  for (const e of ESCENAS) {
    assert.equal(escenaEn(en(e.id, 0.5)).id, e.id);
    assert.equal(escenaEn(fotoDe(e)).id, e.id, `la foto de ${e.id} cae en su escena`);
  }
  assert.equal(escenaEn(DURACION + 5).id, "cierre");
});

test("la bolsa cuenta con el scroll y retrocede igual", () => {
  assert.equal(estadoDemo(0).bolsa, 0);
  const agrega = (i) => momentoProducto(i, AGREGA_EN, AGREGA_EN + 0.01)[0];
  assert.equal(estadoDemo(agrega(0) - 0.001).bolsa, 0);
  assert.equal(estadoDemo(agrega(0)).bolsa, 1);
  assert.equal(estadoDemo(agrega(1)).total, 1600);
  assert.equal(estadoDemo(agrega(2)).total, 2150);
  assert.equal(estadoDemo(en("revisar", 0)).bolsa, 3, "antes de revisar ya están los tres");
  assert.equal(estadoDemo(en("cierre", 1)).bolsa, 3);
  assert.equal(estadoDemo(en("revisar", 0.5)).codigoVisible, false);
  assert.equal(estadoDemo(en("seguimiento", 0.5)).codigoVisible, true);
  assert.equal(estadoDemo(en("gestion", 0.5)).lado, "tienda");
});

test("los CTA van a destinos reales", () => {
  assert.equal(enlaces.ENLACE_CATALOGO_EJEMPLO, "/tienda/tienda-de-ensayo");
  assert.ok(enlaces.ENLACE_QUIERO_VENDER.startsWith("https://wa.me/18297898061?text="));
  assert.equal(decodeURIComponent(enlaces.ENLACE_QUIERO_VENDER.split("text=")[1]), enlaces.TEXTO_QUIERO_VENDER);
  assert.equal(enlaces.RUTA_ENTRAR, "/entrar");
});
