// URL=http://127.0.0.1:3101 NODE_PATH=... PLAYWRIGHT_BROWSERS_PATH=... node scripts/probar-detalle-promos.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }

const base = process.env.URL ?? "http://127.0.0.1:3101";
const id = "a6000000-0000-4000-8000-000000000001";
const codigo = "a6000000-0000-4000-8000-000000000002";
const terminada = "a6000000-0000-4000-8000-000000000004";
const ajena = "a6000000-0000-4000-8000-000000000005";
const browser = await playwright.chromium.launch();
const errores = [];

async function contexto(ancho = 390, reducido = false) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reducido ? "reduce" : "no-preference" });
  await ctx.addInitScript(() => {
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-version-vista", "99.0.0");
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errores.push(e.message));
  return { ctx, page };
}

try {
  for (const ancho of [360, 390, 430]) {
    const { ctx, page } = await contexto(ancho, ancho === 430);
    await page.goto(`${base}/promos`);
    await page.locator(`a[href^='/promos/${id}']`).click();
    await page.waitForURL(`**/promos/${id}?desde=lista`);
    await page.getByRole("heading", { name: "Detalle de promo" }).waitFor();
    await page.getByText("Semana del aaah").last().waitFor();
    assert.equal(await page.locator('[role="dialog"] input').count(), 0);
    assert.equal(await page.locator("body").evaluate((el) => el.scrollWidth > innerWidth), false);
    if (ancho === 390) {
      await page.waitForTimeout(450);
      await page.screenshot({ path: "docs/capturas/promo-detalle-real.png" });
    }
    await page.getByRole("button", { name: "Compartir promo" }).click();
    await page.waitForURL(`**/promos/${id}/compartir?desde=detalle`);
    await page.getByRole("heading", { name: "Compartir promo" }).waitFor();
    await page.goBack();
    await page.waitForURL(`**/promos/${id}?desde=lista`);
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.getByRole("button", { name: "Editar promo" }).click();
    await page.waitForURL(`**/promos/${id}/editar?desde=detalle`);
    await page.getByRole("group", { name: "Tipo de promo" }).getByRole("button", { name: /^Código/ }).click();
    await page.getByRole("heading", { name: "Nah, ah… así no." }).waitFor();
    await page.waitForTimeout(450);
    assert.equal(await page.getByRole("dialog").count(), 2);
    assert.equal(await page.getByRole("group", { name: "Tipo de promo" }).getByRole("button", { name: /^Por colección/ }).getAttribute("aria-pressed"), "true");
    if (ancho === 390) {
      await page.waitForTimeout(450);
      await page.screenshot({ path: "docs/capturas/promo-consejo-real.png" });
    }
    if (ancho === 360) await page.keyboard.press("Escape");
    else if (ancho === 430) await page.goBack();
    else await page.getByRole("button", { name: "Me quedo con esta" }).click();
    await page.getByRole("heading", { name: "Nah, ah… así no." }).waitFor({ state: "hidden" });
    assert.equal(await page.getByRole("dialog").count(), 1);
    assert.match(page.url(), new RegExp(`/promos/${id}/editar`));
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes("Código")), true);
    await page.goBack();
    await page.waitForURL(`**/promos/${id}?desde=lista`);
    await page.goBack();
    await page.waitForURL("**/promos");
    assert.equal(await page.getByRole("dialog").count(), 0);
    console.log(`✅ ${ancho}px${ancho === 430 ? " reducido" : ""}: tarjeta → detalle → compartir/editar, consejo y atrás`);
    await ctx.close();
  }

  for (const cierre of ["fondo", "equis", "deslizar"]) {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/promos/${id}/editar`);
    await page.getByLabel("Nombre", { exact: true }).fill("Borrador protegido");
    await page.getByRole("group", { name: "Tipo de promo" }).getByRole("button", { name: /^Código/ }).click();
    await page.getByRole("heading", { name: "Nah, ah… así no." }).waitFor();
    await page.waitForTimeout(450);
    if (cierre === "fondo") await page.mouse.click(195, 8);
    else if (cierre === "equis") await page.locator('[role="dialog"] button[aria-label="Cerrar"]').last().click();
    else {
      const cdp = await ctx.newCDPSession(page);
      const top = await page.locator('[role="dialog"]').last().evaluate((d) => Math.round(d.getBoundingClientRect().top));
      const toque = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 195, y }] });
      await toque("touchStart", top + 14);
      for (let n = 1; n <= 12; n++) {
        await toque("touchMove", top + 14 + n * 35);
        await page.waitForTimeout(16);
      }
      await toque("touchEnd");
    }
    await page.getByRole("heading", { name: "Nah, ah… así no." }).waitFor({ state: "hidden" });
    assert.equal(await page.getByRole("dialog").count(), 1);
    assert.equal(await page.getByLabel("Nombre", { exact: true }).inputValue(), "Borrador protegido");
    console.log(`✅ ${cierre}: solo cierra el consejo y conserva el borrador`);
    await ctx.close();
  }

  {
    const { ctx, page } = await contexto();
    await page.goto(`${base}/promos`);
    await page.getByRole("tab", { name: /^Programadas/ }).click();
    await page.locator("a[href^='/promos/a6000000-0000-4000-8000-000000000003']").click();
    await page.getByRole("heading", { name: "Detalle de promo" }).waitFor();
    await page.getByRole("dialog").getByRole("button", { name: "Cerrar" }).click();
    await page.waitForURL("**/promos");
    assert.equal(await page.getByRole("tab", { name: /^Programadas/ }).getAttribute("aria-selected"), "true");
    console.log("✅ Cerrar el detalle conserva la pestaña Programadas");
    await ctx.close();
  }

  const { ctx, page } = await contexto();
  for (const [promo, texto] of [[codigo, "Veces usado"], [terminada, "Duplicar promo"]]) {
    await page.goto(`${base}/promos/${promo}`);
    await page.getByText(texto, { exact: true }).waitFor();
  }
  assert.equal(await page.getByRole("button", { name: "Editar promo" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Compartir promo" }).count(), 0);
  await page.goto(`${base}/promos`);
  await page.getByRole("button", { name: /Cambiar de tienda/ }).click();
  await page.getByRole("button", { name: /Reiniciar datos de prueba/ }).click();
  await page.getByRole("button", { name: /¿Seguro\? Toca otra vez/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(`${base}/promos/${codigo}`);
  await page.getByText("Sin límite", { exact: true }).first().waitFor();
  await page.evaluate((promoId) => {
    const key = "deslizapp-demo-v5";
    const db = JSON.parse(localStorage.getItem(key));
    const promo = db.promos.find((p) => p.id === promoId);
    promo.limiteUsos = 1;
    localStorage.setItem(key, JSON.stringify(db));
  }, codigo);
  await page.reload();
  await page.getByText("Agotada", { exact: true }).waitFor();
  assert.equal(await page.getByText("Usos restantes").locator("..").innerText().then((t) => t.includes("0")), true);
  await page.evaluate((promoId) => {
    const key = "deslizapp-demo-v5";
    const db = JSON.parse(localStorage.getItem(key));
    const promo = db.promos.find((p) => p.id === promoId);
    promo.pausada = true;
    promo.fechaFin = null;
    localStorage.setItem(key, JSON.stringify(db));
  }, codigo);
  await page.reload();
  await page.getByText("Pausada", { exact: true }).waitFor();
  await page.getByText("Sin fecha de fin", { exact: true }).waitFor();
  await page.goto(`${base}/promos/a6000000-0000-4000-8000-000000000003`);
  await page.getByText("Programada", { exact: true }).waitFor();
  assert.equal(await page.locator("dd img").count(), 1);
  await page.goto(`${base}/promos/${ajena}`);
  await page.getByText("Esta promo no vive aquí.").waitFor();
  assert.equal(await page.getByText("LUNA20").count(), 0);
  await page.goto(`${base}/promos/no-existe`);
  await page.getByText("Esta promo no vive aquí.").waitFor();
  assert.deepEqual(errores, []);
  console.log("✅ Código, terminada, promo inexistente y aislamiento entre tiendas");
  await ctx.close();
} finally { await browser.close(); }
