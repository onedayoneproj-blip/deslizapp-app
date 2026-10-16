// Los finales del catálogo de comprador (docs/prompts/finales-catalogo-reel.md): el reel de Deslizapp (la página principal dentro del
// catálogo, con las fotos del catálogo) y, solo con `MOSTRAR_FIN_CATALOGO` encendido (lib/tienda/final-catalogo.ts), «Ya estás al día».
// Uso, con la app corriendo (npm run dev), en la demo pública (nunca toca Supabase):
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-finales-catalogo.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const CON_FIN = /MOSTRAR_FIN_CATALOGO\s*=\s*true/.test(readFileSync("lib/tienda/final-catalogo.ts", "utf8"));
let fallos = 0;
const ok = (c, m) => { console.log((c ? "  ✅ " : "  ❌ ") + m); if (!c) fallos++; };

const b = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
async function abrir(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem("dz-coach-deslizapp-ejemplo", "1"); localStorage.setItem("deslizapp-version-vista", "9.9.9"); });
  await page.goto(`${URL}/tienda/deslizapp-ejemplo?demo`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1200);
  return { page, errs };
}
async function bajarHasta(page, id) {
  for (let i = 0; i < 16; i++) {
    if (await page.locator(`#${id}.on`).count()) return true;
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(350);
  }
  return false;
}

console.log(`\n=== finales del catálogo (${CON_FIN ? "con «Ya estás al día»" : "sin «Ya estás al día»: apagado"}) ===`);
let { page, errs } = await abrir();
const productos = await page.locator("#reels .reel:not(.fin):not(.rd)").count();
ok(productos > 1, `hay ${productos} reels de producto`);
if (CON_FIN) {
  ok(await bajarHasta(page, "r-fin"), "las flechas llegan a «Ya estás al día»");
  ok((await page.locator("#r-fin .act").count()) === 0, "sin columna de botones en el fin");
  const sigue = page.locator("#r-fin .rf-sigue button");
  if (await sigue.count()) {
    await sigue.first().click();
    await page.waitForTimeout(1200);
    ok((await page.locator("#r-fin.on").count()) === 0, "tocar un «Sigue viendo» va a un producto");
    await bajarHasta(page, "r-fin");
  }
  await page.locator("#r-fin .rf-enlaces button").last().click();
  await page.waitForTimeout(1500);
  ok((await page.locator("#r-fin.on").count()) === 0, "«Volver al primero» sale del fin");
  await bajarHasta(page, "r-deslizapp");
} else {
  ok((await page.locator("#r-fin").count()) === 0, "el reel «fin» no se renderiza");
  ok(await bajarHasta(page, "r-deslizapp"), "último producto → reel de Deslizapp, con las flechas");
}
await page.waitForTimeout(600);
const caja = await page.locator("#r-deslizapp").boundingBox();
ok(Math.abs(caja.y) < 2 && Math.abs(caja.height - 852) < 2, `el reel de Deslizapp ocupa la pantalla completa (${Math.round(caja.height)}px, arriba en ${Math.round(caja.y)})`);
ok((await page.locator(".hdr").evaluate((e) => getComputedStyle(e).opacity)) === "0", "la cabecera del catálogo se aparta");
const fotos = await page.locator("#r-deslizapp [data-foto-inicio]").evaluateAll((l) => [...new Set(l.map((e) => e.dataset.fotoInicio))]);
ok(fotos.length >= 2 && fotos.every((f) => f.startsWith("/demo/deslizapp/")), `las columnas llevan las fotos del catálogo (${fotos.length} distintas)`);
for (const [txt, sel] of [["Iniciar sesión", "[data-cta=iniciar-sesion]"], ["Cómo funciona", "[data-cta=como-funciona]"], ["Quiero vender", "[data-cta=vender]"], ["Probar la app con datos de prueba", "[data-cta=demo]"]])
  ok((await page.locator(`#r-deslizapp ${sel}`).innerText().catch(() => "")).includes(txt), `«${txt}» a la vista`);
ok((await page.locator("#r-deslizapp .ini-lema").innerText()).includes("tanta vuelta"), "el lema de la página inicial");
ok((await page.locator("#r-deslizapp .ini-tira").first().evaluate((e) => getComputedStyle(e).animationPlayState)) === "running", "con el reel activo, las columnas suben");
ok(await page.locator("#r-deslizapp .ini-burbuja").first().waitFor({ timeout: 6000 }).then(() => true, () => false), "aparecen las burbujas");
ok(await page.evaluate(() => document.documentElement.style.background === "" && document.body.style.background === ""), "el reel no pinta el fondo del documento");
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(1200);
ok((await page.locator("#r-deslizapp .ini-tira").first().evaluate((e) => getComputedStyle(e).animationPlayState)) === "paused", "al salir del reel, las columnas se pausan");
ok((await page.locator(".hdr").evaluate((e) => getComputedStyle(e).opacity)) === "1", "la cabecera vuelve");
await bajarHasta(page, "r-deslizapp");
await page.locator("#r-deslizapp [data-cta=demo]").click();
await page.waitForURL(`${URL}/`, { timeout: 15000 }).catch(() => {});
ok(new globalThis.URL(page.url()).pathname === "/", "«Probar la app…» lleva a «/» (la demo), no se queda en el catálogo");
ok(errs.length === 0, "sin errores de página " + errs.join("|"));

({ page, errs } = await abrir({ reducedMotion: "reduce" }));
await bajarHasta(page, "r-deslizapp");
ok((await page.locator("#r-deslizapp .ini-tira").first().evaluate((e) => getComputedStyle(e).animationName)) === "none", "con movimiento reducido, las columnas quietas");
ok((await page.locator("#r-deslizapp .ini-latido").count()) === 0, "con movimiento reducido, sin corazones");
await b.close();
console.log(fallos ? `\n${fallos} fallo(s)` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
