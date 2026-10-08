// Presentaciones del producto (docs/prompts/presentaciones-panel.md §6), en la demo: los recorridos de los tableros Main → Elegir →
// Lista → Hoja → Foto, el perfume con «Tamaño», quitar con y sin pedidos, cambiar qué varía y el Ayudante. A 390 y 360, tema claro.
// Nunca toca Supabase.
//   URL=http://localhost:3000 [CHROMIUM_PATH=…] [ANCHOS=390,360] [TEMAS=claro] [SOLO=crear,perfume] [CAPTURAS=docs/capturas/presentaciones] node scripts/probar-presentaciones.mjs
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
const ANCHOS = (process.env.ANCHOS ?? "390,360").split(",").map(Number);
const TEMAS = (process.env.TEMAS ?? "claro").split(",");
const CAPTURAS = process.env.CAPTURAS ?? null;
const SOLO = process.env.SOLO ? process.env.SOLO.split(",") : null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const MICHEL = "a1000000-0000-4000-8000-000000000001";
const LINO = "a1000000-0000-4000-8000-000000000003";
const PANTALON = "a3000000-0000-4000-8000-000000000018";
const OUD = "a3000000-0000-4000-8000-000000000019";
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
        // Como un navegador real: devuelve la ventana (null = no se abrió, y entonces no se marca nada).
        return { opener: null };
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
/** Marca los valores de una cosa que cambia en la hoja abierta: la píldora si es sugerida; si no, con «+ Otro …». */
async function escribirEtiqueta(page, rotulo, valores) {
  const cosa = { Colores: "Color", Tallas: "Talla", Tamaños: "Tamaño" }[rotulo] ?? rotulo;
  const seccion = hoja(page).locator(`[data-eje="${cosa}"]`);
  for (const v of valores) {
    const pildora = seccion.getByRole("checkbox", { name: v, exact: true });
    if (await pildora.count()) {
      await pildora.click();
      continue;
    }
    const caja = seccion.getByRole("textbox", { name: `Otro ${cosa.toLocaleLowerCase("es")}` });
    if (!(await caja.isVisible().catch(() => false))) await seccion.getByRole("button", { name: `+ Otro ${cosa.toLocaleLowerCase("es")}` }).click();
    await caja.fill(v);
    await caja.press("Enter");
  }
}


/** Una foto PNG de un color liso, hecha en el navegador (base64). */
async function foto(page, color) {
  return page.evaluate(async (c) => {
    const lienzo = document.createElement("canvas");
    lienzo.width = 600;
    lienzo.height = 600;
    const ctx = lienzo.getContext("2d");
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 600, 600);
    return lienzo.toDataURL("image/png").split(",")[1];
  }, color);
}
const abrirProducto = async (page, id) => {
  await page.goto(`${URL}/catalogo/${id}/editar`);
  await page.locator("#titulo-presentaciones").waitFor();
};
const guardarProducto = async (page) => {
  await page.getByRole("button", { name: /^(Guardar cambios|Publicar)$/ }).click();
};
const producto = async (page, nombre) => (await db(page)).productos.find((p) => p.nombre === nombre);
const variantesDe = async (page, id) => (await db(page)).variantes.filter((v) => v.productoId === id);
const espera = (page, ms = 350) => page.waitForTimeout(ms);
const encabezado = (page) => page.locator("#titulo-presentaciones").locator("xpath=..").innerText();
const filasPres = (page) => page.getByRole("list", { name: "Presentaciones del producto" }).first().locator("li");

const ESCENARIOS = {
  /** Main → Elegir → Lista: Talla (XS a XL) y Color (Negro, Arena) → 10; stock; precio propio; foto por color; Publicar. */
  async crear(page, ancho, tema) {
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Camisa nueva");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("1850");
    ok(await page.getByText("¿Viene en varias tallas, colores o tamaños?").isVisible(), "Main: la tarjeta pregunta si viene en varias tallas, colores o tamaños");
    ok(await page.getByRole("button", { name: "No, solo viene de una forma" }).isVisible(), "…y deja decir que no");
    await capturar(page, "main", ancho, tema);
    const a = [await foto(page, "#2b2b2b"), await foto(page, "#e8d9c4")];
    await page.locator("[data-entrada-medios]").setInputFiles([
      { name: "negro.png", mimeType: "image/png", buffer: Buffer.from(a[0], "base64") },
      { name: "arena.png", mimeType: "image/png", buffer: Buffer.from(a[1], "base64") },
    ]);
    await page.getByRole("button", { name: /^Foto 2 de 2/ }).waitFor();
    await page.getByRole("button", { name: "Agregar presentaciones", exact: true }).click();
    await hoja(page).getByText("¿Qué cambia de una a otra?").waitFor();
    ok((await hoja(page).getByRole("button", { name: "Contraer Talla" }).getAttribute("aria-expanded")) === "true", "Elegir: Talla ya viene elegida y abierta (la típica de la ropa)");
    await hoja(page).getByRole("button", { name: "Color", exact: true }).click();
    await hoja(page).getByRole("button", { name: "XS a XL", exact: true }).click();
    await escribirEtiqueta(page, "Colores", ["Negro", "Arena"]);
    // Tocar fuera cierra el campo de escribir (si no, el toque a «Crear» llega con el contenido ya movido).
    await hoja(page).getByText("¿Qué cambia de una a otra?").click();
    ok(await hoja(page).getByRole("button", { name: "Crear las 10", exact: true }).isEnabled(), "Elegir: el botón dice «Crear las 10»");
    ok(await hoja(page).getByText("Ya elegiste 2: es el máximo.").isVisible(), "…y con dos cosas elegidas «+ Otra cosa» pasa a «Ya elegiste 2: es el máximo.»");
    ok(await hoja(page).getByRole("button", { name: "Material", exact: true }).isDisabled(), "…y las demás se apagan");
    await capturar(page, "elegir", ancho, tema);
    await hoja(page).getByRole("button", { name: "Crear las 10", exact: true }).click();
    await page.getByRole("button", { name: "Ver las 10", exact: true }).click();
    ok((await filasPres(page).count()) === 10, "Lista: hay 10 filas");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Agregar uno de S · Negro" }).click();
    await page.getByRole("button", { name: "Agregar uno de XL · Arena" }).click();
    ok((await encabezado(page)).includes("10 · 4 en total"), "El encabezado cuenta 10 · 4 en total");
    await page.getByRole("button", { name: "Abrir XL · Arena" }).click();
    await hoja(page).getByText("Precio", { exact: true }).waitFor();
    await hoja(page).getByRole("radio", { name: "Uno propio" }).click();
    await hoja(page).getByRole("textbox", { name: /Precio de esta presentación/ }).fill("2100");
    await capturar(page, "hoja", ancho, tema);
    await hoja(page).getByRole("button", { name: "Listo", exact: true }).click();
    await page.getByText("RD$2,100 · precio propio").waitFor();
    ok(true, "La fila dice «RD$2,100 · precio propio»");
    await page.getByRole("button", { name: /^Foto de cada color/ }).click();
    await hoja(page).getByText("Sin foto: se ve la del producto").first().waitFor();
    await hoja(page).getByRole("button", { name: "Elegir" }).first().click();
    await hoja(page).getByRole("radio", { name: /^Foto 1/ }).click();
    await hoja(page).getByRole("button", { name: "Elegir" }).first().click();
    await hoja(page).getByRole("radio", { name: /^Foto 2/ }).click();
    await capturar(page, "foto", ancho, tema);
    await hoja(page).getByRole("button", { name: "Listo", exact: true }).click();
    ok(await sinDesborde(page), "La ficha no se desborda a los lados");
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.waitForURL((u) => !u.pathname.endsWith("/editar") && !u.pathname.endsWith("/nuevo"));
    const p = await producto(page, "Camisa nueva");
    const v = await variantesDe(page, p.id);
    ok(p.opciones.map((o) => o.nombre).join() === "Talla,Color" && v.length === 10, "Publicar crea el producto con sus 10 presentaciones");
    ok(v.find((x) => x.valores.Talla === "S" && x.valores.Color === "Negro").stock === 3 && p.stock === 4, "…con su stock (4 en total)");
    ok(v.find((x) => x.valores.Talla === "XL" && x.valores.Color === "Arena").precio === 2100 && v.filter((x) => x.precio !== null).length === 1, "…y el precio propio solo en XL · Arena");
    ok(p.fotosPorValor?.Color?.Negro === p.medios[0].url && p.fotosPorValor?.Color?.Arena === p.medios[1].url && !p.fotosPorValor?.Color?.Verde, "…y la foto de cada color: Negro la 1, Arena la 2");
  },

  /** Lista de la demo: Pantalón de algodón con 12 presentaciones, filtro, precio propio, foto por color y el catálogo del panel. */
  async lista(page, ancho, tema) {
    await page.goto(`${URL}/catalogo`);
    const tarjeta = page.getByRole("link", { name: /^Pantalón de algodón/ });
    await tarjeta.waitFor();
    const t = await tarjeta.innerText();
    ok(t.includes("Desde RD$2,300 · 12 presentaciones"), "Panel: «Desde RD$2,300 · 12 presentaciones»");
    ok(/2 agotadas/.test(t) && /\d+ en total/.test(t), "…con «2 agotadas» y «N en total»");
    await capturar(page, "panel", ancho, tema);
    await abrirProducto(page, PANTALON);
    ok((await encabezado(page)).includes("12 · 31 en total"), "Lista: 12 · 31 en total");
    await page.getByRole("button", { name: "XL", exact: true }).first().click();
    await espera(page);
    ok((await filasPres(page).count()) === 3, "El filtro por talla deja las 3 XL");
    ok((await filasPres(page).first().innerText()).includes("RD$2,900 · precio propio"), "XL con «RD$2,900 · precio propio»");
    await page.getByRole("button", { name: "Todas", exact: true }).click();
    await page.getByRole("button", { name: "Ver las 12", exact: true }).click();
    ok((await page.getByText("Agotada", { exact: true }).count()) === 2, "Dos dicen «Agotada» con todas sus letras");
    await capturar(page, "lista", ancho, tema);
    await page.getByRole("button", { name: /^Foto de cada color/ }).click();
    const texto = await hoja(page).innerText();
    ok(texto.includes("Negro") && texto.includes("4 presentaciones"), "Foto: cada color con sus 4 presentaciones");
    await hoja(page).getByRole("button", { name: "Cambiar" }).first().click();
    await hoja(page).getByText("Elegir foto para Negro").waitFor();
    await hoja(page).getByRole("radio", { name: /^Foto 1/ }).click();
    await hoja(page).getByRole("button", { name: "Listo", exact: true }).click();
    await guardarProducto(page);
    await page.waitForURL((u) => !u.pathname.endsWith("/editar") && !u.pathname.endsWith("/nuevo"));
    const p = await producto(page, "Pantalón de algodón");
    ok(p.fotosPorValor.Color.Negro === p.medios[0].url, "Guardar cambia la foto de Negro a la 1");
    ok(Object.keys(p.fotosPorValor.Color).length === 3, "…y las otras dos siguen");
  },

  /** Quitar: sin pedidos se borra; con pedidos solo se oculta y lo dice. */
  async quitar(page, ancho, tema) {
    await abrirProducto(page, PANTALON);
    await page.getByRole("button", { name: "Ver las 12", exact: true }).click();
    await page.getByRole("button", { name: "Abrir M · Verde", exact: true }).click();
    await hoja(page).getByRole("button", { name: "Quitar", exact: true }).click();
    await page.getByText("¿Quitar M · Verde?").waitFor();
    await capturar(page, "quitar", ancho, tema);
    await page.getByRole("alertdialog").getByRole("button", { name: "Quitar", exact: true }).click();
    await espera(page);
    ok((await encabezado(page)).includes("11 ·"), "Sin pedidos: queda en 11");
    await guardarProducto(page);
    await page.waitForURL((u) => !u.pathname.endsWith("/editar") && !u.pathname.endsWith("/nuevo"));
    const p = await producto(page, "Pantalón de algodón");
    ok((await variantesDe(page, p.id)).length === 11, "…y se borra de verdad");
    // La demo no trae pedidos con presentaciones: se le pone uno a «S · Negro» del pantalón, en el almacenamiento del navegador.
    await page.evaluate(([k, tienda, producto]) => {
      const d = JSON.parse(localStorage.getItem(k));
      // Lino no trae pedidos: se crea uno (una copia de cualquiera, de esta tienda).
      const pedido = { ...structuredClone(d.pedidos[0]), id: "pedido-con-presentacion", tiendaId: tienda, numero: 1001 };
      d.pedidos.push(pedido);
      const v = d.variantes.find((x) => x.productoId === producto && x.valores.Talla === "S" && x.valores.Color === "Negro");
      d.pedidoItems.push({ id: "item-con-presentacion", pedidoId: pedido.id, productoId: producto, varianteId: v.id, varianteTexto: "S · Negro", nombreProducto: "Pantalón de algodón", cantidad: 1, precioUnitario: 2300, porEncargo: false });
      localStorage.setItem(k, JSON.stringify(d));
    }, [CLAVE, LINO, PANTALON]);
    await page.reload();
    const d = await db(page);
    const v = d.variantes.find((x) => x.productoId === PANTALON && x.valores.Talla === "S" && x.valores.Color === "Negro");
    ok(!!v, "La demo ya tiene una presentación con pedidos");
    await abrirProducto(page, v.productoId);
    const texto = Object.values(v.valores).join(" · ");
    await page.getByRole("button", { name: /^Ver las/ }).click().catch(() => {});
    await page.getByRole("button", { name: `Abrir ${texto}`, exact: true }).click();
    await hoja(page).getByRole("button", { name: "Quitar", exact: true }).click();
    await page.getByText("Ya tiene pedidos: la ocultamos para no perder tu historial.").waitFor();
    ok(true, "Con pedidos dice «Ya tiene pedidos: la ocultamos para no perder tu historial»");
    await page.getByRole("alertdialog").getByRole("button", { name: `Ocultar ${texto}`, exact: true }).click();
    await guardarProducto(page);
    await page.waitForURL((u) => !u.pathname.endsWith("/editar") && !u.pathname.endsWith("/nuevo"));
    const despues = (await db(page)).variantes.find((x) => x.id === v.id);
    ok(despues && despues.activa === false, "…y queda oculta, no borrada");
  },

  /** Cambiar qué varía: de Talla a Talla y Color; las que había quedan en «Sin color», con su stock; nada se duplica. */
  async cambiar(page) {
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Blusa");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("900");
    await page.getByRole("button", { name: "Agregar presentaciones", exact: true }).click();
    await hoja(page).getByRole("button", { name: "XS a XL", exact: true }).click();
    await hoja(page).getByRole("button", { name: "Crear las 5", exact: true }).click();
    await page.getByRole("button", { name: "Agregar uno de M", exact: true }).click();
    await page.getByRole("button", { name: "Agregar uno de M", exact: true }).click();
    await page.getByRole("button", { name: /^Cambiar qué varía/ }).click();
    await hoja(page).getByRole("button", { name: "Color", exact: true }).click();
    await escribirEtiqueta(page, "Colores", ["Negro", "Arena"]);
    await hoja(page).getByText("¿Qué cambia de una a otra?").click();
    await hoja(page).getByRole("button", { name: "Guardar", exact: true }).click();
    await page.getByRole("button", { name: "Agregar uno de M · Sin color" }).waitFor();
    ok((await filasPres(page).count()) === 5, "Quedan las 5 de siempre (nada se duplica)");
    ok((await encabezado(page)).includes("5 · 2 en total"), "…con su stock (2 en total)");
    await page.getByRole("button", { name: "Abrir M · Sin color" }).click();
    await hoja(page).getByText("¿Cuál es?").waitFor();
    await hoja(page).getByRole("radio", { name: "Negro", exact: true }).click();
    await espera(page);
    await hoja(page).getByRole("button", { name: "Listo", exact: true }).click();
    await page.getByRole("button", { name: "Agregar uno de M · Negro" }).first().waitFor();
    ok(true, "La completa: M · Sin color pasa a M · Negro");
  },

  /** La lista que se expande: elegir, colapsar con resumen, el máximo de 2, una cosa propia, «Quitar» y volver a elegir. */
  async expandible(page, ancho, tema) {
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Lista nueva");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("500");
    await page.getByRole("button", { name: "Agregar presentaciones", exact: true }).click();
    await hoja(page).getByText("¿Qué cambia de una a otra?").waitFor();
    ok((await hoja(page).locator("[data-eje]").count()) === 1, "Una sola cosa abierta al empezar (Talla)");
    ok(await hoja(page).getByRole("button", { name: "Color", exact: true }).isEnabled(), "Color está sin elegir y se puede tocar");
    ok((await hoja(page).getByRole("checkbox", { name: "Color", exact: true }).count()) === 0, "…y no hay rectángulos de arriba (solo la lista)");
    await hoja(page).getByRole("button", { name: "Color", exact: true }).click();
    ok((await hoja(page).getByRole("button", { name: "Contraer Color" }).getAttribute("aria-expanded")) === "true", "Elegir Color lo expande ahí mismo");
    ok((await hoja(page).getByRole("button", { name: "Contraer Talla" }).getAttribute("aria-expanded")) === "true", "…y Talla no se colapsa sola");
    await escribirEtiqueta(page, "Colores", ["Dorado", "Plateado"]);
    await hoja(page).getByText("¿Qué cambia de una a otra?").click();
    await hoja(page).getByRole("button", { name: "Contraer Color" }).click();
    ok(await hoja(page).getByRole("button", { name: "Expandir Color" }).getByText("Dorado, Plateado").isVisible(), "Colapsada resume «Dorado, Plateado»");
    await hoja(page).getByRole("button", { name: "Expandir Talla" }).count();
    await hoja(page).getByRole("button", { name: "Contraer Talla" }).click();
    ok(await hoja(page).getByRole("button", { name: "Expandir Talla" }).getByText("Elige cuáles tienes").isVisible(), "Sin valores dice «Elige cuáles tienes»");
    ok(await hoja(page).getByText("Ya elegiste 2: es el máximo.").isVisible(), "Con 2: «Ya elegiste 2: es el máximo.» en lugar de «+ Otra cosa»");
    ok(await hoja(page).getByRole("button", { name: "Material", exact: true }).isDisabled(), "…y las demás tarjetas se apagan");
    await capturar(page, "expandible-cerradas", ancho, tema);
    await hoja(page).getByRole("button", { name: "Quitar Talla" }).click();
    ok((await hoja(page).getByRole("button", { name: "Talla", exact: true }).count()) === 1, "Quitar la devuelve a la lista, sin confirmar");
    ok(await hoja(page).getByRole("button", { name: "+ Otra cosa" }).isVisible(), "…y «+ Otra cosa» vuelve");
    await hoja(page).getByRole("button", { name: "+ Otra cosa" }).click();
    await hoja(page).getByRole("textbox", { name: "¿Qué otra cosa cambia?" }).fill("Aroma");
    await hoja(page).getByRole("button", { name: "Listo", exact: true }).click();
    ok((await hoja(page).locator('[data-eje="Aroma"]').count()) === 1, "Una cosa propia («Aroma») se vuelve tarjeta");
    await hoja(page).getByRole("button", { name: "Quitar Aroma" }).click();
    ok((await hoja(page).locator('[data-eje="Aroma"]').count()) === 0, "Quitar una propia la borra");
    await hoja(page).getByRole("button", { name: "Talla", exact: true }).click();
    ok((await hoja(page).getByRole("button", { name: "Contraer Talla" }).getAttribute("aria-expanded")) === "true", "Volver a elegir Talla la deja abierta y vacía");
    await hoja(page).getByRole("button", { name: "XS a XL", exact: true }).click();
    await hoja(page).getByRole("button", { name: "Crear las 10", exact: true }).click();
    await page.getByRole("button", { name: "Ver las 10", exact: true }).click();
    ok((await filasPres(page).count()) === 10, "Crea las 10 (5 tallas × 2 colores)");
    await capturar(page, "expandible", ancho, tema);
  },

  /** Perfume: «Tamaño» típica de los perfumes, atajo 30 · 50 · 100 ml y «Desde» con precio propio. */
  async perfume(page, ancho, tema) {
    await abrirProducto(page, OUD);
    ok((await encabezado(page)).includes("3 · 14 en total"), "El Majestic Oud: 3 · 14 en total");
    const filas = await page.getByRole("list", { name: "Presentaciones del producto" }).first().innerText();
    ok(filas.includes("RD$1,200 · precio propio") && filas.includes("RD$1,900 · precio propio"), "30 ml y 50 ml con su precio propio; 100 ml con el del producto");
    await capturar(page, "perfume", ancho, tema);
    await page.goto(`${URL}/catalogo/nuevo`);
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Perfume nuevo");
    await page.getByRole("textbox", { name: "Precio (RD$)" }).fill("2500");
    await page.getByRole("button", { name: "Agregar presentaciones", exact: true }).click();
    ok((await hoja(page).getByRole("button", { name: "Contraer Tamaño" }).getAttribute("aria-expanded")) === "true", "Los perfumes sugieren «Tamaño»");
    for (const ml of ["30 ml", "50 ml", "100 ml"]) await hoja(page).getByRole("checkbox", { name: ml, exact: true }).click();
    ok(await hoja(page).getByRole("button", { name: "Crear las 3", exact: true }).isEnabled(), "Los 30, 50 y 100 ml sugeridos crean 3");
    await hoja(page).getByRole("button", { name: "Crear las 3", exact: true }).click();
    ok((await filasPres(page).count()) === 3, "Y salen 3 filas");
  },

  /** El Ayudante ve las presentaciones pero no cambia nada. */
  async ayudante(page, ancho, tema) {
    await page.goto(`${URL}/catalogo`);
    await page.waitForSelector('header button[aria-haspopup="dialog"]');
    await espera(page, 900);
    await page.locator('header button[aria-haspopup="dialog"]').first().tap();
    await page.waitForSelector("[data-tienda-activa]");
    await espera(page, 500);
    await page.locator('[data-mirar-como] [role="radio"]:has-text("Ayudante")').tap();
    await espera(page, 500);
    await page.keyboard.press("Escape");
    await espera(page, 500);
    await abrirProducto(page, PANTALON);
    await page.waitForSelector("[data-sin-permiso]");
    ok(await page.getByRole("button", { name: "Agregar uno de S · Negro" }).isDisabled(), "Ayudante: el + está apagado");
    ok(await page.getByRole("button", { name: "Quitar uno de S · Negro" }).isDisabled(), "…y el − también");
    ok(await page.getByRole("button", { name: /^Cambiar qué varía/ }).isDisabled(), "«Cambiar qué varía» apagado");
    ok(await page.getByRole("button", { name: "Agregar presentación", exact: true }).isDisabled(), "«Agregar presentación» apagado");
    await page.getByRole("button", { name: "Abrir S · Negro", exact: true }).click();
    await espera(page, 500);
    ok((await page.getByRole("dialog").count()) === 1, "La hoja de una presentación no se abre (solo la ficha)");
    ok((await page.locator("[data-sin-permiso]").first().innerText()).includes("Esto lo hace quien administra la tienda."), "Y dice por qué: «Esto lo hace quien administra la tienda.»");
    await capturar(page, "ayudante", ancho, tema);
  },
};

const TIENDA = { crear: LINO, lista: LINO, quitar: LINO, cambiar: LINO, expandible: LINO, perfume: MICHEL, ayudante: LINO };

for (const tema of TEMAS) {
  for (const ancho of ANCHOS) {
    for (const [nombre, correr] of Object.entries(ESCENARIOS)) {
      if (SOLO && !SOLO.includes(nombre)) continue;
      console.log(`${nombre} · ${ancho} · ${tema}`);
      const { ctx, page, errores } = await pagina(ancho, tema, TIENDA[nombre]);
      try {
        await correr(page, ancho, tema);
        ok(errores.length === 0, `Sin errores de página${errores.length ? `: ${errores[0]}` : ""}`);
      } catch (e) {
        fallas++;
        console.log(`  ❌ ${nombre} falló: ${e.message.split("\n").slice(0, 4).join(" | ")}`);
        await page.screenshot({ path: join(tmpdir(), `probar-presentaciones-${nombre}-${ancho}-${tema}.png`) }).catch(() => {});
      } finally {
        await ctx.close();
      }
    }
  }
}
await navegador.close();
console.log(fallas ? `\n${fallas} escenario(s) fallaron.` : "\nTodo bien.");
process.exit(fallas ? 1 : 0);
