// Uso (app corriendo, p. ej. `npm run build && PORT=3220 npm start`):  node scripts/probar-hojas-gestos.mjs   (URL=http://localhost:3220)
// Gestos de las hojas del catálogo del cliente (demo `?demo`, 390 y 360, touch real por CDP): deslizar arriba sobre el cuerpo expande;
// expandida, el contenido hace scroll; deslizar abajo con el cuerpo arriba reduce y luego cierra; con el cuerpo scrolleado hace scroll;
// con un campo enfocado no arrastra; el scroll horizontal de la cuadrícula de presentaciones no mueve la hoja.
import "../tests/cargar-ts.mjs";
import { navegador, URL } from "./navegador-catalogo.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const seed = construirDesdeSeed();
const michel = seed.tiendas.find((t) => t.slug === "esencias-michel");
const agotado = seed.productos.find((p) => p.tiendaId === michel.id);
agotado.stock = 0;
agotado.activo = true;
agotado.porEncargo = false;
seed.avisos = [];
let fallos = 0;
const ok = (c, m) => {
  if (!c) fallos++;
  console.log(`${c ? "✅" : "❌"} ${m}`);
};
const b = await navegador();

async function abrir(ancho, ruta) {
  const ctx = await b.newContext({ serviceWorkers: "block", viewport: { width: ancho, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.route("**/*.supabase.co/**", (r) => r.abort());
  await ctx.addInitScript(({ seed, michel }) => {
    for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1");
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", michel.id);
    if (!localStorage.getItem("deslizapp-demo-v5")) localStorage.setItem("deslizapp-demo-v5", JSON.stringify(seed));
  }, { seed, michel });
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto(`${URL}${ruta}`);
  await page.waitForTimeout(900);
  return { ctx, page, errores, cdp: await ctx.newCDPSession(page) };
}
/** Dedo real: de (x,y0) a (x,y1) o (x1,y) en pasos. */
async function dedo(cdp, [x0, y0], [x1, y1], pasos = 10) {
  const t = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await t("touchStart", x0, y0);
  for (let i = 1; i <= pasos; i++) {
    await t("touchMove", x0 + ((x1 - x0) * i) / pasos, y0 + ((y1 - y0) * i) / pasos);
    await new Promise((r) => setTimeout(r, 16));
  }
  await t("touchEnd", x1, y1);
  await new Promise((r) => setTimeout(r, 500));
}
const centro = async (page, sel) => {
  const c = await page.locator(sel).boundingBox();
  return { x: Math.round(c.x + c.width / 2), y: Math.round(c.y + c.height / 2), c };
};
const full = (page, sel) => page.locator(sel).evaluate((e) => e.classList.contains("full"));
const arriba = (page, sel) => page.locator(sel).evaluate((e) => e.scrollTop);

/** Recorrido común. `hoja` = selector de la hoja; `cuerpo` = el que desplaza; `scroll` = si el contenido desborda al expandir. */
async function recorrido(nombre, { cdp, page }, hoja, cuerpo, { cierraCon = "#" } = {}) {
  const p = (await centro(page, cuerpo));
  ok(!(await full(page, hoja)), `${nombre}: abre a media altura`);
  await dedo(cdp, [p.x, p.y + 60], [p.x, p.y - 140]);
  ok(await full(page, hoja), `${nombre}: deslizar arriba sobre el cuerpo expande`);
  const sc = await page.locator(cuerpo).evaluate((e) => e.scrollHeight > e.clientHeight + 4);
  if (sc) {
    const q = await centro(page, cuerpo);
    await dedo(cdp, [q.x, q.y + 120], [q.x, q.y - 120]);
    ok((await arriba(page, cuerpo)) > 20 && (await full(page, hoja)), `${nombre}: expandida, el contenido hace scroll`);
    await dedo(cdp, [q.x, q.y - 100], [q.x, q.y + 20], 6);
    ok(await full(page, hoja), `${nombre}: abajo con el cuerpo scrolleado hace scroll, no reduce`);
    await page.locator(cuerpo).evaluate((e) => (e.scrollTop = 0));
  }
  const q = await centro(page, cuerpo);
  await dedo(cdp, [q.x, q.y - 60], [q.x, q.y + 180]);
  ok(!(await full(page, hoja)) && (await page.locator(hoja).count()) === 1, `${nombre}: abajo con el cuerpo arriba reduce`);
  const r = await centro(page, cuerpo);
  await dedo(cdp, [r.x, r.y - 20], [r.x, r.y + 200]);
  await page.waitForTimeout(400);
  ok((await page.locator(hoja).count()) === 0, `${nombre}: otro deslizar abajo la cierra`);
}

for (const ancho of [390, 360]) {
  console.log(`— ${ancho} px —`);
  {
    const s = await abrir(ancho, "/tienda/esencias-michel?demo#p/mayar");
    await s.page.waitForSelector("#r-mayar.on");
    await s.page.locator("#r-mayar .acts [data-like]").click();
    await s.page.locator("#bagDock button").click();
    await s.page.waitForSelector("#orBg .wa");
    await recorrido("Pedido", s, "#orBg .wa", "#orBg .wabody");
    ok(!s.errores.length, "Pedido: sin errores de consola");
    await s.ctx.close();
  }
  {
    const s = await abrir(ancho, "/tienda/esencias-michel?demo#p/mayar");
    await s.page.waitForSelector("#r-mayar.on");
    await s.page.locator("#r-mayar [data-comments]").click();
    await s.page.waitForSelector("#cmBg .sheet");
    await recorrido("Opiniones", s, "#cmBg .sheet", "#cmBg .sbody");
    await s.ctx.close();
  }
  {
    const s = await abrir(ancho, "/tienda/esencias-michel?demo#planes");
    await s.page.waitForSelector("#plBg .sheet");
    await recorrido("Planes", s, "#plBg .sheet", "#plBg .sbody");
    await s.ctx.close();
  }
  {
    const s = await abrir(ancho, "/tienda/lino-y-algodon?demo#p/pantalon-de-algodon");
    await s.page.waitForSelector("#r-pantalon-de-algodon.on");
    await s.page.locator("#r-pantalon-de-algodon .cap .pres-btn").click();
    await s.page.waitForSelector("#presBg .sheet");
    const xs = await centro(s.page, "#presBg .pres-body");
    const cuadricula = s.page.locator("#presBg .pres-scroll");
    ok((await cuadricula.count()) === 1, "Presentaciones: hay cuadrícula con scroll horizontal");
    if (await cuadricula.count()) {
      const c = await cuadricula.boundingBox();
      await dedo(s.cdp, [Math.round(c.x + c.width - 20), Math.round(c.y + c.height / 2)], [Math.round(c.x + 20), Math.round(c.y + c.height / 2) + 4]);
      ok(!(await full(s.page, "#presBg .sheet")) && (await s.page.locator("#presBg .sheet").evaluate((e) => !e.style.transform)), "Presentaciones: scroll horizontal no mueve ni expande la hoja");
    }
    await recorrido("Presentaciones", s, "#presBg .sheet", "#presBg .pres-body");
    ok(!s.errores.length, "Presentaciones: sin errores");
    await s.ctx.close();
  }
  {
    const s = await abrir(ancho, `/tienda/esencias-michel?demo#p/${agotado.slug}`);
    await s.page.getByRole("button", { name: "Avísame: " + agotado.nombre, exact: true }).click();
    await s.page.waitForSelector("#avisoBg .sheet");
    await s.page.locator("#telefonoAviso").focus();
    const q = await centro(s.page, "#avisoBg .sbody");
    await dedo(s.cdp, [q.x, q.y + 40], [q.x, q.y - 120]);
    ok(!(await full(s.page, "#avisoBg .sheet")) && (await s.page.evaluate(() => document.activeElement?.id === "telefonoAviso")), "Aviso: con el campo enfocado no se anima ni pierde el foco");
    await s.page.locator("#telefonoAviso").evaluate((e) => e.blur());
    await recorrido("Aviso", s, "#avisoBg .sheet", "#avisoBg .sbody");
    await s.ctx.close();
  }
}
await b.close();
if (fallos) {
  console.log(`\n${fallos} fallos`);
  process.exit(1);
}
console.log("\nTodo bien");
