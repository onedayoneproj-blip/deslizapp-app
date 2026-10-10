// Onboarding de una tienda nueva en la demo (docs/17-onboarding.md): las 4 historias (tocar, volver, mantener, Saltar), los
// 4 capítulos (enlace en vivo con -2, varios rubros, WhatsApp, nombre de Google), el borrador que se recupera al recargar,
// «ya existe» y «Seguir» encima del teclado. Sin Supabase. 390 y 360 px, con capturas.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-onboarding.mjs [carpeta-de-capturas]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const playwright = require("playwright");
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT = process.argv[2] ?? "docs/capturas/onboarding-1";
mkdirSync(OUT, { recursive: true });
let fallos = 0;
const ok = (c, m) => {
  console.log(c ? "  ✅" : "  ❌", m);
  if (!c) fallos++;
};
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

for (const ancho of [390, 360]) {
  console.log(`\n── ${ancho} px ──`);
  const ctx = await nav.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  let supabase = 0;
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("request", (r) => /supabase\.co/.test(r.url()) && supabase++);
  const foto = (n) => page.screenshot({ path: `${OUT}/${n}-${ancho}.png` });
  const historia = () => page.locator("[data-historia]").getAttribute("data-historia");
  const capitulo = () => page.locator("[data-capitulo]").getAttribute("data-capitulo");

  await page.goto(`${URL}/unirse/demo`);
  await page.waitForSelector("[data-onboarding=historias]");
  await page.waitForTimeout(400);

  console.log("• Historias");
  ok((await page.locator("h1").innerText()).startsWith("Hola, Michel."), "«Hola, Michel.» con el primer nombre de Google");
  await foto("01-historia-bienvenida");
  const der = page.getByRole("button", { name: "Siguiente historia" });
  const izq = page.getByRole("button", { name: "Historia anterior" });
  await der.tap();
  ok((await historia()) === "2", "tocar a la derecha avanza");
  await page.waitForTimeout(300);
  await foto("02-historia-catalogo");
  await izq.tap();
  ok((await historia()) === "1", "tocar a la izquierda vuelve");
  // Mantener: pausa y al soltar no pasa.
  const caja = await der.boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  ok((await page.locator(".onb-barra").evaluate((el) => getComputedStyle(el).animationPlayState)) === "paused", "mantener pausa la barra");
  await page.waitForTimeout(500);
  await page.mouse.up();
  ok((await historia()) === "1", "al soltar después de mantener no pasa");
  ok((await page.locator(".onb-barra").evaluate((el) => getComputedStyle(el).animationPlayState)) === "running", "al soltar sigue corriendo");
  await der.tap();
  await der.tap();
  await page.waitForTimeout(300);
  ok((await page.locator("h1").innerText()).includes("solito."), "historia 3: el pedido te llega solito");
  await foto("03-historia-pedido");
  await der.tap();
  await page.waitForTimeout(300);
  ok((await page.locator("[data-saltar]").count()) === 0, "la última no tiene «Saltar»");
  await foto("04-historia-ahora-la-tuya");
  await izq.tap();
  await page.locator("[data-saltar]").tap();
  ok((await capitulo()) === "1", "«Saltar» va a los capítulos (no se salta los datos)");

  console.log("• Capítulo 1 · El nombre");
  const campo = page.locator("[data-campo-capitulo]");
  ok(await campo.evaluate((el) => el === document.activeElement), "el campo del nombre queda enfocado");
  await page.locator("[data-seguir] button").tap();
  ok((await capitulo()) === "1", "sin nombre no sigue");
  ok((await page.getByText("Escribe el nombre de tu tienda.").count()) === 1, "dice qué falta");
  // Regla del teclado (HANDOFF): escribir no remonta el campo ni le quita el foco (la vista del enlace cambia al lado).
  await campo.tap();
  const antes = await campo.elementHandle();
  await page.keyboard.type("Esencias Mich", { delay: 30 });
  await page.waitForTimeout(500);
  ok(await antes.evaluate((el) => el.isConnected && el === document.activeElement && el.value === "Esencias Mich"), "al escribir, el campo sigue enfocado (no se remonta)");
  await campo.fill("Esencias Michel");
  await page.waitForFunction(() => document.querySelector("[data-slug]")?.textContent === "esencias-michel-2");
  ok(true, "«Así nace tu enlace» con el -2 (el nombre ya existe)");
  await campo.fill("Esencias Rosa");
  await page.waitForFunction(() => document.querySelector("[data-slug]")?.textContent === "esencias-rosa");
  ok(true, "el enlace cambia mientras escribe");
  ok((await page.locator("[data-onboarding=capitulos] input:not([type=file])").count()) === 1, "un solo campo: el nombre se escribe en la tarjeta");
  const fileCap1 = page.locator("[data-vista-enlace] input[type=file]");
  await fileCap1.setInputFiles({ name: "nota.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  ok((await page.locator("#nota-nombre").innerText()).includes("no es una imagen"), "cap. 1: un archivo que no es imagen lo dice, sin bloquear el nombre");
  if (ancho === 390) {
    await fileCap1.setInputFiles("public/tienda/michel-kiara.jpg");
    await page.waitForSelector("[data-vista-enlace] [data-logo-tienda]");
    const tam = await page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-onboarding-demo-v1")).logo.length);
    ok(tam > 10_000 && tam < 120_000, `cap. 1: la foto se recorta y queda en el borrador (${Math.round(tam / 1024)} KB en texto)`);
    // Teclado abierto con el nombre: «Seguir» encima del teclado.
    await campo.focus();
    await page.locator("[data-onboarding=capitulos]").evaluate((el) => el.style.setProperty("--teclado", "300px"));
    const bt = await page.locator("[data-seguir] button").boundingBox();
    ok(bt.y + bt.height <= 844 - 300 && (await campo.isVisible()), "cap. 1 con teclado: el nombre y «Seguir» a la vista");
    await foto("05b-capitulo-1-con-logo-y-teclado");
    await page.locator("[data-onboarding=capitulos]").evaluate((el) => el.style.setProperty("--teclado", "0px"));
  }
  await foto("05-capitulo-1-nombre");
  await page.locator("[data-seguir] button").tap();

  console.log("• Capítulo 2 · Lo que vendes");
  ok((await capitulo()) === "2", "pasa al capítulo 2");
  ok((await page.locator("h1").innerText()).startsWith("Esencias Rosa"), "el título dice la tienda");
  await page.locator("[data-seguir] button").tap();
  ok((await capitulo()) === "2", "sin elegir no sigue");
  await page.locator("[data-rubro=perfumes]").tap();
  await page.locator("[data-rubro=ropa]").tap();
  ok((await page.locator("[data-rubro=perfumes]").innerText()).includes("PRINCIPAL"), "el primero es el principal");
  ok((await page.locator("[data-rubro=ropa]").getAttribute("aria-pressed")) === "true", "se marcan varios");
  await foto("06-capitulo-2-lo-que-vendes");
  await page.locator("[data-seguir] button").tap();

  console.log("• Capítulo 3 · El chat");
  ok((await capitulo()) === "3", "pasa al capítulo 3");
  ok((await page.locator("header").innerText()).includes("perfumes y ropa"), "la cabecera dice lo que vende");
  if (ancho === 390) ok((await page.locator("header [data-logo-tienda]").count()) === 1, "la cabecera de los capítulos muestra la foto");
  await campo.fill("305 555 0142");
  await page.locator("[data-seguir] button").tap();
  ok((await capitulo()) === "3", "un número que no es dominicano no sigue");
  await campo.fill("8496503269");
  ok((await campo.inputValue()) === "849 650 3269", "el número se agrupa al escribir");

  console.log("• Borrador");
  await page.reload();
  await page.waitForSelector("[data-onboarding=capitulos]");
  ok((await capitulo()) === "3", "al recargar vuelve al capítulo donde iba");
  ok((await campo.inputValue()) === "849 650 3269", "con lo que había escrito");
  await foto("07-capitulo-3-el-chat");

  // «Seguir» encima del teclado: se simula el teclado achicando la ventana visible (--teclado).
  await campo.focus();
  await page.locator("[data-onboarding=capitulos]").evaluate((el) => el.style.setProperty("--teclado", "300px"));
  const boton = await page.locator("[data-seguir] button").boundingBox();
  ok(boton.y + boton.height <= 844 - 300, "con el teclado abierto, «Seguir» queda encima de él");
  await foto("08-capitulo-3-con-teclado");
  await page.locator("[data-onboarding=capitulos]").evaluate((el) => el.style.setProperty("--teclado", "0px"));
  await page.locator("[data-seguir] button").tap();

  console.log("• Capítulo 4 · Tú");
  ok((await capitulo()) === "4", "pasa al capítulo 4");
  ok((await campo.inputValue()) === "Michel", "pre-llenado con el nombre de Google");
  ok((await page.locator("header").innerText()).includes("+1 849 650 3269"), "la cabecera dice el WhatsApp");
  await campo.fill("");
  await page.locator("[data-seguir] button").tap();
  ok((await capitulo()) === "4", "sin nombre no cierra");
  await campo.fill("Rosa");
  ok((await page.locator("mark").innerText()) === "Rosa", "el mensaje la saluda por su nombre");
  await foto("09-capitulo-4-tu");
  await page.getByRole("button", { name: "Volver al capítulo anterior" }).tap();
  ok((await capitulo()) === "3", "la X vuelve al capítulo anterior");
  await page.locator("[data-seguir] button").tap();
  ok((await campo.inputValue()) === "Rosa", "lo escrito se queda al volver");
  await page.getByRole("button", { name: "Cerrar el capítulo" }).tap();

  console.log("• Ya existe");
  await page.waitForSelector("[data-onboarding=existe]");
  ok((await page.locator("h1").innerText()).replace(/\s+/g, " ").includes("Esencias Rosa ya existe."), "«Esencias Rosa ya existe.»");
  ok((await page.evaluate(() => localStorage.getItem("deslizapp-onboarding-demo-v1"))) === null, "el borrador se borra al crear la tienda");
  await page.waitForTimeout(500);
  await foto("10-ya-existe");

  if (ancho === 390) {
    await page.waitForFunction(() => !document.querySelector("[data-poner-logo]"));
    ok((await page.locator("[data-onboarding=existe] [data-logo-tienda]").count()) === 1, "«ya existe» muestra la foto del capítulo 1 (subida al crear la tienda)");
    await foto("11-ya-existe-con-logo");
  } else {
  console.log("• Pon tu logo en «ya existe» (sin foto en el capítulo 1)");
  const archivo = page.locator('[data-onboarding=existe] input[type=file]');
  await archivo.setInputFiles({ name: "nota.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  ok((await page.locator("[data-aviso-logo]").innerText()).includes("no es una imagen"), "un archivo que no es imagen: lo dice y se queda con las iniciales");
  await archivo.setInputFiles({ name: "enorme.png", mimeType: "image/png", buffer: Buffer.alloc(21 * 1024 * 1024) });
  ok((await page.locator("[data-aviso-logo]").innerText()).includes("pesa mucho"), "una imagen muy pesada: lo dice");
  ok((await page.locator("[data-onboarding=existe] [data-logo-tienda]").count()) === 0, "sigue con las iniciales");
  await archivo.setInputFiles("public/tienda/michel-kiara.jpg");
  await page.waitForSelector("[data-onboarding=existe] [data-logo-tienda]", { timeout: 8000 });
  ok((await page.locator("[data-aviso-logo]").count()) === 0, "con una foto real: el círculo muestra su logo");
  await page.waitForFunction(() => !document.querySelector("[data-poner-logo]"), null, { timeout: 8000 }).catch(() => {});
  ok((await page.locator("[data-poner-logo]").count()) === 0, "el botón se va cuando ya tiene logo");
  await page.waitForTimeout(900);
  await foto("11-ya-existe-con-logo");
  }
  ok(errores.length === 0, `sin errores de página${errores.length ? `: ${errores.join(" | ")}` : ""}`);
  ok(supabase === 0, "la demo no llama a Supabase");
  await ctx.close();
}

// Movimiento reducido: sin avance solo; se pasa tocando.
console.log("\n── Movimiento reducido ──");
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(`${URL}/unirse/demo`);
await page.waitForSelector("[data-onboarding=historias]");
ok((await page.locator(".onb-barra").count()) === 0, "sin barra que se llena");
await page.waitForTimeout(7500);
ok((await page.locator("[data-historia]").getAttribute("data-historia")) === "1", "no avanza sola");
await ctx.close();

await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nListo: todo pasó.");
process.exit(fallos ? 1 : 0);
