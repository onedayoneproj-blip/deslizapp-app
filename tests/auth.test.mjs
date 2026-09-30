// Pruebas de la vuelta de Google (lib/auth/canje.ts): sin red ni Supabase.
import assert from "node:assert/strict";
import { test } from "node:test";
import { debeComprobarSesion, resolverVuelta } from "../lib/auth/canje.ts";

const bien = async () => ({ error: null });
const flowNoEncontrado = async () => ({ error: { status: 404, code: "flow_state_not_found" } });
const conSesion = async () => true;
const sinSesion = async () => false;

test("canje bien → ok, sin mirar la sesión", async () => {
  let miro = false;
  assert.equal(await resolverVuelta(bien, async () => ((miro = true), false)), "ok");
  assert.equal(miro, false);
});

test("canje fallido pero la sesión ya es válida (código usado dos veces) → ok, sin aviso", async () => {
  assert.equal(await resolverVuelta(flowNoEncontrado, conSesion), "ok");
});

test("canje fallido y sin sesión → error", async () => {
  assert.equal(await resolverVuelta(flowNoEncontrado, sinSesion), "error");
});

test("si el canje lanza o comprobar la sesión lanza, se trata como fallo", async () => {
  assert.equal(await resolverVuelta(async () => { throw new Error("red"); }, conSesion), "ok");
  assert.equal(await resolverVuelta(flowNoEncontrado, async () => { throw new Error("red"); }), "error");
});

test("al abrir: se comprueba la sesión con modo real, o sin modo si hay señal de login reciente", () => {
  assert.equal(debeComprobarSesion("real", true, false, false), true);
  assert.equal(debeComprobarSesion(null, true, true, false), true); // ?error_login con sesión válida → se ignora el aviso
  assert.equal(debeComprobarSesion(null, true, false, true), true); // cookie de sesión sin modo guardado
  assert.equal(debeComprobarSesion(null, true, false, false), false); // primera vez: pantalla de entrada
  assert.equal(debeComprobarSesion("demo", true, true, true), false);
  assert.equal(debeComprobarSesion("real", false, false, false), false);
});
