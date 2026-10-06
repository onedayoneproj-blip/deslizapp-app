// Selector de tiendas y cuenta (docs/prompts/selector-de-tiendas.md) en la demo, sin Supabase: el menú con la tienda activa
// (Mi marca dentro de su tarjeta), las otras tiendas, la cuenta y la salida; el cambio de tienda sin datos de la anterior; una
// sola tienda; y el círculo de cuenta del admin (/admin-demo) con «Ir a mi tienda». Tema claro; 390 px y, donde se indica, 360/430.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-selector-tiendas.mjs
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
const CLAVE = "deslizapp-demo-v5";
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) (await import("node:fs")).mkdirSync(CAPTURAS, { recursive: true });
const cap = async (page, n) => CAPTURAS && (await page.screenshot({ path: join(CAPTURAS, `${n}.png`) }));

async function pagina(ancho = 390) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  let peticiones = 0;
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("request", (r) => /supabase\.co/.test(r.url()) && peticiones++);
  // Solo la primera carga de la pestaña deja la demo lista (así «Salir de la demo» se nota al recargar).
  await page.addInitScript((t) => {
    if (sessionStorage.getItem("prueba-inicial")) return;
    sessionStorage.setItem("prueba-inicial", "1");
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
  }, MICHEL);
  return { ctx, page, errores, peticiones: () => peticiones };
}
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
const esperar = (page, ms = 450) => page.waitForTimeout(ms);
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const boton = (page) => page.locator('header button[aria-haspopup="dialog"]').first();
const hoja = (page) => page.locator('[role="dialog"]').last();
async function abrirMenu(page) {
  await page.goto(`${URL}/catalogo`);
  await page.waitForSelector('header button[aria-haspopup="dialog"]');
  await esperar(page, 900);
  await boton(page).tap();
  await page.waitForSelector("[data-tienda-activa]");
  await esperar(page, 500);
}
async function caso(titulo, fn) {
  console.log(`\n• ${titulo}`);
  const c = await fn();
  if (c) await c.ctx.close();
}

await caso("1. Demo con 3 tiendas: la activa con Mi marca dentro, las otras debajo, la cuenta y la salida", async () => {
  const c = await pagina();
  const { page } = c;
  await abrirMenu(page);
  const h = hoja(page);
  ok(await h.getByText("Tus tiendas", { exact: true }).isVisible(), "el título es «Tus tiendas»");
  const activa = h.locator("[data-tienda-activa]");
  ok((await activa.getByText("Esencias Michel", { exact: false }).count()) > 0 && (await activa.innerText()).includes("créditos"), "la tarjeta activa trae nombre, plan y créditos");
  ok(await activa.getByRole("button", { name: /^Mi marca/ }).isVisible(), "«Mi marca» va dentro de la tarjeta de la activa");
  ok((await h.getByRole("button", { name: /^Mi marca/ }).count()) === 1, "y ya no hay una fila «Mi marca» suelta");
  const otras = h.getByRole("list", { name: "Tus otras tiendas" }).getByRole("button");
  ok((await otras.count()) === 2, "hay una fila por cada otra tienda");
  ok(/^.+, .+$/.test((await otras.first().getAttribute("aria-label")) ?? "") && !(await otras.first().getAttribute("aria-label")).includes("activa"), "etiqueta accesible «Nombre, Plan»");
  ok((await activa.getAttribute("data-tienda-activa")) === "" && (await activa.locator("[aria-label$='tienda activa']").count()) === 1, "la activa se dice con texto («…, tienda activa»), no solo con color");
  const cuenta = h.locator("[data-cuenta]");
  ok((await cuenta.innerText()).includes("Cuenta de demo") && (await cuenta.getByRole("button", { name: "Salir de la demo", exact: true }).isVisible()), "la cuenta es «Cuenta de demo» con «Salir de la demo»");
  ok((await cuenta.getByText("CD", { exact: true }).count()) === 1, "sin foto: iniciales");
  ok((await h.getByText("Modo demo").isVisible()) && (await h.getByText("Laboratorio de datos").isVisible()), "el modo demo y su laboratorio siguen abajo");
  ok((await h.getByText("Ver novedades").isVisible()) && (await h.getByText("Privacidad").isVisible()), "versión, novedades, Privacidad y Términos al pie");
  ok(!(await h.innerText()).includes("Crear otra tienda"), "no hay «Crear otra tienda» en este PR");
  ok(!(await h.innerText()).includes("!"), "sin signos de exclamación");
  const alturas = await otras.evaluateAll((bs) => bs.map((b) => b.getBoundingClientRect().height));
  ok(alturas.every((a) => a >= 44), "las filas miden al menos 44 px");
  ok(await sinDesborde(page), "sin scroll horizontal a 390");
  ok(((await boton(page).getAttribute("aria-label")) ?? "").endsWith("Menú de tus tiendas"), "la etiqueta del encabezado termina en «Menú de tus tiendas»");
  await cap(page, "menu-3-tiendas");
  ok(c.peticiones() === 0 && c.errores.length === 0, "cero peticiones a Supabase y sin errores de página");
  return c;
});

await caso("2. Cambiar de tienda: aviso, el menú se cierra y no queda nada de la anterior", async () => {
  const c = await pagina();
  const { page } = c;
  await abrirMenu(page);
  // La tienda y un producto de la de antes, para comprobar que no se ven después.
  const nombreAntes = (await page.locator("[data-tienda-activa] .font-extrabold").first().innerText()).trim();
  await page.keyboard.press("Escape");
  await esperar(page, 500);
  await page.waitForSelector('a[href^="/catalogo/a3"]');
  const productosAntes = await page.locator('a[href^="/catalogo/a3"]').evaluateAll((a) => a.map((x) => x.getAttribute("href")));
  await boton(page).tap();
  await page.waitForSelector("[data-tienda-activa]");
  await esperar(page, 500);
  const otra = hoja(page).getByRole("list", { name: "Tus otras tiendas" }).getByRole("button").first();
  const nombreOtra = ((await otra.getAttribute("aria-label")) ?? "").split(",")[0];
  await otra.tap();
  await page.getByText(`Ahora estás en ${nombreOtra}.`).first().waitFor({ timeout: 4000 });
  ok(true, `sale «Ahora estás en ${nombreOtra}.»`);
  await esperar(page, 700);
  ok((await page.locator("[data-tienda-activa]").count()) === 0, "el menú se cerró");
  ok((await boton(page).getAttribute("aria-label")).startsWith(nombreOtra), "el encabezado ya dice la tienda nueva");
  await page.waitForFunction((antes) => [...document.querySelectorAll('a[href^="/catalogo/a3"]')].length > 0 && ![...document.querySelectorAll('a[href^="/catalogo/a3"]')].some((a) => antes.includes(a.getAttribute("href"))), productosAntes, { timeout: 5000 });
  ok(true, "el catálogo no muestra ningún producto de la tienda anterior");
  // La anterior ahora aparece en la lista de las otras, y la activa pasó a ser la nueva (primera).
  await boton(page).tap();
  await page.waitForSelector("[data-tienda-activa]");
  await esperar(page, 500);
  ok((await hoja(page).locator("[data-tienda-activa]").innerText()).includes(nombreOtra), "la nueva es la activa");
  ok((await hoja(page).getByRole("list", { name: "Tus otras tiendas" }).getByRole("button", { name: new RegExp(`^${nombreAntes.replace(/[()]/g, ".")}`) }).count()) === 1, "la de antes bajó a «las otras»");
  const d = await db(page).catch(() => ({}));
  void d;
  return c;
});

await caso("3. Una sola tienda: sin lista; su tarjeta con Mi marca y la cuenta debajo; 360 y 430", async () => {
  for (const ancho of [360, 430]) {
    const c = await pagina(ancho);
    const { page } = c;
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Para guardar");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("100");
    const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 300; c.height = 300; c.getContext("2d").fillRect(0, 0, 300, 300); return c.toDataURL("image/png").split(",")[1]; });
    await page.locator("[data-entrada-medios]").setInputFiles([{ name: "a.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") }]);
    await page.getByRole("button", { name: /^(Portada|Foto) 1 de/ }).first().waitFor();
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo`);
    // Se deja una sola tienda en lo guardado y se vuelve a cargar.
    await page.evaluate((k) => {
      const d = JSON.parse(localStorage.getItem(k));
      const t = d.tiendas.find((x) => x.nombre === "Esencias Michel") ?? d.tiendas[0];
      for (const [clave, valor] of Object.entries(d)) if (Array.isArray(valor) && valor.length && "tiendaId" in valor[0]) d[clave] = valor.filter((x) => x.tiendaId === t.id);
      d.tiendas = [t];
      localStorage.setItem(k, JSON.stringify(d));
      localStorage.setItem("deslizapp-sesion-v1", t.id);
    }, CLAVE);
    await abrirMenu(page);
    const h = hoja(page);
    ok(await h.getByText("Tu tienda", { exact: true }).isVisible(), `(${ancho}) el título es «Tu tienda»`);
    ok((await h.getByRole("list", { name: "Tus otras tiendas" }).count()) === 0, `(${ancho}) no hay lista de otras tiendas`);
    ok((await h.locator("[data-tienda-activa]").getByRole("button", { name: /^Mi marca/ }).isVisible()) && (await h.locator("[data-cuenta]").isVisible()), `(${ancho}) la tarjeta con Mi marca y la cuenta debajo`);
    ok(((await boton(page).getAttribute("aria-label")) ?? "").endsWith("Menú de la tienda"), `(${ancho}) el encabezado dice «Menú de la tienda»`);
    ok(await sinDesborde(page), `(${ancho}) sin scroll horizontal`);
    if (ancho === 360) await cap(page, "menu-1-tienda-360");
    await h.locator("[data-tienda-activa]").getByRole("button", { name: /^Mi marca/ }).tap();
    await page.getByRole("dialog", { name: "Mi marca" }).waitFor();
    ok(true, `(${ancho}) «Mi marca» abre su hoja`);
    await c.ctx.close();
  }
});

await caso("4. Admin de la demo: el círculo de cuenta abre la hoja y «Ir a mi tienda» vuelve al panel; del panel se regresa", async () => {
  const c = await pagina();
  const { page } = c;
  await page.goto(`${URL}/admin-demo`);
  const circulo = page.getByRole("button", { name: "Tu cuenta, Cuenta de demo" });
  await circulo.waitFor();
  ok(!(await page.locator("header").innerText()).includes("LE") && (await circulo.boundingBox()).width >= 44, "el círculo ya no es «LE» fijo y mide 44 px");
  await circulo.tap();
  const h = page.getByRole("dialog", { name: "Tu cuenta" });
  await h.waitFor();
  await esperar(page, 450);
  const ir = h.getByRole("link", { name: /^Ir a mi tienda/ });
  ok(await ir.isVisible() && (await ir.innerText()).includes("Esencias Michel"), "«Ir a mi tienda» con el nombre de la tienda de la demo");
  ok((await h.locator("[data-cuenta]").innerText()).includes("Cuenta de demo") && (await h.getByRole("button", { name: "Salir de la demo", exact: true }).isVisible()), "la cuenta con «Salir de la demo»");
  ok(await sinDesborde(page), "sin scroll horizontal a 390");
  await cap(page, "admin-demo-cuenta");
  await ir.tap();
  await page.waitForURL(`${URL}/`);
  await boton(page).waitFor();
  ok(true, "«Ir a mi tienda» lleva al panel de la demo");
  await esperar(page, 600);
  await boton(page).tap();
  await page.waitForSelector("[data-tienda-activa]");
  await esperar(page, 500);
  await hoja(page).getByRole("link", { name: /Admin de la demo/ }).tap();
  await page.waitForURL(`${URL}/admin-demo`);
  ok(true, "del panel se regresa con «Admin de la demo»");
  ok(c.peticiones() === 0 && c.errores.length === 0, "cero peticiones a Supabase y sin errores de página");
  return c;
});

await caso("5. Admin de la demo: «Salir de la demo» no toca Supabase y vuelve a la entrada", async () => {
  const c = await pagina();
  const { page } = c;
  await page.goto(`${URL}/admin-demo`);
  await page.getByRole("button", { name: "Tu cuenta, Cuenta de demo" }).tap();
  const h = page.getByRole("dialog", { name: "Tu cuenta" });
  await h.getByRole("button", { name: "Salir de la demo", exact: true }).tap();
  await page.waitForURL(`${URL}/`);
  await esperar(page, 800);
  const modo = await page.evaluate(() => localStorage.getItem("deslizapp-modo-v1"));
  ok(modo === null, "la demo se olvida (vuelve la entrada)");
  ok((await page.getByRole("button", { name: /Ver demo|demo/i }).count()) > 0 && (await page.locator("header button[aria-haspopup=dialog]").count()) === 0, "se ve la pantalla de entrada, no el panel");
  ok(c.peticiones() === 0, "cero peticiones a Supabase");
  return c;
});

console.log("\nTodo pasa");
await navegador.close();
