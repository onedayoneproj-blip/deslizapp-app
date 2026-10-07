import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

// Carga public/sw.js con un `self` y unas cachés falsas, y le manda peticiones como las mandaría el navegador.
function cargar() {
  const cachesAbiertas = [];
  const guardadas = [];
  const oyentes = {};
  const self = {
    location: new URL("https://deslizapp.test/"),
    addEventListener: (t, fn) => (oyentes[t] = fn),
    skipWaiting() {},
    clients: { claim: async () => {} },
  };
  const caches = {
    keys: async () => [],
    delete: async () => true,
    open: async (nombre) => {
      cachesAbiertas.push(nombre);
      return { put: async (req) => guardadas.push(req.url), match: async () => undefined };
    },
  };
  const fetchFalso = async (req) => ({ ok: true, type: "basic", clone() { return this; }, url: req.url });
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self, caches, fetch: fetchFalso, URL, Response, console });
  const navegar = async (ruta) => {
    let respondWith = null;
    oyentes.fetch({ request: { method: "GET", url: `https://deslizapp.test${ruta}`, mode: "navigate", destination: "document" }, respondWith: (p) => (respondWith = p) });
    if (respondWith) await respondWith;
    return { interceptada: respondWith !== null };
  };
  return { navegar, cachesAbiertas, guardadas };
}

test("una navegación a /unirse/<código> no la intercepta el service worker ni deja nada en la caché", async () => {
  const sw = cargar();
  const codigo = "A".repeat(43);
  for (const ruta of [`/unirse/${codigo}`, `/unirse/${codigo}?x=1`, "/unirse", "/unirse/"]) {
    const r = await sw.navegar(ruta);
    assert.equal(r.interceptada, false, `${ruta} no pasa por el service worker`);
  }
  assert.deepEqual(sw.cachesAbiertas, [], "no se abrió ninguna caché");
  assert.deepEqual(sw.guardadas, [], "no se guardó nada");
});

test("control: una página normal sí se guarda (la prueba de arriba no es vacía)", async () => {
  const sw = cargar();
  const r = await sw.navegar("/catalogo");
  assert.equal(r.interceptada, true);
  assert.equal(sw.guardadas.length, 1);
  const otra = await sw.navegar("/unirsealgo");
  assert.equal(otra.interceptada, true, "solo /unirse y /unirse/…: un prefijo parecido no cuenta");
});
