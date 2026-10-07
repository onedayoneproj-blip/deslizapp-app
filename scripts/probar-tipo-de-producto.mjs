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
const H = "[data-hoja-cabecera] [data-selector-catalogo]"; // el selector de la hoja (la pestaña Catálogo queda debajo)

// El selector es un menú flotante (components/ui/menu-flotante.tsx): se abre al tocar y sus opciones viven en un portal.
const MENU = "[data-menu-flotante]";
const valorDe = async (page, sel) => ((await page.locator(sel).getAttribute("aria-label")) ?? "").replace(/^[^:]+: /, "").replace(/\. Cambiar$/, "");
const abrirMenu = async (page, sel) => { await page.locator(sel).tap(); await page.waitForSelector(MENU); await page.waitForTimeout(250); };
const opcionesDe = async (page, sel) => { await abrirMenu(page, sel); const t = (await page.locator(MENU + " button").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim()); await page.keyboard.press("Escape"); await page.waitForTimeout(200); return t; };
const elegir = async (page, sel, texto) => { await abrirMenu(page, sel); await page.locator(MENU + " button").filter({ hasText: texto }).first().tap(); await page.waitForTimeout(300); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);

  console.log("• Lino & Algodón (ropa y accesorios): panel");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector("[data-selector-catalogo]");
    ok(await sinDesborde(page), "el Catálogo no desborda");
    ok((await page.locator("h1 [data-selector-catalogo]").getAttribute("aria-label")) === "Catálogo: Ropa. Cambiar", "el título es el selector: «Catálogo: Ropa. Cambiar»");
    const opciones = await opcionesDe(page, "h1 [data-selector-catalogo]");
    ok(opciones.join() === "Ropa 2,Accesorios 2,Lo que vendes", "ofrece Ropa · 2, Accesorios · 2 y «Lo que vendes…» (sin «Todo»)");
    ok(/Tus catálogos viven aquí/.test(await page.locator("body").innerText()), "el subtítulo habla de los catálogos");
    await elegir(page, "h1 [data-selector-catalogo]", "Accesorios");
    await page.waitForTimeout(500);
    const tarjetas = await page.locator('a[href^="/catalogo/a3000000"]').allInnerTexts();
    ok(tarjetas.length === 2 && tarjetas.every((t) => /Cinturón|Sombrero/.test(t)), "Accesorios deja solo los dos accesorios");
    ok((await page.getByPlaceholder("Busca en Accesorios").count()) === 1, "el buscador dice «Busca en Accesorios»");
    await page.reload();
    await page.waitForSelector("[data-selector-catalogo]");
    ok((await valorDe(page, "h1 [data-selector-catalogo]")) === "Accesorios", "al volver abre el último catálogo que miró");

    console.log("• producto nuevo: sale con el catálogo activo; el selector va fijo en la cabecera");
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.waitForSelector(H);
    ok((await valorDe(page, H)) === "Accesorios", "un producto nuevo sale con el catálogo activo (Accesorios)");
    ok((await page.locator("[data-hoja-cabecera] [data-selector-catalogo]").count()) === 1, "el selector está en la cabecera de la hoja");
    ok((await opcionesDe(page, H)).join() === "Ropa 2,Accesorios 2,Vendo otra cosa también", "trae los catálogos y «Vendo otra cosa también»");
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Gorra de prueba");
    await page.getByRole("textbox", { name: /Precio/ }).fill("500");
    await elegir(page, H, "Ropa");
    await page.locator("[data-entrada-medios]").setInputFiles([{ name: "gorra.png", mimeType: "image/png", buffer: PNG }]);
    await page.getByRole("button", { name: /^Foto 1 de 1/ }).waitFor();
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo`);
    const creado = (await db(page)).productos.find((p) => p.nombre === "Gorra de prueba");
    ok(creado && creado.rubro === "ropa", "se guardó con el catálogo elegido en la hoja (Ropa)");

    console.log("• editar: cambiar el tipo con el selector");
    const sombrero = (await db(page)).productos.find((p) => p.nombre === "Sombrero de paja");
    await page.goto(`${URL}/catalogo/${sombrero.id}/editar`);
    await page.waitForSelector(H);
    ok((await valorDe(page, H)) === "Accesorios", "el sombrero muestra Accesorios");
    await elegir(page, H, "Ropa");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await page.waitForTimeout(1500);
    ok((await db(page)).productos.find((p) => p.id === sombrero.id).rubro === "ropa", "el cambio a Ropa quedó guardado");
    ok(errores.length === 0, "sin errores de la página: " + errores.join("; "));
    await ctx.close();
  }

  console.log("• catálogo vacío, «Lo que vendes…» y Ayudante");
  {
    const { ctx, page } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector("[data-selector-catalogo]");
    // Un catálogo recién agregado y sin productos: se suma «Hogar» con «Lo que vendes…».
    await elegir(page, "h1 [data-selector-catalogo]", "Lo que vendes");
    await page.getByRole("checkbox", { name: /Hogar/ }).tap();
    await page.getByRole("button", { name: "Guardar", exact: true }).tap();
    await page.waitForTimeout(900);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    await elegir(page, "h1 [data-selector-catalogo]", "Hogar");
    await page.waitForTimeout(500);
    const cuerpo = await page.locator("body").innerText();
    ok(/Todavía no hay nada en Hogar/.test(cuerpo) && !/Tu vitrina está vacía/.test(cuerpo), "un catálogo vacío tiene su estado pequeño (no «Tu vitrina está vacía»)");
    ok((await page.getByRole("link", { name: "Agregar producto" }).count()) === 0, "sin botón propio al centro (la píldora «Agregar producto» ya no existe)");
    const flot = page.getByRole("link", { name: /Producto/ });
    ok((await flot.count()) === 1 && (await flot.locator("svg").count()) === 1, "el botón flotante «+ Producto» sigue ahí, con su «+»");
    const caja = await flot.boundingBox();
    ok(caja.x + caja.width > 330 && caja.y > 600, "…abajo a la derecha");
    await flot.tap();
    await page.waitForSelector(H);
    ok((await valorDe(page, H)) === "Hogar", "«+ Producto» sale con el catálogo que se está viendo");
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector("[data-selector-catalogo]");
    await elegir(page, "h1 [data-selector-catalogo]", "Lo que vendes");
    await page.waitForTimeout(700);
    ok((await page.locator('[role="dialog"]').count()) === 1 && (await valorDe(page, "h1 [data-selector-catalogo]")) === "Hogar", "«Lo que vendes…» abre la hoja y deja el catálogo elegido como estaba");
    // Ayudante (sin permiso de catálogo): el nombre sin chevron y la tostada de siempre, nada de select.
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector('header button[aria-haspopup="dialog"]');
    await page.waitForTimeout(900);
    await page.locator('header button[aria-haspopup="dialog"]').first().tap();
    await page.waitForSelector("[data-tienda-activa]");
    await page.waitForTimeout(500);
    await page.locator('[data-mirar-como] [role="radio"]:has-text("Ayudante")').tap();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.waitForSelector("[data-hoja-cabecera] [data-selector-catalogo]");
    ok((await page.locator("[data-hoja-cabecera] select").count()) === 0, "Ayudante: el selector de la hoja no es un select");
    await page.locator("[data-hoja-cabecera] [data-selector-catalogo]").tap();
    await page.waitForSelector("text=Esto lo hace quien administra la tienda.", { timeout: 4000 });
    ok(true, "Ayudante: al tocarlo sale «Esto lo hace quien administra la tienda.»");
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
    ok((await page.locator("[data-selector-catalogo]").count()) === 0, "el Catálogo no tiene selector de catálogos");
    ok(/Tu catálogo/.test(await page.locator("h1").innerText()), "el título sigue siendo «Tu catálogo»");
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).waitFor();
    ok((await page.locator("[data-selector-catalogo]").count()) === 0, "el producto nuevo no tiene selector de catálogos");
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
