// Mockup /nueva-landing: precios (10 meses por 12), mensaje de pedido y el WhatsApp pendiente de Lewis.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const datos = await import("../lib/nueva-landing/datos.ts");
const { codigoPedidoValido } = await import("../lib/tienda/imagen-pedido.ts");
const { dinero } = await import("../lib/tienda/carrito.ts");
const { RUTA_CONOCE } = await import("../lib/landing/enlaces.ts");

test("el titular y la bajada son los del encargo", () => {
  assert.equal(datos.TITULAR, "Tus clientes ya te escriben por WhatsApp. DeslizApp convierte esas conversaciones en pedidos.");
  assert.equal(datos.SUBTITULAR, "Sigue vendiendo por WhatsApp. Lleva tus pedidos, clientes, inventario y cobros con más orden.");
  assert.equal(datos.CIERRE_TITULAR, "¿Listo para vender con más orden?");
  assert.match(datos.CIERRE_TEXTO, /Escríbenos por WhatsApp/);
  assert.match(datos.CIERRE_INVITACION, /invitación/);
});

test("la demo del botón principal es la que ya existe, en /conoce", () => {
  assert.equal(datos.RUTA_DEMO, "/conoce");
  assert.equal(datos.RUTA_DEMO, RUTA_CONOCE);
  assert.equal(datos.RUTA_ENTRAR_LANDING, "/");
});

test("el WhatsApp de Lewis es un placeholder marcado, con el mensaje listo", () => {
  assert.equal(datos.WHATSAPP_LEWIS_ES_PLACEHOLDER, true);
  assert.equal(datos.WHATSAPP_LEWIS, "18090000000");
  const enlace = datos.enlaceQuieroVender();
  assert.ok(enlace.startsWith("https://wa.me/18090000000?text="));
  assert.ok(decodeURIComponent(enlace).includes(datos.MENSAJE_QUIERO_VENDER));
});

test("el año de cada plan son 10 meses, con los límites pedidos", () => {
  assert.deepEqual(
    datos.PLANES_LANDING.map((p) => p.nombre),
    ["Inicial", "Negocio", "Pro"],
  );
  for (const plan of datos.PLANES_LANDING) {
    assert.equal(plan.anual, plan.mensual * 10, plan.nombre);
    assert.equal(datos.montoPlan(plan, "mes"), plan.mensual);
    assert.equal(datos.montoPlan(plan, "ano"), plan.anual);
  }
  assert.equal(datos.textoPrecio(datos.PLANES_LANDING[0], "mes"), "RD$499/mes");
  assert.equal(datos.textoPrecio(datos.PLANES_LANDING[0], "ano"), "RD$4,990/año");
  assert.equal(datos.textoPrecio(datos.PLANES_LANDING[1], "ano"), "RD$9,990/año");
  assert.equal(datos.textoPrecio(datos.PLANES_LANDING[2], "ano"), "RD$14,990/año");
  assert.match(datos.PLANES_LANDING[0].limites.join(" "), /30 publicaciones activas/);
  assert.match(datos.PLANES_LANDING[0].limites.join(" "), /1 tienda/);
  assert.match(datos.PLANES_LANDING[0].limites.join(" "), /1 usuario/);
  assert.match(datos.PLANES_LANDING[1].limites.join(" "), /150 publicaciones activas compartidas/);
  assert.match(datos.PLANES_LANDING[1].limites.join(" "), /3 tiendas/);
  assert.match(datos.PLANES_LANDING[1].limites.join(" "), /5 usuarios/);
  assert.match(datos.PLANES_LANDING[2].limites.join(" "), /uso razonable/);
  assert.match(datos.PLANES_LANDING[2].limites.join(" "), /Varias tiendas/);
  assert.match(datos.INCLUYE_TODOS, /catálogo/);
  assert.match(datos.INCLUYE_TODOS, /pedido por WhatsApp/);
  assert.match(datos.INCLUYE_TODOS, /panel de pedidos/);
  assert.match(datos.INCLUYE_TODOS, /gestión esencial de clientes/);
  assert.match(datos.NOTA_ACTIVAS, /publicaciones activas/);
  assert.match(datos.NOTA_FUNDADORAS, /30 días/);
  assert.match(datos.NOTA_ANUAL, /10 meses/);
});

test("el mensaje de muestra usa el formato real y solo los productos con aaah", () => {
  const [termo, tote, gorra] = datos.PRODUCTOS_LANDING;
  assert.equal(datos.PRODUCTOS_LANDING.length, 3);
  assert.ok(codigoPedidoValido(datos.CODIGO_MUESTRA));
  const mensaje = datos.mensajeMuestra([termo, tote]);
  assert.match(mensaje, /¡Hola Tu Tienda! Vi tu catálogo y quiero:/);
  assert.ok(mensaje.includes(`• ${termo.nombre} (${dinero(termo.precio)})`));
  assert.ok(mensaje.includes(`• ${tote.nombre} (${dinero(tote.precio)})`));
  assert.ok(!mensaje.includes(gorra.nombre));
  assert.ok(mensaje.includes(`Total: ${dinero(termo.precio + tote.precio)}`));
  assert.ok(mensaje.includes(`Mi pedido #${datos.CODIGO_MUESTRA}:\n${datos.ENLACE_MUESTRA}`));
  assert.equal(datos.mensajeMuestra([]).includes("•"), false);
});
