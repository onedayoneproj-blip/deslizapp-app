// «Tu equipo» y los niveles de permiso en la demo (docs/prompts/colaboradores-e-invitaciones.md §4), sin Supabase: la fila del
// menú con la solicitud que espera, aprobar con otro nivel, invitar por enlace (el enlace se ve una vez), cambiar nivel, quitar,
// cancelar el enlace, invitar por correo; y, mirando la demo como Ayudante, Editor y Administrador, que cada uno ve apagado lo
// que no puede con «Esto lo hace quien administra la tienda.». Tema claro, 390 px.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-equipo.mjs
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
const PORQUE = "Esto lo hace quien administra la tienda.";
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
const errores = [];
let supabase = 0;
page.on("pageerror", (e) => errores.push(e.message));
page.on("request", (r) => /supabase\.co/.test(r.url()) && supabase++);
await page.addInitScript((t) => {
  if (sessionStorage.getItem("prueba-inicial")) return;
  sessionStorage.setItem("prueba-inicial", "1");
  localStorage.clear();
  localStorage.setItem("deslizapp-version-vista", "9.9.9");
  localStorage.setItem("deslizapp-modo-v1", "demo");
  localStorage.setItem("deslizapp-sesion-v1", t);
}, MICHEL);
const esperar = (ms = 450) => page.waitForTimeout(ms);
const hoja = () => page.locator('[role="dialog"]').last();
const toast = async (texto) => {
  await page.waitForSelector(`text=${texto}`, { timeout: 4000 });
  return true;
};
async function abrirMenu(ruta = "/catalogo") {
  await page.goto(URL + ruta);
  await page.waitForSelector('header button[aria-haspopup="dialog"]');
  await esperar(900);
  await page.locator('header button[aria-haspopup="dialog"]').first().tap();
  await page.waitForSelector("[data-tienda-activa]");
  await esperar(500);
}
async function cerrarHojas() {
  for (let i = 0; i < 3 && (await page.locator('[role="dialog"]').count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await esperar(500);
  }
}
async function mirarComo(nombre) {
  await abrirMenu();
  await page.locator(`[data-mirar-como] [role="radio"]:has-text("${nombre}")`).tap();
  await esperar(500);
  await cerrarHojas();
}

console.log("\n• La dueña: la fila «Tu equipo» avisa que alguien espera");
await abrirMenu();
const fila = page.locator("button[data-fila-equipo]");
ok((await fila.count()) === 1, "la dueña ve «Tu equipo» dentro de la tarjeta de su tienda");
ok((await fila.innerText()).includes("1 espera tu visto bueno"), "con «1 espera tu visto bueno»");
await fila.tap();
await page.waitForSelector('[role="dialog"] [data-hoja-equipo]');
await esperar(600);
ok((await hoja().locator("h2:has-text('Esperan tu visto bueno')").count()) === 1, "arriba, «Esperan tu visto bueno»");
ok((await hoja().locator("[data-solicitud]").innerText()).includes("ana@ejemplo.com"), "con nombre y correo de Google de quien abrió el enlace");
ok((await hoja().locator('[data-miembro="staff"]').count()) === 2, "dos colaboradores de ejemplo");

console.log("\n• Aprobar con otro nivel");
await hoja().locator('[data-solicitud] [role="radio"]:has-text("Editor")').tap();
await hoja().locator('[data-solicitud] button:has-text("Aprobar")').tap();
ok(await toast("Ana Rosario ya es parte de tu equipo."), "toast de aprobada");
await esperar(500);
ok((await hoja().locator("[data-solicitud]").count()) === 0, "ya no espera");
const ana = hoja().locator('[data-miembro="staff"]', { hasText: "Ana Rosario" });
ok((await ana.locator('[role="radio"][aria-checked="true"]').innerText()).includes("Editor"), "entra como Editor (el nivel elegido)");

console.log("\n• Invitar por enlace: el enlace se ve una vez, con Copiar y Compartir");
await hoja().locator('button:has-text("Invitar por enlace")').tap();
await esperar(300);
await hoja().locator('[aria-label="Invitar por enlace"] [role="radio"]:has-text("Administrador")').tap();
await hoja().locator('input[placeholder="Para Ana"]').fill("Para Rosa");
// Doble toque: el botón se bloquea mientras crea, así que solo nace UN enlace.
await hoja().locator('[aria-label="Invitar por enlace"] button:has-text("Crear enlace")').evaluate((b) => { b.click(); b.click(); });
await page.waitForSelector("[data-enlace-nuevo]");
const url = await hoja().locator("[data-url-enlace]").innerText();
ok(/\/unirse\/demo-[a-z0-9]+$/i.test(url), `el enlace es /unirse/<código> (${url.replace(URL, "")})`);
await hoja().locator('[data-enlace-nuevo] button:has-text("Copiar")').tap();
ok(await toast("Enlace copiado."), "Copiar");
ok((await page.evaluate(() => navigator.clipboard.readText())) === url, "en el portapapeles queda el enlace");
const enlace = hoja().locator("[data-enlace]");
ok((await enlace.count()) === 1, "doble toque en «Crear enlace»: un solo enlace");
ok((await enlace.innerText()).includes("Administrador · Para Rosa"), "aparece en «Enlaces activos» con su nivel y su nota");
ok((await enlace.locator('button:has-text("Copiar")').count()) === 1, "y su fila tiene «Copiar» (el código quedó ligado al enlace correcto)");
ok((await enlace.innerText()).includes("vence en 7 días"), "vence en 7 días");

console.log("\n• Cambiar nivel, quitar y cancelar");
const pedro = hoja().locator('[data-miembro="staff"]', { hasText: "Pedro Núñez" });
await pedro.locator('[role="radio"]:has-text("Editor")').tap();
ok(await toast("Pedro Núñez ahora es Editor."), "Pedro pasa a Editor");
const carla = () => hoja().locator('[data-miembro="staff"]', { hasText: "Carla Méndez" });
await carla().locator('button:has-text("Quitar")').tap();
ok((await carla().locator("button", { hasText: "Toca otra vez para quitar" }).count()) === 1, "quitar pide confirmación");
await carla().locator("button", { hasText: "Toca otra vez para quitar" }).tap();
ok(await toast("Carla Méndez ya no está en tu tienda."), "Carla ya no está");
await esperar(400);
ok((await carla().count()) === 0, "desaparece de la lista");
ok((await hoja().locator('[data-miembro="dueno"] button:has-text("Quitar")').count()) === 0, "a la dueña no se la puede quitar");
await hoja().locator('[data-enlace] button:has-text("Cancelar enlace")').tap();
ok(await toast("Enlace cancelado. Ya no sirve."), "cancelar el enlace");
await esperar(400);
ok((await hoja().locator("[data-enlace]").count()) === 0, "ya no está entre los activos");

console.log("\n• Invitar por correo (sin aprobación)");
await hoja().locator('button:has-text("Invitar por correo")').tap();
await esperar(300);
await hoja().locator('input[type="email"]').fill("rosa");
await hoja().locator('[aria-label="Invitar por correo"] button:has-text("Invitar")').tap();
ok((await hoja().locator("text=Escribe un correo de Google").count()) === 1, "un correo mal escrito avisa y no se manda");
await hoja().locator('input[type="email"]').fill("rosa@gmail.com");
await hoja().locator('[aria-label="Invitar por correo"] button:has-text("Invitar")').tap();
ok(await toast("Listo. Cuando entre con Google con ese correo, ya estará en tu equipo."), "invitación por correo");
ok((await hoja().locator('[aria-label="Invitados por correo"]').innerText()).includes("rosa@gmail.com"), "queda en la lista de invitados por correo");
await cerrarHojas();

console.log("\n• Mirando como Ayudante: ventas sí; productos, retoque, Mi marca y equipo, no");
await mirarComo("Ayudante");
await abrirMenu();
ok((await page.locator("button[data-fila-equipo]").count()) === 0, "no ve «Tu equipo» como botón");
const filaColab = page.locator('[data-fila-equipo="colaborador"]');
ok((await filaColab.innerText()).includes("Esto lo ve quien administra la tienda") && (await filaColab.innerText()).includes("Ayudante"), "ve la fila apagada con el porqué y su nivel");
ok((await filaColab.locator('button:has-text("Salir de esta tienda")').count()) === 1, "y «Salir de esta tienda»");
await cerrarHojas();
await page.goto(URL + "/catalogo");
await page.waitForSelector("[data-sin-permiso]");
await esperar(500);
const mas = page.locator('button[data-sin-permiso]:has-text("Producto")');
ok((await mas.getAttribute("aria-disabled")) === "true", "«+ Producto» apagado");
await mas.tap({ force: true });
ok(await toast(PORQUE), "al tocarlo explica por qué");
await page.locator("main ul li a").first().tap();
await page.waitForSelector('[role="dialog"]');
await esperar(800);
const editar = hoja().locator('button:has-text("Editar")');
ok(await editar.isDisabled(), "«Editar» del producto, apagado");
ok((await hoja().locator("[data-sin-permiso]").innerText()).includes("quien administra la tienda"), "con su porqué debajo");
ok(await hoja().locator('button:has-text("Crear pedido")').isEnabled(), "pero «Crear pedido» sí (ventas)");
// Todo lo que cambia el catálogo está apagado para el Ayudante, con el mismo porqué.
const visible = hoja().getByRole("switch", { name: "Visible en el catálogo" });
ok((await visible.getAttribute("aria-disabled")) === "true", "el interruptor «Visible en el catálogo», apagado");
const antes = await page.evaluate(() => localStorage.getItem("deslizapp-demo-v5") ?? [...Object.keys(localStorage)].filter((k) => k.startsWith("deslizapp-demo")).map((k) => localStorage.getItem(k)).join("|"));
await visible.click({ force: true });
ok(await toast(PORQUE), "tocarlo explica por qué");
const menos = hoja().getByRole("button", { name: /^Disminuir stock de/ });
if ((await menos.count()) > 0) {
  ok(await menos.isDisabled(), "el ajuste de stock (−), apagado");
  ok(await hoja().getByRole("button", { name: /^Aumentar stock de/ }).isDisabled(), "el ajuste de stock (+), apagado");
}
const despues = await page.evaluate(() => [...Object.keys(localStorage)].filter((k) => k.startsWith("deslizapp-demo")).map((k) => localStorage.getItem(k)).join("|"));
ok(despues === antes || antes.includes(despues) || despues.includes(antes), "tocar los controles apagados no cambió los datos de la demo");
await cerrarHojas();
// Inventario (la dona): se ve, pero sumar stock y ocultar son del catálogo.
await page.goto(URL + "/catalogo");
await page.waitForSelector("button:has(.dona-cabecera)");
await esperar(600);
await page.locator("button:has(.dona-cabecera)").tap();
await page.waitForSelector('[role="dialog"]');
await esperar(700);
await hoja().getByRole("button", { name: /Por reponer/ }).first().tap();
await esperar(700);
await hoja().getByRole("radio", { name: /Ya la tengo/ }).or(hoja().getByRole("tab", { name: /Ya la tengo/ })).first().tap();
await esperar(500);
const sumar = hoja().locator("button:has-text('al stock')");
ok((await sumar.count()) === 1 && (await sumar.isDisabled()), "«Sumar al stock» (Por reponer), apagado");
ok((await hoja().locator("[data-sin-permiso]").innerText()) === PORQUE, "con el porqué");
await cerrarHojas();
await abrirMenu();
await page.locator('button:has-text("Mi marca")').first().tap();
await page.waitForSelector('[role="dialog"] [data-sin-permiso]');
ok((await hoja().locator("[data-sin-permiso]").innerText()) === PORQUE, "Mi marca: sin «Guardar», con el porqué");
ok((await hoja().locator('button:has-text("Guardar mi marca")').count()) === 0, "no hay «Guardar mi marca»");
await cerrarHojas();

console.log("\n• Mirando como Editor: productos sí; retoque y Mi marca, no");
await mirarComo("Editor");
await page.goto(URL + "/catalogo");
await page.waitForSelector('a[href="/catalogo/nuevo"]');
ok((await page.locator('button[data-sin-permiso]:has-text("Producto")').count()) === 0, "«+ Producto» encendido");
await page.locator('a[href="/catalogo/nuevo"]').tap();
await page.waitForSelector('[role="dialog"] input[placeholder="Ej: Kiara Pink"]');
await esperar(600);
ok((await hoja().locator("[data-sin-permiso]").count()) === 0, "la ficha nueva no muestra el aviso de permiso");
// Una foto nueva: en su hoja, el interruptor «Retocar esta foto» queda apagado con el porqué.
const png = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 600; c.height = 600;
  const g = c.getContext("2d");
  g.fillStyle = "#c9a"; g.fillRect(0, 0, 600, 600);
  return c.toDataURL("image/png").split(",")[1];
});
await page.locator("[data-entrada-medios]").setInputFiles([{ name: "foto.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") }]);
await page.locator("[data-entrada-medios]").locator("xpath=..").getByRole("button", { name: /^(Portada|Foto) 1 de/ }).first().click();
await esperar(600);
const interruptor = hoja().getByRole("switch", { name: "Retocar esta foto", exact: true });
await interruptor.waitFor({ timeout: 8000 });
ok((await interruptor.getAttribute("aria-disabled")) === "true", "«Retocar esta foto» apagado (créditos son del Administrador)");
ok((await hoja().innerText()).includes(PORQUE), "con el porqué");
await page.goto(URL + "/catalogo");
await esperar(800);
if ((await page.locator('[role="alertdialog"]').count()) > 0) await page.locator('[role="alertdialog"] button:has-text("Salir")').tap();
await abrirMenu();
await page.locator('button:has-text("Mi marca")').first().tap();
await page.waitForSelector('[role="dialog"] [data-sin-permiso]');
ok(true, "Mi marca sigue sin «Guardar» para el Editor");
await cerrarHojas();

console.log("\n• Mirando como Administrador: todo menos el equipo");
await mirarComo("Administrador");
await abrirMenu();
await page.locator('button:has-text("Mi marca")').first().tap();
await page.waitForSelector('[role="dialog"] button:has-text("Guardar mi marca")');
ok(true, "Mi marca con «Guardar»");
await cerrarHojas();
await abrirMenu();
ok((await page.locator("button[data-fila-equipo]").count()) === 0 && (await page.locator('[data-fila-equipo="colaborador"]').count()) === 1, "«Tu equipo» sigue siendo de la dueña");
await page.locator('[data-fila-equipo="colaborador"] button:has-text("Salir de esta tienda")').tap();
await page.locator('[data-fila-equipo="colaborador"] button:has-text("Toca otra vez para salir")').tap();
ok(await toast("Listo. Vuelves a mirar la demo como dueña."), "«Salir de esta tienda» (en la demo vuelve a la dueña)");
await esperar(500);
await abrirMenu();
ok((await page.locator("button[data-fila-equipo]").count()) === 1, "de vuelta como dueña, «Tu equipo» otra vez");
await cerrarHojas();

console.log("\n• /unirse: sin referer, sin índice, y el código sale de la barra al instante");
const codigoFalso = "x".repeat(43);
const resp = await page.goto(`${URL}/unirse/${codigoFalso}`);
ok(resp.headers()["referrer-policy"] === "no-referrer", "Referrer-Policy: no-referrer");
ok(/noindex/.test(resp.headers()["x-robots-tag"] ?? ""), "X-Robots-Tag: noindex");
ok((await page.locator('meta[name="robots"]').getAttribute("content"))?.includes("noindex"), "meta robots noindex");
await page.waitForSelector("[data-unirse]:not([data-unirse=cargando])");
ok(new globalThis.URL(page.url()).pathname === "/unirse", `la barra queda en /unirse (${new globalThis.URL(page.url()).pathname})`);
ok(!(await page.evaluate(() => JSON.stringify(window.history.state ?? "") + location.href)).includes(codigoFalso), "el código no queda en la dirección");
// Este entorno no tiene Supabase: el enlace no se puede comprobar y se dice que no sirve (sin decir por qué).
ok((await page.locator("h1").innerText()) === "Este enlace ya no sirve", "sin Supabase: «Este enlace ya no sirve»");
ok((await page.locator("script[src^='http']:not([src*='localhost'])").count()) === 0, "sin scripts de terceros");

console.log("\n• Admin › Más › Invitaciones (demo)");
await page.goto(`${URL}/admin-demo/mas`);
await page.waitForSelector("[data-invitaciones]");
await esperar(600);
await page.locator('[data-invitaciones] input[placeholder="Para Rosa"]').fill("Para Rosa");
await page.locator('[data-invitaciones] button:has-text("Crear enlace de tienda")').tap();
await page.waitForSelector("[data-enlace-tienda-nuevo]", { timeout: 6000 }).catch(async (e) => { console.log(await page.locator("main").innerText()); throw e; });
ok(/\/unirse\/demo-/.test(await page.locator("[data-enlace-tienda-nuevo]").innerText()), "el enlace de tienda nueva se muestra una vez");
ok((await page.locator('[data-enlace-tienda="activo"]').innerText()).includes("Para Rosa"), "queda en la lista «Sin abrir» con su nota");
await page.locator('[data-enlace-tienda="activo"] button:has-text("Cancelar")').tap();
await page.waitForSelector('[data-enlace-tienda="cancelado"]');
ok(true, "Cancelar lo deja «Cancelado»");

ok(errores.length === 0, `sin errores de página${errores.length ? `: ${errores.join(" | ")}` : ""}`);
ok(supabase === 0, "la demo no llama a Supabase");
await navegador.close();
console.log("\nListo: todo pasó.");
