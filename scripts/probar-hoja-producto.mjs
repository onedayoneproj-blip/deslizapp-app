// Editar producto como resumen y «Ver producto» (docs/prompts/editar-producto-2-resumen.md), en la demo. Nunca toca Supabase.
// Reemplaza a la prueba del formulario de antes: los mismos casos, con la hoja resumen y las pantallas de la historia encima.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=360,390,430] [CAPTURAS=docs/capturas/editar-producto] node scripts/probar-hoja-producto.mjs
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
const ANCHOS = (process.env.ANCHOS ?? "360,390,430").split(",").map(Number);
const CAPTURAS = process.env.CAPTURAS ?? null;
if (CAPTURAS) for (const d of ["resumen", "ver-producto"]) mkdirSync(join(CAPTURAS, d), { recursive: true });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const KURT = "a3000000-0000-4000-8000-000000000002";
const URBAN = "a3000000-0000-4000-8000-000000000008";
const CAMISA = "a3000000-0000-4000-8000-000000000017";
const PANTALON = "a3000000-0000-4000-8000-000000000018";
const OUD = "a3000000-0000-4000-8000-000000000019";
const CINTURON = "a3000000-0000-4000-8000-000000000024";
const SOMBRERO = "a3000000-0000-4000-8000-000000000025";
const CLAVE = "deslizapp-demo-v5";
const PORQUE = "Esto lo hace quien administra la tienda.";

const ok = (cond, msg) => {
  console.log((cond ? "  ✅ " : "  ❌ ") + msg);
  if (!cond) throw new Error(msg);
};
const navegador = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});

async function pagina(ancho, tienda, { reducido = false, cambiar } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: reducido ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript((t) => {
    if (sessionStorage.getItem("prueba-inicial")) return;
    sessionStorage.setItem("prueba-inicial", "1");
    localStorage.clear();
    localStorage.setItem("deslizapp-version-vista", "9.9.9");
    localStorage.setItem("deslizapp-modo-v1", "demo");
    localStorage.setItem("deslizapp-sesion-v1", t);
  }, tienda);
  if (cambiar) {
    // Prepara la demo (servicio, catálogo lleno…) y vuelve a cargar con ella.
    // La demo se guarda en localStorage al primer cambio: se prende y apaga un interruptor para que exista.
    await abrirVista(page, SOMBRERO);
    const sw = page.getByRole("switch", { name: "Visible en el catálogo" });
    await sw.click();
    await esperar(page, 700);
    await sw.click();
    await page.waitForFunction((k) => localStorage.getItem(k) !== null, CLAVE, { timeout: 20000 });
    await esperar(page, 700);
    await page.evaluate(([k, f]) => {
      const db = JSON.parse(localStorage.getItem(k));
      new Function("db", f)(db);
      localStorage.setItem(k, JSON.stringify(db));
    }, [CLAVE, cambiar]);
  }
  return { ctx, page, errores };
}
const db = async (page) => JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CLAVE)) ?? "{}");
const producto = async (page, id) => (await db(page)).productos?.find((p) => p.id === id);
const ajustes = async (page, id) => ((await db(page)).ajustes_inventario ?? (await db(page)).ajustesInventario ?? []).filter((a) => a.productoId === id || a.producto_id === id);
const captura = async (page, nombre, ancho) => CAPTURAS && ancho === 390 && (await page.screenshot({ path: join(CAPTURAS, `${nombre}-${ancho}.png`) }));
const sinDesborde = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const paneles = (page) => page.locator("[data-hoja-panel]");
const arriba = (page) => paneles(page).last();
const esperar = (page, ms = 450) => page.waitForTimeout(ms);
/** Una fila del resumen por su título. */
const fila = (page, titulo) => page.locator("[data-editar-producto] li button").filter({ hasText: new RegExp(`^${titulo}`) }).first();
const guardar = (page) => page.locator("[data-pie-editar]").getByRole("button", { name: "Guardar cambios", exact: true });
const listo = (page) => arriba(page).locator("[data-pie-paso]").getByRole("button", { name: "Listo", exact: true });
const toast = (page, texto) => page.waitForSelector(`text=${texto}`, { timeout: 5000 }).then(() => true, () => false);
async function abrirEditar(page, id) {
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.locator("[data-editar-producto]").waitFor({ timeout: 20000 });
  await esperar(page, 600);
}
async function abrirVista(page, id) {
  await page.goto(`${URL}/catalogo/${id}`);
  await page.locator("[data-vista-producto]").waitFor({ timeout: 20000 });
  await esperar(page, 700);
}
async function tocarFila(page, titulo) {
  await fila(page, titulo).click();
  await esperar(page, 500);
}
async function mirarComo(page, nombre) {
  await page.goto(URL + "/catalogo");
  await page.waitForSelector('header button[aria-haspopup="dialog"]');
  await esperar(page, 900);
  await page.locator('header button[aria-haspopup="dialog"]').first().tap();
  await page.waitForSelector("[data-tienda-activa]");
  await esperar(page, 400);
  await page.locator(`[data-mirar-como] [role="radio"]:has-text("${nombre}")`).tap();
  await esperar(page, 500);
  await page.keyboard.press("Escape");
  await esperar(page, 500);
}

for (const ancho of ANCHOS) {
  console.log(`\n=== ${ancho}px ===`);

  console.log("• El resumen: cabecera, tarjeta, grupos en orden y «Guardar cambios» apagado sin cambios");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirEditar(page, PANTALON);
    const cab = page.locator("[data-hoja-cabecera]").last();
    const [x, titulo] = [await cab.getByRole("button", { name: "Cerrar" }).boundingBox(), await cab.getByRole("heading", { name: "Editar producto" }).boundingBox()];
    ok(x.x < titulo.x && x.width >= 44, "✕ a la izquierda (44 px) y «Editar producto» a su lado");
    ok(await cab.getByRole("heading", { name: "Editar producto" }).evaluate((e) => e.scrollWidth <= e.clientWidth + 1), "«Editar producto» no se trunca");
    ok((await cab.locator("[data-barras-historia]").count()) === 0, "Sin barras de avance");
    ok((await page.getByText("así se ve en tu catálogo", { exact: true }).count()) === 1, "«así se ve en tu catálogo» arriba");
    const tarjeta = page.locator("[data-tarjeta-resumen]");
    ok((await tarjeta.innerText()).includes("Visible") && (await tarjeta.innerText()).includes("1 / 4") && (await tarjeta.innerText()).includes("Desde RD$"), "La tarjeta: «Visible», «1 / 4» y «Desde RD$…»");
    const grupos = await page.locator("[data-editar-producto] section h3").allInnerTexts();
    ok(JSON.stringify(grupos) === JSON.stringify(["Lo básico", "Presentaciones y stock", "Hazlo brillar · opcional", "En tu catálogo"]), `Los cuatro grupos en orden (${grupos.join(" / ")})`);
    ok((await fila(page, "Presentaciones").innerText()).includes("Talla y color · 12"), "Presentaciones: «Talla y color · 12»");
    ok((await fila(page, "Stock").innerText()).includes("31 en total"), "Stock: «31 en total»");
    if (ancho === 390) {
      const precio = await fila(page, "Precio").boundingBox();
      const pie = await page.locator("[data-pie-editar]").boundingBox();
      ok(precio.y + precio.height <= pie.y, "A 390×844 el primer grupo se ve entero sin desplazar");
    }
    ok(await guardar(page).isDisabled(), "«Guardar cambios» apagado sin cambios");
    ok(await sinDesborde(page), "Sin desborde horizontal");
    await captura(page, "resumen/1-arriba", ancho);
    await page.locator("[data-hoja-contenido]").last().evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await esperar(page, 400);
    ok(await page.getByRole("button", { name: "Eliminar producto" }).isVisible(), "Al final, «Eliminar producto»");
    await captura(page, "resumen/2-desplazada", ancho);
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Cambiar solo el precio: dos toques y «Guardar cambios»; ✕ con cambios en el paso descarta solo ese cambio");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirEditar(page, SOMBRERO);
    await tocarFila(page, "Precio");
    ok((await paneles(page).count()) === 2, "Se abre ENCIMA (dos hojas)");
    const campo = arriba(page).getByRole("textbox", { name: "Precio (RD$)" });
    ok(await campo.evaluate((e) => document.activeElement === e), "El campo del precio queda enfocado en el mismo toque");
    ok((await arriba(page).locator("[data-tarjeta-asi-se-vera]").count()) === 1, "Con su tarjeta «así se verá»");
    await campo.fill("1650");
    ok((await arriba(page).getByText(/^Antes: RD\$/).count()) === 1, "La ayuda dice el valor de antes («Antes: RD$…»)");
    await captura(page, "resumen/3-precio", ancho);
    // ✕ con algo escrito: el aviso de siempre; «Descartar y salir» no toca el resumen.
    await arriba(page).getByRole("button", { name: "Cerrar" }).click();
    await page.getByRole("alertdialog").waitFor();
    ok((await page.getByRole("alertdialog").innerText()).includes("¿Salir sin guardar?"), "✕ con cambios en el paso: «¿Salir sin guardar?»");
    await page.getByRole("button", { name: "Descartar y salir" }).click();
    await esperar(page, 600);
    ok((await paneles(page).count()) === 1 && (await guardar(page).isDisabled()), "Descartar deja el resumen como estaba");
    await tocarFila(page, "Precio");
    await arriba(page).getByRole("textbox", { name: "Precio (RD$)" }).fill("1650");
    await listo(page).click();
    await esperar(page, 600);
    ok((await fila(page, "Precio").innerText()).includes("RD$1,650"), "«Listo» pone el precio nuevo en la fila");
    ok((await producto(page, SOMBRERO))?.precio !== 1650, "…y todavía no se guardó");
    ok(await guardar(page).isEnabled(), "«Guardar cambios» se enciende");
    await guardar(page).click();
    ok(await toast(page, "Guardado. El catálogo ya se enteró."), "Guardado");
    await page.waitForURL((u) => !u.pathname.endsWith("/editar"), { timeout: 8000 });
    ok((await producto(page, SOMBRERO)).precio === 1650, "El precio quedó guardado (RD$1,650)");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Stock sin presentaciones: bajar pide motivo ahí mismo; subir es reposición; el historial lo muestra");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirEditar(page, SOMBRERO);
    const antes = (await producto(page, SOMBRERO))?.stock ?? 9;
    await tocarFila(page, "Stock");
    const menos = arriba(page).getByRole("button", { name: /^Disminuir stock de/ });
    await menos.click();
    await menos.click();
    const motivo = arriba(page).locator("[data-motivo-bajada]");
    ok((await motivo.innerText()).includes("Bajaste 2. ¿Qué pasó?") && (await motivo.innerText()).includes("No cuenta como venta"), "«Bajaste 2. ¿Qué pasó?» con los motivos");
    ok(await listo(page).isDisabled(), "«Listo» no deja salir sin motivo");
    await arriba(page).getByRole("radio", { name: "Otro" }).click();
    ok(await listo(page).isDisabled(), "«Otro» pide la nota");
    await arriba(page).getByRole("textbox", { name: "Cuéntanos el motivo" }).fill("Se mojaron dos");
    await listo(page).click();
    await esperar(page, 600);
    ok((await fila(page, "Stock").innerText()).includes(`${antes - 2} en total`), `La fila dice ${antes - 2} en total`);
    await guardar(page).click();
    ok(await toast(page, "Guardado. El catálogo ya se enteró."), "Guardado sin otra pregunta (el motivo ya se dio)");
    await esperar(page, 900);
    const tras = await producto(page, SOMBRERO);
    const regs = await ajustes(page, SOMBRERO);
    ok(tras.stock === antes - 2 && regs.some((a) => a.variacion === -2 && a.motivo === "otro" && a.nota === "Se mojaron dos"), "Ajuste −2 con motivo «otro» y su nota");
    await abrirEditar(page, SOMBRERO);
    await tocarFila(page, "Stock");
    await arriba(page).getByRole("button", { name: /^Aumentar stock de/ }).click();
    ok((await arriba(page).locator("[data-motivo-bajada]").count()) === 0, "Subir no pregunta");
    await listo(page).click();
    await esperar(page, 500);
    await guardar(page).click();
    ok(await toast(page, "Guardado. El catálogo ya se enteró."), "Guardado");
    await esperar(page, 900);
    ok((await ajustes(page, SOMBRERO)).some((a) => a.variacion === 1 && a.motivo === "reposicion"), "Subir guarda una reposición");
    await abrirEditar(page, SOMBRERO);
    await fila(page, "Historial de ajustes").click();
    await esperar(page, 600);
    const cab = page.locator("[data-hoja-cabecera]").last();
    ok((await cab.getByRole("heading").innerText()) === "Historial de ajustes" && (await cab.getByRole("button", { name: "Volver" }).count()) === 1, "Historial: pantalla interna con «‹»");
    ok((await page.getByText("Se mojaron dos").count()) >= 1, "…con el ajuste y su nota");
    ok(!(await page.locator("[data-pie-editar]").isVisible()), "…sin «Guardar cambios» a la vista");
    await page.goBack();
    await esperar(page, 600);
    ok((await page.locator("[data-editar-producto]").isVisible()) && (await paneles(page).count()) === 1, "Atrás del teléfono vuelve al resumen sin cerrar");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Stock con presentaciones: el Inventario, «antes N» y el motivo debajo de su grupo; el detalle es pantalla interna");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirEditar(page, PANTALON);
    const base = (await db(page)).producto_variantes ?? (await db(page)).variantes;
    await tocarFila(page, "Stock");
    ok((await arriba(page).locator("[data-hoja-cabecera] h2").innerText()) === "Inventario" && (await arriba(page).locator("[data-total-inventario]").innerText()).includes("31 en total"), "«Inventario · 31 en total»");
    const negro = arriba(page).locator('[data-grupo-inventario="Negro"]');
    ok((await negro.count()) === 1, "Un grupo por color");
    await negro.getByRole("button", { name: /^Quitar uno de S · Negro/ }).click();
    ok((await negro.locator("[data-antes]").innerText()).startsWith("antes "), "La fila que bajó dice «antes N»");
    ok((await negro.locator("[data-motivo-bajada]").innerText()).includes("Bajaste 1 en S · Negro. ¿Qué pasó?"), "«Bajaste 1 en S · Negro. ¿Qué pasó?» debajo de su grupo");
    ok(await listo(page).isDisabled(), "«Listo» espera el motivo");
    await arriba(page).getByRole("radio", { name: "Daño" }).click();
    await captura(page, "resumen/4-stock-bajando-con-motivo", ancho);
    // El detalle de una presentación: pantalla interna, nunca una tercera hoja.
    await negro.getByRole("button", { name: /^M · Negro/ }).click();
    await esperar(page, 500);
    ok((await paneles(page).count()) === 2, "El detalle de una presentación no abre una tercera hoja");
    ok((await arriba(page).locator("[data-pantalla-interna] [data-hoja-presentacion]").count()) === 1 && (await arriba(page).locator("[data-hoja-cabecera] [data-volver-interna]").count()) === 1, "…es una pantalla interna con «‹»");
    await page.goBack();
    await esperar(page, 500);
    ok((await paneles(page).count()) === 2 && (await arriba(page).locator("[data-inventario-editar]").isVisible()), "Atrás vuelve al Inventario (sin cerrarlo)");
    await listo(page).click();
    await esperar(page, 600);
    await guardar(page).click();
    ok(await toast(page, "Guardado. El catálogo ya se enteró."), "Guardado");
    await esperar(page, 900);
    const regs = await ajustes(page, PANTALON);
    ok(regs.some((a) => a.variacion === -1 && a.motivo === "dano"), "Ajuste −1 de la presentación con motivo «Daño»");
    // Guardar algo que no son las fotos no toca la foto de cada color (revisión de Codex en #125).
    const fpv = (await producto(page, PANTALON)).fotosPorValor ?? {};
    ok(Object.keys(fpv.Color ?? {}).length === 3 && fpv.Color.Negro?.endsWith("pantalon-de-algodon-negro.svg"), `La foto de cada color se conserva (${JSON.stringify(fpv)})`);
    void base;
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Presentaciones: el flujo encima; bajar una cantidad ahí pide motivo al guardar; quitar una con unidades");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirEditar(page, CAMISA);
    await tocarFila(page, "Presentaciones");
    ok((await paneles(page).count()) === 2 && (await arriba(page).locator("[data-paso-presentaciones]").count()) === 1, "Presentaciones abre el flujo encima");
    const cab = arriba(page).locator("[data-hoja-cabecera]");
    const [x, t] = [await cab.getByRole("button", { name: "Cerrar" }).boundingBox(), await cab.getByRole("heading").boundingBox()];
    ok(x.x < t.x, "…con la ✕ a la izquierda");
    await captura(page, "resumen/6-presentaciones", ancho);
    await arriba(page).locator("[data-paso='cuantas'] button[aria-label^='Quitar uno de ']:not([disabled])").first().click();
    // Una presentación: su detalle es una pantalla interna; «Quitar» pregunta con la Alerta (no cuenta como hoja).
    await arriba(page).locator("[data-paso='cuantas'] button[aria-label^='Abrir ']").last().click();
    await esperar(page, 500);
    ok((await paneles(page).count()) === 2 && (await arriba(page).locator("[data-pantalla-interna]").count()) === 1, "El detalle es una pantalla interna (dos hojas)");
    await captura(page, "resumen/7-presentacion-pantalla-interna", ancho);
    const quitada = (await arriba(page).locator("[data-hoja-cabecera] h2").innerText()).trim();
    await arriba(page).getByRole("button", { name: "Quitar", exact: true }).click();
    await page.getByRole("alertdialog").waitFor();
    ok((await paneles(page).count()) === 2, `Quitar ${quitada} pregunta con la alerta (no es otra hoja)`);
    await page.getByRole("alertdialog").getByRole("button").last().click();
    await esperar(page, 500);
    ok((await arriba(page).locator("[data-pantalla-interna]").count()) === 0, "…y vuelve a «Cuántas tienes»");
    await arriba(page).getByRole("button", { name: /^Listo ·/ }).click();
    await esperar(page, 600);
    ok((await paneles(page).count()) === 1, "«Listo» vuelve al resumen");
    await guardar(page).click();
    await page.getByRole("heading", { name: "¿Por qué baja el stock?" }).waitFor({ timeout: 5000 });
    ok(true, "Bajar en el flujo pide el motivo al guardar, como antes");
    await arriba(page).getByRole("radio", { name: "Pérdida" }).click();
    await arriba(page).getByRole("button", { name: "Guardar ajuste" }).click();
    ok(await toast(page, "Guardado. El catálogo ya se enteró."), "Guardado");
    await esperar(page, 900);
    ok((await ajustes(page, CAMISA)).some((a) => a.variacion === -1 && a.motivo === "perdida"), "Ajuste −1 con motivo «Pérdida»");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• Por encargo, Fotos (sin foto → solo oculto) y la foto como pantalla interna");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirEditar(page, CINTURON);
    await page.getByRole("switch", { name: "Es por encargo" }).click();
    ok((await fila(page, "Es por encargo").innerText()).includes("Se puede pedir aunque no haya."), "Encendido, dice «Se puede pedir aunque no haya.»");
    await tocarFila(page, "Es por encargo");
    await arriba(page).getByRole("radio", { name: "1 a 2 semanas" }).click();
    await listo(page).click();
    await esperar(page, 500);
    ok((await fila(page, "Es por encargo").innerText()).includes("Llega en 1 a 2 semanas"), "«Llega en 1 a 2 semanas»");
    await tocarFila(page, "Fotos");
    ok((await arriba(page).locator("[data-marco-foto]").count()) === 1, "Fotos: la pantalla de la foto de la historia");
    await arriba(page).getByRole("button", { name: /^Foto 1 de|^Portada/ }).first().click();
    await esperar(page, 500);
    ok((await paneles(page).count()) === 2 && (await arriba(page).locator("[data-pantalla-interna]").count()) === 1, "El detalle de la foto es una pantalla interna");
    await arriba(page).getByRole("button", { name: "Quitar foto" }).click();
    await esperar(page, 500);
    await listo(page).click();
    await esperar(page, 500);
    ok((await page.locator("[data-falta-foto]").count()) === 1 && (await guardar(page).isDisabled()), "Sin foto y visible: el aviso y «Guardar cambios» apagado");
    await page.getByRole("switch", { name: "Visible en el catálogo" }).click();
    ok(await guardar(page).isEnabled(), "Oculto, sin foto, sí se guarda");
    await guardar(page).click();
    ok(await toast(page, "Guardado. El catálogo ya se enteró."), "Guardado");
    await esperar(page, 900);
    const p = await producto(page, CINTURON);
    ok(p.porEncargo === true && (p.encargoTexto ?? p.encargo_texto) === "Llega en 1 a 2 semanas" && p.activo === false && p.fotos.length === 0, "Por encargo, oculto y sin foto");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  console.log("• ✕ y atrás con cambios en el resumen; entrar desde la vista y volver; eliminar sin historial");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirVista(page, CINTURON);
    await page.locator("button[data-boton-editar]").click();
    await page.waitForURL(/\/editar$/);
    await page.locator("[data-editar-producto] li").first().waitFor();
    await esperar(page, 600);
    await tocarFila(page, "Nombre");
    await arriba(page).getByRole("textbox", { name: "Nombre del producto" }).fill("Cinturón trenzado");
    await listo(page).click();
    await esperar(page, 500);
    await page.locator("[data-hoja-cabecera]").last().getByRole("button", { name: "Cerrar" }).click();
    ok((await page.getByRole("alertdialog").innerText()).includes("¿Descartar los cambios?"), "✕ con cambios: «¿Descartar los cambios?»");
    await page.getByRole("button", { name: "Quedarme" }).click();
    await esperar(page, 400);
    await page.goBack();
    await esperar(page, 500);
    ok((await page.getByRole("alertdialog").count()) === 1, "Atrás del teléfono también pregunta");
    await page.getByRole("button", { name: "Descartar y salir" }).click();
    await page.waitForURL(new RegExp(`/catalogo/${CINTURON}$`), { timeout: 8000 });
    ok(true, "Descartar vuelve a la vista del producto (se entró desde ahí)");
    ok((await producto(page, CINTURON))?.nombre !== "Cinturón trenzado", "…sin guardar el nombre");
    await abrirEditar(page, CINTURON);
    await page.locator("[data-hoja-contenido]").last().evaluate((e) => e.scrollTo(0, e.scrollHeight));
    await page.getByRole("button", { name: "Eliminar producto" }).click();
    await page.getByRole("button", { name: "Sí, eliminar producto" }).waitFor({ timeout: 6000 });
    ok((await paneles(page).count()) === 2, "La confirmación de eliminar va encima (dos hojas)");
    await page.getByRole("button", { name: "Sí, eliminar producto" }).click();
    await page.waitForURL((u) => u.pathname === "/catalogo", { timeout: 8000 });
    ok(true, "Eliminar sin historial vuelve a /catalogo");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }

  if (ancho === 390) {
    console.log("• Servicio: sin stock ni encargo");
    {
      const { ctx, page } = await pagina(ancho, LINO, { cambiar: `db.productos.find((p) => p.id === "${SOMBRERO}").tipo = "servicio";` });
      await abrirEditar(page, SOMBRERO);
      ok((await fila(page, "Stock").count()) === 0 && (await page.getByRole("switch", { name: "Es por encargo" }).count()) === 0, "Un servicio no lleva Stock ni Es por encargo");
      ok((await fila(page, "Presentaciones").count()) === 1, "…sí Presentaciones");
      await ctx.close();
    }

    console.log("• Catálogo lleno: un oculto no se vuelve visible");
    {
      const { ctx, page } = await pagina(ancho, LINO, {
        cambiar: `const p = db.productos.find((x) => x.id === "${SOMBRERO}"); p.activo = false; const t = db.tiendas.find((x) => x.id === "${LINO}"); const n = db.productos.filter((x) => (x.tiendaId ?? x.tienda_id) === "${LINO}" && x.activo && !(x.eliminadoEn ?? x.eliminado_en)).length; if ("limiteProductos" in t) t.limiteProductos = n; else t.limite_productos = n;`,
      });
      await abrirEditar(page, SOMBRERO);
      const sw = page.getByRole("switch", { name: "Visible en el catálogo" });
      ok((await sw.getAttribute("aria-disabled")) === "true" && (await sw.getAttribute("aria-checked")) === "false", "«Visible» apagado y bloqueado");
      await sw.click({ force: true });
      ok(await toast(page, "Tu catálogo está lleno"), "Tocarlo avisa «Tu catálogo está lleno»");
      await ctx.close();
    }

    console.log("• Sin permiso (Ayudante): todo se ve y nada se cambia");
    {
      const { ctx, page } = await pagina(ancho, MICHEL);
      await mirarComo(page, "Ayudante");
      await abrirEditar(page, KURT);
      await fila(page, "Nombre").click();
      ok(await toast(page, PORQUE), "Tocar una fila explica por qué");
      ok((await paneles(page).count()) === 1, "…y no abre nada");
      ok(await guardar(page).isDisabled() && (await page.locator("[data-editar-producto] [data-sin-permiso]").count()) === 1, "«Guardar cambios» apagado, con el porqué");
      await captura(page, "resumen/5-sin-permiso", ancho);
      await abrirVista(page, KURT);
      const editar = page.locator("button[data-boton-editar]");
      ok((await editar.getAttribute("aria-disabled")) === "true", "Ver producto: «Editar» apagado");
      await editar.click({ force: true });
      ok(await toast(page, PORQUE), "…y tocarlo explica por qué");
      await ctx.close();
    }

    console.log("• Movimiento reducido: abrir y cerrar un paso funciona igual");
    {
      const { ctx, page, errores } = await pagina(ancho, LINO, { reducido: true });
      await abrirEditar(page, SOMBRERO);
      await tocarFila(page, "Nombre");
      ok((await paneles(page).count()) === 2, "El paso se abre");
      await listo(page).click();
      await esperar(page, 300);
      ok((await paneles(page).count()) === 1, "«Listo» lo cierra");
      ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
      await ctx.close();
    }
  }

  console.log("• Ver producto: cabecera, carrusel, espera, stock plegable, «Compartir»");
  {
    const { ctx, page, errores } = await pagina(ancho, LINO);
    await abrirVista(page, PANTALON);
    const cab = page.locator("[data-hoja-cabecera]").last();
    const [x, t, e] = [await cab.getByRole("button", { name: "Cerrar" }).boundingBox(), await cab.getByRole("heading").boundingBox(), await cab.locator("button[data-boton-editar]").boundingBox()];
    ok(x.x < t.x && t.x < e.x && e.height >= 44, "✕ · nombre · «Editar» (píldora de 44 px)");
    ok(await cab.getByRole("heading").evaluate((h) => getComputedStyle(h).textOverflow === "ellipsis"), "El nombre se corta con elipsis");
    ok((await page.locator("[data-barras-vista] span").count()) === 4, "Cuatro barras para cuatro fotos");
    await page.locator("[data-carrusel-vista]").evaluate((c) => c.scrollTo({ left: c.clientWidth, behavior: "instant" }));
    await esperar(page, 400);
    ok((await page.locator("[data-barras-vista] span.bg-papel").count()) === 2, "Deslizar llena la barra de la segunda foto");
    ok((await page.locator("[data-presentaciones-vista]").innerText()).includes("3 colores"), "Las presentaciones: colores como puntos y tallas");
    ok((await page.locator("[data-franja-espera]").count()) === 0, "Sin lista de espera, sin franja");
    ok((await page.locator("[data-stock-plegable]").getAttribute("data-abierto")) === null, "El stock empieza cerrado");
    await captura(page, "ver-producto/1-cerrado", ancho);
    // Más de 3 presentaciones: abrir el stock lleva al Inventario de editar.
    await page.locator("[data-stock-plegable] button[aria-expanded]").click();
    await page.waitForURL(/\/editar\?abrir=stock$/, { timeout: 8000 });
    await page.locator("[data-inventario-editar]").waitFor({ timeout: 8000 });
    ok((await paneles(page).count()) === 2, "Más de 3 presentaciones: abrir el stock lleva al Inventario");
    await abrirVista(page, CAMISA);
    ok((await page.locator("[data-franja-espera]").innerText()).includes("1 persona lo espera"), "Con lista de espera: «1 persona lo espera»");
    await page.locator("[data-franja-espera]").click();
    await esperar(page, 500);
    ok((await page.locator("[data-hoja-cabecera]").last().getByRole("heading").innerText()) === "Lista de espera", "Abre la lista como pantalla interna");
    await page.locator("[data-hoja-cabecera]").last().getByRole("button", { name: "Volver" }).click();
    await esperar(page, 400);
    ok((await page.locator("[data-pie-vista]").getByRole("button").count()) === 1, "El pie solo lleva «Crear pedido»");
    const compartir = await page.locator("[data-compartir-vista]").boundingBox();
    const foto = await page.locator("[data-vista-previa-producto]").boundingBox();
    ok(compartir.height >= 44 && compartir.x + compartir.width > foto.x + foto.width - 20 && compartir.y < foto.y + 70, "«Compartir»: píldora arriba a la derecha de la foto (44 px de toque)");
    await page.locator("[data-compartir-vista]").click();
    await page.getByRole("heading", { name: "Súbelo a tu estado" }).waitFor({ timeout: 6000 });
    ok((await paneles(page).count()) === 2, "«Compartir» abre «Súbelo a tu estado» encima");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }
  {
    const { ctx, page, errores } = await pagina(ancho, MICHEL);
    await abrirVista(page, KURT);
    const panel = arriba(page);
    const alto = (await panel.boundingBox()).height;
    await page.locator("[data-stock-plegable] button[aria-expanded]").click();
    await esperar(page, 300);
    const alto2 = (await panel.boundingBox()).height;
    ok(alto2 > alto, `Al abrir el stock la hoja crece (${Math.round(alto)} → ${Math.round(alto2)})`);
    const hueco = await page.evaluate(() => { const c = [...document.querySelectorAll("[data-hoja-contenido]")].pop(); return c.scrollHeight - c.clientHeight; });
    ok(hueco <= 1 || alto2 >= 844 - 80, "Sin espacio vacío debajo (mide su contenido)");
    const antes = (await producto(page, KURT))?.stock ?? 1;
    await page.getByRole("button", { name: /^Disminuir stock de/ }).click();
    await captura(page, "ver-producto/2-stock-abierto", ancho);
    await page.locator("[data-pie-vista]").getByRole("button", { name: "Guardar cambios" }).click();
    await page.getByText("¿Por qué baja el stock?").waitFor();
    ok((await paneles(page).count()) === 2, "Bajar pide motivo en su hoja");
    await arriba(page).getByText("Corrección de inventario", { exact: true }).click();
    await page.getByRole("button", { name: "Guardar ajuste" }).click();
    ok(await toast(page, "Ajuste guardado. No cuenta como venta."), "Ajuste guardado");
    await esperar(page, 600);
    ok((await producto(page, KURT)).stock === antes - 1, "El stock bajó uno");
    await abrirVista(page, KURT);
    ok((await page.locator("[data-stock-plegable]").getAttribute("data-abierto")) === null, "Al volver a abrir, el stock empieza cerrado otra vez");
    await abrirVista(page, OUD);
    await page.locator("[data-stock-plegable] button[aria-expanded]").click();
    await esperar(page, 300);
    ok((await page.locator("[data-fila-stock]").count()) === 3, "Hasta 3 presentaciones: una fila − / + por cada una");
    await abrirVista(page, URBAN);
    ok((await page.locator("[data-franja-espera]").innerText()).includes("2 personas lo esperan"), "«2 personas lo esperan»");
    ok(errores.length === 0, `Sin errores (${errores.join(" | ")})`);
    await ctx.close();
  }
}

await navegador.close();
console.log("\nListo.");
