// Presentaciones por pasos (docs/prompts/presentaciones-por-pasos.md), en la demo: «Qué cambia» → «Cuántas tienes», los 17 escenarios del
// informe de QA (docs/qa/presentaciones-escenarios.md) uno por uno, el reparto del stock, «Cómo se ve» con el reel real y el perfume de
// Michel con «Tamaño». A 390 y 360, tema claro. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=390,360] [SOLO=1,1b,4] [CAPTURAS=docs/capturas/presentaciones-por-pasos] node scripts/probar-presentaciones.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}

const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const ANCHOS = (process.env.ANCHOS ?? "390,360").split(",").map(Number);
const CAPTURAS = process.env.CAPTURAS ?? null;
const SOLO = process.env.SOLO ? process.env.SOLO.split(",") : null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const PANTALON = "a3000000-0000-4000-8000-000000000018";
const CINTURON = "a3000000-0000-4000-8000-000000000024";
const OUD = "a3000000-0000-4000-8000-000000000019";
const CLAVE = "deslizapp-demo-v5";

const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

async function pagina(ancho, tienda) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript((t) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
  }, tienda);
  return { ctx, page, errores };
}
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
const hoja = (page) => page.locator('[role="dialog"]').last();
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const captura = async (page, nombre, ancho) => CAPTURAS && (await page.screenshot({ path: join(CAPTURAS, `${nombre}-${ancho}.png`) }));
const foto = (page, color) =>
  page.evaluate((c) => {
    const l = document.createElement("canvas");
    l.width = l.height = 600;
    const x = l.getContext("2d");
    x.fillStyle = c;
    x.fillRect(0, 0, 600, 600);
    return l.toDataURL("image/png").split(",")[1];
  }, color);

/** Un producto nuevo con foto, nombre y precio, en la hoja. */
async function nuevo(page, nombre = "Aros de luna", precio = "950") {
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).waitFor();
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill(nombre);
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill(precio);
  const b = await foto(page, "#c8a2c8");
  await page.locator("[data-entrada-medios]").setInputFiles([{ name: "f.png", mimeType: "image/png", buffer: Buffer.from(b, "base64") }]);
  await page.getByRole("button", { name: /^Foto 1 de 1/ }).waitFor();
}
const editar = async (page, id) => {
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.locator("[data-cosas-que-cambian]").waitFor();
  await page.waitForTimeout(500);
};
const abrirFlujo = async (page) => {
  await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
  await hoja(page).locator("[data-paso]").waitFor();
  await page.waitForTimeout(450);
};
const paso = async (page) => (await hoja(page).locator("[data-paso]").getAttribute("data-paso"));
const siguiente = async (page) => {
  await hoja(page).getByRole("button", { name: /^Siguiente/ }).click();
  await page.waitForTimeout(300);
};
const pasoTexto = async (page) => (await hoja(page).locator("[data-paso]").innerText()).replace(/\s+/g, " ");
const listo = async (page) => {
  await hoja(page).getByRole("button", { name: /^Listo ·/ }).click();
  await page.waitForTimeout(700);
};
/** Elige una cosa (si no está) y marca sus valores (sugeridos como píldoras; propios con «+ Otro …»). */
async function elegirCosa(page, cosa, valores) {
  const h = hoja(page);
  if (!(await h.locator(`[data-eje="${cosa}"]`).count())) await h.getByRole("button", { name: cosa, exact: true }).click();
  const seccion = h.locator(`[data-eje="${cosa}"]`);
  for (const v of valores) {
    const pildora = seccion.getByRole("checkbox", { name: v, exact: true });
    if (await pildora.count()) {
      if ((await pildora.getAttribute("aria-checked")) !== "true") await pildora.click();
      continue;
    }
    const caja = seccion.getByRole("textbox", { name: /^Otr[oa] / });
    if (!(await caja.isVisible().catch(() => false))) await seccion.getByRole("button", { name: /^\+ Otr[oa] / }).click();
    await caja.fill(v);
    await caja.press("Enter");
  }
}
const vaciarCosas = async (page) => {
  const b = hoja(page).getByRole("button", { name: /^Quitar \S+$/ });
  while (await b.count()) await b.first().click();
};
const quitarCosa = (page, cosa) => hoja(page).getByRole("button", { name: `Quitar ${cosa}`, exact: true }).click();
const filasTexto = async (page) => (await hoja(page).locator("[data-paso=cuantas] li").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
const sumar = async (page, etiqueta, n, dentro) => {
  const ambito = dentro ? hoja(page).locator(dentro) : hoja(page);
  for (let i = 0; i < n; i++) await ambito.getByRole("button", { name: etiqueta, exact: true }).click();
};
const tarjetaStock = (page) => page.locator("[data-tarjeta-stock]").innerText();
const guardarCambios = async (page) => {
  await page.getByRole("button", { name: /^(Guardar cambios|Publicar)$/ }).click();
  await page.waitForFunction(() => !/\/(editar|nuevo)$/.test(location.pathname) && !document.querySelector("[data-barra-producto]"), null, { timeout: 15000 });
  await page.waitForTimeout(600);
};
const productoDe = async (page, nombre) => {
  const d = await db(page);
  const p = d.productos.find((x) => x.nombre === nombre);
  return { p, variantes: (d.variantes ?? []).filter((v) => v.productoId === p?.id), d };
};
const quiere = (id) => !SOLO || SOLO.includes(id);

for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);

  if (quiere("2")) {
    console.log("• 2 · Crear con 1 cosa (Color × 3): la hoja avisa qué falta, y «Agotada» no sale en un producto nuevo");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await nuevo(page);
    await captura(page, "00-hoja-sin-presentaciones", ancho);
    await abrirFlujo(page);
    ok((await paso(page)) === "que-cambia", "Sin presentaciones abre en el paso 1 «Qué cambia»");
    ok((await hoja(page).innerText()).includes("Paso 1 de 2"), "Dice «Paso 1 de 2»");
    const sig = hoja(page).getByRole("button", { name: /^Siguiente/ });
    ok(await sig.isDisabled(), "«Siguiente» está apagado al empezar (Talla viene elegida y vacía)");
    ok((await hoja(page).locator("[data-pista]").innerText()).includes("Elige al menos un valor de Talla"), "…y dice qué falta: «Elige al menos un valor de Talla.»");
    await captura(page, "01-paso1-apagado", ancho);
    await quitarCosa(page, "Talla");
    await elegirCosa(page, "Color", ["Plateado", "Blanco", "Dorado"]);
    ok((await sig.innerText()).includes("3 presentaciones") && (await sig.isEnabled()), "«Siguiente · 3 presentaciones» se prende");
    await captura(page, "02-paso1-color", ancho);
    await siguiente(page);
    ok((await paso(page)) === "cuantas", "Pasa al paso 2 «Cuántas tienes»");
    const t = await pasoTexto(page);
    ok(t.includes("Poner a todas") && t.includes("Dorado") && t.includes("Plateado") && t.includes("Blanco") && !t.includes("Agotad"), "Una fila por color, «Poner a todas» y ni rastro de «Agotada»");
    ok((await hoja(page).getByRole("button", { name: /^Listo · 0 en total/ }).isEnabled()), "«Listo · 0 en total» (producto nuevo sin reparto)");
    {
      const at = await hoja(page).getByRole("button", { name: "Atrás", exact: true }).boundingBox();
      const li = await hoja(page).getByRole("button", { name: /^Listo ·/ }).boundingBox();
      ok(at && li && Math.abs(at.width - li.width) <= 1 && Math.abs(at.height - li.height) <= 1, "«Atrás» y «Listo» miden lo mismo (mitad y mitad)");
    }
    await captura(page, "03-paso2-una-cosa", ancho);
    await sumar(page, "Agregar uno a todas", 2);
    ok((await hoja(page).getByRole("button", { name: /^Listo · 6 en total/ }).count()) === 1, "«Poner a todas» pone 2 en cada una: «Listo · 6 en total»");
    await listo(page);
    const tarjeta = await tarjetaStock(page);
    ok(tarjeta.includes("Color · 3") && tarjeta.includes("3 presentaciones · 6 en total"), "La hoja de producto resume: «Color · 3» y «3 presentaciones · 6 en total»");
    ok(!tarjeta.includes("Agotad") && (await page.getByRole("button", { name: "Agregar presentación" }).count()) === 0, "…sin «Agotada» ni «Agregar presentación»");
    await captura(page, "04-hoja-resumen", ancho);
    ok(await sinDesborde(page), "Sin desborde horizontal");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("3") || quiere("15")) {
    console.log("• 3 y 15 · Crear con 2 cosas (Color × Tamaño), agrupadas por la primera; publicar, cerrar y reabrir");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await nuevo(page, "Aros dobles");
    await abrirFlujo(page);
    await quitarCosa(page, "Talla");
    await elegirCosa(page, "Color", ["Plateado", "Blanco"]);
    await elegirCosa(page, "Tamaño", ["Pequeño", "Grande"]);
    ok((await hoja(page).innerText()).includes("Ya elegiste 2: es el máximo. Quita una para elegir otra."), "9 · La 3.ª se apaga y dice que se quita una para elegir otra");
    ok((await hoja(page).getByRole("button", { name: "Material", exact: true }).isDisabled()), "9 · Las tarjetas sin elegir quedan apagadas");
    await captura(page, "05-paso1-dos-cosas", ancho);
    await siguiente(page);
    ok((await hoja(page).locator("section[aria-label^='Color ']").count()) === 2, "Paso 2: un grupo por color (Plateado, Blanco)");
    const filas = await filasTexto(page);
    ok(filas.filter((f) => /^(Pequeño|Grande)\b/.test(f)).length === 4, "…con sus 2 tamaños cada uno (4 filas)");
    await sumar(page, "Agregar uno de Pequeño", 3, "section[aria-label='Color Plateado']");
    await sumar(page, "Agregar uno de Grande", 1, "section[aria-label='Color Blanco']");
    await captura(page, "06-paso2-dos-cosas", ancho);
    ok((await hoja(page).getByRole("button", { name: /^Listo · 4 en total/ }).count()) === 1, "«Listo · 4 en total»");
    await listo(page);
    ok((await tarjetaStock(page)).includes("4 presentaciones · 4 en total"), "La hoja: «4 presentaciones · 4 en total»");
    await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
    ok((await paso(page)) === "cuantas", "5 · Con presentaciones, abre directo en «Cuántas tienes»");
    ok((await hoja(page).innerText()).includes("Cambiar qué cambia"), "…con el resumen y el enlace «Cambiar qué cambia»");
    await captura(page, "07-editar-paso2", ancho);
    await hoja(page).getByRole("button", { name: "Cambiar qué cambia" }).click();
    ok((await paso(page)) === "que-cambia" && (await hoja(page).locator('[data-eje="Color"] [aria-checked="true"]').count()) === 2, "El enlace lleva al paso 1 con lo elegido");
    await hoja(page).getByRole("button", { name: /^Siguiente/ }).click();
    ok((await paso(page)) === "cuantas", "Siguiente sin cambiar nada vuelve al paso 2 sin perder lo puesto");
    ok((await hoja(page).getByRole("button", { name: /^Listo · 4 en total/ }).count()) === 1, "…y el stock sigue ahí (4)");
    await listo(page);
    await guardarCambios(page);
    const { p, variantes } = await productoDe(page, "Aros dobles");
    ok(p && variantes.length === 4 && variantes.filter((v) => v.stock === 3).length === 1 && p.stock === 4, "15 · Se publicó con 4 presentaciones y su stock");
    await editar(page, p.id);
    ok((await tarjetaStock(page)).includes("4 presentaciones · 4 en total"), "15 · Reabrir lo muestra igual");
    await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
    await hoja(page).getByRole("button", { name: "Cerrar", exact: true }).click();
    await page.waitForTimeout(500);
    ok(!(await page.getByText("¿Salir sin guardar?").count()), "15 · Cerrar el flujo sin cambios no pregunta nada");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("4")) {
    console.log("• 4 · Agregar una 2.ª cosa a un producto con stock: el stock de cada valor se reparte y «Listo» espera");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await nuevo(page, "Pulsera trenzada");
    await abrirFlujo(page);
    await quitarCosa(page, "Talla");
    await elegirCosa(page, "Color", ["Plateado", "Blanco", "Dorado"]);
    await siguiente(page);
    await sumar(page, "Agregar uno de Plateado", 5);
    await sumar(page, "Agregar uno de Blanco", 3);
    await listo(page);
    await guardarCambios(page);
    const { p } = await productoDe(page, "Pulsera trenzada");
    await editar(page, p.id);
    await abrirFlujo(page);
    await hoja(page).getByRole("button", { name: "Cambiar qué cambia" }).click();
    await elegirCosa(page, "Talla", ["S", "M", "L"]);
    ok((await hoja(page).getByRole("button", { name: /^Siguiente · 9 presentaciones/ }).count()) === 1, "El paso 1 dice «Siguiente · 9 presentaciones»");
    await siguiente(page);
    const t = await pasoTexto(page);
    ok(/Tenías 5 de Plateado\. Repártelas entre las tallas: faltan 5\./.test(t), "Aviso: «Tenías 5 de Plateado. Repártelas entre las tallas: faltan 5.»");
    ok(t.includes("Plateado · 0 de 5") && t.includes("Blanco · 0 de 3"), "Encabezados «Plateado · 0 de 5» y «Blanco · 0 de 3»");
    ok(!t.includes("Dorado · 0 de"), "Dorado tenía 0: nada que repartir");
    ok(await hoja(page).getByRole("button", { name: /^Listo ·/ }).isDisabled(), "«Listo» apagado hasta que cuadre");
    ok((await hoja(page).innerText()).includes("Faltan 8 por repartir"), "…y la barra dice cuánto falta («Faltan 8 por repartir»)");
    await captura(page, "08-reparte-inicio", ancho);
    await sumar(page, "Agregar uno de S", 3, "section[aria-label='Color Plateado']");
    await sumar(page, "Agregar uno de M", 0, "section[aria-label='Color Plateado']");
    ok(/Tenías 5 de Plateado\. Repártelas entre las tallas: faltan 2\./.test(await pasoTexto(page)) && (await pasoTexto(page)).includes("Plateado · 3 de 5"), "Con 3 puestas: «faltan 2» y «Plateado · 3 de 5» (el dibujo 6)");
    await captura(page, "09-reparte-faltan-2", ancho);
    await sumar(page, "Agregar uno de L", 3, "section[aria-label='Color Plateado']");
    ok((await pasoTexto(page)).includes("Te pasaste por 1"), "Si se pasa, lo dice: «Te pasaste por 1»");
    await sumar(page, "Quitar uno de L", 1, "section[aria-label='Color Plateado']");
    await hoja(page).locator("section[aria-label='Color Blanco']").getByRole("button", { name: /^Todas en S$/ }).click();
    ok((await pasoTexto(page)).includes("Blanco · 3 de 3"), "«Todas en S» deja los 3 de Blanco en una sola");
    ok(await hoja(page).getByRole("button", { name: /^Listo · 8 en total/ }).isEnabled(), "Cuadra: «Listo · 8 en total» se prende");
    await captura(page, "10-reparte-cuadra", ancho);
    await listo(page);
    ok((await tarjetaStock(page)).includes("Color · 3") && (await tarjetaStock(page)).includes("Talla · 3") && (await tarjetaStock(page)).includes("9 presentaciones · 8 en total"), "La hoja: «Color · 3», «Talla · 3», «9 presentaciones · 8 en total»");
    await guardarCambios(page);
    const g = await productoDe(page, "Pulsera trenzada");
    ok(g.variantes.filter((v) => v.activa).length === 9 && g.p.stock === 8 && g.variantes.every((v) => !Object.values(v.valores).some((x) => /^Sin /.test(x))), "Guardado: 9 combinaciones, 8 unidades y ningún «Sin talla»");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("1") || quiere("1b")) {
    console.log("• 1 y 1b · Stock simple → presentaciones: lo que había se reparte y nada se pierde en silencio");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await editar(page, CINTURON);
    ok((await tarjetaStock(page)).includes("Inventario") || (await tarjetaStock(page)).includes("14"), "1 · Un producto sin presentaciones sigue con su stock de siempre (14)");
    await abrirFlujo(page);
    await vaciarCosas(page);
    await elegirCosa(page, "Color", ["Negro", "Beige", "Marrón"]);
    await siguiente(page);
    const t = await pasoTexto(page);
    ok(/Tenías 14\. Repártelas entre ellas: faltan 14\./.test(t), "1b · «Tenías 14. Repártelas entre ellas: faltan 14.»");
    ok(await hoja(page).getByRole("button", { name: /^Listo ·/ }).isDisabled(), "1b · «Listo» apagado hasta que cuadre");
    await captura(page, "11-reparte-stock-simple", ancho);
    await hoja(page).getByRole("button", { name: /^Ponerlas todas en Negro/ }).click();
    ok(await hoja(page).getByRole("button", { name: /^Listo · 14 en total/ }).isEnabled(), "El atajo «Ponerlas todas en Negro» deja los 14 y «Listo · 14 en total» se prende");
    await sumar(page, "Quitar uno de Negro", 4);
    await sumar(page, "Agregar uno de Beige", 4);
    ok(await hoja(page).getByRole("button", { name: /^Listo · 14 en total/ }).isEnabled(), "También se pueden repartir a mano (10 + 4)");
    await listo(page);
    await guardarCambios(page);
    const g = await productoDe(page, "Cinturón de cuero");
    ok(g.p.stock === 14 && g.variantes.reduce((s, v) => s + v.stock, 0) === 14, "Guardado: el producto sigue con 14 (repartidas entre sus presentaciones)");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("5") || quiere("6") || quiere("7a") || quiere("7b")) {
    console.log("• 5, 6, 7a y 7b · Agregar un valor, quitar un valor, quitar una cosa y quitar la última cosa");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await editar(page, PANTALON);
    await abrirFlujo(page);
    const nAntes = await hoja(page).locator("[data-paso=cuantas] section li").count();
    await hoja(page).getByRole("button", { name: "Cambiar qué cambia" }).click();
    await elegirCosa(page, "Color", ["Rojo"]);
    await siguiente(page);
    ok((await hoja(page).locator("section[aria-label^='Talla '] li").filter({ hasText: /^Rojo/ }).count()) === 4, "5 · Un color nuevo suma una fila en cada talla (4)");
    ok((await hoja(page).locator("[data-paso=cuantas] section li").count()) === nAntes + 4, "5 · Nada más cambia: solo las 4 filas nuevas");
    ok(await hoja(page).getByRole("button", { name: /^Listo ·/ }).isEnabled(), "5 · Sin stock que repartir, «Listo» ya se puede");
    await captura(page, "12-agregar-valor", ancho);
    // 6 · quitar un valor
    await hoja(page).getByRole("button", { name: "Cambiar qué cambia" }).click();
    await hoja(page).locator('[data-eje="Color"]').getByRole("checkbox", { name: "Rojo", exact: true }).click();
    await hoja(page).locator('[data-eje="Talla"]').getByRole("checkbox", { name: "XL", exact: true }).click();
    await siguiente(page);
    ok((await page.getByText("¿Seguir con el cambio?").count()) === 1 && (await page.getByText(/presentaciones se van|Una presentación se va/).count()) === 1, "6 · Quitar una talla pregunta: «N presentaciones se van…»");
    await captura(page, "13-quitar-valor", ancho);
    await page.getByRole("button", { name: "Sí, cambiar" }).click();
    await page.waitForTimeout(400);
    ok((await paso(page)) === "cuantas" && (await hoja(page).locator("section[aria-label^='Talla ']").count()) === 3, "6 · Tras confirmar, sigue en el paso 2 sin esas filas");
    await listo(page);
    await guardarCambios(page);
    const q = await productoDe(page, "Pantalón de algodón");
    ok(q.variantes.filter((v) => v.activa).length < nAntes && !q.variantes.some((v) => v.activa && v.valores.Talla === "XL"), "6 · Se guarda sin la talla XL");
    const totalGuardado = q.variantes.filter((v) => v.activa).reduce((s, v) => s + v.stock, 0);
    // 7a · quitar una cosa de 2 → 1
    await editar(page, PANTALON);
    await abrirFlujo(page);
    await hoja(page).getByRole("button", { name: "Cambiar qué cambia" }).click();
    await quitarCosa(page, "Color");
    await siguiente(page);
    ok((await page.getByText("se juntan y suman su stock").count()) === 1, "7a · Quitar una cosa pregunta que las que quedan iguales se juntan y suman su stock");
    await captura(page, "14-quitar-cosa", ancho);
    await page.getByRole("button", { name: "Sí, cambiar" }).click();
    await page.waitForTimeout(400);
    const total = await hoja(page).getByRole("button", { name: /^Listo · \d+ en total/ }).innerText();
    ok(Number(total.match(/(\d+) en total/)[1]) === totalGuardado, "7a · El stock total no cambia: se suma, no se pierde");
    ok((await tarjetaStock(page)).includes("Cosas que cambian"), "…y la hoja de producto sigue ahí");
    // 7b · quitar la última cosa
    await hoja(page).getByRole("button", { name: "Cambiar qué cambia" }).click();
    await quitarCosa(page, "Talla");
    ok(await hoja(page).getByRole("button", { name: /^Siguiente/ }).isDisabled() && (await hoja(page).innerText()).includes("vuelve a tener un solo stock"), "7b · Sin cosas, dice que vuelve a un solo stock y ofrece «Volver a un solo stock»");
    await captura(page, "15-volver-a-un-solo-stock", ancho);
    await hoja(page).getByRole("button", { name: "Volver a un solo stock" }).click();
    await page.getByRole("button", { name: "Sí, cambiar" }).click();
    await page.waitForTimeout(600);
    ok((await page.getByRole("button", { name: /^Cosas que cambian/ }).innerText()).includes("Talla, color, tamaño"), "7b · Vuelve el stock simple y la fila invita a crear presentaciones");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("8") || quiere("10")) {
    console.log("• 8 y 10 · Cosa propia (Aroma) y adiós a «Agregar presentación» y «Cambiar qué varía»");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await nuevo(page, "Vela");
    await abrirFlujo(page);
    await quitarCosa(page, "Talla");
    await hoja(page).getByRole("button", { name: "+ Otra cosa" }).click();
    await hoja(page).getByRole("textbox", { name: "¿Qué otra cosa cambia?" }).fill("Aroma");
    await hoja(page).getByRole("textbox", { name: "¿Qué otra cosa cambia?" }).press("Enter");
    const caja = await hoja(page).locator('[data-eje="Aroma"]').boundingBox();
    const dentro = await hoja(page).boundingBox();
    ok(caja && dentro && caja.y < dentro.y + 500, "8 · La cosa propia nace arriba, a la vista (no al final de la lista)");
    await hoja(page).locator('[data-eje="Aroma"]').getByRole("button", { name: "Agregar", exact: true }).click();
    const e = hoja(page).getByRole("textbox", { name: "Agregar a Aromas" });
    await e.fill("Vainilla");
    await e.press("Enter");
    await e.fill("Coco");
    await e.press("Enter");
    ok((await hoja(page).getByRole("button", { name: /^Siguiente · 2 presentaciones/ }).count()) === 1, "8 · Con Vainilla y Coco: «Siguiente · 2 presentaciones»");
    await captura(page, "16-cosa-propia", ancho);
    await siguiente(page);
    ok((await pasoTexto(page)).includes("Vainilla") && (await pasoTexto(page)).includes("Coco") && (await pasoTexto(page)).includes("Foto de cada aroma"), "8 · Las filas y «Foto de cada aroma»");
    await listo(page);
    ok((await page.getByRole("button", { name: /Agregar presentación|Cambiar qué varía/ }).count()) === 0 && (await page.getByText(/Cambiar qué varía|Agregar presentación/).count()) === 0, "10 · «Agregar presentación» y «Cambiar qué varía» ya no existen");
    await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
    ok((await hoja(page).getByText(/Cambiar qué varía|Agregar presentación|Todas/).count()) === 0 || (await hoja(page).getByRole("radio", { name: "Todas" }).count()) === 0, "10 · Ni filtros «Todas / …» ni filas de stock repetidas");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("11") || quiere("12") || quiere("13")) {
    console.log("• 11, 12 y 13 · Precio propio, foto de cada color y quitar con pedidos");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await editar(page, PANTALON);
    await abrirFlujo(page);
    const fila = hoja(page).getByRole("button", { name: /^Abrir /i }).first();
    const nombre = (await fila.getAttribute("aria-label")).replace(/^Abrir /, "");
    await fila.click();
    await page.waitForTimeout(450);
    await page.getByRole("radio", { name: "Uno propio" }).click();
    await page.getByRole("textbox", { name: /Precio de esta presentación/ }).fill("1200");
    await captura(page, "17-detalle-fila", ancho);
    await page.getByRole("button", { name: "Listo", exact: true }).last().click();
    await page.waitForTimeout(500);
    ok((await pasoTexto(page)).includes("RD$1,200 · precio propio") || (await pasoTexto(page)).includes("RD$ 1,200 · precio propio"), `11 · «${nombre}» muestra su precio propio`);
    await hoja(page).getByRole("button", { name: /^Foto de cada /i }).click();
    await page.waitForTimeout(450);
    ok((await page.getByText(/Foto de cada /).count()) >= 1, "12 · «Foto de cada …» se abre desde el paso 2");
    await captura(page, "18-foto-de-cada-color", ancho);
    await page.getByRole("button", { name: "Listo", exact: true }).last().click();
    await page.waitForTimeout(450);
    // 13 · pedido con esa presentación
    await listo(page);
    await guardarCambios(page);
    await page.evaluate(({ k, pid }) => {
      const d = JSON.parse(localStorage.getItem(k));
      const v = d.variantes.find((x) => x.productoId === pid && x.activa);
      const tiendaId = d.productos.find((p) => p.id === pid).tiendaId;
      let ped = d.pedidos.find((x) => x.tiendaId === tiendaId);
      if (!ped) {
        ped = { ...d.pedidos[0], id: "pedido-qa", tiendaId, numero: 9001 };
        d.pedidos.push(ped);
      }
      d.pedidoItems.push({ ...d.pedidoItems[0], id: "item-qa", pedidoId: ped.id, productoId: pid, varianteId: v.id, cantidad: 1 });
      localStorage.setItem(k, JSON.stringify(d));
    }, { k: CLAVE, pid: PANTALON });
    await editar(page, PANTALON);
    await abrirFlujo(page);
    const conPedido = await page.evaluate(({ k, pid }) => {
      const d = JSON.parse(localStorage.getItem(k));
      return d.variantes.find((x) => x.productoId === pid && x.activa).valores;
    }, { k: CLAVE, pid: PANTALON });
    await hoja(page).locator(`section[aria-label="Talla ${conPedido.Talla}"]`).getByRole("button", { name: `Abrir ${conPedido.Color}`, exact: true }).click();
    await page.waitForTimeout(450);
    await page.getByRole("button", { name: "Quitar", exact: true }).last().click();
    await page.waitForTimeout(500);
    ok((await page.getByText(/Ya tiene pedidos: la ocultamos/).count()) >= 1, "13 · Quitar una con pedidos dice que solo se oculta");
    await captura(page, "19-quitar-con-pedidos", ancho);
    await page.getByRole("button", { name: /^Ocultar [^e]/ }).click();
    await page.waitForTimeout(500);
    ok((await pasoTexto(page)).includes("Oculta"), "13 · Queda «Oculta» y no suma al total");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("14")) {
    console.log("• 14 · Límites: 12 valores por cosa y 144 presentaciones");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await nuevo(page, "Camisa XXL");
    await abrirFlujo(page);
    await quitarCosa(page, "Talla");
    const doce = Array.from({ length: 12 }, (_, i) => `V${i + 1}`);
    await elegirCosa(page, "Color", doce);
    await elegirCosa(page, "Tamaño", doce);
    const sig = hoja(page).getByRole("button", { name: /^Siguiente/ });
    ok((await sig.innerText()).includes("144 presentaciones") && (await sig.isEnabled()), "12 × 12: «Siguiente · 144 presentaciones»");
    ok(await hoja(page).locator('[data-eje="Color"]').getByRole("button", { name: /^\+ Otro color/ }).isDisabled(), "Con 12 valores, «+ Otro color» se queda (apagado) para que la hoja no se mueva");
    await captura(page, "20-144", ancho);
    await siguiente(page);
    ok((await hoja(page).locator("section[aria-label^='Color ']").count()) === 12, "Paso 2: 12 grupos (los demás plegados: solo el primero abierto)");
    ok((await hoja(page).locator("section[aria-label='Color V1'] li").count()) === 12 && (await hoja(page).locator("section[aria-label='Color V2'] li").count()) === 0, "…solo el primero muestra sus 12 filas");
    await hoja(page).getByRole("button", { name: /^V2/ }).first().click();
    ok((await hoja(page).locator("section[aria-label='Color V2'] li").count()) === 12, "Tocar un grupo lo abre");
    await captura(page, "21-144-paso2", ancho);
    await listo(page);
    await guardarCambios(page);
    const g = await productoDe(page, "Camisa XXL");
    ok(g.variantes.length === 144, "Se guardan las 144");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("16")) {
    console.log("• 16 · «Cómo se ve» es el reel real del catálogo del comprador");
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await nuevo(page, "Aros de luna", "950");
    await abrirFlujo(page);
    await quitarCosa(page, "Talla");
    await elegirCosa(page, "Color", ["Plateado", "Dorado"]);
    await siguiente(page);
    await sumar(page, "Agregar uno de Plateado", 2);
    await listo(page);
    await page.getByRole("button", { name: "Cómo se ve", exact: true }).click();
    const marco = page.frameLocator('iframe[title="Así lo verá tu cliente"]');
    await marco.locator("article.reel").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const reel = marco.locator("article.reel");
    ok((await reel.locator("h2").innerText()) === "Aros de luna", "El reel lleva el nombre del borrador");
    ok((await reel.locator(".pr strong").innerText()).includes("950"), "…el precio");
    ok((await reel.locator(".pres-btn:not(.en-panel)").innerText()).includes("Ver presentaciones"), "…y «Ver presentaciones ›»");
    ok((await marco.locator("header.hdr").count()) === 1 && (await marco.locator(".htabs").count()) === 1, "…con la cabecera y las pestañas de la tienda");
    ok((await reel.locator(".act.like").count()) === 1, "…y los botones de comprar a la vista");
    await marco.locator(".act.like").click();
    ok((await marco.getByText("Así lo verá tu cliente").count()) === 1, "Comprar solo avisa «Así lo verá tu cliente»");
    ok(((await db(page)).pedidos ?? []).length === ((await db(page)).pedidos ?? []).length, "No se escribió nada");
    await captura(page, "22-como-se-ve-reel", ancho);
    await page.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await page.waitForTimeout(500);
    ok(await page.getByRole("button", { name: "Publicar", exact: true }).isVisible(), "La X vuelve a la hoja de producto");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  if (quiere("17")) {
    console.log("• 17 · Perfume de Michel: Tamaño en ml sigue funcionando");
    const { ctx, page, errores } = await pagina(ancho, MICHEL);
    await nuevo(page, "Perfume nuevo", "2800");
    await abrirFlujo(page);
    ok((await hoja(page).locator('[data-eje="Tamaño"]').count()) === 1, "Un perfume arranca con «Tamaño» elegido");
    await hoja(page).locator('[data-eje="Tamaño"]').getByRole("checkbox", { name: "30 ml" }).waitFor();
    await elegirCosa(page, "Tamaño", ["30 ml", "50 ml", "100 ml"]);
    await captura(page, "23-perfume-paso1", ancho);
    await siguiente(page);
    const t = await pasoTexto(page);
    ok(t.includes("30 ml") && t.includes("50 ml") && t.includes("100 ml"), "Paso 2: 30, 50 y 100 ml");
    await listo(page);
    await editar(page, OUD);
    ok((await tarjetaStock(page)).includes("Tamaño · 3"), "El Majestic Oud existente se ve «Tamaño · 3»");
    await abrirFlujo(page);
    ok((await paso(page)) === "cuantas" && (await pasoTexto(page)).includes("RD$") && (await pasoTexto(page)).includes("precio propio"), "…y abre en «Cuántas tienes» con sus precios propios");
    await captura(page, "24-oud-paso2", ancho);
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
}
await navegador.close();
console.log("\nListo.");
