// «Retocar esta foto» al subir (docs/prompts/retoque-al-subir.md), en la demo (nunca toca Supabase): el interruptor solo anota la
// intención; al guardar el producto se manda cada foto marcada al taller. A 390 px, tema claro. Tienda: Luna Bisutería (100 créditos).
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] node scripts/probar-retoque-al-subir.mjs
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
const LUNA = "a1000000-0000-4000-8000-000000000002";
const CLAVE = "deslizapp-demo-v5";
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

async function pagina(creditos) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  let peticiones = 0;
  page.on("request", (r) => /supabase\.co/.test(r.url()) && peticiones++);
  await page.addInitScript((t) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
  }, LUNA);
  await page.goto(`${URL}/catalogo`);
  await page.waitForSelector("main");
  const c = { ctx, page, errores, peticiones: () => peticiones };
  if (creditos != null) {
    await sembrar(page);
    await poner(c, creditos);
  }
  return c;
}
/** La demo vive en memoria y solo escribe en localStorage al guardar algo: se guarda un producto para que exista la copia. */
async function sembrar(page) {
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Base");
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("100");
  await page.locator("[data-entrada-medios]").setInputFiles(await archivos(page, 1));
  await page.getByRole("button", { name: /^Portada|^Foto 1/ }).first().waitFor();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await page.waitForURL(`${URL}/catalogo`);
}
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
/** Cambia los créditos desde otra pestaña de la misma sesión (la demo se entera por el evento de storage, como en producción). */
async function poner(c, creditos) {
  const otra = await c.ctx.newPage();
  await otra.goto(`${URL}/catalogo`);
  await otra.evaluate(([k, id, n]) => {
    const d = JSON.parse(localStorage.getItem(k));
    d.tiendas.find((t) => t.id === id).creditosRetoque = n;
    localStorage.setItem(k, JSON.stringify(d));
  }, [CLAVE, LUNA, creditos]);
  await otra.close();
  await c.page.waitForTimeout(500);
}
const hoja = (page) => page.locator('[role="dialog"]').last();
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const reservados = (d, extra = () => true) => d.trabajosRetoque.filter((t) => t.tiendaId === LUNA && t.estado === "pendiente" && extra(t));
const colores = ["#c0392b", "#2c6fbb", "#2e8b57", "#8e44ad"];
async function archivos(page, n) {
  const b64 = await page.evaluate((cs) => cs.map((color) => {
    const c = document.createElement("canvas");
    c.width = 600; c.height = 600;
    const g = c.getContext("2d");
    g.fillStyle = color; g.fillRect(0, 0, 600, 600);
    return c.toDataURL("image/png").split(",")[1];
  }), colores.slice(0, n));
  return b64.map((x, i) => ({ name: `foto${i}.png`, mimeType: "image/png", buffer: Buffer.from(x, "base64") }));
}
/** Abre «Nuevo producto» con nombre, precio y `n` fotos. */
async function nuevo(page, nombre, n) {
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill(nombre);
  await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("500");
  if (n) {
    await page.locator("[data-entrada-medios]").setInputFiles(await archivos(page, n));
    await page.getByRole("button", { name: new RegExp(`^Foto ${n} de ${n}|^Foto ${n}`) }).first().waitFor();
  }
}
const abrirFoto = async (page, i) => {
  await page.locator("[data-entrada-medios]").locator("xpath=..").getByRole("button", { name: new RegExp(`^(Portada|Foto) ${i} de`) }).first().click();
  await hoja(page).waitFor();
  await page.waitForTimeout(350);
};
const interruptor = (page) => hoja(page).getByRole("switch", { name: "Retocar esta foto", exact: true });
const cerrarHoja = async (page) => {
  await hoja(page).getByRole("button", { name: "Cerrar" }).first().click().catch(() => page.keyboard.press("Escape"));
  await page.waitForTimeout(350);
};
/** Publica; si hay fotos marcadas y es la primera vez, la bienvenida del retoque sale antes de guardar: se confirma. */
const publicar = async (page) => {
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await confirmarBienvenida(page);
  await page.waitForURL(`${URL}/catalogo`);
};
const confirmarBienvenida = async (page) => {
  const bv = page.getByRole("dialog", { name: "Retoque con tu marca" });
  const sale = await bv.waitFor({ timeout: 4000 }).then(() => true, () => false);
  if (sale) await bv.getByRole("button", { name: "Retocar foto", exact: true }).click();
};

let casos = 0;
async function caso(titulo, fn) {
  console.log(`\n• ${titulo}`);
  const c = await fn();
  casos++;
  await c.ctx.close();
}

await caso("1. Apagado por defecto: una foto sin marcar no pide nada y no se cobra", async () => {
  const c = await pagina();
  const { page } = c;
  await nuevo(page, "Sin retoque", 1);
  await abrirFoto(page, 1);
  const sw = interruptor(page);
  ok((await sw.getAttribute("aria-checked")) === "false", "el interruptor «Retocar esta foto» empieza apagado");
  ok(await hoja(page).getByText("Beta", { exact: true }).isVisible(), "lleva «Beta»");
  ok((await hoja(page).innerText()).includes("5 créditos"), "dice cuánto cuesta (5 créditos)");
  ok(await sinDesborde(page), "sin scroll horizontal a 390");
  await cerrarHoja(page);
  const antes = (await db(page)).trabajosRetoque?.length ?? 0;
  await publicar(page);
  const d = await db(page);
  ok(d.productos.some((p) => p.nombre === "Sin retoque"), "el producto se guardó");
  ok((d.trabajosRetoque?.length ?? 0) === antes, "no se mandó nada al taller");
  ok(d.tiendas.find((t) => t.id === LUNA).creditosRetoque === 100, "créditos intactos (100)");
  ok(c.peticiones() === 0 && c.errores.length === 0, "cero peticiones a Supabase y sin errores de página");
  return c;
});

await caso("2. Una foto marcada: encender no reserva nada; al guardar reserva 5", async () => {
  const c = await pagina();
  const { page } = c;
  await nuevo(page, "Una marcada", 1);
  await abrirFoto(page, 1);
  const sw = interruptor(page);
  await sw.focus();
  await page.keyboard.press("Space");
  ok((await sw.getAttribute("aria-checked")) === "true", "con teclado (Space) se enciende");
  ok(await hoja(page).getByText("Se manda al taller cuando guardes.").isVisible(), "«Se manda al taller cuando guardes.»");
  const d0 = await db(page);
  ok((d0.trabajosRetoque ?? []).length === 0, "encender solo anota la intención: ningún trabajo todavía");
  await cerrarHoja(page);
  await publicar(page);
  const d = await db(page);
  const p = d.productos.find((x) => x.nombre === "Una marcada");
  ok(reservados(d, (t) => t.productoId === p.id).length === 1, "se reservó 1 trabajo para el producto guardado");
  ok(reservados(d)[0].medioUrlOriginal === p.fotos[0], "con la URL ya guardada de la foto");
  ok(d.tiendas.find((t) => t.id === LUNA).creditosRetoque === 100, "no se cobra: se cobra al entregar");
  ok(c.errores.length === 0, "sin errores de página");
  return c;
});

await caso("3. Dos fotos marcadas reservan 10 y la tercera sin marcar queda sin pedir", async () => {
  const c = await pagina();
  const { page } = c;
  await nuevo(page, "Dos marcadas", 3);
  for (const i of [1, 3]) {
    await abrirFoto(page, i);
    await interruptor(page).click();
    ok((await interruptor(page).getAttribute("aria-checked")) === "true", `foto ${i} marcada`);
    await cerrarHoja(page);
  }
  await publicar(page);
  const d = await db(page);
  const p = d.productos.find((x) => x.nombre === "Dos marcadas");
  const r = reservados(d, (t) => t.productoId === p.id);
  ok(r.length === 2 && r.reduce((n, t) => n + t.creditos, 0) === 10, "2 trabajos, 10 créditos reservados");
  ok(r.some((t) => t.medioUrlOriginal === p.fotos[0]) && r.some((t) => t.medioUrlOriginal === p.fotos[2]) && !r.some((t) => t.medioUrlOriginal === p.fotos[1]), "la primera y la tercera, no la del medio");
  return c;
});

await caso("4. Créditos insuficientes: el interruptor sale deshabilitado con su motivo", async () => {
  const c = await pagina(7);
  const { page } = c;
  await nuevo(page, "Pocos créditos", 2);
  await abrirFoto(page, 1);
  await interruptor(page).click();
  ok((await interruptor(page).getAttribute("aria-checked")) === "true", "con 7 libres cabe una (5)");
  await cerrarHoja(page);
  await abrirFoto(page, 2);
  const sw = interruptor(page);
  ok((await sw.getAttribute("aria-disabled")) === "true", "la segunda ya no cabe: deshabilitado");
  ok(await hoja(page).getByText("Te faltan créditos para esta.").isVisible(), "dice «Te faltan créditos para esta.»");
  await sw.click({ force: true });
  ok((await sw.getAttribute("aria-checked")) === "false", "tocarlo deshabilitado no lo enciende");
  return c;
});

await caso("5. Si el pedido al taller falla, el producto queda guardado y se avisa", async () => {
  const c = await pagina(100);
  const { page } = c;
  await nuevo(page, "Falla el taller", 1);
  await abrirFoto(page, 1);
  await interruptor(page).click();
  await cerrarHoja(page);
  // Entre marcar y guardar se acaban los créditos: el taller rechaza el pedido.
  await poner(c, 0);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await confirmarBienvenida(page);
  await page.waitForURL(`${URL}/catalogo`);
  const d = await db(page);
  const p = d.productos.find((x) => x.nombre === "Falla el taller");
  ok(!!p, "el producto quedó guardado");
  ok(reservados(d, (t) => t.productoId === p.id).length === 0, "no hay trabajo reservado");
  await page.getByText(/No pudimos mandar la foto al taller/).first().waitFor({ timeout: 4000 });
  ok(true, "aviso «No pudimos mandar la foto al taller…»");
  await page.goto(`${URL}/catalogo/${p.id}/editar`);
  await abrirFoto(page, 1);
  ok(await hoja(page).getByRole("button", { name: "Retocar", exact: true }).count() === 1, "la foto guardada conserva su botón «Retocar»");
  ok(await hoja(page).getByRole("switch").count() === 0, "y no hay interruptor en una foto ya guardada");
  return c;
});

await caso("6. Video: sin interruptor; foto guardada: botón «Retocar» de siempre", async () => {
  const c = await pagina(100);
  const { page } = c;
  const base = (await db(page)).productos.find((p) => p.nombre === "Base");
  await page.goto(`${URL}/catalogo/${base.id}/editar`);
  await abrirFoto(page, 1);
  ok(await hoja(page).getByRole("switch").count() === 0, "foto ya guardada: sin interruptor");
  ok(await hoja(page).getByRole("button", { name: "Retocar", exact: true }).count() === 1, "…con su botón «Retocar»");
  await cerrarHoja(page);
  const video = await page.evaluate(
    () =>
      new Promise((listo) => {
        const c = document.createElement("canvas");
        c.width = 320; c.height = 240;
        const g = c.getContext("2d");
        const rec = new MediaRecorder(c.captureStream(24), { mimeType: "video/webm" });
        const trozos = [];
        rec.ondataavailable = (e) => trozos.push(e.data);
        rec.onstop = async () => {
          const bytes = new Uint8Array(await new Blob(trozos, { type: "video/webm" }).arrayBuffer());
          let s = "";
          for (const x of bytes) s += String.fromCharCode(x);
          listo(btoa(s));
        };
        let t = 0;
        const id = setInterval(() => { g.fillStyle = `hsl(${t++ * 8},70%,50%)`; g.fillRect(0, 0, 320, 240); }, 40);
        rec.start(200);
        setTimeout(() => { clearInterval(id); rec.stop(); }, 2000);
      }),
  );
  await page.locator("[data-entrada-medios]").setInputFiles([{ name: "corto.webm", mimeType: "video/webm", buffer: Buffer.from(video, "base64") }]);
  const tira = page.locator("[data-entrada-medios]").locator("xpath=..");
  await tira.getByRole("button", { name: /^Video/ }).first().waitFor({ timeout: 20000 });
  await page.getByText("Lo dejamos liviano para que cargue rápido.").waitFor({ state: "detached", timeout: 40000 });
  await tira.getByRole("button", { name: /^Video/ }).first().click();
  await page.getByRole("dialog", { name: "Video" }).waitFor();
  await page.waitForTimeout(350);
  ok(await page.getByRole("dialog", { name: "Video" }).count() === 1 && await hoja(page).locator("video").count() > 0 || (await hoja(page).innerText()).toLowerCase().includes("video"), "se abre la hoja del video");
  ok(await page.getByRole("dialog", { name: "Video" }).getByRole("switch").count() === 0, "el video no tiene interruptor de retoque");
  return c;
});

await caso("7. Cerrar sin guardar no manda nada", async () => {
  const c = await pagina(100);
  const { page } = c;
  await nuevo(page, "Se descarta", 1);
  await abrirFoto(page, 1);
  await interruptor(page).click();
  await cerrarHoja(page);
  const antes = await db(page);
  await page.goto(`${URL}/catalogo`);
  const d = await db(page);
  ok(!d.productos.some((p) => p.nombre === "Se descarta"), "el producto no se guardó");
  ok((d.trabajosRetoque ?? []).length === (antes.trabajosRetoque ?? []).length, "ningún trabajo nuevo");
  ok(d.tiendas.find((t) => t.id === LUNA).creditosRetoque === 100, "créditos intactos");
  return c;
});

console.log(`\n${casos} casos pasan`);
await navegador.close();
