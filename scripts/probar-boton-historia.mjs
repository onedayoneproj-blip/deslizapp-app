// Botón «Agregar a historia» en Catálogo y vista previa tocable de «Tu historia» (PR #81), en la demo a 360 y 390. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [CAPTURAS=docs/capturas/boton-historia] node scripts/probar-boton-historia.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const ok = (c, m) => {
  console.log((c ? "  ✅ " : "  ❌ ") + m);
  if (!c) process.exitCode = 1;
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

for (const ancho of [360, 390]) {
  console.log(`\n${ancho} px`);
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript((tienda) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", tienda);
  }, MICHEL);
  await page.goto(`${URL}/catalogo`);
  const botones = page.locator('[aria-label^="Agregar"][aria-label$="a historia"]');
  await botones.first().waitFor();
  ok((await botones.count()) > 1, `${await botones.count()} botones «Agregar a historia»`);
  const caja = await botones.first().boundingBox();
  const tarjeta = await botones.first().locator("xpath=..").boundingBox();
  ok(caja.height >= 44, `toque de ${Math.round(caja.height)} px de alto`);
  ok(caja.width <= tarjeta.width * 0.8, `la píldora (${Math.round(caja.width)} px) ocupa menos del 80 % de la tarjeta (${Math.round(tarjeta.width)} px)`);
  const texto = await botones.first().innerText();
  console.log("  texto visible:", JSON.stringify(texto.trim()), `· tarjeta ${Math.round(tarjeta.width)} px`);
  ok(texto.trim() === "Historia", "en tarjetas de 2 columnas dice «Historia» (nunca «A historia»)");
  ok(await botones.first().evaluate((b) => { const t = b.querySelector("span span:not(.hidden)"); return t.scrollWidth <= t.clientWidth + 1 && b.getBoundingClientRect().right <= b.parentElement.getBoundingClientRect().right + 1; }), "el texto no se corta");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin desborde horizontal");
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${ancho}-1-catalogo.png`) });
  await botones.first().click();
  await page.waitForSelector('img[alt^="Vista previa"]', { timeout: 20000 });
  ok(await page.locator("[data-pildora-ajustar]").isVisible(), "la vista previa muestra la píldora «Ajustar»");
  const pv = await page.locator('button[aria-label^="Vista previa"]').boundingBox();
  const pil = await page.locator("[data-pildora-ajustar]").boundingBox();
  ok(pil.y - pv.y < 16 && pv.x + pv.width - (pil.x + pil.width) < 16, "la píldora «Ajustar» está en la esquina superior derecha");
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${ancho}-2-hoja.png`) });
  await page.locator('img[alt^="Vista previa"]').click();
  await page.locator("[data-marco-historia]").waitFor();
  ok(true, "tocar la vista previa abre «Ajustar foto»");
  ok((await page.getByText("Pellizca para acercar o alejar y arrastra para mover.").isVisible()), "texto de ayuda visible");
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${ancho}-3-ajustar.png`) });
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Vista previa" }).click();
  await page.locator("[data-marco-historia]").waitFor();
  ok(true, "se puede abrir otra vez desde la vista previa");
  await page.getByRole("button", { name: "Cancelar" }).click();
  ok((await page.getByRole("button", { name: "Ajustar foto", exact: true }).count()) === 0, "ya no hay botón grande «Ajustar foto» debajo");
  ok(errores.length === 0, `sin errores de página ${errores.join("|")}`);
  await ctx.close();
}
await navegador.close();
