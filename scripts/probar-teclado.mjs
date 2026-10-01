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
    // Con lo escrito sin guardar, deslizar pregunta "¿Salir sin guardar?" (components/hoja.tsx); "Salir" cierra
    ok(!!(await page.$('[role="alertdialog"]')), "Nuevo producto: tras escribir, deslizar para cerrar pregunta «¿Salir sin guardar?»");
    await page.tap('[role="alertdialog"] button:has-text("Salir")');
    await page.waitForTimeout(1200);
    ok(!(await page.$('[role="dialog"]')), "Nuevo producto: tras escribir y cerrar el teclado, la hoja se sigue cerrando deslizando (con «Salir»)");
    ok(errores.length === 0, `Nuevo producto: sin errores de página (${JSON.stringify(errores)})`);
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
    await probarCampo(page, '[role="dialog"] textarea', "Crear cliente · Nota", "Talla M", { dentroDeHoja: true });
    // Selector de productos (misma hoja): el foco también va en el toque que lo abre
    await page.tap('[role="dialog"] button[aria-label="Volver"]'); // del formulario de cliente al buscador
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
    await page.goto(URL + "/promos/a6000000-0000-4000-8000-000000000001");
    await page.getByRole("group", { name: "Tipo de promo" }).getByRole("button", { name: /^Código/ }).tap();
    await page.getByRole("button", { name: "Crear con otro tipo" }).tap();
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
    await page.goto(URL + href + "/compartir");
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
    await probarCampo(page, '[role="dialog"] textarea', "Cliente nuevo · Nota", "Talla M", { dentroDeHoja: true });
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
    await page.tap('[role="dialog"] button:has-text("+ Nueva")');
    await page.waitForSelector('[role="dialog"] input[aria-label="Nombre de la colección nueva"]');
    await probarCampo(page, '[role="dialog"] input[aria-label="Nombre de la colección nueva"]', "Nuevo producto · Colección nueva", "Para él", { dentroDeHoja: true });
    ok(errores.length === 0, `Colección nueva: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/clientes");
    await page.waitForSelector("main a[href^='/clientes/']");
    await page.waitForTimeout(900);
    await page.tap("main a[href^='/clientes/'] >> nth=0");
    await page.waitForSelector('[role="dialog"] textarea');
    await page.waitForTimeout(700);
    await probarCampo(page, '[role="dialog"] textarea', "Detalle de cliente · Nota", " Le gusta el rosa", { dentroDeHoja: true });
    ok(errores.length === 0, `Detalle de cliente: sin errores de página (${JSON.stringify(errores)})`);
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
    await page.waitForSelector('[role="tab"]:has-text("Deben")');
    await page.waitForTimeout(900);
    await page.tap('[role="tab"]:has-text("Deben")');
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
