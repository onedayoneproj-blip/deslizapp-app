// Mi marca para el retoque (docs/prompts/mi-marca.md) en la demo, sin Supabase: la hoja «Para el retoque», la regla «marca lista»,
// la compuerta del retoque (botón «Retocar» de fotos guardadas y el interruptor «Retocar esta foto»), la bienvenida y el admin.
// Tema claro, 390 px (y 360 donde se indica). Michel demo empieza SIN marca; Luna demo la trae lista.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-mi-marca.mjs
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
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LUNA = "a1000000-0000-4000-8000-000000000002";
const CLAVE = "deslizapp-demo-v5";
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

async function pagina(tienda, { ancho = 390, reducido = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: reducido ? "reduce" : "no-preference" });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  const page = await ctx.newPage();
  const errores = [];
  let peticiones = 0;
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("request", (r) => /supabase\.co/.test(r.url()) && peticiones++);
  await page.addInitScript((t) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
  }, tienda);
  return { ctx, page, errores, peticiones: () => peticiones };
}
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
const hoja = (page) => page.locator('[role="dialog"]').last();
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const esperar = (page, ms = 450) => page.waitForTimeout(ms);
// CAPTURAS=carpeta guarda las pantallas clave (390 px, tema claro) para revisarlas a ojo.
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) (await import("node:fs")).mkdirSync(CAPTURAS, { recursive: true });
const cap = async (page, nombre) => CAPTURAS && (await page.screenshot({ path: join(CAPTURAS, `${nombre}.png`) }));

async function archivos(page, n, desde = 0) {
  const colores = ["#c0392b", "#2c6fbb", "#2e8b57", "#8e44ad", "#d68910", "#117a65", "#7f8c8d"];
  const b64 = await page.evaluate((cs) => cs.map((color) => {
    const c = document.createElement("canvas");
    c.width = 500; c.height = 500;
    const g = c.getContext("2d");
    g.fillStyle = color; g.fillRect(0, 0, 500, 500);
    return c.toDataURL("image/png").split(",")[1];
  }), colores.slice(desde, desde + n));
  return b64.map((x, i) => ({ name: `ref${desde + i}.png`, mimeType: "image/png", buffer: Buffer.from(x, "base64") }));
}

async function menu(page) {
  await page.goto(`${URL}/catalogo`);
  await page.waitForSelector('header button[aria-haspopup="dialog"]');
  await esperar(page, 900);
  await page.tap('header button[aria-haspopup="dialog"]');
  await page.waitForSelector('[role="dialog"] >> text=Mi marca');
  await esperar(page, 500);
}
async function abrirMarca(page) {
  await menu(page);
  await page.tap('[role="dialog"] >> text=Mi marca');
  await page.waitForSelector("[data-seccion-retoque]");
  await esperar(page, 700);
}
/** Un producto nuevo con una foto sin retocar (los del seed ya traen la primera foto retocada). Devuelve su id. */
async function primerProducto(page) {
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Producto de prueba");
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("400");
  await page.locator("[data-entrada-medios]").setInputFiles(await archivos(page, 1));
  await page.getByRole("button", { name: /^(Portada|Foto) 1 de/ }).first().waitFor();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.waitForURL(`${URL}/catalogo`);
  return (await db(page)).productos.find((p) => p.nombre === "Producto de prueba").id;
}
async function abrirFoto(page, i) {
  await page.getByRole("button", { name: new RegExp(`^(Portada|Foto) ${i} de`) }).first().click();
  await page.getByRole("dialog", { name: /^(Portada|Foto)$/ }).waitFor();
  await esperar(page, 350);
}
const switchRetoque = (page) => page.getByRole("dialog", { name: /^(Portada|Foto)$/ }).getByRole("switch", { name: "Retocar esta foto", exact: true });
const dialogoFoto = (page) => page.getByRole("dialog", { name: /^(Portada|Foto)$/ });

async function caso(titulo, fn) {
  console.log(`\n• ${titulo}`);
  const c = await fn();
  if (c) await c.ctx.close();
}

await caso("1. Sin marca: el menú dice qué falta y «Retocar» de una foto guardada se bloquea con el camino a Mi marca", async () => {
  const c = await pagina(MICHEL);
  const { page } = c;
  await menu(page);
  const fila = page.locator('[role="dialog"] [data-estado-marca]').first();
  ok((await fila.getAttribute("data-estado-marca")) === "falta" && (await fila.innerText()) === "Faltan 3 palabras y 3 fotos de referencia", "la fila Mi marca dice «Faltan 3 palabras y 3 fotos de referencia»");
  await page.keyboard.press("Escape");
  await esperar(page);
  const id = await primerProducto(page);
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.waitForSelector("[data-entrada-medios]");
  await abrirFoto(page, 1);
  const d = dialogoFoto(page);
  if (process.env.VERBOSO) console.log(JSON.stringify(await d.innerText()));
  ok(await d.getByText("Antes de retocar, cuéntanos de tu marca.").isVisible(), "texto en la voz de la marca: «Antes de retocar, cuéntanos de tu marca.»");
  ok((await d.getByRole("button", { name: "Retocar", exact: true }).count()) === 0, "no hay botón «Retocar»");
  ok(await d.getByRole("button", { name: "Completar Mi marca", exact: true }).isVisible(), "hay «Completar Mi marca»");
  ok(await sinDesborde(page), "sin scroll horizontal a 390");
  await cap(page, "retocar-bloqueado-foto-guardada");
  // Camino: cierra la hoja de la foto y abre Mi marca (la ficha queda debajo: dos hojas, no tres).
  await d.getByRole("button", { name: "Completar Mi marca", exact: true }).click();
  await page.waitForSelector("[data-seccion-retoque]");
  await esperar(page, 700);
  ok((await dialogoFoto(page).count()) === 0, "la hoja de la foto se cerró antes de abrir Mi marca");
  ok(await hoja(page).getByText("Para el retoque", { exact: true }).first().isVisible(), "se abrió Mi marca en «Para el retoque»");
  return c;
});

await caso("2. Completar Mi marca: palabras, referencias en vivo, tope de 6, guardar y reabrir; Instagram sin @", async () => {
  const c = await pagina(MICHEL);
  const { page } = c;
  await abrirMarca(page);
  const banner = () => hoja(page).locator('[data-seccion-retoque] [role="status"]').first();
  ok((await banner().innerText()).includes("Para retocar tus fotos necesitamos conocer tu marca. Faltan 3 palabras y 3 fotos de referencia."), "banner vacío: faltan 3 palabras y 3 fotos de referencia");
  // La tarjeta sale cuando no hay logo ni referencias: con logo (la demo de Michel trae uno) no sale.
  const conLogo = (await hoja(page).getByRole("button", { name: "Quitar logo (usar iniciales)" }).count()) > 0;
  ok(!conLogo || (await hoja(page).locator("[data-tarjeta-sin-marca]").count()) === 0, "con logo y sin referencias la tarjeta «¿Todavía no tienes marca?» no sale");
  if (conLogo) await hoja(page).getByRole("button", { name: "Quitar logo (usar iniciales)" }).click();
  ok((await hoja(page).locator("[data-tarjeta-sin-marca]").count()) === 1 && (await hoja(page).getByText("¿Todavía no tienes marca?").isVisible()), "sin logo ni referencias sale «¿Todavía no tienes marca?»");
  ok((await hoja(page).getByRole("link", { name: "Hablemos" }).getAttribute("href")) === "https://instagram.com/deslizapp", "«Hablemos» lleva al Instagram de Deslizapp (@deslizapp)");
  ok(!(await hoja(page).innerText()).includes("RD$"), "sin precio (no se inventa; falta decidir cómo exponerlo)");
  for (const [i, p] of ["elegante", "cálida", "femenina"].entries()) await hoja(page).getByRole("textbox", { name: `Palabra ${i + 1}`, exact: true }).fill(p);
  ok((await banner().innerText()).includes("Faltan 3 fotos de referencia"), "con 3 palabras sigue faltando: «Faltan 3 fotos de referencia»");
  const entrada = hoja(page).locator('input[aria-label="Añadir fotos de referencia"]');
  await entrada.setInputFiles(await archivos(page, 2));
  await hoja(page).getByRole("img", { name: "Referencia 2" }).waitFor();
  ok((await banner().innerText()).includes("Falta 1 foto de referencia"), "con 2 fotos: «Falta 1 foto de referencia»");
  await entrada.setInputFiles(await archivos(page, 1, 2));
  await hoja(page).getByRole("img", { name: "Referencia 3" }).waitFor();
  ok((await banner().getAttribute("data-estado-marca")) === "lista" || (await hoja(page).locator('[data-estado-marca="lista"]').count()) === 1, "con 3 palabras y 3 fotos la marca queda lista (en vivo)");
  ok((await banner().innerText()).includes("Tu marca está lista para el taller."), "«Tu marca está lista para el taller.»");
  // Tope de 6: sube 4 más (solo caben 3) y el botón Añadir desaparece.
  await entrada.setInputFiles(await archivos(page, 4, 3));
  await hoja(page).getByRole("img", { name: "Referencia 6" }).waitFor();
  ok((await hoja(page).getByRole("list", { name: "Fotos de referencia" }).locator("img").count()) === 6, "nunca más de 6 referencias");
  ok((await hoja(page).getByRole("button", { name: "Añadir", exact: true }).count()) === 0, "con 6 ya no hay «Añadir»");
  await hoja(page).getByRole("button", { name: "Quitar referencia 6", exact: true }).click();
  ok((await hoja(page).getByRole("button", { name: "Añadir", exact: true }).count()) === 1, "al quitar una vuelve «Añadir»");
  await hoja(page).getByRole("textbox", { name: /Instagram/ }).fill("@esenciasmichel");
  await hoja(page).getByRole("textbox", { name: /Lo que no quiero/ }).fill("Nada de fondo blanco ni brillos exagerados");
  ok(await sinDesborde(page), "Mi marca sin scroll horizontal a 390");
  await hoja(page).locator("[data-seccion-retoque]").scrollIntoViewIfNeeded();
  await cap(page, "mi-marca-para-el-retoque");
  await hoja(page).getByRole("button", { name: "Guardar mi marca", exact: true }).click();
  await page.getByText("Tu marca está lista para el taller.").first().waitFor({ timeout: 4000 });
  const d = await db(page);
  const t = d.tiendas.find((x) => x.id === MICHEL);
  const m = d.marcasRetoque[MICHEL];
  ok(m.palabras.join() === "elegante,cálida,femenina" && m.referencias.length === 5 && m.evita?.startsWith("Nada de fondo"), "se guardaron 3 palabras, 5 referencias y «lo que no quiero»");
  ok(t.instagram === "esenciasmichel", "el Instagram se guarda sin @");
  await menu(page);
  const fila = page.locator('[role="dialog"] [data-estado-marca]').first();
  ok((await fila.getAttribute("data-estado-marca")) === "lista" && (await fila.innerText()) === "Lista para el taller", "la fila del menú dice «Lista para el taller»");
  await page.tap('[role="dialog"] >> text=Mi marca');
  await page.waitForSelector("[data-seccion-retoque]");
  await esperar(page, 600);
  ok((await hoja(page).getByRole("list", { name: "Fotos de referencia" }).locator("img").count()) === 5, "al reabrir están las 5 referencias");
  ok((await hoja(page).locator("[data-tarjeta-sin-marca]").count()) === 0, "con referencias ya no sale la tarjeta «¿Todavía no tienes marca?»");
  ok(c.peticiones() === 0 && c.errores.length === 0, "cero peticiones a Supabase y sin errores de página");
  return c;
});

await caso("3. Interruptor «Retocar esta foto» con la marca no lista: apagado, deshabilitado, con motivo y camino; con la marca lista funciona", async () => {
  const c = await pagina(MICHEL);
  const { page } = c;
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Con marca pendiente");
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("500");
  await page.locator("[data-entrada-medios]").setInputFiles(await archivos(page, 1));
  await page.getByRole("button", { name: /^(Portada|Foto) 1 de/ }).first().waitFor();
  await abrirFoto(page, 1);
  const sw = switchRetoque(page);
  ok((await sw.getAttribute("aria-disabled")) === "true" && (await sw.getAttribute("aria-checked")) === "false", "el interruptor sale apagado y deshabilitado");
  ok(await dialogoFoto(page).getByText("Antes de retocar, cuéntanos de tu marca.").isVisible(), "con el motivo «Antes de retocar, cuéntanos de tu marca.»");
  await cap(page, "interruptor-sin-marca");
  await sw.click({ force: true });
  ok((await sw.getAttribute("aria-checked")) === "false", "tocarlo no lo enciende");
  await dialogoFoto(page).getByRole("button", { name: "Completar Mi marca", exact: true }).click();
  await page.waitForSelector("[data-seccion-retoque]");
  await esperar(page, 700);
  for (const [i, p] of ["a", "b", "c"].entries()) await hoja(page).getByRole("textbox", { name: `Palabra ${i + 1}`, exact: true }).fill(`palabra${p}`);
  await hoja(page).locator('input[aria-label="Añadir fotos de referencia"]').setInputFiles(await archivos(page, 3));
  await hoja(page).getByRole("img", { name: "Referencia 3" }).waitFor();
  await hoja(page).getByRole("button", { name: "Guardar mi marca", exact: true }).click();
  await page.getByText("Tu marca está lista para el taller.").first().waitFor({ timeout: 4000 });
  await esperar(page, 700);
  await abrirFoto(page, 1);
  ok((await switchRetoque(page).getAttribute("aria-disabled")) === "false", "con la marca lista el interruptor se puede encender");
  await switchRetoque(page).click();
  ok((await switchRetoque(page).getAttribute("aria-checked")) === "true", "y se enciende");
  await cap(page, "interruptor-con-marca-lista");
  ok(c.errores.length === 0, "sin errores de página");
  return c;
});

await caso("4. Bienvenida (Luna, marca lista): primera vez antes de reservar; cancelar no manda nada; confirmar reserva y la segunda foto no la repite", async () => {
  const c = await pagina(LUNA);
  const { page } = c;
  const id = await primerProducto(page);
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.waitForSelector("[data-entrada-medios]");
  await esperar(page, 500);
  await abrirFoto(page, 1);
  const d = dialogoFoto(page);
  ok(await d.getByText("Cómo funciona", { exact: true }).isVisible(), "con la marca lista, la hoja ofrece «Retocar» y «Cómo funciona»");
  await d.getByRole("button", { name: "Retocar", exact: true }).click();
  const bv = page.getByRole("dialog", { name: "Retoque con tu marca" });
  await bv.waitFor();
  await esperar(page, 400);
  ok((await dialogoFoto(page).count()) === 0, "la hoja de la foto se cierra: no hay tres hojas apiladas");
  ok(await bv.getByText("Tu foto, con tu marca.").isVisible() && (await bv.innerText()).includes("5 créditos") && (await bv.getByText("Beta", { exact: true }).count()) >= 1, "la bienvenida dice «Tu foto, con tu marca.», «Beta» y «5 créditos»");
  ok((await bv.getByText("Tu producto sigue siendo tu producto.", { exact: false }).isVisible()) && (await bv.innerText()).includes("Si no sale como debe, te devolvemos los créditos."), "lleva la franja de honestidad y la nota Beta");
  ok(!(await bv.innerText()).includes("!"), "sin signos de exclamación");
  ok(await sinDesborde(page), "bienvenida sin scroll horizontal a 390");
  await esperar(page, 2800);
  await cap(page, "bienvenida-resultado");
  // Cancelar durante la animación (a los 400 ms): funciona y no manda nada.
  await bv.getByRole("button", { name: "Cancelar", exact: true }).click();
  await esperar(page, 500);
  let dd = await db(page).catch(() => ({}));
  ok((dd.trabajosRetoque ?? []).length === 0, "cancelar no reserva ni manda nada");
  // Cancelar no cuenta como vista: sale otra vez.
  await abrirFoto(page, 1);
  await dialogoFoto(page).getByRole("button", { name: "Retocar", exact: true }).click();
  await bv.waitFor();
  await esperar(page, 3200);
  await bv.getByRole("button", { name: "Retocar foto", exact: true }).click();
  await page.getByText(/en el taller|Tu foto está en el taller/i).first().waitFor({ timeout: 4000 });
  dd = await db(page);
  ok(dd.trabajosRetoque.filter((t) => t.tiendaId === LUNA && t.estado === "pendiente").length === 1, "confirmar reserva 1 foto en el taller");
  ok(dd.tiendas.find((t) => t.id === LUNA).creditosRetoque === 100, "los créditos no se cobran (reserva)");
  // La segunda vez (otra foto o «Cómo funciona») ya no sale sola.
  const vista = await page.evaluate(() => JSON.parse(localStorage.getItem("deslizapp-retoque-bienvenida-v1") ?? "[]"));
  ok(vista.includes(LUNA), "se recuerda por tienda en el almacenamiento local");
  await abrirFoto(page, 1).catch(() => {});
  return c;
});

await caso("5. Bienvenida al guardar un producto con una foto marcada: antes de reservar; cancelar no guarda; confirmar guarda y reserva", async () => {
  const c = await pagina(LUNA);
  const { page } = c;
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Producto marcado");
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("600");
  await page.locator("[data-entrada-medios]").setInputFiles(await archivos(page, 1));
  await page.getByRole("button", { name: /^(Portada|Foto) 1 de/ }).first().waitFor();
  await abrirFoto(page, 1);
  await switchRetoque(page).click();
  await dialogoFoto(page).getByRole("button", { name: "Cerrar" }).first().click().catch(() => page.keyboard.press("Escape"));
  await esperar(page, 400);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  const bv = page.getByRole("dialog", { name: "Retoque con tu marca" });
  await bv.waitFor();
  let dd = await db(page).catch(() => ({}));
  ok(!(dd.productos ?? []).some((p) => p.nombre === "Producto marcado"), "la bienvenida sale ANTES de guardar");
  await bv.getByRole("button", { name: "Cancelar", exact: true }).click();
  await esperar(page, 600);
  dd = await db(page).catch(() => ({}));
  ok(!(dd.productos ?? []).some((p) => p.nombre === "Producto marcado") && (dd.trabajosRetoque ?? []).length === 0, "cancelar no guarda ni reserva nada");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await bv.waitFor();
  await bv.getByRole("button", { name: "Retocar foto", exact: true }).click();
  await page.waitForURL(`${URL}/catalogo`);
  dd = await db(page);
  const p = dd.productos.find((x) => x.nombre === "Producto marcado");
  ok(!!p && dd.trabajosRetoque.filter((t) => t.productoId === p.id && t.estado === "pendiente").length === 1, "confirmar guarda el producto y reserva la foto");
  ok(dd.tiendas.find((t) => t.id === LUNA).creditosRetoque === 100, "sin cobrar");
  // Un producto más con foto marcada: la bienvenida ya no sale.
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Segundo marcado");
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("700");
  await page.locator("[data-entrada-medios]").setInputFiles(await archivos(page, 1, 1));
  await page.getByRole("button", { name: /^(Portada|Foto) 1 de/ }).first().waitFor();
  await abrirFoto(page, 1);
  await switchRetoque(page).click();
  await dialogoFoto(page).getByRole("button", { name: "Cerrar" }).first().click().catch(() => page.keyboard.press("Escape"));
  await esperar(page, 400);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.waitForURL(`${URL}/catalogo`);
  dd = await db(page);
  ok(dd.trabajosRetoque.filter((t) => t.estado === "pendiente").length === 2, "la segunda vez guarda y reserva sin bienvenida");
  return c;
});

await caso("6. Movimiento reducido: la bienvenida muestra el resultado directo (sin animación)", async () => {
  const c = await pagina(LUNA, { reducido: true });
  const { page } = c;
  const id = await primerProducto(page);
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.waitForSelector("[data-entrada-medios]");
  await esperar(page, 500);
  await abrirFoto(page, 1);
  await dialogoFoto(page).getByRole("button", { name: "Retocar", exact: true }).click();
  const bv = page.getByRole("dialog", { name: "Retoque con tu marca" });
  await bv.waitFor();
  await esperar(page, 600);
  const e = await page.evaluate(() => {
    const css = (sel) => {
      const el = document.querySelector(sel);
      const s = el ? getComputedStyle(el) : null;
      return s ? { animacion: s.animationName, opacidad: s.opacity, transformacion: s.transform } : null;
    };
    return { barrido: css(".bv-barrido"), mano: css(".bv-mano"), ref: css(".bv-ref1") };
  });
  ok(e.barrido.animacion === "none" && e.barrido.transformacion === "none", "el barrido no se anima: el «después» ya está a la vista");
  ok(e.mano.animacion === "none" && e.mano.opacidad === "1", "«a tu estilo» ya está a la vista");
  ok(e.ref.animacion === "none" && e.ref.opacidad === "0", "las miniaturas de referencia no corren");
  await bv.getByRole("button", { name: "Cancelar", exact: true }).click();
  return c;
});

await caso("7. Con movimiento normal la escena corre una vez y solo anima transform y opacity", async () => {
  const c = await pagina(LUNA);
  const { page } = c;
  const id = await primerProducto(page);
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.waitForSelector("[data-entrada-medios]");
  await esperar(page, 500);
  await abrirFoto(page, 1);
  await dialogoFoto(page).getByRole("button", { name: "Retocar", exact: true }).click();
  const bv = page.getByRole("dialog", { name: "Retoque con tu marca" });
  await bv.waitFor();
  const props = await page.evaluate(() => {
    const out = new Set();
    for (const a of document.getAnimations()) {
      const nombre = a.animationName ?? "";
      if (!nombre.startsWith("bv-")) continue;
      for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!["offset", "easing", "composite", "computedOffset"].includes(p)) out.add(p);
    }
    return [...out].sort();
  });
  ok(props.length > 0 && props.every((p) => ["opacity", "transform"].includes(p)), `solo se animan transform y opacity (${props.join(", ")})`);
  await bv.getByRole("button", { name: "Cancelar", exact: true }).click();
  return c;
});

await caso("8. Admin demo (Trabajo › Fotos): «Su marca», sin marca lo dice, y «Copiar instrucciones»", async () => {
  const c = await pagina(LUNA);
  const { page } = c;
  const id = await primerProducto(page);
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.waitForSelector("[data-entrada-medios]");
  await esperar(page, 500);
  await abrirFoto(page, 1);
  await dialogoFoto(page).getByRole("button", { name: "Retocar", exact: true }).click();
  await page.getByRole("dialog", { name: "Retoque con tu marca" }).waitFor();
  await esperar(page, 3000);
  await page.getByRole("button", { name: "Retocar foto", exact: true }).click();
  await esperar(page, 600);
  await page.goto(`${URL}/admin-demo/trabajo?ver=fotos&tienda=${LUNA}`);
  const region = page.getByRole("region", { name: "Fotos de Luna Bisutería" });
  await region.waitFor();
  const marca = region.locator('[data-su-marca="lista"]');
  await marca.waitFor();
  ok((await marca.getByRole("list", { name: "Fotos de referencia" }).locator("button").count()) === 3, "«Su marca» muestra sus 3 referencias");
  ok((await marca.getByRole("list", { name: "Su marca en 3 palabras" }).innerText()).replace(/\s+/g, " ").includes("delicada luminosa artesanal"), "y las 3 palabras");
  ok((await marca.innerText()).includes("No quiere: Nada de fondos oscuros"), "y «lo que no quiere»");
  await marca.getByRole("button", { name: "Ver referencia 1 grande" }).click();
  await page.getByRole("dialog", { name: "Referencia" }).waitFor();
  ok(await page.getByRole("img", { name: "Foto de referencia, grande" }).isVisible(), "tocar una referencia la abre grande");
  await page.keyboard.press("Escape");
  await esperar(page, 500);
  await marca.getByRole("button", { name: "Copiar instrucciones", exact: true }).click();
  await marca.getByText("Instrucciones copiadas.").waitFor();
  const copiado = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
  ok(copiado === "Retoca esta foto para Luna Bisutería. Marca: delicada, luminosa, artesanal. Estilo: como las fotos de referencia. Evita: Nada de fondos oscuros. No cambies el producto." || copiado === null, `el texto copiado sigue el formato (${copiado === null ? "portapapeles no legible aquí" : "verificado"})`);
  ok(await sinDesborde(page), "Trabajo › Fotos sin scroll horizontal a 390");
  await marca.scrollIntoViewIfNeeded();
  await cap(page, "admin-su-marca");
  // Una tienda que pidió retoques antes de tener marca: se dice y se deja trabajar igual.
  await page.evaluate(([k, tienda]) => {
    const d = JSON.parse(localStorage.getItem(k));
    d.marcasRetoque[tienda] = { palabras: [], evita: null, referencias: [] };
    localStorage.setItem(k, JSON.stringify(d));
  }, [CLAVE, LUNA]);
  await page.goto(`${URL}/admin-demo/trabajo?ver=fotos&tienda=${LUNA}`);
  const sin = page.getByRole("region", { name: "Fotos de Luna Bisutería" }).locator('[data-su-marca="falta"]');
  await sin.waitFor();
  ok((await sin.innerText()).includes("Esta tienda todavía no completó su marca."), "sin marca lista: «Esta tienda todavía no completó su marca.»");
  ok(await page.getByRole("button", { name: "Entregar" }).isVisible(), "y se puede trabajar igual (Entregar sigue ahí)");
  ok(c.peticiones() === 0, "cero peticiones a Supabase");
  return c;
});

await caso("9. 360 px: la hoja Mi marca y la ficha sin desborde", async () => {
  const c = await pagina(MICHEL, { ancho: 360 });
  const { page } = c;
  await abrirMarca(page);
  ok(await sinDesborde(page), "Mi marca sin scroll horizontal a 360");
  return c;
});

await caso("10. «¿Salir sin guardar?»: sin cambios cierra directo; con cambios pregunta", async () => {
  const c = await pagina(LUNA);
  const { page } = c;
  await abrirMarca(page);
  await page.keyboard.press("Escape");
  await esperar(page, 700);
  ok((await page.locator("[data-seccion-retoque]").count()) === 0, "sin cambios, cerrar no pregunta");
  await abrirMarca(page);
  await hoja(page).getByRole("textbox", { name: "Palabra 1", exact: true }).fill("distinta");
  await page.keyboard.press("Escape");
  await esperar(page, 500);
  ok(await page.getByText("¿Salir sin guardar?").first().isVisible(), "con cambios, cerrar pregunta «¿Salir sin guardar?»");
  return c;
});

console.log("\nTodo pasa");
await navegador.close();
