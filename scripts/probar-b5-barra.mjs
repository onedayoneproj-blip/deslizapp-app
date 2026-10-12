// B5: una barra de avance entre los botones, sin mover el contenido. Demo local.
// CHROMIUM_PATH=/usr/bin/chromium URL=http://localhost:3100 node scripts/probar-b5-barra.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { nuevoHastaPrecio } from "./recorrido-historia-producto.mjs";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const URL = process.env.URL ?? "http://localhost:3100";
const capturas = "docs/capturas/crear-producto-codex";
mkdirSync(capturas, { recursive: true });
const ok = (valor, texto) => { if (!valor) throw new Error(texto); console.log(`✅ ${texto}`); };
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const width of [360, 390, 393, 430]) {
    const height = width === 360 ? 640 : width === 393 ? 852 : 844;
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.route("**/api/version", (route) => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem("deslizapp-version-vista", "9.9.9");
      localStorage.setItem("deslizapp-modo-v1", "demo");
      localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003");
    });
    await nuevoHastaPrecio(page, URL, "Vestido de prueba", "1450");
    await page.getByRole("button", { name: "Seguir", exact: true }).click();
    await page.getByRole("button", { name: "Agregar una unidad", exact: true }).click();
    await page.getByRole("button", { name: "Seguir", exact: true }).click();
    await page.frameLocator("[data-reel-reducido] iframe").locator("article.reel .media").waitFor();
    await page.locator("[data-hoja-contenido]").evaluate((el) => el.scrollTo(0, 0));
    await page.waitForFunction(() => Math.round(document.querySelector("[data-tarjeta-historia]").getBoundingClientRect().top) === 100);
    const avance = page.locator("[aria-label^='Momento ']").filter({ has: page.getByRole("progressbar") });
    ok(await avance.count() === 1, `${width}: una sola barra de avance`);
    const barra = await avance.boundingBox();
    const atras = await page.getByRole("button", { name: "Atrás", exact: true }).boundingBox();
    const cerrar = await page.getByRole("button", { name: "Cerrar", exact: true }).boundingBox();
    const contenido = await page.locator("[data-tarjeta-historia]").boundingBox();
    const reel = await page.locator("[data-reel-reducido]").boundingBox();
    const publicar = await page.getByRole("button", { name: "Publicar", exact: true }).boundingBox();
    console.log(`📐 ${width}×${height}: ${JSON.stringify({ barra, atras, cerrar, contenido, reel, publicar })}`);
    ok(barra.x >= atras.x + atras.width + 8 && barra.x + barra.width <= cerrar.x - 8, `${width}: barra separada al menos 8 px de Atrás y cerrar`);
    ok(barra.y === 74 && barra.height === 3, `${width}: altura y posición vertical de barra conservadas`);
    ok(Math.abs(contenido.y - 100) < 0.1 && Math.abs(reel.y - 131.5) < 0.1, `${width}: contenido y Reel conservan top 100/131.5`);
    ok(Math.abs(reel.width - Math.min(350, width - 40)) < 0.1 && Math.abs(reel.height - 440 * reel.width / 350) < 0.1, `${width}: tamaño del Reel conservado`);
    ok(publicar.width === width - 40 && publicar.y === height - 112, `${width}: Publicar conserva su posición y ancho`);
    await page.screenshot({ path: join(capturas, `b5-barra-separada-${width}.png`) });
    if (width === 390) for (const nombre of ["b5-vista-catalogo-390.png", "b5-pastillas-390.png"]) await page.screenshot({ path: join(capturas, nombre) });
    await ctx.close();
  }
} finally { await browser.close(); }
