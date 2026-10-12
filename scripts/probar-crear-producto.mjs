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
async function pagina(ancho, tienda, demo = null, alto = 844) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
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
/** Una foto de prueba (cuadrada, horizontal o vertical). */
const png = (page, color, ancho = 600, alto = 600) =>
  page.evaluate(({ c, w, h }) => {
    const l = document.createElement("canvas");
    l.width = w;
    l.height = h;
    const x = l.getContext("2d");
    x.fillStyle = c;
    x.fillRect(0, 0, w, h);
    return l.toDataURL("image/png").split(",")[1];
  }, { c: color, w: ancho, h: alto });
/**
 * La tarjeta «así se verá» del lienzo: 372 px de alto, de margen a margen (20 px a cada lado, el ancho del título y del campo),
 * siempre en el mismo lugar, y la foto la cubre (`cover`). Devuelve dónde empieza, para comparar entre pasos.
 */
const TOP_TARJETA = new Map();
async function tarjeta(page, nombre, clave = "tarjeta") {
  const r = await page.locator("[data-tarjeta-asi-se-vera]").evaluate((el) => {
    const caja = el.getBoundingClientRect();
    const hoja = el.closest("[data-hoja-panel]").getBoundingClientRect();
    const img = el.querySelector("img");
    const i = img?.getBoundingClientRect();
    return { x: caja.x - hoja.x, y: caja.y, w: caja.width, h: caja.height, util: hoja.width - 40, cubre: img ? getComputedStyle(img).objectFit === "cover" && Math.abs(i.width - caja.width) < 2 && Math.abs(i.height - caja.height) < 2 : null };
  });
  const top = TOP_TARJETA.get(clave);
  if (top === undefined) TOP_TARJETA.set(clave, r.y);
  ok(Math.abs(r.h - 372) < 1 && Math.abs(r.w - r.util) < 1 && Math.abs(r.x - 20) < 1 && r.cubre !== false && (top === undefined || Math.abs(top - r.y) < 1),
    `${nombre}: tarjeta ${Math.round(r.w)}×${Math.round(r.h)} de margen a margen, en y=${Math.round(r.y)}${top === undefined ? "" : " (el mismo lugar)"}${r.cubre ? ", foto en cover" : ""}`);
}
/** La barra de abajo es sólida (el fondo de la hoja, sin transparencia) y ocupa todo el ancho: nada asoma por ella ni a sus lados. */
async function pieOpaco(page, nombre) {
  const r = await page.locator("[data-pie-historia]").evaluate((e) => {
    const c = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    return { fondo: c.backgroundColor, ancho: b.width, hoja: e.closest("[data-hoja-panel]").getBoundingClientRect().width };
  });
  ok(/^rgb\(/.test(r.fondo) && Math.abs(r.ancho - r.hoja) < 1, `${nombre}: la barra de abajo es sólida y de lado a lado (${r.fondo})`);
}
/** Al final del contenido, nada queda detrás de la barra fija de abajo. */
async function nadaDetrasDelPie(page, sel, nombre) {
  await page.locator("[data-hoja-contenido]").evaluate((e) => e.scrollTo(0, e.scrollHeight));
  await page.waitForTimeout(150);
  const abajo = await page.locator(sel).last().evaluate((e) => e.getBoundingClientRect().bottom);
  const pie = await page.locator("[data-pie-historia]").evaluate((e) => e.getBoundingClientRect().top);
  ok(abajo <= pie, `${nombre}: al bajar, queda por encima de la barra de abajo (${Math.round(abajo)} ≤ ${Math.round(pie)})`);
}

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
async function subirFoto(page, color = "#c8a2c8", ancho = 600, alto = 600) {
  const b = await png(page, color, ancho, alto);
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
    await tarjeta(page, "Paso 1 sin foto, el marco");
    ok((await page.locator("[data-con-foto]").innerText()) === "Con foto se vende más." && (await page.locator("[data-con-foto]").evaluate((e) => getComputedStyle(e).fontFamily)).includes("Caveat"), "«Con foto se vende más.» a mano junto al marco");
    ok((await page.getByText("así se verá").count()) === 0, "En el paso 1 no sale «así se verá»");
    ok((await page.locator("[data-entrada-camara]").getAttribute("capture")) === "environment", "«Tomar foto» abre la cámara (capture)");
    await captura(page, "1-foto-vacia", ancho);
    await subirFoto(page, "#c8a2c8", 900, 500);
    ok(await page.getByText("Portada").first().isVisible(), "Con foto: la tira con la portada");
    await tarjeta(page, "Paso 1 con una foto horizontal");
    await captura(page, "1-foto", ancho);
    await seguir(page);
    ok((await paso(page)) === "nombre" && (await barras(page)) === "2", "Paso 2: ¿Cómo se llama? (barra 2)");
    ok((await enfocado(page)) === "campo", "…con el foco en el campo en el mismo toque");
    ok(await boton(page, "Seguir").isDisabled(), "…«Seguir» apagado sin nombre");
    await escribir(page, "Hoodie Deslizapp");
    ok((await page.locator("[data-tarjeta-asi-se-vera]").innerText()).includes("Hoodie Deslizapp"), "El nombre aparece en la tarjeta mientras se escribe");
    await tarjeta(page, "Paso 2");
    await captura(page, "2-nombre", ancho);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
    ok((await paso(page)) === "precio" && (await enfocado(page)) === "campo", "Enter lleva al precio con el foco en su campo");
    await escribir(page, "1450");
    ok((await page.locator("[data-precio-tarjeta]").innerText()) === "RD$1,450", "El precio aparece en la tarjeta");
    ok(await page.locator("[data-chip-presentaciones]").getByText("Tiene tallas o colores").isVisible(), "Chip «Tiene tallas o colores»");
    await tarjeta(page, "Paso 3");
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
    {
      const menos = page.locator("[data-contador-stock]").getByRole("button", { name: "Quitar uno" });
      for (let i = 0; i < 3; i++) await menos.tap();
      ok(await boton(page, "Seguir").isDisabled(), "Con 0 (y sin «por encargo») no se sigue: la vista previa nunca dice «Agotado»");
      for (let i = 0; i < 3; i++) await mas.tap();
    }
    await tarjeta(page, "Paso 4");
    await captura(page, "4-stock", ancho);
    await seguir(page);
    ok((await paso(page)) === "vista" && (await barras(page)) === "5", "Paso 5: Así se ve en tu catálogo");
    const marco = page.frameLocator("[data-reel-historia] iframe");
    await marco.locator("[data-reel-solo] .reel").first().waitFor({ timeout: 20000 });
    ok((await marco.locator("[data-reel-solo]").innerText()).includes("Hoodie Deslizapp"), "El reel real del comprador con el borrador");
    ok((await marco.locator(".hdr, .htabs").count()) === 0, "…solo el reel: sin cabecera ni pestañas del catálogo");
    {
      // El reel se arma a 390×488 (su tamaño de siempre) y se reduce en proporción al ancho de la tarjeta, sin recortarse.
      const marcoCaja = await page.locator("[data-reel-historia]").boundingBox();
      const iframe = await page.locator("[data-reel-historia] iframe").boundingBox();
      const dentro = await marco.locator(".reel").first().evaluate((e) => ({ w: e.offsetWidth, h: e.offsetHeight }));
      const util = ancho - 40;
      ok(Math.abs(marcoCaja.width - util) < 1 && Math.abs(marcoCaja.height - (util * 488) / 390) < 1.5, `…tarjeta del reel ${Math.round(marcoCaja.width)}×${Math.round(marcoCaja.height)} (proporción 390:488)`);
      ok(dentro.w === 390 && dentro.h === 488 && Math.abs(iframe.width - marcoCaja.width) < 1 && Math.abs(iframe.height - marcoCaja.height) < 1.5, "…el reel real a 390×488, reducido en proporción al marco");
      const fuera = await marco.locator("[data-reel-solo] .reel").first().evaluate((r) => {
        const b = r.getBoundingClientRect();
        // Lo de dentro de `.media` (la foto con su zoom lento) ya lo recorta el reel, como en el catálogo.
        return [...r.querySelectorAll("*")].filter((e) => !e.closest(".media")).filter((e) => { const x = e.getBoundingClientRect(); return x.width > 0 && x.height > 0 && getComputedStyle(e).visibility !== "hidden" && (x.top < b.top - 1 || x.bottom > b.bottom + 1); }).length;
      });
      ok(fuera === 0, `…nada del reel se sale ni se corta (${fuera})`);
    }
    // En reposo (sin desplazar), en un teléfono de 844 px de alto, las pastillas no quedan detrás de «Publicar».
    const ultima = await page.locator("[data-opcional]").last().evaluate((e) => e.getBoundingClientRect().bottom);
    const techo = await page.locator("[data-pie-historia]").evaluate((e) => e.getBoundingClientRect().top);
    // Al ancho del lienzo (390) cabe todo sin desplazar; más ancho, el reel crece y se desplaza (lo prueba nadaDetrasDelPie).
    if (ancho <= 393) ok(ultima <= techo, `…y sin desplazar, los opcionales quedan por encima de «Publicar» (${Math.round(ultima)} ≤ ${Math.round(techo)})`);
    ok(await boton(page, "Publicar").isEnabled() && await boton(page, "Guardar sin publicar").isVisible(), "«Publicar» y «Guardar sin publicar»");
    await nadaDetrasDelPie(page, "[data-opcional]", "Paso 5, las pastillas opcionales");
    await pieOpaco(page, "Paso 5");
    await page.locator("[data-hoja-contenido]").evaluate((e) => e.scrollTo(0, 0));
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
    ok(await page.getByText("Con foto se vende más.").isVisible() && await boton(page, "Seguir sin foto").isVisible(), "Sin foto se puede seguir («Seguir sin foto»)");
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
    await subirFoto(page, "#7aa", 500, 900);
    const SEL = "[data-hoja-cabecera] [data-selector-catalogo]";
    ok((await page.getByText("¿En qué catálogo va?").count()) === 0, "El catálogo no es una pregunta");
    ok(((await page.locator(SEL).getAttribute("aria-label")) ?? "").includes("Ropa"), "Está en la cabecera, junto a las barras, con el catálogo abierto (Ropa)");
    {
      const sel = await page.locator(SEL).boundingBox();
      const bar = await page.locator("[data-barras-historia]").boundingBox();
      ok(Math.abs(sel.y + sel.height / 2 - (bar.y + bar.height / 2)) < 4 && sel.x + sel.width <= bar.x, "…en la misma fila, a la izquierda de las barras");
    }
    await page.locator(SEL).tap();
    await page.locator("[data-menu-flotante]").getByRole("menuitemradio", { name: /^Accesorios/ }).tap();
    await page.waitForTimeout(300);
    await seguir(page);
    await tarjeta(page, "Paso 2 con una foto vertical", "vertical");
    await escribir(page, "Aretes por encargo");
    await captura(page, "2-nombre-catalogos", ancho);
    await seguir(page);
    await escribir(page, "650");
    await seguir(page);
    await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).tap();
    await page.waitForTimeout(100);
    ok((await titulo(page)) === "¿Cuándo llega?" && (await page.locator("[data-contador-stock]").count()) === 0, "Por encargo: «¿Cuándo llega?» y sin contador");
    ok(await boton(page, "Seguir").isDisabled(), "…«Seguir» apagado hasta elegir cuándo");
    await page.getByRole("radio", { name: "Otro" }).tap();
    await page.waitForTimeout(100);
    ok((await enfocado(page)) === "campo", "«Otro» abre el campo con el foco");
    await escribir(page, "Llega el viernes");
    // Apagar y volver a prender el encargo no esconde lo escrito en «Otro».
    await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).tap();
    await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).tap();
    ok((await page.getByRole("radio", { name: "Otro" }).getAttribute("aria-checked")) === "true" && (await page.locator("[data-campo-paso]").inputValue()) === "Llega el viernes", "Al volver a prender el encargo, «Otro» sigue elegido con lo escrito");
    await page.getByRole("radio", { name: "1 a 2 semanas" }).tap();
    ok((await page.locator("[data-campo-paso]").count()) === 0, "Una opción rápida cierra el campo de «Otro»");
    await captura(page, "4-cuando-llega", ancho);
    await seguir(page);
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    const p = await productoCreado(page, "Aretes por encargo");
    ok(p && p.rubro === "accesorios" && p.porEncargo && p.encargoTexto === "Llega en 1 a 2 semanas" && p.stock === 0, "Guardado en Accesorios, por encargo, «Llega en 1 a 2 semanas», sin stock");
    // Recuerda el último catálogo usado (por tienda): «Agregar otro» y una visita nueva salen en Accesorios.
    await boton(page, "Agregar otro").tap();
    await page.waitForTimeout(300);
    ok(((await page.locator(SEL).getAttribute("aria-label")) ?? "").includes("Accesorios"), "«Agregar otro» sale con el último catálogo usado (Accesorios)");
    await abrir(page);
    ok(((await page.locator(SEL).getAttribute("aria-label")) ?? "").includes("Accesorios"), "…y al volver a crear, también");
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
    await flujo.getByRole("button", { name: "Agregar uno a todas", exact: true }).tap();
    await flujo.getByRole("button", { name: /^Listo ·/ }).tap();
    await page.waitForTimeout(700);
    ok((await paso(page)) === "precio" && (await page.locator("[data-chip-presentaciones]").innerText()).includes("Talla · 5"), "De vuelta en el precio, el chip dice «Talla · 5»");
    await seguir(page);
    ok((await page.locator(H).innerText()).includes("5 presentaciones · 5 en total"), "El paso de stock resume las presentaciones (5 en total)");
    // Por encargo no lleva stock: tampoco las presentaciones.
    await page.getByRole("button", { name: "Es por encargo, no llevo stock" }).tap();
    await page.getByRole("radio", { name: "1 mes" }).tap();
    await seguir(page);
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    const d = await db(page);
    const p = d.productos.find((x) => x.nombre === "Camiseta tallas");
    const suyas = d.variantes.filter((v) => v.productoId === p?.id);
    ok(p && suyas.length === 5 && p.opciones[0].nombre === "Talla", "Publicado con sus 5 presentaciones");
    ok(p.porEncargo && p.encargoTexto === "Llega en 1 mes" && suyas.every((v) => v.stock === 0), "Por encargo: las presentaciones se guardan sin stock (0)");
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
    {
      const aviso = await page.locator("[data-catalogo-lleno]").boundingBox();
      const pub = await boton(page, "Publicar").boundingBox();
      const dentro = await page.locator("[data-pie-historia] [data-catalogo-lleno]").count();
      ok(dentro === 1 && aviso.y + aviso.height <= pub.y && aviso.y >= 0, "…el aviso va completo en la barra, encima de «Publicar»");
    }
    await pieOpaco(page, "Lleno");
    await nadaDetrasDelPie(page, "[data-opcional]", "Lleno, las pastillas opcionales");
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
    ok((await page.locator("[data-linea-celebracion]").innerText()) === "Oud nuevo ya se puede deslizar. Van 2 de 5 para arrancar.", "«Oud nuevo ya se puede deslizar. Van 2 de 5 para arrancar.» (una línea, como el lienzo)");

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

console.log("\n=== Pantalla baja (360×640) con el catálogo lleno: barra sólida, aviso completo y nada tapado ===");
{
  const lleno = demoCon((d) => {
    d.tiendas.find((x) => x.id === MICHEL).limiteProductos = d.productos.filter((p) => p.tiendaId === MICHEL && p.activo && !p.eliminadoEn).length;
  });
  const { ctx, page, errores } = await pagina(360, MICHEL, lleno, 640);
  await abrir(page);
  await subirFoto(page, "#d9a");
  await seguir(page);
  await escribir(page, "Oud bajo lleno");
  await seguir(page);
  await escribir(page, "2500");
  await seguir(page);
  await seguir(page);
  ok(await boton(page, "Publicar").isDisabled() && (await page.locator("[data-pie-historia] [data-catalogo-lleno]").isVisible()), "360×640 lleno: «Publicar» apagado y el aviso en la barra");
  await pieOpaco(page, "360×640 lleno");
  await nadaDetrasDelPie(page, "[data-opcional]", "360×640 lleno, las pastillas opcionales");
  await page.locator("[data-hoja-contenido]").evaluate((e) => e.scrollTo(0, 0));
  await captura(page, "5-catalogo-lleno-pantalla-baja", 360);
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Pantalla baja (360×640): la tarjeta no se encoge; el contenido se desplaza y el campo queda a la vista ===");
{
  const { ctx, page, errores } = await pagina(360, MICHEL, null, 640);
  await abrir(page);
  await subirFoto(page, "#9b7");
  await seguir(page);
  await tarjeta(page, "Nombre a 360×640", "baja");
  const aLaVista = async (nombre) => {
    // Sin tocar nada: al llegar al paso, la hoja ya desplazó el campo enfocado sobre la barra de abajo.
    await page.waitForTimeout(200);
    const c = await page.locator("[data-campo-paso]").boundingBox();
    const pie = await page.locator("[data-pie-historia]").boundingBox();
    ok(c.y >= 0 && c.y + c.height <= pie.y, `${nombre}: al llegar, el campo enfocado queda sobre «Seguir»`);
  };
  await aLaVista("Nombre");
  await escribir(page, "Oud bajo");
  await seguir(page);
  await aLaVista("Precio");
  await captura(page, "3-precio-pantalla-baja", 360);
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

await navegador.close();
console.log("\nListo.");
