// Crear producto «como una historia» (docs/prompts/crear-producto-historia.md), en la demo y con la app corriendo: con foto y sin foto,
// varios catálogos, por encargo, catálogo lleno, «Guardar sin publicar», celebración y «Agregar otro», salir con cambios (aviso) y
// «Atrás» sin perder datos. Revisa el foco al cambiar de paso, las barras y que nada se desborde. Nunca toca Supabase.
// (Un servicio no se puede crear desde la app: el salto del paso de stock lo prueba tests/historia-producto.test.mjs.)
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=360,390,430] [CAPTURAS=docs/capturas/crear-producto] node scripts/probar-crear-producto.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}
const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const ANCHOS = (process.env.ANCHOS ?? "360,390,430").split(",").map(Number);
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const CLAVE = "deslizapp-demo-v5";

const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

const { construirDesdeSeed } = await import("../lib/data/db.ts");

/** `demo`: una base de la demo armada aquí (desde la semilla), que se pone una sola vez al abrir. */
async function pagina(ancho, tienda, demo = null) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(({ t, demo, k }) => {
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
    if (demo && !sessionStorage.getItem("dz-prueba-sembrada")) {
      localStorage.setItem(k, demo);
      sessionStorage.setItem("dz-prueba-sembrada", "1");
    }
  }, { t: tienda, demo: demo ? JSON.stringify(demo) : null, k: CLAVE });
  return { ctx, page, errores };
}
const captura = async (page, nombre, ancho) => CAPTURAS && (await page.screenshot({ path: join(CAPTURAS, `${nombre}-${ancho}.png`) }));
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
/** La semilla de la demo con un cambio. */
function demoCon(cambio) {
  const d = construirDesdeSeed();
  cambio(d);
  return d;
}
const png = (page, color) =>
  page.evaluate((c) => {
    const l = document.createElement("canvas");
    l.width = l.height = 600;
    const x = l.getContext("2d");
    x.fillStyle = c;
    x.fillRect(0, 0, 600, 600);
    return l.toDataURL("image/png").split(",")[1];
  }, color);

const H = "[data-historia-producto]";
const paso = (page) => page.locator(H).getAttribute("data-paso");
const titulo = (page) => page.locator("[data-titulo-paso]").innerText();
const barras = (page) => page.locator("[data-barras-historia]").getAttribute("aria-valuenow");
const enfocado = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? (a.hasAttribute("data-campo-paso") ? "campo" : a.hasAttribute("data-titulo-paso") ? "titulo" : a.tagName) : null;
});
const boton = (page, nombre) => page.getByRole("button", { name: nombre, exact: true });
const seguir = async (page) => {
  await boton(page, "Seguir").tap();
  await page.waitForTimeout(150);
};
async function abrir(page) {
  await page.goto(`${URL}/catalogo/nuevo`);
  await page.waitForSelector(H, { timeout: 60000 });
  await page.waitForTimeout(500);
}
async function subirFoto(page, color = "#c8a2c8") {
  const b = await png(page, color);
  await page.locator("[data-entrada-medios]").setInputFiles([{ name: "f.png", mimeType: "image/png", buffer: Buffer.from(b, "base64") }]);
  await page.locator("[data-tarjeta-asi-se-vera] img").waitFor();
}
/** Escribe en el campo enfocado (como el teclado: el foco ya lo puso la historia). */
const escribir = (page, texto) => page.keyboard.type(texto);
const productoCreado = async (page, nombre) => (await db(page)).productos.find((p) => p.nombre === nombre);

for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);

  console.log("• Con foto, de principio a fin: barras, tarjeta que se arma, foco en cada campo, reel y celebración");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrir(page);
    ok((await paso(page)) === "foto" && (await titulo(page)) === "Empieza por la foto", "Empieza por la foto");
    ok((await barras(page)) === "1" && (await page.locator("[data-barras-historia] span").count()) === 5, "Cinco barras, la primera llena (aria-valuenow 1)");
    ok((await page.locator("[data-tarjeta-asi-se-vera]").count()) === 1 && (await page.getByText("Tu foto va aquí").isVisible()), "Sin foto: la tarjeta es un marco con la cámara");
    ok(await boton(page, "Tomar foto").isVisible() && await boton(page, "Elegir de la galería").isVisible(), "«Tomar foto» y «Elegir de la galería»");
    ok((await page.locator("[data-entrada-camara]").getAttribute("capture")) === "environment", "«Tomar foto» abre la cámara (capture)");
    await captura(page, "1-foto-vacia", ancho);
    await subirFoto(page);
    ok(await page.getByText("Portada").first().isVisible(), "Con foto: la tira con la portada");
    await captura(page, "1-foto", ancho);
    await seguir(page);
    ok((await paso(page)) === "nombre" && (await barras(page)) === "2", "Paso 2: ¿Cómo se llama? (barra 2)");
    ok((await enfocado(page)) === "campo", "…con el foco en el campo en el mismo toque");
    ok(await boton(page, "Seguir").isDisabled(), "…«Seguir» apagado sin nombre");
    await escribir(page, "Hoodie Deslizapp");
    ok((await page.locator("[data-tarjeta-asi-se-vera]").innerText()).includes("Hoodie Deslizapp"), "El nombre aparece en la tarjeta mientras se escribe");
    await captura(page, "2-nombre", ancho);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    ok((await paso(page)) === "precio" && (await enfocado(page)) === "campo", "Enter lleva al precio con el foco en su campo");
    await escribir(page, "1450");
    ok((await page.locator("[data-precio-tarjeta]").innerText()) === "RD$1,450", "El precio aparece en la tarjeta");
    ok(await page.locator("[data-chip-presentaciones]").getByText("Tiene tallas o colores").isVisible(), "Chip «Tiene tallas o colores»");
    await captura(page, "3-precio", ancho);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    ok((await paso(page)) === "stock" && (await titulo(page)) === "¿Cuántos tienes ahora?", "Paso 4: ¿Cuántos tienes ahora?");
    ok((await enfocado(page)) === "titulo", "…sin campo, el foco va al título");
    const mas = page.locator("[data-contador-stock]").getByRole("button", { name: "Agregar uno" });
    const caja = await mas.boundingBox();
    ok(caja.width >= 56 && caja.height >= 56, "El + mide 56 px");
    await mas.tap();
    await mas.tap();
    ok((await page.locator("[data-contador-stock]").innerText()).includes("3"), "Contador en 3");
    await captura(page, "4-stock", ancho);
    await seguir(page);
    ok((await paso(page)) === "vista" && (await barras(page)) === "5", "Paso 5: Así se ve en tu catálogo");
    const marco = page.frameLocator("[data-reel-historia] iframe");
    await marco.locator("[data-vista-previa-reel] .reel").first().waitFor({ timeout: 20000 });
    ok((await marco.locator("[data-vista-previa-reel]").innerText()).includes("Hoodie Deslizapp"), "El reel real del comprador con el borrador");
    const alto = (await page.locator("[data-reel-historia]").boundingBox()).height;
    ok(Math.abs(alto - 440) < 2, "…de 440 px de alto");
    ok(await boton(page, "Publicar").isEnabled() && await boton(page, "Guardar sin publicar").isVisible(), "«Publicar» y «Guardar sin publicar»");
    // Un opcional: Descripción. Al cerrar, la pastilla muestra que está hecha.
    await page.locator('[data-opcional="Descripción"]').tap();
    await page.locator('textarea[placeholder="Cuéntalo como se lo dirías a una clienta."]').waitFor();
    await page.locator('textarea[placeholder="Cuéntalo como se lo dirías a una clienta."]').fill("Algodón grueso, para el frío.");
    await page.getByRole("dialog", { name: "Descripción" }).getByRole("button", { name: "Listo", exact: true }).tap();
    await page.waitForTimeout(600);
    ok((await page.locator('[data-opcional="Descripción"]').getAttribute("data-hecha")) !== null, "La pastilla Descripción queda hecha");
    await page.locator('[data-opcional="Colección"]').tap();
    await page.getByRole("radio", { name: "Sin colección" }).waitFor();
    await page.getByRole("dialog", { name: "Colección" }).getByRole("radio").nth(1).tap();
    await page.waitForTimeout(600);
    ok((await page.locator('[data-opcional="Colección"]').getAttribute("data-hecha")) !== null, "La pastilla Colección queda hecha");
    await captura(page, "5-asi-se-ve", ancho);
    ok(await sinDesborde(page), "Sin desborde horizontal");
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    ok((await paso(page)) === "listo", "Celebración");
    ok(await page.getByText("¡Ya está en tu catálogo!").isVisible() && await page.getByText("Hoodie Deslizapp ya se puede deslizar.").isVisible(), "«¡Ya está en tu catálogo!» y la línea con el nombre");
    const p = await productoCreado(page, "Hoodie Deslizapp");
    ok(p && p.activo && p.precio === 1450 && p.stock === 3 && p.medios.length === 1 && p.detalles.descripcion === "Algodón grueso, para el frío." && p.categoria, "Guardado visible con foto, precio, stock 3, descripción y colección");
    await captura(page, "6-celebracion", ancho);
    // «Agregar otro» reinicia la historia.
    await boton(page, "Agregar otro").tap();
    await page.waitForTimeout(200);
    ok((await paso(page)) === "foto" && (await page.getByText("Tu foto va aquí").isVisible()) && (await barras(page)) === "1", "«Agregar otro» empieza otra historia vacía");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Sin foto, «Atrás» sin perder nada y «Guardar sin publicar»");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrir(page);
    ok(await page.getByText("Sin foto se vende menos. Puedes agregarla luego.").isVisible(), "Línea «Sin foto se vende menos…»");
    await boton(page, "Seguir sin foto").tap();
    await page.waitForTimeout(150);
    await escribir(page, "Gorra sin foto");
    await seguir(page);
    await escribir(page, "800");
    await boton(page, "Atrás").tap();
    await page.waitForTimeout(150);
    ok((await paso(page)) === "nombre" && (await page.locator("[data-campo-paso]").inputValue()) === "Gorra sin foto", "Atrás vuelve al nombre con lo escrito");
    ok((await enfocado(page)) === "campo", "…y con el foco en el campo");
    await boton(page, "Atrás").tap();
    await page.waitForTimeout(150);
    ok((await paso(page)) === "foto", "Atrás otra vez: la foto");
    await boton(page, "Seguir sin foto").tap();
    await seguir(page);
    ok((await page.locator('[data-precio=""]').inputValue()) === "800", "El precio sigue ahí");
    await seguir(page);
    await seguir(page);
    await boton(page, "Guardar sin publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    ok(await page.getByText("¡Quedó guardado!").isVisible(), "Sin publicar: «¡Quedó guardado!»");
    const p = await productoCreado(page, "Gorra sin foto");
    ok(p && !p.activo && p.medios.length === 0 && p.precio === 800, "Guardado oculto y sin foto");
    await captura(page, "6-guardado-sin-publicar", ancho);
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Varios catálogos (Lino: Ropa y Accesorios) y por encargo con «¿Cuándo llega?»");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrir(page);
    await subirFoto(page, "#7aa");
    await seguir(page);
    ok(await page.getByText("¿En qué catálogo va?").isVisible(), "«¿En qué catálogo va?» debajo del nombre");
    ok((await page.getByRole("radio", { name: "Ropa" }).getAttribute("aria-checked")) === "true", "…preseleccionado el catálogo abierto (Ropa)");
    await escribir(page, "Aretes por encargo");
    await page.getByRole("radio", { name: "Accesorios" }).tap();
    await captura(page, "2-nombre-catalogos", ancho);
    await seguir(page);
    await escribir(page, "650");
    await seguir(page);
    await page.getByRole("checkbox", { name: "Es por encargo, no llevo stock" }).tap();
    await page.waitForTimeout(100);
    ok((await titulo(page)) === "¿Cuándo llega?" && (await page.locator("[data-contador-stock]").count()) === 0, "Por encargo: «¿Cuándo llega?» y sin contador");
    ok(await boton(page, "Seguir").isDisabled(), "…«Seguir» apagado hasta elegir cuándo");
    await page.getByRole("radio", { name: "Otro" }).tap();
    await page.waitForTimeout(100);
    ok((await enfocado(page)) === "campo", "«Otro» abre el campo con el foco");
    await escribir(page, "Llega el viernes");
    await page.getByRole("radio", { name: "1 a 2 semanas" }).tap();
    await captura(page, "4-cuando-llega", ancho);
    await seguir(page);
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    const p = await productoCreado(page, "Aretes por encargo");
    ok(p && p.rubro === "accesorios" && p.porEncargo && p.encargoTexto === "Llega en 1 a 2 semanas" && p.stock === 0, "Guardado en Accesorios, por encargo, «Llega en 1 a 2 semanas», sin stock");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• «Tiene tallas o colores» abre el flujo de presentaciones de hoy y vuelve a la historia");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrir(page);
    await subirFoto(page, "#579");
    await seguir(page);
    await escribir(page, "Camiseta tallas");
    await seguir(page);
    await escribir(page, "900");
    await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
    const flujo = page.getByRole("dialog").last();
    await flujo.getByRole("button", { name: "XS a XL", exact: true }).tap();
    await flujo.getByRole("button", { name: "Siguiente · 5 presentaciones", exact: true }).tap();
    await flujo.getByRole("button", { name: /^Listo ·/ }).tap();
    await page.waitForTimeout(700);
    ok((await paso(page)) === "precio" && (await page.locator("[data-chip-presentaciones]").innerText()).includes("Talla · 5"), "De vuelta en el precio, el chip dice «Talla · 5»");
    await seguir(page);
    ok((await page.locator(H).innerText()).includes("5 presentaciones"), "El paso de stock resume las presentaciones");
    await seguir(page);
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    const d = await db(page);
    const p = d.productos.find((x) => x.nombre === "Camiseta tallas");
    ok(p && d.variantes.filter((v) => v.productoId === p.id).length === 5 && p.opciones[0].nombre === "Talla", "Publicado con sus 5 presentaciones");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Catálogo lleno, «Van N de 5» y salir con cambios (Esencias Michel, un solo catálogo)");
  {
    // Lleno: el límite del plan igual a los visibles.
    const lleno = demoCon((d) => {
      d.tiendas.find((x) => x.id === MICHEL).limiteProductos = d.productos.filter((p) => p.tiendaId === MICHEL && p.activo && !p.eliminadoEn).length;
    });
    const { ctx, page, errores } = await pagina(ancho, MICHEL, lleno);
    await abrir(page);
    ok((await page.getByText("¿En qué catálogo va?").count()) === 0, "Un solo catálogo: no pregunta en cuál");
    await subirFoto(page, "#d9a");
    await seguir(page);
    await escribir(page, "Oud lleno");
    await seguir(page);
    await escribir(page, "2500");
    await seguir(page);
    await seguir(page);
    ok(await boton(page, "Publicar").isDisabled() && await page.locator("[data-catalogo-lleno]").isVisible(), "Lleno: «Publicar» apagado con «Tu catálogo está lleno…»");
    ok((await page.locator('[data-opcional="Detalles"]').count()) === 1, "Perfumes: la pastilla «Detalles»");
    await captura(page, "5-catalogo-lleno", ancho);
    await boton(page, "Guardar sin publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    ok((await productoCreado(page, "Oud lleno"))?.activo === false, "Se guardó oculto");

    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }
  {
    // Pocos productos visibles (uno con foto): «Van N de 5 para arrancar.»
    const pocos = demoCon((d) => {
      let n = 0;
      for (const p of d.productos) if (p.tiendaId === MICHEL && p.activo) p.activo = n++ < 1;
    });
    const { ctx, page, errores } = await pagina(ancho, MICHEL, pocos);
    await abrir(page);
    await subirFoto(page, "#ab7");
    await seguir(page);
    await escribir(page, "Oud nuevo");
    await seguir(page);
    await escribir(page, "3000");
    await seguir(page);
    await seguir(page);
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    ok((await page.locator("[data-arranque]").innerText()) === "Van 2 de 5 para arrancar.", "«Van 2 de 5 para arrancar.»");

    // Salir con cambios: la ✕ avisa.
    await boton(page, "Agregar otro").tap();
    await page.waitForTimeout(200);
    await boton(page, "Seguir sin foto").tap();
    await escribir(page, "Se queda");
    await page.locator("[data-hoja-cabecera]").getByRole("button", { name: "Cerrar" }).tap();
    await page.getByRole("alertdialog").waitFor();
    ok(await page.getByRole("alertdialog").getByText("¿Salir sin guardar?").isVisible(), "Salir con cambios: «¿Salir sin guardar?»");
    await captura(page, "salir-con-cambios", ancho);
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }
}

await navegador.close();
console.log("\nListo.");
