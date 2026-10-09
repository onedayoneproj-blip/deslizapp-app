import "./cargar-ts.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { catalogoParaAviso, enlaceAviso, esperanPorProducto, mensajeYaLlego } = await import("../lib/avisos.ts");

test("Ya llegó omite enlaces inválidos y ejecutables", () => {
  for (const url of [null, "no es un enlace", "javascript:alert(1)", "http://example.com", "https://usuario:clave@example.com"]) {
    assert.equal(catalogoParaAviso(url), null);
    assert.equal(mensajeYaLlego({ nombre: null, producto: "Camisa", variante: null, urlCatalogo: url, slug: "camisa" }), "¡Hola! Ya llegó Camisa.");
  }
  assert.equal(catalogoParaAviso("https://example.com/catalogo#viejo"), "https://example.com/catalogo");
});

test("mensaje de Ya llegó: con nombre, variante y enlace al producto", () => {
  assert.equal(
    mensajeYaLlego({ nombre: "Carolina Peña", producto: "Mayar", variante: "50 ml", urlCatalogo: "https://esenciasmichel.com/", slug: "mayar" }),
    "¡Hola Carolina! Ya llegó Mayar · 50 ml. Aquí lo tienes antes de que se vaya: https://esenciasmichel.com/#p/mayar",
  );
});

test("mensaje de Ya llegó: sin nombre empieza en ¡Hola!, sin enlace no lo inventa", () => {
  assert.equal(mensajeYaLlego({ nombre: null, producto: "Zakat", variante: null, urlCatalogo: null, slug: "zakat" }), "¡Hola! Ya llegó Zakat.");
  assert.equal(
    mensajeYaLlego({ nombre: "  ", producto: "Zakat", variante: null, urlCatalogo: "https://x.com/c#viejo", slug: "zakat" }),
    "¡Hola! Ya llegó Zakat. Aquí lo tienes antes de que se vaya: https://x.com/c#p/zakat",
  );
});

test("enlace de WhatsApp y conteo por producto", () => {
  assert.equal(enlaceAviso("+1 809-555-0142", "Hola y adiós"), "https://wa.me/18095550142?text=Hola%20y%20adi%C3%B3s");
  assert.deepEqual([...esperanPorProducto([{ productoId: "a" }, { productoId: "b" }, { productoId: "a" }])], [["a", 2], ["b", 1]]);
});

const { clienteDelAviso, clientesPorTelefono, enlaceChat } = await import("../lib/avisos.ts");

test("cruce aviso ↔ cliente: otro formato del mismo número coincide", () => {
  const lewis = { id: "c1", nombre: "Lewis", telefono: "+18095550142" };
  const mapa = clientesPorTelefono([lewis]);
  for (const t of ["18095550142", "+18095550142", "809-555-0142", "(809) 555 0142"]) assert.equal(clienteDelAviso(mapa, t), lewis);
});

test("cruce aviso ↔ cliente: sin coincidencia o clientes sin teléfono da null", () => {
  const mapa = clientesPorTelefono([{ id: "c1", nombre: "Ana", telefono: "+18295550100" }, { id: "c2", nombre: "Sin número", telefono: null }]);
  assert.equal(clienteDelAviso(mapa, "18095550142"), null);
  assert.equal(mapa.size, 1);
});

test("cruce aviso ↔ cliente: varios clientes, cada aviso con el suyo; si repiten número queda el primero", () => {
  const a = { id: "a", nombre: "Ana", telefono: "+18295550100" };
  const b = { id: "b", nombre: "Beto", telefono: "+18495550111" };
  const repetido = { id: "x", nombre: "Otro Ana", telefono: "829-555-0100" };
  const mapa = clientesPorTelefono([a, b, repetido]);
  assert.equal(clienteDelAviso(mapa, "18495550111"), b);
  assert.equal(clienteDelAviso(mapa, "18295550100"), a);
});

test("cruce: el nombre null del aviso no estorba y un teléfono no dominicano se compara tal cual", () => {
  const raro = { id: "r", nombre: "Extranjero", telefono: "+34600111222" };
  const mapa = clientesPorTelefono([raro]);
  assert.equal(clienteDelAviso(mapa, "+34600111222"), raro);
  assert.equal(clienteDelAviso(mapa, "34600111222"), null);
});

test("Escribir: chat de WhatsApp sin mensaje", () => {
  assert.equal(enlaceChat("+18095550142"), "https://wa.me/18095550142");
});
