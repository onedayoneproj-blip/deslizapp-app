import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import "./cargar-ts.mjs";

const { deducirOrigen, esEvento, EVENTOS } = await import("../lib/medicion/eventos.ts");

test("origen: utm_source manda sobre el referer", () => {
  assert.equal(deducirOrigen({ utmSource: "instagram", referer: "https://wa.me/x" }), "instagram");
  assert.equal(deducirOrigen({ utmSource: "IG" }), "instagram");
  assert.equal(deducirOrigen({ utmSource: "whatsapp" }), "whatsapp");
  assert.equal(deducirOrigen({ utmSource: "newsletter" }), "otro");
});

test("origen: por el dominio del referer", () => {
  assert.equal(deducirOrigen({ referer: "https://l.instagram.com/?u=x" }), "instagram");
  assert.equal(deducirOrigen({ referer: "https://www.instagram.com/" }), "instagram");
  assert.equal(deducirOrigen({ referer: "https://wa.me/18095550000" }), "whatsapp");
  assert.equal(deducirOrigen({ referer: "https://web.whatsapp.com/" }), "whatsapp");
  assert.equal(deducirOrigen({ referer: "https://google.com/" }), "otro");
  assert.equal(deducirOrigen({ referer: "https://notinstagram.com/" }), "otro");
  assert.equal(deducirOrigen({ referer: "no es una url" }), "otro");
});

test("origen: sin referer es directo; en el navegador de Instagram, instagram", () => {
  assert.equal(deducirOrigen({ referer: "" }), "directo");
  assert.equal(deducirOrigen({}), "directo");
  assert.equal(deducirOrigen({ agente: "Mozilla/5.0 (iPhone) Instagram 300.0" }), "instagram");
});

test("origen: un referer del propio sitio no cuenta", () => {
  assert.equal(deducirOrigen({ referer: "https://deslizapp.com/", host: "deslizapp.com" }), null);
});

test("la lista de eventos coincide con la de la función SQL", () => {
  const migracion = readdirSync(new URL("../supabase/migrations/", import.meta.url)).find((f) => f.includes("eventos_publicos"));
  const sql = readFileSync(new URL(`../supabase/migrations/${migracion}`, import.meta.url), "utf8");
  const lista = sql.match(/p_evento <> all \(array\[([\s\S]*?)\]\)/)[1].match(/'([a-z_]+)'/g).map((x) => x.slice(1, -1));
  assert.deepEqual([...lista].sort(), [...EVENTOS].sort());
  assert.ok(esEvento("inicio_visto"));
  assert.ok(!esEvento("borrar_todo"));
  assert.ok(!esEvento(undefined));
});
