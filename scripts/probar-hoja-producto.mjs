// Hoja de producto rediseñada (docs/prompts/hoja-producto-rediseno.md), en la demo: foto grande, Nombre y Precio, tarjeta de
// «Cosas que cambian» y stock, «Más opciones» plegadas, barra fija «Cómo se ve» + «Publicar», editar, Ayudante. Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=390,360] [CAPTURAS=docs/capturas/hoja-producto-rediseno] node scripts/probar-hoja-producto.mjs
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
const ANCHOS = (process.env.ANCHOS ?? "390,360").split(",").map(Number);
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const OUD_MICHEL = "a3000000-0000-4000-8000-000000000019";
const PANTALON = "a3000000-0000-4000-8000-000000000018";

const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

async function pagina(ancho, tienda) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript((t) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
  }, tienda);
  return { ctx, page, errores };
}
const captura = async (page, nombre, ancho) => CAPTURAS && (await page.screenshot({ path: join(CAPTURAS, `${nombre}-${ancho}.png`) }));
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const png = (page, color) =>
  page.evaluate((c) => {
    const l = document.createElement("canvas");
    l.width = l.height = 600;
    const x = l.getContext("2d");
    x.fillStyle = c;
    x.fillRect(0, 0, 600, 600);
    return l.toDataURL("image/png").split(",")[1];
  }, color);
const bajar = (page) => page.locator("[data-hoja-contenido]").evaluate((e) => e.scrollTo(0, e.scrollHeight));

for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);

  console.log("• Producto vacío: foto grande, «Publicar» apagado hasta tener foto, nombre y precio");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).waitFor();
    ok((await page.locator("[data-foto-vacia]").count()) === 1 && (await page.getByText("Agrega la primera foto").isVisible()), "Sin fotos: espacio amplio con «Agrega la primera foto»");
    const caja = await page.locator("[data-foto-vacia]").boundingBox();
    ok(Math.abs(caja.width - caja.height) < 2 && caja.width > ancho - 60, "…cuadrado a todo el ancho (nunca círculo)");
    const publicar = page.getByRole("button", { name: "Publicar", exact: true });
    ok(await publicar.isDisabled(), "«Publicar» está apagado al empezar");
    ok(await page.getByRole("button", { name: "Cómo se ve", exact: true }).isEnabled(), "«Cómo se ve» sí está prendido");
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Aros dorados");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("1850");
    ok(await publicar.isDisabled(), "Con nombre y precio, sin foto, sigue apagado");
    ok((await page.getByRole("textbox", { name: "Precio (RD$)" }).evaluate((e) => getComputedStyle(e).fontFamily)).toLowerCase().includes("fredoka"), "El precio va en Fredoka");
    ok(await sinDesborde(page), "Sin desborde horizontal");
    await captura(page, "1-vacio", ancho);
    for (const n of ["Descripción", "Ficha técnica", "Colección", "Por encargo", "Visible en el catálogo"]) ok((await page.getByText(n, { exact: true }).count()) >= 1, `«Más opciones» tiene la fila ${n}`);
    ok((await page.locator("[data-fila-plegable] textarea").count()) === 0, "Lo opcional viene plegado");
    const A = [await png(page, "#c33"), await png(page, "#3a6"), await png(page, "#36c")];
    await page.locator("[data-entrada-medios]").setInputFiles(A.map((b, i) => ({ name: `f${i}.png`, mimeType: "image/png", buffer: Buffer.from(b, "base64") })));
    await page.getByRole("button", { name: /^Foto 3 de 3/ }).waitFor();
    ok(await publicar.isEnabled(), "Con foto, nombre y precio, «Publicar» se prende");
    ok((await page.locator("[data-foto-principal]").innerText()).includes("1 / 3"), "La foto principal lleva su contador «1 / 3»");
    await page.getByRole("button", { name: /^Foto 2 de 3/ }).click();
    await page.getByRole("button", { name: "Hacer portada", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    ok((await page.locator("[data-foto-principal]").innerText()).includes("2 / 3"), "Tocar una miniatura la pone en grande («2 / 3»)");
    // Fila plegable: instantánea y sin tocar el foco
    await page.getByRole("textbox", { name: "Nombre", exact: true }).focus();
    const fila = page.locator('[data-fila-plegable="descripcion"] button[aria-expanded]');
    await bajar(page);
    await fila.click();
    ok((await fila.getAttribute("aria-expanded")) === "true" && (await page.locator("[data-fila-plegable] textarea").count()) === 1, "Tocar «Descripción» la abre al instante");
    const area = page.locator("[data-fila-plegable] textarea");
    const texto = "Aros dorados con baño de oro. Livianos y cómodos para todo el día.";
    await area.fill(texto);
    ok((await page.getByText(`${texto.length} / 600`).count()) === 1 && (await page.getByText("Lo que escribas aquí también lo usa la búsqueda de tu catálogo.").count()) === 1, "Descripción: contador «N / 600» y la línea de la búsqueda");
    await captura(page, "3-opcional-abierto", ancho);
    await fila.click();
    ok((await page.locator('[data-fila-plegable="descripcion"]').innerText()).includes("Aros dorados con baño de oro"), "Cerrada, la fila muestra su valor");
    // Por encargo
    await page.getByRole("switch", { name: "Por encargo" }).click();
    await page.getByRole("textbox", { name: "Cuándo llega" }).fill("Llega en 8 días");
    // Cómo se ve
    await page.getByRole("button", { name: "Cómo se ve", exact: true }).click();
    await page.locator("[data-como-se-ve]").waitFor();
    const vista = await page.locator("[data-como-se-ve]").innerText();
    ok(vista.includes("Aros dorados") && vista.includes("1,850") && vista.includes("Llega en 8 días") && vista.includes("Aros dorados con baño de oro"), "«Cómo se ve» muestra nombre, precio, encargo y descripción");
    await captura(page, "como-se-ve", ancho);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo`);
    const d = JSON.parse(await page.evaluate(() => localStorage.getItem("deslizapp-demo-v5")));
    const p = d.productos.find((x) => x.nombre === "Aros dorados");
    ok(p && p.precio === 1850 && p.fotos.length === 3 && p.porEncargo && p.encargoTexto === "Llega en 8 días" && p.detalles.descripcion.startsWith("Aros dorados"), "Publicar guarda lo mismo de siempre");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  console.log("• Con presentaciones: pastillas, stock y la lista que se despliega");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo/${PANTALON}/editar`);
    await page.locator("[data-cosas-que-cambian]").waitFor();
    await page.waitForTimeout(700);
    await captura(page, "2-listo", ancho);
    const tarjeta = await page.locator("[data-tarjeta-stock]").innerText();
    ok(/Talla · \d+/.test(tarjeta) && /Color · \d+/.test(tarjeta), `«Cosas que cambian» resume en pastillas (${tarjeta.split("\n").slice(0, 4).join(" | ")})`);
    ok(/\d+ presentaciones · \d+ en total/.test(tarjeta), "«En stock»: «N presentaciones · M en total»");
    ok((await page.getByRole("list", { name: "Presentaciones del producto" }).count()) === 0, "La lista viene plegada");
    await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
    ok((await page.getByRole("list", { name: "Presentaciones del producto" }).count()) === 1, "Tocar la fila abre las presentaciones");
    await page.getByRole("button", { name: /^Cosas que cambian/ }).click();
    ok(await page.getByRole("button", { name: "Eliminar producto" }).count() === 1, "Editar conserva «Eliminar producto»");
    ok(await page.getByRole("button", { name: "Guardar cambios", exact: true }).isEnabled(), "«Guardar cambios» está prendido en un producto que ya está completo");
    ok(await sinDesborde(page), "Sin desborde horizontal");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  console.log("• Sin presentaciones al editar: control de stock, historial y lista de espera de siempre");
  {
    const { ctx, page, errores } = await pagina(ancho, MICHEL);
    await page.goto(`${URL}/catalogo/${OUD_MICHEL}/editar`);
    await page.locator('[data-fila-plegable="descripcion"]').waitFor();
    await page.waitForTimeout(700);
    ok((await page.getByRole("heading", { name: "Detalles", exact: true }).count()) === 1, "El producto de Michel conserva sus Detalles");
    // Un producto de Michel sin presentaciones: el control de stock y el historial de siempre dentro de la tarjeta.
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector('main ul li a[href^="/catalogo/"]');
    const ids = await page.$$eval('main ul li a[href^="/catalogo/"]', (a) => a.map((x) => x.getAttribute("href")));
    let visto = false;
    for (const h of ids.slice(0, 12)) {
      await page.goto(`${URL}${h}/editar`);
      await page.locator("[data-tarjeta-stock]").waitFor();
      await page.waitForTimeout(400);
      if ((await page.locator('section[aria-label="Inventario"]').count()) === 1) { visto = true; break; }
    }
    ok(visto && (await page.locator("[data-tarjeta-stock] section[aria-label=\"Inventario\"]").count()) === 1, "Sin presentaciones: el control de stock de siempre va dentro de la tarjeta");
    ok((await page.getByRole("button", { name: /Ver historial/ }).count()) >= 1, "…con su historial de ajustes");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  console.log("• Ayudante: lo ve apagado y dice por qué");
  {
    const { ctx, page } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector('header button[aria-haspopup="dialog"]');
    await page.waitForTimeout(900);
    await page.locator('header button[aria-haspopup="dialog"]').first().tap();
    await page.waitForSelector("[data-tienda-activa]");
    await page.waitForTimeout(500);
    await page.locator('[data-mirar-como] [role="radio"]:has-text("Ayudante")').tap();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.goto(`${URL}/catalogo/${PANTALON}/editar`);
    await page.waitForSelector("[data-sin-permiso]");
    ok(await page.getByRole("button", { name: "Guardar cambios", exact: true }).isDisabled(), "Ayudante: «Guardar cambios» apagado");
    ok((await page.locator("[data-sin-permiso]").first().innerText()).includes("Esto lo hace quien administra la tienda."), "…con «Esto lo hace quien administra la tienda.»");
    await ctx.close();
  }
}
await navegador.close();
console.log("\nTodo bien.");
