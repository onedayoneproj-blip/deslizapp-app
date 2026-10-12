// Flujo de creación como una historia. Demo, anchos 360/390/430 px.
// URL=http://localhost:3000 [CAPTURAS=docs/capturas/crear-producto-codex] node scripts/probar-crear-producto.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const ok = (condition, message) => { console.log(`${condition ? "✅" : "❌"} ${message}`); if (!condition) throw new Error(message); };
const browser = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const captura = async (page, nombre) => { if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, nombre), fullPage: false }); };
const medir = async (page, paso) => {
  if (![390, 393].includes(page.viewportSize().width)) return;
  const m = await page.evaluate(() => {
    const rect = (selector) => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height) }; };
    return { tarjeta: rect("[data-foto-principal], [data-tarjeta-historia]:not([data-tarjeta-historia='foto'])"), titulo: rect("[data-momento-historia] h2:not(.sr-only)"), campo: rect("[data-momento-historia] input[placeholder], [data-momento-historia] [data-precio], [data-momento-historia] .flex.items-center.gap-1"), avance: rect("[aria-label^='Momento']"), boton: rect(".hoja-abajo button") };
  });
  console.log(`📐 ${page.viewportSize().width}×${page.viewportSize().height} ${paso}: ${JSON.stringify(m)}`);
};
for (const width of [360, 390, 393, 430]) {
  const height = width === 360 ? 640 : width === 393 ? 852 : 844;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((teclado) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003");
    const vv = window.visualViewport;
    let abierto = false;
    Object.defineProperty(vv, "height", { get: () => abierto ? innerHeight - teclado : innerHeight, configurable: true });
    window.__teclado = (valor) => { abierto = valor; vv.dispatchEvent(new Event("resize")); vv.dispatchEvent(new Event("scroll")); };
  }, 336);
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.locator("[data-entrada-medios]").setInputFiles(join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg"));
  await page.waitForSelector("[data-foto-principal]");
  ok(await page.locator("[data-foto-principal]").evaluate((e) => Math.round(e.getBoundingClientRect().height)) === 372, `${width}px: tarjeta de foto mide 372px`);
  ok(await page.getByRole("button", { name: "Seguir" }).isVisible(), `${width}px: controles fijos de la historia`);
  if (width === 390) { await medir(page, "foto"); await captura(page, "b1-foto-390.png"); }
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Vestido de prueba");
  if (width === 390) { await medir(page, "nombre"); await captura(page, "b2-nombre-390.png"); }
  await page.getByRole("button", { name: "Seguir" }).click();
  const priceCard = page.locator("[data-tarjeta-historia]").first();
  const priceBox = await priceCard.boundingBox();
  ok(Math.round(priceBox.width) === Math.min(350, width - 40) && Math.round(priceBox.height) === 372, `${width}px: tarjeta de preguntas mide 350×372`);
  await page.getByPlaceholder("Escribe el precio").fill("1450");
  if (width === 390) { await medir(page, "precio"); await captura(page, "b3-precio-390.png"); }
  if (width === 360) {
    await page.evaluate(() => window.__teclado?.(true));
    await captura(page, "precio-teclado-360.png");
    await page.evaluate(() => window.__teclado?.(false));
  }
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Agregar una unidad" }).click();
  if (width === 390) { await medir(page, "stock"); await captura(page, "b4-stock-390.png"); }
  const cardSizes = await page.locator("[data-tarjeta-historia]").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  ok(cardSizes.every(([w, h]) => w === Math.min(350, width - 40) && h === 372), `${width}px: geometría estable entre preguntas (${JSON.stringify(cardSizes)})`);
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.locator("[data-reel-reducido]").waitFor();
  const reelBox = await page.locator("[data-reel-reducido]").boundingBox();
  ok(Math.round(reelBox.width) === Math.min(350, width - 40) && Math.round(reelBox.height) === 440, `${width}px: reel real dentro de marco de 440px`);
  ok(await page.locator("[data-reel-reducido] iframe").getAttribute("src") === "/vista-previa-catalogo", `${width}px: vista usa el reel del catálogo`);
  await page.waitForFunction(() => document.querySelector("[data-reel-reducido] iframe")?.contentDocument?.body?.innerText.includes("Vestido de prueba"), { timeout: 10000 });
  if (width === 390) { await medir(page, "vista"); await captura(page, "b5-vista-catalogo-390.png"); }
  ok(!(await page.getByText("Agotado", { exact: true }).count()), `${width}px: la creación no muestra el sello Agotado`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: no hay desborde horizontal`);
  if (width === 390) {
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.getByText("¡Ya está en tu catálogo!", { exact: true }).last().waitFor();
    await captura(page, "b6-celebracion-390.png");
    await page.getByRole("button", { name: "Agregar otro" }).click();
    await page.locator("[data-momento-historia='1']").waitFor();
    ok(await page.locator("[data-historia-crear] input[placeholder='El nombre de tu producto']").count() === 0, "Agregar otro reinicia la historia");
  }
  await context.close();
  if (errors.length) throw new Error(`${width}px: errores de página: ${errors.join(" | ")}`);
}
// «Por encargo»: plazo Otro, preview real, atrás y volver conservan el texto.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.locator("[data-entrada-medios]").setInputFiles(join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg"));
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Vestido por encargo");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("Escribe el precio").fill("1450");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("radio", { name: "Otro" }).click();
  await page.getByPlaceholder("Escríbelo en hasta 40 letras").fill("Llega en 7 días");
  if (CAPTURAS) await captura(page, "b5a-plazo-por-encargo-390.png");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.waitForFunction(() => document.querySelector("[data-reel-reducido] iframe")?.contentDocument?.body?.innerText.includes("Vestido por encargo"), { timeout: 10000 });
  ok(await page.locator("[data-reel-reducido]").count() === 1, "Por encargo: llega a la vista previa del reel");
  if (CAPTURAS) await captura(page, "b5b-reel-por-encargo-390.png");
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  ok(await page.getByPlaceholder("Escríbelo en hasta 40 letras").inputValue() === "Llega en 7 días", "Por encargo: el plazo Otro se conserva al apagar y volver a encender");
  await context.close();
}

// Se permite guardar sin foto; queda oculto y no exige publicar.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Producto sin foto");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("Escribe el precio").fill("600");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Agregar una unidad" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Guardar sin publicar" }).click();
  await page.getByText("Producto sin foto ya está guardado, oculto del catálogo.", { exact: true }).waitFor();
  if (CAPTURAS) await captura(page, "sin-foto-oculto-390.png");
  console.log("✅ Se puede guardar sin foto y queda oculto");
  await context.close();
}
await browser.close();
