// Landing de deslizapp.com (lib/landing): un solo pedido en toda la historia, el mensaje real, la tabla de escenas y los CTA.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const demo = await import("../lib/landing/pedido-demo.ts");
const { PASOS, MAX_ICONOS_BURBUJA, CAPITULOS, CAPITULOS_NOMBRES, estadoPaso, indicePaso, primerPasoDe, horaDeBurbuja, RELOJ_AVISO, HACE_AVISO } = await import("../lib/landing/pasos.ts");
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
    ["bienvenida", "antes", "dolor-dm", "dolor-chats", "solucion", "post", "enlace", "hola", "aaah", "bolsa", "whatsapp", "seguimiento", "cambio-lado", "aviso", "chat-tienda", "registrar", "pedidos", "confirmar", "despachar"],
  );
  const primeroTienda = PASOS.findIndex((p) => p.telefono === "tienda");
  assert.equal(PASOS[primeroTienda].id, "cambio-lado", "el cambio de lado abre la tienda");
  assert.ok(PASOS.slice(0, primeroTienda).every((p) => p.telefono === "compradora"));
  assert.ok(PASOS.slice(primeroTienda).every((p) => p.lado === "tienda" && p.telefono === "tienda"));
  // La bienvenida va en Bosque; el dolor, en arena (neutro: sin color de marca); la solución y el resto, rosa hasta el cambio de lado.
  assert.deepEqual(PASOS.slice(0, 5).map((p) => [p.id, p.lado]), [["bienvenida", "inicio"], ["antes", "antes"], ["dolor-dm", "antes"], ["dolor-chats", "antes"], ["solucion", "compras"]]);
  assert.ok(PASOS.slice(4, primeroTienda).every((p) => p.lado === "compras"));
  // Las pantallas nuevas llevan `escena` (no son páginas de la app); las de siempre, no.
  assert.deepEqual(PASOS.filter((p) => p.escena).map((p) => [p.id, p.escena]), ["bienvenida", "antes", "dolor-dm", "dolor-chats", "solucion", "post", "enlace", "cambio-lado"].map((id) => [id, id]));
  assert.deepEqual([...new Set(PASOS.map((p) => p.capitulo))], Array.from({ length: CAPITULOS }, (_, i) => i + 1));
  // El índice: una palabra por capítulo y cada una lleva a su primer paso.
  assert.deepEqual([...CAPITULOS_NOMBRES], ["Antes", "Enlace", "Elige", "Envía", "Sigue", "Te llega", "Registra", "Despacha"]);
  assert.deepEqual(CAPITULOS_NOMBRES.map((_, i) => PASOS[primerPasoDe(i + 1)].id), ["bienvenida", "solucion", "hola", "bolsa", "seguimiento", "cambio-lado", "registrar", "confirmar"]);
  // Los separadores y el cambio de lado no llevan burbuja (su texto va en la propia pantalla); los demás pasos, sí.
  const SIN_BURBUJA = ["bienvenida", "antes", "solucion", "cambio-lado"];
  for (const p of PASOS) assert.ok((SIN_BURBUJA.includes(p.id) ? p.burbuja === null : p.burbuja?.texto.trim()) && p.duracion > 0 && p.fases >= 0, p.id);
  // Las rayas finas del indicador: una por toque en los pasos de toques (probar-landing comprueba los toques reales).
  assert.ok(PASOS.filter((p) => p.dedo === "toque").every((p) => p.fases > 0));
  // El ♥ es el dedo: no se ve en los pasos sin toque ni viaje. Ningún paso lo lleva ya de un teléfono al otro (el cambio de lado es una
  // pantalla propia entre los dos), pero el controlador sigue sabiendo hacerlo.
  assert.deepEqual(PASOS.filter((p) => p.dedo === "no").map((p) => p.id), ["bienvenida", "antes", "dolor-dm", "dolor-chats", "solucion", "post", "enlace", "hola", "cambio-lado", "aviso"]);
  assert.deepEqual(PASOS.filter((p) => p.dedo === "viaje"), []);
  assert.equal(PASOS.find((p) => p.dedo === "toque" && p.escena), undefined, "ninguna escena dibujada lleva el ♥: el perfil al catálogo lleva su propio círculo de toque");
  // Los pasos fusionados guardan los toques de los dos pasos que eran (aaah: termo y tote; registrar: «¿Eres la tienda?» y «Registrar»).
  assert.deepEqual([PASOS.length, PASOS.find((p) => p.id === "aaah").fases, PASOS.find((p) => p.id === "registrar").fases], [19, 2, 6]);
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
  assert.equal(estadoPaso(indicePaso("enlace")).bolsa, 0, "la bolsa empieza vacía al abrir el catálogo");
  assert.equal(estadoPaso(indicePaso("hola")).bolsa, 0, "la gorra pasa sin like");
  assert.equal(estadoPaso(indicePaso("aaah")).bolsa, 2);
  assert.equal(estadoPaso(indicePaso("aaah")).total, 1500);
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

test("el pie de contacto: el Instagram sale de lib/config y el correo es una constante", async () => {
  const { ENLACE_INSTAGRAM, ENLACE_QUIERO_VENDER, CORREO_CONTACTO } = await import("../lib/landing/enlaces.ts");
  const { INSTAGRAM_DESLIZAPP } = await import("../lib/config.ts");
  assert.equal(ENLACE_INSTAGRAM, `https://instagram.com/${INSTAGRAM_DESLIZAPP}`);
  assert.equal(ENLACE_QUIERO_VENDER, ENLACE_INSTAGRAM);
  assert.equal(CORREO_CONTACTO, "hola@deslizapp.com");
});

test("las burbujas hablan de quien compra en tercera persona y de la tienda en segunda", () => {
  const texto = (id) => { const b = PASOS.find((p) => p.id === id).burbuja; return `${b.texto} ${b.remate ?? ""}`; };
  assert.match(texto("hola"), /^Así lo ve tu cliente: desliza como en los Reels\./);
  for (const id of ["hola", "aaah", "bolsa", "whatsapp", "seguimiento"]) assert.doesNotMatch(texto(id), /\b(tu pedido|te gusta|envías)\b/i, `${id}: habla de la clienta, no de «tú»`);
  assert.match(texto("enlace"), /link de tu bio/);
  assert.doesNotMatch(texto("enlace"), /enlace de tu perfil/);
  // En el texto corrido, «Deslizapp» con mayúscula (en minúscula solo es el logotipo de la bienvenida).
  for (const p of PASOS.filter((x) => x.burbuja)) assert.doesNotMatch(texto(p.id).replace(/\bTu Tienda\b/g, ""), /deslizapp/, p.id);
});

test("un solo reloj: la burbuja de WhatsApp es la hora del pedido, las demás avanzan de minuto en minuto y la pantalla bloqueada es la del aviso", () => {
  assert.equal(horaDeBurbuja("whatsapp"), demo.HORA_DEMO);
  assert.equal(horaDeBurbuja("seguimiento"), "3:43 p. m.");
  assert.equal(horaDeBurbuja("aviso"), "3:44 p. m.");
  assert.equal(RELOJ_AVISO, "3:44");
  assert.equal(HACE_AVISO, "hace 2 min");
  const horas = PASOS.filter((p) => p.burbuja).map((p) => horaDeBurbuja(p.id));
  assert.equal(new Set(horas).size, horas.length, "ninguna hora se repite");
  assert.equal(demo.horaDespues(18), "4:00 p. m.");
  assert.equal(demo.relojDespues(-42), "3:00");
  assert.equal(demo.horaDespues(-3 * 60 - 42), "12:00 p. m.");
});

test("el «ahora» de la demo es hoy a las 3:44 p. m. de República Dominicana, y la solicitud de Ana, a las 3:42", () => {
  const hora = (d) => new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(/\s/g, " ").toLowerCase().replace(/\./g, "");
  const ahora = dbDemo.ahoraDemo(new Date("2026-10-17T03:00:00Z"));
  assert.equal(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(ahora), "2026-10-16", "el día es el de allá (a las 3 UTC todavía es el 16)");
  assert.match(hora(ahora), /^3:44 p ?m$/);
  assert.match(hora(new Date(ahora.getTime() - 2 * 60_000)), /^3:42 p ?m$/);
});
