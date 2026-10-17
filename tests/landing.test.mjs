// Landing de deslizapp.com (lib/landing): un solo pedido en toda la historia, el mensaje real, la tabla de escenas y los CTA.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const demo = await import("../lib/landing/pedido-demo.ts");
const { PASOS, MAX_ICONOS_BURBUJA, CAPITULOS, CAPITULOS_NOMBRES, estadoPaso, indicePaso, primerPasoDe } = await import("../lib/landing/pasos.ts");
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
  assert.match(m, /^¡Hola Tu Tienda! Vi tu catálogo y quiero:/);
  for (const p of demo.PEDIDO_DEMO) assert.ok(m.includes(`• ${p.nombre} (${demo.pesos(p.precio)})`), p.nombre);
  assert.ok(!m.includes("Gorra verde"), "la gorra no va en el pedido");
  assert.ok(m.includes("Total: RD$1,500"));
  assert.ok(m.includes(`Mi pedido #${demo.CODIGO_DEMO}:\nhttps://deslizapp.com/pedido/${demo.CODIGO_DEMO}`));
});

test("lo que ve la compradora usa estadoComprador", () => {
  assert.equal(demo.ESTADO_ENVIADO.titulo, "Le llegó a Tu Tienda");
  assert.equal(demo.ESTADO_ENVIADO.linea, "2 productos · te responde por WhatsApp");
  assert.equal(demo.ESTADO_DESPACHADO.titulo, "Va en camino");
  assert.equal(demo.VISTA_PREVIA_DEMO.descripcion, "2 productos · RD$1,500");
});

test("los pasos siguen el guion: el dolor, el enlace, la compradora, el cambio de lado, la tienda, y todos los capítulos", () => {
  assert.deepEqual(
    PASOS.map((p) => p.id),
    ["dolor-dm", "dolor-chats", "post", "perfil", "navegador", "hola", "pasa", "aaah-termo", "aaah-tote", "bolsa", "whatsapp", "seguimiento", "cambio-lado", "cambio", "aviso", "chat-tienda", "eres-tienda", "registrar", "pedidos", "confirmar", "despachar"],
  );
  const primeroTienda = PASOS.findIndex((p) => p.telefono === "tienda");
  assert.equal(PASOS[primeroTienda].id, "cambio-lado", "el cambio de lado abre la tienda");
  assert.ok(PASOS.slice(0, primeroTienda).every((p) => p.telefono === "compradora"));
  assert.ok(PASOS.slice(primeroTienda).every((p) => p.lado === "tienda" && p.telefono === "tienda"));
  // Las dos pantallas del dolor son neutras (arena); el color de la marca entra con el post; desde ahí, rosa hasta el cambio de lado.
  assert.deepEqual(PASOS.slice(0, 2).map((p) => [p.id, p.lado]), [["dolor-dm", "antes"], ["dolor-chats", "antes"]]);
  assert.ok(PASOS.slice(2, primeroTienda).every((p) => p.lado === "compras"));
  // Las pantallas nuevas llevan `escena` (no son páginas de la app); las de siempre, no.
  assert.deepEqual(PASOS.filter((p) => p.escena).map((p) => [p.id, p.escena]), ["dolor-dm", "dolor-chats", "post", "perfil", "navegador", "cambio-lado"].map((id) => [id, id]));
  assert.deepEqual([...new Set(PASOS.map((p) => p.capitulo))], Array.from({ length: CAPITULOS }, (_, i) => i + 1));
  // El índice: una palabra por capítulo y cada una lleva a su primer paso.
  assert.deepEqual([...CAPITULOS_NOMBRES], ["Antes", "Enlace", "Elige", "Envía", "Sigue", "Te llega", "Registra", "Despacha"]);
  assert.deepEqual(CAPITULOS_NOMBRES.map((_, i) => PASOS[primerPasoDe(i + 1)].id), ["dolor-dm", "post", "hola", "bolsa", "seguimiento", "cambio-lado", "eres-tienda", "confirmar"]);
  // El cambio de lado no lleva burbuja (su texto va en la propia pantalla); los demás pasos, sí.
  for (const p of PASOS) assert.ok((p.id === "cambio-lado" ? p.burbuja === null : p.burbuja?.texto.trim()) && p.duracion > 0 && p.fases >= 0, p.id);
  // Las rayas finas del indicador: una por toque en los pasos de toques (probar-landing comprueba los toques reales).
  assert.ok(PASOS.filter((p) => p.dedo === "toque").every((p) => p.fases > 0));
  // El ♥ es el dedo: no se ve en los pasos sin toque ni viaje. Ningún paso lo lleva ya de un teléfono al otro (el cambio de lado es una
  // pantalla propia entre los dos), pero el controlador sigue sabiendo hacerlo.
  assert.deepEqual(PASOS.filter((p) => p.dedo === "no").map((p) => p.id), ["dolor-dm", "dolor-chats", "post", "navegador", "hola", "pasa", "cambio-lado", "cambio", "aviso"]);
  assert.deepEqual(PASOS.filter((p) => p.dedo === "viaje"), []);
  assert.equal(PASOS.find((p) => p.dedo === "toque" && p.escena)?.id, "perfil", "el toque en el enlace del perfil");
});

test("los iconos de las burbujas: cada palabra marcada sale en su texto, y como mucho dos por burbuja", () => {
  const permitidos = new Set(["clientes", "bolsa", "pedidos", "catalogo", "whatsapp", "corazon", "enlace", "camion", "moneda", "etiqueta"]);
  for (const p of PASOS) {
    const iconos = Object.entries(p.burbuja?.iconos ?? {});
    assert.ok(iconos.length <= MAX_ICONOS_BURBUJA, `${p.id}: ${iconos.length} iconos`);
    const texto = [p.burbuja?.texto, p.burbuja?.remate].filter(Boolean).join(" ");
    for (const [palabra, icono] of iconos) {
      assert.ok(texto.includes(palabra), `${p.id}: «${palabra}» no está en «${texto}»`);
      assert.ok(permitidos.has(icono), `${p.id}: icono ${icono}`);
    }
  }
  assert.ok(PASOS.some((p) => Object.keys(p.burbuja?.iconos ?? {}).length > 0));
});

test("la bolsa cuenta con los pasos y retrocede igual", () => {
  assert.equal(estadoPaso(0).bolsa, 0);
  assert.equal(estadoPaso(indicePaso("navegador")).bolsa, 0, "la bolsa empieza vacía al abrir el catálogo");
  assert.equal(estadoPaso(indicePaso("pasa")).bolsa, 0, "la gorra pasa sin like");
  assert.equal(estadoPaso(indicePaso("aaah-termo")).total, 950);
  assert.equal(estadoPaso(indicePaso("aaah-tote")).total, 1500);
  assert.equal(estadoPaso(PASOS.length - 1).bolsa, 2);
  assert.equal(estadoPaso(indicePaso("bolsa")).codigoVisible, false);
  assert.equal(estadoPaso(indicePaso("whatsapp")).codigoVisible, true);
});

test("la base de la demo: Tu Tienda con sus 3 productos y la solicitud del pedido, sin tocar el seed", () => {
  const db = dbDemo.dbBase();
  assert.deepEqual(db.tiendas.map((t) => t.nombre), ["Tu Tienda"]);
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
  assert.equal(enlaces.ENLACE_QUIERO_VENDER, "https://instagram.com/deslizapp");
  assert.equal(enlaces.RUTA_CONOCE, "/conoce");
  assert.equal(enlaces.RUTA_ENTRAR, "/");
});
