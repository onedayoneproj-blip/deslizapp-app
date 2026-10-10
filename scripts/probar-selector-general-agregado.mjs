// Selector del panel: menú, scroll, «De todo» y General agregado. Solo usa localStorage demo.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-selector-general-agregado.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }

const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const TIENDA = "a1000000-0000-4000-8000-000000000003";
const MENU = "[data-menu-flotante]";
const ok = (cond, mensaje) => { console.log((cond ? "  ✅ " : "  ❌ ") + mensaje); if (!cond) throw new Error(mensaje); };
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const base = construirDesdeSeed();
const tiendaBase = base.tiendas.find((t) => t.id === TIENDA);
tiendaBase.rubros = [...new Set([...tiendaBase.rubros, "general", "hogar"])];
const tiendaB = base.tiendas.find((t) => t.id !== TIENDA);
const rubroGuardadoB = tiendaB.rubro === "ropa" ? "accesorios" : "ropa";
tiendaB.rubros = [...new Set([tiendaB.rubro, rubroGuardadoB])];
const compartido = base.productos.find((p) => p.tiendaId === TIENDA && (!p.rubro || p.rubro === tiendaBase.rubro));
base.productos.push({ ...compartido, rubro: "general" });

for (const ancho of [360, 390]) {
  console.log(`\n=== ${ancho}px ===`);
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(({ tienda, datos }) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", tienda);
    localStorage.setItem("deslizapp-demo-v5", JSON.stringify(datos));
    localStorage.setItem(`deslizapp-catalogo-activo:${datos.tiendas.find((t) => t.id !== tienda).id}`, datos.tiendas.find((t) => t.id !== tienda).rubros[1]);
  }, { tienda: TIENDA, datos: base });
  await page.goto(`${URL}/catalogo`);
  const selector = "h1 [data-selector-catalogo]";
  await page.waitForSelector(selector);

  const abrir = async () => { await page.locator(selector).tap(); await page.waitForSelector(MENU); };
  const elegir = async (texto) => {
    await abrir();
    await page.locator(`${MENU} button`).filter({ hasText: texto }).first().tap();
    await page.waitForTimeout(200);
  };
  const nombreActivo = async (sel = selector) => ((await page.locator(sel).getAttribute("aria-label")) ?? "").replace(/^[^:]+: /, "").replace(/\. Cambiar$/, "");

  await abrir();
  const opciones = (await page.locator(`${MENU} button`).allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim());
  ok(opciones.join() === "General 4,Ropa 2,Accesorios 2,De todo 1,Hogar 0,Lo que vendes", "el menú distingue General, De todo y los catálogos físicos");
  await page.keyboard.press("Escape");

  await elegir("De todo");
  ok((await nombreActivo()) === "De todo", "el rubro físico general se muestra como De todo");
  ok((await page.getByPlaceholder("Busca en De todo").count()) === 1, "el buscador conserva el contexto de De todo");
  const idsDeTodo = await page.locator("ul.grid a[href^='/catalogo/']").evaluateAll((xs) => xs.map((x) => x.getAttribute("href")));
  ok(idsDeTodo.length === 1, "De todo conserva su producto físico");
  await page.reload();
  await page.waitForSelector(selector);
  ok((await nombreActivo()) === "De todo", "la selección guardada del rubro general permanece");

  await elegir("General");
  const idsGeneral = await page.locator("ul.grid a[href^='/catalogo/']").evaluateAll((xs) => xs.map((x) => x.getAttribute("href")));
  ok(idsGeneral.length === 4 && new Set(idsGeneral).size === 4, "General agrega todos los catálogos y deduplica el producto compartido");
  ok((await page.getByPlaceholder("Busca en General").count()) === 1, "la vista combinada aparece como General");
  await page.reload();
  await page.waitForSelector(selector);
  ok((await nombreActivo()) === "General", "la selección virtual también persiste al volver");

  const cambiarTienda = async (nombre) => {
    await page.locator("header button").first().tap();
    await page.locator('ul[aria-label="Tus otras tiendas"] button').filter({ hasText: nombre }).tap();
    await page.waitForTimeout(250);
  };
  await cambiarTienda(tiendaB.nombre);
  ok((await nombreActivo()) === nombreCatalogoEsperado(rubroGuardadoB), "al cambiar de tienda se restaura la selección guardada de B, no General de A");
  await cambiarTienda(tiendaBase.nombre);
  ok((await nombreActivo()) === "General", "al volver a A se restaura su vista General guardada");

  await page.goto(`${URL}/catalogo/nuevo`);
  const selectorHoja = "[data-hoja-cabecera] [data-selector-catalogo]";
  await page.waitForSelector(selectorHoja);
  ok((await nombreActivo(selectorHoja)) === "Ropa", "crear desde la vista General usa el rubro principal real");
  await page.locator(selectorHoja).tap();
  await page.waitForSelector(MENU);
  const opcionesHoja = (await page.locator(`${MENU} button`).allInnerTexts()).map((s) => s.replace(/\s+/g, " ").trim());
  ok(!opcionesHoja.some((s) => /^General\b/.test(s)) && opcionesHoja.some((s) => /^De todo\b/.test(s)), "la ficha muestra De todo como rubro y no ofrece la vista agregada");
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: ancho, height: 260 });
  await page.goto(`${URL}/catalogo`);
  await page.waitForSelector(selector);
  await page.evaluate(() => window.scrollTo(0, 0));
  await abrir();
  const scrollInterno = await page.locator(MENU).evaluate((el) => {
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTop = max;
    return max;
  });
  await page.waitForTimeout(120);
  ok(scrollInterno > 0 && (await page.locator(MENU).count()) === 1, "recorrer el menú con scroll interno no lo cierra");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: ancho, height: 844 });
  await page.waitForTimeout(120);
  await page.evaluate(() => window.scrollTo(0, 0));
  await abrir();
  await page.evaluate(() => window.scrollTo(0, Math.min(220, document.documentElement.scrollHeight - innerHeight)));
  await page.waitForTimeout(180);
  ok((await page.locator(MENU).count()) === 0 && (await page.locator(selector).getAttribute("aria-expanded")) === "false", "desplazarse por la página cierra el menú");
  await elegir("Hogar");
  ok((await nombreActivo()) === "Hogar" && /Todavía no hay nada en Hogar/.test(await page.locator("body").innerText()), "la navegación conserva el catálogo vacío elegido");
  ok(errores.length === 0, "sin errores JavaScript: " + errores.join("; "));
  await contexto.close();
}

await navegador.close();
console.log("\nTodo bien.");

function nombreCatalogoEsperado(rubro) {
  return rubro === "general" ? "De todo" : rubro[0].toUpperCase() + rubro.slice(1);
}
