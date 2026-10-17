// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-planes-incluye-y-preguntas.mjs [url]`.
// «Todos los planes traen» (el carrusel con vista previa) y «Pregúntanos» (las preguntas frecuentes en chat) de /planes
// (docs/prompts/planes-incluye-y-preguntas.md) a 393×852 y 360×740: las cuatro tarjetas con su vista previa, los puntos, el chat que
// empieza con el saludo, tocar una pregunta la envía y llega la respuesta (con «escribiendo…»), esa pregunta sale de las rápidas, al
// final queda solo el aviso de Instagram, movimiento reducido (sin «escribiendo…»), el FAQPage con las mismas preguntas que el chat,
// la lista oculta, sin desbordar la pantalla. Con CAPTURAS=1 guarda las capturas en docs/capturas/planes-incluye-y-preguntas/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { PREGUNTAS_PLANES } = await import("../lib/planes/preguntas.ts");
const { INCLUYE } = await import("../lib/planes/incluye.ts");
const { ENLACE_QUIERO_VENDER } = await import("../lib/landing/enlaces.ts");

const base = process.argv[2] ?? "http://localhost:3000";
const capturas = process.env.CAPTURAS === "1";
const carpeta = "docs/capturas/planes-incluye-y-preguntas";
if (capturas) mkdirSync(carpeta, { recursive: true });
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
let fallos = 0;
const ok = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    fallos++;
    console.log("  ✗", msg);
  }
};

const PANTALLAS = [
  { ancho: 393, alto: 852 },
  { ancho: 360, alto: 740 },
];

async function abrir(contexto) {
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/planes", { waitUntil: "networkidle" });
  return pagina;
}

for (const { ancho, alto } of PANTALLAS) {
  console.log(`\n/planes a ${ancho}×${alto}`);
  const contexto = await nav.newContext({ viewport: { width: ancho, height: alto }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pagina = await abrir(contexto);

  // ---- «Todos los planes traen» ----
  const tarjetas = pagina.locator(".pl-tj");
  ok((await tarjetas.count()) === INCLUYE.length, `el carrusel tiene ${INCLUYE.length} tarjetas`);
  for (const [k, t] of INCLUYE.entries()) {
    const tj = tarjetas.nth(k);
    ok((await tj.locator("h3").innerText()) === t.titulo && (await tj.locator(".pl-tj-pie p").innerText()) === t.linea, `tarjeta ${k + 1}: «${t.titulo}» con su línea`);
    ok((await tj.locator(".pl-vista").getAttribute("aria-hidden")) === "true", `tarjeta ${k + 1}: la vista previa es decorativa (aria-hidden)`);
  }
  ok((await pagina.locator(".pl-incluye iframe, .pl-incluye video").count()) === 0, "sin iframes ni video en el carrusel");
  const snap = await pagina.locator(".pl-carril").evaluate((e) => getComputedStyle(e).scrollSnapType);
  ok(/x/.test(snap) && /mandatory/.test(snap), `scroll-snap horizontal (${snap})`);
  const medidas = await pagina.evaluate(() => [...document.querySelectorAll(".pl-tj")].map((e) => ({ ancho: e.getBoundingClientRect().width, vista: e.querySelector(".pl-vista").getBoundingClientRect().height })));
  ok(medidas.every((m) => m.ancho >= 280 && m.ancho <= 300 && m.vista === 250), `tarjetas de unos 300 px de ancho y vista de 250 px (${medidas.map((m) => Math.round(m.ancho)).join("/")})`);
  // La siguiente asoma: la segunda tarjeta empieza antes del borde de la pantalla.
  const asoma = await pagina.evaluate(() => document.querySelectorAll(".pl-tj")[1].getBoundingClientRect().left < window.innerWidth - 8);
  ok(asoma, "la tarjeta siguiente asoma por el borde");
  await pagina.locator(".pl-incluye").scrollIntoViewIfNeeded();

  for (const [k, t] of INCLUYE.entries()) {
    await pagina.evaluate((k) => document.querySelectorAll(".pl-tj")[k].scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" }), k);
    await pagina.waitForTimeout(450);
    const punto = await pagina.evaluate(() => [...document.querySelectorAll(".pl-puntos span")].findIndex((s) => s.dataset.on === "si"));
    ok(punto === k, `tarjeta ${k + 1}: el punto activo es el ${k + 1}`);
    if (capturas) await pagina.locator(".pl-incluye").screenshot({ path: `${carpeta}/incluye-${k + 1}-${t.id}-${ancho}.png` });
  }
  const contenido = await pagina.evaluate(() => ({
    perfil: !!document.querySelector('[data-vista="bio"] .pt-enlace')?.textContent?.includes("deslizapp.com/tutienda"),
    mensaje: document.querySelector('[data-vista="whatsapp"] .bc[data-bc="enviado"]')?.textContent ?? "",
    pedido: !!document.querySelector('[data-vista="panel"]')?.textContent?.includes("#27"),
    existencias: !!document.querySelector('[data-vista="panel"]')?.textContent?.match(/Queda|en stock/),
    cliente: !!document.querySelector('[data-vista="clientes"]')?.textContent?.includes("María P."),
    barra: !!document.querySelector('[data-vista="clientes"] [role="progressbar"]'),
  }));
  ok(contenido.perfil, "vista 1: el perfil con deslizapp.com/tutienda en la bio");
  ok(/Total: RD\$1,500/.test(contenido.mensaje) && /Vi tu catálogo/.test(contenido.mensaje), "vista 2: el mensaje que arma el catálogo, en una burbuja enviada");
  ok(contenido.pedido && contenido.existencias, "vista 3: una tarjeta de pedido y filas de existencias reales");
  ok(contenido.cliente && contenido.barra, "vista 4: la fila de un cliente con su abono y lo pendiente");

  ok((await pagina.locator(".pl-vista a, .pl-vista button, .pl-vista input, .pl-vista [tabindex]").count()) === 0, "las vistas previas no tienen enlaces, botones ni nada que reciba foco");

  // ---- «Pregúntanos» ----
  const chat = pagina.locator(".pl-chat");
  await chat.scrollIntoViewIfNeeded();
  const saludo = await chat.locator(".pl-chat-fila").first().innerText();
  ok(/¡Hola! 👋 ¿Qué quieres saber\? Toca una pregunta\./.test(saludo), "el chat empieza con el saludo recibido");
  ok((await chat.locator(".pl-chat-barra").innerText()).replace(/\s+/g, " ").includes("Deslizapp Preguntas frecuentes"), "la barra: Deslizapp · Preguntas frecuentes");
  ok((await chat.locator(".pl-chat-rapida").count()) === PREGUNTAS_PLANES.length, `${PREGUNTAS_PLANES.length} preguntas como respuestas rápidas`);
  const bajos = await chat.locator(".pl-chat-rapida").evaluateAll((bs) => bs.filter((b) => b.getBoundingClientRect().height < 44).length);
  ok(bajos === 0, "todas las rápidas miden al menos 44 px de alto");
  ok((await chat.locator(".pl-chat-cuerpo").getAttribute("aria-live")) === "polite", 'las respuestas se anuncian (aria-live="polite")');
  const sinDesborde = await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(sinDesborde, "la página no se desborda a lo ancho");
  if (capturas) await chat.screenshot({ path: `${carpeta}/chat-empieza-${ancho}.png` });

  // Tocar una pregunta la envía; «escribiendo…»; llega la respuesta; sale de las rápidas.
  const [p1, p2] = [PREGUNTAS_PLANES[1], PREGUNTAS_PLANES[4]];
  await chat.locator(".pl-chat-rapida", { hasText: p1.pregunta }).click();
  ok(await chat.locator('.bc[data-bc="enviado"]', { hasText: p1.pregunta }).isVisible(), "al tocarla, la pregunta sale como mensaje enviado (verde)");
  ok(await chat.locator(".pl-chat-escribe").isVisible(), "aparece «escribiendo…»");
  ok((await chat.locator(".pl-chat-rapida", { hasText: p1.pregunta }).count()) === 0, "esa pregunta ya no está en las rápidas");
  await chat.locator('.bc[data-bc="recibido"]', { hasText: p1.respuesta.slice(0, 30) }).waitFor({ timeout: 3000 });
  ok((await chat.locator(".pl-chat-escribe").count()) === 0, "llega la respuesta y el «escribiendo…» se va");
  const colores = await chat.evaluate((c) => {
    const e = c.querySelector('.bc[data-bc="enviado"]');
    const r = [...c.querySelectorAll('.bc[data-bc="recibido"]')].at(-1);
    return { enviado: getComputedStyle(e).backgroundColor, recibido: getComputedStyle(r).backgroundColor, fuente: getComputedStyle(e).fontFamily, colaE: !!e.querySelector(".bc-cola"), colaR: getComputedStyle(r.querySelector(".bc-cola")).left };
  });
  ok(colores.enviado === "rgb(217, 253, 211)" && colores.recibido === "rgb(255, 255, 255)", `enviadas verdes (#D9FDD3) y recibidas blancas (${colores.enviado} / ${colores.recibido})`);
  ok(/Fredoka/i.test(colores.fuente), "los enviados van en Fredoka");
  ok(colores.colaE && colores.colaR !== "auto", "enviada con la cola a la derecha; recibida con la cola a la izquierda");
  await chat.locator(".pl-chat-rapida", { hasText: p2.pregunta }).click();
  await chat.locator('.bc[data-bc="recibido"]', { hasText: p2.respuesta.slice(0, 20) }).waitFor({ timeout: 3000 });
  await pagina.waitForTimeout(500);
  ok((await chat.locator(".pl-chat-rapida").count()) === PREGUNTAS_PLANES.length - 2, "con dos hechas quedan las demás");
  if (capturas) await chat.screenshot({ path: `${carpeta}/chat-dos-hechas-${ancho}.png` });
  // Solo el último mensaje de cada grupo lleva cola (aquí cada grupo es un mensaje, así que todos); y el foco no se pierde.
  const foco = await pagina.evaluate(() => document.activeElement?.className ?? "");
  ok(/pl-chat-rapida/.test(foco), "el foco pasa a la siguiente pregunta");

  // Todas.
  while ((await chat.locator(".pl-chat-rapida").count()) > 0) await chat.locator(".pl-chat-rapida").first().click();
  await pagina.waitForTimeout(MS_FINAL());
  ok((await chat.locator(".pl-chat-rapidas").count()) === 0, "con todas hechas no quedan rápidas");
  ok(await chat.locator(".pl-chat-fin").isVisible(), "se ve el aviso del final");
  ok((await chat.locator(".pl-chat-fin").innerText()).includes("¿Otra pregunta? Escríbenos por Instagram."), "«¿Otra pregunta? Escríbenos por Instagram.»");
  ok((await chat.locator(".pl-chat-fin a").getAttribute("href")) === ENLACE_QUIERO_VENDER, "el botón lleva al Instagram de Lewis (ENLACE_QUIERO_VENDER)");
  ok((await chat.locator('.bc[data-bc="recibido"]').count()) === PREGUNTAS_PLANES.length + 1, "todas las respuestas (y el saludo) están en el chat");
  const cuerpo = await chat.locator(".pl-chat-cuerpo").evaluate((e) => ({ alto: e.getBoundingClientRect().height, abajo: e.scrollHeight - e.scrollTop - e.clientHeight }));
  ok(cuerpo.alto <= alto * 0.55 && cuerpo.abajo < 4, `el cuadro del chat no crece sin fin (${Math.round(cuerpo.alto)} px) y queda en lo último`);
  if (capturas) await chat.screenshot({ path: `${carpeta}/chat-todas-${ancho}.png` });

  // ---- FAQPage y lista oculta ----
  const ld = await pagina.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)));
  const faq = ld.find((x) => x["@type"] === "FAQPage");
  ok(!!faq, "hay datos estructurados FAQPage");
  ok(JSON.stringify(faq?.mainEntity?.map((q) => [q.name, q.acceptedAnswer.text])) === JSON.stringify(PREGUNTAS_PLANES.map((p) => [p.pregunta, p.respuesta])), "el FAQPage tiene las mismas preguntas y respuestas que el chat");
  const lista = await pagina.evaluate(() => [...document.querySelectorAll(".pl-dudas dl.sr-only > div")].map((d) => [d.querySelector("dt").textContent, d.querySelector("dd").textContent]));
  ok(JSON.stringify(lista) === JSON.stringify(PREGUNTAS_PLANES.map((p) => [p.pregunta, p.respuesta])), "la lista oculta a la vista trae todas, en el HTML");
  const oculta = await pagina.evaluate(() => { const r = document.querySelector(".pl-dudas dl.sr-only").getBoundingClientRect(); return r.width <= 1 && r.height <= 1; });
  ok(oculta, "la lista no se ve (solo para lectores de pantalla)");
  await contexto.close();
}

function MS_FINAL() {
  return 1600;
}

// ---- Movimiento reducido ----
console.log("\nMovimiento reducido");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: "reduce", hasTouch: true, isMobile: true });
  const pagina = await abrir(contexto);
  const chat = pagina.locator(".pl-chat");
  await chat.scrollIntoViewIfNeeded();
  const p = PREGUNTAS_PLANES[0];
  let vistoEscribiendo = false;
  await pagina.exposeFunction("avisoEscribiendo", () => { vistoEscribiendo = true; });
  await pagina.evaluate(() => {
    new MutationObserver(() => { if (document.querySelector(".pl-chat-escribe")) window.avisoEscribiendo(); }).observe(document.querySelector(".pl-chat"), { childList: true, subtree: true });
  });
  await chat.locator(".pl-chat-rapida", { hasText: p.pregunta }).click();
  ok(await chat.locator('.bc[data-bc="recibido"]', { hasText: p.respuesta.slice(0, 25) }).isVisible(), "la respuesta aparece directamente");
  await pagina.waitForTimeout(900);
  ok(!vistoEscribiendo && (await chat.locator(".pl-chat-escribe").count()) === 0, "sin «escribiendo…»");
  const anim = await chat.evaluate((c) => getComputedStyle(c.querySelector(".pl-chat-fila .bc")).animationName);
  ok(anim === "none", `sin rebote al llegar (animación: ${anim})`);
  const pulso = await pagina.evaluate(() => getComputedStyle(document.querySelector(".pt-enlace")).animationName);
  ok(pulso === "none", "ni el pulso del enlace en la vista previa del perfil");
  await contexto.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
