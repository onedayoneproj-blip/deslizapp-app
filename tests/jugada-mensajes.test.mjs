// Mensajes de código y productos (lib/jugada-mensajes.ts) y orden por envío reciente (lib/jugada-envios.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { inicioMensaje, mensajeCodigo, mensajeProductos, reemplazarCodigo } from "../lib/jugada-mensajes.ts";
import { ordenarPorEnvio, textoEnvioReciente } from "../lib/jugada-envios.ts";

test("mensaje con código: código, porcentaje, días y enlace si existe", () => {
  const con = mensajeCodigo({ cliente: "Luisanna Peña", vendedora: "Michel", tienda: "Esencias Michel", codigo: "LUISAN10", porcentaje: 10, dias: 14, urlCatalogo: "https://esenciasmichel.com/catalogo" });
  assert.equal(con, "¡Hola, Luisanna! Soy Michel de Esencias Michel. Te guardé un 10 % de descuento para tu próximo pedido con el código LUISAN10. Vale por 14 días.\nMira el catálogo aquí: https://esenciasmichel.com/catalogo");
  const sin = mensajeCodigo({ cliente: "Luisanna", vendedora: "", tienda: "Esencias Michel", codigo: "VERANO", porcentaje: 20, urlCatalogo: null });
  assert.equal(sin, "¡Hola, Luisanna! Te escribo de Esencias Michel. Te guardé un 20 % de descuento para tu próximo pedido con el código VERANO.");
});

test("mensaje con productos: una línea por producto y su enlace debajo (sin url, sin enlaces)", () => {
  const productos = [{ id: "p1", nombre: "Oxana Black", precio: 3200 }, { id: "p2", nombre: "Zakat", precio: 950 }];
  assert.equal(
    mensajeProductos({ cliente: "Luisanna", vendedora: "Michel", tienda: "Esencias Michel", productos, urlCatalogo: "https://esenciasmichel.com/catalogo" }),
    "¡Hola, Luisanna! Soy Michel de Esencias Michel. Pensé en ti con estos:\n• Oxana Black · RD$3,200\nhttps://esenciasmichel.com/catalogo#p/p1\n• Zakat · RD$950\nhttps://esenciasmichel.com/catalogo#p/p2",
  );
  assert.equal(
    mensajeProductos({ cliente: "Luisanna", vendedora: "Michel", tienda: "Esencias Michel", productos: productos.slice(0, 1), urlCatalogo: null }),
    "¡Hola, Luisanna! Soy Michel de Esencias Michel. Pensé en ti con esto:\n• Oxana Black · RD$3,200",
  );
});

test("inicio y reemplazo de código en un texto editado", () => {
  assert.equal(inicioMensaje("", "", ""), "¡Hola! Te escribo de la tienda.");
  assert.equal(reemplazarCodigo("Usa LUISAN10 ya. LUISAN10!", "LUISAN10", "LUISAN1043"), "Usa LUISAN1043 ya. LUISAN1043!");
  assert.equal(reemplazarCodigo("igual", "A", "A"), "igual");
});

test("envío reciente: hoy, ayer, hace N días; nada después de 7 días", () => {
  const ahora = Date.parse("2026-10-03T15:00:00Z");
  assert.equal(textoEnvioReciente("2026-10-03T13:00:00Z", ahora), "Le escribiste hoy");
  assert.equal(textoEnvioReciente("2026-10-02T13:00:00Z", ahora), "Le escribiste ayer");
  assert.equal(textoEnvioReciente("2026-09-28T13:00:00Z", ahora), "Le escribiste hace 5 días");
  assert.equal(textoEnvioReciente("2026-09-20T13:00:00Z", ahora), null);
  assert.equal(textoEnvioReciente(null, ahora), null);
});

test("orden por envío reciente: los escritos van al final, los demás conservan su orden", () => {
  const ahora = Date.parse("2026-10-03T15:00:00Z");
  const clientes = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
  const envios = [
    { clienteId: "a", enviadoEn: "2026-10-02T13:00:00Z" },
    { clienteId: "c", enviadoEn: "2026-09-01T13:00:00Z" }, // viejo: no cuenta
    { clienteId: "d", enviadoEn: "2026-10-03T12:00:00Z" },
  ];
  const r = ordenarPorEnvio(clientes, envios, ahora);
  assert.deepEqual(r.lista.map((c) => c.id), ["b", "c", "e", "f", "a", "d"]);
  assert.equal(r.recientes.get("a"), "Le escribiste ayer");
  assert.equal(r.recientes.get("d"), "Le escribiste hoy");
  assert.equal(r.recientes.has("c"), false);
  // "Empieza con estos 5": los primeros cinco son los que no tienen envío reciente
  assert.deepEqual(r.lista.slice(0, 5).map((c) => c.id), ["b", "c", "e", "f", "a"]);
});
