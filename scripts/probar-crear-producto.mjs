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
  const r = await page.locator("[data-tarjeta-asi-se-vera], [data-marco-foto]").evaluate((el) => {
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
  await page.locator("[data-marco-foto] img").waitFor();
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
    ok((await page.locator("[data-marco-foto]").count()) === 1 && (await page.getByText("Tu foto va aquí").isVisible()), "Sin foto: el marco punteado con la cámara");
    {
      // Prototipo v4: una HOJA (borde en y=78 a 844 de alto) con agarradera; fila 1 «Nuevo producto», fila 2 barras + ✕.
      const hoja = await page.locator("[data-hoja-panel]").boundingBox();
      const tit = await page.locator("[data-hoja-cabecera] h2").boundingBox();
      const bar = await page.locator("[data-barras-historia]").boundingBox();
      const x = await page.locator("[data-hoja-cabecera]").getByRole("button", { name: "Cerrar" }).boundingBox();
      ok(Math.abs(hoja.y - 78) < 1 && (await page.locator("[data-hoja-cabecera] h2").innerText()) === "Nuevo producto", `Es una hoja con su hueco arriba (borde en y=${Math.round(hoja.y)}) y «Nuevo producto» visible`);
      ok(tit.y + tit.height <= bar.y && Math.abs(x.y + x.height / 2 - (bar.y + bar.height / 2)) < 2 && x.x >= bar.x + bar.width, "…fila 1 el título; fila 2 las barras y la ✕");
      const t = await page.locator("[data-marco-foto]").boundingBox();
      ok(Math.abs(t.y - 180) < 1.5, `…el contenido empieza en y=${Math.round(t.y)} (180)`);
      const atras = await boton(page, "Atrás").boundingBox();
      const pieTop = await page.locator("[data-pie-historia]").boundingBox();
      ok(atras.width === 52 && atras.y >= pieTop.y && (await boton(page, "Atrás").isDisabled()), "«Atrás» abajo (52 px), apagado en la primera pregunta");
      ok((await page.locator("[data-hoja-cabecera]").getByRole("button", { name: "Atrás" }).count()) === 0, "…y no hay ‹ en la cabecera");
    }
    ok(await boton(page, "Tomar foto").isVisible() && await boton(page, "Elegir de la galería").isVisible(), "«Tomar foto» y «Elegir de la galería»");
    {
      const a = await boton(page, "Tomar foto").boundingBox();
      const b = await boton(page, "Elegir de la galería").boundingBox();
      ok(Math.abs(a.y - b.y) < 1 && a.x + a.width <= b.x, "…en una fila");
    }
    await tarjeta(page, "Paso 1 sin foto, el marco");
    ok((await page.locator("[data-con-foto]").innerText()) === "Con foto se vende más." && (await page.locator("[data-con-foto]").evaluate((e) => getComputedStyle(e).fontFamily)).includes("Caveat"), "«Con foto se vende más.» a mano, al final");
    ok((await page.getByText("así se verá").count()) === 0, "En el paso 1 no sale «así se verá»");
    ok((await page.locator("[data-entrada-camara]").getAttribute("capture")) === "environment", "«Tomar foto» abre la cámara (capture)");
    await captura(page, "1-foto-vacia", ancho);
    await subirFoto(page, "#c8a2c8", 900, 500);
    ok(await page.getByText("Portada").first().isVisible(), "Con foto: la tira con la portada");
    ok((await page.locator("[data-titulo-paso]").count()) === 0 && (await boton(page, "Tomar foto").count()) === 0, "…sin el título ni los botones de antes");
    {
      const fin = await page.locator("[data-con-foto]").boundingBox();
      const tira = await page.getByText("Hasta 10. Mantén presionado para ordenar.").boundingBox();
      ok(fin.y > tira.y && (await page.locator("[data-hueco-retoque]").count()) === 1, "…«Con foto se vende más.» al final, con sitio debajo para el retoque");
    }
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
    ok((await page.locator("[data-chip-presentaciones]").count()) === 0 && (await page.locator("[data-precio-tarjeta]").count()) === 0, "Sin precio: ni el chip ni el precio en la tarjeta (nada antes de tiempo)");
    ok((await page.locator("[data-titulo-paso]").evaluate((e) => getComputedStyle(e).fontSize)) === "26px", "Títulos de pregunta a 26 px");
    await escribir(page, "1450");
    ok((await page.locator("[data-precio-tarjeta]").innerText()) === "RD$1,450", "El precio aparece en la tarjeta");
    ok(await page.locator("[data-chip-presentaciones]").getByText("Tiene tallas o colores").isVisible(), "Chip «Tiene tallas o colores» (con precio)");
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
    ok((await page.locator("[data-celebracion] .cel-vivo").count()) === 5 && (await page.locator("[data-burbuja]").count()) === 2 && (await page.getByText("¡Lo quiero!").isVisible()), "Corazones y burbujas de mensaje alrededor de la foto");
    ok((await page.locator("[data-celebracion] .cel-vivo").first().evaluate((e) => getComputedStyle(e).animationName)).includes("cel-pop"), "…animados (pop y flotar)");
    ok((await boton(page, "Atrás").count()) === 0, "En la celebración no hay «Atrás»");
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
    // Regla de Lewis: sin foto no se publica; se guarda como borrador oculto.
    ok(await boton(page, "Publicar").isDisabled() && (await page.locator("[data-falta-foto]").innerText()).includes("Agrega una foto para publicar"), "Sin foto: «Publicar» apagado con «Agrega una foto para publicar · Volver a la foto»");
    ok(await page.frameLocator("[data-reel-historia] iframe").locator("[data-reel-sin-foto]").isVisible(), "…el reel dice «Sin foto»");
    await captura(page, "5-sin-foto", ancho);
    await boton(page, "Volver a la foto").tap();
    await page.waitForTimeout(150);
    ok((await paso(page)) === "foto", "«Volver a la foto» regresa al primer paso");
    await boton(page, "Seguir sin foto").tap();
    await seguir(page);
    await seguir(page);
    await seguir(page);
    ok(await boton(page, "Guardar sin publicar").isEnabled(), "«Guardar sin publicar» sigue activo");
    await boton(page, "Guardar sin publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    ok(await page.getByText("¡Quedó guardado!").isVisible(), "Sin publicar: «¡Quedó guardado!»");
    const p = await productoCreado(page, "Gorra sin foto");
    ok(p && !p.activo && p.medios.length === 0 && p.precio === 800, "Guardado oculto y sin foto");
    await captura(page, "6-guardado-sin-publicar", ancho);
    await page.locator("[data-hoja-cabecera]").getByRole("button", { name: "Cerrar", exact: true }).tap();
    await page.waitForURL(`${URL}/catalogo`);
    await page.getByRole("link", { name: /^Gorra sin foto/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
    ok((await page.getByRole("link", { name: /^Gorra sin foto.*Sin foto/ }).count()) === 1, "En el panel, el borrador oculto sin foto dice «Sin foto»");
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
    ok(((await page.locator(SEL).getAttribute("aria-label")) ?? "").includes("Ropa"), "Está en la cabecera con el catálogo abierto (Ropa)");
    {
      const sel = await page.locator(SEL).boundingBox();
      const bar = await page.locator("[data-barras-historia]").boundingBox();
      const tit = await page.locator("[data-hoja-cabecera] h2").boundingBox();
      ok(Math.abs(sel.y + sel.height / 2 - (tit.y + tit.height / 2)) < 3 && sel.x > tit.x + tit.width && sel.y + sel.height / 2 < bar.y, "…en la fila del título, a su derecha");
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
    await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).tap();
    await page.waitForTimeout(100);
    ok((await titulo(page)) === "¿Cuándo llega?" && (await page.locator("[data-contador-stock]").count()) === 0, "Por encargo: «¿Cuándo llega?» y sin contador");
    ok(await boton(page, "Seguir").isDisabled(), "…«Seguir» apagado hasta elegir cuándo");
    await page.getByRole("radio", { name: "Otro" }).tap();
    await page.waitForTimeout(100);
    ok((await enfocado(page)) === "campo", "«Otro» abre el campo con el foco");
    await escribir(page, "Llega el viernes");
    // Apagar y volver a prender el encargo no esconde lo escrito en «Otro».
    await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).tap();
    await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).tap();
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
    // Cambiarlo en un borrador que se abandona no cambia el de la próxima vez (solo cuenta lo creado).
    await page.locator(SEL).tap();
    await page.locator("[data-menu-flotante]").getByRole("menuitemradio", { name: /^Ropa/ }).tap();
    await page.waitForTimeout(300);
    await abrir(page);
    ok(((await page.locator(SEL).getAttribute("aria-label")) ?? "").includes("Accesorios"), "Un borrador abandonado en Ropa no cambia el recordado (Accesorios)");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Presentaciones como historia: ¿en qué cambia? → tallas → colores (7 barras) y la hoja «Inventario» encima");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrir(page);
    await subirFoto(page, "#579");
    await seguir(page);
    await escribir(page, "Camiseta tallas");
    await seguir(page);
    await escribir(page, "900");
    await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
    await page.waitForTimeout(150);
    ok((await paso(page)) === "cambia" && (await titulo(page)) === "¿En qué cambia?", "«Tiene tallas o colores» lleva a «¿En qué cambia?»");
    ok((await page.locator("[data-barras-historia] span").count()) === 7 && (await barras(page)) === "4", "…con 7 barras en vez de 5 (la 4.ª llena)");
    {
      const t = await page.locator("[data-tarjeta-presentaciones]").boundingBox();
      ok(Math.abs(t.height - 212) < 1 && Math.abs(t.width - (ancho - 40)) < 1 && Math.abs(t.y - 180) < 1.5, `Tarjeta «así se verá» de ${Math.round(t.width)}×${Math.round(t.height)} en y=${Math.round(t.y)}`);
      ok((await page.locator("[data-tarjeta-presentaciones]").getAttribute("aria-label")).includes("Desde RD$900"), "…con «Desde RD$900»");
    }
    const qc = page.locator("[data-que-cambia]");
    ok((await qc.getByRole("checkbox", { name: "Talla", exact: true }).getAttribute("aria-checked")) === "true" && (await qc.getByRole("checkbox", { name: "Color", exact: true }).getAttribute("aria-checked")) === "true", "Ropa arranca con Talla y Color elegidas");
    await captura(page, "p1-que-cambia", ancho);
    await seguir(page);
    ok((await titulo(page)) === "¿Qué tallas hay?" && (await barras(page)) === "5", "«¿Qué tallas hay?» (barra 5)");
    ok(await boton(page, "Seguir").isDisabled(), "…«Seguir» apagado sin tallas");
    await boton(page, "XS a XL").tap();
    ok((await page.locator("[data-pildora-eje]").innerText()) === "Talla XS · S · M · L · XL", "«XS a XL» las elige y la tarjeta dice «Talla XS · S · M · L · XL»");
    await page.getByRole("checkbox", { name: "XS", exact: true }).tap();
    await page.getByRole("checkbox", { name: "XL", exact: true }).tap();
    await captura(page, "p2-tallas", ancho);
    await seguir(page);
    ok((await titulo(page)) === "¿Y qué colores?" && (await barras(page)) === "6", "«¿Y qué colores?» (barra 6)");
    await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
    await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
    ok((await page.locator("[data-puntos-color] span").count()) === 2, "La tarjeta suma los puntos de color");
    ok((await page.locator("[data-foto-cada-color] button").count()) === 2 && (await page.locator("[data-foto-cada-color] button").first().isEnabled()), "«Foto de cada color · opcional» con una tarjeta por color");
    await page.locator("[data-foto-cada-color] button").first().tap();
    await page.getByRole("dialog", { name: "Foto de Negro" }).getByRole("radio").first().tap();
    await page.getByRole("dialog", { name: "Foto de Negro" }).getByRole("button", { name: "Listo", exact: true }).tap();
    await page.waitForTimeout(600);
    ok((await page.locator("[data-foto-cada-color] button").first().innerText()).includes("Foto 1"), "Negro queda con la foto 1");
    await captura(page, "p3-colores", ancho);
    await seguir(page);
    const inv = page.locator("[data-inventario-historia]");
    await inv.waitFor();
    await page.waitForTimeout(500);
    {
      const hojas = await page.locator("[data-hoja-panel]").evaluateAll((l) => l.map((e) => Math.round(e.getBoundingClientRect().y)));
      ok(hojas.length === 2 && hojas[0] === 78 && hojas[1] === 118, `«Inventario» es otra hoja encima (y=${hojas.join(", ")})`);
    }
    ok((await inv.locator("[data-grupo-inventario]").count()) === 2 && (await inv.locator("[data-fila-inventario]").count()) === 6, "Un grupo por color (Negro, Blanco) con una fila por talla");
    ok(await boton(page, "Listo · 0 en total").isDisabled(), "«Listo · 0 en total» apagado: con 0 no se llega a «Así se ve»");
    await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
    await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
    await page.getByRole("button", { name: "Agregar uno de Negro · M" }).tap();
    ok((await inv.locator('[data-grupo-inventario="Negro"] [data-grupo-total]').innerText()) === "7 en total", "«Poner a todas» y el + de una fila: Negro, 7 en total");
    ok(await boton(page, "Listo · 13 en total").isEnabled(), "«Listo · 13 en total»");
    await captura(page, "i1-inventario", ancho);
    // Por encargo dentro del Inventario: sin cantidades y con su plazo.
    await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).tap();
    ok((await inv.locator("[data-fila-inventario]").count()) === 0 && await boton(page, "Listo · por encargo").isDisabled(), "Por encargo: sin cantidades y «Listo · por encargo» espera el plazo");
    await page.getByRole("radio", { name: "1 mes" }).tap();
    ok((await inv.locator("[data-nota-encargo]").innerText()).includes("«Llega en 1 mes»") && await boton(page, "Listo · por encargo").isEnabled(), "…«Llega en 1 mes» y se prende");
    await captura(page, "i2-por-encargo", ancho);
    await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).tap();
    ok(await boton(page, "Listo · 13 en total").isEnabled(), "Al apagarlo vuelven las cantidades (13)");
    // El detalle de una presentación (hoja inferior): precio propio.
    await inv.locator('[data-fila-inventario="Blanco · S"] button').first().tap();
    const det = page.locator("[data-hoja-presentacion]");
    await det.waitFor();
    await page.waitForTimeout(400);
    await det.getByRole("radio", { name: "Uno propio" }).tap();
    await det.locator("input").tap();
    await page.keyboard.type("1100");
    await captura(page, "i3-detalle", ancho);
    ok((await det.getByRole("button", { name: "Atrás" }).count()) === 1, "El detalle lleva «‹» junto a «Listo»");
    await det.getByRole("button", { name: "Listo", exact: true }).tap();
    await page.waitForTimeout(600);
    ok((await inv.locator('[data-fila-inventario="Blanco · S"]').innerText()).includes("RD$1,100"), "La fila muestra su precio propio");
    await boton(page, "Listo · 13 en total").tap();
    await page.waitForTimeout(600);
    ok((await page.locator("[data-resumen-inventario]").innerText()).replace(/\s+/g, " ").includes("6 presentaciones · 13 en total"), "De vuelta: «Inventario · 6 presentaciones · 13 en total» con «Editar»");
    await page.locator("[data-hoja-contenido]").first().evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await captura(page, "p4-resumen", ancho);
    // Quitar un valor con cantidades pregunta; las que siguen conservan lo suyo.
    await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
    await page.getByRole("alertdialog").waitFor();
    ok((await page.getByRole("alertdialog").innerText()).includes("Se pierden 6 unidades del inventario y su precio propio."), "Quitar Blanco (con 6 y un precio propio) pregunta antes");
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).tap();
    await page.waitForTimeout(300);
    await page.getByRole("checkbox", { name: "Rojo", exact: true }).tap();
    ok((await page.locator("[data-resumen-inventario]").innerText()).replace(/\s+/g, " ").includes("9 presentaciones · 13 en total"), "Sumar Rojo: las nuevas empiezan en 0 y lo demás se conserva (9 · 13)");
    await page.getByRole("checkbox", { name: "Rojo", exact: true }).tap();
    await seguir(page);
    ok((await paso(page)) === "vista" && (await barras(page)) === "7", "«Seguir» sigue a «Así se ve» (barra 7)");
    const marco = page.frameLocator("[data-reel-historia] iframe");
    await marco.locator("[data-reel-solo] .reel").first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(800);
    ok((await marco.locator("[data-reel-solo]").innerText()).includes("Ver presentaciones"), "El reel con «Ver presentaciones»");
    await captura(page, "p5-asi-se-ve", ancho);
    await boton(page, "Atrás").tap();
    ok((await paso(page)) === "eje2", "«‹» vuelve a los colores");
    await seguir(page);
    await boton(page, "Publicar").tap();
    await page.locator("[data-celebracion]").waitFor();
    const d = await db(page);
    const p = d.productos.find((x) => x.nombre === "Camiseta tallas");
    const suyas = d.variantes.filter((v) => v.productoId === p?.id);
    ok(p && suyas.length === 6 && p.opciones.map((o) => o.nombre).join(",") === "Color,Talla", "Publicado con 6 presentaciones (Color, Talla)");
    ok(suyas.filter((v) => v.stock === 2).length === 5 && suyas.some((v) => v.stock === 3) && suyas.some((v) => v.precio === 1100), "…con sus cantidades y el precio propio");
    ok(p.fotosPorValor?.Color?.Negro, "…y la foto de Negro");
    ok((await page.locator("[data-burbuja]").first().innerText()) === "¿Tienes en M?", "La burbuja pregunta por la talla del medio («¿Tienes en M?»), no por un color");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Presentaciones sin fotos: «Foto de cada color» apagada con su pista; volver de «¿En qué cambia?» sin nada deja un solo stock");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrir(page);
    await boton(page, "Seguir sin foto").tap();
    await escribir(page, "Gorra colores");
    await seguir(page);
    await escribir(page, "500");
    await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
    await page.waitForTimeout(150);
    await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
    await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
    ok((await page.locator("[data-barras-historia] span").count()) === 7 && await boton(page, "Seguir").isDisabled(), "Sin nada elegido: «Seguir» apagado");
    await boton(page, "Atrás").tap();
    ok((await paso(page)) === "precio" && (await page.locator("[data-barras-historia] span").count()) === 5, "«‹» sin nada elegido vuelve al precio con 5 barras (un solo stock)");
    await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
    await page.waitForTimeout(150);
    ok((await page.locator("[data-que-cambia] [aria-checked=true]").count()) === 2, "Al volver, arranca otra vez con lo típico (Talla y Color)");
    await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
    ok((await page.locator("[data-barras-historia] span").count()) === 6, "Con una sola cosa: 6 barras");
    await seguir(page);
    await page.getByRole("checkbox", { name: "Azul", exact: true }).tap();
    ok(await page.locator("[data-foto-cada-color] button").first().isDisabled() && (await page.locator("[data-pista-foto-color]").isVisible()), "Sin fotos subidas, «Foto de cada color» apagada con su pista");
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

console.log("\n=== Plan con un solo lugar libre: publicar y «Agregar otro» no deja publicar otro (Codex P1) ===");
{
  const unoLibre = demoCon((d) => {
    d.tiendas.find((x) => x.id === MICHEL).limiteProductos = d.productos.filter((p) => p.tiendaId === MICHEL && p.activo && !p.eliminadoEn).length + 1;
  });
  const { ctx, page, errores } = await pagina(390, MICHEL, unoLibre);
  await abrir(page);
  await subirFoto(page, "#a87");
  await seguir(page);
  await escribir(page, "Oud último lugar");
  await seguir(page);
  await escribir(page, "1500");
  await seguir(page);
  await seguir(page);
  ok(await boton(page, "Publicar").isEnabled(), "Con un lugar libre, «Publicar» está");
  await boton(page, "Publicar").tap();
  await page.locator("[data-celebracion]").waitFor();
  // Enseguida, sin esperar a que la lista se refresque.
  await boton(page, "Agregar otro").tap();
  await subirFoto(page, "#7a8");
  await seguir(page);
  await escribir(page, "Oud de más");
  await seguir(page);
  await escribir(page, "1600");
  await seguir(page);
  await seguir(page);
  ok(await boton(page, "Publicar").isDisabled() && (await page.locator("[data-catalogo-lleno]").isVisible()), "El nuevo borrador ya cuenta el recién publicado: «Publicar» apagado y «Tu catálogo está lleno»");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Una presentación quitada sigue quitada al sumar otro color (Codex P2) ===");
{
  const { ctx, page, errores } = await pagina(390, LINO);
  await abrir(page);
  await subirFoto(page, "#579");
  await seguir(page);
  await escribir(page, "Bolso quitadas");
  await seguir(page);
  await escribir(page, "800");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await seguir(page);
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  await seguir(page);
  const inv = page.locator("[data-inventario-historia]");
  await inv.waitFor();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
  await inv.locator('[data-fila-inventario="Negro"] button').first().tap();
  const det = page.locator("[data-hoja-presentacion]");
  await det.waitFor();
  await page.waitForTimeout(400);
  await det.getByRole("button", { name: "Quitar", exact: true }).tap();
  await page.getByRole("alertdialog").getByRole("button", { name: "Quitar", exact: true }).tap();
  await page.waitForTimeout(500);
  ok((await inv.locator("[data-fila-inventario]").count()) === 1, "Quitar Negro en su detalle la saca del Inventario");
  await boton(page, "Listo · 1 en total").tap();
  await page.waitForTimeout(500);
  await page.getByRole("checkbox", { name: "Azul", exact: true }).tap();
  await page.waitForTimeout(200);
  ok((await page.locator("[data-resumen-inventario]").innerText()).replace(/\s+/g, " ").includes("2 presentaciones · 1 en total"), "Sumar Azul no la trae de vuelta (Blanco y Azul)");
  await page.getByRole("button", { name: "Editar", exact: true }).tap();
  await inv.waitFor();
  await page.waitForTimeout(400);
  ok((await inv.locator('[data-fila-inventario="Negro"]').count()) === 0, "…y en el Inventario no está Negro");
  // Quitar un valor con cantidades (confirmado) las pierde de verdad: si se vuelve a elegir, empieza en 0 (Codex P2).
  await boton(page, "Listo · 1 en total").tap();
  await page.waitForTimeout(500);
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  await page.getByRole("alertdialog").getByRole("button", { name: "Quitar", exact: true }).tap();
  await page.waitForTimeout(300);
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Editar", exact: true }).tap();
  await inv.waitFor();
  await page.waitForTimeout(400);
  ok((await inv.locator('[data-fila-inventario="Blanco"]').innerText()).trim().split(/\s+/).includes("0"), "Blanco quitado (con 1) y vuelto a elegir empieza en 0");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Dejar de cambiar por Color suma lo puesto en las tallas (Codex P2, 3.ª revisión) ===");
{
  const { ctx, page, errores } = await pagina(390, LINO);
  await abrir(page);
  await subirFoto(page, "#579");
  await seguir(page);
  await escribir(page, "Medias sumadas");
  await seguir(page);
  await escribir(page, "300");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await seguir(page);
  await page.getByRole("checkbox", { name: "S", exact: true }).tap();
  await page.getByRole("checkbox", { name: "M", exact: true }).tap();
  await seguir(page);
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  await seguir(page);
  const inv = page.locator("[data-inventario-historia]");
  await inv.waitFor();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
  await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
  await page.getByRole("button", { name: "Agregar uno de Negro · S" }).tap();
  await boton(page, "Listo · 9 en total").tap();
  await page.waitForTimeout(500);
  await boton(page, "Atrás").tap();
  await boton(page, "Atrás").tap();
  ok((await paso(page)) === "cambia", "De vuelta en «¿En qué cambia?»");
  await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
  await seguir(page);
  ok((await page.locator("[data-resumen-inventario]").innerText()).replace(/\s+/g, " ").includes("2 presentaciones · 9 en total"), "Sin Color, las tallas suman lo puesto: «2 presentaciones · 9 en total»");
  await page.getByRole("button", { name: "Editar", exact: true }).tap();
  await inv.waitFor();
  await page.waitForTimeout(400);
  ok((await inv.locator('[data-fila-inventario="S"]').innerText()).trim().split(/\s+/).includes("5") && (await inv.locator('[data-fila-inventario="M"]').innerText()).trim().split(/\s+/).includes("4"), "S = 3 + 2 y M = 2 + 2");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Auditoría de transiciones de las presentaciones (Planning, tras la 3.ª revisión de Codex) ===");
{
  const { ctx, page, errores } = await pagina(390, LINO);
  const inv = page.locator("[data-inventario-historia]");
  const resumen = async () => (await page.locator("[data-resumen-inventario]").innerText()).replace(/\s+/g, " ");
  const alerta = page.getByRole("alertdialog");
  const numero = async (fila) => (await inv.locator(`[data-fila-inventario="${fila}"]`).innerText()).trim().split(/\s+/).pop();
  const abrirInventario = async () => {
    await page.getByRole("button", { name: "Editar", exact: true }).tap();
    await inv.waitFor();
    await page.waitForTimeout(400);
  };
  const listoInv = async () => {
    await page.getByRole("button", { name: /^Listo · / }).last().tap();
    await page.waitForTimeout(500);
  };
  await abrir(page);
  await subirFoto(page, "#579");
  await seguir(page);
  await escribir(page, "Auditoría");
  await seguir(page);
  await escribir(page, "1000");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await seguir(page);
  await page.getByRole("checkbox", { name: "S", exact: true }).tap();
  await page.getByRole("checkbox", { name: "M", exact: true }).tap();
  await seguir(page);
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  // Foto del color Negro.
  await page.locator("[data-foto-cada-color] button").first().tap();
  await page.getByRole("dialog", { name: "Foto de Negro" }).getByRole("radio").first().tap();
  await page.getByRole("dialog", { name: "Foto de Negro" }).getByRole("button", { name: "Listo", exact: true }).tap();
  await page.waitForTimeout(500);
  await seguir(page);
  await inv.waitFor();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
  // ✕ del Inventario sin «Listo» conserva; «Seguir» lo reabre igual.
  await page.getByRole("dialog", { name: "Inventario" }).getByRole("button", { name: "Cerrar", exact: true }).first().tap();
  await page.waitForTimeout(600);
  await seguir(page);
  await inv.waitFor();
  await page.waitForTimeout(400);
  ok(await boton(page, "Listo · 4 en total").isEnabled(), "✕ y «Seguir»: el Inventario vuelve con lo puesto (4)");
  // Precio propio en Blanco · S y quitar Negro · M.
  await inv.locator('[data-fila-inventario="Blanco · S"] button').first().tap();
  let det = page.locator("[data-hoja-presentacion]");
  await det.waitFor();
  await page.waitForTimeout(400);
  await det.getByRole("radio", { name: "Uno propio" }).tap();
  await det.locator("input").tap();
  await page.keyboard.type("1500");
  await det.getByRole("button", { name: "Listo", exact: true }).tap();
  await page.waitForTimeout(500);
  await inv.locator('[data-fila-inventario="Negro · M"] button').first().tap();
  await det.waitFor();
  await page.waitForTimeout(400);
  await det.getByRole("button", { name: "Quitar", exact: true }).tap();
  await alerta.getByRole("button", { name: "Quitar", exact: true }).tap();
  await page.waitForTimeout(500);
  await listoInv();
  ok((await resumen()).includes("3 presentaciones · 3 en total"), "Precio propio en Blanco · S y Negro · M quitada: «3 presentaciones · 3 en total»");

  // Quitar un valor con cantidades y precio propio pregunta; cancelar no cambia nada.
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  ok((await alerta.innerText()).includes("Se pierden 2 unidades del inventario y su precio propio."), "Quitar Blanco avisa de sus 2 unidades y su precio propio");
  await alerta.getByRole("button", { name: "Cancelar" }).tap();
  await page.waitForTimeout(300);
  ok((await page.getByRole("checkbox", { name: "Blanco", exact: true }).getAttribute("aria-checked")) === "true" && (await resumen()).includes("3 en total"), "…y cancelar lo deja como estaba");

  // Por encargo con cantidades: quitar un valor sigue preguntando (las cantidades están escondidas, no perdidas).
  await abrirInventario();
  await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).last().tap();
  await page.getByRole("radio", { name: "1 mes" }).last().tap();
  await listoInv();
  ok((await resumen()).includes("por encargo"), "Por encargo: el resumen dice «por encargo»");
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  ok((await alerta.innerText()).includes("Se pierde 1 unidad del inventario."), "Por encargo, quitar Negro igual avisa de su unidad");
  await alerta.getByRole("button", { name: "Cancelar" }).tap();
  await page.waitForTimeout(300);
  await abrirInventario();
  await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).last().tap();
  ok(await boton(page, "Listo · 3 en total").isEnabled(), "Al apagar el encargo, las cantidades siguen (3)");
  await listoInv();

  // Quitar Negro (confirmado): su foto y su cantidad se van; al volver a elegirlo empieza en 0, sin foto, y vuelve Negro · M.
  ok((await page.locator("[data-foto-cada-color] button").first().innerText()).includes("Foto 1"), "Negro tenía la foto 1");
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await alerta.getByRole("button", { name: "Quitar", exact: true }).tap();
  await page.waitForTimeout(300);
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await page.waitForTimeout(300);
  ok((await page.locator("[data-foto-cada-color] button", { hasText: "Negro" }).innerText()).includes("Elegir foto"), "Negro vuelve sin foto");
  await abrirInventario();
  ok((await numero("Negro · S")) === "0" && (await numero("Negro · M")) === "0" && (await numero("Blanco · S")) === "1", "Negro vuelve en 0 (S y M, la quitada también) y Blanco conserva lo suyo");
  await listoInv();

  // Quitar una cosa (Color): se suma por talla; el precio propio solo sigue si todas valían lo mismo.
  await boton(page, "Atrás").tap();
  await boton(page, "Atrás").tap();
  ok((await paso(page)) === "cambia", "De vuelta en «¿En qué cambia?»");
  await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
  ok((await page.locator("[data-barras-historia] span").count()) === 6, "Sin Color: 6 barras");
  await seguir(page);
  ok((await resumen()).includes("2 presentaciones · 2 en total"), "Las tallas suman lo puesto: «2 presentaciones · 2 en total»");
  await abrirInventario();
  ok(!(await inv.locator('[data-fila-inventario="S"]').innerText()).includes("RD$1,500"), "S junta Negro (sin precio propio) y Blanco (1,500): vuelve al precio del producto");
  await listoInv();

  // Un atajo que quita valores con cantidades también pregunta (Codex P2, 5.ª revisión): «Única» quitaría S y M.
  await boton(page, "Única").tap();
  ok((await alerta.innerText()).includes("¿Quitar S, M?") && (await alerta.innerText()).includes("Se pierden 2 unidades del inventario."), "«Única» sobre S y M con cantidades pregunta «¿Quitar S, M?»");
  await alerta.getByRole("button", { name: "Cancelar" }).tap();
  await page.waitForTimeout(300);
  ok((await resumen()).includes("2 presentaciones · 2 en total"), "…y cancelar deja S y M con lo suyo");

  // Sumar una cosa con cantidades pregunta: cancelar deja todo; confirmar reparte de nuevo (todo a 0).
  await boton(page, "Atrás").tap();
  await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
  ok((await alerta.innerText()).includes("Las 2 que pusiste en el Inventario vuelven a 0"), "Sumar Color con cantidades pregunta antes");
  await alerta.getByRole("button", { name: "Cancelar" }).tap();
  await page.waitForTimeout(300);
  ok((await page.getByRole("checkbox", { name: "Color", exact: true }).getAttribute("aria-checked")) === "false", "…cancelar no lo suma");
  await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
  await alerta.getByRole("button", { name: "Sumar", exact: true }).tap();
  await page.waitForTimeout(300);
  ok((await page.locator("[data-barras-historia] span").count()) === 7, "Confirmado: 7 barras otra vez");
  await seguir(page);
  await seguir(page);
  await page.getByRole("checkbox", { name: "Rojo", exact: true }).tap();
  await seguir(page);
  await inv.waitFor();
  await page.waitForTimeout(400);
  ok(await boton(page, "Listo · 0 en total").isDisabled(), "Repartido de nuevo: todo en 0 y «Listo» apagado");
  await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
  await listoInv();
  await seguir(page);
  ok((await paso(page)) === "vista", "Con algo en total, «Seguir» llega a «Así se ve»");
  await boton(page, "Publicar").tap();
  await page.locator("[data-celebracion]").waitFor();
  {
    const d = await db(page);
    const p = d.productos.find((x) => x.nombre === "Auditoría");
    const suyas = d.variantes.filter((v) => v.productoId === p?.id);
    ok(p && suyas.length === 2 && suyas.every((v) => v.stock === 1 && v.precio === null) && p.opciones.map((o) => o.nombre).join() === "Color,Talla", "Publicado: Rojo · S y Rojo · M con 1 cada una, sin precios viejos");
  }
  // «Agregar otro» con presentaciones: una historia limpia.
  await boton(page, "Agregar otro").tap();
  await page.waitForTimeout(300);
  ok((await page.locator("[data-barras-historia] span").count()) === 5 && (await paso(page)) === "foto", "«Agregar otro» vuelve a 5 barras y a la foto");
  await subirFoto(page, "#975");
  await seguir(page);
  await escribir(page, "Otro limpio");
  await seguir(page);
  await escribir(page, "500");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await seguir(page);
  ok((await page.locator("[data-valores-eje] [aria-checked=true]").count()) === 0, "…y sin nada del producto anterior");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Sumar una cosa no resucita lo quitado ni muestra lo oculto; quitar todas y elegir otra pregunta (auditoría completa) ===");
{
  const { ctx, page, errores } = await pagina(390, LINO);
  const inv = page.locator("[data-inventario-historia]");
  const alerta = page.getByRole("alertdialog");
  const det = page.locator("[data-hoja-presentacion]");
  const detalle = async (fila) => {
    await inv.locator(`[data-fila-inventario="${fila}"] button`).first().tap();
    await det.waitFor();
    await page.waitForTimeout(400);
  };
  await abrir(page);
  await subirFoto(page, "#579");
  await seguir(page);
  await escribir(page, "Sin resucitar");
  await seguir(page);
  await escribir(page, "800");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await seguir(page);
  for (const c of ["Negro", "Blanco", "Rojo"]) await page.getByRole("checkbox", { name: c, exact: true }).tap();
  // «+ Otro» con uno que ya está (Codex P3, 6.ª revisión): no lo quita ni pregunta.
  await page.getByRole("button", { name: "+ Otro", exact: true }).tap();
  await page.keyboard.type(" negro ");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  ok((await page.getByRole("checkbox", { name: "Negro", exact: true }).getAttribute("aria-checked")) === "true" && (await page.locator("[data-valores-eje] [aria-checked=true]").count()) === 3 && !(await alerta.isVisible()), "«+ Otro» con « negro »: Negro sigue elegido, sin duplicado ni aviso");
  await seguir(page);
  await inv.waitFor();
  await page.waitForTimeout(400);
  // Rojo quitada, Blanco oculta, nada en total (sumar Talla no tendrá nada que avisar).
  await detalle("Rojo");
  await det.getByRole("button", { name: "Quitar", exact: true }).tap();
  await alerta.getByRole("button", { name: "Quitar", exact: true }).tap();
  await page.waitForTimeout(500);
  await detalle("Blanco");
  await det.getByRole("button", { name: "Ocultar esta presentación" }).tap();
  await det.getByRole("button", { name: "Listo", exact: true }).tap();
  await page.waitForTimeout(500);
  await page.getByRole("dialog", { name: "Inventario" }).getByRole("button", { name: "Cerrar", exact: true }).first().tap();
  await page.waitForTimeout(600);
  await boton(page, "Atrás").tap();
  ok((await paso(page)) === "cambia", "De vuelta en «¿En qué cambia?»");
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await page.waitForTimeout(300);
  ok(!(await alerta.isVisible()), "Sumar Talla sin cantidades ni precios: no pregunta");
  await seguir(page);
  await page.getByRole("checkbox", { name: "S", exact: true }).tap();
  await page.getByRole("checkbox", { name: "M", exact: true }).tap();
  await seguir(page);
  await seguir(page);
  await inv.waitFor();
  await page.waitForTimeout(400);
  const filas = await inv.locator("[data-fila-inventario]").evaluateAll((l) => l.map((e) => [e.getAttribute("data-fila-inventario"), e.innerText.includes("Oculta")]));
  ok(filas.length === 4 && !filas.some(([n]) => n.startsWith("Rojo")), `Rojo (quitada) no vuelve en ninguna talla (${filas.map(([n]) => n).join(", ")})`);
  ok(filas.filter(([n]) => n.startsWith("Blanco")).every(([, o]) => o) && filas.filter(([n]) => n.startsWith("Negro")).every(([, o]) => !o), "Blanco (oculta) sigue oculta en S y M; Negro, a la vista");
  await inv.locator('[data-fila-inventario="Negro · S"]').getByRole("button", { name: /^Agregar uno/ }).tap();
  await page.getByRole("button", { name: /^Listo · / }).last().tap();
  await page.waitForTimeout(500);
  // Quitar todas las cosas y elegir otra distinta: lo puesto se repartiría de nuevo, así que pregunta.
  await boton(page, "Atrás").tap();
  await boton(page, "Atrás").tap();
  await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await page.waitForTimeout(300);
  await page.getByRole("checkbox", { name: "Material", exact: true }).tap();
  ok((await alerta.isVisible()) && (await alerta.innerText()).includes("La 1 que pusiste en el Inventario vuelve a 0"), "Sin cosas, elegir Material con 1 en el Inventario pregunta antes");
  await alerta.getByRole("button", { name: "Cancelar" }).tap();
  await page.waitForTimeout(300);
  // Volver a elegir la misma (Talla) no pierde nada: S sigue con su 1.
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await page.waitForTimeout(300);
  ok(!(await alerta.isVisible()), "Volver a elegir Talla: no pregunta");
  await seguir(page);
  await page.getByRole("checkbox", { name: "S", exact: true }).tap();
  await page.getByRole("checkbox", { name: "M", exact: true }).tap();
  await page.waitForTimeout(300);
  ok((await page.locator("[data-resumen-inventario]").innerText()).includes("1 en total"), "…y al elegir S y M otra vez, S conserva su 1");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Por encargo con todas las presentaciones ocultas: «Listo» espera una a la vista (Codex P2, 4.ª revisión) ===");
{
  const { ctx, page, errores } = await pagina(390, LINO);
  await abrir(page);
  await subirFoto(page, "#579");
  await seguir(page);
  await escribir(page, "Ocultas encargo");
  await seguir(page);
  await escribir(page, "600");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await seguir(page);
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  await seguir(page);
  const inv = page.locator("[data-inventario-historia]");
  await inv.waitFor();
  await page.waitForTimeout(400);
  // Ocultar las dos (en su detalle) y después prender el encargo con plazo.
  for (const c of ["Negro", "Blanco"]) {
    await inv.locator(`[data-fila-inventario="${c}"] button`).first().tap();
    const det = page.locator("[data-hoja-presentacion]");
    await det.waitFor();
    await page.waitForTimeout(400);
    await det.getByRole("button", { name: "Ocultar esta presentación" }).tap();
    await det.getByRole("button", { name: "Listo", exact: true }).tap();
    await page.waitForTimeout(500);
  }
  await page.getByRole("switch", { name: "Es por encargo, no llevo stock" }).last().tap();
  await page.getByRole("radio", { name: "1 mes" }).last().tap();
  await page.waitForTimeout(200);
  ok(await boton(page, "Listo · por encargo").isDisabled() && (await page.locator("[data-sin-visibles]").isVisible()), "Con todas ocultas: «Listo» apagado y «Deja al menos una presentación a la vista.»");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Sin ninguna cosa, volver deja un solo stock con lo que había en el Inventario (con «‹» y con el atrás del teléfono) ===");
for (const conTelefono of [false, true]) {
  const { ctx, page, errores } = await pagina(390, LINO);
  await abrir(page);
  await subirFoto(page, "#579");
  await seguir(page);
  await escribir(page, conTelefono ? "Un stock teléfono" : "Un stock");
  await seguir(page);
  await escribir(page, "700");
  await page.locator("[data-chip-presentaciones]").getByRole("button").tap();
  await page.waitForTimeout(150);
  await page.getByRole("checkbox", { name: "Talla", exact: true }).tap();
  await seguir(page);
  await page.getByRole("checkbox", { name: "Negro", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Blanco", exact: true }).tap();
  await seguir(page);
  await page.locator("[data-inventario-historia]").waitFor();
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Agregar uno a todas" }).tap();
  await page.getByRole("button", { name: /^Listo · / }).tap();
  await page.waitForTimeout(500);
  await boton(page, "Atrás").tap();
  await page.getByRole("checkbox", { name: "Color", exact: true }).tap();
  if (conTelefono) {
    await page.goBack();
    await page.waitForTimeout(600);
  } else await boton(page, "Atrás").tap();
  ok((await paso(page)) === "precio" && (await page.locator("[data-barras-historia] span").count()) === 5, `${conTelefono ? "Atrás del teléfono" : "«‹»"}: sin cosas, vuelve al precio con 5 barras`);
  await seguir(page);
  ok((await page.locator("[data-contador-stock]").innerText()).includes("6"), "…y el stock es lo que había en el Inventario (6)");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

console.log("\n=== Movimiento reducido: la celebración se ve quieta ===");
{
  const { ctx, page, errores } = await pagina(390, MICHEL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrir(page);
  await subirFoto(page, "#8a6");
  await seguir(page);
  await escribir(page, "Oud quieto");
  await seguir(page);
  await escribir(page, "1200");
  await seguir(page);
  await seguir(page);
  await boton(page, "Publicar").tap();
  await page.locator("[data-celebracion]").waitFor();
  const nombres = await page.locator("[data-celebracion] .cel-vivo").evaluateAll((l) => l.map((e) => getComputedStyle(e).animationName));
  ok(nombres.length === 5 && nombres.every((n) => n === "none") && (await page.getByText("¡Lo quiero!").isVisible()), "Sin animación: corazones y burbujas en su lugar");
  ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
  await ctx.close();
}

await navegador.close();
console.log("\nListo.");
