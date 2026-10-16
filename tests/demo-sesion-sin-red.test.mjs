import "./cargar-ts.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { verDemo, salir, leerSesion } = await import("../lib/data/sesion.ts");

test("entrar y salir de la demo local funciona sin red y conserva la selección y datos de la cuenta real", async () => {
 const original = globalThis.fetch, almacenamiento = globalThis.localStorage;
 const memoria = new Map([["seleccion-real", "tienda-de-cuenta"], ["sb-fixture-auth-token", "sesion-google"], ["deslizapp-demo-v5", "sandbox-interno"]]);
 const peticiones = [];
 globalThis.localStorage = { getItem: k => memoria.get(k) ?? null, setItem: (k,v) => memoria.set(k,v), removeItem: k => memoria.delete(k) };
 globalThis.fetch = async (url, opciones) => { peticiones.push([url, opciones.method]); throw new TypeError("offline"); };
 try {
  await verDemo(); assert.equal(leerSesion().tipo, "demo"); assert.equal(memoria.get("deslizapp-modo-v1"), "demo");
  await salir(); assert.equal(leerSesion().tipo, "entrada"); assert.equal(memoria.has("deslizapp-modo-v1"), false);
  assert.deepEqual(peticiones, [["/api/demo-interna", "DELETE"], ["/api/demo-interna", "DELETE"]]);
  assert.equal(memoria.get("seleccion-real"), "tienda-de-cuenta"); assert.equal(memoria.get("sb-fixture-auth-token"), "sesion-google"); assert.equal(memoria.get("deslizapp-demo-v5"), "sandbox-interno");
 } finally { globalThis.fetch = original; globalThis.localStorage = almacenamiento; }
});
