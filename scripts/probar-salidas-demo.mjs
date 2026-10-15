// Solo con probar-demo-interna: fixture local, sin Auth/cuentas/datos reales.
import assert from "node:assert/strict";
import { navegador, URL } from "./navegador-catalogo.mjs";
const b = await navegador(), c = await b.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: "block" });
const salidas = [], remotas = [];
await c.exposeBinding("registrarSalida", (_, tipo) => salidas.push(tipo));
await c.addInitScript(() => {
 localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-version-vista", "99.0.0"); localStorage.setItem("dz-coach-esencias-michel", "1");
 Object.defineProperty(navigator, "share", { configurable: true, value: () => { void window.registrarSalida("share"); return Promise.resolve(); } });
 window.open = url => { void window.registrarSalida(String(url)); return null; };
});
c.on("request", r => { if (/supabase\.co|wa\.me/.test(r.url())) remotas.push(r.url()); });
const p = await c.newPage(); p.setDefaultTimeout(30000); p.setDefaultNavigationTimeout(120000);
try {
 await p.goto(`${URL}/promos/a6000000-0000-4000-8000-000000000001/compartir`);
 await p.getByRole("button", { name: "Enviar", exact: true }).click(); await p.getByText("Envío simulado. En la demo nadie lo recibe.", { exact: true }).waitFor();
 assert.deepEqual(salidas, []); console.log("✓ promo: confirma la simulación, sin share nativo");
 await p.goto(`${URL}/catalogo`);
 await p.getByRole("button", { name: /Ver tu inventario/ }).click();
 await p.getByRole("button", { name: /Por reponer/ }).first().click();
 const lista = p.getByRole("list", { name: "Productos por reponer" }); await lista.waitFor();
 await lista.getByRole("checkbox").first().click();
 await p.getByRole("button", { name: "Enviar lista", exact: true }).click();
 await p.getByText("Envío simulado. En la demo nadie lo recibe.", { exact: true }).waitFor();
 assert.deepEqual(salidas, []); console.log("✓ reposición: confirma el envío simulado sin salidas");
 await p.goto(`${URL}/tienda/esencias-michel?demo`); await p.locator('[data-sharep="mayar"]').click();
 await p.getByText("Enlace copiado", { exact: true }).waitFor(); assert.deepEqual(salidas, []); console.log("✓ catálogo comprador: copia el enlace aislado, sin share nativo");
 await p.locator('[data-comments="mayar"]').click();
 await p.locator("#askInput").fill("¿Es una pregunta de prueba?");
 await p.locator("#cmBg").getByRole("button", { name: "Enviar", exact: true }).click();
 await p.locator("#cmBg").waitFor({ state: "hidden" });
 await p.getByText("Envío simulado. En la demo nadie lo recibe.", { exact: true }).waitFor();
 assert.deepEqual(salidas, []); console.log("✓ pregunta de catálogo: cierra y confirma la simulación");
 await p.goto(`${URL}/fixture-salidas-demo`); await p.getByRole("button", { name: "Abrir envío simulado", exact: true }).click();
 await p.getByRole("button", { name: "Enviar por WhatsApp", exact: true }).click();
 await p.getByText("Envío simulado. En la demo nadie lo recibe.", { exact: true }).waitFor();
 await p.getByRole("dialog").waitFor({ state: "hidden" });
 const registro = await p.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v5")).jugadaEnvios);
 assert.equal(registro.length, 1); assert.deepEqual(salidas, []); console.log("✓ jugada: registra localmente, cierra y confirma sin eventos de regreso de WhatsApp");
 await p.evaluate(() => {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  const original = window.matchMedia.bind(window); window.matchMedia = q => q === "(display-mode: standalone)" ? { ...original(q), matches: true } : original(q);
 });
 const descarga = p.waitForEvent("download"); await p.getByRole("button", { name: "Descarga demo", exact: true }).click(); await (await descarga).cancel();
 assert.deepEqual(salidas, []);
 await p.getByRole("button", { name: "Descarga normal", exact: true }).click(); await p.waitForTimeout(100); assert.deepEqual(salidas, ["share"]); salidas.length = 0;
 console.log("✓ descarga en PWA iPhone simulada: la demo descarga; el flujo normal conserva compartir");
 await p.goto(`${URL}/admin-demo/mas`); await p.getByRole("button", { name: "Crear enlace de tienda", exact: true }).click();
 await p.locator("[data-enlace-tienda-nuevo]").getByRole("button", { name: "Compartir", exact: true }).click();
 await p.getByText("Invitación simulada. En la demo nadie la recibe.", { exact: true }).waitFor();
 assert.deepEqual(salidas, []); assert.deepEqual(remotas, []); console.log("✓ invitación admin: simulada; cero salidas o solicitudes reales");
} finally { await c.close(); await b.close(); }
