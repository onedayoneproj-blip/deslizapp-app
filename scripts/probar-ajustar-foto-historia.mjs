// «Ajustar foto» de la historia (docs: PR #81), en la demo: foto horizontal, cuadrada y vertical, con y sin fondo difuminado, a 390.
// Comprueba el valor por defecto del fondo difuminado, que mover/acercar cambia el encuadre, que «Listo» lo guarda y que la
// imagen final 1080×1920 lo respeta (con y sin `ctx.filter`). Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [CAPTURAS=docs/capturas/ajustar-foto-historia] node scripts/probar-ajustar-foto-historia.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const MICHEL = "a1000000-0000-4000-8000-000000000001";
const CLAVE = "deslizapp-demo-v5";
const ok = (c, m) => {
  console.log((c ? "  ✅ " : "  ❌ ") + m);
  if (!c) process.exitCode = 1;
};

const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

// Foto de prueba con un "producto" rojo en el centro y marcas en los bordes, de la forma pedida
const fotoDePrueba = (page, ancho, alto) =>
  page.evaluate(([w, h]) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#e9d8b8");
    g.addColorStop(1, "#7aa08c");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#b3261e";
    const lado = Math.min(w, h) * 0.45;
    x.fillRect(w / 2 - lado / 2, h / 2 - lado / 2, lado, lado);
    x.fillStyle = "#174b3a";
    x.font = `bold ${lado * 0.3}px sans-serif`;
    x.textAlign = "center";
    x.fillText("PRODUCTO", w / 2, h / 2 + lado * 0.8);
    x.fillStyle = "#000";
    x.fillRect(0, 0, w * 0.06, h * 0.06);
    x.fillRect(w * 0.94, h * 0.94, w * 0.06, h * 0.06);
    return c.toDataURL("image/jpeg", 0.85);
  }, [ancho, alto]);

async function abrirHoja(forma, ancho, alto, { sinFiltro = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(({ tienda, sinFiltro }) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", tienda);
    if (sinFiltro) Object.defineProperty(CanvasRenderingContext2D.prototype, "filter", { set() {}, get: () => "none" });
  }, { tienda: MICHEL, sinFiltro });
  // Las fotos de la demo se cambian por la de prueba (de la forma pedida) antes de que la página las pida
  const jpeg = Buffer.from((await fotoDePrueba(page, ancho, alto)).split(",")[1], "base64");
  await page.route(/\/(seed\/productos|catalogos\/esencias-michel\/fotos)\/[^?]*\.(svg|jpg|webp|png)/, (r) => r.fulfill({ status: 200, contentType: "image/jpeg", body: jpeg }));
  await page.goto(`${URL}/catalogo`);
  await page.waitForSelector('[aria-label^="Compartir"]');
  await page.locator('[aria-label^="Compartir"]').first().click();
  await page.getByRole("button", { name: "Ajustar foto" }).waitFor();
  await page.waitForSelector(`img[alt^="Vista previa"]`, { timeout: 20000 });
  return { ctx, page, errores };
}

const previa = (page) => page.locator('img[alt^="Vista previa"]');
const marco = (page) => page.locator("[data-marco-historia]");
const estado = async (page) => {
  const m = marco(page);
  return { k: Number(await m.getAttribute("data-k")), x: Number(await m.getAttribute("data-x")), y: Number(await m.getAttribute("data-y")) };
};
const interruptor = (page) => page.getByRole("switch", { name: "Fondo difuminado" });

// Arrastra y pellizca con eventos de puntero reales
async function arrastrar(page, dx, dy) {
  const r = await marco(page).boundingBox();
  const x0 = r.x + r.width / 2;
  const y0 = r.y + r.height / 2;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + dx / 2, y0 + dy / 2, { steps: 4 });
  await page.mouse.move(x0 + dx, y0 + dy, { steps: 4 });
  await page.mouse.up();
}
async function pellizcar(page, factor) {
  const cdp = await page.context().newCDPSession(page);
  const r = await marco(page).boundingBox();
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const d0 = 60;
  const toque = (x1, x2) => [{ x: x1, y: cy, id: 1 }, { x: x2, y: cy, id: 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: toque(cx - d0, cx + d0) });
  for (let i = 1; i <= 8; i++) {
    const d = d0 + ((d0 * factor - d0) * i) / 8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: toque(cx - d, cx + d) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

const casos = [
  { forma: "horizontal", w: 1600, h: 1000, difuminadoInicial: true },
  { forma: "cuadrada", w: 1200, h: 1200, difuminadoInicial: true },
  { forma: "vertical", w: 1080, h: 1700, difuminadoInicial: false },
];

for (const c of casos) {
  console.log(`\n${c.forma} (${c.w}×${c.h})`);
  const { ctx, page, errores } = await abrirHoja(c.forma, c.w, c.h);
  await page.getByRole("button", { name: "Ajustar foto" }).click();
  await marco(page).waitFor();
  await page.waitForSelector("[data-guia-tarjeta]");
  ok((await interruptor(page).getAttribute("aria-checked")) === String(c.difuminadoInicial), `«Fondo difuminado» ${c.difuminadoInicial ? "encendido" : "apagado"} por defecto`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin desborde horizontal");
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${c.forma}-1-ajustar-${c.difuminadoInicial ? "con" : "sin"}-fondo.png`) });

  // Con el fondo de siempre: mover y acercar
  const antes = await estado(page);
  await pellizcar(page, 2);
  const tras = await estado(page);
  ok(tras.k > antes.k + 0.3, `pellizcar acerca (k ${antes.k} → ${tras.k})`);
  await arrastrar(page, -40, 60);
  const movido = await estado(page);
  ok(movido.x !== tras.x || movido.y !== tras.y, `arrastrar mueve (${tras.x},${tras.y}) → (${movido.x},${movido.y})`);
  await page.getByRole("button", { name: "Alejar" }).click();
  ok((await estado(page)).k < movido.k, "el botón − aleja");
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  ok((await estado(page)).k > movido.k, "el botón + acerca");
  await page.getByLabel("Acercar la foto").fill("3.2");
  ok(Math.abs((await estado(page)).k - 3.2) < 0.01, "el deslizador acerca");
  // Alejar del todo no deja huecos en relleno: k=1 y la foto cubre el marco
  await page.getByLabel("Acercar la foto").fill("1");
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${c.forma}-2-k1.png`) });

  // Cambiar el fondo
  await interruptor(page).click();
  const nuevo = !c.difuminadoInicial;
  ok((await interruptor(page).getAttribute("aria-checked")) === String(nuevo), `se puede ${nuevo ? "encender" : "apagar"} el fondo difuminado`);
  ok((await page.locator("[data-fondo-difuminado]").count()) === (nuevo ? 1 : 0), nuevo ? "el fondo desenfocado se ve" : "sin fondo desenfocado");
  await pellizcar(page, 1.8);
  await arrastrar(page, 30, -50);
  ok((await estado(page)).k > 1.3, "con el interruptor cambiado también se acerca y se mueve");
  if (CAPTURAS) await page.screenshot({ path: join(CAPTURAS, `${c.forma}-3-ajustar-${nuevo ? "con" : "sin"}-fondo-acercada.png`) });
  const encuadre = await estado(page);

  // Listo: la vista previa y la imagen final lo respetan
  const srcAntes = await previa(page).getAttribute("src");
  await page.getByRole("button", { name: "Listo" }).last().click();
  await marco(page).waitFor({ state: "detached" });
  await page.waitForFunction((s) => document.querySelector('img[alt^="Vista previa"]')?.getAttribute("src") !== s, srcAntes, { timeout: 15000 });
  ok(true, "«Listo» regenera la vista previa");
  const dims = await page.evaluate(async () => {
    const img = document.querySelector('img[alt^="Vista previa"]');
    const b = await (await fetch(img.src)).blob();
    const bmp = await createImageBitmap(b);
    return { w: bmp.width, h: bmp.height };
  });
  ok(dims.w === 1080 && dims.h === 1920, `imagen final ${dims.w}×${dims.h}`);
  if (CAPTURAS) {
    await page.screenshot({ path: join(CAPTURAS, `${c.forma}-4-hoja-tras-listo.png`) });
    const url = await previa(page).getAttribute("src");
    const datos = await page.evaluate(async (u) => {
      const b = await (await fetch(u)).blob();
      return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
    }, url);
    (await import("node:fs")).writeFileSync(join(CAPTURAS, `${c.forma}-5-imagen-final-${nuevo ? "con" : "sin"}-fondo.jpg`), Buffer.from(datos.split(",")[1], "base64"));
  }
  // Reabrir: conserva lo guardado
  await page.getByRole("button", { name: "Ajustar foto" }).click();
  await marco(page).waitFor();
  const guardado = await estado(page);
  ok(Math.abs(guardado.k - encuadre.k) < 0.01 && Math.abs(guardado.x - encuadre.x) < 0.01 && (await interruptor(page).getAttribute("aria-checked")) === String(nuevo), "al reabrir, el encuadre guardado sigue");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await marco(page).waitFor({ state: "detached" });
  ok(errores.length === 0, `sin errores de página ${errores.join("|")}`);
  await ctx.close();
}

// Respaldo sin ctx.filter (Safari): foto horizontal con fondo difuminado
{
  console.log("\nrespaldo sin ctx.filter (horizontal)");
  const { ctx, page, errores } = await abrirHoja("horizontal", 1600, 1000, { sinFiltro: true });
  const cuantos = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("2d");
    c.filter = "blur(5px)";
    c.fillStyle = "#fff";
    c.fillRect(0, 0, 2, 2);
    return c.filter;
  });
  ok(cuantos === "none", "ctx.filter simulado como no disponible");
  await page.waitForSelector('img[alt^="Vista previa"]');
  if (CAPTURAS) {
    const url = await previa(page).getAttribute("src");
    const datos = await page.evaluate(async (u) => {
      const b = await (await fetch(u)).blob();
      return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
    }, url);
    (await import("node:fs")).writeFileSync(join(CAPTURAS, "respaldo-sin-filtro-imagen-final.jpg"), Buffer.from(datos.split(",")[1], "base64"));
  }
  ok(errores.length === 0, "sin errores de página");
  await ctx.close();
}

await navegador.close();
console.log(process.exitCode ? "\nCON FALLAS" : "\nTodo bien");
