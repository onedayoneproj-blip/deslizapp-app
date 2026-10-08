// Stickers de la historia (PR #81, y los ilustrados en pestañas), en la demo a 390 (ANCHO=360 para el otro): el selector «Stickers» de la hoja, marcados de entrada, poner/quitar, arrastrar en
// «Ajustar foto» y la imagen final 1080×1920 con 0, 1 y 3 stickers. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHO=390] [CAPTURAS=docs/capturas/stickers-historia] node scripts/probar-stickers-historia.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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
const ctx = await navegador.newContext({ viewport: { width: Number(process.env.ANCHO ?? 390), height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.addInitScript((tienda) => {
  localStorage.setItem("deslizapp-version-vista", "9.9.9");
  localStorage.setItem("deslizapp-modo-v1", "demo");
  localStorage.setItem("deslizapp-sesion-v1", tienda);
}, MICHEL);
await page.goto(`${URL}/catalogo`);
await page.waitForSelector('[aria-label^="Agregar"][aria-label$="a historia"]');
await page.locator('[aria-label^="Agregar"][aria-label$="a historia"]').first().click();
await page.waitForSelector(`img[alt^="Vista previa"]`, { timeout: 20000 });

const GRUPO_DE = { ultimas: "Básicos", nuevo: "Básicos", aaah: "Marca", "te-amo": "Temporadas", halloween: "Temporadas", "mas-vendido": "Básicos" };
const abrirGrupo = async (nombre) => {
  await page.getByRole("radio", { name: nombre }).click();
  await page.waitForSelector(`[data-grupo-stickers] [data-sticker-boton]`);
};
const boton = (id) => page.locator(`[data-sticker-boton="${id}"]`);
const verBoton = async (id) => {
  if (GRUPO_DE[id]) await abrirGrupo(GRUPO_DE[id]);
  return boton(id);
};
const puestos = async () => {
  const todos = [];
  for (const g of ["Básicos", "Temporadas", "Marca"]) {
    await abrirGrupo(g);
    todos.push(...(await page.locator('[data-sticker-boton][aria-pressed="true"]').evaluateAll((l) => l.map((e) => e.dataset.stickerBoton))));
  }
  return todos;
};
const esperarNueva = async (antes) => {
  await page.waitForFunction((s) => (document.querySelector('img[alt^="Vista previa"]')?.getAttribute("src") ?? s) !== s, antes, { timeout: 15000 });
};
const src = () => page.locator('img[alt^="Vista previa"]').getAttribute("src");
const guardarImagen = async (nombre) => {
  const url = await src();
  const datos = await page.evaluate(async (u) => {
    const b = await (await fetch(u)).blob();
    const bmp = await createImageBitmap(b);
    const r = await new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
    return { r, w: bmp.width, h: bmp.height };
  }, url);
  ok(datos.w === 1080 && datos.h === 1920, `imagen final ${datos.w}×${datos.h}`);
  if (CAPTURAS) writeFileSync(join(CAPTURAS, nombre), Buffer.from(datos.r.split(",")[1], "base64"));
};
const toggle = async (id) => {
  const a = await src();
  await (await verBoton(id)).click();
  await esperarNueva(a);
};

await abrirGrupo("Básicos");
ok((await page.locator("[data-sticker-boton]").count()) >= 12, "la pestaña Básicos ofrece sus stickers");
for (const [nombre, n] of [["Temporadas", 12], ["Marca", 9]]) {
  await abrirGrupo(nombre);
  ok((await page.locator("[data-sticker-boton]").count()) === n, `la pestaña ${nombre} ofrece ${n}`);
  await page.waitForFunction(() => [...document.querySelectorAll("[data-sticker-boton] img")].every((i) => i.complete), null, { timeout: 10000 }).catch(() => {});
  const rotos = await page.locator("[data-sticker-boton] img").evaluateAll((l) => l.filter((i) => !i.complete || i.naturalWidth === 0).length);
  ok(rotos === 0, `${nombre}: todas las imágenes cargan`);
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `0-selector-${nombre.toLowerCase()}.png`) });
}
await abrirGrupo("Básicos");
if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, "0-selector-basicos.png") });
console.log("  marcados de entrada:", (await puestos()).join(", ") || "(ninguno)");
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin desborde horizontal");
// Dejar la hoja en 0 stickers
for (const id of await puestos()) await toggle(id);
ok((await puestos()).length === 0, "0 stickers");
if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, "1-hoja-0-stickers.png") });
await guardarImagen("1-imagen-0-stickers.jpg");

await toggle("aaah");
ok((await puestos()).join() === "aaah", "tocar el corazón de aaah lo pone (check visible)");
if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, "2-hoja-1-sticker.png") });
await guardarImagen("2-imagen-1-sticker.jpg");

// Arrastrar en «Ajustar foto»
await page.getByRole("button", { name: "Vista previa" }).click();
await page.waitForSelector("[data-sticker='aaah']");
const st = page.locator("[data-sticker='aaah']");
const pos = async () => ({ x: Number(await st.getAttribute("data-x")), y: Number(await st.getAttribute("data-y")) });
const antes = await pos();
const r = await st.boundingBox();
await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
await page.mouse.down();
await page.mouse.move(r.x + r.width / 2 - 50, r.y + r.height / 2 + 80, { steps: 6 });
await page.mouse.up();
const despues = await pos();
ok(despues.x < antes.x && despues.y > antes.y, `arrastrar mueve el sticker (${antes.x},${antes.y}) → (${despues.x},${despues.y})`);
ok(Number(await page.locator("[data-marco-historia]").getAttribute("data-x")) === 0, "arrastrar el sticker no mueve la foto");
if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, "3-ajustar-arrastrando.png") });
const a1 = await src();
await page.getByRole("button", { name: "Listo" }).last().click();
await esperarNueva(a1);
await guardarImagen("3-imagen-sticker-movido.jpg");

// 3 stickers
for (const id of ["nuevo", "ultimas"]) if (!(await puestos()).includes(id) && (await (await verBoton(id)).count())) await toggle(id);
console.log("  puestos:", (await puestos()).join(", "));
if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, "4-hoja-3-stickers.png") });
await guardarImagen("4-imagen-3-stickers.jpg");
await page.getByRole("button", { name: "Vista previa" }).click();
await page.waitForSelector("[data-sticker]");
ok((await page.locator("[data-sticker]").count()) === 3, `${await page.locator("[data-sticker]").count()} stickers en «Ajustar foto»`);
if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, "5-ajustar-3-stickers.png") });
await page.getByRole("button", { name: "Cancelar" }).click();
ok(errores.length === 0, `sin errores de página ${errores.join("|")}`);
await ctx.close();
await navegador.close();
