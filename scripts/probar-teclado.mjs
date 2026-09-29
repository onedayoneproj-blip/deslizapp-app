// Uso (con la app corriendo, ej. `npm run build && npm start`):
//   npm run probar:teclado            (usa http://localhost:3000; otra: URL=http://localhost:3100 npm run probar:teclado)
//
// Prueba que escribir en un campo NUNCA pierda el foco ni cierre el teclado en iPhone. Regla
// permanente en HANDOFF.md y docs/08-movimiento.md.
//
// Un navegador de escritorio no abre teclado, así que se simula lo que hace iOS: la ventana
// (innerHeight) NO cambia; solo `visualViewport` achica su alto y dispara "resize" y "scroll".
// Comprueba, en el buscador del Catálogo y dentro de la hoja "Nuevo producto":
//   (a) tras tocar el campo, sigue siendo document.activeElement;
//   (b) se puede escribir;
//   (c) al abrir/cerrar el "teclado" varias veces, el campo sigue siendo el MISMO nodo (no se
//       remontó) y conserva el foco; la hoja no se movió ni se cerró;
//   (d) mientras se escribe no se inicia ninguna transición de vista (en iOS eso cierra el teclado);
//   (e) el campo enfocado queda a la vista por encima del teclado.
// Necesita Playwright con Chromium (npx playwright install chromium si no lo tienes).
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
const ALTO_TECLADO = 336;
let fallos = 0;
const ok = (cond, msg) => {
  if (!cond) fallos++;
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
};

async function abrir(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript((alto) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9"); // sin pantalla de novedades
    // Teclado de iPhone simulado: solo cambia visualViewport, no la ventana.
    const vv = window.visualViewport;
    let abierto = false;
    Object.defineProperty(vv, "height", { get: () => (abierto ? window.innerHeight - alto : window.innerHeight), configurable: true });
    Object.defineProperty(vv, "offsetTop", { get: () => 0, configurable: true });
    window.__teclado = (a) => {
      abierto = a;
      vv.dispatchEvent(new Event("resize"));
      vv.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    };
    // Transiciones de vista iniciadas (una por evento) y cambios de foco
    window.__vt = 0;
    const original = document.startViewTransition?.bind(document);
    if (original) document.startViewTransition = (a) => (window.__vt++, original(a));
    window.__foco = [];
    document.addEventListener("focusin", (e) => window.__foco.push("in:" + (e.target.tagName + (e.target.id ? "#" + e.target.id : ""))), true);
    document.addEventListener("focusout", (e) => window.__foco.push("out:" + e.target.tagName), true);
  }, ALTO_TECLADO);
  return { ctx, page, errores };
}

/** Toca un campo, abre/cierra el "teclado" varias veces y escribe. */
async function probarCampo(page, selector, nombre, texto, { dentroDeHoja = false } = {}) {
  await page.evaluate((s) => {
    document.querySelector(s).__marca = "mismo-nodo";
    window.__foco = [];
    window.__vt = 0;
  }, selector);
  const panel = dentroDeHoja ? await page.$eval('[role="dialog"]', (d) => Math.round(d.getBoundingClientRect().top)) : null;

  await page.tap(selector);
  await page.waitForTimeout(250);
  // A partir de aquí (ya enfocado) no debe haber ningún cambio de foco.
  await page.evaluate(() => (window.__foco = []));
  const conFoco = () => page.evaluate((s) => document.activeElement === document.querySelector(s), selector);
  ok(await conFoco(), `${nombre}: (a) tras tocar, el campo es document.activeElement`);

  // Abre el teclado como iOS (visualViewport) y lo cierra/abre varias veces
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__teclado(true));
    await page.waitForTimeout(400);
    if (i < 2) {
      await page.evaluate(() => window.__teclado(false));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.__teclado(true));
      await page.waitForTimeout(150);
    }
  }
  const e = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return { marca: el?.__marca, foco: document.activeElement === el, eventos: window.__foco.join(" ") };
  }, selector);
  ok(e.marca === "mismo-nodo", `${nombre}: (c) el campo sigue siendo el mismo nodo (no se remontó)`);
  ok(e.foco, `${nombre}: (c) con el teclado abierto conserva el foco (eventos de foco: ${e.eventos})`);
  ok(e.eventos === "", `${nombre}: (c) tras enfocar, el foco no cambió de lugar en ningún momento (${e.eventos || "sin cambios"})`);

  if (dentroDeHoja) {
    const abierta = await page.$('[role="dialog"]');
    const top = abierta ? await page.$eval('[role="dialog"]', (d) => Math.round(d.getBoundingClientRect().top)) : null;
    ok(abierta && top === panel, `${nombre}: (c) la hoja sigue abierta y no se movió (${panel} → ${top})`);
    const r = await page.$eval(selector, (el) => el.getBoundingClientRect().bottom);
    ok(r <= 844 - ALTO_TECLADO, `${nombre}: (e) el campo queda a la vista sobre el teclado (parte baja en ${Math.round(r)}px ≤ ${844 - ALTO_TECLADO}px)`);
  }

  await page.keyboard.type(texto);
  const valor = await page.$eval(selector, (el) => el.value);
  ok(valor === texto, `${nombre}: (b) se puede escribir (${JSON.stringify(valor)})`);
  ok((await conFoco()) && (await page.evaluate((s) => document.querySelector(s).__marca, selector)) === "mismo-nodo", `${nombre}: (b) tras escribir, mismo nodo y con foco`);
  const vt = await page.evaluate(() => window.__vt);
  ok(vt === 0, `${nombre}: (d) mientras se escribe no se inicia ninguna transición de vista (${vt})`);
  await page.evaluate(() => window.__teclado(false));
  await page.waitForTimeout(300);
}

const navegador = await playwright.chromium.launch();
try {
  // ---- Buscador del Catálogo
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector('input[type="search"]');
    await page.waitForTimeout(900);
    await probarCampo(page, 'input[type="search"]', "Buscador del Catálogo", "she");
    const tarjetas = await page.$$eval("main ul li a", (a) => a.map((x) => x.getAttribute("aria-label")));
    ok(tarjetas.join() === "Editar Shé", `Buscador: la lista responde a lo escrito (${tarjetas.join(", ")})`);

    // Con el teclado abierto, tocar un filtro tampoco inicia una transición de vista
    await page.tap('input[type="search"]');
    await page.evaluate(() => {
      window.__teclado(true);
      window.__vt = 0;
    });
    // En iOS Safari los botones no toman el foco: el campo sigue enfocado. Se simula con click() de JS.
    await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.startsWith("Todos")).click());
    await page.waitForTimeout(400);
    ok((await page.evaluate(() => window.__vt)) === 0, "Buscador: con el teclado abierto, cambiar de filtro no inicia transición de vista");
    ok(errores.length === 0, `Buscador: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Hoja "Nuevo producto"
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector('a[href="/catalogo/nuevo"]');
    await page.waitForTimeout(900);
    await page.tap('a[href="/catalogo/nuevo"]');
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Kiara Pink"]');
    await page.waitForTimeout(700);
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: Kiara Pink"]', "Nuevo producto · Nombre", "Brisa", { dentroDeHoja: true });
    await probarCampo(page, '[role="dialog"] input[placeholder="0"]', "Nuevo producto · Precio", "2450", { dentroDeHoja: true });
    // Cerrar el teclado tocando fuera y confirmar que la hoja se sigue cerrando deslizando
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForTimeout(200);
    const cdp = await ctx.newCDPSession(page);
    const t = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 195, y }] });
    const top = await page.$eval('[role="dialog"]', (d) => Math.round(d.getBoundingClientRect().top));
    await page.$eval('[role="dialog"] > div:first-child', (c) => (c.scrollTop = 0)); // el área de scroll
    await t("touchStart", top + 10);
    for (let i = 1; i <= 10; i++) {
      await t("touchMove", top + 10 + i * 60);
      await page.waitForTimeout(20);
    }
    await t("touchEnd");
    await page.waitForTimeout(700);
    ok(!(await page.$('[role="dialog"]')), "Nuevo producto: tras escribir y cerrar el teclado, la hoja se sigue cerrando deslizando");
    ok(errores.length === 0, `Nuevo producto: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
} finally {
  await navegador.close();
}

console.log(fallos === 0 ? "\nTodo bien: escribir no pierde el foco." : `\n${fallos} comprobación(es) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
