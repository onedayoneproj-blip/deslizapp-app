// Prueba del catálogo por tipo (docs/prompts/catalogo-por-tipo-comprador.md), en la demo. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=360,390] node scripts/probar-catalogo-por-tipo.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const ANCHOS = (process.env.ANCHOS ?? "360,390").split(",").map(Number);
let fallos = 0;
const ok = (c, m) => { console.log((c ? "  ✅ " : "  ❌ ") + m); if (!c) fallos++; };

const b = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.addInitScript(() => { for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1"); });
  await page.goto(`${URL}/tienda/lino-y-algodon?demo`);
  await page.waitForSelector("#logo");
  await page.click("#logo");
  const tabs = page.locator('.gridtabs [role="tab"]');
  ok((await tabs.count()) === 3, "perfil: pestañas Todo + dos catálogos");
  ok((await tabs.first().getAttribute("aria-selected")) === "true", "Todo es la activa");
  await tabs.nth(1).click();
  ok((await page.locator("#grid .tile").count()) === 2 && (await page.textContent("#statCount")) === "2", "elegir un catálogo filtra cuadrícula y cifra");
  await page.keyboard.press("ArrowRight");
  ok((await tabs.nth(2).getAttribute("aria-selected")) === "true", "flecha derecha pasa a la siguiente");
  await tabs.first().click();
  await page.click("#backBtn");
  await page.click("#colTab");
  const fila = page.locator("#coBg .mc-fila");
  await fila.waitFor();
  await fila.click();
  ok((await page.locator('#coBg [role="menuitemradio"]').count()) === 3, "hoja: menú con Todo y los catálogos");
  await page.keyboard.press("Escape");
  ok((await page.locator(".mc-tarjeta").count()) === 0 && (await page.locator("#coBg").isVisible()), "Escape cierra solo el menú");
  await fila.click();
  await page.mouse.click(ancho / 2, 760);
  ok((await page.locator(".mc-tarjeta").count()) === 0 && (await page.locator("#coBg").isVisible()), "tocar fuera cierra solo el menú");
  await fila.click();
  await page.locator('[role="menuitemradio"]').nth(2).click();
  ok((await page.locator("#coBg").isVisible()) && (await page.locator("#coGrid .coitem").count()) === 2, "elegir filtra las colecciones y deja la hoja abierta");
  ok((await fila.textContent()).includes("Accesorios"), "la fila muestra el catálogo activo");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sin desborde horizontal");
  ok(errs.length === 0, "sin errores de página " + errs.join("|"));
  await ctx.close();

  const m = await b.newContext({ viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true });
  const p2 = await m.newPage();
  await p2.addInitScript(() => localStorage.setItem("dz-coach-esencias-michel", "1"));
  await p2.goto(`${URL}/tienda/esencias-michel?demo`);
  await p2.waitForSelector("#logo");
  await p2.click("#logo");
  ok((await p2.locator('.gridtabs [role="tab"]').count()) === 0 && (await p2.locator(".mc").count()) === 0, "un solo rubro: sin pestañas ni menú");
  await m.close();
}
await b.close();
if (fallos) { console.log(`\n${fallos} fallo(s)`); process.exit(1); }
