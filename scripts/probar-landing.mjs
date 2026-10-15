// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-landing.mjs [url]`.
// La landing de deslizapp.com por pasos (referencias/landing/ajustes-lewis-2.md y -3.md) a 360×640, 393×852, 430×932 y 1440×900:
// avanzar paso a paso (la bienvenida con el logo antes del teléfono; burbuja completa y sin desenfoque, que no tapa la pantalla;
// estado del teléfono: bolsa, total y código; el mockup entero y la página llenando su pantalla; el reel y la bolsa como en la app;
// el ♥ como dedo: en cada toque y en el viaje, oculto en los demás; el índice; el fondo de cada persona), el índice lleva a cada
// capítulo, retroceder un paso, un deslizamiento fuerte no se salta pasos, «Saltar», los CTA y «Entrar»,
// movimiento reducido, sin JavaScript y que el modo demo sigue abriendo el panel. Con CAPTURAS=1 guarda una captura por paso
// (393×852 y 1440×900) en docs/capturas/landing/.
import { createRequire } from "node:module";
import { mkdirSync, statSync } from "node:fs";
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

/** Qué se ve de la portada de /conoce (el icono, el lema, el teléfono bloqueado y «Desliza y mira»). */
const portadaVisible = (pagina) =>
  pagina.evaluate(() => {
    const op = (sel) => Number(getComputedStyle(document.querySelector(sel)).opacity);
    const v = document.querySelector("[data-portada]");
    return {
      entrada: document.querySelector(".lt-escenario").dataset.entrada,
      icono: op(".lt-icono") > 0.99,
      lema: op(".lt-portada-texto") > 0.99,
      telefono: op(".lt-tel-compradora") > 0.99,
      desliza: op(".lt-desliza") > 0.99,
      saltar: op("[data-saltar]") > 0.99,
      loop: v.loop,
      corre: !v.paused,
    };
  });

/** Si la página de un teléfono llena la pantalla del mockup: los píxeles de arriba (junto a la isla y en las esquinas) no son del
 *  color de fondo de la landing. */
const sharp = require("sharp");
const hex = (c) => (c.startsWith("#") ? [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) : c.match(/\d+/g).slice(0, 3).map(Number));
async function cubrePantalla(pagina, telefono, fondo) {
  const r = await pagina.evaluate((t) => { const h = document.querySelector(`.lt-tel-${t} .lt-hueco`).getBoundingClientRect(); return { x: h.left, y: h.top, w: h.width, h: h.height }; }, telefono);
  const puntos = [[0.22, 8], [0.78, 8], [0.14, r.h * 0.035], [0.86, r.h * 0.035]].map(([fx, dy]) => [Math.round(r.x + fx * r.w), Math.round(r.y + dy)]);
  const png = await pagina.screenshot();
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const ref = hex(fondo);
  const malos = puntos.filter(([x, y]) => {
    const k = (y * info.width + x) * info.channels;
    return Math.hypot(data[k] - ref[0], data[k + 1] - ref[1], data[k + 2] - ref[2]) < 40;
  });
  return { ok: malos.length === 0, detalle: malos.map((p) => p.join(",")).join(" ") };
}

/**
 * El contraste del texto de la portada sobre el video, fotograma a fotograma (ajustes-lewis-10.md): con el video parado en cada
 * momento y las letras transparentes (el degradado sigue), el 95 % más oscuro del fondo de cada línea frente a su color. Devuelve el
 * peor caso de cada color.
 */
const luminancia = (r, g, b) => [r, g, b].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((a, c, k) => a + c * [0.2126, 0.7152, 0.0722][k], 0);
async function contrastePortada(pagina) {
  const cajas = await pagina.evaluate(() => {
    const out = [];
    const rango = document.createRange();
    const texto = document.querySelector(".lt-portada-texto");
    const nodos = [];
    const tw = document.createTreeWalker(texto, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) nodos.push(tw.currentNode);
    for (const n of nodos) {
      if (!n.textContent.trim()) continue;
      rango.selectNodeContents(n);
      const color = n.parentElement.closest(".lt-lema-vuelta") ? "mandarina" : n.parentElement.closest(".lt-lema-orden") ? "rosa" : "crema";
      for (const c of rango.getClientRects()) out.push({ color, x: c.left, y: c.top, w: c.width, h: c.height });
    }
    const st = document.createElement("style");
    st.id = "sin-letras";
    st.textContent = ".lt-portada-texto, .lt-portada-texto * { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important } .lt-destello { visibility: hidden }";
    document.head.appendChild(st);
    return out;
  });
  const color = { crema: luminancia(255, 249, 238), rosa: luminancia(245, 201, 214), mandarina: luminancia(255, 131, 79) };
  const peor = { crema: 99, rosa: 99, mandarina: 99 };
  const duracion = await pagina.evaluate(() => document.querySelector("[data-portada]").duration);
  for (let t = 0; t < duracion; t += 1) {
    await pagina.evaluate((t) => new Promise((ok) => { const v = document.querySelector("[data-portada]"); v.pause(); v.onseeked = () => ok(); v.currentTime = t; }), t);
    await pagina.waitForTimeout(60);
    const { data, info } = await sharp(await pagina.screenshot()).raw().toBuffer({ resolveWithObject: true });
    for (const c of cajas) {
      const ls = [];
      for (let y = Math.max(0, Math.floor(c.y)); y < Math.min(info.height, c.y + c.h); y += 2)
        for (let x = Math.max(0, Math.floor(c.x)); x < Math.min(info.width, c.x + c.w); x += 2) {
          const k = (y * info.width + x) * info.channels;
          ls.push(luminancia(data[k], data[k + 1], data[k + 2]));
        }
      ls.sort((a, b) => a - b);
      const fondo = ls[Math.floor(ls.length * 0.95)] ?? 0;
      peor[c.color] = Math.min(peor[c.color], (color[c.color] + 0.05) / (fondo + 0.05));
    }
  }
  await pagina.evaluate(() => { document.getElementById("sin-letras")?.remove(); void document.querySelector("[data-portada]").play().catch(() => {}); });
  return peor;
}

const irAlPaso = (pagina, i) => pagina.evaluate((i) => document.querySelector(`[data-paso-seccion="${i}"]`).scrollIntoView({ behavior: "instant" }), i);
const datos = (pagina) => pagina.evaluate(() => ({ ...document.querySelector(".lt-escenario").dataset }));

/** Todo lo que se comprueba de un paso, medido en la página. */
const medir = (pagina, i) =>
  pagina.evaluate(
    ({ i, paso }) => {
      const e = document.querySelector(".lt-escenario");
      // (la portada no tiene burbuja: invita a deslizar su pantalla de bloqueo)
      const burbuja = e.querySelector(`[data-burbuja="${i}"]`);
      const nitida = !burbuja || (getComputedStyle(burbuja).filter === "none" && [...burbuja.querySelectorAll("*")].every((x) => getComputedStyle(x).filter === "none"));
      const telefono = e.querySelector(`.lt-tel-${paso.telefono}`);
      const tel = telefono.getBoundingClientRect();
      const mockup = telefono.querySelector(".lt-mockup");
      const hueco = telefono.querySelector(".lt-hueco").getBoundingClientRect();
      const pagina = telefono.querySelector("iframe").getBoundingClientRect();
      const b = burbuja?.getBoundingClientRect() ?? new DOMRect();
      const intro = e.querySelector(".lt-intro");
      const gruesas = [...e.querySelectorAll("[data-raya-paso]")];
      const finas = [...e.querySelectorAll("[data-raya-fina]")];
      const ind = e.querySelector(".lt-indice").getBoundingClientRect();
      // El área de toque de cada gruesa a la vista: unos 20 px de alto (8 px arriba y abajo de su centro siguen siendo ella), sin
      // pisar la vecina. (Las que la regla deja fuera de su ventana no se tocan.)
      const toca = (g) => {
        const r = g.getBoundingClientRect();
        const x = r.left + 4;
        const y = r.top + r.height / 2;
        return [y - 8, y, y + 8].every((yy) => document.elementFromPoint(x, yy)?.closest("[data-raya-paso]") === g);
      };
      const enVentana = (g) => { const r = g.getBoundingClientRect(); return r.top > ind.top + ind.height * 0.25 && r.bottom < ind.bottom - ind.height * 0.25; };
      const actualRaya = gruesas.find((g) => g.dataset.estado === "actual")?.getBoundingClientRect();
      const cruza = (a, c) => a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1;
      // Las burbujas a la vista (la del paso y las de antes que caben) y su escala (la del paso termina en 1).
      const vistas = [...e.querySelectorAll("[data-burbuja]")].filter((x) => Number(getComputedStyle(x).opacity) > 0.05);
      const escala = burbuja ? new DOMMatrix(getComputedStyle(burbuja).transform).a : 1;
      const corazon = getComputedStyle(e.querySelector(".lt-hilo-corazon path")).fill;
      return {
        burbujasCruzan: telefono && Number(getComputedStyle(telefono).opacity) > 0.99 && vistas.some((x) => cruza(x.getBoundingClientRect(), tel)),
        escalaBurbuja: escala,
        corazon,
        indiceIzquierda: ind.right <= tel.left + 1 || Number(getComputedStyle(telefono).opacity) < 0.99,
        nitida,
        burbujaVisible: !burbuja || Number(getComputedStyle(burbuja).opacity) > 0.99,
        proporcion: tel.width / tel.height,
        proporcionMockup: mockup.naturalWidth / mockup.naturalHeight,
        llena: Math.abs(pagina.width - hueco.width) < 1.5 && Math.abs(pagina.height - hueco.height) < 1.5,
        telefonoVisible: Number(getComputedStyle(telefono).opacity) > 0.99,
        introVisible: Number(getComputedStyle(intro).opacity) > 0.99,
        icono: Number(getComputedStyle(e.querySelector(".lt-icono")).opacity) > 0.99,
        iconoCaja: (() => { const r = e.querySelector(".lt-icono").getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, bottom: r.bottom }; })(),
        lema: (() => { const l = e.querySelector(".lt-lema"); return { visible: Number(getComputedStyle(l).opacity) > 0.99, texto: l.textContent, top: l.getBoundingClientRect().top }; })(),
        rayasFinas: [...e.querySelectorAll("[data-raya-paso], [data-raya-fina]")].every((x) => x.getBoundingClientRect().height <= 2.01),
        fredoka: !burbuja || /fredoka/i.test(getComputedStyle(burbuja).fontFamily),
        resaltes: burbuja ? burbuja.querySelectorAll(".lt-resalte").length : 0,
        telefonoEncima: Number(getComputedStyle(e.querySelector(".lt-zona")).zIndex) > Number(getComputedStyle(e.querySelector(".lt-burbujas")).zIndex),
        // Lo que se monta bajo el teléfono es el borde de la burbuja, nunca sus letras.
        letrasBajoTelefono: Number(getComputedStyle(telefono).opacity) > 0.99 && vistas.some((x) => { const t = x.querySelector(".lt-burbuja-texto").getBoundingClientRect(); return t.top < tel.bottom - 1 && t.right > tel.left && t.left < tel.right; }),
        // El aire de la burbuja (ajustes-lewis-11.md §1): arriba, el que se ve (del borde del teléfono, o del de la burbuja si va al
        // lado, al texto); abajo, de lo último (la última línea o la hora, si bajó a su propia línea) al borde de la burbuja.
        aire: burbuja ? (() => {
          const rango = document.createRange();
          rango.selectNodeContents(burbuja.querySelector(".lt-burbuja-texto"));
          const lineas = [...rango.getClientRects()].filter((x) => x.width > 1 && x.height > 1);
          const hora = burbuja.querySelector(".lt-burbuja-hora").getBoundingClientRect();
          const borde = b.top > tel.top + tel.height / 2 && b.top < tel.bottom && Number(getComputedStyle(telefono).opacity) > 0.99 ? tel.bottom : b.top;
          return { arriba: Math.min(...lineas.map((x) => x.top)) - borde, abajo: b.bottom - Math.max(hora.bottom, ...lineas.map((x) => x.bottom)) };
        })() : null,
        // El doble check: los dos trazos completos (stroke-dashoffset 0) y azules #53bdeb.
        checks: burbuja ? [...burbuja.querySelectorAll(".lt-check")].map((c) => ({ largo: c.getTotalLength(), offset: parseFloat(getComputedStyle(c).strokeDashoffset), color: getComputedStyle(c).stroke })) : null,
        // El icono de la app de arriba a la izquierda: rosado o verde (ajustes-lewis-12.md §1), y los iconos de la burbuja (§2).
        iconoApp: Number(getComputedStyle(e.querySelector(".lt-icono-verde")).opacity) > 0.99 ? "verde" : Number(getComputedStyle(e.querySelector(".lt-icono-rosa")).opacity) > 0.99 ? "rosa" : "a medias",
        iconosBurbuja: burbuja ? [...burbuja.querySelectorAll(".lt-icono-burbuja")].map((x) => ({ icono: x.dataset.iconoBurbuja, oculto: x.getAttribute("aria-hidden") === "true" && x.querySelector("svg")?.getAttribute("aria-hidden") === "true", ancho: x.getBoundingClientRect().width })) : [],
        // Cuánto se monta el borde de abajo del teléfono sobre la burbuja actual (px), cuando la burbuja va debajo (en el escritorio va al lado).
        montaje: burbuja && Number(getComputedStyle(telefono).opacity) > 0.99 && b.top > tel.top + tel.height / 2 ? tel.bottom - b.top : null,
        tema: document.querySelector('meta[name="theme-color"]')?.content,
        rosa: getComputedStyle(e).getPropertyValue("--marca-rosa-fija").trim(),
        bosque: getComputedStyle(e).getPropertyValue("--marca-bosque").trim(),
        video: (() => { const v = document.querySelector("[data-portada]"); return { corre: !v.paused, t: v.currentTime }; })(),
        bloqueo: Number(getComputedStyle(e.querySelector("[data-bloqueo]")).opacity),
        cortado: tel.bottom > innerHeight + 4,
        zoom: new DOMMatrix(getComputedStyle(telefono.querySelector("iframe")).transform).a,
        // La burbuja no tapa la pantalla del teléfono (2 px de margen por el redondeo).
        tapaPantalla: !!burbuja && !(b.bottom <= hueco.top + 2 || b.top >= hueco.bottom - 2 || b.right <= hueco.left + 2 || b.left >= hueco.right - 2),
        // El índice no tapa el teléfono ni lo empuja.
        indiceTapa: Number(getComputedStyle(telefono).opacity) > 0.99 && getComputedStyle(e.querySelector(".lt-indice")).visibility === "visible" && cruza(ind, tel),
        indiceVisible: getComputedStyle(e.querySelector(".lt-indice")).visibility === "visible" && Number(getComputedStyle(e.querySelector(".lt-indice")).opacity) > 0.5,
        gruesas: gruesas.map((g) => [Number(g.dataset.rayaPaso), g.dataset.estado]),
        centrada: actualRaya ? Math.abs(actualRaya.top + actualRaya.height / 2 - (ind.top + ind.height / 2)) : null,
        etiquetas: gruesas.every((g) => g.getAttribute("aria-label")),
        finas: finas.map((f) => [Number(f.dataset.rayaFina), f.dataset.llena]),
        tocables: gruesas.filter(enVentana).length >= 1 && gruesas.filter(enVentana).every(toca),
        finasNoTocables: finas.every((f) => getComputedStyle(f).pointerEvents === "none"),
        altoIndice: ind.height,
        burbujasVistas: vistas.length,
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
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  // (el indicador de `next dev` no es de la página: fuera de las capturas)
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pagina.waitForTimeout(1200);
  ok(await pagina.locator(".lt-escenario").isVisible(), "se ve la demo por pasos");
  // Lo que se mueve dentro de los teléfonos (el reel) no arrastra la página.
  ok((await pagina.evaluate(() => scrollY)) === 0 && (await datos(pagina)).paso === PASOS[0].id, "al abrir, empieza arriba, en la portada");
  // El video de la portada arranca solo, sin tocar nada (ajustes-lewis-7.md §2).
  await pagina.waitForTimeout(1500);
  ok(await pagina.evaluate(() => { const v = document.querySelector("[data-portada]"); return !v.paused && v.currentTime > 0; }), "el video de la portada se reproduce solo");
  // La primera vuelta del video, sola y limpia (docs/prompts/video-v2-y-entrar.md): solo «Saltar» encima.
  {
    const visto = await portadaVisible(pagina);
    ok(visto.entrada === "no" && !visto.icono && !visto.lema && !visto.telefono && !visto.desliza && visto.saltar && !visto.loop, `en la primera vuelta del video, solo «Saltar» (${JSON.stringify(visto)})`);
    // Al llegar al final de esa vuelta entra todo, y el video sigue en bucle.
    await pagina.evaluate(() => { const v = document.querySelector("[data-portada]"); v.currentTime = Math.max(0, v.duration - 0.15); });
    await pagina.waitForTimeout(1600);
    const despues = await portadaVisible(pagina);
    ok(despues.entrada === "telefono" && despues.icono && despues.lema && despues.telefono && despues.desliza && despues.loop && despues.corre, `al terminar la primera vuelta entran el icono, el lema, el teléfono y «Desliza y mira», y el video sigue en bucle`);
  }
  // El desbloqueo sigue al dedo: a mitad de gesto queda a mitad; al soltar antes de la mitad vuelve y pasada la mitad se completa
  // (el scroll-snap hace de resorte). Para fijar la mitad, el snap se apaga un momento.
  {
    const mitad = async (f) => {
      await pagina.evaluate((f) => { document.documentElement.style.scrollSnapType = "none"; const h = document.querySelector('[data-paso-seccion="1"]').offsetTop; window.scrollTo({ top: h * f, behavior: "instant" }); }, f);
      await pagina.waitForTimeout(250);
      const a = await pagina.evaluate(() => ({ u: Number(getComputedStyle(document.querySelector(".lt-escenario")).getPropertyValue("--u")), bloqueo: Number(getComputedStyle(document.querySelector("[data-bloqueo]")).opacity) }));
      await pagina.evaluate(() => { document.documentElement.style.scrollSnapType = ""; window.scrollBy(0, 0); });
      await pagina.waitForTimeout(1400);
      return { a, d: await datos(pagina), y: await pagina.evaluate(() => scrollY) };
    };
    const corto = await mitad(0.35);
    ok(Math.abs(corto.a.u - 0.35) < 0.03 && corto.a.bloqueo > 0.2 && corto.a.bloqueo < 0.8 && corto.y < 5 && corto.d.paso === "intro", `a mitad de gesto (u ${corto.a.u.toFixed(2)}) el desbloqueo va a mitad, y al soltar antes de la mitad vuelve`);
    const largo = await mitad(0.65);
    ok(Math.abs(largo.a.u - 0.65) < 0.03 && largo.d.paso === "hola", `pasada la mitad (u ${largo.a.u.toFixed(2)}), al soltar se completa`);
    await irAlPaso(pagina, 0);
    await pagina.waitForTimeout(1500);
  }
  // «Desliza y mira»: visible, sin píldora, y al tocarlo arranca el desbloqueo (hace lo mismo que deslizar).
  {
    const b = await pagina.evaluate(() => {
      const el = document.querySelector("[data-desliza]");
      const r = el.getBoundingClientRect();
      const circulo = getComputedStyle(el.querySelector(".lt-desliza-circulo")).backgroundColor;
      return { visible: Number(getComputedStyle(el).opacity) > 0.99, centro: r.left + r.width / 2, abajo: innerHeight - r.bottom, fondo: getComputedStyle(el).backgroundColor, circulo, texto: el.textContent.trim() };
    });
    ok(b.visible && Math.abs(b.centro - ancho / 2) < 2 && b.abajo >= 10 && b.abajo <= 40 && b.fondo === "rgba(0, 0, 0, 0)" && b.circulo === "rgb(255, 131, 79)" && b.texto === "Desliza y mira", `«Desliza y mira» centrado abajo (a ${Math.round(b.abajo)} px), con el círculo mandarina y sin píldora`);
    await pagina.locator("[data-desliza]").click();
    await pagina.waitForTimeout(1600);
    ok((await datos(pagina)).paso === "hola", "tocar «Desliza y mira» desbloquea el teléfono, como deslizar");
    await irAlPaso(pagina, 0);
    await pagina.waitForTimeout(1500);
  }

  // Hacia delante, paso a paso.
  const textos = [];
  for (let i = 0; i < PASOS.length; i++) {
    const paso = PASOS[i];
    const antes = await datos(pagina);
    if (i > 0) await irAlPaso(pagina, i);
    // Mientras dura el paso: ¿se ve el ♥ en algún momento?
    let vioHilo = false;
    let dosCorazones = false;
    let menosFinas = Infinity;
    for (const fin = Date.now() + paso.duracion + 1400; Date.now() < fin; ) {
      const v = await pagina.evaluate((i) => {
        const hilo = Number(getComputedStyle(document.querySelector(".lt-hilo-dentro")).opacity) > 0.05;
        const burst = document.querySelector('iframe[data-telefono="compradora"]').contentDocument.querySelector(".burst.go");
        const llenas = [...document.querySelectorAll(`[data-raya-fina="${i}"][data-llena="si"]`)].length;
        return { llenas, hilo: document.querySelector("[data-hilo]").dataset.visible === "si", dos: hilo && !!burst && burst.getAnimations({ subtree: true }).some((a) => a.playState === "running") };
      }, i);
      menosFinas = Math.min(menosFinas, v.llenas);
      vioHilo ||= v.hilo;
      dosCorazones ||= v.dos;
      await pagina.waitForTimeout(60);
    }
    const d = await datos(pagina);
    const esperado = estadoPaso(i);
    ok(d.paso === paso.id && Number(d.bolsa) === esperado.bolsa && Number(d.total) === esperado.total && (d.codigo === "si") === esperado.codigoVisible, `${paso.id}: bolsa ${d.bolsa}, total ${d.total}, código ${d.codigo}`);
    const m = await medir(pagina, i);
    ok(m.burbujaVisible && m.nitida && !(m.telefonoVisible && m.tapaPantalla && !m.telefonoEncima), `${paso.id}: la burbuja está completa, sin desenfoque y sin tapar la pantalla (lo que se monta queda debajo del teléfono)`);
    // El indicador: una gruesa por paso (la del paso, marcada) y una fina por toque o fase; las del paso, llenas al terminar y
    // llenándose durante él (al llegar, todavía vacías); las de antes, llenas; las de después, vacías.
    const finasEsperadas = PASOS.reduce((n, p) => n + p.fases, 0);
    ok(
      m.gruesas.length === PASOS.length - 1 && m.gruesas.every(([j, g]) => g === (j === i ? "actual" : j < i ? "visto" : "falta")) && m.etiquetas && m.finas.length === finasEsperadas && m.finas.every(([j, ll]) => (j <= i ? ll === "si" : ll === "no")),
      `${paso.id}: el indicador (${m.gruesas.length} gruesas, ${m.finas.length} finas) marca este paso y sus ${paso.fases} fina(s) llenas`,
    );
    if (i > 0 && paso.fases > 0) ok(menosFinas === 0, `${paso.id}: sus finas se llenan durante el paso (al llegar, vacías)`);
    // (el fundido dura 300 ms: al medir ya terminó)
    ok(m.iconoApp === (paso.lado === "tienda" ? "verde" : "rosa"), `${paso.id}: el icono de la app es el ${paso.lado === "tienda" ? "verde" : "rosado"} (${m.iconoApp})`);
    if (paso.burbuja) {
      const esperados = Object.values(paso.burbuja.iconos ?? {});
      ok(m.iconosBurbuja.length === esperados.length && m.iconosBurbuja.length <= 2 && m.iconosBurbuja.every((x) => x.oculto && x.ancho > 10) && esperados.every((x) => m.iconosBurbuja.some((y) => y.icono === x)), `${paso.id}: la burbuja lleva sus ${esperados.length} icono(s) de la app (${m.iconosBurbuja.map((x) => x.icono).join(", ") || "ninguno"}), con aria-hidden`);
    }
    if (m.aire) ok(Math.abs(m.aire.arriba - m.aire.abajo) <= 2, `${paso.id}: la burbuja, simétrica: ${m.aire.arriba.toFixed(1)} px de aire arriba y ${m.aire.abajo.toFixed(1)} abajo (±2)`);
    if (m.checks) ok(m.checks.length === 2 && m.checks.every((c) => c.largo > 5 && c.offset === 0 && c.color === "rgb(83, 189, 235)"), `${paso.id}: el doble check, los dos trazos completos y azules`);
    if (m.montaje !== null) ok(m.montaje >= 16 && m.montaje <= 24, `${paso.id}: el teléfono se monta ${m.montaje.toFixed(1)} px sobre la burbuja (16–24)`);
    ok(!m.indiceTapa && m.indiceIzquierda && !m.letrasBajoTelefono && m.telefonoEncima, `${paso.id}: el índice (a la izquierda) no se cruza con el mockup; el teléfono va por encima de las burbujas y no tapa sus letras`);
    ok(m.rayasFinas, `${paso.id}: las rayas del indicador son de 2 px o menos`);
    if (paso.burbuja) ok(m.fredoka && m.resaltes === (paso.burbuja.resalta?.length ?? 0), `${paso.id}: la burbuja va en Fredoka con ${m.resaltes} palabra(s) en color de marca`);
    // (la portada va en verde: su degradado de arriba es Bosque)
    const temaEsperado = paso.lado === "tienda" || i === 0 ? m.bosque : m.rosa;
    ok(m.tema && m.tema.toLowerCase() === temaEsperado.toLowerCase(), `${paso.id}: theme-color del capítulo (${m.tema})`);
    ok(Math.abs(m.escalaBurbuja - 1) < 0.01, `${paso.id}: la burbuja del paso termina a escala 1`);
    ok(m.corazon === "rgb(255, 131, 79)", `${paso.id}: el ♥ es mandarina #ff834f (${m.corazon})`);
    if (paso.id === "intro") {
      ok(m.introVisible && m.icono && m.telefonoVisible && m.bloqueo > 0.99 && m.cortado && m.zoom < 0.95, "intro: el icono y el teléfono bloqueado asomando, cortado abajo");
      ok(m.lema.visible && /Comprar sin\s*tanta vuelta\.\s*Vender con\s*más orden\./.test(m.lema.texto) && m.lema.top >= m.iconoCaja.bottom, "intro: el lema bajo el icono");
      const p = await pagina.evaluate(() => {
        const lema = document.querySelector(".lt-lema");
        const vuelta = document.createRange();
        vuelta.selectNodeContents(document.querySelector(".lt-lema-vuelta").firstChild);
        const v = vuelta.getBoundingClientRect();
        const d = document.querySelector(".lt-destello").getBoundingClientRect();
        const video = document.querySelector("[data-portada]");
        const aviso = document.querySelector("[data-aviso-bloqueo]");
        return {
          lineas: lema.getBoundingClientRect().height / parseFloat(getComputedStyle(lema).lineHeight),
          cabe: lema.scrollWidth <= lema.clientWidth,
          destello: d.left - v.right,
          mismaLinea: d.top < v.bottom && d.bottom > v.top,
          video: Number(getComputedStyle(video).opacity) === 1 && getComputedStyle(video).filter === "none",
          aviso: aviso.textContent,
          contexto: document.querySelector(".lt-contexto").textContent,
          descripcion: document.querySelector(".lt-descripcion").textContent,
        };
      });
      ok(Math.abs(p.lineas - 4) < 0.05 && p.cabe, `intro: el lema en cuatro líneas, sin partirse (${p.lineas.toFixed(2)})`);
      ok(p.destello >= 0 && p.destello < 6 && p.mismaLinea, `intro: el destello va pegado a «vuelta.» (a ${p.destello.toFixed(1)} px, en su línea)`);
      ok(p.contexto === "Desliza. Encuentra. Escribe." && /llega a Tu Tienda con todo en su sitio/.test(p.descripcion), "intro: la línea de contexto (sentence case) y la descripción con Tu Tienda");
      ok(p.video, "intro: el video a todo color, sin oscurecido general");
      ok(/Tu Tienda/.test(p.aviso) && /ahora/.test(p.aviso) && /Llegó el termo rosado\. Desliza y míralo\./.test(p.aviso), "intro: la pantalla de bloqueo lleva el aviso de Tu Tienda");
      const c = await contrastePortada(pagina);
      ok(c.crema >= 7 && c.rosa >= 4.5 && c.mandarina >= 3, `intro: contraste sobre el video en movimiento, en el peor fotograma: crema ${c.crema.toFixed(1)}:1 (≥7), rosa ${c.rosa.toFixed(1)}:1 (≥4.5), mandarina ${c.mandarina.toFixed(1)}:1 (≥3, texto grande)`);
      ok(!m.indiceVisible && m.burbujasVistas === 0, "intro: sin indicador ni burbujas");
      const v = await pagina.evaluate(() => {
        const video = document.querySelector("[data-portada]");
        return { muted: video.muted, playsinline: video.playsInline, poster: video.getAttribute("poster"), fuentes: [...video.querySelectorAll("source")].map((x) => x.getAttribute("src")) };
      });
      const pesos = v.fuentes.map((f) => statSync(`public${f}`).size);
      ok(v.muted && v.playsinline && v.poster && pesos.length >= 1 && pesos.every((b) => b < 2.5e6), `intro: el video de la portada va sin sonido, con playsinline y póster, y pesa menos de 2.5 MB (${pesos.map((b) => (b / 1e6).toFixed(2)).join(" y ")} MB)`);
    } else {
      ok(
        m.indiceVisible && m.tocables && m.finasNoTocables && m.altoIndice >= alto * 0.24 && m.altoIndice <= alto * 0.31 && m.centrada !== null && m.centrada < 3,
        `${paso.id}: el indicador es una regla corta (${Math.round(m.altoIndice)} px, 25–30 % del alto) con la raya del paso en el centro; las gruesas a la vista se tocan sin solaparse y las finas no`,
      );
      if (paso.id === "hola") ok(m.bloqueo < 0.01 && Math.abs(m.zoom - 1) < 0.01, "hola: al deslizar se desbloquea y el catálogo queda a su tamaño");
      ok(m.iconoCaja.left < 40 && m.iconoCaja.top < 40 && m.iconoCaja.w >= 36 && m.iconoCaja.w <= 44, `${paso.id}: el icono, arriba a la izquierda (${Math.round(m.iconoCaja.w)} px)`);
      if (paso.id === "pasa") ok(m.video.corre && m.video.t > 0, "pasa: el video sigue reproduciéndose fuera de la portada");
      // La página del teléfono cubre la pantalla del mockup entera (ajustes-lewis-8.md §6): junto a la isla y en las esquinas de
      // arriba, el color no es el del fondo de la landing.
      const fondo = paso.lado === "tienda" ? m.bosque : m.rosa;
      const cubre = await cubrePantalla(pagina, paso.telefono, fondo);
      ok(cubre.ok, `${paso.id}: la página llena la pantalla del mockup (arriba, junto a la isla y en las esquinas)${cubre.ok ? "" : ` (${cubre.detalle})`}`);
      ok(!m.introVisible && m.telefonoVisible && Math.abs(m.proporcion - m.proporcionMockup) < 0.01 && m.dentro && m.llena, `${paso.id}: el mockup entero, en pantalla, con la página llenando su pantalla (${m.proporcion.toFixed(3)})`);
    }
    // El ♥ es el dedo: aparece en cada toque y en el viaje, y en los demás pasos no se ve. Al terminar el paso ya se fue.
    const toques = Number(d.toques) - Number(antes.toques);
    const viajes = Number(d.viajes) - Number(antes.viajes);
    if (paso.dedo === "no" || i === 0) ok(!vioHilo && toques === 0 && viajes === 0, `${paso.id}: sin toque ni viaje, el ♥ no se ve`);
    else if (paso.dedo === "toque") ok(vioHilo && toques === paso.fases, `${paso.id}: el ♥ marca ${toques} toque(s), uno por raya fina (${paso.fases})`);
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
    textos.push(await pagina.evaluate(() => [document, ...[...document.querySelectorAll("iframe")].map((f) => f.contentDocument)].map((d) => d?.body?.innerText ?? "").join("\n")));
    ok(paso.lado === "tienda" ? m.fondoTienda > 0.95 : m.fondoTienda < 0.05, `${paso.id}: fondo de ${paso.lado === "tienda" ? "la tienda (verde)" : "la compradora (rosa)"}`);
    if (capturas && (ancho === 393 || ancho === 1440)) {
      mkdirSync("docs/capturas/landing", { recursive: true });
      // (Chromium sin pantalla pinta un video en marcha por encima de lo que tiene delante: en la captura de la portada, parado)
      if (i === 0) await pagina.evaluate(() => document.querySelector("[data-portada]").pause());
      await pagina.screenshot({ path: `docs/capturas/landing/${String(i + 1).padStart(2, "0")}-${paso.id}-${ancho}.png` });
      if (i === 0) await pagina.evaluate(() => void document.querySelector("[data-portada]").play().catch(() => {}));
    }
  }
  {
    const todo = textos.join("\n");
    ok(!/La Vuelta|la-vuelta|Brisa|Vuelta Store/.test(todo) && /Tu Tienda/.test(todo), "la tienda de la demo es «Tu Tienda»: ni «La Vuelta», ni «Brisa», ni «Vuelta Store» en la landing ni en los teléfonos");
  }
  // El indicador: tocar una gruesa (de las que se ven, cerca de la del paso) lleva a su paso.
  for (const j of [PASOS.length - 3, PASOS.length - 5]) {
    await pagina.locator(`[data-raya-paso="${j}"]`).click();
    await pagina.waitForTimeout(1600);
    const dc = await datos(pagina);
    ok(dc.paso === PASOS[j].id, `el indicador: la raya de «${PASOS[j].id}» lleva a «${dc.paso}»`);
  }
  // Al retroceder desde «cambio», el icono de la app vuelve al rosado.
  {
    const cambio = PASOS.findIndex((p) => p.id === "cambio");
    // (desde la portada: un salto largo; uno de 2 o 3 pasos lo frena el controlador, como a un deslizamiento fuerte)
    await irAlPaso(pagina, 0);
    await pagina.waitForTimeout(1500);
    await irAlPaso(pagina, cambio);
    await pagina.waitForTimeout(1600);
    const en = (await medir(pagina, cambio)).iconoApp;
    await irAlPaso(pagina, cambio - 1);
    await pagina.waitForTimeout(1600);
    const antes = (await medir(pagina, cambio - 1)).iconoApp;
    ok(en === "verde" && antes === "rosa", `el icono de la app pasa a verde en «cambio» y, al retroceder, vuelve al rosado (${en} → ${antes})`);
  }
  // Al volver a la portada desde el primer paso, el teléfono se bloquea otra vez.
  await irAlPaso(pagina, 0);
  await pagina.waitForTimeout(1500);
  const mb = await medir(pagina, 0);
  ok(mb.bloqueo > 0.99 && mb.zoom < 0.95 && mb.cortado, "al volver a la portada, se bloquea y vuelve a asomar");
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
  ok((await pagina.getByRole("link", { name: "Quiero vender" }).getAttribute("href")) === ENLACE_QUIERO_VENDER, "«Quiero vender» abre el Instagram de Deslizapp");
  ok((await pagina.getByRole("link", { name: "Ver un catálogo de ejemplo" }).getAttribute("href")) === ENLACE_CATALOGO_EJEMPLO, "«Ver un catálogo de ejemplo» va a la Tienda de ensayo");
  const cierre = await pagina.evaluate(() => {
    const c = document.getElementById("cierre");
    const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility === "visible"; };
    return {
      fotos: [...c.querySelectorAll(".lt-abanico-foto")].filter((f) => visible(f) && f.complete && f.naturalWidth > 0).length,
      enlaces: ["vender", "catalogo", "entrar"].every((k) => visible(c.querySelector(`[data-cta="${k}"]`))),
      otraVez: c.querySelector('[data-cta="otra-vez"]')?.getAttribute("href"),
      corazon: visible(c.querySelector("[data-corazon-cierre]")) && /Despachado/.test(c.textContent),
      iconoVerde: c.querySelector(".lt-cierre-icono")?.getAttribute("src") === "/landing/icono-verde.webp",
      fondo: getComputedStyle(c).backgroundColor,
      bosque: getComputedStyle(document.documentElement).getPropertyValue("--marca-bosque").trim(),
      tema: document.querySelector('meta[name="theme-color"]')?.content,
      sinSubtitulo: !/Un catálogo para comprar\. Una app para lo que pasa después\./.test(c.textContent),
    };
  });
  ok(cierre.iconoVerde, "en el cierre, el icono de la app es el verde");
  ok(cierre.fotos === 3 && cierre.corazon, "el cierre lleva las tres fotos en abanico con el ♥ y «Despachado»");
  ok(cierre.enlaces && cierre.otraVez === "#arriba" && cierre.sinSubtitulo, "el cierre lleva «Quiero vender», «Ver un catálogo de ejemplo», «Entrar» y «Ver la demo otra vez», sin el subtítulo de antes");
  ok(cierre.fondo === "rgb(23, 75, 58)" && cierre.tema?.replace(/\s/g, "") === cierre.fondo.replace(/\s/g, ""), `el cierre va en verde Bosque, con el theme-color igual (${cierre.tema})`);
  const cta = await pagina.getByRole("link", { name: "Quiero vender" }).boundingBox();
  ok(cta && cta.x >= 0 && cta.x + cta.width <= ancho, "los CTA caben en la pantalla");
  ok(errores.length === 0, `sin errores de la página${errores.length ? ": " + errores.join(" | ") : ""}`);
  if (capturas && (ancho === 393 || ancho === 1440)) await pagina.screenshot({ path: `docs/capturas/landing/${String(PASOS.length + 1).padStart(2, "0")}-cierre-${ancho}.png` });
  // «Entrar» (en el cierre): la página principal, con su «Iniciar sesión».
  await pagina.locator('[data-cta="entrar"]').click();
  await pagina.waitForURL((u) => new URL(u).pathname === "/");
  await pagina.getByRole("button", { name: "Iniciar sesión", exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
  ok(await pagina.getByRole("button", { name: "Iniciar sesión", exact: true }).isVisible(), "«Entrar» lleva a la página principal, con «Iniciar sesión»");
  ok(await pagina.getByRole("button", { name: "Probar la app con datos de prueba" }).isVisible(), "y el enlace a la demo («Probar la app con datos de prueba»)");
  await contexto.close();
}

console.log("\nLa primera vuelta del video: un gesto antes, y el tope de 10 s");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1500);
  const antes = await portadaVisible(pagina);
  await pagina.mouse.wheel(0, 60);
  await pagina.waitForTimeout(700);
  const despues = await portadaVisible(pagina);
  ok(antes.entrada === "no" && despues.icono && despues.lema && despues.telefono, "si se desliza antes de que termine la vuelta, todo entra al momento");
  await contexto.close();
}
{
  // Un video que no llega a terminar (aquí, la red no responde): a los 10 s entra todo igual. (Si el video falla del todo, el
  // navegador lo dice y todo entra al momento, como con movimiento reducido.)
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
  await contexto.route(/\/landing\/portada-v2\.(webm|mp4)/, (r) => new Promise((ok) => setTimeout(() => r.abort().catch(() => {}).finally(ok), 15000)));
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce", { waitUntil: "domcontentloaded" });
  await pagina.waitForTimeout(6000);
  const a6 = await portadaVisible(pagina);
  // (los 10 s cuentan desde que la página arranca; luego, la transición de entrada)
  await pagina.waitForTimeout(6500);
  const a12 = await portadaVisible(pagina);
  ok(a6.entrada === "no" && a12.entrada === "telefono" && a12.icono && a12.telefono, `sin final de la vuelta, el tope de 10 s hace entrar todo (a los 6 s: ${a6.entrada}; a los 12.5 s: ${a12.entrada})`);
  await contexto.close();
}

console.log("\nAhorro de datos: póster sin descargar video");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 }, serviceWorkers: "block" });
  await contexto.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true }));
  const pagina = await contexto.newPage();
  const descargas = [];
  pagina.on("request", (r) => { if (/\/landing\/portada-v2\.(webm|mp4)/.test(r.url())) descargas.push(r.url()); });
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1800);
  const p = await portadaVisible(pagina);
  ok(p.icono && p.lema && p.telefono && p.desliza && !p.corre, "con ahorro de datos, póster y portada completa desde el principio");
  ok(descargas.length === 0, `con ahorro de datos no se solicita ningún video (${descargas.length})`);
  await contexto.close();
}

console.log("\nMovimiento reducido");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const pagina = await contexto.newPage();
  const descargas = [];
  pagina.on("request", (r) => { if (/\/landing\/portada-v2\.(webm|mp4)/.test(r.url())) descargas.push(r.url()); });
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  ok(descargas.length === 0, "con movimiento reducido tampoco se solicita el video");
  await pagina.waitForTimeout(1200);
  ok(await pagina.evaluate(() => document.querySelector("[data-portada]").paused), "en la portada, el video no se reproduce (queda el póster)");
  {
    const visto = await portadaVisible(pagina);
    ok(visto.icono && visto.lema && visto.telefono && visto.desliza, "y todo se ve desde el principio");
  }
  await irAlPaso(pagina, 1);
  await pagina.waitForTimeout(400);
  const m = await medir(pagina, 1);
  ok(m.burbujaVisible && m.nitida, "cada paso muestra su estado final al instante (burbuja completa sin animación)");
  ok(m.checks?.length === 2 && m.checks.every((c) => c.offset === 0 && c.color === "rgb(83, 189, 235)"), "con movimiento reducido, el doble check ya está completo y azul");
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

console.log("\nEl video de la portada en el HTML del servidor y en un iPhone");
{
  // React no escribe `muted` en el HTML del servidor; sin él, Safari en iOS no reproduce solo (ajustes-lewis-7.md §2).
  const html = await (await fetch(base + "/conoce")).text();
  const etiqueta = html.match(/<video[^>]*data-portada[^>]*>/)?.[0] ?? "";
  ok(/\smuted[\s>]/.test(etiqueta) && /\splaysinline[\s>]/.test(etiqueta), "el <video> sale del servidor con `muted` y `playsinline` literales");
  // (aquí no hay WebKit: Chromium con la emulación de iPhone)
  const contexto = await nav.newContext({ ...playwright.devices["iPhone 13"] });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(2000);
  ok(await pagina.evaluate(() => { const v = document.querySelector("[data-portada]"); return !v.paused && v.currentTime > 0; }), "con la emulación de iPhone, el video arranca solo");
  await contexto.close();
}

console.log("\nSin JavaScript");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce");
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
  ok(!(await pagina.locator(".ini").isVisible()), "y no la página principal");
  // /conoce se ve siempre, también con la demo elegida.
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  ok(await pagina.locator(".lt-escenario").isVisible(), "/conoce muestra la landing también con la demo elegida");
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
