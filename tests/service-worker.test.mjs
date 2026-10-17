import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

// Carga public/sw.js con un `self` y unas cachés falsas, y le manda peticiones como las mandaría el navegador.
function cargar(respuestaFalsa = {}, putFalla = false) {
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
      return { put: async (req) => { if (putFalla) throw new TypeError("put falló"); guardadas.push(req.url); }, match: async () => undefined };
    },
  };
  const fetchFalso = async (req) => ({ ok: true, status: 200, type: "basic", clone() { return this; }, url: req.url, ...respuestaFalsa });
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self, caches, fetch: fetchFalso, URL, Response, Headers, console });
  const navegar = async (ruta, { destination = "document", cabeceras = {} } = {}) => {
    let respondWith = null;
    oyentes.fetch({ request: { method: "GET", url: `https://deslizapp.test${ruta}`, mode: "navigate", destination, headers: new Headers(cabeceras) }, respondWith: (p) => (respondWith = p) });
    if (respondWith) await respondWith;
    // (el guardado no se espera: da un turno para que `put` termine o falle)
    await new Promise((r) => setTimeout(r, 0));
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

test("solo se guarda una respuesta completa (200) a una petición sin Range, y un `put` que falla no rompe la respuesta", async () => {
  // Páginas (red primero) y recursos (caché primero): un 206 o una petición con Range no se guardan.
  for (const [ruta, opciones] of [["/catalogo", {}], ["/seed/video.mp4", { destination: "video" }], ["/seed/foto.webp", { destination: "image" }]]) {
    const parcial = cargar({ status: 206 });
    await parcial.navegar(ruta, opciones);
    assert.deepEqual(parcial.guardadas, [], `${ruta}: un 206 no se guarda`);
    const rango = cargar();
    await rango.navegar(ruta, { ...opciones, cabeceras: { Range: "bytes=0-" } });
    assert.deepEqual(rango.guardadas, [], `${ruta}: con Range no se guarda`);
    const completa = cargar();
    await completa.navegar(ruta, opciones);
    assert.equal(completa.guardadas.length, 1, `${ruta}: un 200 sin Range sí`);
  }
  const falla = cargar({}, true);
  const errores = [];
  process.on("unhandledRejection", (e) => errores.push(e));
  const r = await falla.navegar("/seed/foto.webp", { destination: "image" });
  assert.equal(r.interceptada, true);
  assert.deepEqual(errores, [], "el error del `cache.put` se captura");
  process.removeAllListeners("unhandledRejection");
});
