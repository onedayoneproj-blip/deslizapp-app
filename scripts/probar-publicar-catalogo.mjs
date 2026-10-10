// Publicar mi catálogo en la demo (docs/prompts/publicar-catalogo.md, docs/17): sin mínimo (vacío, 1 y 4 con la confirmación
// suave), «Ver cómo queda», con 5 directo, publicar,
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
    // La demo trae menos productos con foto que el mínimo (5): se repiten con otro id y otro slug.
    const base = d.productos.filter((p) => p.tiendaId === LINO && p.activo && p.medios.some((m) => m.tipo === "foto"));
    const suyos = Array.from({ length: productos }, (_, i) => {
      const p = base[i % base.length];
      return i < base.length ? p : { ...p, id: `${p.id.slice(0, -4)}${String(9000 + i)}`, slug: `${p.slug}-${i}`, nombre: `${p.nombre} ${i}` };
    });
    d.productos = [...d.productos.filter((p) => p.tiendaId !== LINO), ...suyos];
  }
  if (nivel) d.nivelDemo = nivel;
  await page.addInitScript(({ k, d }) => localStorage.setItem(k, JSON.stringify(d)), { k: CLAVE, d });
  await page.goto(URL + "/catalogo"); await page.waitForTimeout(1200);
  return page;
}
const tarjeta = (page) => page.locator('section[aria-label="Catálogo en línea"]');

for (const ancho of [390, 360]) {
  console.log(`\n── ${ancho} px ──`);
  // 1. Sin mínimo (decisión de Lewis, 9 oct): vacío también se publica, con una confirmación suave.
  let page = await abrir(ancho, { productos: 0 });
  ok(await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).count() === 1, "sin productos: «Publicar mi catálogo» desde el día uno");
  ok(await tarjeta(page).getByText("Con 5 productos con foto se luce más", { exact: false }).count() === 1, "sugiere 5, sin bloquear");
  ok(await tarjeta(page).getByRole("button", { name: "Ver cómo queda" }).count() === 1, "«Ver cómo queda» siempre");
  await page.screenshot({ path: `${OUT}/vacio-${ancho}.png` });
  await tarjeta(page).getByRole("button", { name: "Ver cómo queda" }).tap(); await page.waitForTimeout(2500);
  const marco = page.frameLocator('[data-como-se-ve] iframe');
  ok(await marco.locator("[data-catalogo-pronto]").innerText() === "Pronto, aquí van los productos de Lino & Algodón.", "«Ver cómo queda» vacío: «Pronto, aquí van…»");
  await page.screenshot({ path: `${OUT}/ver-como-queda-vacio-${ancho}.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(700);
  await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).tap(); await page.waitForTimeout(700);
  let dlg = page.getByRole("dialog");
  ok(await dlg.getByRole("heading", { name: "Tu catálogo está vacío" }).count() === 1, "vacío: «Tu catálogo está vacío»");
  ok((await dlg.innerText()).includes("Así lo verán tus clientes. Puedes publicarlo y seguir agregando."), "texto suave");
  ok(await dlg.getByRole("button", { name: "Publicar igual" }).count() === 1 && await dlg.getByRole("button", { name: "Agregar más" }).count() === 1, "«Publicar igual» y «Agregar más»");
  await page.screenshot({ path: `${OUT}/confirmar-vacio-${ancho}.png` });
  await dlg.getByRole("button", { name: "Publicar igual" }).tap(); await page.waitForTimeout(900);
  ok(await tarjeta(page).getByText("¡Ya estás en línea!").count() === 1, "«Publicar igual» publica el catálogo vacío");
  await page.context().close();

  page = await abrir(ancho, { productos: 1 });
  await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).tap(); await page.waitForTimeout(700);
  dlg = page.getByRole("dialog");
  ok(await dlg.getByRole("heading", { name: "Tu catálogo tiene 1 producto" }).count() === 1, "con 1: singular");
  await page.context().close();
  page = await abrir(ancho, { productos: 4 });
  await tarjeta(page).getByRole("button", { name: "Ver cómo queda" }).tap(); await page.waitForTimeout(2500);
  ok(await page.frameLocator('[data-como-se-ve] iframe').locator("#reels [data-id]").count() === 4, "«Ver cómo queda» con 4: los 4 productos");
  await page.screenshot({ path: `${OUT}/ver-como-queda-4-${ancho}.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(700);
  await tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" }).tap(); await page.waitForTimeout(700);
  dlg = page.getByRole("dialog");
  ok(await dlg.getByRole("heading", { name: "Tu catálogo tiene 4 productos" }).count() === 1, "con 4: plural");
  await dlg.getByRole("button", { name: "Agregar más" }).tap(); await page.waitForTimeout(1200);
  ok(page.url().endsWith("/catalogo/nuevo"), "«Agregar más» lleva a crear un producto");
  await page.context().close();

  // 2. Con lo mínimo: publicar, compartir
  page = await abrir(ancho, { productos: 5 });
  const publicar = tarjeta(page).getByRole("button", { name: "Publicar mi catálogo" });
  ok(await publicar.count() === 1, "con 5 productos: «Publicar mi catálogo»");
  ok(await tarjeta(page).getByText("Ya se luce", { exact: false }).count() === 1, "con 5: «Ya se luce»");
  await page.screenshot({ path: `${OUT}/listo-${ancho}.png` });
  await publicar.tap(); await page.waitForTimeout(700);
  const hoja = page.getByRole("dialog");
  const t = await hoja.innerText();
  ok(await hoja.getByRole("heading", { name: "¿Publicamos tu catálogo?" }).count() === 1, "con 5: la hoja de siempre, sin la confirmación suave");
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
  ok(await tarjeta(page).getByText("En línea").count() === 1, "después: «En línea»");
  ok((await tarjeta(page).innerText()).includes("deslizapp-app.vercel.app/tienda/lino-y-algodon"), "muestra el enlace");
  await page.screenshot({ path: `${OUT}/en-linea-${ancho}.png` });
  ok(await tarjeta(page).getByRole("button", { name: "Compartir" }).count() === 1, "hay «Compartir»");
  await page.context().close();

  // 3. Un colaborador no publica
  for (const nivel of ["ayudante", "editor", "administrador"]) {
    page = await abrir(ancho, { productos: 5, nivel });
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
