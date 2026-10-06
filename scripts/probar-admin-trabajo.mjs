// Admin parte 3 en la demo (sin Supabase): Trabajo › Catálogos, el ciclo del taller de retoque entre el panel de la tienda y
// /admin-demo en el MISMO navegador, Personalizar y el catálogo público con ?demo. Además: anchos 360/390/430 en el tema
// claro (el modo oscuro de la app todavía no está diseñado), menos movimiento, teclado, hojas, Atrás, errores y borrador
// guardado. Comprueba que no salga ni una petición a Supabase.
//
// Uso: PLAYWRIGHT_MODULE=/ruta/playwright-core/index.mjs CHROMIUM_PATH=/ruta/chromium BASE_URL=http://127.0.0.1:3000 \
//      [CAPTURE_DIR=docs/capturas/admin-trabajo] node scripts/probar-admin-trabajo.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const modulo = process.env.PLAYWRIGHT_MODULE;
if (!modulo) throw new Error("Define PLAYWRIGHT_MODULE con la ruta al módulo Playwright del entorno.");
const playwright = await import(pathToFileURL(modulo).href);
const chromium = playwright.chromium ?? playwright.default?.chromium;
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const CAPTURAS = process.env.CAPTURE_DIR;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const navegador = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LUNA = "a1000000-0000-4000-8000-000000000002";
const LINO = "a1000000-0000-4000-8000-000000000003";
const TOBILLERA = "a3000000-0000-4000-8000-000000000011";
const ANILLO = "a3000000-0000-4000-8000-000000000012";
const FOTO_RETOCADA = new URL("../public/tienda/michel-kiara.jpg", import.meta.url).pathname;
const CLAVE = "deslizapp-demo-v5";

const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  assert.ok(cond, msg);
};

/** Un navegador limpio (una demo nueva) con la tienda activa del panel, el ancho, el tema y el movimiento. */
async function pagina({ ancho = 390, tienda = MICHEL, movimiento = "no-preference" } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: "light", reducedMotion: movimiento });
  const page = await ctx.newPage();
  const errores = [];
  const supabase = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("request", (r) => /supabase\.(co|in)/.test(r.url()) && supabase.push(r.url()));
  await page.addInitScript(
    ({ tienda }) => {
      localStorage.setItem("deslizapp-version-vista", "9.9.9");
      localStorage.setItem("deslizapp-modo-v1", "demo");
      if (!localStorage.getItem("deslizapp-sesion-v1")) localStorage.setItem("deslizapp-sesion-v1", tienda);
    },
    { tienda },
  );
  const db = async () => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "null");
  const tiendaActiva = (id) => page.evaluate((id) => localStorage.setItem("deslizapp-sesion-v1", id), id);
  return { ctx, page, errores, supabase, db, tiendaActiva };
}

async function capturar(page, nombre) {
  if (!CAPTURAS) return;
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: false });
}
const sinScrollHorizontal = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
const tarjeta = (page, nombre) => page.locator("div[id^='tienda-']").filter({ has: page.getByRole("heading", { name: nombre, exact: true }) });

try {
  // ---------------------------------------------------------------------------------------------------------------------
  console.log("1 · Trabajo › Catálogos: empezar, 3 pasos y mandar a revisar; la tienda ve cada paso");
  {
    const { ctx, page, errores, supabase, db, tiendaActiva } = await pagina({ tienda: LINO });
    await page.goto(`${BASE}/catalogo`);
    await page.getByRole("button", { name: /Pedirlo/ }).click();
    await page.getByRole("button", { name: "Sí, pedirlo" }).click();
    await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k) ?? "{}").tiendas?.some((t) => t.catalogoEstado === "solicitado"), CLAVE);

    await page.goto(`${BASE}/admin-demo/trabajo?tienda=${LINO}`);
    const lino = tarjeta(page, "Lino & Algodón");
    await lino.waitFor();
    ok((await lino.getByRole("button", { name: "Mandar a revisar" }).count()) === 0, "Por empezar no ofrece saltar a revisar");
    ok(await page.evaluate(() => document.querySelector("[class*='ring-resalte']") !== null), "llega con la tienda resaltada (?tienda=)");
    await capturar(page, "trabajo-catalogos-390-claro");
    await lino.getByRole("button", { name: "Empezar" }).click();
    await page.getByText(/Ella ya ve «Reuniendo tus fotos»/).waitFor();
    for (const [paso, nombre] of [[2, "Portada"], [3, "Detalles"]]) {
      ok((await lino.getByRole("button", { name: "Mandar a revisar" }).count()) === 0, `paso ${paso - 1}: todavía no se puede mandar a revisar`);
      await lino.getByRole("button", { name: `Pasar a ${nombre}` }).click();
      await lino.getByRole("img", { name: new RegExp(`Paso ${paso} de 3`) }).waitFor();
      await tiendaActiva(LINO);
      const vista = await ctx.newPage();
      await vista.goto(`${BASE}/catalogo`);
      const visto = await vista.getByText(new RegExp(`Paso ${paso} de 3`)).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
      ok(visto, `la tienda ve «Paso ${paso} de 3» en su panel`);
      await vista.close();
    }
    await lino.getByRole("button", { name: "Mandar a revisar" }).click();
    const enlace = page.getByRole("textbox", { name: "Enlace de su catálogo" });
    ok((await enlace.inputValue()).startsWith("https://"), "propone un enlace https");
    await enlace.fill("http://inseguro.example");
    await page.getByRole("dialog").getByRole("button", { name: "Mandar a revisar" }).click();
    await page.getByText("Tiene que empezar con https://.").waitFor();
    ok((await db()).tiendas.find((t) => t.id === LINO).catalogoEstado === "generando", "un enlace inválido no cambia nada");
    await enlace.fill("https://deslizapp.example/tienda/lino-y-algodon");
    await page.getByRole("dialog").getByRole("button", { name: "Mandar a revisar" }).click();
    await page.getByText(/Publicar lo toca ella/).waitFor();
    ok((await db()).tiendas.find((t) => t.id === LINO).catalogoEstado === "revisar", "queda en «revisar» en la demo del panel");
    ok((await page.getByRole("link", { name: "Recordarle" }).count()) >= 1 || (await page.getByText("No tiene WhatsApp guardado").count()) >= 1, "Esperando su sí ofrece Recordarle (o explica por qué no)");
    await page.goto(`${BASE}/catalogo`);
    ok(await page.getByText("¡Está listo! Échale un ojo").waitFor({ timeout: 15000 }).then(() => true, () => false), "la tienda ve «¡Está listo! Échale un ojo»");
    ok(supabase.length === 0, "ninguna petición a Supabase");
    ok(errores.length === 0, `sin errores de página ${errores.join(" | ")}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------------------------------------------------------------
  console.log("2 · Taller: la tienda pide, el admin entrega (una sola vez) y devuelve otra; la tienda lo ve");
  {
    const { ctx, page, errores, supabase, db } = await pagina({ tienda: LUNA });
    const pedir = async (producto) => {
      await page.goto(`${BASE}/catalogo/${producto}/editar`);
      await page.getByRole("button", { name: /^Foto 1 de/ }).click();
      const retoque = page.getByRole("list", { name: "Retoque" });
      await retoque.getByText("Retocar foto").waitFor();
      ok(await retoque.getByText("Beta", { exact: true }).isVisible(), "«Beta» junto a «Retocar foto»");
      ok(await retoque.getByText("Se retoca con tu marca como guía. Cuesta 5 créditos.", { exact: true }).isVisible(), "la ficha dice con qué se retoca y cuánto cuesta");
      if (producto === TOBILLERA) await capturar(page, "panel-ficha-retocar-beta");
      await page.getByRole("button", { name: "Retocar", exact: true }).click();
      await page.getByText("En el taller", { exact: true }).first().waitFor();
      ok(await retoque.getByText("Beta", { exact: true }).isVisible(), "«Beta» también en «En el taller»");
      ok(await retoque.getByText("Tu foto está en proceso, con tu marca como guía. Reservamos 5 créditos; se cobran cuando esté lista.", { exact: true }).isVisible(), "el taller explica el proceso y la reserva");
      ok(await retoque.getByText("Hecho con criterio de marca.", { exact: true }).isVisible(), "y remata en Caveat");
      ok((await retoque.getByText(/horas|días|minutos/).count()) === 0, "sin tiempo estimado inventado");
    };
    await pedir(TOBILLERA);
    await capturar(page, "panel-foto-en-el-taller");
    let d = await db();
    ok(d.tiendas.find((t) => t.id === LUNA).creditosRetoque === 100, "pedir no cobra (reserva)");
    await pedir(ANILLO);
    d = await db();
    ok(d.trabajosRetoque.filter((t) => t.estado === "pendiente").length === 2, "dos fotos esperan en el taller");
    await page.getByRole("button", { name: /^Foto 1 de/ }).click().catch(() => {});

    await page.goto(`${BASE}/admin-demo/trabajo?ver=fotos&tienda=${LUNA}`);
    await page.getByRole("region", { name: "Fotos de Luna Bisutería" }).waitFor();
    ok(await page.getByText(/2 fotos · llegaron hoy · 100 créditos/).isVisible(), "el grupo muestra fotos, cuándo llegaron y los créditos");
    ok((await page.getByRole("button", { name: "Entregar", exact: true }).isDisabled()), "Entregar se apaga hasta subir la retocada");
    await page.locator('input[type=file][accept^="image/jpeg"]').setInputFiles(FOTO_RETOCADA);
    await page.getByAltText("La retocada, sin entregar").waitFor();
    await capturar(page, "trabajo-fotos-mesa-390-claro");
    // Doble toque: una sola entrega y un solo cobro.
    await page.getByRole("button", { name: "Entregar", exact: true }).dblclick();
    await page.getByText(/^Entregada:/).waitFor();
    d = await db();
    const tobillera = d.productos.find((p) => p.id === TOBILLERA);
    ok(tobillera.medios[0].url.startsWith("data:image/") && tobillera.medios[0].retocada === true, "la foto cambió en el producto y quedó marcada retocada");
    ok(d.tiendas.find((t) => t.id === LUNA).creditosRetoque === 95, "cobra 5 créditos una sola vez (doble toque)");
    const entregado = d.trabajosRetoque.find((t) => t.productoId === TOBILLERA);
    ok(entregado.estado === "entregado" && !entregado.medioUrlOriginal.startsWith("data:image/jpeg;base64,/9j"), "el trabajo guarda la original para el historial");

    // La siguiente foto se abre sola: devolverla.
    await page.getByRole("heading", { name: "Anillo Brisa" }).waitFor();
    await page.getByRole("button", { name: "Devolver", exact: true }).click();
    const hoja = page.getByRole("dialog");
    ok(await hoja.getByRole("button", { name: "Devolver", exact: true }).isDisabled(), "sin motivo no se puede devolver");
    await hoja.getByRole("button", { name: "Tiene muy poca luz." }).click();
    await capturar(page, "trabajo-fotos-devolver");
    await hoja.getByRole("button", { name: "Devolver", exact: true }).click();
    await page.getByText(/^Devuelta\./).waitFor();
    d = await db();
    const devuelto = d.trabajosRetoque.find((t) => t.productoId === ANILLO);
    ok(devuelto.estado === "devuelto" && devuelto.motivoDevolucion === "Tiene muy poca luz.", "devuelta con su motivo");
    ok(d.tiendas.find((t) => t.id === LUNA).creditosRetoque === 95, "devolver no cobra");
    ok(d.trabajosRetoque.filter((t) => t.estado === "pendiente").length === 0, "no queda nada reservado");
    await page.getByText("El taller está vacío.").waitFor();

    await page.goto(`${BASE}/catalogo/${TOBILLERA}/editar`);
    await page.getByText("Tu foto salió del taller.").waitFor();
    ok(true, "la tienda ve la tostada «Tu foto salió del taller.»");
    await page.getByRole("button", { name: /^Foto 1 de/ }).click();
    ok(await page.getByRole("list", { name: "Retoque" }).getByText("Retocada por el equipo").isVisible() && (await page.getByRole("list", { name: "Retoque" }).getByText("Beta", { exact: true }).isVisible()), "«Beta» también en la foto entregada");
    await capturar(page, "panel-foto-entregada-beta");
    await page.goto(`${BASE}/catalogo/${ANILLO}/editar`);
    await page.getByRole("button", { name: /devuelta por el taller/ }).click();
    ok(await page.getByText("«Tiene muy poca luz.»").waitFor({ timeout: 10000 }).then(() => true, () => false), "la tienda ve el motivo");
    ok(await page.getByRole("button", { name: "Subir otra" }).isVisible(), "y puede subir otra");
    ok(await page.getByRole("list", { name: "Retoque" }).getByText("Beta", { exact: true }).isVisible(), "«Beta» también en la foto devuelta");
    await capturar(page, "panel-foto-devuelta");
    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: /Ver plan y créditos/ }).click();
    ok(await page.getByRole("dialog").getByText("Beta", { exact: true }).isVisible(), "«Beta» en la hoja de plan y créditos");
    await capturar(page, "hoja-plan-beta");
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/tienda/luna-bisuteria?demo`);
    await page.waitForFunction(() => [...document.images].some((i) => i.currentSrc.startsWith("data:image/") || i.src.includes("data%3Aimage") || i.src.startsWith("data:image/")), null, { timeout: 15000 });
    ok(true, "el catálogo público de la demo ya muestra la foto retocada");
    ok(supabase.length === 0, "ninguna petición a Supabase");
    ok(errores.length === 0, `sin errores de página ${errores.join(" | ")}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------------------------------------------------------------
  console.log("3 · Personalizar: botón de comprar, Búsqueda apagada, orden, contraste, SVG, borrador y Atrás");
  {
    const { ctx, page, errores, supabase, db } = await pagina({ tienda: MICHEL });
    await page.goto(`${BASE}/admin-demo/tiendas/${MICHEL}/catalogo`);
    await page.getByRole("heading", { name: "Su catálogo" }).waitFor();
    await capturar(page, "personalizar-390-claro");
    // Teclado: llegar a «Botón de comprar» con Tab y abrirlo con Enter.
    const fila = page.getByRole("button", { name: /Botón de comprar/ });
    await fila.focus();
    await page.keyboard.press("Enter");
    const texto = page.getByRole("textbox", { name: "Texto" });
    await texto.waitFor();
    // Atrás cierra la hoja sin salir de la pantalla.
    await page.goBack();
    await page.waitForTimeout(900);
    ok(page.url().endsWith(`/tiendas/${MICHEL}/catalogo`) && (await texto.count()) === 0, "Atrás cierra la hoja y se queda en Personalizar");
    await fila.click();
    await texto.fill("x".repeat(41));
    ok(await page.getByRole("button", { name: "Listo", exact: true }).isDisabled(), "más de 40 letras no se acepta (contador)");
    await texto.fill("¡Me lo llevo!");
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await page.getByRole("switch", { name: "Búsqueda" }).click();
    // El borrador sobrevive a recargar.
    await page.reload();
    await page.getByText("Recuperamos tu borrador sin guardar.").waitFor();
    ok((await page.getByRole("switch", { name: "Búsqueda" }).getAttribute("aria-checked")) === "false", "el borrador vuelve tras recargar");
    await page.getByRole("button", { name: /Orden en el catálogo/ }).click();
    const antes = await page.locator("ol li span.truncate").allTextContents();
    await page.getByRole("button", { name: /^Mover abajo: / }).first().click();
    const despues = await page.locator("ol li span.truncate").allTextContents();
    ok(antes[0].slice(3) === despues[1].slice(3) && antes[1].slice(3) === despues[0].slice(3), "Mover abajo cambia el orden");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Colores/ }).click();
    await page.locator("input[type=color]").nth(1).evaluate((el) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "#eeeeee");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    ok(await page.getByText(/no llega a AA/).first().isVisible(), "un color sin contraste avisa");
    await capturar(page, "personalizar-colores-aviso");
    await page.getByRole("button", { name: "Texto: como su marca" }).click();
    ok((await page.getByText(/no llega a AA/).count()) === 0, "«Como su marca» quita el aviso");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Cabecera/ }).click();
    await page.getByRole("radio", { name: "SVG" }).click();
    const codigo = page.getByRole("textbox", { name: "Código SVG" });
    await codigo.fill('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><image href="https://evil.example/x.png"/><rect onclick="alert(1)"/></svg>');
    ok(await page.getByRole("alert").filter({ hasText: /no se permite/ }).isVisible(), "un SVG con imagen externa o eventos se rechaza con su motivo");
    ok(await page.getByRole("button", { name: "Usar esta cabecera" }).isDisabled(), "y no se puede usar");
    await codigo.fill("");
    await page.getByRole("radio", { name: "Su nombre" }).click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    if (await page.getByRole("button", { name: "Salir sin guardar" }).count()) await page.getByRole("button", { name: "Salir sin guardar" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByText("Guardado. Su catálogo ya lo muestra.").waitFor();
    const d = await db();
    const t = d.tiendas.find((x) => x.id === MICHEL);
    ok(t.personalizacion.mensajes?.boton_comprar === "¡Me lo llevo!" && t.personalizacion.secciones?.busqueda === false, "guardado en la tienda demo");
    ok(typeof t.personalizacion.tema?.cabecera === "string", "la cabecera que ya tenía no se tocó (merge)");
    const primero = d.productos.filter((p) => p.tiendaId === MICHEL && p.orden != null).sort((a, b) => a.orden - b.orden)[0];
    ok(primero?.nombre === despues[0].slice(3), "el orden nuevo quedó guardado");
    await page.goto(`${BASE}/tienda/esencias-michel?demo`);
    const saltar = page.getByRole("button", { name: "Saltar" });
    if (await saltar.isVisible().catch(() => false)) await saltar.click();
    await page.waitForTimeout(800);
    ok((await page.locator("#searchBtn").count()) === 0, "el catálogo ya no muestra Búsqueda");
    ok((await page.getByText("¡Me lo llevo!").count()) > 0, "el catálogo usa el botón nuevo");
    await capturar(page, "catalogo-demo-personalizado");
    ok(supabase.length === 0, "ninguna petición a Supabase");
    ok(errores.length === 0, `sin errores de página ${errores.join(" | ")}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------------------------------------------------------------
  console.log("4 · Acceso desde el menú de la tienda (demo → /admin-demo)");
  {
    const { ctx, page, errores } = await pagina({ tienda: MICHEL });
    await page.goto(`${BASE}/`);
    await page.getByRole("button", { name: /Esencias Michel/ }).first().click();
    const acceso = page.getByRole("link", { name: /Admin de la demo/ });
    await acceso.waitFor();
    ok((await acceso.getAttribute("href")) === "/admin-demo", "en la demo el acceso lleva a /admin-demo (nunca a /admin)");
    ok((await page.getByRole("link", { name: /Administrar Deslizapp/ }).count()) === 0, "en la demo no aparece el acceso real");
    await capturar(page, "menu-tienda-acceso-demo");
    ok(errores.length === 0, "sin errores de página");
    await ctx.close();
  }

  // ---------------------------------------------------------------------------------------------------------------------
  console.log("5 · Anchos (tema claro), menos movimiento y teclado");
  for (const ancho of [360, 390, 430]) {
    const { ctx, page, errores } = await pagina({ ancho, movimiento: ancho === 360 ? "reduce" : "no-preference" });
    for (const ruta of ["/admin-demo", "/admin-demo/tiendas", `/admin-demo/tiendas/${MICHEL}`, "/admin-demo/trabajo", "/admin-demo/trabajo?ver=fotos", `/admin-demo/tiendas/${MICHEL}/catalogo`]) {
      await page.goto(`${BASE}${ruta}`);
      await page.getByRole("heading").first().waitFor();
      await page.waitForTimeout(300);
      ok(await sinScrollHorizontal(page), `${ancho}px: ${ruta} sin scroll horizontal`);
    }
    if (ancho !== 390) await capturar(page, `personalizar-${ancho}-claro`);
    await page.goto(`${BASE}/admin-demo/trabajo`);
    await page.getByRole("radio", { name: /Catálogos/ }).focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForURL(/ver=fotos/);
    ok(true, `${ancho}px: el segmento se cambia con el teclado`);
    if (ancho === 390) await capturar(page, "trabajo-fotos-390-claro");
    ok(errores.length === 0, `${ancho}px: sin errores de página`);
    await ctx.close();
  }
  console.log("6 · Hoy, Tiendas y ficha en tema claro (capturas de revisión)");
  {
    const { ctx, page, errores } = await pagina({});
    await page.goto(`${BASE}/admin-demo`);
    await page.getByRole("heading", { name: /^(Buenos días|Buenas tardes|Buenas noches), Lewis\./ }).waitFor();
    ok(true, "Hoy saluda con la concordancia correcta");
    await capturar(page, "hoy-390-claro");
    await page.goto(`${BASE}/admin-demo/tiendas`);
    await page.getByRole("heading", { name: "Tiendas" }).waitFor();
    const puntos = await page.locator("ul li span[aria-hidden='true'].rounded-full").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    ok(puntos.length > 0 && puntos.every((c) => c !== "rgba(0, 0, 0, 0)"), "cada tienda tiene su punto de salud visible");
    await capturar(page, "tiendas-390-claro");
    await page.goto(`${BASE}/admin-demo/tiendas/${MICHEL}`);
    await page.getByRole("link", { name: "Personalizar" }).waitFor();
    ok((await page.getByRole("link", { name: "Personalizar" }).getAttribute("href")) === `/admin-demo/tiendas/${MICHEL}/catalogo`, "la ficha abre Personalizar dentro de /admin-demo");
    await capturar(page, "ficha-390-claro");
    ok(errores.length === 0, "sin errores de página");
    await ctx.close();
  }
  console.log("Listo: todo pasó.");
} finally {
  await navegador.close();
}
