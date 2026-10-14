// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-landing.mjs [url]`.
// La landing de deslizapp.com (docs/prompts/landing-demo-scroll.md) a 360×640, 390×844, 430×932 y 1440×900:
// el scroll avanza y retrocede la demo (escena, bolsa, total, código), el teléfono con su proporción real, el ♥ sobre su
// ancla, el fondo de cada persona, «Saltar», «Entrar», los dos CTA, movimiento reducido, sin JavaScript y que el modo demo
// sigue abriendo el panel. Con CAPTURAS=1 guarda una captura por
// escena (390×844 y 1440×900) en docs/capturas/landing/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { ESCENAS, DURACION, en, fotoDe, estadoDemo, hiloEn, HILO_APARECE } = await import("../lib/landing/escenas.ts");
const { ENLACE_QUIERO_VENDER, ENLACE_CATALOGO_EJEMPLO } = await import("../lib/landing/enlaces.ts");
const { CODIGO_DEMO } = await import("../lib/landing/pedido-demo.ts");

const base = process.argv[2] ?? "http://localhost:3000";
const capturas = process.env.CAPTURAS === "1";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
let fallos = 0;
const ok = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    fallos++;
    console.log("  ✗", msg);
  }
};

/** Lleva el scroll al punto `p` de la demo (en unidades de la tabla de escenas). */
async function irA(pagina, p) {
  await pagina.evaluate((f) => {
    const s = document.getElementById("demo");
    const e = s.querySelector(".lt-escenario");
    const tope = parseFloat(getComputedStyle(e).top) || 0;
    window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - tope + (s.offsetHeight - e.offsetHeight) * f);
  }, p / DURACION);
  // Dos cuadros: el scroll y el requestAnimationFrame que pinta.
  await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const leer = (pagina) => pagina.evaluate(() => ({ ...document.querySelector(".lt-escenario").dataset, p: Number(getComputedStyle(document.querySelector(".lt-escenario")).getPropertyValue("--p")) }));

/** Opacidad real de la última palabra de la tarjeta de una escena (la que se lee en pantalla). */
const opacidadLeyenda = (pagina, id) =>
  pagina.evaluate((id) => {
    const palabras = document.querySelectorAll(`[data-leyenda="${id}"] .palabra`);
    return Number(getComputedStyle(palabras[palabras.length - 1]).opacity);
  }, id);

/** El teléfono visible: proporción 393×852 y dentro de la pantalla. Y dónde está el ♥ respecto de su ancla. */
const medir = (pagina, ancla) =>
  pagina.evaluate((ancla) => {
    const e = document.querySelector(".lt-escenario");
    const tels = [...e.querySelectorAll(".lt-telefono")].filter((t) => Number(getComputedStyle(t).opacity) > 0.9);
    const t = tels[tels.length - 1]?.getBoundingClientRect();
    const hilo = e.querySelector("[data-hilo]");
    const h = hilo.getBoundingClientRect();
    const a = ancla ? e.querySelector(`[data-ancla="${ancla}"]`)?.getBoundingClientRect() : null;
    return {
      proporcion: t ? t.width / t.height : 0,
      dentro: t ? t.top >= 0 && t.left >= 0 && t.bottom <= innerHeight && t.right <= innerWidth : false,
      hiloVisible: Number(getComputedStyle(hilo.firstElementChild).opacity),
      distancia: a ? Math.hypot(h.left + h.width / 2 - (a.left + a.width / 2), h.top + h.height / 2 - (a.top + a.height / 2)) : 0,
      fondoTienda: Number(getComputedStyle(e.querySelector(".lt-fondo-tienda")).opacity),
    };
  }, ancla);

for (const [ancho, alto] of [
  [360, 640],
  [390, 844],
  [430, 932],
  [1440, 900],
]) {
  console.log(`\n${ancho}×${alto}`);
  const contexto = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(e.message));
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  ok(await pagina.locator(".lt-escenario").isVisible(), "se ve el escenario animado");
  ok(!(await pagina.locator(".landing-pasos .lt-telefono").first().isVisible()), "la versión en pasos queda solo para lectores de pantalla");

  // Adelante: cada escena en su punto, con el estado que dice la tabla.
  for (const e of ESCENAS) {
    const p = fotoDe(e);
    await irA(pagina, p);
    const d = await leer(pagina);
    const esperado = estadoDemo(p);
    ok(
      d.escena === e.id && Number(d.bolsa) === esperado.bolsa && Number(d.total) === esperado.total && (d.codigo === "si") === esperado.codigoVisible,
      `${e.id}: bolsa ${d.bolsa}, total ${d.total}, código ${d.codigo}`,
    );
    ok((await opacidadLeyenda(pagina, e.id)) > 0.95, `${e.id}: su frase se lee`);
    const h = hiloEn(p);
    const quieto = h.t === 0 && p >= HILO_APARECE[1];
    const m = await medir(pagina, quieto ? h.de : null);
    ok(Math.abs(m.proporcion - 393 / 852) < 0.01 && m.dentro, `${e.id}: el teléfono mide 393×852 y cabe (${m.proporcion.toFixed(3)})`);
    if (quieto) ok(m.hiloVisible > 0.9 && m.distancia < 3, `${e.id}: el ♥ está sobre «${h.de}» (a ${m.distancia.toFixed(1)} px)`);
    ok(e.lado === "tienda" ? m.fondoTienda > 0.95 : m.fondoTienda < 0.05, `${e.id}: fondo de ${e.lado === "tienda" ? "la tienda (verde)" : "la compradora (rosa)"}`);
    if (capturas && (ancho === 390 || ancho === 1440)) {
      mkdirSync("docs/capturas/landing", { recursive: true });
      await pagina.screenshot({ path: `docs/capturas/landing/${String(ESCENAS.indexOf(e) + 1).padStart(2, "0")}-${e.id}-${ancho}.png` });
    }
  }
  // Atrás: la bolsa vuelve a bajar y la escena retrocede.
  await irA(pagina, en("explorar", 0.5));
  const atras = await leer(pagina);
  ok(atras.escena === "explorar" && Number(atras.bolsa) < 2, `al subir, vuelve a explorar con la bolsa en ${atras.bolsa}`);
  await irA(pagina, 0);
  const inicio = await leer(pagina);
  ok(inicio.escena === "bienvenida" && inicio.bolsa === "0", "arriba del todo: bienvenida y bolsa vacía");
  // Quieto: sin scroll el progreso no cambia solo.
  await irA(pagina, en("seguimiento", 0.4));
  const antes = (await leer(pagina)).p;
  await pagina.waitForTimeout(700);
  ok((await leer(pagina)).p === antes, "sin scroll, la demo se queda donde está");
  ok(await pagina.getByText(`#${CODIGO_DEMO}`).first().isVisible(), "el código del pedido se ve en el enlace");

  // Nada se sale por los lados (sin scroll horizontal).
  ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin scroll horizontal");

  // Saltar demo y los CTA.
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.locator("[data-saltar]").click();
  await pagina.waitForTimeout(400);
  ok(await pagina.locator("#cierre").evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }), "«Saltar» lleva al cierre");
  ok((await pagina.getByRole("link", { name: "Quiero vender" }).getAttribute("href")) === ENLACE_QUIERO_VENDER, "«Quiero vender» abre WhatsApp con el texto");
  ok((await pagina.getByRole("link", { name: "Ver un catálogo de ejemplo" }).getAttribute("href")) === ENLACE_CATALOGO_EJEMPLO, "«Ver un catálogo de ejemplo» va a la Tienda de ensayo");
  const cierre = await pagina.getByRole("link", { name: "Quiero vender" }).boundingBox();
  ok(cierre && cierre.x >= 0 && cierre.x + cierre.width <= ancho, "los CTA caben en la pantalla");
  ok(errores.length === 0, `sin errores de la página${errores.length ? ": " + errores.join(" | ") : ""}`);

  // «Entrar» (en el cierre): la pantalla de entrada de siempre.
  await pagina.locator('[data-cta="entrar"]').click();
  await pagina.waitForURL("**/entrar");
  ok(await pagina.getByRole("button", { name: /Entrar con Google/ }).isVisible(), "«Entrar» abre la entrada con Google");
  ok(await pagina.getByRole("button", { name: "Ver demo" }).isVisible(), "y sigue el «Ver demo»");
  await contexto.close();
}

console.log("\nMovimiento reducido");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  ok(!(await pagina.locator(".landing-demo").isVisible()), "sin escenario animado");
  ok((await pagina.locator(".landing-pasos [data-paso] .lt-telefono:visible").count()) === ESCENAS.length, "la historia en pasos, con un teléfono por escena");
  if (capturas) await pagina.screenshot({ path: "docs/capturas/landing/movimiento-reducido-390.png", fullPage: false, clip: { x: 0, y: 0, width: 390, height: 844 } });
  await contexto.close();
}

console.log("\nSin JavaScript");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/");
  ok(await pagina.getByRole("heading", { name: "Un pedido, de principio a fin" }).isVisible(), "se entiende la propuesta (pasos)");
  ok(await pagina.getByRole("link", { name: "Quiero vender" }).isVisible(), "y se llega a los CTA");
  ok(await pagina.getByRole("link", { name: "Entrar", exact: true }).isVisible(), "y a «Entrar»");
  await contexto.close();
}

console.log("\nCon el modo demo elegido, / abre el panel como antes");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 } });
  await contexto.addInitScript(() => localStorage.setItem("deslizapp-modo-v1", "demo"));
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  await pagina.getByRole("navigation", { name: "Secciones" }).waitFor({ timeout: 15000 }).catch(() => {});
  ok(await pagina.getByRole("navigation", { name: "Secciones" }).isVisible(), "se ve el panel (barra de secciones)");
  ok(!(await pagina.locator(".landing").isVisible()), "y no la landing");
  await contexto.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
