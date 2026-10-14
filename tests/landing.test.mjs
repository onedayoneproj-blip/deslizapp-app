// Landing de deslizapp.com (lib/landing): un solo pedido en toda la historia, el mensaje real, la tabla de escenas y los CTA.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const demo = await import("../lib/landing/pedido-demo.ts");
const { ESCENAS, DURACION, en, escenaEn, estadoDemo, fotoDe, agregadoEn, HILO, hiloEn, anclaEn, HILO_APARECE, CAPITULOS } = await import("../lib/landing/escenas.ts");
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
  assert.equal(estadoDemo(agregadoEn(0) - 0.001).bolsa, 0);
  assert.equal(estadoDemo(agregadoEn(0)).bolsa, 1);
  assert.equal(estadoDemo(agregadoEn(0)).total, 950);
  assert.equal(estadoDemo(agregadoEn(1)).total, 1500);
  assert.equal(estadoDemo(en("revisar", 0)).bolsa, 2, "antes de revisar ya están los dos");
  assert.equal(estadoDemo(en("cierre", 1)).bolsa, 2);
  assert.equal(estadoDemo(en("revisar", 0.5)).codigoVisible, false);
  assert.equal(estadoDemo(en("seguimiento", 0.5)).codigoVisible, true);
  assert.equal(estadoDemo(en("seguimiento", 0.5)).lado, "compras");
  assert.equal(estadoDemo(en("gestion", 0.5)).lado, "tienda");
  assert.equal(estadoDemo(en("cierre", 0.5)).capitulo, CAPITULOS);
});

test("el ♥ descansa en orden y viaja entre anclas sin saltos", () => {
  for (let i = 0; i < HILO.length; i++) {
    assert.ok(HILO[i].desde <= HILO[i].hasta, HILO[i].ancla);
    if (i) assert.ok(HILO[i - 1].hasta < HILO[i].desde, `${HILO[i - 1].ancla} → ${HILO[i].ancla}`);
  }
  assert.deepEqual(hiloEn(HILO[1].desde), { de: "bolsa", a: "bolsa", t: 0 });
  const mitad = (HILO[1].hasta + HILO[2].desde) / 2;
  const h = hiloEn(mitad);
  assert.equal(h.de, "bolsa");
  assert.equal(h.a, "tu-pedido");
  assert.ok(Math.abs(h.t - 0.5) < 1e-9);
  assert.equal(anclaEn(en("cierre", 0.9)), "despachar");
  assert.ok(HILO_APARECE[0] < HILO[0].desde, "aparece con el «Lo quiero» del termo");
  // Cruza de un teléfono al otro en el cambio de persona.
  assert.equal(hiloEn(en("cambio", 0.6)).a, "notificacion");
});

test("los CTA van a destinos reales", () => {
  assert.equal(enlaces.ENLACE_CATALOGO_EJEMPLO, "/tienda/tienda-de-ensayo");
  assert.ok(enlaces.ENLACE_QUIERO_VENDER.startsWith("https://wa.me/18297898061?text="));
  assert.equal(decodeURIComponent(enlaces.ENLACE_QUIERO_VENDER.split("text=")[1]), enlaces.TEXTO_QUIERO_VENDER);
  assert.equal(enlaces.RUTA_ENTRAR, "/entrar");
});
