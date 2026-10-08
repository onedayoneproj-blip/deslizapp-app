// Publicar mi catálogo en la demo (docs/prompts/publicar-catalogo.md): sin lo mínimo, con lo mínimo, publicar, copiar, dejar de mostrar,
// y el botón apagado para un colaborador. Uso: URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-publicar-catalogo.mjs [carpeta-de-capturas]
import "../tests/cargar-ts.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const playwright = require("playwright");
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const LINO = "a1000000-0000-4000-8000-000000000003";
const CLAVE = "deslizapp-demo-v5";
const OUT = process.argv[2] ?? ".";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
let fallos = 0;
const ok = (c, m) => { console.log(c ? "✅" : "❌", m); if (!c) fallos++; };

async function abrir(ancho, { productos = null, nivel = null } = {}) {
  const c = await nav.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await c.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9"); localStorage.setItem("deslizapp-modo-v1", "demo"); localStorage.setItem("deslizapp-sesion-v1", "a1000000-0000-4000-8000-000000000003");
    for (const s of ["lino-y-algodon", "esencias-michel"]) localStorage.setItem("dz-coach-" + s, "1");
  });
  // La demo solo guarda en localStorage tras el primer cambio: se arma la base del seed aquí y se deja guardada.
  const d = construirDesdeSeed();
  if (productos !== null) {
    const suyos = d.productos.filter((p) => p.tiendaId === LINO && p.activo && p.medios.some((m) => m.tipo === "foto"));
    d.productos = [...d.productos.filter((p) => p.tiendaId !== LINO), ...suyos.slice(0, productos)];
  }
  if (nivel) d.nivelDemo = nivel;
  await page.addInitScript(({ k, d }) => localStorage.setItem(k, JSON.stringify(d)), { k: CLAVE, d });
  await page.goto(URL + "/catalogo"); await page.waitForTimeout(1200);
  return page;
}
const tarjeta = (page) => page.locator('section[aria-label="Catálogo en línea"]');

for (const ancho of [390, 360]) {
  console.log(`\n── ${ancho} px ──`);
  // 1. Sin lo mínimo
  let page = await abrir(ancho, { productos: 0 });
  ok(await tarjeta(page).getByText("Te faltan 3 productos con foto para publicar tu catálogo").count() === 1, "sin productos: dice qué falta");
  ok(await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).count() === 0, "sin lo mínimo no hay «Publicar»");
  await page.screenshot({ path: `${OUT}/faltan-${ancho}.png` });
  await page.context().close();
  page = await abrir(ancho, { productos: 2 });
  ok(await tarjeta(page).getByText("Te falta 1 producto con foto para publicar tu catálogo").count() === 1, "con 2 productos: falta 1 (singular)");
  await tarjeta(page).getByRole("button", { name: "Crear producto" }).tap(); await page.waitForTimeout(1200);
  ok(page.url().endsWith("/catalogo/nuevo"), "«Crear producto» lleva a crear un producto");
  await page.context().close();

  // 2. Con lo mínimo: publicar, copiar, compartir, dejar de mostrar
  page = await abrir(ancho, { productos: 3 });
  const publicar = tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" });
  ok(await publicar.count() === 1, "con 3 productos: «Publicar mi catálogo»");
  await page.screenshot({ path: `${OUT}/listo-${ancho}.png` });
  await publicar.tap(); await page.waitForTimeout(700);
  const hoja = page.getByRole("dialog");
  const t = await hoja.innerText();
  ok(t.includes("Tus clientes lo verán en este enlace") && t.includes("deslizapp-app.vercel.app/tienda/lino-y-algodon"), "la hoja dice el enlace que tendrá");
  ok(["Armas y municiones", "Drogas ilegales", "Contenido sexual explícito", "Productos falsificados", "Documentos falsos", "Medicamentos con receta", "Animales vivos"].every((x) => t.includes(x)), "la hoja lista lo que no se puede vender");
  ok(t.includes("Al publicar aceptas los Términos"), "la hoja dice que se aceptan los Términos");
  await page.screenshot({ path: `${OUT}/hoja-publicar-${ancho}.png` });
  await hoja.getByRole("button", { name: "Ahora no" }).tap(); await page.waitForTimeout(600);
  ok(await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).count() === 1, "«Ahora no» no publica nada");
  await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).tap(); await page.waitForTimeout(600);
  await page.getByRole("dialog").getByRole("button", { name: "Publicar", exact: true }).tap(); await page.waitForTimeout(900);
  ok(await tarjeta(page).getByText("¡Ya estás en línea!").count() === 1, "publicado: sale la celebración que ya existía");
  await page.screenshot({ path: `${OUT}/recien-${ancho}.png` });
  await page.waitForTimeout(6500);
  ok(await tarjeta(page).getByText("Tu catálogo está en línea").count() === 1, "después: «Tu catálogo está en línea»");
  ok((await tarjeta(page).innerText()).includes("deslizapp-app.vercel.app/tienda/lino-y-algodon"), "muestra el enlace");
  await page.screenshot({ path: `${OUT}/en-linea-${ancho}.png` });
  await tarjeta(page).getByRole("button", { name: "Copiar enlace" }).tap(); await page.waitForTimeout(600);
  const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  ok(copiado === "https://deslizapp-app.vercel.app/tienda/lino-y-algodon", `copia el enlace (${copiado})`);
  ok(await tarjeta(page).getByRole("button", { name: "Compartir" }).count() === 1, "hay «Compartir»");
  await tarjeta(page).getByRole("button", { name: "Dejar de mostrarlo" }).tap(); await page.waitForTimeout(700);
  ok((await page.getByRole("dialog").innerText()).includes("el enlace deja de funcionar"), "la confirmación explica qué pasa");
  await page.screenshot({ path: `${OUT}/hoja-dejar-${ancho}.png` });
  await page.getByRole("dialog").getByRole("button", { name: "Mejor no" }).tap(); await page.waitForTimeout(600);
  ok(await tarjeta(page).getByText("Tu catálogo está en línea").count() === 1, "«Mejor no» lo deja en línea");
  await tarjeta(page).getByRole("button", { name: "Dejar de mostrarlo" }).tap(); await page.waitForTimeout(600);
  await page.getByRole("dialog").getByRole("button", { name: "Dejar de mostrarlo" }).tap(); await page.waitForTimeout(900);
  ok(await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).count() === 1, "dejar de mostrarlo: vuelve a «Publicar mi catálogo»");
  const guardado = await page.evaluate(({ k }) => { const t = JSON.parse(localStorage.getItem(k)).tiendas.find((x) => x.slug === "lino-y-algodon"); return { e: t.catalogoEstado, u: t.urlCatalogo, p: t.catalogoPublicadoEn }; }, { k: CLAVE });
  ok(guardado.e === "sin" && guardado.u && guardado.p, "conserva el enlace y el primer momento publicado");
  await page.context().close();

  // 3. Un colaborador no publica
  for (const nivel of ["ayudante", "editor", "administrador"]) {
    page = await abrir(ancho, { productos: 3, nivel });
    const b = tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" });
    ok(await b.getAttribute("aria-disabled") === "true", `${nivel}: «Publicar» se ve apagado`);
    await b.tap({ force: true }); await page.waitForTimeout(600);
    ok(await page.getByText("Esto lo hace quien administra la tienda.").count() >= 1, `${nivel}: explica por qué`);
    ok(await page.getByRole("dialog").count() === 0, `${nivel}: no abre la hoja`);
    if (nivel === "administrador") await page.screenshot({ path: `${OUT}/colaborador-${ancho}.png` });
    await page.context().close();
  }
}
await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
