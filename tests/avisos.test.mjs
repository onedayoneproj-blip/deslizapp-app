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
