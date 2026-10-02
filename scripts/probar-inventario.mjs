// Prueba de la vista previa y ajustes de stock en demo. Nunca toca Supabase.
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
const ok = (cond, msg) => {
  console.log((cond ? "✅ " : "❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const textoStock = (page) => page.locator('section[aria-label="Inventario"] p[aria-live="polite"]').innerText();
const numeroStock = async (page) => Number((await textoStock(page)).match(/^\d+/)?.[0]);

const navegador = await playwright.chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {},
);
const ctx = await navegador.newContext({ viewport: { width: Number(process.env.ANCHO ?? 390), height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem("deslizapp-version-vista", "9.9.9");
  localStorage.setItem("deslizapp-modo-v1", "demo");
});

try {
  await page.goto(URL + "/catalogo");
  await page.waitForSelector("main ul li a");
  const producto = await page.locator("main ul li a").evaluateAll((enlaces) => {
    const a = enlaces.find((e) => /^\/catalogo\/[^/]+$/.test(e.getAttribute("href") ?? "") && /\b[1-9][0-9]* en stock\b/.test(e.getAttribute("aria-label") ?? ""));
    return a ? { href: a.getAttribute("href"), nombre: a.getAttribute("aria-label")?.split(",")[0] } : null;
  });
  ok(Boolean(producto), "Catálogo demo: hay producto con stock controlado");
  await page.goto(URL + producto.href);
  await page.waitForSelector('[role="dialog"] section[aria-label="Inventario"]');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Vista previa sin overflow horizontal");
  const inicial = await numeroStock(page);
  const nombre = producto.nombre;

  await page.getByRole("button", { name: "Aumentar stock de " + nombre }).click();
  await page.waitForFunction((n) => Number(document.querySelector('section[aria-label="Inventario"] p[aria-live="polite"]')?.textContent?.match(/^\d+/)?.[0]) === n, inicial + 1);
  ok((await numeroStock(page)) === inicial + 1, "Aumentar registra reposición y actualiza la cantidad");
  // La demo persiste su semilla al realizar la primera escritura.
  const pedidoAntes = await page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v3")).pedidos.length);

  await page.getByRole("button", { name: "Disminuir stock de " + nombre }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.waitForTimeout(350);
  ok((await page.locator('[role="dialog"]').count()) === 1 && (await numeroStock(page)) === inicial + 1, "Cancelar la confirmación conserva producto y stock");

  await page.getByRole("button", { name: "Disminuir stock de " + nombre }).click();
  await page.getByRole("radio", { name: "Daño" }).click();
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Confirmación sin overflow horizontal");
  await page.getByRole("button", { name: "Guardar ajuste" }).click();
  await page.waitForFunction((n) => Number(document.querySelector('section[aria-label="Inventario"] p[aria-live="polite"]')?.textContent?.match(/^\d+/)?.[0]) === n, inicial);
  ok((await numeroStock(page)) === inicial, "Disminuir pide motivo y registra el ajuste sin hacer una venta");
  const registros = await page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v3") ?? "{}").ajustesInventario?.length ?? 0);
  const pedidosDespues = await page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v3") ?? "{}").pedidos?.length ?? -1);
  ok(registros === 2 && pedidosDespues === pedidoAntes, "Dos ajustes quedan en su registro; los pedidos no cambian");

  await page.getByRole("button", { name: "Crear pedido" }).click();
  await page.waitForURL("**/pedidos/nuevo?producto=*");
  ok(new globalThis.URL(page.url()).searchParams.get("producto") === producto.href.split("/").at(-1), "Crear pedido solo abre el formulario con el producto preseleccionado");
  await page.goto(URL + "/catalogo");
  await page.waitForSelector("main ul li a");

  const id = producto.href.split("/").at(-1);
  const ponerStock = async (stock) => {
    await page.evaluate(({ id, stock }) => {
      const db = JSON.parse(localStorage.getItem("deslizapp-demo-v3"));
      const p = db.productos.find((x) => x.id === id);
      p.stock = stock;
      localStorage.setItem("deslizapp-demo-v3", JSON.stringify(db));
    }, { id, stock });
    await page.reload();
    await page.goto(URL + "/catalogo/" + id);
    await page.waitForSelector('[role="dialog"] section[aria-label="Inventario"]');
  };

  await ponerStock(0);
  ok(await page.getByRole("button", { name: "Disminuir stock de " + nombre }).isDisabled(), "Con stock cero no se puede disminuir");
  await ponerStock(null);
  ok((await page.locator('section[aria-label="Inventario"]').getByText("Sin control de stock", { exact: true }).count()) === 1, "Stock null muestra Sin control de stock");
  ok((await page.locator('[role="dialog"] button[aria-label^="Aumentar stock"], [role="dialog"] button[aria-label^="Disminuir stock"]').count()) === 0, "Stock null no muestra controles de cantidad");
  ok(errores.length === 0, "Sin errores de página: " + JSON.stringify(errores));
} finally {
  await ctx.close();
  await navegador.close();
}
