// Flujo de creación como una historia. Demo, anchos 360/390/430 px.
// URL=http://localhost:3000 [CAPTURAS=docs/capturas/crear-producto-codex] node scripts/probar-crear-producto.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const ok = (condition, message) => { console.log(`${condition ? "✅" : "❌"} ${message}`); if (!condition) throw new Error(message); };
const browser = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const captura = async (page, nombre) => { if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, nombre), fullPage: false }); };
const silenciarAvisoDeOtroDespliegue = (page) => page.route("**/api/version", (route) => route.abort());
const medir = async (page, paso) => {
  if (![390, 393].includes(page.viewportSize().width)) return;
  const m = await page.evaluate(() => {
    const rect = (selector) => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height) }; };
    return { tarjeta: rect("[data-tarjeta-variantes], [data-tarjeta-historia='foto'], [data-tarjeta-historia]:not([data-tarjeta-historia='foto']), [data-foto-principal]"), titulo: rect("[data-presentaciones-historia] h2, [data-momento-historia] h2:not(.sr-only)"), campo: rect("[data-presentaciones-historia] input[placeholder], [data-momento-historia] input[placeholder], [data-momento-historia] [data-precio], [data-momento-historia] .flex.items-center.gap-1"), avance: rect("[aria-label^='Momento']"), boton: rect(".hoja-abajo button") };
  });
  console.log(`📐 ${page.viewportSize().width}×${page.viewportSize().height} ${paso}: ${JSON.stringify(m)}`);
};
for (const width of [360, 390, 393, 430]) {
  const height = width === 360 ? 640 : width === 393 ? 852 : 844;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((teclado) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003");
    const vv = window.visualViewport;
    let abierto = false;
    Object.defineProperty(vv, "height", { get: () => abierto ? innerHeight - teclado : innerHeight, configurable: true });
    window.__teclado = (valor) => { abierto = valor; vv.dispatchEvent(new Event("resize")); vv.dispatchEvent(new Event("scroll")); };
  }, 336);
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.locator("[data-entrada-medios]").setInputFiles(join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg"));
  await page.waitForSelector("[data-foto-principal]");
  ok(await page.locator("[data-foto-principal]").evaluate((e) => Math.round(e.getBoundingClientRect().height)) === 372, `${width}px: tarjeta de foto mide 372px`);
  ok(await page.getByRole("button", { name: "Seguir" }).isVisible(), `${width}px: controles fijos de la historia`);
  if ([390, 393].includes(width)) await medir(page, `${width}-foto`);
  const seguirFoto = await page.getByRole("button", { name: "Seguir", exact: true }).boundingBox();
  ok(seguirFoto.x + seguirFoto.width <= width - 19, `${width}px: Seguir queda dentro del margen derecho`);
  if (width === 390) await captura(page, "b1-foto-390.png");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Vestido de prueba");
  if ([390, 393].includes(width)) await medir(page, `${width}-nombre`);
  if (width === 390) await captura(page, "b2-nombre-390.png");
  await page.getByRole("button", { name: "Seguir" }).click();
  const priceCard = page.locator("[data-tarjeta-historia]").first();
  const priceBox = await priceCard.boundingBox();
  ok(Math.round(priceBox.width) === Math.min(350, width - 40) && Math.round(priceBox.height) === 372, `${width}px: tarjeta de preguntas mide 350×372`);
  await page.getByPlaceholder("Escribe el precio").fill("1450");
  if ([390, 393].includes(width)) await medir(page, `${width}-precio`);
  if (width === 390) await captura(page, "b3-precio-390.png");
  if (width === 360) {
    await page.evaluate(() => window.__teclado?.(true));
    await captura(page, "precio-teclado-360.png");
    await page.evaluate(() => window.__teclado?.(false));
  }
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Agregar una unidad" }).click();
  if ([390, 393].includes(width)) await medir(page, `${width}-stock`);
  if (width === 390) await captura(page, "b4-stock-390.png");
  const cardSizes = await page.locator("[data-tarjeta-historia]").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  ok(cardSizes.every(([w, h]) => w === Math.min(350, width - 40) && h === 372), `${width}px: geometría estable entre preguntas (${JSON.stringify(cardSizes)})`);
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.locator("[data-reel-reducido]").waitFor();
  const reelBox = await page.locator("[data-reel-reducido]").boundingBox();
  ok(Math.round(reelBox.width) === Math.min(350, width - 40) && Math.round(reelBox.height) === 440, `${width}px: reel real dentro de marco de 440px`);
  ok(await page.locator("[data-reel-reducido] iframe").getAttribute("src") === "/vista-previa-catalogo", `${width}px: vista usa el reel del catálogo`);
  await page.waitForFunction(() => document.querySelector("[data-reel-reducido] iframe")?.contentDocument?.body?.innerText.includes("Vestido de prueba"), { timeout: 10000 });
  if ([390, 393].includes(width)) await medir(page, `${width}-vista`);
  const publicar = await page.getByRole("button", { name: "Publicar", exact: true }).boundingBox();
  ok(Math.round(publicar.width) === width - 40, `${width}px: Publicar ocupa el ancho útil completo`);
  ok(await page.getByRole("button", { name: "Ver reel del catálogo", exact: true }).count() === 0, `${width}px: sin botón redundante de reel`);
  ok(await page.locator("[data-momento-historia] [data-fila-plegable]").count() === 0, `${width}px: opcionales como pastillas, sin filas plegables`);
  if (width === 390) {
    await captura(page, "b5-vista-catalogo-390.png");
    await captura(page, "b5-pastillas-390.png");
    await page.getByRole("button", { name: "+ Descripción", exact: true }).click();
    await page.getByRole("textbox", { name: "Descripción", exact: true }).fill("Descripción añadida desde la vista previa");
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await page.getByRole("button", { name: "+ Descripción", exact: true }).click();
    ok(await page.getByRole("textbox", { name: "Descripción", exact: true }).inputValue() === "Descripción añadida desde la vista previa", "La hoja de descripción conserva el borrador al reabrir");
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await page.getByRole("button", { name: "+ Colección", exact: true }).click();
    await page.getByRole("button", { name: "Agregar colección", exact: true }).waitFor();
    await page.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await page.getByRole("button", { name: "+ Ficha técnica", exact: true }).click();
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await page.getByRole("heading", { name: "Ficha técnica", exact: true, level: 2 }).waitFor({ state: "hidden" });
  }
  ok(!(await page.getByText("Agotado", { exact: true }).count()), `${width}px: la creación no muestra el sello Agotado`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: no hay desborde horizontal`);
  if ([390, 393].includes(width)) {
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.getByText("¡Ya está en tu catálogo!", { exact: true }).last().waitFor();
    await medir(page, "celebracion");
    if (width === 390) {
      await captura(page, "b6-celebracion-390.png");
      await page.getByRole("button", { name: "Agregar otro" }).click();
      await page.locator("[data-momento-historia='1']").waitFor();
      ok(await page.locator("[data-historia-crear] input[placeholder='El nombre de tu producto']").count() === 0, "Agregar otro reinicia la historia");
    }
  }
  await context.close();
  if (errors.length) throw new Error(`${width}px: errores de página: ${errors.join(" | ")}`);
}
// Fotos múltiples: selección sin hoja, contador, agregar, ordenar y quitar.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  await page.addInitScript(() => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003");
  });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  const foto = (nombre) => join(process.cwd(), "public/catalogos/esencias-michel/fotos", nombre);
  await page.locator("[data-entrada-medios]").setInputFiles([foto("yara-rosa.jpg"), foto("oxana.webp"), foto("asad-bourbon.jpg")]);
  await page.locator("[data-contador-fotos]").getByText("1 / 3", { exact: true }).waitFor();
  await page.getByText("Portada", { exact: true }).waitFor();
  await captura(page, "b1-fotos-multiples-390.png");
  const primera = await page.locator("[data-foto-principal] img").getAttribute("src");
  await page.getByRole("button", { name: "Foto 3 de 3", exact: true }).click();
  ok((await page.locator("[data-contador-fotos]").innerText()).trim() === "3 / 3", "Miniatura cambia el contador a 3 / 3");
  ok(await page.locator("[data-foto-principal] img").getAttribute("src") !== primera, "Miniatura cambia la imagen principal");
  ok(await page.getByRole("button", { name: "Quitar foto", exact: true }).count() === 0, "Seleccionar miniatura no abre otra hoja");
  await captura(page, "b1-fotos-multiples-activa-390.png");
  await page.getByRole("button", { name: "Foto principal: ver opciones", exact: true }).click();
  await page.getByRole("button", { name: "Mover a la izquierda", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar", exact: true }).last().click();
  ok((await page.locator("[data-contador-fotos]").innerText()).trim() === "2 / 3", "Reordenar conserva la foto activa y actualiza su posición");
  await page.getByRole("button", { name: "Foto principal: ver opciones", exact: true }).click();
  await page.getByRole("button", { name: "Quitar foto", exact: true }).click();
  await page.locator("[data-contador-fotos]").getByText("1 / 2", { exact: true }).waitFor();
  const archivo = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Agregar foto", exact: true }).click();
  await (await archivo).setFiles(foto("asad-bourbon.jpg"));
  await page.locator("[data-contador-fotos]").getByText("1 / 3", { exact: true }).waitFor();
  console.log("✅ Fotos: seleccionar, reordenar, quitar y agregar conservan el contador y la portada");
  await context.close();
}
// «Por encargo»: plazo Otro, preview real, atrás y volver conservan el texto.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.locator("[data-entrada-medios]").setInputFiles(join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg"));
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Vestido por encargo");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("Escribe el precio").fill("1450");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("radio", { name: "Otro" }).click();
  await page.getByPlaceholder("Escríbelo en hasta 40 letras").fill("Llega en 7 días");
  if (CAPTURAS) await captura(page, "b5a-plazo-por-encargo-390.png");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.waitForFunction(() => document.querySelector("[data-reel-reducido] iframe")?.contentDocument?.body?.innerText.includes("Vestido por encargo"), { timeout: 10000 });
  ok(await page.locator("[data-reel-reducido]").count() === 1, "Por encargo: llega a la vista previa del reel");
  if (CAPTURAS) await captura(page, "b5b-reel-por-encargo-390.png");
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.getByRole("button", { name: "Atrás" }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  ok(await page.getByPlaceholder("Escríbelo en hasta 40 letras").inputValue() === "Llega en 7 días", "Por encargo: el plazo Otro se conserva al apagar y volver a encender");
  await context.close();
}

// Variantes en la misma historia: ejes → valores → fotos opcionales → stock agrupado → detalle → reel.
for (const width of [390, 393]) {
  const height = width === 390 ? 844 : 852;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.locator("[data-entrada-medios]").setInputFiles(join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg"));
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Hoodie con presentaciones");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("Escribe el precio").fill("1450");
  await page.getByRole("button", { name: "Tiene tallas o colores" }).click();
  await page.locator("[data-presentaciones-historia][data-etapa='ejes']").waitFor();
  for (const [nombre, elegido] of [["Talla", true], ["Color", true]]) {
    const opcion = page.getByRole("checkbox", { name: nombre, exact: true });
    await opcion.waitFor();
    if ((await opcion.getAttribute("aria-checked")) !== String(elegido)) await opcion.click();
  }
  ok(await page.getByRole("checkbox", { name: "Talla" }).getAttribute("aria-checked") === "true", `${width}px: Talla preseleccionada en el paso de atributos`);
  ok(await page.getByRole("checkbox", { name: "Color" }).getAttribute("aria-checked") === "true", `${width}px: Color preseleccionado en el paso de atributos`);
  const box = await page.locator("[data-tarjeta-variantes]").boundingBox();
  ok(Math.round(box.width) === 350 && Math.round(box.height) === 212, `${width}px: tarjeta de variantes mide 350×212`);
  const seguirVariantes = await page.getByRole("button", { name: "Seguir", exact: true }).boundingBox();
  ok(seguirVariantes.x + seguirVariantes.width <= width - 19, `${width}px: Seguir de variantes queda dentro del margen derecho`);
  await medir(page, "variantes-atributos");
  if (width === 390) await captura(page, "v1-atributos-390.png");
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.locator("[data-presentaciones-historia][data-etapa='valores'] h2").filter({ hasText: "tallas" }).waitFor();
  for (const talla of ["S", "M", "L"]) await page.getByRole("checkbox", { name: talla, exact: true }).click();
  await medir(page, "variantes-tallas");
  if (width === 390) await captura(page, "v2-valores-talla-390.png");
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.locator("[data-presentaciones-historia][data-etapa='valores'] h2").filter({ hasText: "colores" }).waitFor();
  for (const color of ["Crema", "Bosque"]) await page.getByRole("checkbox", { name: color }).click();
  if (width === 390) {
    await page.locator('[data-foto-valor="Crema"]').click();
    await page.locator("[data-hoja-foto-color]").waitFor();
    await page.getByRole("button", { name: "Elegir", exact: true }).first().click();
    await page.getByRole("radio", { name: /Foto 1/ }).click();
    await page.getByRole("button", { name: "Listo", exact: true }).last().click();
    ok((await page.locator('[data-foto-valor="Crema"]').innerText()).includes("Foto 1"), "Foto opcional: se asigna una foto a un color");
    await captura(page, "v3-valores-color-390.png");
  }
  await medir(page, "variantes-colores");
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.locator("[data-presentaciones-historia][data-etapa='stock']").waitFor();
  const botonListo = page.getByRole("button", { name: /^Listo ·/ });
  ok(await botonListo.isDisabled(), `${width}px: stock en cero bloquea la vista previa`);
  await medir(page, "variantes-stock");
  ok(await page.locator("[data-total-presentaciones]").innerText() === "6 presentaciones · 0 en total", `${width}px: se crean las 6 combinaciones de dos atributos`);
  await page.getByRole("button", { name: "Poner a todas" }).click();
  await page.getByRole("button", { name: "Agregar una unidad a todas" }).click();
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  ok((await page.locator("[data-total-presentaciones]").innerText()).endsWith("12 en total"), `${width}px: Poner a todas aplica la misma cantidad y suma los grupos`);
  const stockObjetivo = [["Crema · S", 4], ["Crema · M", 5], ["Crema · L", 3], ["Bosque · S", 3], ["Bosque · M", 4], ["Bosque · L", 2]];
  for (const [variante, objetivo] of stockObjetivo) {
    for (let n = 2; n < objetivo; n++) await page.getByRole("button", { name: `Agregar uno de ${variante}`, exact: true }).click();
  }
  ok((await page.locator('[aria-label="Color Crema"] [data-total-grupo]').innerText()) === "12 en total", `${width}px: la suma del grupo Crema cuadra`);
  ok(!(await page.getByText("Agotada", { exact: true }).count()), `${width}px: producto en creación sin estado Agotada`);
  if (width === 390) {
    await medir(page, "variantes-stock-repartido");
    await captura(page, "v4-stock-390.png");
    await page.getByRole("button", { name: "Detalle", exact: true }).first().click();
    await page.locator("[data-hoja-presentacion]").waitFor();
    await page.getByRole("radio", { name: "Uno propio", exact: true }).click();
    await page.getByLabel("Precio de esta presentación, en pesos").fill("1650");
    await captura(page, "v5-detalle-presentacion-390.png");
    await page.getByRole("button", { name: "Ocultar esta presentación", exact: true }).click();
    await page.getByRole("button", { name: "Listo", exact: true }).last().click();
    ok((await page.locator('[aria-label="Color Crema"] [data-total-grupo]').innerText()) === "8 en total", "Ocultar una presentación la excluye de la suma de stock activa");
  }
  await page.getByRole("button", { name: /^Listo ·/ }).click();
  await page.locator("[data-momento-historia='6']").waitFor();
  await page.waitForFunction(() => document.querySelector("[data-reel-reducido] iframe")?.contentDocument?.body?.innerText.includes("Hoodie con presentaciones"), { timeout: 10000 });
  ok(await page.locator("[data-reel-reducido]").boundingBox().then((r) => Math.round(r.height)) === 440, `${width}px: preview conserva el marco real del reel`);
  ok(await page.locator("[data-reel-reducido] iframe").evaluate((e) => e.contentDocument?.body?.innerText.includes("Ver presentaciones")), `${width}px: el reel muestra Ver presentaciones`);
  ok(await page.locator("[data-reel-reducido] iframe").evaluate((e) => { const t = e.contentDocument?.querySelector(".pres-btn > span:last-child"); return !!t && t.scrollWidth <= t.clientWidth; }), `${width}px: el CTA «Ver presentaciones» se ve completo`);
  if (width === 390) await captura(page, "v6-vista-catalogo-390.png");
  ok(!(await page.getByText("Agotada", { exact: true }).count()), `${width}px: reel de creación sin estado Agotada`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: ramas de presentaciones sin desborde horizontal`);
  if (errors.length) throw new Error(`${width}px variantes: errores de página: ${errors.join(" | ")}`);
  await context.close();
}

// Producto por encargo con presentaciones: cero stock y plazo guardados en el mismo producto.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.locator("[data-entrada-medios]").setInputFiles(join(process.cwd(), "public/catalogos/esencias-michel/fotos/yara-rosa.jpg"));
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Vestido por encargo con tallas");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("Escribe el precio").fill("1450");
  await page.getByRole("button", { name: "Tiene tallas o colores" }).click();
  await page.locator("[data-presentaciones-historia][data-etapa='ejes']").waitFor();
  for (const [nombre, elegido] of [["Talla", true], ["Color", false]]) {
    const opcion = page.getByRole("checkbox", { name: nombre, exact: true });
    await opcion.waitFor();
    if ((await opcion.getAttribute("aria-checked")) !== String(elegido)) await opcion.click();
  }
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByRole("checkbox", { name: "S", exact: true }).click();
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByRole("button", { name: "Es por encargo, no llevo stock", exact: true }).click();
  await page.getByRole("radio", { name: "Otro", exact: true }).click();
  await page.getByPlaceholder("Escríbelo en hasta 40 letras").fill("Llega en 7 días");
  await page.getByRole("button", { name: "Listo · 0 en total", exact: true }).click();
  await page.locator("[data-momento-historia='6']").waitFor();
  ok(!(await page.locator("[data-reel-reducido] iframe").evaluate((e) => e.contentDocument?.body?.innerText.includes("Agotada"))), "Por encargo con variantes no muestra Agotada en la vista previa");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.getByText("¡Ya está en tu catálogo!", { exact: true }).last().waitFor();
  const persistido = await page.evaluate((productoNombre) => {
    const db = JSON.parse(localStorage.getItem("deslizapp-demo-v5") ?? "null");
    const producto = db?.productos?.find((p) => p.nombre === productoNombre);
    return producto && { porEncargo: producto.porEncargo, encargoTexto: producto.encargoTexto, stock: producto.stock, variantes: db.variantes.filter((v) => v.productoId === producto.id).map((v) => v.stock) };
  }, "Vestido por encargo con tallas");
  ok(persistido?.porEncargo === true && persistido.encargoTexto === "Llega en 7 días" && persistido.stock === 0 && persistido.variantes.length === 1 && persistido.variantes[0] === 0, "Por encargo con presentaciones guarda stock 0 y el plazo en cada dato persistido");
  await context.close();
}

// Se permite guardar sin foto; queda oculto y no exige publicar.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Producto sin foto");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByPlaceholder("Escribe el precio").fill("600");
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Agregar una unidad" }).click();
  await page.getByRole("button", { name: "Seguir" }).click();
  await page.getByRole("button", { name: "Guardar sin publicar" }).click();
  await page.getByText("Producto sin foto ya está guardado, oculto del catálogo.", { exact: true }).waitFor();
  if (CAPTURAS) await captura(page, "sin-foto-oculto-390.png");
  console.log("✅ Se puede guardar sin foto y queda oculto");
  await context.close();
}

// Cerrar una historia con cambios pregunta; continuar conserva el borrador.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await silenciarAvisoDeOtroDespliegue(page);
  await page.addInitScript(() => { localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"); });
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.locator("[data-historia-crear]").waitFor();
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByPlaceholder("El nombre de tu producto").fill("Borrador que continúa");
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await page.getByPlaceholder("Escribe el precio").fill("875");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByText("¿Salir sin guardar?", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Seguir aquí", exact: true }).click();
  ok(await page.getByPlaceholder("Escribe el precio").inputValue() === "875", "Salir con cambios: «Seguir aquí» conserva el precio del borrador");
  await context.close();
}
await browser.close();
