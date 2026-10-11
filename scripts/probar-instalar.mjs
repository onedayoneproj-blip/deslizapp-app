import "../tests/cargar-ts.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url), { chromium } = require("playwright");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const URL = (process.env.URL ?? "http://localhost:3410").replace(/\/$/, "");
const OUT = process.argv[2] ?? "docs/capturas/instalar-ios-android"; mkdirSync(OUT, { recursive: true });
const ID = "a1000000-0000-4000-8000-000000000003";
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? undefined, args: ["--no-sandbox"] });
const ok = (v, t) => { assert(v, t); console.log("OK", t); };
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
async function abrir(ancho, { android = false, iphone = false, standalone = false, reducido = false, oscuro = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reducido ? "reduce" : "no-preference", colorScheme: oscuro ? "dark" : "light", ...(android ? { userAgent: UA_ANDROID } : iphone ? { userAgent: UA_IPHONE } : {}) });
  if (standalone) await ctx.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => { const r = mm(q); if (!q.includes("display-mode: standalone")) return r; return { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }; }; });
  const page = await ctx.newPage();
  const d = construirDesdeSeed(); const t = d.tiendas.find(t => t.id === ID);
  Object.assign(t, { onboarding: {}, logoUrl: null, descripcion: null, catalogoEstado: "sin" });
  d.productos = d.productos.filter(p => p.tiendaId !== ID);
  d.equipos = { ...d.equipos, [ID]: { miembros: [{ usuarioId: "yo", soyYo: true, rol: "dueno", nivel: "administrador", nombre: "Tú", email: "demo@ejemplo.com", desde: new Date().toISOString(), foto: null }], invitaciones: [], solicitudes: [], enlaces: [] } };
  await page.addInitScript(({ d, id }) => { localStorage.setItem("deslizapp-demo-v5", JSON.stringify(d)); localStorage.setItem("deslizapp-sesion-v1", id); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-version-vista", "99.0.0"); }, { d, id: ID });
  await page.goto(URL); await page.getByRole("button", { name: /deslizapp/ }).first().waitFor(); await page.waitForTimeout(600);
  return { ctx, page };
}
const abrirHoja = async (page, oscuro = false) => {
  if (oscuro) await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.getByRole("group", { name: "Capítulos de preparación" }).getByRole("button", { name: /Capítulo 4 ·/ }).click();
  await page.locator("[data-checklist]").getByRole("button", { name: /^Pantalla de inicio ·/ }).click();
  await page.getByRole("radiogroup", { name: "Tu teléfono" }).waitFor();
};
// La frase visible es la de opacidad más alta de la línea de tiempo CSS.
const pasoVisible = page => page.evaluate(() => [...document.querySelectorAll("[data-animacion-ios] .ins-cap")].map(e => [Number(getComputedStyle(e).opacity), e.innerText]).sort((a, b) => b[0] - a[0])[0][1]);
const animaciones = page => page.evaluate(() => document.querySelector("[data-animacion-ios]").getAnimations({ subtree: true }).map(a => a.playState));
const paso5 = "Deja Abrir como app web encendido y toca Añadir";
const falso = (resultado) => page => page.evaluate(r => {
  const e = new Event("beforeinstallprompt", { cancelable: true });
  e.prompt = async () => { window.__prompt = (window.__prompt ?? 0) + 1; };
  e.userChoice = Promise.resolve({ outcome: r });
  window.dispatchEvent(e);
}, resultado);
for (const ancho of [360, 390, 430]) for (const oscuro of [false, true]) {
  // iPhone: animación corre y se detiene al cerrar
  let { ctx, page } = await abrir(ancho, { oscuro }); await abrirHoja(page, oscuro);
  ok(await page.getByRole("radio", { name: "iPhone" }).getAttribute("aria-checked") === "true", `iPhone preseleccionado ${ancho}${oscuro ? " oscuro" : ""}`);
  const a = await pasoVisible(page); await page.waitForTimeout(2600); const b = await pasoVisible(page);
  ok(a !== b, "la animación avanza de momento (línea de tiempo CSS)");
  ok((await animaciones(page)).length > 10 && (await animaciones(page)).every(e => e === "running"), "hay animaciones CSS corriendo");
  ok(await page.evaluate(() => !!document.querySelector("[data-animacion-ios].ins-anim") && document.querySelector("[data-animacion-ios]").dataset.pausada === "false"), "no pausada con la pestaña visible");
  ok(await page.locator("[data-animacion-ios] ol.sr-only li").count() === 6, "seis pasos como lista accesible");
  ok(await page.evaluate(a => document.documentElement.scrollWidth <= a, ancho), "sin overflow horizontal");
  for (const [ms, n] of [[1500, 2], [1500, 3], [1800, 4], [1800, 5]]) { await page.waitForTimeout(ms); if (ancho === 390 && !oscuro) await page.screenshot({ path: `${OUT}/ios-momento-${n}.png` }); }
  await page.screenshot({ path: `${OUT}/ios-${ancho}${oscuro ? "-oscuro" : ""}.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  ok(await page.locator("[data-animacion-ios]").count() === 0, "al cerrar la hoja la animación se desmonta");
  await ctx.close();
}
{ // pestaña oculta: la línea de tiempo se pausa y al volver sigue
  const { ctx, page } = await abrir(390); await abrirHoja(page);
  const oculta = v => page.evaluate(v => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v ? "hidden" : "visible" }); document.dispatchEvent(new Event("visibilitychange")); }, v);
  await oculta(true); ok((await animaciones(page)).every(e => e === "paused"), "pestaña oculta: animaciones en pausa");
  await oculta(false); ok((await animaciones(page)).every(e => e === "running"), "pestaña visible: vuelven a correr"); await ctx.close();
}
{ // movimiento reducido: quieta en el paso 5
  const { ctx, page } = await abrir(390, { reducido: true }); await abrirHoja(page);
  await page.waitForTimeout(500); const a = await pasoVisible(page); await page.waitForTimeout(3000);
  ok(a.includes(paso5) && (await pasoVisible(page)).includes(paso5) && (await animaciones(page)).length === 0, "movimiento reducido: quieta en el paso 5, sin animaciones");
  await page.screenshot({ path: `${OUT}/ios-reducido.png` }); await ctx.close();
}
{ // Android sin evento: texto manual
  const { ctx, page } = await abrir(390, { android: true }); await abrirHoja(page);
  ok(await page.getByRole("radio", { name: "Android" }).getAttribute("aria-checked") === "true", "Android preseleccionado por UA");
  ok(await page.getByText(/Toca ⋮ y luego Instalar aplicación/).count() === 1, "sin evento: texto manual");
  ok(await page.getByRole("button", { name: "Instalar Deslizapp" }).count() === 0, "sin evento: sin botón");
  await ctx.close();
}
for (const resultado of ["accepted", "dismissed"]) { // evento simulado
  const { ctx, page } = await abrir(390, { android: true });
  await falso(resultado)(page); await abrirHoja(page);
  const boton = page.getByRole("button", { name: "Instalar Deslizapp" }); await boton.waitFor();
  await page.screenshot({ path: `${OUT}/android-boton.png` });
  await boton.click(); await page.waitForFunction(() => window.__prompt === 1);
  if (resultado === "accepted") {
    await page.getByRole("radiogroup", { name: "Tu teléfono" }).waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Capítulo 4 ·" }).count();
    ok(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("deslizapp-demo-v5")).tiendas.find(t => t.id === "a1000000-0000-4000-8000-000000000003").onboarding ?? {}).length > 0), "accepted: paso marcado y hoja cerrada");
  } else {
    await page.waitForTimeout(400);
    ok(await page.getByRole("radiogroup", { name: "Tu teléfono" }).count() === 1, "dismissed: la hoja sigue abierta");
    ok(await page.getByText(/Toca ⋮ y luego Instalar aplicación/).count() === 1, "dismissed: cae al texto manual (evento consumido)");
  }
  await ctx.close();
}
// Fila fija «Instalar app» del menú de la tienda
const abrirMenu = async page => { await page.getByRole("button", { name: /deslizapp/ }).first().click(); await page.getByRole("button", { name: /^Mi marca/ }).waitFor(); };
const fila = page => page.locator("[data-fila-instalar]");
{ // sin evento y en Android/escritorio: no hay fila
  const { ctx, page } = await abrir(390, { android: true }); await abrirMenu(page);
  ok(await fila(page).count() === 0, "menú: sin evento no hay fila Instalar app"); await ctx.close();
}
{ // instalada (standalone): no hay fila aunque haya evento
  const { ctx, page } = await abrir(390, { android: true, standalone: true }); await falso("accepted")(page); await abrirMenu(page);
  ok(await fila(page).count() === 0, "menú: instalada no muestra la fila"); await ctx.close();
}
{ // iPhone: la fila abre la hoja con la animación
  const { ctx, page } = await abrir(390, { iphone: true }); await abrirMenu(page);
  await page.screenshot({ path: `${OUT}/menu-ios.png` });
  await fila(page).click(); await page.getByRole("radiogroup", { name: "Tu teléfono" }).waitFor();
  ok(await page.locator("[data-animacion-ios]").count() === 1, "menú iPhone: la fila abre la hoja con la animación"); await ctx.close();
}
for (const resultado of ["accepted", "dismissed"]) {
  const { ctx, page } = await abrir(390, { android: true }); await falso(resultado)(page); await abrirMenu(page);
  await fila(page).waitFor(); await page.screenshot({ path: `${OUT}/menu-android.png` });
  await fila(page).click(); await page.waitForFunction(() => window.__prompt === 1);
  if (resultado === "accepted") {
    await page.getByText("Deslizapp ya está en tu pantalla de inicio.").waitFor();
    ok(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("deslizapp-demo-v5")).tiendas.find(t => t.id === "a1000000-0000-4000-8000-000000000003").onboarding ?? {}).includes("pantalla_inicio_en")), "menú accepted: marca pantalla_inicio_en");
  } else {
    await page.waitForTimeout(300);
    ok(await page.locator("[data-animacion-ios]").count() === 0, "menú dismissed: no marca ni abre nada");
    await abrirMenu(page).catch(() => {}); ok(await fila(page).count() === 0, "menú dismissed: sin evento la fila desaparece");
  }
  await ctx.close();
}
{ // appinstalled sin hoja: la fila desaparece sola
  const { ctx, page } = await abrir(390, { android: true }); await falso("accepted")(page); await page.evaluate(() => window.dispatchEvent(new Event("appinstalled"))); await abrirMenu(page);
  ok(await fila(page).count() === 0, "menú: appinstalled retira la fila"); await ctx.close();
}
await nav.close(); console.log("TODO OK");
