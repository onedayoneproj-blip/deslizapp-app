// Los planes de /planes (lib/planes/planes.ts): todo sale de las filas de la tabla `planes`.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";


const { planDesdeFila, pesos, precioDe, limitesDe, planesMostrables, lineaDesde, DIAS_DE_PRUEBA } = await import("../lib/planes/planes.ts");

const fila = (o) => ({ id: "x", nombre: "X", precio_mensual: 999, precio_anual: 9990, limite_productos: 150, limite_tiendas: 3, limite_personas: 5, destacado: false, ideal_para: null, ...o });

test("pesos pone la coma de miles", () => {
  assert.equal(pesos(499), "RD$499");
  assert.equal(pesos(14990), "RD$14,990");
});

test("el precio sale de la fila: si cambia en la base, cambia en la página", () => {
  assert.equal(precioDe(planDesdeFila(fila({})), false).precio, "RD$999");
  assert.equal(precioDe(planDesdeFila(fila({ precio_mensual: 1099 })), false).precio, "RD$1,099");
  const anual = precioDe(planDesdeFila(fila({ precio_anual: 9990 })), true);
  assert.deepEqual(anual, { precio: "RD$9,990", periodo: "/año", nota: "Sale a RD$833 al mes" });
  assert.equal(precioDe(planDesdeFila(fila({ precio_anual: 12000 })), true).nota, "Sale a RD$1,000 al mes");
});

test("los límites: null es sin límite", () => {
  const textos = (p) => limitesDe(p).map((l) => l.texto);
  assert.deepEqual(limitesDe(planDesdeFila(fila({}))).map((l) => l.clave), ["productos", "tiendas", "personas"]);
  assert.deepEqual(textos(planDesdeFila(fila({}))), ["150 productos publicados", "Hasta 3 tiendas", "Hasta 5 personas en tu equipo"]);
  assert.deepEqual(textos(planDesdeFila(fila({ limite_productos: 30, limite_tiendas: 1, limite_personas: 1 }))), ["30 productos publicados", "1 tienda", "1 persona"]);
  const pro = textos(planDesdeFila(fila({ limite_productos: null, limite_tiendas: null, limite_personas: null })));
  assert.deepEqual(pro, ["Productos publicados sin límite", "Todas las tiendas que quieras", "Equipo sin límite"]);
});

test("un plan sin precio no se muestra", () => {
  const ps = [planDesdeFila(fila({ id: "a" })), planDesdeFila(fila({ id: "b", precio_anual: null })), planDesdeFila(fila({ id: "c", precio_mensual: null }))];
  assert.deepEqual(planesMostrables(ps).map((p) => p.id), ["a"]);
});

// ---- «Todos los planes traen» y las preguntas frecuentes (docs/prompts/planes-incluye-y-preguntas.md) ----
const { INCLUYE } = await import("../lib/planes/incluye.ts");
const { PREGUNTAS_PLANES, faqPageJsonLd } = await import("../lib/planes/preguntas.ts");
const { ejemploClientes, ejemploPedido } = await import("../lib/planes/ejemplos-incluye.ts");

test("«Todos los planes traen»: las cuatro tarjetas, con su título y su línea", () => {
  assert.deepEqual(INCLUYE.map((t) => t.id), ["bio", "whatsapp", "panel", "clientes"]);
  assert.deepEqual(INCLUYE.map((t) => t.titulo), ["Tu catálogo en el link de tu bio", "Pedidos por WhatsApp", "Panel de pedidos y existencias", "Clientes, abonos y lo pendiente"]);
  assert.ok(INCLUYE.every((t) => t.linea.endsWith(".")));
});

test("las preguntas frecuentes: ids únicos, todas con respuesta y las dos aprobadas por Lewis tal cual", () => {
  assert.equal(new Set(PREGUNTAS_PLANES.map((p) => p.id)).size, PREGUNTAS_PLANES.length);
  assert.ok(PREGUNTAS_PLANES.every((p) => p.pregunta.startsWith("¿") && p.pregunta.endsWith("?") && p.respuesta.length > 10));
  const por = (id) => PREGUNTAS_PLANES.find((p) => p.id === id);
  assert.equal(por("comision").respuesta, "No. Hoy el pedido te llega por WhatsApp y el pago lo arreglas tú con tu cliente, así que no cobramos nada por venta.");
  assert.match(por("treinta-dias").respuesta, /No se borra nada\.$/);
  assert.equal(por("circulo").respuesta, "El grupo de las primeras tiendas 💚 Entran por invitación y, pagando el año, tienen 30 % menos el primer año, funciones antes que nadie, regalos y el aro en su tienda para siempre.");
});

test("«¿Qué cuenta como producto publicado?» solo dice lo que cuenta hoy el código: no promete que los agotados no ocupan cupo", () => {
  const r = PREGUNTAS_PLANES.find((p) => p.id === "publicado").respuesta;
  assert.match(r, /visibles en tu catálogo/);
  assert.match(r, /ocultas no ocupan cupo/);
  assert.doesNotMatch(r, /agotad/i);
  // Y no se promete «nunca» una comisión: si algún día hay pasarela de pagos, podría haberla.
  assert.doesNotMatch(PREGUNTAS_PLANES.find((p) => p.id === "comision").respuesta, /nunca|jamás/i);
});

test("el FAQPage tiene las mismas preguntas y respuestas que el chat, en el mismo orden", () => {
  const faq = faqPageJsonLd();
  assert.equal(faq["@context"], "https://schema.org");
  assert.equal(faq["@type"], "FAQPage");
  assert.deepEqual(
    faq.mainEntity.map((q) => [q["@type"], q.name, q.acceptedAnswer["@type"], q.acceptedAnswer.text]),
    PREGUNTAS_PLANES.map((p) => ["Question", p.pregunta, "Answer", p.respuesta]),
  );
});

test("los datos de ejemplo de las vistas previas: un pedido que cuadra y clientes con su deuda y su abono", () => {
  const ahora = Date.UTC(2026, 9, 16, 15);
  const { pedido, fotos } = ejemploPedido(ahora);
  assert.equal(pedido.items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0), pedido.total);
  assert.ok(pedido.items.every((i) => fotos.get(i.productoId)?.fotos[0]));
  assert.ok(Date.parse(pedido.creadoEn) < ahora);
  const clientes = ejemploClientes(ahora);
  assert.equal(clientes.length, 3);
  for (const { cuenta } of clientes) assert.equal(cuenta.abonado + cuenta.deuda, cuenta.totalPedidos);
  assert.deepEqual(clientes.map(({ cuenta }) => cuenta.fechaAcordada !== null), [true, true, false]);
  // Las fechas salen del día de Santo Domingo: a las 11 p. m. del 16 oct allí (3 a. m. del 17 en UTC), «dentro de 3 días» es el 19.
  assert.equal(ejemploClientes(Date.UTC(2026, 9, 17, 3))[0].cuenta.fechaAcordada, "2026-10-19");
});

test("el cierre de /conoce: «Desde» el plan más barato que se ofrece y los días gratis de /planes", () => {
  assert.equal(DIAS_DE_PRUEBA, 30);
  const planes = [fila({ id: "b", precio_mensual: 999 }), fila({ id: "a", precio_mensual: 499 }), fila({ id: "c", precio_mensual: 1499 })].map(planDesdeFila);
  assert.equal(lineaDesde(planes), "Desde RD$499/mes · 30 días gratis");
  assert.equal(lineaDesde(planes.slice(0, 1).concat(planDesdeFila(fila({ id: "z", precio_mensual: null, precio_anual: null })))), "Desde RD$999/mes · 30 días gratis", "un plan sin precio no cuenta");
  assert.equal(lineaDesde([]), null, "sin planes no hay línea");
});
