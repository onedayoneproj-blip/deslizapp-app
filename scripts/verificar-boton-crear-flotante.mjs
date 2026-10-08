import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const playwright = require("playwright");
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const MICHEL = "a1000000-0000-4000-8000-000000000001", LINO = "a1000000-0000-4000-8000-000000000003";
const CLAVE = "deslizapp-demo-v5";
const OUT = process.argv[2] ?? "."; // URL=… CHROMIUM_PATH=… node scripts/verificar-boton-crear-flotante.mjs carpeta-de-capturas
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const filas = [];
const TABS = [
  { n: "Pedidos", ruta: "/pedidos", nuevo: "/pedidos/nuevo", vaciar: ["pedidos"] , flot: "Pedido"},
  { n: "Catálogo", ruta: "/catalogo", nuevo: "/catalogo/nuevo", vaciar: ["productos"], flot: "Producto" },
  { n: "Clientes", ruta: "/clientes", nuevo: "/clientes/nuevo", vaciar: ["clientes"], flot: "Cliente" },
  { n: "Promos", ruta: "/promos", nuevo: "/promos/nueva", vaciar: ["promos"], flot: "Promo" },
];
async function ctx(ancho, tienda, vaciar) {
  const c = await nav.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await c.newPage();
  await page.addInitScript(({ tienda }) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", tienda);
    for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1");
  }, { tienda });
  if (vaciar) {
    await page.goto(URL + "/pedidos"); await page.waitForTimeout(1500);
    await page.evaluate(({ k, v }) => { const d = JSON.parse(localStorage.getItem(k) ?? "{}"); for (const x of v) d[x] = Array.isArray(d[x]) ? [] : d[x]; localStorage.setItem(k, JSON.stringify(d)); }, { k: CLAVE, v: vaciar });
  }
  return page;
}
async function revisar(page, tab, estado, ancho, foto) {
  await page.waitForTimeout(900);
  const r = await page.evaluate(({ nuevo, flot }) => {
    const vw = innerWidth, vh = innerHeight;
    const crear = [...document.querySelectorAll("a,button")].filter((e) => {
      const t = (e.innerText || "").trim(); const h = e.getAttribute("href") || "";
      return h.endsWith("/nuevo") || h.endsWith("/nueva") || /^(\+\s*)?(Agregar|Crear|Publicar|Nuevo|Nueva)\b/i.test(t) && !/Reintentar/.test(t);
    }).map((e) => ({ t: (e.innerText || "").trim(), h: e.getAttribute("href"), r: e.getBoundingClientRect().toJSON() }));
    return { vw, vh, crear };
  }, tab);
  const unico = r.crear.length === 1 && r.crear[0].h === tab.nuevo && r.crear[0].t.includes(tab.flot);
  const b = r.crear[0]?.r;
  const derAbajo = !!b && b.right > r.vw - 40 && b.bottom > r.vh * 0.6 && b.bottom < r.vh && b.left > r.vw / 2;
  filas.push({ tab: tab.n, estado, ancho, unico, derAbajo, crear: r.crear.map((c) => c.t) });
  console.log(tab.n, estado, ancho, unico ? "✅ solo flotante" : "❌ " + JSON.stringify(r.crear), derAbajo ? "✅ abajo-der" : "❌ posición " + JSON.stringify(b));
  if (foto) await page.screenshot({ path: `${OUT}/${foto}-${ancho}.png` });
}
for (const ancho of [390, 360]) for (const tab of TABS) {
  // vacía: Lino con la lista vaciada
  let page = await ctx(ancho, LINO, tab.vaciar); await page.goto(URL + tab.ruta); await revisar(page, tab, "vacía", ancho, `${tab.n}-vacia`);
  if (tab.n === "Promos") { for (const t of ["Programadas", "Terminadas"]) { await page.getByRole("tab", { name: new RegExp(t, "i") }).tap().catch(() => page.getByText(new RegExp("^" + t)).first().tap()); await revisar(page, tab, "vacía · " + t, ancho, `Promos-vacia-${t}`); } }
  if (tab.n === "Pedidos") { for (const t of ["Por despachar", "Despachados", "Cancelados"]) { await page.getByText(new RegExp("^" + t)).first().tap().catch(() => {}); await revisar(page, tab, "vacía · " + t, ancho, null); } }
  await page.context().close();
  // con datos: Michel (y Lino para clientes/promos si Michel no tiene)
  page = await ctx(ancho, MICHEL, null); await page.goto(URL + tab.ruta); await revisar(page, tab, "con datos", ancho, `${tab.n}-datos`);
  if (tab.n === "Clientes" || tab.n === "Catálogo") {
    const q = page.locator('input[type="search"], input[placeholder]').first();
    if (await q.count()) { await q.fill("zzzqqq"); await page.waitForTimeout(700); await revisar(page, tab, "filtro sin resultados", ancho, `${tab.n}-filtro`); }
  }
  await page.context().close();
}
await nav.close();
const mal = filas.filter((f) => !f.unico || !f.derAbajo);
console.log(mal.length ? "FALLAN " + mal.length : "TODO OK " + filas.length);
import fs from "node:fs"; fs.writeFileSync(OUT + "/filas.json", JSON.stringify(filas, null, 1));
