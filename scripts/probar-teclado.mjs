// Uso (con la app corriendo, ej. `npm run build && npm start`):
//   npm run probar:teclado            (usa http://localhost:3000; otra: URL=http://localhost:3100 npm run probar:teclado)
//
// Prueba que escribir en un campo NUNCA pierda el foco ni cierre el teclado en iPhone. Regla
// permanente en HANDOFF.md y docs/08-movimiento.md.
//
// Un navegador de escritorio no abre teclado, así que se simula lo que hace iOS: la ventana
// (innerHeight) NO cambia; solo `visualViewport` achica su alto y dispara "resize" y "scroll".
// Comprueba, en el buscador del Catálogo y dentro de las hojas "Nuevo producto" y "Nuevo pedido":
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
    if (!localStorage.getItem("deslizapp-modo-v1")) localStorage.setItem("deslizapp-modo-v1", "demo"); // directo a la demo
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
async function probarCampo(page, selector, nombre, texto, { dentroDeHoja = false, reemplazar = false } = {}) {
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

  if (reemplazar) await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(texto);
  const valor = await page.$eval(selector, (el) => el.value);
  ok(valor === texto, `${nombre}: (b) se puede escribir (${JSON.stringify(valor)})`);
  ok((await conFoco()) && (await page.evaluate((s) => document.querySelector(s).__marca, selector)) === "mismo-nodo", `${nombre}: (b) tras escribir, mismo nodo y con foco`);
  const vt = await page.evaluate(() => window.__vt);
  ok(vt === 0, `${nombre}: (d) mientras se escribe no se inicia ninguna transición de vista (${vt})`);
  await page.evaluate(() => window.__teclado(false));
  await page.waitForTimeout(300);
}

const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox"]} : {});
try {
  // ---- Buscador del Catálogo
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector('input[type="search"]');
    await page.waitForTimeout(900);
    await probarCampo(page, 'input[type="search"]', "Buscador del Catálogo", "she");
    const tarjetas = await page.$$eval("main ul li a", (a) => a.map((x) => x.getAttribute("aria-label")));
    ok(tarjetas.length === 1 && tarjetas[0].startsWith("Shé,"), `Buscador: la lista responde a lo escrito (${tarjetas.join(", ")})`);

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

  // ---- Hoja «Tu equipo»: la nota del enlace y el correo
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector('header button[aria-haspopup="dialog"]');
    await page.waitForTimeout(900);
    await page.tap('header button[aria-haspopup="dialog"]');
    await page.waitForSelector("[data-fila-equipo]");
    await page.waitForTimeout(500);
    await page.tap("button[data-fila-equipo]");
    await page.waitForSelector('[role="dialog"] [data-hoja-equipo]');
    await page.waitForTimeout(700);
    await page.tap('[role="dialog"] button:has-text("Invitar por enlace")');
    await page.waitForSelector('[role="dialog"] input[placeholder="Para Ana"]');
    await page.waitForTimeout(300);
    await probarCampo(page, '[role="dialog"] input[placeholder="Para Ana"]', "Tu equipo · Para quién", "Rosa", { dentroDeHoja: true });
    await page.evaluate(() => document.activeElement.blur());
    await page.tap('[role="dialog"] section[aria-label="Invitar por enlace"] button:has-text("Cancelar")');
    await page.waitForTimeout(300);
    await page.tap('[role="dialog"] button:has-text("Invitar por correo")');
    await page.waitForSelector('[role="dialog"] input[type="email"]');
    await page.waitForTimeout(300);
    await probarCampo(page, '[role="dialog"] input[type="email"]', "Tu equipo · Correo de Google", "rosa@gmail.com", { dentroDeHoja: true });
    ok(errores.length === 0, `Tu equipo: sin errores de página (${JSON.stringify(errores)})`);
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
    // Descripción y «Cuándo llega» viven en filas plegadas: abrir la fila no mueve ni quita el foco de otro campo.
    await page.tap('[role="dialog"] input[placeholder="Ej: Kiara Pink"]');
    await page.waitForTimeout(200);
    await page.evaluate(() => (window.__foco = []));
    // click() desde la página (sin mover el foco del navegador): lo que se prueba es que la app no toque el foco al abrir la fila.
    await page.evaluate(() => document.querySelector('[role="dialog"] [data-fila-plegable="descripcion"] button[aria-expanded]').click());
    await page.waitForSelector('[role="dialog"] textarea[placeholder="Cuéntalo como se lo dirías a una clienta."]');
    const focoTrasAbrirFila = await page.evaluate(() => ({ nombre: document.activeElement?.getAttribute("placeholder"), eventos: window.__foco.join(" ") }));
    ok(focoTrasAbrirFila.nombre === "Ej: Kiara Pink", `Abrir una fila no le quita el foco al campo enfocado (${focoTrasAbrirFila.eventos || "sin cambios"})`);
    await probarCampo(page, '[role="dialog"] textarea[placeholder="Cuéntalo como se lo dirías a una clienta."]', "Nuevo producto · Descripción", "Oud ahumado con vainilla.", { dentroDeHoja: true });
    await page.tap('[role="switch"][aria-label="Por encargo"]');
    await page.waitForSelector('[role="dialog"] input[placeholder="Llega en 7 a 10 días"]');
    await probarCampo(page, '[role="dialog"] input[placeholder="Llega en 7 a 10 días"]', "Nuevo producto · Cuándo llega", "Llega en 7 días", { dentroDeHoja: true });
    // La barra fija («Cómo se ve» + «Publicar») no tapa el campo enfocado: con el teclado abierto se oculta.
    await page.tap('[role="dialog"] input[placeholder="Ej: Kiara Pink"]');
    await page.evaluate(() => window.__teclado(true));
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => getComputedStyle(document.querySelector("[data-barra-producto]").parentElement).visibility === "hidden"), "La barra fija se oculta con el teclado abierto (no tapa el campo enfocado)");
    await page.evaluate(() => window.__teclado(false));
    await page.waitForTimeout(300);
    await page.evaluate(() => document.activeElement.blur());
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
    // Con lo escrito sin guardar, deslizar pregunta "¿Salir sin guardar?" (components/hoja.tsx); "Salir" cierra
    ok(!!(await page.$('[role="alertdialog"]')), "Nuevo producto: tras escribir, deslizar para cerrar pregunta «¿Salir sin guardar?»");
    await page.tap('[role="alertdialog"] button:has-text("Salir")');
    await page.waitForTimeout(1200);
    ok(!(await page.$('[role="dialog"]')), "Nuevo producto: tras escribir y cerrar el teclado, la hoja se sigue cerrando deslizando (con «Salir»)");
    ok(errores.length === 0, `Nuevo producto: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Selector de catálogos del título de la pestaña Catálogo
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.addInitScript(() => localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"));
    await page.goto(URL + "/catalogo");
    await page.waitForSelector("h1 [data-selector-catalogo]");
    await page.waitForTimeout(900);
    await page.tap("h1 [data-selector-catalogo]");
    await page.waitForSelector("[data-menu-flotante]");
    ok(await page.evaluate(() => document.activeElement?.getAttribute("aria-checked") === "true"), "Menú del título: el foco va a la opción activa");
    await page.tap("[data-menu-flotante] [role=menuitemradio][aria-checked=false]");
    await page.waitForTimeout(400);
    ok(!(await page.$("[data-menu-flotante]")), "Menú del título: elegir cierra el menú");
    ok(errores.length === 0, `Menú del título: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Selector de catálogos fijo en la cabecera de la hoja: tocarlo no arrastra ni cierra la hoja ni le quita el foco a un campo
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.addInitScript(() => localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"));
    await page.goto(URL + "/catalogo/nuevo");
    const sel = '[data-hoja-cabecera] [data-selector-catalogo]';
    await page.waitForSelector(sel);
    await page.waitForTimeout(900);
    await page.tap('input[placeholder="Ej: Kiara Pink"]');
    await page.keyboard.type("Gorra");
    await page.evaluate(() => document.activeElement.blur());
    const antes = await page.locator('[role="dialog"]').first().boundingBox();
    await page.tap(sel);
    await page.waitForTimeout(500);
    const despues = await page.locator('[role="dialog"]').first().boundingBox();
    ok(!!(await page.$('[role="dialog"]')) && !(await page.$('[role="alertdialog"]')), "Selector de catálogos: tocarlo no cierra la hoja ni pregunta «¿Salir sin guardar?»");
    ok(Math.abs(antes.y - despues.y) < 1, "Selector de catálogos: tocarlo no mueve la hoja");
    ok(!(await page.evaluate(() => document.activeElement?.matches("input, textarea"))), "Selector de catálogos: no abre el teclado");
    ok(!!(await page.$("[data-menu-flotante]")), "Selector de catálogos: abre el menú flotante");
    ok(await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitemradio" && document.activeElement.getAttribute("aria-checked") === "true"), "Selector de catálogos: el foco va a la opción activa dentro del toque");
    await page.keyboard.press("ArrowDown");
    ok(await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitemradio" || document.activeElement?.getAttribute("role") === "menuitem"), "Selector de catálogos: las flechas mueven el foco");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    ok(!(await page.$("[data-menu-flotante]")) && !!(await page.$('[role="dialog"]')), "Selector de catálogos: Escape cierra el menú y no la hoja");
    ok(await page.evaluate((s) => document.activeElement === document.querySelector(s), sel), "Selector de catálogos: el foco vuelve al disparador");
    ok(errores.length === 0, `Selector de catálogos: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Presentaciones: valores nuevos, «Otra…», valor suelto y precio propio
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.addInitScript(() => localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003"));
    await page.goto(URL + "/catalogo/a3000000-0000-4000-8000-000000000018/editar");
    await page.waitForSelector("[data-cosas-que-cambian]");
    await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
    await page.waitForTimeout(900);
    // Precio propio (hoja de una presentación)
    await page.getByRole("button", { name: "Abrir S · Negro", exact: true }).click();
    await page.getByRole("radio", { name: "Uno propio" }).click();
    await page.waitForSelector('input[aria-label^="Precio de esta presentación"]');
    await page.waitForTimeout(500);
    await probarCampo(page, 'input[aria-label^="Precio de esta presentación"]', "Presentación · Precio propio", "950", { dentroDeHoja: true, reemplazar: true });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    // Otro valor suelto
    await page.getByRole("button", { name: "Agregar presentación", exact: true }).click();
    await page.waitForSelector('[role="dialog"] input[placeholder="Escríbelo aquí"]');
    await page.waitForTimeout(600);
    await probarCampo(page, '[role="dialog"] input[placeholder="Escríbelo aquí"]', "Agregar presentación · Otro valor", "XXL", { dentroDeHoja: true });
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    // «Cambiar qué varía» → Otra…: el nombre y los valores nuevos
    await page.getByRole("button", { name: /^Cambiar qué varía/ }).click();
    await page.getByRole("button", { name: "Quitar Talla", exact: true }).waitFor();
    await page.waitForTimeout(500);
    // Quita lo que ya tiene para dejar lugar a la cosa propia
    for (const nombre of ["Talla", "Color"]) {
      const q = page.getByRole("button", { name: `Quitar ${nombre}`, exact: true });
      if (await q.count()) await q.click();
    }
    await page.getByRole("button", { name: "+ Otra cosa", exact: true }).click();
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Aroma"]');
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: Aroma"]', "Cambiar qué varía · ¿Qué otra cosa cambia?", "Tela", { dentroDeHoja: true });
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    // Lista que se expande: colapsar y volver a expandir la cosa propia no deja la hoja sin su campo
    await page.getByRole("button", { name: "Contraer Tela", exact: true }).click();
    await page.getByRole("button", { name: "Expandir Tela", exact: true }).click();
    await page.getByRole("button", { name: "Contraer Tela", exact: true }).waitFor();
    // Valor propio de una cosa del catálogo
    await page.getByRole("button", { name: "Color", exact: true }).click();
    await page.getByRole("button", { name: /^\+ Otro color/ }).click();
    await page.waitForSelector('[role="dialog"] input[aria-label="Otro color"]');
    await probarCampo(page, '[role="dialog"] input[aria-label="Otro color"]', "Cambiar qué varía · Otro color", "Turquesa", { dentroDeHoja: true });
    await page.evaluate(() => document.activeElement.blur());
    ok(errores.length === 0, `Presentaciones: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Hoja apilada de disminución: el motivo "Otro" muestra una nota con teclado.
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector("main ul li a");
    await page.waitForTimeout(700);
    const href = await page.locator("main ul li a").evaluateAll((enlaces) => {
      const valido = enlaces.find((a) => /^\/catalogo\/[^/]+$/.test(a.getAttribute("href") ?? "") && /\b[1-9][0-9]* en stock\b/.test(a.getAttribute("aria-label") ?? ""));
      return valido?.getAttribute("href") ?? null;
    });
    ok(Boolean(href), "Catálogo: hay un producto con stock controlado para probar la hoja de ajuste");
    if (href) {
      await page.goto(URL + href);
      await page.waitForSelector('[role="dialog"] section[aria-label="Inventario"]');
      await page.waitForTimeout(500);
      await page.tap('[role="dialog"] button[aria-label^="Disminuir stock"]');
      await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
      await page.getByRole("radio", { name: "Otro", exact: true }).click();
      await page.waitForSelector('[role="dialog"] textarea');
      await probarCampo(page, '[role="dialog"] textarea', "Ajuste de inventario · Motivo", "Conteo corregido");
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page.waitForTimeout(500);
      ok((await page.locator('[role="dialog"]').count()) === 1, "Ajuste: cancelar cierra solo la confirmación y vuelve al producto");
      ok(errores.length === 0, "Ajuste de inventario: sin errores de página " + JSON.stringify(errores));
    }
    await ctx.close();
  }

  // ---- Hoja "Nuevo pedido" (+ Pedido): selector de cliente con buscador y creación rápida
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/pedidos");
    await page.waitForSelector('a[href="/pedidos/nuevo"]');
    await page.waitForTimeout(900);
    await page.tap('a[href="/pedidos/nuevo"]');
    await page.waitForSelector('[role="dialog"] button[aria-label="Elegir cliente"]');
    await page.waitForTimeout(700);
    // El foco debe estar en el buscador YA en el mismo toque que abre el selector (teclado de iPhone)
    await page.tap('[role="dialog"] button[aria-label="Elegir cliente"]');
    const enfocado = await page.evaluate(() => document.activeElement?.getAttribute("type") === "search" && !!document.activeElement.closest('[role="dialog"]'));
    ok(enfocado, "Selector de cliente: el buscador tiene el foco justo después del toque que lo abre");
    await probarCampo(page, '[role="dialog"] input[type="search"]', "Selector de cliente · Buscador", "zzqx", { dentroDeHoja: true });
    await page.tap('[role="dialog"] >> text=Crear «zzqx»');
    await page.waitForSelector('[role="dialog"] input[aria-label="Nombre del cliente"]');
    await page.fill('[role="dialog"] input[aria-label="Nombre del cliente"]', ""); // viene con lo que se buscó
    await probarCampo(page, '[role="dialog"] input[aria-label="Nombre del cliente"]', "Crear cliente · Nombre", "Marina", { dentroDeHoja: true });
    await probarCampo(page, '[role="dialog"] input[aria-label="WhatsApp del cliente"]', "Crear cliente · WhatsApp", "8095550123", { dentroDeHoja: true });
    await probarCampo(page, '[role="dialog"] input[placeholder^="Talla"]', "Crear cliente · Nota", "Talla M", { dentroDeHoja: true });
    // Selector de productos (misma hoja): el foco también va en el toque que lo abre
    await page.tap('[role="dialog"] button[aria-label="Volver"]'); // del formulario de cliente al buscador
    // El selector compartido ahora protege también este borrador: comprueba el aviso antes de descartarlo.
    await page.getByRole("alertdialog").waitFor();
    ok(await page.getByRole("alertdialog").isVisible(), "Crear cliente: Volver protege los cambios sin guardar");
    await page.getByRole("alertdialog").getByRole("button", { name: "Salir", exact: true }).click();
    await page.waitForSelector('[role="dialog"] input[type="search"]');
    await page.tap('[role="dialog"] button[aria-label="Volver"]'); // del buscador al pedido
    await page.waitForSelector('[role="dialog"] button[aria-label="Elegir cliente"]');
    await page.tap('[role="dialog"] button[aria-label="Elegir cliente"]');
    await page.tap('[role="dialog"] ul li button');
    await page.waitForSelector('[role="dialog"] >> text=Agregar productos');
    await page.tap('[role="dialog"] >> text=Agregar productos');
    const enfocadoProd = await page.evaluate(() => document.activeElement?.getAttribute("placeholder") === "Busca un producto");
    ok(enfocadoProd, "Selector de productos: el buscador tiene el foco justo después del toque que lo abre");
    await probarCampo(page, '[role="dialog"] input[placeholder="Busca un producto"]', "Selector de productos · Buscador", "kiara", { dentroDeHoja: true });
    ok(errores.length === 0, `Nuevo pedido: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Nueva promo: nombre, descuento, código y buscadores de colección / producto
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/promos");
    await page.waitForSelector('a[href="/promos/nueva"]');
    await page.waitForTimeout(900);
    await page.tap('a[href="/promos/nueva"]');
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Semana del aaah"]');
    await page.waitForTimeout(700);
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: Semana del aaah"]', "Nueva promo · Nombre", "Semana rosa", { dentroDeHoja: true });
    await probarCampo(page, '[role="dialog"] input[aria-label="Descuento en porcentaje"]', "Nueva promo · Descuento", "25", { dentroDeHoja: true });
    await page.tap('[role="dialog"] [role="group"] button:has-text("Código")');
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: AAAH10"]', "Nueva promo · Código", "ROSA25", { dentroDeHoja: true });
    await page.tap('[role="dialog"] [role="group"] button:has-text("Por colección")');
    await page.tap('[role="dialog"] button[aria-label="Elegir colección"]');
    ok(await page.evaluate(() => document.activeElement?.getAttribute("placeholder") === "Busca una colección"), "Selector de colección: el buscador tiene el foco justo después del toque que lo abre");
    await probarCampo(page, '[role="dialog"] input[placeholder="Busca una colección"]', "Selector de colección · Buscador", "dul", { dentroDeHoja: true });
    ok(errores.length === 0, `Nueva promo: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Copia con otro tipo: el mismo formulario, prellenado y protegido.
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/promos/a6000000-0000-4000-8000-000000000001/editar");
    await page.getByRole("group", { name: "Tipo de promo" }).getByRole("button", { name: /^Código/ }).tap();
    await page.getByRole("button", { name: "Sí, crear otra promo" }).tap();
    await page.waitForURL("**/promos/nueva?*");
    await page.waitForTimeout(700);
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: Semana del aaah"]', "Copia de promo · Nombre", "Otra semana", { dentroDeHoja: true, reemplazar: true });
    await probarCampo(page, '[role="dialog"] input[aria-label="Descuento en porcentaje"]', "Copia de promo · Descuento", "25", { dentroDeHoja: true, reemplazar: true });
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: AAAH10"]', "Copia de promo · Código", "COPIA25", { dentroDeHoja: true });
    ok(errores.length === 0, `Copia de promo: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Compartir promo: el mensaje editable
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/promos");
    await page.waitForSelector("ul li a[href^='/promos/']");
    await page.waitForTimeout(900);
    const href = await page.$eval("ul li a[href^='/promos/']", (a) => a.getAttribute("href"));
    await page.goto(URL + new globalThis.URL(href, URL).pathname + "/compartir");
    await page.waitForSelector('[role="dialog"] >> text=Editar mensaje');
    await page.waitForTimeout(1200);
    await page.tap('[role="dialog"] >> text=Editar mensaje');
    ok(await page.evaluate(() => document.activeElement?.tagName === "TEXTAREA"), "Compartir promo: el mensaje tiene el foco justo después del toque en «Editar mensaje»");
    await page.fill('[role="dialog"] textarea', ""); // trae el mensaje de la plantilla
    await probarCampo(page, '[role="dialog"] textarea', "Compartir promo · Mensaje", "Gracias", { dentroDeHoja: true });
    ok(errores.length === 0, `Compartir promo: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Clientes: buscador y hoja "Cliente nuevo"
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/clientes");
    await page.waitForSelector('input[type="search"]');
    await page.waitForTimeout(900);
    await probarCampo(page, 'input[type="search"]', "Buscador de Clientes", "carol");
    await page.fill('input[type="search"]', "");
    await page.evaluate(() => document.activeElement.blur());
    await page.tap('a[href="/clientes/nuevo"]');
    await page.waitForSelector('[role="dialog"] input[type="tel"]');
    await page.waitForTimeout(700);
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: Paola Jiménez"]', "Cliente nuevo · Nombre", "Marina", { dentroDeHoja: true });
    await probarCampo(page, '[role="dialog"] input[type="tel"]', "Cliente nuevo · WhatsApp", "8095551234", { dentroDeHoja: true });
    await probarCampo(page, '[role="dialog"] input[placeholder^="Talla"]', "Cliente nuevo · Nota", "Talla M", { dentroDeHoja: true });
    ok(errores.length === 0, `Clientes: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Mi marca (desde el menú de la tienda): enlace del catálogo y código de color
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector('header button[aria-haspopup="dialog"]');
    await page.waitForTimeout(900);
    await page.tap('header button[aria-haspopup="dialog"]');
    await page.waitForSelector('[role="dialog"] >> text=Mi marca');
    await page.waitForTimeout(500);
    await page.tap('[role="dialog"] >> text=Mi marca');
    await page.waitForSelector('[role="dialog"] [data-vista-previa]');
    await page.waitForTimeout(700);
    await page.fill('[role="dialog"] input[placeholder="Ej: instagram.com/tutienda"]', ""); // la demo trae un enlace de ejemplo
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: instagram.com/tutienda"]', "Mi marca · Enlace del catálogo", "instagram.com/mitienda", { dentroDeHoja: true });
    await page.fill('[role="dialog"] input[aria-label="Código del color principal"]', "");
    await probarCampo(page, '[role="dialog"] input[aria-label="Código del color principal"]', "Mi marca · Código del color", "5E2750", { dentroDeHoja: true });
    ok(errores.length === 0, `Mi marca: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Repaso final: campos que faltaban (colección nueva, nota de un cliente, selector de producto de una promo). El código del pedido ya no se escribe: se elige de una lista.
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/catalogo");
    await page.waitForSelector('a[href="/catalogo/nuevo"]');
    await page.waitForTimeout(900);
    await page.tap('a[href="/catalogo/nuevo"]');
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Kiara Pink"]');
    await page.waitForTimeout(700);
    // La colección se elige en una hoja apilada: fila "Colección" → "Agregar colección" → nombre
    await page.tap('[role="dialog"] button:has-text("Sin colección")');
    await page.waitForSelector('[role="dialog"] button:has-text("Agregar colección")');
    await page.tap('[role="dialog"] button:has-text("Agregar colección")');
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Para él"]');
    await probarCampo(page, '[role="dialog"] input[placeholder="Ej: Para él"]', "Nuevo producto · Colección nueva", "Para él", { dentroDeHoja: true });
    ok(errores.length === 0, `Colección nueva: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/clientes");
    await page.waitForSelector("main a[href^='/clientes/']");
    await page.waitForTimeout(900);
    await page.tap("main a[href^='/clientes/'] >> nth=0");
    // La nota ya no se escribe en el detalle: se edita en "Editar cliente" (hoja apilada)
    await page.waitForSelector('[role="dialog"] button:has-text("Editar")');
    await page.waitForTimeout(700);
    await page.tap('[role="dialog"] button:has-text("Editar")');
    await page.waitForSelector('[role="dialog"] input[placeholder^="Talla"]');
    await page.waitForTimeout(700);
    // Dos hojas (cliente + editar): el chequeo de la hoja usa la primera; aquí solo se mira el campo (como en "Registrar abono")
    await probarCampo(page, '[role="dialog"] input[placeholder^="Talla"]', "Editar cliente · Nota", " Le gusta el rosa");
    ok(errores.length === 0, `Editar cliente: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/promos");
    await page.waitForSelector('a[href="/promos/nueva"]');
    await page.waitForTimeout(900);
    await page.tap('a[href="/promos/nueva"]');
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Semana del aaah"]');
    await page.waitForTimeout(700);
    await page.tap('[role="dialog"] [role="group"] button:has-text("En productos")');
    await page.tap('[role="dialog"] button[aria-label="Elegir producto"]');
    ok(await page.evaluate(() => document.activeElement?.getAttribute("placeholder") === "Busca un producto"), "Selector de producto (promo): el buscador tiene el foco justo después del toque que lo abre");
    await probarCampo(page, '[role="dialog"] input[placeholder="Busca un producto"]', "Selector de producto (promo) · Buscador", "kiara", { dentroDeHoja: true });
    ok(errores.length === 0, `Promo (producto): sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- Ventas a crédito: "Te dio ahora" de + Pedido, y "Registrar abono" (monto y nota) desde la cuenta de un cliente
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/pedidos");
    await page.waitForSelector('a[href="/pedidos/nuevo"]');
    await page.waitForTimeout(900);
    await page.tap('a[href="/pedidos/nuevo"]');
    await page.waitForSelector('[role="dialog"] button[aria-label="Elegir cliente"]');
    await page.waitForTimeout(700);
    await page.tap('[role="dialog"] button[aria-label="Elegir cliente"]');
    await page.tap('[role="dialog"] ul li button');
    await page.tap('[role="dialog"] >> text=Agregar productos');
    await page.tap('[role="dialog"] button[aria-label^="Agregar "]');
    await page.tap('[role="dialog"] button[aria-label="Volver"]');
    await page.waitForSelector('[role="dialog"] [role="radio"]:has-text("A crédito")');
    await page.tap('[role="dialog"] [role="radio"]:has-text("A crédito")');
    await page.waitForSelector('[role="dialog"] input[aria-label^="Te dio ahora"]');
    await probarCampo(page, '[role="dialog"] input[aria-label^="Te dio ahora"]', "Nuevo pedido a crédito · Te dio ahora", "500", { dentroDeHoja: true });
    ok(errores.length === 0, `Pedido a crédito: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/clientes");
    await page.waitForSelector('button[aria-pressed]:has-text("Deben")');
    await page.waitForTimeout(900);
    await page.tap('button[aria-pressed]:has-text("Deben")');
    await page.waitForSelector("main a[href^='/clientes/'] >> nth=0");
    await page.tap("main a[href^='/clientes/'] >> nth=0");
    await page.waitForSelector("section[aria-label='Lo que te debe']");
    await page.waitForTimeout(700);
    await page.tap('[role="dialog"] button:has-text("Abono")');
    await page.waitForSelector('input[aria-label^="Monto del abono"]');
    await page.waitForTimeout(700);
    // Dos hojas (cliente + abono): el chequeo de la hoja usa la primera; aquí solo se mira el campo
    await probarCampo(page, 'input[aria-label^="Monto del abono"]', "Registrar abono · Monto", "500");
    await probarCampo(page, 'input[placeholder="Ej. le di cambio"]', "Registrar abono · Nota", "le di cambio");
    ok(errores.length === 0, `Registrar abono: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
} finally {
  await navegador.close();
}

console.log(fallos === 0 ? "\nTodo bien: escribir no pierde el foco." : `\n${fallos} comprobación(es) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
