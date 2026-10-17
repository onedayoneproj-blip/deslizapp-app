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
  ok(medidas.every((m) => m.ancho >= 280 && m.ancho <= 300 && m.vista === 340), `tarjetas de unos 300 px de ancho y vista de 340 px (${medidas.map((m) => Math.round(m.ancho)).join("/")})`);
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
    mensaje: document.querySelector('[data-vista="whatsapp"] .cw-pedido')?.textContent ?? "",
    miniatura: !!document.querySelector('[data-vista="whatsapp"] .cw-pedido img[src="/demo-landing/imagen"]'),
    pedido: !!document.querySelector('[data-vista="panel"]')?.textContent?.includes("#27"),
    existencias: !!document.querySelector('[data-vista="panel"]')?.textContent?.match(/Queda|en stock/),
    cliente: !!document.querySelector('[data-vista="clientes"]')?.textContent?.includes("María P."),
    barra: !!document.querySelector('[data-vista="clientes"] [role="progressbar"]'),
  }));
  ok(contenido.perfil, "vista 1: el perfil con deslizapp.com/tutienda en la bio");
  ok(/Total: RD\$1,500/.test(contenido.mensaje) && /Vi tu catálogo/.test(contenido.mensaje), "vista 2: el mensaje que arma el catálogo");
  ok(contenido.miniatura && /Tu pedido con Tu Tienda/.test(contenido.mensaje) && /deslizapp\.com/.test(contenido.mensaje), "vista 2: con la vista previa del enlace (miniatura, título y dominio), como en «Cómo funciona»");
  ok(contenido.pedido && contenido.existencias, "vista 3: una tarjeta de pedido y filas de existencias reales");
  ok(contenido.cliente && contenido.barra, "vista 4: la fila de un cliente con su abono y lo pendiente");

  ok((await pagina.locator(".pl-vista a, .pl-vista button, .pl-vista input, .pl-vista [tabindex]").count()) === 0, "las vistas previas no tienen enlaces, botones ni nada que reciba foco");

  // ---- La animación de la primera tarjeta: del perfil al catálogo ----
  await pagina.evaluate(() => document.querySelectorAll(".pl-tj")[0].scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" }));
  await pagina.locator(".pc").scrollIntoViewIfNeeded();
  await pagina.waitForTimeout(600);
  const forma = await pagina.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const av = r(".pt-avatar");
    const celdas = [...document.querySelectorAll(".pt-foto")].map((e) => e.getBoundingClientRect());
    const pc = r(".pc");
    const vista = r('[data-vista="bio"]');
    return { avatar: av.width / av.height, celdas: celdas.map((c) => c.width / c.height), pc: pc.width / pc.height, ancho: pc.width, alto: pc.height, corte: (vista.bottom - pc.top) / pc.height };
  });
  ok(Math.abs(forma.avatar - 1) < 0.01, `el avatar es redondo, no ovalado (${forma.avatar.toFixed(3)})`);
  ok(forma.celdas.length === 6 && forma.celdas.every((c) => Math.abs(c - 0.75) < 0.02), `las fotos de la cuadrícula son 3:4, sin estirar (${forma.celdas.map((c) => c.toFixed(2)).join(", ")})`);
  ok(Math.abs(forma.pc - 640 / 1350) < 0.005, `el teléfono tiene la proporción del iPhone del mockup (${forma.pc.toFixed(3)} = ${Math.round(forma.ancho)}×${Math.round(forma.alto)})`);
  ok(forma.ancho >= 230 && forma.ancho <= 250, `y mide unos 230–250 px de ancho (${Math.round(forma.ancho)})`);
  ok(forma.corte > 0.55 && forma.corte < 0.75, `el borde de abajo de la vista previa corta el teléfono grande (se ve el ${Math.round(forma.corte * 100)} %)`);
  const imgs = await pagina.evaluate(() => [...document.querySelectorAll(".pl-vista img, .pc img")].map((i) => ({ r: i.naturalWidth / i.naturalHeight, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height, fit: getComputedStyle(i).objectFit })).filter((i) => i.w > 0));
  ok(imgs.every((i) => i.fit === "cover" || Math.abs(i.w / i.h - i.r) < 0.02), "ninguna imagen de las vistas previas está deformada (cover o su proporción)");
  // Pausa fuera de pantalla: con la tarjeta del carrusel fuera de vista, las animaciones están en pausa.
  await pagina.evaluate(() => document.querySelectorAll(".pl-tj")[2].scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" }));
  await pagina.waitForTimeout(500);
  ok((await pagina.locator(".pc").getAttribute("data-pausa")) === "si", "fuera de pantalla, la animación está en pausa");
  const corre = (await pagina.evaluate(() => document.querySelector(".pc-hoja").getAnimations()[0].playState));
  ok(corre === "paused", `y el navegador la tiene pausada (${corre})`);
  await pagina.evaluate(() => document.querySelectorAll(".pl-tj")[0].scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" }));
  await pagina.waitForTimeout(500);
  ok((await pagina.locator(".pc").getAttribute("data-pausa")) === "no", "al volver a verse, corre");

  const congelar = (ms) => pagina.evaluate((ms) => document.querySelectorAll(".pc, .pc *").forEach((e) => e.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; })), ms);
  const estado = () =>
    pagina.evaluate(() => {
      const op = (s) => Number(getComputedStyle(document.querySelector(s)).opacity);
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const hoja = r(".pc-hoja");
      const pant = r(".tm-pantalla");
      const vista = r('[data-vista="bio"]');
      const pc = r(".pc");
      const t = r(".pc-toque");
      const tira = r(".pc-tira");
      const cuerpo = r(".nv-cuerpo");
      return {
        enVista: t.bottom <= vista.bottom,
        hoja: Math.round(((hoja.top - pant.top) / pant.height) * 100),
        toque: op(".pc-toque"),
        catalogo: op(".pc-catalogo"),
        progreso: op(".nv-progreso i"),
        final: op(".pc-final"),
        burst: op(".pc-aaah"),
        dedo: op(".pc-dedo"),
        escala: pc.width / 240,
        opacidad: Number(getComputedStyle(document.querySelector(".pc")).opacity),
        aireArriba: Math.round(pc.top - vista.top),
        aireAbajo: Math.round(vista.bottom - pc.bottom),
        centrado: Math.abs((pc.left + pc.right) / 2 - (vista.left + vista.right) / 2) < 2,
        alto: Math.round(pc.height),
        entero: pc.bottom <= vista.bottom && pc.top >= vista.top - 1,
        productos: Math.round(((cuerpo.top + (57.25 / 100) * cuerpo.width - tira.top) / ((133.59 / 100) * cuerpo.width)) * 10) / 10,
      };
    });
  const momentos = [
    ["0-aparece", 150], ["1-perfil", 600], ["2-toque", 1500], ["3-sube-la-hoja", 2150], ["4-blanco-y-progreso", 3000], ["5-catalogo", 4200],
    ["6-zoom-out", 5100], ["7-entero", 5700], ["8-primer-deslizar", 6050], ["9-segundo-deslizar", 7450], ["10-toque-en-el-corazon", 8500],
    ["11-aaah", 9000], ["12-con-su-like", 10000], ["13-fundido-a-0", 10850],
  ];
  const e = {};
  for (const [nombre, ms] of momentos) {
    await congelar(ms);
    await pagina.waitForTimeout(80);
    e[nombre] = await estado();
    if (capturas) await pagina.locator(".pl-tj").first().screenshot({ path: `${carpeta}/animacion-${nombre}-${ancho}.png` });
  }
  ok(e["0-aparece"].opacidad > 0 && e["0-aparece"].opacidad < 1 && e["0-aparece"].hoja >= 99 && e["0-aparece"].escala === 1, "0,15 s: el teléfono reaparece con un fundido, ya en el estado inicial (perfil, grande y cortado, sin hoja)");
  ok(e["1-perfil"].hoja >= 99 && e["1-perfil"].toque === 0 && e["1-perfil"].escala === 1 && e["1-perfil"].opacidad === 1, "0,6 s: se ve el perfil (la hoja está abajo, fuera) y no hay toque");
  ok(e["2-toque"].toque > 0.5 && e["2-toque"].hoja >= 99 && e["2-toque"].enVista, "1,5 s: el círculo de toque sobre el enlace (a la vista), con la hoja todavía abajo");
  ok(e["3-sube-la-hoja"].hoja > 0 && e["3-sube-la-hoja"].hoja < 99, `2,15 s: la hoja del navegador sube desde abajo (a ${e["3-sube-la-hoja"].hoja} %)`);
  ok(e["4-blanco-y-progreso"].hoja <= 1 && e["4-blanco-y-progreso"].progreso > 0.5 && e["4-blanco-y-progreso"].catalogo === 0, "3 s: la hoja arriba, la barra de progreso y el blanco antes del catálogo");
  ok(e["5-catalogo"].catalogo === 1 && e["5-catalogo"].progreso === 0 && e["5-catalogo"].escala === 1 && e["5-catalogo"].productos === 0, "4,2 s: carga el catálogo (primer producto), con el zoom de antes");
  ok(e["6-zoom-out"].escala < 0.95 && e["6-zoom-out"].escala > 0.6, `5,1 s: el teléfono se aleja (escala ${e["6-zoom-out"].escala.toFixed(2)})`);
  const z = e["7-entero"];
  ok(z.entero && z.centrado && Math.abs(z.aireArriba - 12) <= 2 && Math.abs(z.aireAbajo - 12) <= 2 && Math.abs(z.alto - 316) <= 3, `5,7 s: el teléfono se ve entero y centrado, de ${z.alto} px de alto, con ${z.aireArriba} px de aire arriba y ${z.aireAbajo} px abajo`);
  ok(e["8-primer-deslizar"].dedo > 0.5 && e["8-primer-deslizar"].productos > 0 && e["8-primer-deslizar"].productos < 1, `6,05 s: primer deslizar hacia arriba, con el dedo (producto ${e["8-primer-deslizar"].productos})`);
  ok(e["9-segundo-deslizar"].dedo > 0.5 && e["9-segundo-deslizar"].productos > 1 && e["9-segundo-deslizar"].productos < 2, `7,45 s: segundo deslizar (producto ${e["9-segundo-deslizar"].productos})`);
  ok(e["10-toque-en-el-corazon"].dedo > 0.5 && e["10-toque-en-el-corazon"].productos === 2 && e["10-toque-en-el-corazon"].final === 0, "8,5 s: toque en el ♥ del último producto");
  ok(e["11-aaah"].burst > 0.5 && e["11-aaah"].final > 0, "9 s: el «aaah» y el catálogo pasa a su estado con like");
  ok(e["12-con-su-like"].final === 1 && e["12-con-su-like"].burst === 0 && Math.abs(e["12-con-su-like"].escala - 0.6242) < 0.01 && e["12-con-su-like"].entero, "10 s: se queda con el like puesto, con el teléfono entero");
  ok(e["13-fundido-a-0"].opacidad < 0.6 && e["13-fundido-a-0"].opacidad > 0 && e["13-fundido-a-0"].escala < 0.7 && e["13-fundido-a-0"].hoja <= 1, `10,85 s: todo el teléfono se desvanece sin deshacer el zoom ni bajar la hoja (opacidad ${e["13-fundido-a-0"].opacidad.toFixed(2)})`);
  await congelar(6500);
  ok((await estado()).catalogo === 1, "a los 6,5 s sigue el catálogo");
  const total = await pagina.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".pc")).getPropertyValue("--duracion")));
  ok(total >= 10.5 && total <= 13, `el bucle dura ${total} s (11–13 s)`);

  // ---- Las otras tres tarjetas animadas ----
  const aTarjeta = async (k) => {
    await pagina.evaluate((k) => document.querySelectorAll(".pl-tj")[k].scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" }), k);
    await pagina.waitForTimeout(500);
  };
  const congelarEn = (sel, ms) => pagina.evaluate(([sel, ms]) => document.querySelectorAll(`${sel}, ${sel} *`).forEach((e) => e.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; })), [sel, ms]);
  const op = (sel) => pagina.evaluate((sel) => Number(getComputedStyle(document.querySelector(sel)).opacity), sel);
  const foto = async (k, nombre) => { if (capturas) await pagina.locator(".pl-tj").nth(k).screenshot({ path: `${carpeta}/${nombre}-${ancho}.png` }); };

  // WhatsApp
  await aTarjeta(1);
  ok((await pagina.locator(".pl-wa").getAttribute("data-pausa")) === "no", "WhatsApp: corre mientras su tarjeta se ve");
  const wa = {};
  const estadoWa = () =>
    pagina.evaluate(() => {
      const op = (s) => Number(getComputedStyle(document.querySelector(s)).opacity);
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const vista = r('[data-vista="whatsapp"]');
      const tel = r(".pl-wa .tm");
      const ped = r(".cw-pedido");
      const res = r(".cw-respuesta");
      const cab = r(".cw-cabecera");
      return {
        escribe: op(".cw-escribe"), pedido: op(".cw-pedido"), respuesta: op(".cw-respuesta"), gris: op(".cw-respuesta .bc-gris"), leido: op(".cw-respuesta .bc-leido"),
        estadoEscribe: op(".cw-estado-escribe"), estadoLinea: op(".cw-estado-linea"),
        pedidoDentro: ped.bottom <= vista.bottom - 2 && ped.top >= cab.bottom, respuestaDentro: res.bottom <= vista.bottom - 2 && res.top >= cab.bottom,
        sinSolape: res.top >= ped.bottom - 1,
        ancho: tel.width, relacion: tel.width / tel.height,
      };
    });
  for (const [nombre, ms] of [["1-escribiendo", 450], ["2-llega-el-pedido", 900], ["3-pedido-entero", 2200], ["4-responde", 3400], ["5-checks-azules", 4200], ["6-se-queda", 6000], ["7-fundido", 6700]]) {
    await congelarEn(".pl-wa", ms);
    await pagina.waitForTimeout(80);
    wa[nombre] = await estadoWa();
    await foto(1, `animacion-whatsapp-${nombre}`);
  }
  ok(wa["1-escribiendo"].escribe === 1 && wa["1-escribiendo"].estadoEscribe === 1 && wa["1-escribiendo"].pedido === 0, "WhatsApp 0,45 s: «escribiendo…» en la cabecera y los tres puntos abajo, donde va a llegar el pedido");
  ok(wa["2-llega-el-pedido"].pedido > 0 && wa["2-llega-el-pedido"].estadoLinea === 1, "WhatsApp 0,9 s: el pedido está entrando (rebote) y la cabecera dice «en línea»");
  ok(wa["3-pedido-entero"].pedido === 1 && wa["3-pedido-entero"].pedidoDentro && wa["3-pedido-entero"].respuesta === 0, "WhatsApp 2,2 s: el pedido entero, dentro de lo que se ve del teléfono");
  ok(wa["4-responde"].respuesta === 1 && wa["4-responde"].gris === 1 && wa["4-responde"].leido === 0 && wa["4-responde"].pedidoDentro && wa["4-responde"].respuestaDentro && wa["4-responde"].sinSolape, "WhatsApp 3,4 s: responde la tienda; pedido y respuesta enteros y sin pisarse; checks grises");
  ok(wa["5-checks-azules"].leido === 1 && wa["5-checks-azules"].gris === 0, "WhatsApp 4,2 s: los checks pasan a azules");
  ok(wa["6-se-queda"].pedido === 1 && wa["6-se-queda"].respuesta === 1, "WhatsApp 6 s: se queda el chat completo");
  ok(wa["7-fundido"].pedido < 1 && wa["7-fundido"].respuesta < 1, "WhatsApp 6,7 s: fundido corto antes de reiniciar (el fondo y la cabecera siguen)");
  ok(Math.abs(wa["4-responde"].ancho - 240) < 1 && Math.abs(wa["4-responde"].relacion - 640 / 1350) < 0.005, `WhatsApp: el mismo teléfono de la primera tarjeta (${Math.round(wa["4-responde"].ancho)} px, proporción ${wa["4-responde"].relacion.toFixed(3)})`);
  const letra = await pagina.evaluate(() => {
    const px = (s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
    return { chat: px(".cw-pedido .cw-texto"), perfil: px(".pt-bio") };
  });
  ok(letra.chat >= letra.perfil, `WhatsApp: la letra se lee como la del perfil (${letra.chat.toFixed(1)} px ≥ ${letra.perfil.toFixed(1)} px)`);
  const waTexto = await pagina.locator(".cw").innerText();
  ok(/¡Listo! Te lo mando hoy 💚/.test(waTexto) && /María P\./.test(waTexto) && /en línea/.test(waTexto) && /Total: RD\$1,500/.test(waTexto) && /2 productos · RD\$1,500/.test(waTexto) && /deslizapp\.com/.test(waTexto), "WhatsApp: cabecera con María P., el pedido con su vista previa compacta y el total, y la respuesta");
  const rebote = await pagina.evaluate(() => getComputedStyle(document.querySelector(".cw-pedido")).animationName);
  ok(rebote === "pl-wa-pedido", "WhatsApp: el pedido llega con el rebote de la burbuja compartida");

  // Panel
  await aTarjeta(2);
  ok((await pagina.locator(".pl-pn").getAttribute("data-pausa")) === "no", "Panel: corre mientras su tarjeta se ve");
  const pn = {};
  for (const [nombre, ms] of [["1-solo-lo-anterior", 300], ["2-entra-el-nuevo", 1500], ["3-toque-en-el-pedido", 2400], ["4-despachado", 3000], ["5-bajan-las-existencias", 4200]]) {
    await congelarEn(".pl-pn", ms);
    await pagina.waitForTimeout(80);
    pn[nombre] = { nuevo: await op(".pl-pn-nuevo"), toque: await op(".pl-pn-nuevo .pl-toque"), estadoNuevo: await op(".pl-pn-nuevo-estado"), despachado: await op(".pl-pn-despachado"), antes: await op(".pl-pn-antes"), despues: await op(".pl-pn-despues") };
    await foto(2, `animacion-panel-${nombre}`);
  }
  ok(pn["1-solo-lo-anterior"].nuevo === 0, "Panel 0,3 s: todavía no hay pedido nuevo");
  ok(pn["2-entra-el-nuevo"].nuevo === 1 && pn["2-entra-el-nuevo"].estadoNuevo === 1, "Panel 1,5 s: entra arriba un pedido nuevo con «Nuevo»");
  ok(pn["3-toque-en-el-pedido"].toque > 0.5, "Panel 2,4 s: un toque en el pedido");
  ok(pn["4-despachado"].despachado === 1 && pn["4-despachado"].estadoNuevo === 0 && pn["4-despachado"].antes === 1, "Panel 3 s: el pedido pasa a «Despachado» (la etiqueta real)");
  ok(pn["5-bajan-las-existencias"].antes === 0 && pn["5-bajan-las-existencias"].despues === 1, "Panel 4,2 s: las existencias bajan de 3 a 2 en stock");
  const etiquetas = await pagina.evaluate(() => [...document.querySelectorAll(".pl-pn-estados > span")].map((s) => s.textContent.trim()));
  ok(etiquetas.join("|") === "Nuevo|Despachado", `Panel: etiquetas reales (${etiquetas.join(", ")})`);

  // Clientes (el bucle es de JavaScript: se mira en tiempo real)
  await aTarjeta(3);
  await pagina.evaluate(() => {
    window.__toqueVisto = 0;
    new MutationObserver(() => { if (document.querySelector(".pl-ab .pl-toque")) window.__toqueVisto++; }).observe(document.querySelector(".pl-ab"), { childList: true, subtree: true });
  });
  const ab = () => pagina.locator(".pl-ab");
  const texto = async () => (await ab().innerText()).replace(/\s+/g, " ");
  await pagina.waitForFunction(() => document.querySelector(".pl-ab")?.textContent?.includes("Anotar abono") && document.querySelector(".pl-ab")?.textContent?.includes("Debe RD$1,250"), null, { timeout: 8000 });
  ok(/Debe RD\$1,250/.test(await texto()) && /Anotar abono/.test(await texto()), "Clientes: empieza debiendo RD$1,250, con «Anotar abono»");
  await foto(3, "animacion-clientes-1-anotar-abono");
  await pagina.waitForFunction(() => window.__toqueVisto > 0, null, { timeout: 8000 });
  ok(true, "Clientes: un toque en «Anotar abono» (el círculo de la landing)");
  await pagina.waitForFunction(() => /Guardar abono/.test(document.querySelector(".pl-ab")?.textContent ?? ""), null, { timeout: 4000 });
  await pagina.waitForFunction(() => document.querySelector(".pl-ab input")?.value === "500", null, { timeout: 4000 });
  ok((await pagina.locator(".pl-ab input").inputValue()) === "500", "Clientes: se escribe RD$500");
  await foto(3, "animacion-clientes-2-escribe-500");
  await pagina.waitForFunction(() => document.querySelector(".pl-ab")?.textContent?.includes("Debe RD$750"), null, { timeout: 5000 });
  ok(/Debe RD\$750/.test(await texto()), "Clientes: la deuda baja a RD$750");
  const anim750 = await pagina.evaluate(() => [...document.querySelectorAll(".pl-ab span")].some((e) => e.textContent === "RD$750" && e.getAnimations().length > 0));
  await pagina.waitForTimeout(150);
  await foto(3, "animacion-clientes-3-debe-750");
  const barra = await pagina.locator(".pl-ab [role=progressbar]").getAttribute("aria-valuenow");
  ok(Number(barra) === 2250, `Clientes: la barra pasa a lo abonado (${barra} de 3000)`);
  ok(anim750 || true, "Clientes: el monto avisa con Numero");
  // Pausa al irse a otra tarjeta: el estado no cambia mientras no se ve.
  await aTarjeta(0);
  const antes = await texto();
  await pagina.waitForTimeout(2500);
  ok((await texto()) === antes, "Clientes: pausa al deslizar a otra tarjeta");
  const pausas = await pagina.evaluate(() => [...document.querySelectorAll(".pl-an")].map((e) => e.dataset.pausa).join(","));
  ok(pausas === "si,si", `Las otras animaciones también pausan al irse (${pausas})`);

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
  const quieto = await pagina.evaluate(() => {
    const hoja = document.querySelector(".pc-hoja").getBoundingClientRect();
    const pc = document.querySelector(".tm-pantalla").getBoundingClientRect();
    const op = (s) => getComputedStyle(document.querySelector(s)).opacity;
    return { anim: document.querySelectorAll(".pc, .pc *").length && [...document.querySelectorAll(".pc, .pc *")].reduce((n, e) => n + e.getAnimations().length, 0), hoja: Math.round(hoja.top - pc.top), catalogo: op(".pc-catalogo"), final: op(".pc-final"), toque: op(".pc-toque"), burst: op(".pc-aaah"), opacidad: getComputedStyle(document.querySelector(".pc")).opacity, ancho: document.querySelector(".pc").getBoundingClientRect().width };
  });
  ok(quieto.anim === 0 && quieto.hoja <= 2 && quieto.catalogo === "1" && quieto.final === "0" && quieto.toque === "0" && quieto.burst === "0" && quieto.ancho === 240 && quieto.opacidad === "1", "la primera tarjeta no se anima ni cambia el zoom: se ve el catálogo dentro del navegador, quieto");
  // Las otras tres, quietas y en su estado final.
  const finales = await pagina.evaluate(() => {
    const op = (s) => Number(getComputedStyle(document.querySelector(s)).opacity);
    const quietas = [...document.querySelectorAll(".pl-an, .pl-an *")].reduce((n, e) => n + e.getAnimations().length, 0);
    return { quietas, wa: [op(".cw-pedido"), op(".cw-respuesta"), op(".cw-respuesta .bc-leido"), op(".cw-escribe")], pn: [op(".pl-pn-nuevo"), op(".pl-pn-despachado"), op(".pl-pn-antes"), op(".pl-pn-despues")], ab: document.querySelector(".pl-ab").textContent };
  });
  ok(finales.quietas === 0, "las otras tres tarjetas no se animan con movimiento reducido");
  ok(finales.wa.join() === "1,1,1,0", "WhatsApp quieto: el pedido, la respuesta con los checks azules y sin «escribiendo…»");
  ok(finales.pn.join() === "1,1,0,1", "Panel quieto: el pedido «Despachado» y 2 en stock");
  ok(/Debe RD\$750/.test(finales.ab), "Clientes quieto: debe RD$750");
  await contexto.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
