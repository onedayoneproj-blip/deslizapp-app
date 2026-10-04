// Prueba del producto en el panel (docs/prompts/producto-panel.md §6), en la demo: Detalles de un perfume, opciones y stock por
// variante, fotos y video, Por encargo, + Pedido con variante y "Ya llegó". A 360, 390 y 430, claro y oscuro. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=390] [TEMAS=claro] [CAPTURAS=docs/capturas/producto-panel] node scripts/probar-producto.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}

const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const ANCHOS = (process.env.ANCHOS ?? "360,390,430").split(",").map(Number);
const TEMAS = (process.env.TEMAS ?? "claro,oscuro").split(",");
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const MAJESTIC = "a3000000-0000-4000-8000-000000000002";
const CLAVE = "deslizapp-demo-v5";

let fallas = 0;
const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};

const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

/** Un contexto nuevo (demo limpia) en la tienda dada, con el tema y el ancho. `abiertos` junta lo que abre window.open. */
async function pagina(ancho, tema, tienda) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(
    ({ tienda }) => {
      localStorage.setItem("deslizapp-version-vista", "9.9.9");
      localStorage.setItem("deslizapp-modo-v1", "demo");
      localStorage.setItem("deslizapp-sesion-v1", tienda);
      window.__abiertos = [];
      window.open = (url) => {
        window.__abiertos.push(String(url));
        return null;
      };
    },
    { tienda },
  );
  if (tema === "oscuro") {
    // La app todavía no elige tema sola: data-theme="dark" en <html> DESPUÉS de hidratar (antes, React avisa del desajuste).
    const ir = page.goto.bind(page);
    page.goto = async (...args) => {
      const r = await ir(...args);
      await page.waitForFunction(() => document.querySelector("main, [role=dialog]"));
      await page.evaluate(() => {
        const html = document.documentElement;
        html.setAttribute("data-theme", "dark");
        new MutationObserver(() => html.getAttribute("data-theme") !== "dark" && html.setAttribute("data-theme", "dark")).observe(html, { attributes: true });
      });
      return r;
    };
  }
  return { ctx, page, errores };
}

const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
const hoja = (page) => page.locator('[role="dialog"]').last();
const sinDesborde = async (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const capturar = async (page, nombre, ancho, tema) => {
  if (CAPTURAS && ancho === 390) await page.screenshot({ path: join(CAPTURAS, `${nombre}-${tema}.png`) });
};
/** Abre una fila de Detalles por su nombre. */
const fila = (page, nombre) => page.getByRole("button", { name: new RegExp(`^${nombre}: `) });
/** El botón "Agregar" (o la caja) del editor de etiquetas rotulado `rotulo` en la hoja abierta. */
async function escribirEtiqueta(page, rotulo, valores) {
  const grupo = hoja(page).locator(`xpath=.//p[normalize-space()="${rotulo}"]/..`);
  for (const v of valores) {
    const caja = page.getByRole("textbox", { name: `Agregar a ${rotulo}`, exact: true });
    if (!(await caja.isVisible().catch(() => false))) await grupo.getByRole("button", { name: "Agregar", exact: true }).click();
    await caja.fill(v);
    await caja.press("Enter");
  }
}

/** Fotos PNG y un video WebM corto, hechos en el navegador. */
async function archivosDePrueba(page) {
  return page.evaluate(async () => {
    const foto = (color) => {
      const c = document.createElement("canvas");
      c.width = 600;
      c.height = 600;
      const g = c.getContext("2d");
      g.fillStyle = color;
      g.fillRect(0, 0, 600, 600);
      g.fillStyle = "#fff";
      g.fillRect(200, 200, 200, 200);
      return c.toDataURL("image/png").split(",")[1];
    };
    const video = await new Promise((listo) => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 240;
      const g = c.getContext("2d");
      const flujo = c.captureStream(24);
      const rec = new MediaRecorder(flujo, { mimeType: "video/webm" });
      const trozos = [];
      rec.ondataavailable = (e) => trozos.push(e.data);
      rec.onstop = async () => {
        const b = new Blob(trozos, { type: "video/webm" });
        const bytes = new Uint8Array(await b.arrayBuffer());
        let s = "";
        for (const x of bytes) s += String.fromCharCode(x);
        listo(btoa(s));
      };
      let t = 0;
      const pintar = () => {
        g.fillStyle = `hsl(${t * 8},70%,50%)`;
        g.fillRect(0, 0, 320, 240);
        t++;
      };
      const id = setInterval(pintar, 40);
      rec.start(200);
      setTimeout(() => {
        clearInterval(id);
        rec.stop();
      }, 2000);
    });
    return { rojo: foto("#c0392b"), azul: foto("#2c6fbb"), video };
  });
}

const ESCENARIOS = {
  /** 1. Perfume: Marca, Tamaño, Ideal para y Notas; guardar; volver a abrir y que estén. */
  async perfume(page, ancho, tema) {
    await page.goto(`${URL}/catalogo/${MAJESTIC}/editar`);
    await fila(page, "Marca").click();
    await page.getByRole("textbox", { name: "Marca", exact: true }).fill("Maison Prueba");
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await fila(page, "Tamaño").click();
    await page.getByRole("textbox", { name: "Mililitros", exact: true }).fill("75");
    await page.getByRole("radio", { name: "EDT", exact: true }).click();
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await fila(page, "Ideal para").click();
    for (const o of ["Oficina", "Verano", "Citas"]) {
      const c = page.getByRole("checkbox", { name: o, exact: true });
      if ((await c.getAttribute("aria-checked")) !== "true") await c.click();
    }
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    await fila(page, "Notas").click();
    await escribirEtiqueta(page, "Salida", ["Bergamota", "Pimienta rosa"]);
    await escribirEtiqueta(page, "Corazón", ["Jazmín"]);
    await escribirEtiqueta(page, "Fondo", ["Vainilla", "Ámbar"]);
    await capturar(page, "notas", ancho, tema);
    await page.getByRole("button", { name: "Listo", exact: true }).click();
    ok(await sinDesborde(page), "Formulario de perfume sin desborde");
    await capturar(page, "formulario-perfume", ancho, tema);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo/${MAJESTIC}`);
    const d = (await db(page)).productos.find((p) => p.id === MAJESTIC).detalles;
    ok(d.marca === "Maison Prueba" && d.tamano_ml === 75 && d.concentracion === "edt", "Se guardan Marca y Tamaño (75 ml · EDT)");
    ok(["Oficina", "Verano", "Citas"].every((o) => d.ocasiones.includes(o)), "Se guarda Ideal para");
    ok(d.notas_salida.join() === "Bergamota,Pimienta rosa" && d.notas_corazon.join() === "Jazmín" && d.notas_fondo.join() === "Vainilla,Ámbar", "Se guardan las notas en su orden");
    await page.goto(`${URL}/catalogo/${MAJESTIC}/editar`);
    ok((await fila(page, "Marca").getAttribute("aria-label")).includes("Maison Prueba"), "Al volver a abrir, Marca está");
    if (process.env.VERBOSO) console.log(await page.getByRole("list", { name: "Detalles del producto" }).getByRole("button").evaluateAll((b) => b.map((x) => x.getAttribute("aria-label"))), JSON.stringify((await db(page)).productos.find((p) => p.id === MAJESTIC).detalles));
    const tamano = await fila(page, "Tamaño").getAttribute("aria-label");
    ok(tamano.includes("75 ml · EDT"), `Al volver a abrir, Tamaño está (${tamano})`);
    ok((await fila(page, "Notas").getAttribute("aria-label")).includes("Bergamota"), "Al volver a abrir, Notas están");
  },

  /** 2. Ropa: Talla (XS a XL) y Color (2) → 10 combinaciones; stock a tres; el total suma; quitar un color → 5. */
  async ropa(page, ancho, tema) {
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Blusa de prueba");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("1200");
    await page.getByRole("button", { name: "Agregar opción", exact: true }).click();
    await page.getByRole("radio", { name: "Talla", exact: true }).click();
    await page.getByRole("button", { name: "XS a XL", exact: true }).click();
    await capturar(page, "agregar-opcion", ancho, tema);
    await page.getByRole("button", { name: "Agregar", exact: true }).last().click();
    await page.getByRole("button", { name: "Agregar opción", exact: true }).click();
    await page.getByRole("radio", { name: "Color", exact: true }).click();
    await escribirEtiqueta(page, "Valores", ["Negro", "Blanco"]);
    ok((await hoja(page).innerText()).includes("10 combinaciones"), "La hoja dice que salen 10 combinaciones");
    await hoja(page).getByRole("button", { name: "Agregar", exact: true }).last().click();
    await page.getByRole("button", { name: "Ver las 10", exact: true }).click();
    ok((await page.getByRole("list", { name: "Stock por opción" }).locator("li").count()) === 10, "Hay 10 filas de stock");
    await page.getByRole("button", { name: "Agregar uno de S · Negro" }).click();
    await page.getByRole("button", { name: "Agregar uno de S · Negro" }).click();
    await page.getByRole("button", { name: "Agregar uno de M · Negro" }).click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Agregar uno de L · Blanco" }).click();
    ok((await page.locator("#titulo-stock").locator("xpath=..").innerText()).includes("6 en total"), "El total suma (6 en total)");
    ok(await sinDesborde(page), "Formulario de ropa sin desborde");
    await capturar(page, "formulario-ropa", ancho, tema);
    await page.getByRole("button", { name: /^Color/ }).click();
    await page.getByRole("button", { name: "Quitar Blanco", exact: true }).click();
    await hoja(page).getByRole("button", { name: "Guardar", exact: true }).click();
    ok((await page.getByRole("list", { name: "Stock por opción" }).locator("li").count()) === 5, "Al quitar un color quedan 5");
  },

  /** 3. Medios: 2 fotos y 1 video corto; cambiar la portada, ordenar, quitar; el tercer video no se deja. */
  async medios(page, ancho, tema) {
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).waitFor();
    const a = await archivosDePrueba(page);
    const entrada = page.locator("[data-entrada-medios]");
    await entrada.setInputFiles([
      { name: "rojo.png", mimeType: "image/png", buffer: Buffer.from(a.rojo, "base64") },
      { name: "azul.png", mimeType: "image/png", buffer: Buffer.from(a.azul, "base64") },
    ]);
    await page.getByRole("button", { name: /^Foto 2 de 2/ }).waitFor();
    await entrada.setInputFiles([{ name: "corto.webm", mimeType: "video/webm", buffer: Buffer.from(a.video, "base64") }]);
    await page.getByRole("button", { name: /^Video 3 de 3/ }).waitFor();
    await page.waitForTimeout(400);
    await capturar(page, "video-subiendo", ancho, tema);
    await page.waitForFunction(() => document.querySelector('[aria-label^="Video 3 de 3"]') && !/%/.test(document.querySelector('[aria-label^="Video 3 de 3"]').getAttribute("aria-label")), null, { timeout: 30_000 });
    ok(true, "El video se preparó (sin anillo de progreso)");
    const imagenes = async () => page.locator('[aria-label="Fotos y video"] li img').evaluateAll((l) => l.map((i) => i.getAttribute("src")));
    const antes = await imagenes();
    await page.getByRole("button", { name: /^Foto 2 de 3/ }).click();
    await page.getByRole("button", { name: "Hacer portada", exact: true }).click();
    ok((await imagenes())[0] === antes[1], "Hacer portada pone la segunda foto primero");
    await page.getByRole("button", { name: /^Video 3 de 3/ }).click();
    await page.getByRole("button", { name: "Mover a la izquierda", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Video 2 de 3/ }).waitFor();
    ok(true, "Mover a la izquierda ordena el video");
    await page.getByRole("button", { name: /^Foto 3 de 3/ }).click();
    await page.getByRole("button", { name: "Quitar foto", exact: true }).click();
    await page.getByRole("button", { name: /^Video 2 de 2/ }).waitFor();
    ok(true, "Quitar deja 2 elementos");
    await entrada.setInputFiles([{ name: "otro.webm", mimeType: "video/webm", buffer: Buffer.from(a.video, "base64") }]);
    await page.waitForFunction(() => !/%/.test(document.querySelector('[aria-label="Fotos y video"]')?.innerText ?? "") && document.querySelectorAll('[aria-label^="Video "]').length === 2, null, { timeout: 30_000 });
    await entrada.setInputFiles([{ name: "tercero.webm", mimeType: "video/webm", buffer: Buffer.from(a.video, "base64") }]);
    await page.getByText("Hasta 2 videos por producto. Quita uno para agregar otro.").waitFor();
    ok((await page.locator('[aria-label^="Video "]').count()) === 2, "El tercer video no se deja");
    ok(await sinDesborde(page), "Tira de medios sin desborde");
  },

  /** 4. Por encargo: encender, escribir el tiempo, guardar. */
  async encargo(page) {
    await page.goto(`${URL}/catalogo/${MAJESTIC}/editar`);
    await page.getByRole("switch", { name: "Por encargo" }).click();
    await page.getByRole("textbox", { name: "Cuándo llega" }).fill("Llega en 8 días");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo/${MAJESTIC}`);
    const p = (await db(page)).productos.find((x) => x.id === MAJESTIC);
    ok(p.porEncargo === true && p.encargoTexto === "Llega en 8 días", "Se guarda Por encargo con su tiempo");
  },

  /** 5. + Pedido con la camisa: obliga a elegir talla y color; el agotado está apagado; "M · Blanco"; despachar baja esa variante. */
  async pedido(page, ancho, tema) {
    await page.goto(`${URL}/pedidos/nuevo`);
    await page.getByRole("button", { name: "Elegir cliente" }).click();
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await page.getByRole("textbox", { name: "Nombre del cliente" }).fill("Ana Prueba");
    await page.getByRole("textbox", { name: "WhatsApp del cliente" }).fill("809-555-0101");
    await page.getByRole("button", { name: "Crear y elegir", exact: true }).click();
    await page.getByRole("button", { name: /Agregar productos/ }).click();
    ok((await page.getByRole("button", { name: "Agregar Camisa de lino", exact: true }).count()) === 0, "La camisa no se agrega sin elegir");
    await page.getByRole("button", { name: /^Elegir talla y color de Camisa de lino/ }).click();
    await page.getByRole("radio", { name: "Arena", exact: true }).click();
    ok(await page.getByRole("radio", { name: /^M/ }).isDisabled(), "M · Arena (agotada) está apagada");
    ok((await page.getByRole("radio", { name: /^M/ }).innerText()).includes("Agotado"), "…y dice Agotado");
    await page.getByRole("radio", { name: "Blanco", exact: true }).click();
    await page.getByRole("radio", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Agregar Camisa de lino M · Blanco" }).click();
    await capturar(page, "pedido-variante", ancho, tema);
    ok(await sinDesborde(page), "Selector con variantes sin desborde");
    await page.getByRole("button", { name: "Listo", exact: true }).last().click();
    ok((await hoja(page).innerText()).includes("M · Blanco"), "El pedido muestra M · Blanco");
    await page.getByRole("button", { name: "Guardar pedido", exact: true }).click();
    await page.waitForURL(`${URL}/pedidos`);
    const d = await db(page);
    const item = d.pedidoItems.find((i) => i.varianteId === "a7000000-0000-4000-8000-000000000005");
    ok(item && item.varianteTexto === "M · Blanco", "La línea guarda la variante");
    await page.goto(`${URL}/pedidos/${item.pedidoId}`);
    await hoja(page).getByText(/M · Blanco · 1 ×/).waitFor();
    ok(true, "El detalle muestra M · Blanco");
    await page.getByRole("button", { name: "Despachar pedido", exact: true }).click();
    await page.waitForFunction(
      ([k]) => JSON.parse(localStorage.getItem(k)).variantes.find((v) => v.id === "a7000000-0000-4000-8000-000000000005").stock === 4,
      [CLAVE],
      { timeout: 10_000 },
    );
    ok(true, "Despachar baja M · Blanco de 5 a 4");
  },

  /** 6. Reponer una variante con avisos: "Ya llegó", "Avisar" arma el enlace con #p/{slug} y la fila pasa a "Avisado". */
  async yaLlego(page, ancho, tema) {
    await page.goto(`${URL}/catalogo`);
    await page.getByRole("button", { name: /Ver tu inventario/ }).first().click();
    await page.getByRole("button", { name: /Por reponer/ }).first().click();
    const lista = page.getByRole("list", { name: "Productos por reponer" });
    await lista.waitFor();
    // Solo la camisa M · Arena marcada.
    for (const c of await lista.getByRole("checkbox", { checked: true }).all()) await c.click();
    await lista.getByRole("checkbox", { name: /Camisa de lino.*M · Arena/ }).click();
    await page.getByRole("radio", { name: "¡Ya la tengo!" }).click();
    await page.getByRole("button", { name: /^Sumar 1 al stock/ }).click();
    await page.getByText("Ya llegó", { exact: true }).waitFor();
    await capturar(page, "inventario-ya-llego", ancho, tema);
    ok(await sinDesborde(page), "Ya llegó sin desborde");
    await page.getByRole("button", { name: "Avisar", exact: true }).first().click();
    const abiertos = await page.evaluate(() => window.__abiertos);
    const texto = decodeURIComponent(abiertos[0] ?? "");
    if (process.env.VERBOSO) console.log(texto);
    ok(/wa\.me\/18495550177/.test(abiertos[0] ?? ""), "Avisar abre WhatsApp de quien espera");
    ok(texto.includes("¡Hola Mariela! Ya llegó Camisa de lino · M · Arena.") && texto.includes("https://example.com/lino-y-algodon#p/camisa-de-lino"), "El mensaje nombra la variante y lleva #p/camisa-de-lino");
    await page.getByText("Avisado", { exact: true }).waitFor({ timeout: 5000 });
    ok(true, "La fila pasa a Avisado");
    await page.waitForFunction(([k]) => JSON.parse(localStorage.getItem(k)).avisos.find((a) => a.id === "a8000000-0000-4000-8000-000000000003").avisadoEn !== null, [CLAVE]);
    ok(true, "Queda marcado como avisado");
  },
};

const TIENDA = { perfume: MICHEL, ropa: LINO, medios: LINO, encargo: MICHEL, pedido: LINO, yaLlego: LINO };

for (const tema of TEMAS) {
  for (const ancho of ANCHOS) {
    for (const [nombre, correr] of Object.entries(ESCENARIOS)) {
      console.log(`${nombre} · ${ancho} · ${tema}`);
      const { ctx, page, errores } = await pagina(ancho, tema, TIENDA[nombre]);
      try {
        await correr(page, ancho, tema);
        ok(errores.length === 0, `Sin errores de página${errores.length ? `: ${errores[0]}` : ""}`);
      } catch (e) {
        fallas++;
        console.log(`  ❌ ${nombre} falló: ${e.message.split("\n")[0]}`);
        await page.screenshot({ path: join(tmpdir(), `probar-producto-${nombre}-${ancho}-${tema}.png`) }).catch(() => {});
      } finally {
        await ctx.close();
      }
    }
  }
}
await navegador.close();
console.log(fallas ? `\n${fallas} escenario(s) fallaron.` : "\nTodo bien.");
process.exit(fallas ? 1 : 0);
