// Renderiza las capturas de referencia, HEAD revisado y corrección, sin recrear la UI del producto.
import { createRequire } from "node:module";
import { execFileSync, execSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { nuevoHastaPrecio, abrirRama, vaciarEjes, elegirEjeValores, irACantidades, rama } from "./recorrido-historia-producto.mjs";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const directorio = "docs/capturas/crear-producto-codex";
mkdirSync(directorio, { recursive: true });
const URL = process.env.URL ?? "http://127.0.0.1:3100";
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route("**/api/version", (r) => r.abort());
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await nuevoHastaPrecio(page, URL, "Aros de prueba", "950");
  await abrirRama(page);
  await vaciarEjes(page);
  await elegirEjeValores(page, "Color", ["Dorado", "Plateado"]);
  await elegirEjeValores(page, "Tamaño", ["Pequeño", "Mediano"]);
  await irACantidades(page);
  await rama(page).evaluate((e) => e.closest("[data-hoja-contenido]").scrollTo(0, 0));
  await page.screenshot({ path: join(directorio, "v4-cantidades-referencia-390.png") });
  await rama(page).locator('section[aria-label="Color Plateado"] button[aria-expanded]').click();
  await rama(page).evaluate((e) => e.closest("[data-hoja-contenido]").scrollTo(0, 0));
  await page.screenshot({ path: join(directorio, "v4-cantidades-plegadas-390.png") });
  await ctx.close();
  const actual = (f) => readFileSync(join(directorio, f));
  const anterior = (f) => execFileSync("git", ["show", `3bcd309:${directorio}/${f}`], { maxBuffer: 16 * 1024 * 1024 });
  const referencia = (f) => readFileSync(`referencias/crear-producto/capturas/${f}.png`);
  const casos = [
    ["B5", ["Lienzo aprobado", referencia("b5")], ["HEAD 3bcd309", anterior("b5-pastillas-390.png")], ["Reel de producto corregido", actual("b5-pastillas-390.png")]],
    ["preguntas", ["Lienzo aprobado", referencia("b2")], ["HEAD 3bcd309", anterior("b2-nombre-390.png")], ["Pregunta a 100 px", actual("b2-nombre-390.png")]],
    ["atributos", ["Lienzo aprobado", referencia("v1")], ["HEAD 3bcd309", anterior("v1-atributos-390.png")], ["Variantes a 100 px", actual("v1-atributos-390.png")]],
    ["fotos", ["HEAD 3bcd309", anterior("b1-fotos-multiples-activa-390.png")], ["Fotos y contador conservados", actual("b1-fotos-multiples-activa-390.png")]],
    ["cantidades", ["HEAD 3bcd309: diseño anterior", anterior("v4-stock-390.png")], ["Cantidades construidas según Lewis", actual("v4-cantidades-referencia-390.png")]],
  ];
  const comparador = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [nombre, ...columnas] of casos) {
    await comparador.setViewportSize({ width: columnas.length * 414 + 24, height: 950 });
    await comparador.setContent(`<html lang="es"><head><style>body{margin:0;padding:12px;background:#ece8df;color:#174b3a;font:16px system-ui}h1{font-size:22px;margin:0 0 12px}.fila{display:flex;gap:24px}figure{width:390px;margin:0}figcaption{height:40px;font-weight:700}img{display:block;width:390px;height:844px;object-fit:contain;background:#fff9ee}</style></head><body><h1>PR #114 · ${nombre}</h1><div class="fila">${columnas.map(([titulo, bytes]) => `<figure><figcaption>${titulo}</figcaption><img src="data:image/png;base64,${bytes.toString("base64")}" alt="${titulo}" /></figure>`).join("")}</div></body></html>`);
    await comparador.locator("img").evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
    await comparador.screenshot({ path: join(directorio, `comparativa-${nombre}.png`) });
  }
  await comparador.close();
} finally { await browser.close(); }
