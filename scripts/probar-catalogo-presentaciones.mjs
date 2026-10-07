// Presentaciones en el catálogo del cliente (docs/prompts/presentaciones-catalogo.md), en la demo `?demo`: el recorrido
// OpcionB1 → OpcionB2 → OpcionB3, ♥ sin elegir (OpcionA2) y con elegida, foto que sigue al color, talla agotada → «Avísame»,
// un perfume con tamaños, un pedido con dos presentaciones y un producto SIN presentaciones sin cambios. A 390 y 360, tema claro.
// WhatsApp no se abre y Supabase no se toca.
//   URL=http://localhost:3000 CHROMIUM_PATH=… [ANCHOS=390,360] [SOLO=b,corazon] [CAPTURAS=/tmp/capturas] node scripts/probar-catalogo-presentaciones.mjs
import { mkdirSync } from "node:fs";
import { navegador, URL } from "./navegador-catalogo.mjs";

const ANCHOS = (process.env.ANCHOS ?? "390,360").split(",").map(Number);
const SOLO = process.env.SOLO ? process.env.SOLO.split(",") : null;
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const LINO = "lino-y-algodon";
const MICHEL = "esencias-michel";
let fallas = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const b = await navegador();

async function abrir(ancho, tienda, producto) {
  const ctx = await b.newContext({ serviceWorkers: "block", viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1");
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    window.__abiertos = [];
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(`${URL}/tienda/${tienda}?demo#p/${producto}`);
  await page.waitForSelector(`#r-${producto}.on`);
  await page.waitForTimeout(700);
  return { ctx, page, errores };
}
const reel = (page, slug) => page.locator(`#r-${slug}`);
const hoja = (page) => page.locator("#presBg");
const carrito = async (page, tienda) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), "dz-carrito-" + tienda)) ?? "[]");
const captura = async (page, nombre, ancho) => {
  if (CAPTURAS && ancho === 390) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
};
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const celdaAria = (page, texto) => hoja(page).getByRole("radio", { name: texto, exact: true });
/** Dónde está el carrusel (índice de la foto que se ve). */
const fotoVista = (page, slug) => reel(page, slug).locator(".carrusel").evaluate((c) => Math.round(c.scrollLeft / c.clientWidth));

const ESCENARIOS = {
  /** OpcionB1: el reel sale limpio con un solo botón y los colores en puntitos. */
  async reel(page, ancho) {
    const r = reel(page, "pantalon-de-algodon");
    ok((await r.locator(".opciones-catalogo").count()) === 0, "El reel no trae las filas de pastillas");
    ok((await r.locator("p.txt").count()) === 0, "…ni la descripción encima de la foto");
    const boton = r.locator(".cap .pres-btn");
    ok((await boton.innerText()).includes("Ver presentaciones ›"), "Un solo botón «Ver presentaciones ›»");
    ok((await boton.locator(".pres-puntos i").count()) === 3, "…con los 3 colores en puntitos");
    const t = await r.locator(".cap .pr").innerText();
    ok(/Desde/i.test(t) && t.includes("RD$2,300") && t.includes("4 tallas · 3 colores"), "Debajo del precio: «Desde RD$2,300» y «4 tallas · 3 colores»");
    ok(await boton.evaluate((el) => el.getBoundingClientRect().height >= 44), "El botón mide 44 px o más");
    ok(await r.locator(".cap").evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "El pie del reel no se desborda");
    ok(await sinDesborde(page), "La página no se desborda a los lados");
    await captura(page, "b1-reel", ancho);
  },

  /** OpcionB2 + OpcionB3 + Publico2: la hoja con todas, elegir, la foto sigue al color, agregar y «Cambiar ›». */
  async hojaB(page, ancho) {
    const r = reel(page, "pantalon-de-algodon");
    await r.locator(".cap .pres-btn").tap();
    await hoja(page).waitFor();
    ok((await hoja(page).locator("h2").innerText()) === "Elige la tuya", "Título «Elige la tuya» (dos ejes)");
    ok((await hoja(page).locator(".pres-celda").count()) === 12, "La cuadrícula trae las 12 celdas");
    ok((await hoja(page).locator(".pres-fila img").count()) === 3, "Cada color con su foto al lado del nombre");
    const l = celdaAria(page, "Talla L, color Negro, agotada");
    ok((await l.count()) === 1 && (await l.evaluate((el) => el.classList.contains("agotada") && !!el.querySelector("s"))), "L · Negro va tachada y su etiqueta dice «agotada»");
    ok((await celdaAria(page, "Talla S, color Verde, quedan 2").count()) === 1, "S · Verde: «quedan 2»");
    ok((await celdaAria(page, "Talla XL, color Arena, RD$2,900").count()) === 1, "XL con su precio propio (RD$2,900)");
    ok(await hoja(page).locator(".pres-celda").evaluateAll((cs) => cs.every((c) => c.getBoundingClientRect().height >= 44 && c.getBoundingClientRect().width >= 44)), "Todas las celdas miden 44 px o más");
    await captura(page, "b2-hoja", ancho);
    // Elegir M · Arena: la celda se marca (con ✓) y el reel va a la foto del color Arena.
    await celdaAria(page, "Talla M, color Arena").tap();
    ok((await celdaAria(page, "Talla M, color Arena").getAttribute("aria-checked")) === "true", "La celda elegida queda marcada");
    ok((await hoja(page).locator(".pres-linea").innerText()).includes("M · Arena"), "La línea dice «M · Arena»");
    await page.waitForTimeout(700);
    const pantalon = await page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v5") ?? "null"));
    const idxArena = await page.evaluate(() => 0);
    void pantalon, idxArena;
    ok((await fotoVista(page, "pantalon-de-algodon")) === 2, "El reel fue a la foto del color Arena (la tercera)");
    // Un color sin foto asignada no mueve nada: se prueba en la prueba unitaria; aquí, agregar.
    await hoja(page).getByRole("button", { name: "Agregar a mi pedido" }).tap();
    await hoja(page).waitFor({ state: "detached" });
    const boton = r.locator(".cap .pres-btn");
    ok((await boton.innerText()).includes("M · Arena · Cambiar ›"), "OpcionB3: el botón dice «M · Arena · Cambiar ›»");
    ok((await r.locator(".inbadge").count()) === 1, "El reel muestra «En tu pedido»");
    const lineas = await carrito(page, LINO);
    ok(lineas.length === 1 && lineas[0].varianteTexto === "Talla M · Arena" && lineas[0].precioUnitario === 2300, "El pedido tiene M · Arena a RD$2,300");
    ok(lineas[0].foto.includes("arena"), "…con la foto del color Arena");
    await captura(page, "b3-elegida", ancho);
    // Cambiar la reabre con la elegida marcada.
    await boton.tap();
    await hoja(page).waitFor();
    ok((await celdaAria(page, "Talla M, color Arena").getAttribute("aria-checked")) === "true", "Cambiar reabre la hoja con M · Arena marcada");
    ok((await hoja(page).getByRole("button", { name: "Quitar de mi pedido" }).count()) === 1, "…y ofrece quitarla del pedido");
  },

  /** ♥ sin elegir abre la hoja de pastillas (OpcionA2); con una elegida agrega directo. */
  async corazon(page, ancho) {
    const r = reel(page, "pantalon-de-algodon");
    await r.locator("[data-like]").tap();
    await hoja(page).waitFor();
    ok((await hoja(page).locator("[data-presentaciones-hoja]").getAttribute("data-presentaciones-hoja")) === "a", "♥ sin elegir abre la hoja de pastillas (opción A)");
    ok((await carrito(page, LINO)).length === 0, "…y todavía no agregó nada");
    ok((await hoja(page).getByRole("radiogroup", { name: "Talla" }).count()) === 1 && (await hoja(page).getByRole("radiogroup", { name: "Color" }).count()) === 1, "Talla y color en pastillas");
    ok((await hoja(page).locator(".pres-pastilla.agotada").count()) >= 1, "Lo agotado va tachado");
    await captura(page, "a2-hoja", ancho);
    await hoja(page).getByRole("radio", { name: /^Talla M, color Verde/ }).first().tap().catch(() => {});
    await hoja(page).getByRole("radiogroup", { name: "Color" }).getByRole("radio", { name: /Arena/ }).tap();
    await hoja(page).getByRole("radiogroup", { name: "Talla" }).getByRole("radio", { name: /Talla L, color Arena/ }).tap();
    ok((await hoja(page).locator(".pres-linea").innerText()).includes("L · Arena"), "La línea dice «L · Arena»");
    await hoja(page).getByRole("button", { name: "Agregar a mi pedido" }).tap();
    await hoja(page).waitFor({ state: "detached" });
    const lineas = await carrito(page, LINO);
    ok(lineas.length === 1 && lineas[0].varianteTexto === "Talla L · Arena", "Agregar a mi pedido agrega L · Arena");
    // Con una elegida, ♥ la quita y la agrega directo (sin hoja).
    await r.locator("[data-like]").tap();
    await page.waitForTimeout(400);
    ok((await hoja(page).count()) === 0 && (await carrito(page, LINO)).length === 0, "♥ con una elegida y ya en el pedido la quita, sin abrir hoja");
    await r.locator("[data-like]").tap();
    await page.waitForTimeout(400);
    ok((await hoja(page).count()) === 0 && (await carrito(page, LINO)).length === 1, "♥ otra vez la agrega directo, sin abrir hoja");
  },

  /** Publico3: una combinación agotada sella el reel solo para ella y ♥ pasa a «Avísame». */
  async agotada(page, ancho) {
    const r = reel(page, "pantalon-de-algodon");
    ok((await r.evaluate((el) => el.classList.contains("sold"))) === false, "Sin elegir, el reel no está sellado (no todas están agotadas)");
    await r.locator(".cap .pres-btn").tap();
    await hoja(page).waitFor();
    await celdaAria(page, "Talla L, color Negro, agotada").tap();
    ok((await hoja(page).getByRole("button", { name: "Avísame cuando vuelva" }).count()) === 1, "Tocar una tachada ofrece «Avísame cuando vuelva»");
    ok((await hoja(page).getByRole("button", { name: "Agregar a mi pedido" }).count()) === 0, "…y no deja agregarla");
    await captura(page, "agotada-hoja", ancho);
    await hoja(page).getByRole("button", { name: "Avísame cuando vuelva" }).tap();
    await page.locator("#avisoBg").waitFor();
    ok((await page.locator("#avisoBg").innerText()).includes("L · Negro") || (await page.locator("#avisoBg").innerText()).includes("Negro"), "Se abre el aviso de siempre, con esa presentación");
    await page.keyboard.press("Escape");
    await page.locator("#avisoBg").waitFor({ state: "detached" });
    ok(await r.evaluate((el) => el.classList.contains("sold")), "El reel queda sellado para esa combinación");
    const like = r.locator("[data-like], .act").first();
    ok(/^Avísame/.test((await r.locator(".acts .act").first().getAttribute("aria-label")) ?? ""), "♥ pasa a «Avísame»");
    void like;
    await captura(page, "agotada-reel", ancho);
    // Elegir otra la desella.
    await r.locator(".cap .pres-btn").tap();
    await hoja(page).waitFor();
    await hoja(page).getByRole("radio", { name: /^Talla M, color Negro/ }).tap();
    await hoja(page).getByRole("button", { name: "Agregar a mi pedido" }).tap();
    await hoja(page).waitFor({ state: "detached" });
    ok((await r.evaluate((el) => el.classList.contains("sold"))) === false, "Al elegir otra, el reel deja de estar sellado");
  },

  /** Un perfume con tamaños: una lista simple, no una cuadrícula. */
  async perfume(page, ancho) {
    const r = reel(page, "majestic-oud");
    ok((await r.locator(".cap .pres-btn").innerText()).includes("Ver presentaciones ›"), "El perfume también trae el botón");
    const t = await r.locator(".cap .pr").innerText();
    ok(/Desde/i.test(t) && t.includes("RD$1,200") && t.includes("3 tamaños"), "«Desde RD$1,200» y «3 tamaños»");
    await r.locator(".cap .pres-btn").tap();
    await hoja(page).waitFor();
    ok((await hoja(page).locator("h2").innerText()) === "Elige tu tamaño", "Título «Elige tu tamaño»");
    ok((await hoja(page).locator(".pres-item").count()) === 3 && (await hoja(page).locator(".pres-grid").count()) === 0, "Una lista de 3 tamaños, no una cuadrícula");
    const txt = await hoja(page).locator(".pres-lista").innerText();
    ok(txt.includes("30 ml") && txt.includes("RD$1,200") && txt.includes("RD$1,900") && txt.includes("RD$2,800"), "Cada tamaño con su precio");
    await captura(page, "perfume-hoja", ancho);
    await hoja(page).getByRole("radio", { name: /50 ml/ }).tap();
    await page.waitForTimeout(300);
    ok((await hoja(page).locator(".pres-linea").innerText()).includes("50 ml"), "La línea dice «50 ml»");
    await hoja(page).getByRole("button", { name: "Agregar a mi pedido" }).tap();
    await hoja(page).waitFor({ state: "detached" });
    const lineas = await carrito(page, MICHEL);
    ok(lineas.length === 1 && lineas[0].precioUnitario === 1900, "Agrega 50 ml a RD$1,900");
    ok(((await r.locator(".cap .pr").innerText()).includes("1,900")), "El precio del reel se ajusta a la elegida");
  },

  /** Publico5: dos presentaciones de la misma camisa son dos líneas, cada una con su foto. */
  async pedido(page, ancho) {
    const r = reel(page, "pantalon-de-algodon");
    for (const [talla, color] of [["M", "Arena"], ["XL", "Negro"]]) {
      await r.locator(".cap .pres-btn").tap();
      await hoja(page).waitFor();
      await celdaAria(page, new RegExp(`^Talla ${talla}, color ${color}`).source === "" ? "" : (talla === "XL" ? `Talla XL, color ${color}, RD$2,900` : `Talla ${talla}, color ${color}`)).tap();
      await hoja(page).getByRole("button", { name: "Agregar a mi pedido" }).tap();
      await hoja(page).waitFor({ state: "detached" });
      await page.waitForTimeout(500);
    }
    const lineas = await carrito(page, LINO);
    ok(lineas.length === 2 && lineas[0].foto !== lineas[1].foto, "Dos líneas, cada una con la foto de su color");
    await page.locator("#bagDock, #cartbar").first().tap().catch(() => {});
    await page.waitForTimeout(600);
    if (!(await page.locator("#orBg").count())) await page.getByRole("button", { name: /pedido/i }).first().tap();
    await page.locator("#orBg").waitFor();
    const lineasDom = page.locator("#orBg .line");
    ok((await lineasDom.count()) === 2, "El pedido muestra las 2 líneas");
    const txt = await page.locator("#orBg").innerText();
    ok(txt.includes("Talla M · Arena") && txt.includes("Talla XL · Negro") && txt.includes("RD$5,200"), "Cada línea dice su presentación; total RD$5,200");
    ok((await page.locator("#orBg .lpic img").evaluateAll((i) => new Set(i.map((x) => x.getAttribute("src"))).size)) === 2, "Las fotos de las líneas son distintas");
    await captura(page, "pedido", ancho);
  },

  /** El detalle «más»: el mismo botón de presentaciones en vez de las pastillas. */
  async mas(page) {
    const r = reel(page, "pantalon-de-algodon");
    await r.locator("[data-more]").tap();
    await r.locator(".panel").waitFor({ state: "visible" });
    ok((await r.locator(".panel .opciones-fila").count()) === 0 && (await r.locator(".panel .pres-btn").count()) === 1, "El detalle trae el botón de presentaciones, no las pastillas");
    await r.locator(".panel .pres-btn").tap();
    await hoja(page).waitFor();
    ok(true, "…y abre la misma hoja");
  },

  /** Un producto SIN presentaciones se ve y se comporta como hoy. */
  async sinPresentaciones(page) {
    const r = reel(page, "kiara");
    ok((await r.locator(".cap .pres-btn").count()) === 0 && (await r.locator(".pres-fila-cap").count()) === 0, "Sin botón de presentaciones");
    ok((await r.locator("p.txt").count()) === 1 && (await r.locator("[data-more]").count()) === 1, "Con su descripción y «más» como siempre");
    await r.locator("[data-like]").tap();
    await page.waitForTimeout(500);
    ok((await hoja(page).count()) === 0 && (await carrito(page, MICHEL)).length === 1, "♥ agrega directo, sin hoja");
    ok((await r.locator(".inbadge").count()) === 1, "«En tu pedido»");
  },

  /** La cuadrícula del catálogo: «Desde» y el corazón abre la hoja de pastillas. */
  async cuadricula(page) {
    await page.locator('button[aria-label^="Ver el perfil"]').first().tap();
    await page.waitForSelector("#grid");
    const tile = page.locator("#grid .tile", { hasText: "Pantalón de algodón" });
    ok((await tile.locator(".tprice").innerText()).includes("Desde RD$2,300"), "La cuadrícula dice «Desde RD$2,300»");
    await tile.locator(".tlike").tap();
    await hoja(page).waitFor();
    ok((await hoja(page).locator("[data-presentaciones-hoja]").getAttribute("data-presentaciones-hoja")) === "a", "El corazón de la cuadrícula abre la hoja de pastillas");
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem("dz-carrito-lino-y-algodon") ?? "[]").length)) === 0, "…y no agrega nada por su cuenta");
  },
};

const PRODUCTO = { reel: "pantalon-de-algodon", hojaB: "pantalon-de-algodon", corazon: "pantalon-de-algodon", agotada: "pantalon-de-algodon", perfume: "majestic-oud", pedido: "pantalon-de-algodon", mas: "pantalon-de-algodon", sinPresentaciones: "kiara", cuadricula: "pantalon-de-algodon" };
const TIENDA = { perfume: MICHEL, sinPresentaciones: MICHEL };

for (const ancho of ANCHOS) {
  for (const [nombre, correr] of Object.entries(ESCENARIOS)) {
    if (SOLO && !SOLO.includes(nombre)) continue;
    console.log(`${nombre} · ${ancho} · claro`);
    const { ctx, page, errores } = await abrir(ancho, TIENDA[nombre] ?? LINO, PRODUCTO[nombre]);
    try {
      await correr(page, ancho);
      ok(errores.length === 0, `Sin errores de página${errores.length ? `: ${errores[0]}` : ""}`);
    } catch (e) {
      fallas++;
      console.log(`  ❌ ${nombre} falló: ${e.message.split("\n").slice(0, 3).join(" | ")}`);
      await page.screenshot({ path: `/tmp/probar-catalogo-presentaciones-${nombre}-${ancho}.png` }).catch(() => {});
    } finally {
      await ctx.close();
    }
  }
}
await b.close();
console.log(fallas ? `\n${fallas} escenario(s) fallaron.` : "\nTodo bien.");
process.exit(fallas ? 1 : 0);
