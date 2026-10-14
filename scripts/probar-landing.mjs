// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-landing.mjs [url]`.
// La landing de deslizapp.com por pasos (referencias/landing/ajustes-lewis-2.md y -3.md) a 360×640, 393×852, 430×932 y 1440×900:
// avanzar paso a paso (la bienvenida con el logo antes del teléfono; burbuja completa y sin desenfoque, que no tapa la pantalla;
// estado del teléfono: bolsa, total y código; el mockup entero y la página llenando su pantalla; el reel y la bolsa como en la app;
// el ♥ como dedo: en cada toque y en el viaje, oculto en los demás; el índice; el fondo de cada persona), el índice lleva a cada
// capítulo, retroceder un paso, un deslizamiento fuerte no se salta pasos, «Saltar», los CTA y «Entrar»,
// movimiento reducido, sin JavaScript y que el modo demo sigue abriendo el panel. Con CAPTURAS=1 guarda una captura por paso
// (393×852 y 1440×900) en docs/capturas/landing/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { PASOS, CAPITULOS_NOMBRES, estadoPaso, primerPasoDe } = await import("../lib/landing/pasos.ts");
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
      const b = burbuja.getBoundingClientRect();
      const intro = e.querySelector(".lt-intro");
      const indice = [...e.querySelectorAll("[data-indice-capitulo]")];
      const actual = indice.filter((c) => c.dataset.estado === "actual").map((c) => Number(c.dataset.indiceCapitulo));
      const vistos = indice.filter((c) => c.dataset.estado === "visto").map((c) => Number(c.dataset.indiceCapitulo));
      const ind = e.querySelector(".lt-indice").getBoundingClientRect();
      const cruza = (a, c) => a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1;
      // Las burbujas a la vista (la del paso y las de antes que caben) y su escala (la del paso termina en 1).
      const vistas = [...e.querySelectorAll("[data-burbuja]")].filter((x) => Number(getComputedStyle(x).opacity) > 0.05);
      const escala = new DOMMatrix(getComputedStyle(burbuja).transform).a;
      const corazon = getComputedStyle(e.querySelector(".lt-hilo-corazon path")).fill;
      return {
        burbujasCruzan: telefono && Number(getComputedStyle(telefono).opacity) > 0.99 && vistas.some((x) => cruza(x.getBoundingClientRect(), tel)),
        escalaBurbuja: escala,
        corazon,
        indiceIzquierda: ind.right <= tel.left + 1 || Number(getComputedStyle(telefono).opacity) < 0.99,
        nitida,
        burbujaVisible: Number(getComputedStyle(burbuja).opacity) > 0.99,
        proporcion: tel.width / tel.height,
        proporcionMockup: mockup.naturalWidth / mockup.naturalHeight,
        llena: Math.abs(pagina.width - hueco.width) < 1.5 && Math.abs(pagina.height - hueco.height) < 1.5,
        telefonoVisible: Number(getComputedStyle(telefono).opacity) > 0.99,
        introVisible: Number(getComputedStyle(intro).opacity) > 0.99 && intro.querySelector("svg") !== null,
        // La burbuja no tapa la pantalla del teléfono (2 px de margen por el redondeo).
        tapaPantalla: !(b.bottom <= hueco.top + 2 || b.top >= hueco.bottom - 2 || b.right <= hueco.left + 2 || b.left >= hueco.right - 2),
        // El índice no tapa el teléfono ni lo empuja.
        indiceTapa: Number(getComputedStyle(telefono).opacity) > 0.99 && cruza(ind, tel),
        capituloActual: actual,
        capitulosVistos: vistos,
        dentro: tel.top >= 0 && tel.left >= 0 && tel.bottom <= innerHeight + 1 && tel.right <= innerWidth + 1,
        hiloVisible: e.querySelector("[data-hilo]").dataset.visible === "si",
        fondoTienda: Number(getComputedStyle(e.querySelector(".lt-fondo-tienda")).opacity),
      };
    },
    { i, paso: PASOS[i] },
  );

for (const [ancho, alto] of [
  [360, 640],
  [393, 852],
  [430, 932],
  [1440, 900],
]) {
  console.log(`\n${ancho}×${alto}`);
  const contexto = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(e.message));
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  // (el indicador de `next dev` no es de la página: fuera de las capturas)
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pagina.waitForTimeout(1200);
  ok(await pagina.locator(".lt-escenario").isVisible(), "se ve la demo por pasos");
  // Lo que se mueve dentro de los teléfonos (el reel) no arrastra la página.
  ok((await pagina.evaluate(() => scrollY)) === 0 && (await datos(pagina)).paso === PASOS[0].id, "al abrir, empieza arriba, en la bienvenida");

  // Hacia delante, paso a paso.
  for (let i = 0; i < PASOS.length; i++) {
    const paso = PASOS[i];
    const antes = await datos(pagina);
    if (i > 0) await irAlPaso(pagina, i);
    // Mientras dura el paso: ¿se ve el ♥ en algún momento?
    let vioHilo = false;
    let dosCorazones = false;
    for (const fin = Date.now() + paso.duracion + 1400; Date.now() < fin; ) {
      const v = await pagina.evaluate(() => {
        const hilo = Number(getComputedStyle(document.querySelector(".lt-hilo-dentro")).opacity) > 0.05;
        const burst = document.querySelector('iframe[data-telefono="compradora"]').contentDocument.querySelector(".burst.go");
        return { hilo: document.querySelector("[data-hilo]").dataset.visible === "si", dos: hilo && !!burst && burst.getAnimations({ subtree: true }).some((a) => a.playState === "running") };
      });
      vioHilo ||= v.hilo;
      dosCorazones ||= v.dos;
      await pagina.waitForTimeout(60);
    }
    const d = await datos(pagina);
    const esperado = estadoPaso(i);
    ok(d.paso === paso.id && Number(d.bolsa) === esperado.bolsa && Number(d.total) === esperado.total && (d.codigo === "si") === esperado.codigoVisible, `${paso.id}: bolsa ${d.bolsa}, total ${d.total}, código ${d.codigo}`);
    const m = await medir(pagina, i);
    ok(m.burbujaVisible && m.nitida && !(m.telefonoVisible && m.tapaPantalla), `${paso.id}: la burbuja está completa, sin desenfoque y sin tapar la pantalla`);
    ok(m.capituloActual.join() === String(paso.capitulo) && m.capitulosVistos.join() === Array.from({ length: paso.capitulo - 1 }, (_, k) => k + 1).join(), `${paso.id}: el índice marca «${CAPITULOS_NOMBRES[paso.capitulo - 1]}» (y los anteriores como vistos)`);
    ok(!m.indiceTapa && m.indiceIzquierda && !m.burbujasCruzan, `${paso.id}: el índice (a la izquierda) y las burbujas no se cruzan con el mockup`);
    ok(Math.abs(m.escalaBurbuja - 1) < 0.01, `${paso.id}: la burbuja del paso termina a escala 1`);
    ok(m.corazon === "rgb(255, 131, 79)", `${paso.id}: el ♥ es mandarina #ff834f (${m.corazon})`);
    if (paso.id === "intro") ok(m.introVisible && !m.telefonoVisible, "intro: el logo de Deslizapp, todavía sin teléfono");
    else ok(!m.introVisible && m.telefonoVisible && Math.abs(m.proporcion - m.proporcionMockup) < 0.01 && m.dentro && m.llena, `${paso.id}: el mockup entero, en pantalla, con la página llenando su pantalla (${m.proporcion.toFixed(3)})`);
    // El ♥ es el dedo: aparece en cada toque y en el viaje, y en los demás pasos no se ve. Al terminar el paso ya se fue.
    const toques = Number(d.toques) - Number(antes.toques);
    const viajes = Number(d.viajes) - Number(antes.viajes);
    if (paso.dedo === "no" || i === 0) ok(!vioHilo && toques === 0 && viajes === 0, `${paso.id}: sin toque ni viaje, el ♥ no se ve`);
    else if (paso.dedo === "toque") ok(vioHilo && toques > 0, `${paso.id}: el ♥ marca ${toques} toque(s)`);
    else ok(vioHilo && viajes === 1, `${paso.id}: el ♥ cruza al otro teléfono y se va`);
    ok(!m.hiloVisible, `${paso.id}: al terminar, el ♥ ya no está`);
    if (paso.id === "aaah-termo" || paso.id === "aaah-tote") {
      // El like real, como en la app (ajustes-lewis-5.md): burst, «EN TU PEDIDO», el globito de la bolsa, el mensaje de la tienda y
      // la barra «Enviar». Y nunca dos corazones a la vez (el del dedo ya se fue cuando sale el del burst).
      const slug = paso.id === "aaah-termo" ? "termo" : "tote";
      const like = await pagina.evaluate((slug) => {
        const doc = document.querySelector('iframe[data-telefono="compradora"]').contentDocument;
        const r = doc.querySelector(`#r-${slug}`);
        return {
          lleno: r.querySelector("[data-like]")?.getAttribute("aria-pressed") === "true",
          burst: !!r.querySelector(".burst.go"),
          sello: /en tu pedido/i.test(r.querySelector(".inbadge")?.textContent ?? ""),
          globito: doc.querySelector("#bagDock .cnt")?.textContent?.trim(),
          barra: !!doc.querySelector("#cartbar") && /Enviar/.test(doc.querySelector("#cartbar").textContent),
          mensaje: /buena elección|se ve precioso/i.test(doc.querySelector("#cartbar")?.textContent ?? ""),
        };
      }, slug);
      ok(like.lleno && like.burst && like.sello && like.globito === String(estadoPaso(i).bolsa) && like.barra && like.mensaje, `${paso.id}: el like real — ♥ relleno, burst, «EN TU PEDIDO», globito ${like.globito}, mensaje de la tienda y barra «Enviar»`);
      ok(!dosCorazones, `${paso.id}: no se ven dos corazones a la vez`);
    }
    if (paso.id === "pasa") {
      // El reel mide y queda como en el catálogo real; la bolsa, junto a «Compartir» (ajustes-lewis-3.md §1).
      const r = await pagina.evaluate(() => {
        const doc = document.querySelector('iframe[data-telefono="compradora"]').contentDocument;
        const caja = (el) => el.getBoundingClientRect();
        const reel = caja(doc.querySelector(".reel.on"));
        const compartir = caja([...doc.querySelectorAll(".reel.on button")].find((b) => /Compartir/.test(b.textContent)));
        const bolsa = caja(doc.querySelector("#bagDock button"));
        const ancho = doc.documentElement.clientWidth;
        return { alto: reel.height, ancho, arriba: reel.top, margen: parseFloat(doc.documentElement.style.scrollPaddingTop), hueco: bolsa.top - compartir.bottom, abajo: reel.bottom - bolsa.bottom };
      });
      ok(Math.abs(r.alto - Math.min(r.ancho * 1.25, 760)) < 1.5 && Math.abs(r.arriba - r.margen) < 1.5, `pasa: la tarjeta del reel mide como en la app (${Math.round(r.alto)} px) y queda bajo la cabecera`);
      ok(r.hueco >= 0 && r.hueco <= 24 && r.abajo >= 0 && r.abajo <= 20, `pasa: la bolsa queda junto a «Compartir» (a ${Math.round(r.hueco)} px), al pie de la tarjeta`);
    }
    ok(paso.lado === "tienda" ? m.fondoTienda > 0.95 : m.fondoTienda < 0.05, `${paso.id}: fondo de ${paso.lado === "tienda" ? "la tienda (verde)" : "la compradora (rosa)"}`);
    if (capturas && (ancho === 393 || ancho === 1440)) {
      mkdirSync("docs/capturas/landing", { recursive: true });
      await pagina.screenshot({ path: `docs/capturas/landing/${String(i + 1).padStart(2, "0")}-${paso.id}-${ancho}.png` });
    }
  }
  // El índice: tocar un capítulo lleva a su primer paso (y vuelta al primero).
  for (const c of [4, 1]) {
    await pagina.locator(`[data-indice-capitulo="${c}"]`).click();
    await pagina.waitForTimeout(1600);
    const dc = await datos(pagina);
    ok(dc.paso === PASOS[primerPasoDe(c)].id, `el índice: «${CAPITULOS_NOMBRES[c - 1]}» lleva a «${dc.paso}»`);
  }
  await irAlPaso(pagina, PASOS.length - 1);
  await pagina.waitForTimeout(1500);
  // El teléfono de la bolsa: el contador real dice 2 y la tienda registró el pedido en su panel.
  const contador = await pagina.evaluate(() => document.querySelector('iframe[data-telefono="compradora"]').contentDocument.querySelector("#bagDock .cnt")?.textContent);
  ok(contador === "2", `la bolsa real del catálogo cuenta ${contador}`);

  // Atrás un paso: vuelve al anterior y su burbuja se ve completa.
  await irAlPaso(pagina, PASOS.length - 2);
  await pagina.waitForTimeout(1600);
  const atras = await datos(pagina);
  const ma = await medir(pagina, PASOS.length - 2);
  const quitada = await pagina.evaluate((n) => { const b = document.querySelector(`[data-burbuja="${n}"]`); return b.dataset.estado === "futura" && Number(getComputedStyle(b).opacity) < 0.05; }, PASOS.length - 1);
  ok(atras.paso === PASOS[PASOS.length - 2].id && ma.burbujaVisible && quitada, `al subir, vuelve a «${atras.paso}» con su burbuja completa y la del paso de después se quita`);

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
  if (capturas && (ancho === 393 || ancho === 1440)) await pagina.screenshot({ path: `docs/capturas/landing/${String(PASOS.length + 1).padStart(2, "0")}-cierre-${ancho}.png` });
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
  // Sin ♥: llega al «aaah» del termo en su estado final, sin toques.
  for (let i = 2; i <= PASOS.findIndex((p) => p.id === "aaah-termo"); i++) {
    await irAlPaso(pagina, i);
    await pagina.waitForTimeout(500);
  }
  await pagina.waitForTimeout(1500);
  const dr = await datos(pagina);
  ok(dr.toques === "0" && dr.viajes === "0" && !(await medir(pagina, Number(dr.indice))).hiloVisible && dr.bolsa === "1", `con movimiento reducido no hay ♥ y el paso queda en su estado final (${dr.paso}, bolsa ${dr.bolsa}, toques ${dr.toques})`);
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
