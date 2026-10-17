// Los finales del catálogo de comprador (docs/prompts/finales-catalogo-reel.md): el reel de Deslizapp (la página principal dentro del
// catálogo, con las fotos del catálogo) y, solo con `MOSTRAR_FIN_CATALOGO` encendido (lib/tienda/final-catalogo.ts), «Ya estás al día».
// Uso, con la app corriendo (npm run dev), en la demo pública (nunca toca Supabase):
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-finales-catalogo.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const CON_FIN = /MOSTRAR_FIN_CATALOGO\s*=\s*true/.test(readFileSync("lib/tienda/final-catalogo.ts", "utf8"));
if (process.env.CAPTURAS === "1") mkdirSync("docs/capturas/reel-ver-planes", { recursive: true });
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

async function agregarUno(page) {
  await page.locator(".reel.on .act.like").click();
  await page.waitForTimeout(600);
  const agregar = page.locator(".pres-agregar");
  if (await agregar.isVisible().catch(() => false)) { await agregar.click(); await page.waitForTimeout(900); }
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
ok((await page.locator("#bagDock").evaluate((e) => getComputedStyle(e).opacity)) === "0", "sin pedido, el botón del pedido no se ve en el reel de Deslizapp");
ok((await page.locator("#reels main, #reels h1").count()) === 0, "sin <main> ni <h1> anidados dentro del catálogo");
ok((await page.locator(".hdr").getAttribute("inert")) !== null, "la cabecera apartada no se puede enfocar (inert)");
const caja = await page.locator("#r-deslizapp").boundingBox();
ok(Math.abs(caja.y) < 2 && Math.abs(caja.height - 852) < 2, `el reel de Deslizapp ocupa la pantalla completa (${Math.round(caja.height)}px, arriba en ${Math.round(caja.y)})`);
ok((await page.locator(".hdr").evaluate((e) => getComputedStyle(e).opacity)) === "0", "la cabecera del catálogo se aparta");
const fotos = await page.locator("#r-deslizapp [data-foto-inicio]").evaluateAll((l) => [...new Set(l.map((e) => e.dataset.fotoInicio))]);
ok(fotos.length >= 2 && fotos.every((f) => f.startsWith("/demo/deslizapp/")), `las columnas llevan las fotos del catálogo (${fotos.length} distintas)`);
ok((await page.locator('#r-deslizapp img[src*="/_next/image"]').count()) > 0, "las fotos del reel pasan por el optimizador de imágenes");
for (const [txt, sel] of [["Ver planes", "[data-cta=ver-planes]"], ["Cómo funciona", "[data-cta=como-funciona]"], ["Escríbenos", "[data-cta=vender]"], ["Probar la app con datos de prueba", "[data-cta=demo]"]])
  ok((await page.locator(`#r-deslizapp ${sel}`).innerText().catch(() => "")).includes(txt), `«${txt}» a la vista`);
// «Ver planes» ocupa el lugar de «Iniciar sesión» (docs/prompts/reel-final-ver-planes.md): mismo tamaño y mismo botón principal, y lleva a /planes.
ok((await page.locator("#r-deslizapp [data-cta=iniciar-sesion]").count()) === 0 && !/Iniciar sesión/.test(await page.locator("#r-deslizapp").innerText()), "el reel ya no tiene «Iniciar sesión»");
const planes = await page.locator("#r-deslizapp [data-cta=ver-planes]").evaluate((e) => ({ href: e.getAttribute("href"), alto: e.getBoundingClientRect().height, fondo: getComputedStyle(e).backgroundColor, radio: getComputedStyle(e).borderRadius, anchoRel: e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width }));
ok(planes.href === "/planes" && planes.alto === 56 && planes.fondo === "rgb(255, 249, 238)" && planes.anchoRel > 0.99, `«Ver planes» lleva a /planes y es el botón principal de siempre (${planes.alto} px, ${planes.fondo})`);
if (process.env.CAPTURAS === "1") await page.screenshot({ path: `docs/capturas/reel-ver-planes/ultimo-reel-393.png` });
ok((await page.locator("#r-deslizapp .ini-lema").innerText()).includes("tanta vuelta"), "el lema de la página inicial");
ok((await page.locator("#r-deslizapp .ini-tira").first().evaluate((e) => getComputedStyle(e).animationPlayState)) === "running", "con el reel activo, las columnas suben");
ok(await page.locator("#r-deslizapp .ini-burbuja").first().waitFor({ timeout: 6000 }).then(() => true, () => false), "aparecen las burbujas");
ok(await page.evaluate(() => document.documentElement.style.background === "" && document.body.style.background === ""), "el reel no pinta el fondo del documento");
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(1200);
ok((await page.locator("#r-deslizapp .ini-tira").first().evaluate((e) => getComputedStyle(e).animationPlayState)) === "paused", "al salir del reel, las columnas se pausan");
ok((await page.locator(".hdr").evaluate((e) => getComputedStyle(e).opacity)) === "1", "la cabecera vuelve");
await bajarHasta(page, "r-deslizapp");
await page.locator("#r-deslizapp [data-cta=ver-planes]").click();
await page.waitForURL(`${URL}/planes`, { timeout: 15000 }).catch(() => {});
ok(new globalThis.URL(page.url()).pathname === "/planes", "tocar «Ver planes» lleva a /planes");
await page.goBack().catch(() => {});
await page.waitForTimeout(1500);
await bajarHasta(page, "r-deslizapp");
await page.locator("#r-deslizapp [data-cta=demo]").click();
await page.waitForURL(`${URL}/`, { timeout: 15000 }).catch(() => {});
ok(new globalThis.URL(page.url()).pathname === "/", "«Probar la app…» lleva a «/» (la demo), no se queda en el catálogo");
ok(errs.length === 0, "sin errores de página " + errs.join("|"));

// Con pedido, el botón del pedido sí se ve en el reel de Deslizapp, sin tapar sus botones.
({ page, errs } = await abrir());
await agregarUno(page);
await bajarHasta(page, CON_FIN ? "r-fin" : "r-deslizapp");
if (CON_FIN) await bajarHasta(page, "r-deslizapp");
await page.waitForTimeout(800);
const bolsa = await page.locator("#bagDock .act").boundingBox();
ok((await page.locator("#bagDock").evaluate((e) => getComputedStyle(e).opacity)) === "1" && !!bolsa, "con pedido, el botón del pedido se ve en el reel de Deslizapp");
const cajas = await page.locator("#r-deslizapp .ini-google, #r-deslizapp .ini-botones, #r-deslizapp .ini-lema, #r-deslizapp .ini-arriba").evaluateAll((l) => l.map((e) => e.getBoundingClientRect().toJSON()));
const choca = cajas.some((c) => bolsa.x < c.right && bolsa.x + bolsa.width > c.left && bolsa.y < c.bottom && bolsa.y + bolsa.height > c.top);
ok(!choca, "y no tapa el lema, el logo ni los botones");
await page.locator("#bagDock .act").click();
await page.waitForTimeout(800);
ok(await page.evaluate(() => !!history.state?.catalogoVista), "tocarlo abre el pedido");

({ page, errs } = await abrir({ reducedMotion: "reduce" }));
await bajarHasta(page, "r-deslizapp");
ok((await page.locator("#r-deslizapp .ini-tira").first().evaluate((e) => getComputedStyle(e).animationName)) === "none", "con movimiento reducido, las columnas quietas");
ok((await page.locator("#r-deslizapp .ini-latido").count()) === 0, "con movimiento reducido, sin corazones");
// Capturas del último reel a 360 (a 393 se guardó arriba).
if (process.env.CAPTURAS === "1") {
  ({ page, errs } = await abrir({ viewport: { width: 360, height: 740 } }));
  await bajarHasta(page, "r-deslizapp");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `docs/capturas/reel-ver-planes/ultimo-reel-360.png` });
}
await b.close();
console.log(fallos ? `\n${fallos} fallo(s)` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
