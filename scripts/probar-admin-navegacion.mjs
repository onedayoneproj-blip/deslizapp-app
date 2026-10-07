// Navegación del panel admin en la demo (/admin-demo), sin Supabase: la barra es la misma del panel de la tienda (selector
// que se mueve al tocar, arrastre con imán), cambiar de pestaña no deja la pantalla en blanco ni vuelve a mostrar el
// esqueleto de carga al volver, y el scroll nunca queda trabado después de abrir y cerrar hojas. 390 px, tema claro.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-admin-navegacion.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errores = [];
let supabase = 0;
page.on("pageerror", (e) => errores.push(e.message));
page.on("request", (r) => /supabase\.co/.test(r.url()) && supabase++);
await page.addInitScript((t) => {
  localStorage.setItem("deslizapp-version-vista", "9.9.9");
  localStorage.setItem("deslizapp-modo-v1", "demo");
  localStorage.setItem("deslizapp-sesion-v1", t);
}, MICHEL);

const barra = page.locator('nav[aria-label="Navegación admin"]');
const pestana = (nombre) => barra.getByRole("link", { name: nombre });
const actual = () => barra.locator('[aria-current="page"]').innerText();
/** Borde izquierdo del selector (pieza izquierda), en px dentro de la pista. */
const selectorX = () => page.evaluate(() => {
  const izq = document.querySelector('nav[aria-label="Navegación admin"] [data-selector] > span');
  return izq ? new DOMMatrix(getComputedStyle(izq).transform).m41 : null;
});
const cargando = () => page.locator('main [aria-label="Cargando"]').count();
const scrollLibre = () => page.evaluate(() => document.body.style.overflow !== "hidden" && document.documentElement.style.overscrollBehavior !== "none");

console.log("\n• La barra del admin es la del panel");
await page.goto(`${URL}/admin-demo`);
await page.waitForSelector('nav[aria-label="Navegación admin"] [data-selector]');
await page.waitForTimeout(800);
ok((await barra.getByRole("link").count()) === 5, "cinco pestañas: Hoy, Tiendas, Trabajo, Cobros, Más");
ok((await actual()).includes("Hoy"), "Hoy marcada al entrar");
ok((await barra.locator("[data-selector]").count()) === 1, "lleva el selector en cápsula del panel");

console.log("\n• Un toque se nota al instante y cambia de pantalla");
const x0 = await selectorX();
await pestana("Tiendas").tap();
await page.waitForTimeout(120);
const x1 = await selectorX();
ok(x1 !== null && x0 !== null && x1 > x0 + 10, `el selector ya va hacia Tiendas a los 120 ms (${x0?.toFixed(0)} → ${x1?.toFixed(0)} px)`);
await page.waitForURL(/\/admin-demo\/tiendas$/);
await page.waitForSelector("main h1:has-text('Tiendas')");
ok((await actual()).includes("Tiendas"), "Tiendas marcada");
await page.waitForSelector("main ul li a");

console.log("\n• Arrastrar el selector cambia de pestaña al soltar");
const caja = await barra.locator("[data-selector]").boundingBox();
const tab = caja.width / 5;
const y = caja.y + caja.height / 2;
await page.mouse.move(caja.x + tab * 1.5, y);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(caja.x + tab * 1.5 + (tab * 1.3 * i) / 12, y);
await page.waitForTimeout(80);
ok(page.url().endsWith("/admin-demo/tiendas"), "mientras se arrastra, la pantalla no cambia");
await page.mouse.up();
await page.waitForURL(/\/admin-demo\/trabajo/);
await page.waitForSelector("main h1:has-text('Trabajo')");
ok((await actual()).includes("Trabajo"), "al soltar sobre Trabajo, va a Trabajo");

console.log("\n• Volver a una pestaña ya vista no muestra el esqueleto de carga");
await page.waitForTimeout(400);
await pestana("Tiendas").tap();
await page.waitForURL(/\/admin-demo\/tiendas$/);
await page.waitForSelector("main h1:has-text('Tiendas')");
ok((await cargando()) === 0, "Tiendas aparece con su lista, sin esqueleto");
ok((await page.locator("main ul li a").count()) > 0, "la lista ya está");
await pestana("Hoy").tap();
await page.waitForURL(/\/admin-demo$/);
await page.waitForSelector("main h1");
ok((await cargando()) === 0, "Hoy aparece con sus datos, sin esqueleto");

console.log("\n• El scroll no queda trabado tras abrir y cerrar hojas");
const cuenta = page.locator('header button[aria-haspopup="dialog"]');
for (let i = 0; i < 3; i++) {
  await cuenta.tap();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(150);
  ok(!(await scrollLibre()), `con la hoja abierta el fondo queda quieto (vuelta ${i + 1})`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(i === 1 ? 30 : 500); // una vuelta reabre casi enseguida, mientras la anterior se cierra
}
await page.waitForTimeout(700);
ok((await page.locator('[role="dialog"]').count()) === 0, "no queda ninguna hoja abierta");
ok(await scrollLibre(), "el fondo vuelve a desplazarse");
await pestana("Tiendas").tap();
await page.waitForURL(/\/admin-demo\/tiendas$/);
await page.waitForTimeout(300);
ok(await scrollLibre(), "y sigue libre después de cambiar de pestaña");

ok(errores.length === 0, `sin errores de página${errores.length ? `: ${errores.join(" | ")}` : ""}`);
ok(supabase === 0, "la demo no llama a Supabase");
await navegador.close();
console.log("\nListo: todo pasó.");
