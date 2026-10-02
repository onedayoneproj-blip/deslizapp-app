// Uso (con la app corriendo, ej. `npm run build && npm start`):  npm run probar:hojas   (URL=http://localhost:3100 para otra)
//
// Prueba las HOJAS APILADAS y el AVISO AL SALIR (components/hoja.tsx), en la demo:
//   - una hoja sobre otra (Registrar abono sobre el detalle del pedido): deslizar, tocar el fondo, Escape, la X y "atrás" cierran
//     SOLO la de arriba; la de abajo (y la dirección) no se mueven;
//   - con cambios sin guardar (monto o nota) cerrar no cierra: sale "¿Salir sin guardar?"; "Seguir aquí" no cierra y conserva lo
//     escrito; "Salir" cierra; sin cambios no pregunta;
//   - el diálogo atrapa el foco y Escape equivale a "Seguir aquí";
//   - una hoja de ruta (Cliente nuevo) pregunta solo si hay algún campo lleno.
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
let fallos = 0;
const ok = (cond, msg) => {
  if (!cond) fallos++;
  console.log(`${cond ? "✅" : "❌"} ${msg}`);
};

async function abrir(browser, ancho = 390) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
  });
  return { ctx, page, errores };
}

const hojas = (page) => page.locator('[role="dialog"]:not([role="alertdialog"])').count();
const avisos = (page) => page.locator('[role="alertdialog"]').count();
const ruta = (page) => new globalThis.URL(page.url()).pathname;

/** Desliza hacia abajo desde la cabecera de la hoja de arriba (touch de verdad, por CDP). */
async function deslizar(ctx, page, distancia = 420) {
  const cdp = await ctx.newCDPSession(page);
  const top = await page.$$eval('[role="dialog"]', (d) => Math.round(d[d.length - 1].getBoundingClientRect().top));
  const t = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 195, y }] });
  await t("touchStart", top + 14);
  for (let i = 1; i <= 12; i++) {
    await t("touchMove", top + 14 + (i * distancia) / 12);
    await page.waitForTimeout(16);
  }
  await t("touchEnd");
  await page.waitForTimeout(700);
}

/** Abre el detalle de un pedido a crédito con deuda y, encima, "Registrar abono". */
async function conAbono(page) {
  await page.goto(URL + "/pedidos");
  await page.waitForSelector('[role="tab"]');
  await page.getByRole("tab", { name: /^Despachados/ }).click();
  await page.getByRole("link", { name: /#1036/ }).click();
  await page.waitForSelector("section[aria-label='Pago del pedido']");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Registrar abono" }).click();
  await page.waitForSelector('input[aria-label^="Monto del abono"]');
  await page.waitForTimeout(600);
}

const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox"]} : {});
try {
  // ---- 1. Sin cambios: cada gesto cierra SOLO la hoja de arriba
  for (const gesto of ["deslizar", "fondo", "escape", "equis", "atras"]) {
    const { ctx, page, errores } = await abrir(navegador);
    await conAbono(page);
    const url = ruta(page);
    ok((await hojas(page)) === 2, `[${gesto}] hay dos hojas apiladas (detalle + abono)`);
    if (gesto === "deslizar") await deslizar(ctx, page);
    if (gesto === "fondo") await page.mouse.click(195, 8);
    if (gesto === "escape") await page.keyboard.press("Escape");
    if (gesto === "equis") await page.locator('[role="dialog"] button[aria-label="Cerrar"]').last().click();
    if (gesto === "atras") await page.goBack();
    await page.waitForTimeout(700);
    ok((await hojas(page)) === 1, `[${gesto}] sin cambios: se cierra la de arriba y queda la de abajo (${await hojas(page)})`);
    ok(ruta(page) === url, `[${gesto}] la dirección no cambió (${ruta(page)})`);
    ok((await avisos(page)) === 0, `[${gesto}] sin cambios no pregunta nada`);
    ok(await page.locator("section[aria-label='Pago del pedido']").isVisible(), `[${gesto}] el detalle del pedido sigue a la vista`);
    // Y ahora sí, la de abajo responde a sus gestos
    if (gesto === "atras") {
      await page.goBack();
      await page.waitForTimeout(800);
      ok(ruta(page) === "/pedidos" && (await hojas(page)) === 0, `[${gesto}] un segundo "atrás" cierra el detalle (${ruta(page)})`);
    }
    ok(errores.length === 0, `[${gesto}] sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- 2. Con cambios: pregunta; "Seguir aquí" conserva; "Salir" cierra solo la de arriba
  for (const gesto of ["deslizar", "fondo", "escape", "equis", "atras"]) {
    const { ctx, page, errores } = await abrir(navegador);
    await conAbono(page);
    const url = ruta(page);
    await page.locator('input[aria-label^="Monto del abono"]').fill("500");
    if (gesto === "deslizar") await deslizar(ctx, page);
    if (gesto === "fondo") await page.mouse.click(195, 8);
    if (gesto === "escape") await page.keyboard.press("Escape");
    if (gesto === "equis") await page.locator('[role="dialog"] button[aria-label="Cerrar"]').last().click();
    if (gesto === "atras") await page.goBack();
    await page.waitForTimeout(700);
    ok((await avisos(page)) === 1, `[${gesto}] con cambios sale "¿Salir sin guardar?"`);
    ok((await hojas(page)) === 2, `[${gesto}] con cambios no se cierra ninguna hoja`);
    const dentro = await page.evaluate(() => {
      const d = document.querySelectorAll('[role="dialog"]');
      const p = d[d.length - 1].getBoundingClientRect();
      return p.top >= 0 && p.top < 844 - 200;
    });
    ok(dentro, `[${gesto}] la hoja volvió a su lugar (no quedó a medio deslizar)`);
    ok(/Lo que escribiste se va a perder/.test(await page.locator('[role="alertdialog"]').innerText()), `[${gesto}] el diálogo dice qué se pierde`);
    ok(await page.evaluate(() => document.activeElement?.textContent === "Seguir aquí"), `[${gesto}] el foco entra al diálogo ("Seguir aquí")`);
    // El foco no se escapa con Tab
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    ok(await page.evaluate(() => !!document.activeElement?.closest('[role="alertdialog"]')), `[${gesto}] Tab no saca el foco del diálogo`);
    // "Seguir aquí"
    await page.getByRole("button", { name: "Seguir aquí" }).click();
    await page.waitForTimeout(400);
    ok((await avisos(page)) === 0 && (await hojas(page)) === 2, `[${gesto}] "Seguir aquí" no cierra nada`);
    ok((await page.locator('input[aria-label^="Monto del abono"]').inputValue()) === "500", `[${gesto}] lo escrito se conserva`);
    // Otra vez, y ahora "Salir"
    if (gesto === "escape") {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      ok((await avisos(page)) === 1, `[${gesto}] Escape vuelve a preguntar`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      ok((await avisos(page)) === 0 && (await hojas(page)) === 2, `[${gesto}] Escape dentro del diálogo equivale a "Seguir aquí"`);
      await page.keyboard.press("Escape");
    } else if (gesto === "deslizar") await deslizar(ctx, page);
    else if (gesto === "fondo") await page.mouse.click(195, 8);
    else if (gesto === "equis") await page.locator('[role="dialog"] button[aria-label="Cerrar"]').last().click();
    else await page.goBack();
    await page.waitForTimeout(500);
    ok((await avisos(page)) === 1, `[${gesto}] vuelve a preguntar`);
    await page.getByRole("button", { name: "Salir" }).click();
    await page.waitForTimeout(800);
    ok((await hojas(page)) === 1 && (await avisos(page)) === 0, `[${gesto}] "Salir" cierra solo la de arriba (${await hojas(page)})`);
    ok(ruta(page) === url, `[${gesto}] la dirección no cambió (${ruta(page)})`);
    // Si vuelve a abrir el abono, empieza limpio y sin aviso
    await page.getByRole("button", { name: "Registrar abono" }).click();
    await page.waitForSelector('input[aria-label^="Monto del abono"]');
    ok((await page.locator('input[aria-label^="Monto del abono"]').inputValue()) === "", `[${gesto}] al volver a abrir el abono, está vacío`);
    ok(errores.length === 0, `[${gesto}] sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- 3. Guardar con éxito no pregunta
  {
    const { ctx, page, errores } = await abrir(navegador);
    await conAbono(page);
    await page.locator('input[aria-label^="Monto del abono"]').fill("200");
    await page.getByRole("button", { name: "Guardar abono" }).click();
    await page.waitForTimeout(900);
    ok((await avisos(page)) === 0 && (await hojas(page)) === 1, "Guardar el abono cierra la hoja sin preguntar");
    ok(errores.length === 0, `Guardar: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  // ---- 4. Hoja de ruta con campos: pregunta solo si hay algo escrito
  {
    const { ctx, page, errores } = await abrir(navegador);
    await page.goto(URL + "/clientes/nuevo");
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Paola Jiménez"]');
    await page.waitForTimeout(600);
    await page.locator('[role="dialog"] button[aria-label="Cerrar"]').click();
    await page.waitForTimeout(800);
    ok(ruta(page) === "/clientes" && (await avisos(page)) === 0, "Cliente nuevo vacío: la X cierra sin preguntar");
    await page.goto(URL + "/clientes/nuevo");
    await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Paola Jiménez"]');
    await page.waitForTimeout(600);
    await page.fill('[role="dialog"] input[placeholder="Ej: Paola Jiménez"]', "Ana");
    await page.locator('[role="dialog"] button[aria-label="Cerrar"]').click();
    await page.waitForTimeout(600);
    ok((await avisos(page)) === 1 && ruta(page) === "/clientes/nuevo", "Cliente nuevo con un nombre escrito: la X pregunta");
    await page.getByRole("button", { name: "Seguir aquí" }).click();
    ok((await page.inputValue('[role="dialog"] input[placeholder="Ej: Paola Jiménez"]')) === "Ana", "Cliente nuevo: «Seguir aquí» conserva lo escrito");
    await page.locator('[role="dialog"] button[aria-label="Cerrar"]').click();
    await page.getByRole("button", { name: "Salir" }).click();
    await page.waitForTimeout(900);
    ok(ruta(page) === "/clientes", `Cliente nuevo: «Salir» cierra (${ruta(page)})`);
    ok(errores.length === 0, `Cliente nuevo: sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }
} finally {
  await navegador.close();
}

console.log(fallos === 0 ? "\nTodo bien: hojas apiladas y aviso al salir." : `\n${fallos} comprobación(es) fallaron.`);
process.exit(fallos === 0 ? 0 : 1);
