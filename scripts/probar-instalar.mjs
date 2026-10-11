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
const UA_CRIOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
async function abrir(ancho, { android = false, iphone = false, crios = false, antesDeHidratar = false, standalone = false, reducido = false, oscuro = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reducido ? "reduce" : "no-preference", colorScheme: oscuro ? "dark" : "light", ...(android ? { userAgent: UA_ANDROID } : crios ? { userAgent: UA_CRIOS } : iphone ? { userAgent: UA_IPHONE } : {}) });
  if (standalone) await ctx.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => { const r = mm(q); if (!q.includes("display-mode: standalone")) return r; return { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } }; }; });
  if (antesDeHidratar) await ctx.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { const e = new Event("beforeinstallprompt", { cancelable: true }); e.prompt = async () => { window.__prompt = (window.__prompt ?? 0) + 1; }; e.userChoice = Promise.resolve({ outcome: "accepted" }); window.dispatchEvent(e); }));
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
  await page.getByRole("tablist", { name: "Tu teléfono" }).waitFor();
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
  ok(await page.getByRole("tab", { name: "iPhone" }).getAttribute("aria-selected") === "true", `iPhone preseleccionado ${ancho}${oscuro ? " oscuro" : ""}`);
  const a = await pasoVisible(page); await page.waitForTimeout(2600); const b = await pasoVisible(page);
  ok(a !== b, "la animación avanza de momento (línea de tiempo CSS)");
  ok((await animaciones(page)).length > 10 && (await animaciones(page)).every(e => e === "running"), "hay animaciones CSS corriendo");
  ok(await page.evaluate(() => !!document.querySelector("[data-animacion-ios].ins-anim") && document.querySelector("[data-animacion-ios]").dataset.pausada === "false"), "no pausada con la pestaña visible");
  ok(await page.locator("[data-animacion-ios] ol.sr-only li").count() === 6, "seis pasos como lista accesible");
  ok(await page.evaluate(a => document.documentElement.scrollWidth <= a, ancho), "sin overflow horizontal");
  { // selector: barra de filtros como en Inicio (ancho de la hoja, sin barra horizontal propia), cambiar de pestaña sin saltos
    const tl = page.getByRole("tablist", { name: "Tu teléfono" });
    const m = await tl.evaluate(e => { const r = e.getBoundingClientRect(), v = e.parentElement; return { w: r.width, x: r.x, scroll: v.scrollWidth <= v.clientWidth + 1, vw: innerWidth }; });
    ok(m.scroll && m.x >= 0 && m.x + m.w <= m.vw + 1, "selector: cabe en la hoja sin scroll horizontal");
    const antes = await page.evaluate(() => scrollY);
    await page.getByRole("tab", { name: "Android" }).click(); await page.waitForTimeout(500);
    ok(await page.getByRole("tab", { name: "Android" }).getAttribute("aria-selected") === "true", "selector: cambia a Android");
    ok(await page.locator("[data-animacion-ios]").count() === 0, "selector: la animación se desmonta al cambiar de pestaña");
    await page.screenshot({ path: `${OUT}/selector-${ancho}${oscuro ? "-oscuro" : ""}.png` });
    await page.getByRole("tab", { name: "iPhone" }).click(); await page.waitForTimeout(300);
    ok(await page.evaluate(() => scrollY) === antes, "selector: cambiar de pestaña no desplaza la página");
  }
  for (const [ms, n] of [[1500, 2], [1500, 3], [1800, 4], [1800, 5]]) { await page.waitForTimeout(ms); if (ancho === 390 && !oscuro) await page.screenshot({ path: `${OUT}/ios-momento-${n}.png` }); }
  await page.screenshot({ path: `${OUT}/ios-${ancho}${oscuro ? "-oscuro" : ""}.png` });
  // Medidas con la línea de tiempo congelada en cada momento (los 6 pasos): toque dentro de su objetivo y pie centrado en la tarjeta
  for (let n = 1; n <= 6; n++) {
    await page.evaluate(n => document.querySelector("[data-animacion-ios]").getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = (n - 1) * 2200 + 1300; }), n);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(n => {
      const c = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
      const raiz = document.querySelector("[data-animacion-ios]");
      const tarjeta = c(raiz.querySelector("[data-tarjeta]").getBoundingClientRect());
      const pie = raiz.querySelector(`.ins-cap.ins-d${n}`);
      const toque = raiz.querySelector(`.ins-toque.ins-d${n}`);
      const t = toque && { ...c(toque.getBoundingClientRect()), op: Number(getComputedStyle(toque).opacity), obj: toque.closest("[data-objetivo]")?.getBoundingClientRect() };
      return { tarjeta, pieOp: Number(getComputedStyle(pie).opacity), num: c(pie.querySelector("[data-pie-numero]").getBoundingClientRect()), txt: c(pie.querySelector("[data-pie-texto]").getBoundingClientRect()), t };
    }, n);
    ok(m.pieOp === 1, `momento ${n}: el pie de frase es visible`);
    ok(Math.abs(m.num.x - m.tarjeta.x) <= 2 && Math.abs(m.txt.x - m.tarjeta.x) <= 2, `momento ${n}: número y frase centrados en la tarjeta (${ancho} px)`);
    if (n < 6) {
      const { t } = m;
      ok(t && t.op > 0.5 && t.obj && t.x >= t.obj.x - 4 && t.x <= t.obj.x + t.obj.width + 4 && t.y >= t.obj.y - 4 && t.y <= t.obj.y + t.obj.height + 4, `momento ${n}: el toque cae dentro de su objetivo (${ancho} px)`);
      ok(Math.abs(t.x - (t.obj.x + t.obj.width / 2)) <= 4 && Math.abs(t.y - (t.obj.y + t.obj.height / 2)) <= 4, `momento ${n}: el toque está centrado en su objetivo`);
    }
    if ((n === 3 || n === 5) && ancho === 390 && !oscuro) await page.screenshot({ path: `${OUT}/ios-toque-momento-${n}.png` });
  }
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
{ // movimiento reducido: los seis pasos como lista visible, sin ilustración ni lista sr-only duplicada
  const { ctx, page } = await abrir(390, { reducido: true }); await abrirHoja(page);
  await page.waitForTimeout(500);
  const v = await page.evaluate(() => { const r = document.querySelector("[data-animacion-ios]"); const vis = e => !!e && getComputedStyle(e).display !== "none"; return { lista: vis(r.querySelector("[data-pasos-visibles]")), items: r.querySelectorAll("[data-pasos-visibles] li").length, tarjeta: vis(r.querySelector("[data-tarjeta]")), sr: vis(r.querySelector("ol.sr-only")) }; });
  ok(v.lista && v.items === 6 && !v.tarjeta && !v.sr && (await animaciones(page)).length === 0, "movimiento reducido: seis pasos visibles en lista, sin ilustración ni duplicado sr-only, sin animaciones");
  ok((await page.locator("[data-pasos-visibles]").innerText()).includes(paso5), "movimiento reducido: la lista incluye el paso 5");
  await page.screenshot({ path: `${OUT}/ios-reducido.png` }); await ctx.close();
}
{ // Android sin evento: texto manual
  const { ctx, page } = await abrir(390, { android: true }); await abrirHoja(page);
  ok(await page.getByRole("tab", { name: "Android" }).getAttribute("aria-selected") === "true", "Android preseleccionado por UA");
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
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled"))); // Chrome lo emite justo después: no debe duplicar el aviso
    await page.getByRole("tablist", { name: "Tu teléfono" }).waitFor({ state: "hidden" });
    await page.waitForTimeout(600);
    ok(await page.getByText("Deslizapp ya está en tu pantalla de inicio.").count() === 1, "hoja accepted: un solo aviso aunque llegue appinstalled");
    await page.getByRole("button", { name: "Capítulo 4 ·" }).count();
    ok(await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("deslizapp-demo-v5")).tiendas.find(t => t.id === "a1000000-0000-4000-8000-000000000003").onboarding ?? {}).length > 0), "accepted: paso marcado y hoja cerrada");
  } else {
    await page.waitForTimeout(400);
    ok(await page.getByRole("tablist", { name: "Tu teléfono" }).count() === 1, "dismissed: la hoja sigue abierta");
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
  await fila(page).click(); await page.getByRole("tablist", { name: "Tu teléfono" }).waitFor();
  await page.waitForTimeout(1200);
  ok(await page.locator("[data-animacion-ios]").count() === 1, "menú iPhone: la fila abre la hoja con la animación y se queda abierta"); await ctx.close();
}
for (const resultado of ["accepted", "dismissed"]) {
  const { ctx, page } = await abrir(390, { android: true }); await falso(resultado)(page); await abrirMenu(page);
  await fila(page).waitFor(); await page.screenshot({ path: `${OUT}/menu-android.png` });
  await fila(page).click(); await page.waitForFunction(() => window.__prompt === 1);
  if (resultado === "accepted") {
    await page.getByText("Deslizapp ya está en tu pantalla de inicio.").waitFor();
    ok(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("deslizapp-demo-v5")).tiendas.find(t => t.id === "a1000000-0000-4000-8000-000000000003").onboarding ?? {}).includes("pantalla_inicio_en")), "menú accepted: marca pantalla_inicio_en");
  } else {
    await page.getByRole("tablist", { name: "Tu teléfono" }).waitFor();
    ok(await page.getByText(/Toca ⋮ y luego Instalar aplicación/).count() === 1, "menú dismissed: abre la hoja con la guía manual");
    ok(!(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("deslizapp-demo-v5")).tiendas.find(t => t.id === "a1000000-0000-4000-8000-000000000003").onboarding ?? {}).includes("pantalla_inicio_en"))), "menú dismissed: no marca el paso");
    await page.waitForTimeout(1000);
    ok(await page.getByRole("tablist", { name: "Tu teléfono" }).count() === 1, "menú dismissed: la hoja se queda abierta");
    await page.keyboard.press("Escape"); await page.waitForTimeout(1200);
    ok(await page.evaluate(() => document.activeElement?.hasAttribute("data-abrir-menu-tienda")), "al cerrar la hoja (sin fila) el foco vuelve al botón del menú de la tienda");
  }
  await ctx.close();
}
{ // appinstalled sin hoja: la fila desaparece sola
  const { ctx, page } = await abrir(390, { android: true }); await falso("accepted")(page); await page.evaluate(() => window.dispatchEvent(new Event("appinstalled"))); await abrirMenu(page);
  ok(await fila(page).count() === 0, "menú: appinstalled retira la fila"); await ctx.close();
}
{ // evento emitido antes de hidratar: el botón aparece sin recargar
  const { ctx, page } = await abrir(390, { android: true, antesDeHidratar: true }); await abrirMenu(page);
  ok(await fila(page).count() === 1, "evento antes de hidratar: la fila aparece sin recargar"); await ctx.close();
}
{ // iPhone con Chrome (CriOS): avisa de abrirla en Safari
  const { ctx, page } = await abrir(390, { crios: true }); await abrirMenu(page); await fila(page).click(); await page.getByRole("tablist", { name: "Tu teléfono" }).waitFor();
  ok(await page.getByText("Ábrela en Safari.").count() === 1, "CriOS: «Ábrela en Safari.»"); await ctx.close();
}
{ // iPhone Safari: no avisa; un appinstalled viejo no cierra la hoja al abrirla solo para leer
  const { ctx, page } = await abrir(390, { iphone: true }); await page.evaluate(() => window.dispatchEvent(new Event("appinstalled"))); await abrirMenu(page); await fila(page).click(); await page.getByRole("tablist", { name: "Tu teléfono" }).waitFor();
  await page.waitForTimeout(800);
  ok(await page.getByText("Ábrela en Safari.").count() === 0, "Safari: sin aviso de abrir en Safari");
  ok(await page.getByRole("tablist", { name: "Tu teléfono" }).count() === 1, "appinstalled viejo: la hoja no se cierra sola"); await ctx.close();
}
await nav.close(); console.log("TODO OK");
