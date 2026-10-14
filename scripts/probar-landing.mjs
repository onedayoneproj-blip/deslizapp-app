// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-landing.mjs [url]`.
// La landing de deslizapp.com por pasos (referencias/landing/ajustes-lewis-2.md) a 360×640, 390×844, 430×932 y 1440×900:
// avanzar paso a paso (la bienvenida con el logo antes del teléfono; burbuja completa y sin desenfoque, que no tapa el ♥; estado del
// teléfono: bolsa, total y código; el mockup entero y la página llenando su pantalla; el ♥ sobre su ancla; el fondo de cada persona), retroceder un paso, un deslizamiento fuerte no se salta pasos, «Saltar», los CTA y «Entrar»,
// movimiento reducido, sin JavaScript y que el modo demo sigue abriendo el panel. Con CAPTURAS=1 guarda una captura por paso
// (390×844 y 1440×900) en docs/capturas/landing/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { PASOS, estadoPaso } = await import("../lib/landing/pasos.ts");
const { ENLACE_QUIERO_VENDER, ENLACE_CATALOGO_EJEMPLO } = await import("../lib/landing/enlaces.ts");

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

const irAlPaso = (pagina, i) => pagina.evaluate((i) => document.querySelector(`[data-paso-seccion="${i}"]`).scrollIntoView({ behavior: "instant" }), i);
const datos = (pagina) => pagina.evaluate(() => ({ ...document.querySelector(".lt-escenario").dataset }));

/** Todo lo que se comprueba de un paso, medido en la página. */
const medir = (pagina, i) =>
  pagina.evaluate(
    ({ i, paso }) => {
      const e = document.querySelector(".lt-escenario");
      const burbuja = e.querySelector(`[data-burbuja="${i}"]`);
      const nitida = getComputedStyle(burbuja).filter === "none" && [...burbuja.querySelectorAll("*")].every((x) => getComputedStyle(x).filter === "none");
      const telefono = e.querySelector(`.lt-tel-${paso.telefono}`);
      const tel = telefono.getBoundingClientRect();
      const mockup = telefono.querySelector(".lt-mockup");
      const hueco = telefono.querySelector(".lt-hueco").getBoundingClientRect();
      const pagina = telefono.querySelector("iframe").getBoundingClientRect();
      const hilo = e.querySelector("[data-hilo]");
      const h = hilo.getBoundingClientRect();
      const b = burbuja.getBoundingClientRect();
      const intro = e.querySelector(".lt-intro");
      let distancia = null;
      if (paso.ancla) {
        const marco = e.querySelector(`iframe[data-telefono="${paso.telefono}"]`);
        const r = marco.contentWindow.__dzAncla?.(paso.ancla);
        if (r) {
          const caja = marco.getBoundingClientRect();
          const esc = caja.width / 393;
          distancia = Math.hypot(h.left + h.width / 2 - (caja.left + r.x * esc), h.top + h.height / 2 - (caja.top + r.y * esc));
        }
      }
      return {
        nitida,
        burbujaVisible: Number(getComputedStyle(burbuja).opacity) > 0.99,
        proporcion: tel.width / tel.height,
        proporcionMockup: mockup.naturalWidth / mockup.naturalHeight,
        llena: Math.abs(pagina.width - hueco.width) < 1.5 && Math.abs(pagina.height - hueco.height) < 1.5,
        telefonoVisible: Number(getComputedStyle(telefono).opacity) > 0.99,
        introVisible: Number(getComputedStyle(intro).opacity) > 0.99 && intro.querySelector("svg") !== null,
        tapaHilo: !(b.bottom <= h.top + h.height * 0.2 || b.top >= h.bottom - h.height * 0.2 || b.right <= h.left || b.left >= h.right),
        dentro: tel.top >= 0 && tel.left >= 0 && tel.bottom <= innerHeight + 1 && tel.right <= innerWidth + 1,
        distancia,
        hiloVisible: hilo.dataset.visible === "si",
        fondoTienda: Number(getComputedStyle(e.querySelector(".lt-fondo-tienda")).opacity),
      };
    },
    { i, paso: PASOS[i] },
  );

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
  await pagina.waitForTimeout(1200);
  ok(await pagina.locator(".lt-escenario").isVisible(), "se ve la demo por pasos");
  // Lo que se mueve dentro de los teléfonos (el reel) no arrastra la página.
  ok((await pagina.evaluate(() => scrollY)) === 0 && (await datos(pagina)).paso === PASOS[0].id, "al abrir, empieza arriba, en la bienvenida");

  // Hacia delante, paso a paso.
  for (let i = 0; i < PASOS.length; i++) {
    const paso = PASOS[i];
    if (i > 0) await irAlPaso(pagina, i);
    await pagina.waitForTimeout(paso.duracion + 1400);
    const d = await datos(pagina);
    const esperado = estadoPaso(i);
    ok(d.paso === paso.id && Number(d.bolsa) === esperado.bolsa && Number(d.total) === esperado.total && (d.codigo === "si") === esperado.codigoVisible, `${paso.id}: bolsa ${d.bolsa}, total ${d.total}, código ${d.codigo}`);
    const m = await medir(pagina, i);
    ok(m.burbujaVisible && m.nitida, `${paso.id}: la burbuja está completa y sin desenfoque`);
    if (paso.id === "intro") ok(m.introVisible && !m.telefonoVisible, "intro: el logo de Deslizapp, todavía sin teléfono");
    else ok(!m.introVisible && m.telefonoVisible && Math.abs(m.proporcion - m.proporcionMockup) < 0.01 && m.dentro && m.llena, `${paso.id}: el mockup entero, en pantalla, con la página llenando su pantalla (${m.proporcion.toFixed(3)})`);
    if (paso.ancla) {
      ok(m.hiloVisible && m.distancia !== null && m.distancia < 4, `${paso.id}: el ♥ está sobre «${paso.ancla}» (a ${m.distancia?.toFixed(1)} px)`);
      ok(!m.tapaHilo, `${paso.id}: la burbuja no tapa el ♥`);
    }
    ok(paso.lado === "tienda" ? m.fondoTienda > 0.95 : m.fondoTienda < 0.05, `${paso.id}: fondo de ${paso.lado === "tienda" ? "la tienda (verde)" : "la compradora (rosa)"}`);
    if (capturas && (ancho === 390 || ancho === 1440)) {
      mkdirSync("docs/capturas/landing", { recursive: true });
      await pagina.screenshot({ path: `docs/capturas/landing/${String(i + 1).padStart(2, "0")}-${paso.id}-${ancho}.png` });
    }
  }
  // El teléfono de la bolsa: el contador real dice 2 y la tienda registró el pedido en su panel.
  const contador = await pagina.evaluate(() => document.querySelector('iframe[data-telefono="compradora"]').contentDocument.querySelector("#bagDock .cnt")?.textContent);
  ok(contador === "2", `la bolsa real del catálogo cuenta ${contador}`);

  // Atrás un paso: vuelve al anterior y su burbuja se ve completa.
  await irAlPaso(pagina, PASOS.length - 2);
  await pagina.waitForTimeout(1600);
  const atras = await datos(pagina);
  const ma = await medir(pagina, PASOS.length - 2);
  ok(atras.paso === PASOS[PASOS.length - 2].id && ma.burbujaVisible, `al subir, vuelve a «${atras.paso}» con su burbuja completa`);

  // Un deslizamiento fuerte no se salta pasos (scroll-snap-stop: always).
  await irAlPaso(pagina, 0);
  await pagina.waitForTimeout(1500);
  await pagina.mouse.move(ancho / 2, alto / 2);
  await pagina.mouse.wheel(0, alto * 3);
  await pagina.waitForTimeout(1600);
  const fuerte = await datos(pagina);
  ok(fuerte.indice === "1", `un deslizamiento fuerte avanza un solo paso (llegó a ${fuerte.paso})`);

  ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "sin scroll horizontal");
  // Saltar y los CTA.
  await pagina.locator("[data-saltar]").click();
  await pagina.waitForTimeout(800);
  ok(await pagina.locator("#cierre").evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }), "«Saltar» lleva al cierre");
  ok((await pagina.getByRole("link", { name: "Quiero vender" }).getAttribute("href")) === ENLACE_QUIERO_VENDER, "«Quiero vender» abre WhatsApp con el texto");
  ok((await pagina.getByRole("link", { name: "Ver un catálogo de ejemplo" }).getAttribute("href")) === ENLACE_CATALOGO_EJEMPLO, "«Ver un catálogo de ejemplo» va a la Tienda de ensayo");
  const cta = await pagina.getByRole("link", { name: "Quiero vender" }).boundingBox();
  ok(cta && cta.x >= 0 && cta.x + cta.width <= ancho, "los CTA caben en la pantalla");
  ok(errores.length === 0, `sin errores de la página${errores.length ? ": " + errores.join(" | ") : ""}`);
  if (capturas && (ancho === 390 || ancho === 1440)) await pagina.screenshot({ path: `docs/capturas/landing/${String(PASOS.length + 1).padStart(2, "0")}-cierre-${ancho}.png` });
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
  await pagina.waitForTimeout(1200);
  await irAlPaso(pagina, 1);
  await pagina.waitForTimeout(400);
  const m = await medir(pagina, 1);
  ok(m.burbujaVisible && m.nitida, "cada paso muestra su estado final al instante (burbuja completa sin animación)");
  if (process.env.CAPTURAS === "1") await pagina.screenshot({ path: "docs/capturas/landing/movimiento-reducido-390.png" });
  await contexto.close();
}

console.log("\nSin JavaScript");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/");
  ok(await pagina.getByRole("heading", { name: "Un pedido, de principio a fin" }).isVisible(), "se entiende la propuesta (pasos con capturas)");
  ok((await pagina.locator(".landing-pasos [data-paso]").count()) === PASOS.length, "un paso por cada uno de la demo");
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

console.log("\nLos teléfonos de la demo no guardan nada");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
  const pagina = await contexto.newPage();
  const red = [];
  // Las fuentes de «Mi marca» (Google Fonts) las pide la hoja real de despacho para el comprobante: no son datos.
  pagina.on("request", (r) => r.url().startsWith("http") && !r.url().startsWith(base) && !/fonts\.(googleapis|gstatic)\.com/.test(r.url()) && red.push(r.url()));
  await pagina.goto(base + "/demo-landing/tienda", { waitUntil: "networkidle" });
  for (let i = PASOS.findIndex((p) => p.telefono === "tienda"); i < PASOS.length; i++) {
    await pagina.evaluate((i) => window.postMessage({ tipo: "dz-landing-paso", paso: i, animar: true }, location.origin), i);
    await pagina.waitForTimeout(PASOS[i].duracion + 1200);
  }
  // (deslizapp-version-vista es del aviso de versión de toda la app, app/layout.tsx: no es de la demo)
  const guardado = await pagina.evaluate(() => Object.keys(localStorage).filter((k) => k !== "deslizapp-version-vista"));
  ok(guardado.length === 0, `la tienda de la demo no escribe localStorage (${guardado.join(", ") || "nada"})`);
  ok(red.length === 0, `ni pide datos a la red (${red.join(", ") || "nada"})`);
  await contexto.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
