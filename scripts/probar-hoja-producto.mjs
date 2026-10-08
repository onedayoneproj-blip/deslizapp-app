// Hoja de producto rediseñada (docs/prompts/hoja-producto-rediseno.md), en la demo: foto grande, Nombre y Precio, tarjeta de
// «Presentaciones» y stock, «Más opciones» plegadas, botones «Vista previa» + «Publicar» al final, editar, Ayudante. Nunca toca Supabase.
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
    ok(await page.getByRole("button", { name: "Vista previa", exact: true }).isEnabled(), "«Vista previa» sí está prendido");
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Aros dorados");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("1850");
    ok(await publicar.isDisabled(), "Con nombre y precio, sin foto, sigue apagado");
    ok((await page.getByRole("textbox", { name: "Precio (RD$)" }).inputValue()) === "1,850", "El precio se ve con coma de miles (1,850)");
    ok((await page.getByRole("textbox", { name: "Nombre", exact: true }).getAttribute("placeholder")) === "El nombre de tu producto" && (await page.getByRole("textbox", { name: "Precio (RD$)" }).getAttribute("placeholder")) === "Escribe el precio", "Los ejemplos son invitaciones, sin «Ej:»");
    ok((await page.getByText("O un video corto.").count()) === 0 && (await page.getByText("Foto o video").count()) === 0, "Con el video apagado no se habla de video al agregar fotos");
    {
      // Escribir y borrar en el medio: el cursor no salta al final.
      const precio = page.getByRole("textbox", { name: "Precio (RD$)" });
      await precio.fill("");
      await precio.pressSequentially("12500");
      ok((await precio.inputValue()) === "12,500", "Escribir 12500 da 12,500");
      await precio.evaluate((e) => e.setSelectionRange(2, 2)); // 12|,500
      await precio.press("Backspace");
      ok((await precio.inputValue()) === "1,500" && (await precio.evaluate((e) => e.selectionStart)) === 1, "Borrar en el medio deja el cursor junto al dígito (1|,500)");
      await precio.fill("1850");
    }
    {
      // Todos los campos se ven iguales (docs/09): mismo alto, letra y peso; el ejemplo en gris, tamaño normal.
      const estilo = (n) => page.getByRole("textbox", { name: n, exact: true }).evaluate((e) => { const c = getComputedStyle(e); const p = e.getBoundingClientRect(); return { alto: Math.round(p.height), letra: c.fontSize, peso: c.fontWeight, familia: c.fontFamily, borde: c.borderTopWidth + c.borderTopLeftRadius }; });
      const [nombre, precio] = [await estilo("Nombre"), await estilo("Precio (RD$)")];
      ok(JSON.stringify(nombre) === JSON.stringify(precio) && precio.letra === "16px" && precio.peso === "400", `Nombre y Precio: mismo alto, letra, peso y borde (${JSON.stringify(precio)})`);
      ok((await page.getByRole("textbox", { name: "Precio (RD$)" }).evaluate((e) => getComputedStyle(e, "::placeholder").fontSize)) === "16px", "El ejemplo del precio es del tamaño normal de un campo");
    }
    {
      const b = await publicar.evaluate((e) => { const c = getComputedStyle(e); return { op: c.opacity, fondo: c.backgroundColor }; });
      ok(b.op === "1" && !/rgba|\/ /.test(b.fondo), `«Publicar» apagado es opaco (fondo ${b.fondo})`);
    }
    ok(await sinDesborde(page), "Sin desborde horizontal");
    await captura(page, "1-vacio", ancho);
    for (const n of ["Descripción", "Ficha técnica", "Colección", "Por encargo", "Visible en el catálogo"]) ok((await page.getByText(n, { exact: true }).count()) >= 1, `«Más opciones» tiene la fila ${n}`);
    ok((await page.locator("[data-fila-plegable] textarea").count()) === 0, "Lo opcional viene plegado");
    ok((await page.locator("[data-tarjeta-stock] [data-encargo]").getByText("Por encargo", { exact: true }).count()) === 1, "«Por encargo» está en la tarjeta del stock");
    ok((await page.getByText(/llevo la cuenta|llevas la cuenta/i).count()) === 0, "No hay «No llevo la cuenta»");
    ok((await page.locator('[data-fila-plegable="descripcion"], [data-fila-plegable="ficha"]').evaluateAll((l) => new Set(l.map((e) => e.parentElement)).size)) === 1, "Descripción y Ficha técnica comparten un grupo");
    ok((await page.locator('[data-fila-plegable="descripcion"]').evaluate((e) => !e.parentElement.textContent.includes("Colección"))), "Colección y Visible van en otro grupo");
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
    // Vista previa
    // Los botones van al final de la página (como en pedido nuevo): uno sobre otro, del mismo ancho y alto, sin flotar.
    await bajar(page);
    await page.waitForTimeout(300);
    const barra = page.locator("[data-barra-producto]");
    const [b1, b2] = await Promise.all([page.getByRole("button", { name: "Vista previa", exact: true }).boundingBox(), page.getByRole("button", { name: "Publicar", exact: true }).boundingBox()]);
    ok(Math.abs(b1.width - b2.width) < 1.5 && Math.abs(b1.height - b2.height) < 1.5 && b1.y < b2.y && Math.abs(b1.x - b2.x) < 1, "«Vista previa» arriba y «Publicar» debajo, del mismo ancho y alto");
    ok(await barra.evaluate((e) => { for (let n = e; n && !n.hasAttribute("data-hoja-contenido"); n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "fixed" || p === "sticky") return false; } return true; }), "…los botones no flotan: van dentro de la página");
    ok((await page.locator("[data-hoja-contenido]").evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight)) < 2 && b2.y + b2.height <= 844, "…al desplazar hasta el final se ven completos");
    ok((await page.getByRole("button", { name: "Vista previa", exact: true }).evaluate((e) => getComputedStyle(e).backgroundColor)) !== "rgba(0, 0, 0, 0)", "…«Vista previa» es opaco");
    await captura(page, "botones-al-final", ancho);
    // Vista previa: el reel real del catálogo del comprador, con el borrador
    await page.getByRole("button", { name: "Vista previa", exact: true }).click();
    const visor = page.frameLocator('iframe[title="Así lo verá tu cliente"]');
    await visor.locator("article.reel").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const reel = visor.locator("article.reel");
    const vista = (await reel.innerText()).replace(/\s+/g, " ");
    ok((await reel.locator("h2").innerText()) === "Aros dorados" && vista.includes("1,850") && vista.includes("Solo tengo 1") && vista.includes("Aros dorados con baño de oro"), "«Vista previa» es el reel del catálogo: nombre, precio, «Solo tengo 1» (con 1 en stock, como en el catálogo) y descripción");
    ok((await visor.locator("header.hdr").count()) === 1 && (await reel.locator(".act.like").count()) === 1 && (await reel.locator("button.elipsis").count()) === 1, "…con su cabecera, los botones de comprar y el «…» de la descripción");
    await captura(page, "como-se-ve", ancho);
    await page.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await page.waitForTimeout(700);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.waitForURL(`${URL}/catalogo`);
    const d = JSON.parse(await page.evaluate(() => localStorage.getItem("deslizapp-demo-v5")));
    const p = d.productos.find((x) => x.nombre === "Aros dorados");
    ok(p && p.precio === 1850 && p.fotos.length === 3 && p.porEncargo && p.encargoTexto === "Llega en 8 días" && p.detalles.descripcion.startsWith("Aros dorados"), "Publicar guarda lo mismo de siempre");
    ok(errores.length === 0, `Sin errores de página (${JSON.stringify(errores)})`);
    await ctx.close();
  }

  console.log("• Con presentaciones: la fila es solo el resumen y abre el flujo en «Cuántas tienes»");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await page.goto(`${URL}/catalogo/${PANTALON}/editar`);
    await page.locator("[data-cosas-que-cambian]").waitFor();
    await page.waitForTimeout(700);
    await captura(page, "2-listo", ancho);
    const tarjeta = await page.locator("[data-tarjeta-stock]").innerText();
    ok(/Talla · \d+/.test(tarjeta) && /Color · \d+/.test(tarjeta), `«Presentaciones» resume en pastillas (${tarjeta.split("\n").slice(0, 4).join(" | ")})`);
    ok(/\d+ presentaciones · \d+ en total/.test(tarjeta), "«En stock»: «N presentaciones · M en total»");
    { const i = (t) => tarjeta.indexOf(t); ok(i("Precio") >= 0 && i("Precio") < i("En stock") && i("En stock") < i("Por encargo") && i("Por encargo") < i("Presentaciones"), "Orden de la tarjeta: Precio, En stock, Por encargo, Presentaciones"); }
    ok((await page.getByRole("list", { name: "Presentaciones del producto" }).count()) === 0, "La hoja de producto no lista las filas: solo resume");
    await page.getByRole("button", { name: /^Presentaciones/ }).click();
    await page.locator("[data-paso=cuantas]").waitFor();
    ok((await page.locator('[role="dialog"]').last().innerText()).includes("Cuántas tienes"), "Tocar la fila abre el flujo directo en «Cuántas tienes»");
    await page.getByRole("button", { name: "Cerrar", exact: true }).last().click();
    await page.waitForTimeout(600);
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
