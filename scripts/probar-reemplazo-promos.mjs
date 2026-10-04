// Solo demo local: URL=http://localhost:3100 node scripts/probar-reemplazo-promos.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { pedidosConCodigo } from "../lib/promos.ts";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }
const url = process.env.URL ?? "http://localhost:3000";
const originalId = "a6000000-0000-4000-8000-000000000001";
const codigoId = "a6000000-0000-4000-8000-000000000002";
const terminadaId = "a6000000-0000-4000-8000-000000000004";
const db = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v4")));
const tipo = (page, nombre) => page.getByRole("group", { name: "Tipo de promo" }).getByRole("button", { name: nombre });
const browser = await playwright.chromium.launch();
async function abrir(id = originalId) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-version-vista", "99.0.0");
  });
  await page.goto(`${url}/promos`);
  await page.getByRole("button", { name: /Cambiar de tienda/ }).click();
  await page.getByRole("button", { name: /Reiniciar datos de prueba/ }).click();
  await page.getByRole("button", { name: /¿Seguro\? Toca otra vez/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(`${url}/promos/${id}/editar`);
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(500);
  return { ctx, page, errores };
}
async function crearCopia(page, nombreTipo = /^Código/) {
  await tipo(page, nombreTipo).click();
  await page.getByText("Cambiar el tipo cambia cómo se aplica el descuento. Para mantener el historial en orden, crea otra promo. Te dejamos la copia lista.").waitFor();
  await page.getByRole("button", { name: "Sí, crear otra promo" }).click();
  await page.waitForURL("**/promos/nueva?*");
  await page.getByText(/Vas a crear una promo nueva/).waitFor();
  await page.waitForTimeout(500);
}
async function guardarCodigo(page, codigo) {
  await page.getByRole("button", { name: "Crear promo", exact: true }).click();
  await page.getByText("Escribe un código de 3 a 12 letras o números.").waitFor();
  await page.getByPlaceholder("Ej: AAAH10").fill(codigo);
  await page.getByRole("button", { name: "Crear promo", exact: true }).click();
  await page.getByText("Tu nueva promo está guardada.").waitFor();
}
try {
  // Seguir editando y cancelar conservan el borrador y todos los datos guardados.
  {
    const { ctx, page, errores } = await abrir();
    const antes = await db(page);
    await page.getByLabel("Nombre", { exact: true }).fill("Borrador sin guardar");
    await tipo(page, /^Código/).click();
    assert.equal(await tipo(page, /^Por colección/).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Me quedo con esta" }).click();
    assert.equal(await page.getByLabel("Nombre", { exact: true }).inputValue(), "Borrador sin guardar");
    await tipo(page, /^Código/).click();
    await page.getByRole("button", { name: "Sí, crear otra promo" }).click();
    await page.getByRole("alertdialog", { name: "¿Salir sin guardar?" }).waitFor();
    await page.getByRole("button", { name: "Seguir aquí" }).click();
    assert.equal(await page.getByLabel("Nombre", { exact: true }).inputValue(), "Borrador sin guardar");
    await tipo(page, /^Código/).click();
    await page.getByRole("button", { name: "Sí, crear otra promo" }).click();
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await page.waitForURL("**/promos/nueva?*");
    assert.equal(await page.getByLabel("Nombre", { exact: true }).inputValue(), "Semana del aaah");
    assert.equal(await page.getByPlaceholder("Ej: AAAH10").inputValue(), "");
    await page.getByLabel("Nombre", { exact: true }).fill("Cancelar copia");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await page.waitForURL("**/promos");
    assert.deepEqual(await db(page), antes);
    assert.deepEqual(errores, []);
    console.log("✅ Tipo bloqueado, borrador protegido y cancelación sin cambios");
    await ctx.close();
  }
  for (const finalizar of [false, true]) {
    const { ctx, page, errores } = await abrir();
    const antes = await db(page);
    await crearCopia(page);
    assert.equal(await tipo(page, /^Código/).getAttribute("aria-pressed"), "true");
    assert.equal(await page.getByLabel("Descuento en porcentaje").inputValue(), "15");
    await guardarCodigo(page, finalizar ? "NUEVAEND" : "NUEVAKEEP");
    const despues = await db(page);
    assert.equal(despues.promos.length, antes.promos.length + 1);
    assert.deepEqual(despues.promos.find((p) => p.id === originalId), antes.promos.find((p) => p.id === originalId));
    assert.deepEqual(despues.pedidos, antes.pedidos);
    const nueva = despues.promos.find((p) => !antes.promos.some((a) => a.id === p.id));
    assert.equal(pedidosConCodigo(despues.pedidos, nueva), 0);
    assert.equal(nueva.productoId, null);
    assert.equal(nueva.coleccion, null);
    assert.equal(nueva.limiteUsos, null);
    if (finalizar) {
      await page.getByRole("button", { name: "Terminar la anterior" }).click();
      assert.deepEqual((await db(page)).promos, despues.promos);
      await page.getByRole("button", { name: "Mejor no" }).click();
      assert.deepEqual((await db(page)).promos, despues.promos);
      await page.getByRole("button", { name: "Terminar la anterior" }).click();
      await page.getByRole("button", { name: "Sí, terminar" }).click();
      await page.waitForURL("**/promos");
      assert.equal((await db(page)).promos.find((p) => p.id === originalId).estado, "terminada");
      assert.deepEqual((await db(page)).pedidos, antes.pedidos);
    } else {
      await page.getByRole("button", { name: "Dejar ambas" }).click();
      await page.waitForURL("**/promos");
      assert.deepEqual((await db(page)).promos.find((p) => p.id === originalId), antes.promos.find((p) => p.id === originalId));
    }
    assert.deepEqual(errores, []);
    console.log(`✅ Copia sin historial; ${finalizar ? "solo termina con confirmación explícita" : "Dejar ambas conserva la original"}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(codigoId);
    const antes = await db(page);
    assert.ok(pedidosConCodigo(antes.pedidos, antes.promos.find((p) => p.id === codigoId)) > 0);
    await crearCopia(page, /^En productos/);
    assert.equal(await tipo(page, /^En productos/).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Crear promo", exact: true }).click();
    await page.getByText("Elige el producto.").waitFor();
    await page.getByRole("button", { name: "Elegir producto" }).click();
    await page.getByPlaceholder("Busca un producto").fill("Kiara");
    await page.getByRole("button", { name: /Kiara Pink/ }).click();
    await page.getByRole("button", { name: "Crear promo", exact: true }).click();
    await page.getByText("Tu nueva promo está guardada.").waitFor();
    const despues = await db(page);
    const nueva = despues.promos.find((p) => !antes.promos.some((a) => a.id === p.id));
    assert.equal(nueva.codigo, null);
    assert.equal(nueva.limiteUsos, null);
    assert.equal(pedidosConCodigo(despues.pedidos, nueva), 0);
    assert.deepEqual(despues.pedidos, antes.pedidos);
    assert.deepEqual(despues.promos.find((p) => p.id === codigoId), antes.promos.find((p) => p.id === codigoId));
    console.log("✅ Código con usos → producto no transfiere usos ni código");
    await ctx.close();
  }
  {
    const { ctx, page } = await abrir(terminadaId);
    const antes = await db(page);
    await page.goto(`${url}/promos/nueva?copiar=${terminadaId}&tipo=codigo`);
    await page.getByPlaceholder("Ej: AAAH10").fill("FINISHCOPY");
    await page.getByRole("button", { name: "Crear promo", exact: true }).click();
    await page.waitForURL("**/promos");
    assert.equal(await page.getByRole("button", { name: "Terminar la anterior" }).count(), 0);
    assert.deepEqual((await db(page)).promos.find((p) => p.id === terminadaId), antes.promos.find((p) => p.id === terminadaId));
    console.log("✅ Original terminada: sin elección de reemplazo y sin cambios");
    await page.goto(`${url}/promos/nueva?copiar=a6000000-0000-4000-8000-000000000005&tipo=codigo`);
    await page.getByText("Esta promo no vive aquí.").waitFor();
    assert.equal(await page.getByRole("button", { name: "Crear promo", exact: true }).count(), 0);
    console.log("✅ No se copia una promo ajena a la tienda activa");
    await ctx.close();
  }
} finally { await browser.close(); }
