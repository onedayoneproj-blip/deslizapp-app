// Prueba del tipo de producto (docs/prompts/tipo-de-producto.md), en la demo: Lino & Algodón con dos rubros (ropa y accesorios) y
// Michel con uno solo, que no debe cambiar en nada. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=360,390] node scripts/probar-tipo-de-producto.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }

const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const ANCHOS = (process.env.ANCHOS ?? "360,390").split(",").map(Number);
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const CLAVE = "deslizapp-demo-v5";
const ok = (cond, msg) => { console.log((cond ? "  ✅ " : "  ❌ ") + msg); if (!cond) throw new Error(msg); };

const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
async function pagina(ancho, tienda) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(({ tienda }) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", tienda);
    for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1");
  }, { tienda });
  return { ctx, page, errores };
}
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const hoja = (page) => page.locator('[role="dialog"]').last();

for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);

  console.log("• Lino & Algodón (ropa y accesorios): panel");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector("[data-filtro-tipo]");
    ok(await sinDesborde(page), "el Catálogo no desborda");
    const opciones = await page.locator("[data-filtro-tipo] option").allInnerTexts();
    ok(opciones.join() === "Todos los tipos,Ropa,Accesorios", "el filtro ofrece Todos los tipos, Ropa, Accesorios");
    await page.selectOption("[data-filtro-tipo]", "accesorios");
    await page.waitForTimeout(500);
    const tarjetas = await page.locator('a[href^="/catalogo/a3000000"]').allInnerTexts();
    ok(tarjetas.length === 2 && tarjetas.every((t) => /Cinturón|Sombrero/.test(t)), "filtrar por Accesorios deja solo los dos accesorios");
    await page.selectOption("[data-filtro-tipo]", "todos");
    await page.waitForTimeout(500);
    ok((await page.locator('a[href^="/catalogo/a3000000"]').count()) === 4, "Todos los tipos devuelve los 4 productos");

    console.log("• producto nuevo: tipo por defecto, cambiarlo, y el siguiente sale con el último");
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.waitForSelector("[data-tipo-producto]");
    ok((await page.inputValue("[data-tipo-producto]")) === "ropa", "un producto nuevo sale con el tipo principal (Ropa)");
    ok((await page.locator("[data-tipo-producto] option").allInnerTexts()).join() === "Ropa,Accesorios,Vendo otra cosa también", "el selector trae los tipos y «Vendo otra cosa también»");
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Gorra de prueba");
    await page.getByRole("textbox", { name: /Precio/ }).fill("500");
    await page.selectOption("[data-tipo-producto]", "accesorios");
    await page.locator("[data-entrada-medios]").setInputFiles([{ name: "gorra.png", mimeType: "image/png", buffer: PNG }]);
    await page.getByRole("button", { name: /^Foto 1 de 1/ }).waitFor();
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo`);
    const creado = (await db(page)).productos.find((p) => p.nombre === "Gorra de prueba");
    ok(creado && creado.rubro === "accesorios", "se guardó con el tipo Accesorios");
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.waitForSelector("[data-tipo-producto]");
    ok((await page.inputValue("[data-tipo-producto]")) === "accesorios", "el siguiente producto nuevo sale con el último tipo (Accesorios)");

    console.log("• editar: cambiar el tipo con el selector");
    const sombrero = (await db(page)).productos.find((p) => p.nombre === "Sombrero de paja");
    await page.goto(`${URL}/catalogo/${sombrero.id}/editar`);
    await page.waitForSelector("[data-tipo-producto]");
    ok((await page.inputValue("[data-tipo-producto]")) === "accesorios", "el sombrero muestra Accesorios");
    await page.selectOption("[data-tipo-producto]", "ropa");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await page.waitForTimeout(1500);
    ok((await db(page)).productos.find((p) => p.id === sombrero.id).rubro === "ropa", "el cambio a Ropa quedó guardado");
    ok(errores.length === 0, "sin errores de la página: " + errores.join("; "));
    await ctx.close();
  }

  console.log("• Lino & Algodón: «Lo que vendes» no deja quitar un tipo en uso");
  {
    const { ctx, page } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector('header button[aria-haspopup="dialog"]');
    await page.waitForTimeout(900);
    await page.locator('header button[aria-haspopup="dialog"]').first().tap();
    await page.waitForSelector("[data-tienda-activa]");
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Mi marca")').first().tap();
    await page.getByRole("button", { name: /Lo que vendes/ }).tap();
    await page.getByRole("checkbox", { name: /Accesorios/ }).tap();
    await page.getByRole("button", { name: "Guardar", exact: true }).tap();
    await page.waitForTimeout(800);
    ok(/No puedes quitar ese tipo/.test(await page.locator("body").innerText()), "avisa que Accesorios lo usan productos");
    ok(/Cinturón de cuero/.test(await page.locator("body").innerText()), "y dice cuáles");
    await ctx.close();
  }

  console.log("• Lino & Algodón: catálogo del cliente");
  {
    const { ctx, page } = await pagina(ancho, LINO);
    await page.goto(`${URL}/tienda/lino-y-algodon?demo`);
    await page.waitForSelector("button[aria-label^='Buscar']");
    await page.getByRole("button", { name: /^Buscar/ }).first().click();
    await page.waitForSelector(".srtipos");
    const pastillas = await page.locator(".srtipos button").allInnerTexts();
    ok(pastillas.join() === "Todo,Ropa,Accesorios", "la búsqueda muestra las pastillas Todo, Ropa, Accesorios");
    await page.locator("#srIn").fill("accesorios");
    await page.waitForTimeout(300);
    ok((await page.locator(".sritem").count()) === 2, "escribir «accesorios» deja solo los 2 accesorios");
    await page.locator("#srIn").fill("");
    await page.locator(".srtipos button", { hasText: "Ropa" }).click();
    ok((await page.locator(".sritem").count()) === 2, "la pastilla Ropa muestra solo la ropa");
    ok(await sinDesborde(page), "sin desborde horizontal");
    await ctx.close();
  }

  console.log("• Esencias Michel (un solo rubro): nada cambia");
  {
    const { ctx, page, errores } = await pagina(ancho, MICHEL);
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector('a[href^="/catalogo/a3000000"]');
    ok((await page.locator("[data-filtro-tipo]").count()) === 0, "el Catálogo no tiene el filtro de tipos");
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).waitFor();
    ok((await page.locator("[data-tipo-producto]").count()) === 0, "el producto nuevo no tiene la fila Tipo de producto");
    await page.goto(`${URL}/tienda/esencias-michel?demo`);
    await page.waitForSelector("button[aria-label^='Buscar']");
    await page.getByRole("button", { name: /^Buscar/ }).first().click();
    await page.waitForSelector("#srIn");
    ok((await page.locator(".srtipos").count()) === 0, "la búsqueda del cliente no tiene pastillas de tipo");
    ok(errores.length === 0, "sin errores de la página: " + errores.join("; "));
    await ctx.close();
  }
}
await navegador.close();
console.log("\nTodo bien.");
