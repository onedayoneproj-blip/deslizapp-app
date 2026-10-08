// Ficha técnica y descripción (docs/prompts/ficha-tecnica.md), en la demo: el catálogo del comprador (descripción con «…», círculo
// y píldora de la ficha, visor con zoom) y el panel (crear un producto con descripción y ficha, editar uno de Michel). Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=390,360] [CAPTURAS=/tmp/capturas] node scripts/probar-ficha.mjs
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
const ANCHOS = (process.env.ANCHOS ?? "390,360").split(",").map(Number);
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const LINO_ID = "a1000000-0000-4000-8000-000000000003";
const MICHEL_ID = "a1000000-0000-4000-8000-000000000001";
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const b = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
// Una imagen de prueba (PNG 2×2) para subir como ficha.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4EIwDiqEAUAAFgyA/0Y3f8aAAAAAElFTkSuQmCC", "base64");

async function abrir(ancho, url, sesion) {
  const ctx = await b.newContext({ serviceWorkers: "block", viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript((sesion) => {
    for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1");
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    if (sesion) localStorage.setItem("deslizapp-sesion-v1", sesion);
  }, sesion);
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(URL + url);
  return { ctx, page, errores };
}
const captura = async (page, nombre, ancho) => {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}-${ancho}.png` });
};
const reel = (page, slug) => page.locator(`#r-${slug}`);

async function catalogo(ancho) {
  console.log(`\nCatálogo del comprador · ${ancho}`);
  const { ctx, page, errores } = await abrir(ancho, "/tienda/lino-y-algodon?demo#p/pantalon-de-algodon");
  await page.waitForSelector("#r-pantalon-de-algodon.on");
  await page.waitForTimeout(700);
  // Con presentaciones y ficha: texto con «…» + «Ver presentaciones» + círculo.
  let r = reel(page, "pantalon-de-algodon");
  ok((await r.locator("p.txt").count()) === 1, "Con presentaciones, la descripción se ve bajo el precio");
  const mas = r.locator("[data-more]");
  ok((await mas.innerText()).trim() === "…" && !(await r.locator("p.txt").innerText()).includes("más"), "Termina en «…», sin la palabra «más»");
  ok((await mas.getAttribute("aria-label")) === "Ver la descripción completa", "El «…» se anuncia como «Ver la descripción completa»");
  ok(await mas.evaluate((el) => { const c = getComputedStyle(el, "::after"); return parseFloat(c.width) >= 44 && parseFloat(c.height) >= 44; }), "…con área de toque de 44 px");
  const circulo = r.locator(".ficha-btn.circulo");
  ok((await circulo.count()) === 1 && (await circulo.getAttribute("aria-label")) === "Ver la ficha técnica", "Círculo de la ficha, con aria-label");
  ok((await r.locator(".pres-fila-cap .pres-btn").count()) === 1, "…al lado de «Ver presentaciones»");
  ok(await circulo.evaluate((el) => { const c = el.getBoundingClientRect(); return c.width >= 44 && c.height >= 44; }), "…de 44 px o más");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "La página no se desborda");
  await captura(page, "1-reel-con-presentaciones", ancho);
  // El «…» abre el detalle.
  await mas.tap();
  await r.locator(".panel").waitFor({ state: "visible" });
  ok(true, "Tocar «…» abre el detalle");
  await r.locator("[data-less]").tap();
  // El visor.
  await circulo.tap();
  const visor = page.locator("#fichaBg");
  await visor.waitFor();
  ok((await visor.locator(".ficha-tit").innerText()).includes("Ficha técnica") && (await visor.locator(".ficha-tit").innerText()).includes("Pantalón de algodón"), "Visor: título «Ficha técnica» con el nombre del producto");
  ok(((await visor.locator("img").getAttribute("src")) ?? "").includes("ficha-pantalon"), "…con la foto de la ficha");
  const escena = visor.locator("[data-ficha-escena]");
  ok((await escena.getAttribute("data-zoom")) === "1.00", "Empieza ajustada");
  await captura(page, "3-visor", ancho);
  const caja = await escena.boundingBox();
  const cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
  await page.touchscreen.tap(cx + 40, cy + 30);
  await page.waitForTimeout(250);
  ok(Number(await escena.getAttribute("data-zoom")) > 2, "Un toque acerca");
  await page.touchscreen.tap(cx, cy);
  await page.waitForTimeout(250);
  ok((await escena.getAttribute("data-zoom")) === "1.00", "Otro toque vuelve a ajustar");
  // Pellizcar con dos dedos (CDP).
  const cdp = await ctx.newCDPSession(page);
  const tp = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
  await tp("touchStart", [{ x: cx - 30, y: cy, id: 1 }, { x: cx + 30, y: cy, id: 2 }]);
  for (let i = 1; i <= 8; i++) {
    await tp("touchMove", [{ x: cx - 30 - i * 12, y: cy, id: 1 }, { x: cx + 30 + i * 12, y: cy, id: 2 }]);
    await page.waitForTimeout(16);
  }
  await tp("touchEnd", []);
  await page.waitForTimeout(200);
  const k = Number(await escena.getAttribute("data-zoom"));
  ok(k > 1.5 && k <= 4, `Pellizcar acerca (zoom ${k})`);
  ok(await page.evaluate(() => window.visualViewport.scale === 1), "…sin el zoom de página del navegador");
  await visor.locator(".x").tap();
  await visor.waitFor({ state: "detached" });
  ok(true, "La X cierra el visor");
  // Sin presentaciones, con ficha: píldora.
  await page.goto(URL + "/tienda/lino-y-algodon?demo#p/cinturon-de-cuero");
  await page.reload();
  await page.waitForSelector("#r-cinturon-de-cuero.on");
  await page.waitForTimeout(700);
  r = reel(page, "cinturon-de-cuero");
  const pildora = r.locator(".ficha-btn.pildora");
  ok((await pildora.count()) === 1 && (await pildora.innerText()).trim() === "Ficha técnica", "Sin presentaciones: píldora «Ficha técnica»");
  ok((await r.locator(".pres-btn").count()) === 0, "…y sin «Ver presentaciones»");
  await captura(page, "2-reel-sin-presentaciones", ancho);
  // Sin ficha: ningún botón.
  await page.goto(URL + "/tienda/lino-y-algodon?demo#p/camisa-de-lino");
  await page.reload();
  await page.waitForSelector("#r-camisa-de-lino.on");
  await page.waitForTimeout(500);
  ok((await reel(page, "camisa-de-lino").locator("[data-ficha]").count()) === 0, "Sin ficha, no hay botón de ficha");
  ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
  await ctx.close();

  // Esencias Michel: sus Detalles siguen, y el «…» abre el detalle.
  const m = await abrir(ancho, "/tienda/esencias-michel?demo#p/kiara");
  await m.page.waitForSelector("#r-kiara.on");
  await m.page.waitForTimeout(700);
  r = reel(m.page, "kiara");
  ok((await r.locator("[data-more]").innerText()).trim() === "…", "Michel: «…» en vez de «más»");
  await r.locator("[data-more]").tap();
  await r.locator(".panel").waitFor({ state: "visible" });
  ok((await r.locator(".panel dl div").count()) > 0, "…y el detalle conserva sus Detalles");
  await captura(m.page, "4-michel-detalle", ancho);
  ok(m.errores.length === 0, "Michel: sin errores de página");
  await m.ctx.close();
}

async function panel(ancho) {
  console.log(`\nPanel · ${ancho}`);
  const { ctx, page, errores } = await abrir(ancho, "/catalogo/nuevo", LINO_ID);
  await page.waitForSelector('input[placeholder="El nombre de tu producto"]');
  await page.waitForTimeout(900);
  ok((await page.getByRole("heading", { name: "Detalles", exact: true }).count()) === 0, "Un producto nuevo no pide Detalles");
  const desc = page.locator('textarea[placeholder="Cuéntalo como se lo dirías a una clienta."]');
  ok((await desc.count()) === 0, "La Descripción viene plegada en «Más opciones»");
  await page.locator('[data-fila-plegable="descripcion"] button[aria-expanded]').tap();
  ok((await desc.count()) === 1, "Pide la Descripción");
  await desc.fill("Oud ahumado con vainilla. Dura todo el día.");
  ok((await page.getByText("43 / 600").count()) === 1, "El contador dice «43 / 600»");
  ok((await page.getByText("Lo que escribas aquí también lo usa la búsqueda de tu catálogo.").count()) === 1, "…y explica que la búsqueda la usa");
  await page.locator('[data-fila-plegable="ficha"] button[aria-expanded]').tap();
  ok((await page.getByText("Si tienes la foto de las especificaciones, súbela.").count()) === 1, "La tarjeta «Ficha técnica» invita a subirla");
  await captura(page, "5-panel-sin-ficha", ancho);
  await page.locator('input[type="file"]').last().setInputFiles({ name: "ficha.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Cambiar", exact: true }).waitFor();
  ok((await page.getByRole("button", { name: "Quitar", exact: true }).count()) === 1, "Subida: miniatura con «Cambiar» y «Quitar»");
  await captura(page, "5-panel-ficha-subida", ancho);
  await page.getByRole("button", { name: "Quitar", exact: true }).tap();
  ok((await page.getByRole("button", { name: "Sí, quitar" }).count()) === 1, "«Quitar» pide una confirmación breve");
  await page.getByRole("button", { name: "Mejor no" }).tap();
  ok((await page.getByRole("button", { name: "Cambiar", exact: true }).count()) === 1, "«Mejor no» la deja como estaba");
  ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
  await ctx.close();

  // Un producto de Michel conserva sus Detalles.
  const m = await abrir(ancho, "/catalogo", MICHEL_ID);
  await m.page.waitForSelector('a[href^="/catalogo/"]');
  await m.page.goto(URL + "/catalogo/a3000000-0000-4000-8000-000000000019/editar");
  await m.page.waitForSelector('[data-fila-plegable="descripcion"]');
  await m.page.waitForTimeout(700);
  await m.page.locator('[data-fila-plegable="descripcion"] button[aria-expanded]').tap();
  await m.page.locator('[data-fila-plegable="ficha"] button[aria-expanded]').tap();
  ok((await m.page.getByRole("heading", { name: "Detalles", exact: true }).count()) === 1, "Michel: su producto con Detalles los sigue mostrando");
  ok((await m.page.locator('textarea[placeholder="Cuéntalo como se lo dirías a una clienta."]').inputValue()).startsWith("Oud"), "…y la descripción que ya tenía");
  ok((await m.page.getByRole("button", { name: "Cambiar", exact: true }).count()) === 1, "…y su ficha de muestra");
  await captura(m.page, "6-michel-editar", ancho);
  ok(m.errores.length === 0, "Michel: sin errores de página");
  await m.ctx.close();
}

for (const a of ANCHOS) {
  await catalogo(a);
  await panel(a);
}
await b.close();
console.log("\nTodo bien.");
