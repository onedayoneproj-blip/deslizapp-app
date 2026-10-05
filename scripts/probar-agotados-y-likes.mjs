// Selección, revalidación y tarjeta de likes con datos locales aislados. No inicia sesión ni escribe en Supabase.
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { navegador, URL } from "./navegador-catalogo.mjs";

const { construirDesdeSeed } = await import("../lib/data/db.ts");
const d = construirDesdeSeed(), tienda = d.tiendas[0], productos = d.productos.filter(p => p.tiendaId === tienda.id).slice(0, 5);
const [uno, conVariantes, disponible, sinControl, oculto] = productos;
for (const p of d.productos.filter(p => p.tiendaId === tienda.id)) p.activo = false;
uno.nombre = "Fixture agotado uno"; uno.activo = true; uno.stock = 0; uno.likes = 0;
conVariantes.nombre = "Fixture todas variantes agotadas"; conVariantes.activo = true; conVariantes.stock = 0; conVariantes.likes = 1234567890;
conVariantes.opciones = [{ nombre: "Talla", valores: ["S", "M"] }];
d.variantes = d.variantes.filter(v => v.productoId !== conVariantes.id);
d.variantes.push(...["S", "M"].map((t, i) => ({ id: `fixture-${i}`, tiendaId: tienda.id, productoId: conVariantes.id, valores: { Talla: t }, stock: 0, precio: null, activa: true, creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString() })));
disponible.nombre = "Fixture una variante disponible"; disponible.activo = true; disponible.stock = 4; disponible.likes = 12;
disponible.opciones = [{ nombre: "Talla", valores: ["S", "M"] }];
d.variantes = d.variantes.filter(v => v.productoId !== disponible.id);
d.variantes.push(...[0, 4].map((stock, i) => ({ id: `disponible-${i}`, tiendaId: tienda.id, productoId: disponible.id, valores: { Talla: String(i) }, stock, precio: null, activa: true, creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString() })));
sinControl.nombre = "Fixture sin control"; sinControl.activo = true; sinControl.stock = null;
oculto.nombre = "Fixture oculto"; oculto.activo = false; oculto.stock = 0;
for (const p of productos) p.fotos = [];
const carpeta = process.env.CAPTURAS ?? "/tmp/agota-y-likes"; mkdirSync(carpeta, { recursive: true });
const browser = await navegador(); const resultados = [];
const baseDb = JSON.parse(JSON.stringify(d));
const leer = page => page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-demo-v5")));
const entrarSelector = async page => {
  await page.getByRole("button", { name: "Ocultarlos" }).click();
  await page.getByText("Elige qué productos agotados ocultar.", { exact: false }).waitFor();
};
const abrir = async page => {
  await page.getByRole("button", { name: /Ver tu inventario/ }).click();
  await page.getByText("agotados siguen a la vista", { exact: false }).waitFor();
  await entrarSelector(page);
};
try {
  for (const width of [360, 390, 430]) for (const tema of ["claro", "oscuro"]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: tema === "oscuro" ? "reduce" : "no-preference", serviceWorkers: "block" });
    const page = await ctx.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message)); await page.route("**/*.supabase.co/**", r => r.abort());
    await page.addInitScript(({ db, tiendaId }) => { localStorage.setItem("deslizapp-demo-v5", JSON.stringify(db)); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", tiendaId); localStorage.setItem("deslizapp-version-vista", "9.9.9"); }, { db: baseDb, tiendaId: tienda.id });
    await page.goto(`${URL}/catalogo`);
    if (tema === "oscuro") await page.evaluate(() => document.documentElement.dataset.theme = "dark");
    await page.locator(`[data-likes-panel]`).first().waitFor();
    const cLike = page.locator(`a[href="/catalogo/${uno.id}"] [data-likes-panel]`);
    assert.equal((await cLike.innerText()).replace(/\s/g, ""), "♡0".replace("♡", ""));
    assert.equal(await cLike.locator("svg").count(), 1);
    const pill = await cLike.evaluate(el => ({ html: el.outerHTML, display: getComputedStyle(el).display, direction: getComputedStyle(el).flexDirection, radius: getComputedStyle(el).borderRadius, bg: getComputedStyle(el).backgroundColor, rules: [...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].filter(r=>r.selectorText && el.matches(r.selectorText) && r.style.display).map(r=>[r.selectorText,r.style.display])}catch{return []}}), children: [...el.children].map(x => x.tagName) }));
    assert.equal(pill.display, "flex"); assert.equal(pill.direction, "row"); assert(Number.parseFloat(pill.radius) > 1000 || pill.radius === "50%"); assert.equal(pill.children.length, 2);
    const longCard = page.locator(`a[href="/catalogo/${conVariantes.id}"] [data-likes-panel]`);
    assert.equal((await longCard.innerText()).replace(/\s/g, ""), "1234567890");
    const pillBounds = await longCard.evaluate(el => { const photo=el.parentElement.getBoundingClientRect(), pill=el.getBoundingClientRect(); return { inside: pill.left>=photo.left && pill.right<=photo.right && pill.top>=photo.top && pill.bottom<=photo.bottom, overflow: el.scrollWidth>el.clientWidth }; });
    assert(pillBounds.inside); assert.equal(pillBounds.overflow, false);
    assert((await page.locator(`a[href="/catalogo/${uno.id}"]`).getAttribute("aria-label")).includes("0 likes"));
    await page.screenshot({ path: `${carpeta}/likes-${width}-${tema}.png`, fullPage: true });
    await abrir(page);
    const dialog = page.getByRole("dialog");
    const filas = dialog.getByRole("checkbox");
    assert.equal(await filas.count(), 3, "select all más agotado simple y variantes todas en cero; disponible, null y oculto fuera");
    assert.equal(await dialog.getByText("Ningún producto seleccionado", { exact: true }).count(), 1);
    assert(await dialog.getByRole("button", { name: "Ocultar del catálogo", exact: true }).isDisabled());
    await dialog.getByRole("searchbox", { name: "Buscar agotados visibles" }).fill("variantes");
    await dialog.getByText("1 producto de esta búsqueda", { exact: true }).waitFor();
    assert.equal(await dialog.getByRole("checkbox").count(), 2, "seleccionar todos + única coincidencia");
    await dialog.getByRole("checkbox", { name: /Seleccionar todos los resultados/ }).click();
    assert.equal(await dialog.getByText("1 producto seleccionado", { exact: true }).count(), 1);
    await page.screenshot({ path: `${carpeta}/seleccion-${width}-${tema}.png` });
    await page.getByRole("button", { name: "Volver a Tu inventario" }).click();
    assert.equal((await leer(page)).productos.find(p => p.id === uno.id).activo, true, "volver cancela sin cambios");
    await entrarSelector(page);
    const unoFila = dialog.getByRole("checkbox", { name: /Fixture agotado uno/ });
    await unoFila.click();
    const action = dialog.getByRole("button", { name: "Ocultar 1 producto" });
    await action.evaluate(el => { el.click(); el.click(); });
    await page.getByRole("button", { name: "Ocultarlos" }).waitFor();
    const guardado = await leer(page);
    assert.equal(guardado.productos.find(p => p.id === uno.id).activo, false);
    assert.equal(guardado.productos.find(p => p.id === conVariantes.id).activo, true);
    assert.equal(guardado.productos.find(p => p.id === uno.id).stock, 0);
    assert.deepEqual(guardado.variantes.filter(v => v.productoId === conVariantes.id), baseDb.variantes.filter(v => v.productoId === conVariantes.id));
    assert.deepEqual(guardado.avisos, baseDb.avisos); assert.deepEqual(guardado.pedidos, baseDb.pedidos);
    assert.deepEqual(guardado.productos.filter(p => p.tiendaId !== tienda.id), baseDb.productos.filter(p => p.tiendaId !== tienda.id));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); assert.deepEqual(errors, []);
    resultados.push({ width, tema, likes0Y10DigitosEnUnaPildora: true, seleccionBusquedaCancelarConfirmar: true, variantesSinStockNuloOculto: true, inventarioPedidosAvisosYTiendaAislados: true });
    await ctx.close(); console.log("✓", width, tema);
  }

  // Confirmación de varios y relectura de dos productos cambiados desde otra sesión.
  for (const escenario of ["varios", "cambios-externos"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    const page = await ctx.newPage(); await page.route("**/*.supabase.co/**", r => r.abort());
    await page.addInitScript(({ db, tiendaId }) => { localStorage.setItem("deslizapp-demo-v5", JSON.stringify(db)); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", tiendaId); localStorage.setItem("deslizapp-version-vista", "9.9.9"); }, { db: baseDb, tiendaId: tienda.id });
    await page.goto(`${URL}/catalogo`); await abrir(page); const dialog = page.getByRole("dialog");
    if (escenario === "varios") {
      await dialog.getByRole("checkbox", { name: /Seleccionar todos los resultados/ }).click();
      await dialog.getByText("2 productos seleccionados", { exact: true }).waitFor();
      await dialog.getByRole("button", { name: "Ocultar 2 productos" }).click();
      await page.getByText("Tu inventario", { exact: true }).waitFor();
      const final = await leer(page);
      assert.equal(final.productos.find(p => p.id === uno.id).activo, false);
      assert.equal(final.productos.find(p => p.id === conVariantes.id).activo, false);
      assert.equal(final.productos.find(p => p.id === disponible.id).activo, true);
      assert.equal(final.productos.find(p => p.id === sinControl.id).activo, true);
      assert.equal(final.productos.find(p => p.id === oculto.id).activo, false);
    } else {
      await dialog.getByRole("checkbox", { name: /Fixture agotado uno/ }).click();
      await dialog.getByRole("checkbox", { name: /Fixture todas variantes agotadas/ }).click();
      await page.evaluate(({a,b})=>{const db=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));db.productos.find(p=>p.id===a).stock=3;db.productos.find(p=>p.id===b).activo=false;localStorage.setItem("deslizapp-demo-v5",JSON.stringify(db));window.dispatchEvent(new StorageEvent("storage",{key:"deslizapp-demo-v5"}));},{a:uno.id,b:conVariantes.id});
      await dialog.getByRole("button", { name: "Ocultar 2 productos" }).click();
      await dialog.getByRole("alert").getByText(/Ya no están agotados y visibles/).waitFor();
      const final = await leer(page);
      assert.equal(final.productos.find(p => p.id === uno.id).stock, 3);
      assert.equal(final.productos.find(p => p.id === uno.id).activo, true);
      assert.equal(final.productos.find(p => p.id === conVariantes.id).activo, false);
      assert.equal(await dialog.getByText("Ya no hay productos agotados a la vista.", { exact: true }).count(), 1);
    }
    await ctx.close(); resultados.push({ width: 390, escenario, passed: true }); console.log("✓ 390", escenario);
  }
  await import("node:fs/promises").then(fs => fs.writeFile(`${carpeta}/resultados.json`, JSON.stringify(resultados, null, 2)));
} finally { await browser.close(); }
