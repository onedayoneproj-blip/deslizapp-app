// Demo pública real en navegador. Todas las operaciones son locales; cualquier escritura remota falla el caso.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { navegador, URL } from "./navegador-catalogo.mjs";
import { abrirHistoria, nombreYPrecio, hastaPublicar } from "./historia-crear-producto.mjs";
const b = await navegador();
const clave = "deslizapp-publica-v1", capturas = process.env.CAPTURAS ?? "/tmp/demo-publica";
mkdirSync(capturas, { recursive: true });
const resultados = [];
const datos = p => p.evaluate(k => JSON.parse(localStorage.getItem(k) ?? "null"), clave);
const boton = (p, name) => p.getByRole("button", { name, exact: true });
const leer = p => p.locator("body").innerText();
try {
for (const ancho of (process.env.ANCHOS ?? "360,393,430").split(",").map(Number)) {
 const ctx = await b.newContext({ viewport: { width: ancho, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
 const p = await ctx.newPage(); p.setDefaultTimeout(30000); p.setDefaultNavigationTimeout(120000);
 const errores = [], prohibidas = [], solicitudes = [];
 p.on("pageerror", e => errores.push(e.message));
 ctx.on("request", r => { solicitudes.push({ metodo: r.method(), url: r.url() }); if ((/supabase\.(co|in)|wa\.me|whatsapp|mailto:|stripe|paypal/i.test(r.url()) && r.method() !== "GET") || /wa\.me|api\.whatsapp/.test(r.url())) prohibidas.push(r.url()); });
 await ctx.route(/https?:\/\/[^/]*supabase\.(co|in)\//, r => { prohibidas.push(r.request().url()); return r.abort(); });
 try {
  await p.goto(`${URL}/entrar`);
  await p.evaluate(() => {
   localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003");
   localStorage.setItem("deslizapp-demo-v5", "fixture-anterior-intacto");
   localStorage.setItem("deslizapp-version-vista", "9.9.9");
  });
  await p.getByRole("button", { name: "Probar la app con datos de prueba", exact: true }).click();
  await p.getByText("Datos de prueba", { exact: false }).first().waitFor();
  await p.waitForURL(u => u.pathname === "/");
  await p.goto(`${URL}/catalogo`); await p.getByText("Lo’ Hoddie", { exact: true }).first().waitFor();
  assert.match(await leer(p), /Datos de prueba/); assert.doesNotMatch(await leer(p), /Esencias Michel|Lino & Algodón/);
  const imagen = p.locator('img[src*="demo%2Fdeslizapp"],img[src*="/demo/deslizapp/"]').first(); await imagen.waitFor();
  await p.waitForFunction(() => [...document.images].some(i => /demo.*deslizapp/.test(i.src) && i.naturalWidth > 0));
  await p.screenshot({ path: `${capturas}/catalogo-${ancho}.png` });
  await p.locator("[data-abrir-menu-tienda]").click();
  const menu = p.getByRole("dialog").last();
  assert.doesNotMatch(await menu.innerText(), /Laboratorio|Admin de la demo|Simular|Mirar la app como|Esencias Michel|Lino/);
  await menu.getByRole("button", { name: "Cerrar", exact: true }).click();
  // Crear con una imagen local: comprueba que el flujo no sube a Storage.
  await abrirHistoria(p, URL); await nombreYPrecio(p, `Producto prueba ${ancho}`, "975"); await hastaPublicar(p);
  let d = await datos(p); const creado = d.productos.find(x => x.nombre === `Producto prueba ${ancho}`); assert.ok(creado); assert.equal(creado.tiendaId, "demo-publica-deslizapp");
  await p.goto(`${URL}/catalogo/${creado.id}/editar`);
  // La hoja de edición usa los mismos pasos; cambiar el nombre y guardar.
  await p.getByRole("dialog").last().waitFor();
  await p.getByRole("button", { name: /^Nombre/ }).click();
  await p.locator("[data-campo-paso]").fill(`Producto editado ${ancho}`);
  await boton(p, "Listo").click();
  await boton(p, "Guardar cambios").click();
  await p.waitForFunction(({k,id,n}) => JSON.parse(localStorage.getItem(k)).productos.find(p => p.id === id)?.nombre === n, {k:clave,id:creado.id,n:`Producto editado ${ancho}`});
  await p.screenshot({ path: `${capturas}/producto-${ancho}.png` });
  await p.goto(`${URL}/catalogo`);
  const link = p.getByRole("link", { name: /abrir el catálogo/i }).first();
  const href = await link.getAttribute("href"); assert.match(href, /\/tienda\/deslizapp-ejemplo\?demo/); assert.ok(href.startsWith(URL));
  await p.goto(href); await p.locator("#r-lo-e-tickel").waitFor();
  if (await p.locator("#coach").isVisible()) { await boton(p, "Saltar").click(); await p.locator("#coach").waitFor({ state: "hidden" }); }
  // Perfil y vuelta por los controles reales del catálogo.
  await p.screenshot({ path: `${capturas}/comprador-${ancho}.png` });
  await p.locator("#r-lo-e-tickel .acts [data-like]").click();
  await p.locator("#bagDock button").click(); await p.locator("#sheetSend").click();
  await p.waitForURL(/\/pedido\/DEMO-/); const enlacePedido = p.url();
  d = await datos(p); const s = d.solicitudes.at(-1); assert.match(s.codigo, /^DEMO-/); assert.equal(s.tiendaId, "demo-publica-deslizapp");
  // Sin query sigue siendo demo; ni metadata ni el cliente recurren a una fuente real.
  await p.goto(enlacePedido.split("?")[0]); await boton(p, "Entra para registrarlo").click(); await boton(p, "Ver como la tienda (demo)").click();
  await boton(p, "Elegir quién te escribió").click();
  await p.getByRole("searchbox", { name: "Buscar cliente" }).fill("Ana de Ejemplo");
  await p.getByRole("button", { name: /^Ana de Ejemplo/ }).click();
  await boton(p, "Registrar pedido").click(); await p.getByText("Registrado.", { exact: true }).waitFor();
  d = await datos(p); const registrado = d.solicitudes.find(x => x.codigo === s.codigo).pedidoId; assert.ok(registrado);
  await p.goto(`${URL}/pedidos/${registrado}`); await boton(p, "Confirmar pedido").click();
  await boton(p, "Despachar pedido").click();
  await p.waitForFunction(({k,id}) => JSON.parse(localStorage.getItem(k)).pedidos.find(x=>x.id===id)?.estado === "despachado", {k:clave,id:registrado});
  await p.screenshot({ path: `${capturas}/pedido-${ancho}.png` });
  await p.reload(); assert.equal((await datos(p)).pedidos.find(x => x.id === registrado).estado, "despachado");
  await p.goto(`${URL}/`); await p.getByText("Deslizapp · ejemplo", { exact: true }).first().waitFor(); await p.screenshot({ path: `${capturas}/resumen-${ancho}.png` });
  await p.locator("[data-abrir-menu-tienda]").click();
  await p.getByRole("button", { name: /^Reiniciar datos de prueba/ }).click(); await p.getByRole("button", { name: /^¿Seguro\? Toca otra vez para reiniciar/ }).click();
  await p.waitForFunction(k => JSON.parse(localStorage.getItem(k)).productos.length === 9, clave);
  assert.equal(await p.evaluate(() => localStorage.getItem("deslizapp-demo-v5")), "fixture-anterior-intacto");
  assert.equal(await p.evaluate(() => localStorage.getItem("deslizapp-sesion-v1")), "a1000000-0000-4000-8000-000000000003");
  assert.equal((await datos(p)).solicitudes.length, 0);
  assert.equal(errores.length, 0, errores.join("; ")); assert.deepEqual(prohibidas, []);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  resultados.push({ ancho, paso: true, solicitudes: solicitudes.length, prohibidas }); console.log("✓ demo pública", ancho);
 } catch (e) {
  console.error("✗ demo pública", ancho, e.message); await p.screenshot({ path: `${capturas}/fallo-${ancho}.png` }); resultados.push({ ancho, paso: false, error: e.message, errores, prohibidas });
 } finally { await ctx.close(); }
}
// Entradas internas: cookies/flags falsificados nunca conceden acceso.
const ctx = await b.newContext({ serviceWorkers: "block" });
await ctx.addCookies([{ name: "deslizapp-demo-interna", value: "1", url: URL }]);
const p = await ctx.newPage();
for (const ruta of ["/admin-demo", "/admin-demo/trabajo", "/admin-demo/tiendas/fixture/catalogo", "/prueba", "/demo-interna", "/unirse/demo", "/tienda/esencias-michel?demo=interna", "/pedido/INTERNA-PRUEBA"]) {
 const r = await p.goto(URL + ruta, { timeout: 120000 }); assert.equal(r.status(), 404, ruta); assert.doesNotMatch(await leer(p), /Laboratorio de datos|Admin de la demo/);
}
const respuesta = await ctx.request.post(`${URL}/api/demo-interna`, { headers: { origin: URL } }); assert.equal(respuesta.status(), 403);
await ctx.close(); console.log("✓ rutas internas cerradas con cookie falsificada");
} finally { await b.close(); writeFileSync(`${capturas}/resultados.json`, JSON.stringify(resultados, null, 2)); }
assert.ok(resultados.every(r => r.paso), "Falló un recorrido de demo pública");
