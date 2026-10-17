// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-landing.mjs [url]`.
// La landing de deslizapp.com por pasos (referencias/landing/ajustes-lewis-2.md y -3.md, docs/prompts/conoce-portada-narrativa.md) a
// 360×640, 393×852, 430×932 y 1440×900: avanzar paso a paso (el dolor de quien vende, el post, el perfil y el navegador de Instagram
// antes del catálogo, y el cambio de lado entre quien compra y la tienda; burbuja completa y sin desenfoque, que no tapa la pantalla;
// estado del teléfono: bolsa, total y código; el mockup entero y la página llenando su pantalla; el reel y la bolsa como en la app;
// el ♥ como dedo: en cada toque y en el viaje, oculto en los demás; el índice; el fondo de cada persona), el índice lleva a cada
// capítulo, retroceder un paso, un deslizamiento fuerte no se salta pasos, «Saltar», los CTA y «Entrar»,
// movimiento reducido, sin JavaScript y que el modo demo sigue abriendo el panel. Con CAPTURAS=1 guarda una captura de cada pantalla
// nueva (360×640, 393×852 y 1440×900) en docs/capturas/conoce-portada-narrativa/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { PASOS, estadoPaso } = await import("../lib/landing/pasos.ts");
const { ENLACE_QUIERO_VENDER, ENLACE_CATALOGO_EJEMPLO } = await import("../lib/landing/enlaces.ts");

// Las pantallas sin teléfono (los separadores y el cambio de lado) y las que se dibujan dentro del de la compradora.
const SIN_TELEFONO = ["bienvenida", "antes", "solucion", "cambio-lado"];
const verde = (p) => p.lado === "tienda" || p.lado === "inicio";
const base = process.argv[2] ?? "http://localhost:3000";
const capturas = process.env.CAPTURAS === "1";
const CARPETA_CAPTURAS = "docs/capturas/conoce-portada-narrativa";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
let fallos = 0;
const ok = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    fallos++;
    console.log("  ✗", msg);
  }
};

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

const irAlPaso = (pagina, i) => pagina.evaluate((i) => document.querySelector(`[data-paso-seccion="${i}"]`).scrollIntoView({ behavior: "instant" }), i);
const datos = (pagina) => pagina.evaluate(() => ({ ...document.querySelector(".lt-escenario").dataset }));

/** Todo lo que se comprueba de un paso, medido en la página. */
const medir = (pagina, i) =>
  pagina.evaluate(
    ({ i, paso }) => {
      const e = document.querySelector(".lt-escenario");
      // (`cambio-lado` no tiene burbuja)
      const burbuja = e.querySelector(`[data-burbuja="${i}"]`);
      const nitida = !burbuja || (getComputedStyle(burbuja).filter === "none" && [...burbuja.querySelectorAll("*")].every((x) => getComputedStyle(x).filter === "none"));
      const telefono = e.querySelector(`.lt-tel-${paso.telefono}`);
      const tel = telefono.getBoundingClientRect();
      const mockup = telefono.querySelector(".lt-mockup");
      const hueco = telefono.querySelector(".lt-hueco").getBoundingClientRect();
      const pagina = telefono.querySelector("iframe").getBoundingClientRect();
      const b = burbuja?.getBoundingClientRect() ?? new DOMRect();
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
        // La burbuja entera (con su hora y sus checks) cabe en su zona: ni el borde de abajo se corta (el recorte es el de .lt-burbujas).
        burbujaEntera: burbuja ? b.bottom <= e.querySelector(".lt-burbujas").getBoundingClientRect().bottom + 1 && burbuja.querySelector(".bc-hora").getBoundingClientRect().bottom <= e.querySelector(".lt-burbujas").getBoundingClientRect().bottom && b.bottom <= innerHeight : true,
        corazon,
        indiceIzquierda: ind.right <= tel.left + 1 || Number(getComputedStyle(telefono).opacity) < 0.99,
        nitida,
        burbujaVisible: !burbuja || Number(getComputedStyle(burbuja).opacity) > 0.99,
        proporcion: tel.width / tel.height,
        proporcionMockup: mockup.naturalWidth / mockup.naturalHeight,
        llena: Math.abs(pagina.width - hueco.width) < 1.5 && Math.abs(pagina.height - hueco.height) < 1.5,
        telefonoVisible: Number(getComputedStyle(telefono).opacity) > 0.99,
        icono: Number(getComputedStyle(e.querySelector(".lt-icono")).opacity) > 0.99,
        iconoCaja: (() => { const r = e.querySelector(".lt-icono").getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, bottom: r.bottom }; })(),
        rayasFinas: [...e.querySelectorAll("[data-raya-paso], [data-raya-fina]")].every((x) => x.getBoundingClientRect().height <= 2.01),
        fredoka: !burbuja || /fredoka/i.test(getComputedStyle(burbuja).fontFamily),
        resaltes: burbuja ? burbuja.querySelectorAll(".lt-resalte").length : 0,
        telefonoEncima: Number(getComputedStyle(e.querySelector(".lt-zona")).zIndex) > Number(getComputedStyle(e.querySelector(".lt-burbujas")).zIndex),
        // Lo que se monta bajo el teléfono es el borde de la burbuja, nunca sus letras.
        letrasBajoTelefono: Number(getComputedStyle(telefono).opacity) > 0.99 && vistas.some((x) => { const t = x.querySelector(".bc-texto").getBoundingClientRect(); return t.top < tel.bottom - 1 && t.right > tel.left && t.left < tel.right; }),
        // El aire de la burbuja (ajustes-lewis-11.md §1): arriba, el que se ve (del borde del teléfono, o del de la burbuja si va al
        // lado, al texto); abajo, de lo último (la última línea o la hora, si bajó a su propia línea) al borde de la burbuja.
        aire: burbuja ? (() => {
          const rango = document.createRange();
          rango.selectNodeContents(burbuja.querySelector(".bc-texto"));
          const lineas = [...rango.getClientRects()].filter((x) => x.width > 1 && x.height > 1);
          const hora = burbuja.querySelector(".bc-hora").getBoundingClientRect();
          const borde = b.top > tel.top + tel.height / 2 && b.top < tel.bottom && Number(getComputedStyle(telefono).opacity) > 0.99 ? tel.bottom : b.top;
          return { arriba: Math.min(...lineas.map((x) => x.top)) - borde, abajo: b.bottom - Math.max(hora.bottom, ...lineas.map((x) => x.bottom)) };
        })() : null,
        // El doble check: los dos trazos completos (stroke-dashoffset 0) y azules #53bdeb.
        checks: burbuja ? [...burbuja.querySelectorAll(".bc-check")].map((c) => ({ largo: c.getTotalLength(), offset: parseFloat(getComputedStyle(c).strokeDashoffset), color: getComputedStyle(c).stroke })) : null,
        // El icono de la app de arriba a la izquierda: rosado o verde (ajustes-lewis-12.md §1), y los iconos de la burbuja (§2).
        iconoApp: Number(getComputedStyle(e.querySelector(".lt-icono-verde")).opacity) > 0.99 ? "verde" : Number(getComputedStyle(e.querySelector(".lt-icono-rosa")).opacity) > 0.99 ? "rosa" : "a medias",
        iconosBurbuja: burbuja ? [...burbuja.querySelectorAll(".lt-icono-burbuja")].map((x) => ({ icono: x.dataset.iconoBurbuja, oculto: x.getAttribute("aria-hidden") === "true" && x.querySelector("svg")?.getAttribute("aria-hidden") === "true", ancho: x.getBoundingClientRect().width })) : [],
        // Cuánto se monta el borde de abajo del teléfono sobre la burbuja actual (px), cuando la burbuja va debajo (en el escritorio va al lado).
        montaje: burbuja && Number(getComputedStyle(telefono).opacity) > 0.99 && b.top > tel.top + tel.height / 2 ? tel.bottom - b.top : null,
        tema: document.querySelector('meta[name="theme-color"]')?.content,
        rosa: getComputedStyle(e).getPropertyValue("--marca-rosa-fija").trim(),
        bosque: getComputedStyle(e).getPropertyValue("--marca-bosque").trim(),
        arena: getComputedStyle(e).getPropertyValue("--color-arena").trim(),
        iconoOculto: Number(getComputedStyle(e.querySelector(".lt-icono")).opacity) < 0.05,
        fondoArena: Number(getComputedStyle(e.querySelector(".lt-fondo-arena")).opacity),
        separadores: [...e.querySelectorAll("[data-separador]")].map((x) => [x.dataset.separador, Number(getComputedStyle(x).opacity), x.textContent]),
        escenas: [...e.querySelectorAll("[data-escena]")].map((x) => [x.dataset.escena, Number(getComputedStyle(x).opacity)]),
        cambioLado: (() => { const c = e.querySelector("[data-cambio-lado]"); const v = e.querySelector(".cl-icono-verde").getBoundingClientRect(); const r = e.querySelector(".cl-icono-rosa").getBoundingClientRect(); const visible = (x) => x.closest("[data-fase]") && Number(getComputedStyle(x).opacity) > 0.99; return { visible: Number(getComputedStyle(c).opacity) > 0.99, titulo: [...c.querySelectorAll(".cl-titulo .cl-frase")].filter(visible).map((x) => x.textContent).join(""), texto: [...c.querySelectorAll(".cl-texto .cl-frase")].filter(visible).map((x) => x.textContent).join(""), verde: v.width, rosa: r.width, verdeX: v.left + v.width / 2, rosaX: r.left + r.width / 2, cambio: e.dataset.cambio ?? null, lado: e.dataset.lado }; })(),
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
  ok((await pagina.evaluate(() => scrollY)) === 0 && (await datos(pagina)).paso === PASOS[0].id, "al abrir, empieza arriba, en el primer paso del dolor");
  // La primera pantalla se ve completa sin hacer scroll (la crítica de que «se ve en blanco»): el mensaje directo, la burbuja y el
  // índice, ya al abrir y con el fondo arena, sin esperar al video ni a deslizar.
  {
    const primera = await medir(pagina, 0);
    const bienvenida = primera.separadores.find(([id]) => id === "bienvenida");
    ok(bienvenida && bienvenida[1] > 0.99 && /deslizapp/.test(bienvenida[2]) && primera.indiceVisible && primera.fondoTienda > 0.95 && primera.iconoOculto && !primera.telefonoVisible, "la primera pantalla ya está completa al abrir, sin hacer scroll: la bienvenida con «deslizapp» sobre Bosque y el índice (sin el icono pequeño)");
    ok(!(await pagina.evaluate(() => !!document.querySelector("video, [data-portada], [data-desliza], [data-bloqueo]"))), "ya no hay video de portada, «Desliza y mira» ni teléfono bloqueado");
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
      m.gruesas.length === PASOS.length && m.gruesas.every(([j, g]) => g === (j === i ? "actual" : j < i ? "visto" : "falta")) && m.etiquetas && m.finas.length === finasEsperadas && m.finas.every(([j, ll]) => (j <= i ? ll === "si" : ll === "no")),
      `${paso.id}: el indicador (${m.gruesas.length} gruesas, ${m.finas.length} finas) marca este paso y sus ${paso.fases} fina(s) llenas`,
    );
    if (i > 0 && paso.fases > 0) ok(menosFinas === 0, `${paso.id}: sus finas se llenan durante el paso (al llegar, vacías)`);
    // (el fundido dura 300 ms: al medir ya terminó) En las pantallas de dolor y en el cambio de lado, el icono pequeño no sale.
    if (paso.lado === "antes" || paso.lado === "inicio" || paso.id === "solucion" || paso.id === "cambio-lado") ok(m.iconoOculto, `${paso.id}: el icono pequeño de la app no sale`);
    else ok(m.iconoApp === (paso.lado === "tienda" ? "verde" : "rosa") && !m.iconoOculto, `${paso.id}: el icono de la app es el ${paso.lado === "tienda" ? "verde" : "rosado"} (${m.iconoApp})`);
    if (paso.burbuja) {
      const esperados = Object.values(paso.burbuja.iconos ?? {});
      ok(m.iconosBurbuja.length === esperados.length && m.iconosBurbuja.length <= 2 && m.iconosBurbuja.every((x) => x.oculto && x.ancho > 10) && esperados.every((x) => m.iconosBurbuja.some((y) => y.icono === x)), `${paso.id}: la burbuja lleva sus ${esperados.length} icono(s) de la app (${m.iconosBurbuja.map((x) => x.icono).join(", ") || "ninguno"}), con aria-hidden`);
    }
    ok(m.burbujaEntera, `${paso.id}: la burbuja se ve entera, con su hora y sus checks, dentro de su zona y de la pantalla`);
    if (m.aire) ok(Math.abs(m.aire.arriba - m.aire.abajo) <= 2, `${paso.id}: la burbuja, simétrica: ${m.aire.arriba.toFixed(1)} px de aire arriba y ${m.aire.abajo.toFixed(1)} abajo (±2)`);
    if (m.checks) ok(m.checks.length === 2 && m.checks.every((c) => c.largo > 5 && c.offset === 0 && c.color === "rgb(83, 189, 235)"), `${paso.id}: el doble check, los dos trazos completos y azules`);
    if (m.montaje !== null) ok(m.montaje >= 16 && m.montaje <= 24, `${paso.id}: el teléfono se monta ${m.montaje.toFixed(1)} px sobre la burbuja (16–24)`);
    ok(!m.indiceTapa && m.indiceIzquierda && !m.letrasBajoTelefono && m.telefonoEncima, `${paso.id}: el índice (a la izquierda) no se cruza con el mockup; el teléfono va por encima de las burbujas y no tapa sus letras`);
    ok(m.rayasFinas, `${paso.id}: las rayas del indicador son de 2 px o menos`);
    if (paso.burbuja) ok(m.fredoka && m.resaltes === (paso.burbuja.resalta?.length ?? 0), `${paso.id}: la burbuja va en Fredoka con ${m.resaltes} palabra(s) en color de marca`);
    const temaEsperado = verde(paso) ? m.bosque : paso.lado === "antes" ? m.arena : m.rosa;
    ok(m.tema && m.tema.toLowerCase() === temaEsperado.toLowerCase(), `${paso.id}: theme-color del capítulo (${m.tema})`);
    ok(Math.abs(m.escalaBurbuja - 1) < 0.01, `${paso.id}: la burbuja del paso termina a escala 1`);
    ok(m.corazon === "rgb(255, 131, 79)", `${paso.id}: el ♥ es mandarina #ff834f (${m.corazon})`);
      ok(
        m.indiceVisible && m.tocables && m.finasNoTocables && m.altoIndice >= alto * 0.24 && m.altoIndice <= alto * 0.31 && m.centrada !== null && m.centrada < 3,
        `${paso.id}: el indicador es una regla corta (${Math.round(m.altoIndice)} px, 25–30 % del alto) con la raya del paso en el centro; las gruesas a la vista se tocan sin solaparse y las finas no`,
      );
      ok(m.iconoCaja.left < 40 && m.iconoCaja.top < 40 && m.iconoCaja.w >= 36 && m.iconoCaja.w <= 44, `${paso.id}: el icono, arriba a la izquierda (${Math.round(m.iconoCaja.w)} px)`);
      // La página del teléfono cubre la pantalla del mockup entera (ajustes-lewis-8.md §6): junto a la isla y en las esquinas de
      // arriba, el color no es el del fondo de la landing.
      if (!paso.escena) {
        const fondo = verde(paso) ? m.bosque : m.rosa;
        const cubre = await cubrePantalla(pagina, paso.telefono, fondo);
        ok(cubre.ok, `${paso.id}: la página llena la pantalla del mockup (arriba, junto a la isla y en las esquinas)${cubre.ok ? "" : ` (${cubre.detalle})`}`);
      }
      if (!SIN_TELEFONO.includes(paso.id)) ok(m.telefonoVisible && Math.abs(m.proporcion - m.proporcionMockup) < 0.01 && m.dentro && m.llena, `${paso.id}: el mockup entero, en pantalla, con la página llenando su pantalla (${m.proporcion.toFixed(3)})`);
      // Las pantallas nuevas: se ve la suya y las demás no; el cambio de lado, sin teléfono y en su estado final.
      if (paso.escena && !SIN_TELEFONO.includes(paso.id)) ok(m.escenas.every(([id, op]) => (id === paso.escena ? op > 0.99 : op < 0.05)), `${paso.id}: se ve su pantalla (${paso.escena}) y no las otras`);
      else ok(m.escenas.every(([, op]) => op < 0.05), `${paso.id}: no se ve ninguna de las pantallas del teléfono`);
      // Los separadores: se ve el suyo (y solo ese) sin teléfono, con su texto tal cual.
      if (["bienvenida", "antes", "solucion"].includes(paso.id)) {
        const TEXTOS = { bienvenida: ["hola, esto es", "deslizapp", "En un minuto te enseñamos cómo vender sin tanta vuelta."], antes: ["antes de empezar…", "Seguro esto", "te suena.", "Así se vende hoy por Instagram y WhatsApp.", "¿precio?", "¿lo tienes en negro?", "📷 foto", "¿y el envío?", "¿cuál era? 😅"], solucion: ["ahora, con Deslizapp…", "Así lo", "resolvemos.", "Tu catálogo enseña fotos, precios y lo que queda. A ti te llega el pedido listo.", "¿precio?", "¿cuál era?"] };
        const mio = m.separadores.find(([id]) => id === paso.id);
        ok(m.separadores.every(([id, op]) => (id === paso.id ? op > 0.99 : op < 0.05)) && !m.telefonoVisible, `${paso.id}: se ve su separador, solo, sin teléfono`);
        ok(TEXTOS[paso.id].every((t) => mio[2].replace(/\s+/g, " ").includes(t.replace(/\s+/g, " ")) || mio[2].includes(t)), `${paso.id}: lleva sus textos tal cual`);
      }
      if (paso.id === "cambio-lado") {
        const c = m.cambioLado;
        ok(!m.telefonoVisible && c.visible, "cambio-lado: pantalla propia, sin teléfono");
        ok(c.cambio === "despues" && c.lado === "tienda" && /Así lo ve Tu Tienda\./.test(c.titulo) && /El pedido te llega completo: qué quiere, cuánto y a quién se lo mandas\./.test(c.texto), `cambio-lado: al terminar, «${c.titulo}» y su texto (${c.cambio}, lado ${c.lado})`);
        ok(c.verde > c.rosa * 1.3 && c.verdeX < c.rosaX, `cambio-lado: el icono verde (la tienda) pasó a delante y grande (${Math.round(c.verde)} px) y el rosa (quien compra) a un lado y chico (${Math.round(c.rosa)} px)`);
      }
      if (paso.escena === "dolor-dm") ok(/precio de este/.test(await pagina.evaluate(() => document.querySelector('[data-escena="dolor-dm"]').textContent)) && /Escríbeme al WhatsApp/.test(await pagina.evaluate(() => document.querySelector('[data-escena="dolor-dm"]').textContent)), "dolor-dm: el mensaje directo trae «¿precio?» y la tienda contestando «escríbeme al WhatsApp»");
      if (paso.escena === "navegador") {
        // El catálogo real sigue dentro del navegador: el marco de Instagram encima y la página del teléfono debajo.
        const n = await pagina.evaluate(() => { const nv = document.querySelector('[data-escena="navegador"] .nv-url b'); const marco = document.querySelector('[data-escena="navegador"] .nv-arriba').getBoundingClientRect(); const hueco = document.querySelector(".lt-tel-compradora .lt-hueco").getBoundingClientRect(); return { dominio: nv.textContent.trim(), cabe: marco.top >= hueco.top - 1 && marco.bottom < hueco.bottom, iframe: !!document.querySelector('iframe[data-telefono="compradora"]').contentDocument.querySelector(".reel") }; });
        ok(n.dominio === "deslizapp.com/tutienda" && n.cabe && n.iframe, "navegador: la barra con deslizapp.com/tutienda sobre el catálogo real del teléfono");
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
    ok(verde(paso) ? m.fondoTienda > 0.95 : m.fondoTienda < 0.05, `${paso.id}: fondo ${verde(paso) ? "Bosque (verde)" : paso.lado === "antes" ? "arena" : "rosa"}`);
    if (paso.lado === "antes") ok(m.fondoArena > 0.95, `${paso.id}: el fondo arena, sin color de marca`);
    if (capturas && paso.escena && [360, 393, 1440].includes(ancho)) {
      mkdirSync(CARPETA_CAPTURAS, { recursive: true });
      await pagina.screenshot({ path: `${CARPETA_CAPTURAS}/${String(i + 1).padStart(2, "0")}-${paso.id}-${ancho}x${alto}.png` });
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
  // El cambio de lado (docs/prompts/conoce-portada-narrativa.md): al llegar, rosa y «Pidió en segundos.»; un momento después, los iconos se
  // intercambian y todo pasa a verde. Al retroceder, el icono de la app vuelve al rosado.
  {
    const lado = PASOS.findIndex((p) => p.id === "cambio-lado");
    const cambio = PASOS.findIndex((p) => p.id === "cambio");
    const seguimiento = PASOS.findIndex((p) => p.id === "seguimiento");
    // (desde el principio: un salto largo; uno de 2 o 3 pasos lo frena el controlador, como a un deslizamiento fuerte)
    await irAlPaso(pagina, 0);
    await pagina.waitForTimeout(1500);
    await irAlPaso(pagina, seguimiento);
    await pagina.waitForTimeout(1600);
    const rosaAntes = (await medir(pagina, seguimiento)).iconoApp;
    await irAlPaso(pagina, lado);
    await pagina.waitForTimeout(650);
    const llega = (await medir(pagina, lado)).cambioLado;
    const fondoLlega = (await medir(pagina, lado)).fondoTienda;
    ok(llega.cambio === "antes" && llega.lado === "compras" && /Pidió en segundos\./.test(llega.titulo) && /le dio aaah y te mandó el pedido por WhatsApp/.test(llega.texto) && fondoLlega < 0.5, `cambio-lado: al llegar, rosa y «${llega.titulo}»`);
    ok(llega.rosa > llega.verde * 1.3 && llega.rosaX > llega.verdeX, `cambio-lado: al llegar, el icono rosa (quien compra) va delante y grande (${Math.round(llega.rosa)} px) y el verde detrás y chico (${Math.round(llega.verde)} px)`);
    await pagina.waitForTimeout(1800);
    const fin = await medir(pagina, lado);
    ok(fin.cambioLado.cambio === "despues" && /Así lo ve Tu Tienda\./.test(fin.cambioLado.titulo) && fin.fondoTienda > 0.95 && fin.tema?.toLowerCase() === fin.bosque.toLowerCase(), `cambio-lado: después, se intercambian los iconos y todo pasa a verde (${fin.cambioLado.titulo})`);
    await irAlPaso(pagina, cambio);
    await pagina.waitForTimeout(1600);
    const en = (await medir(pagina, cambio)).iconoApp;
    await irAlPaso(pagina, lado);
    await pagina.waitForTimeout(1600);
    const volviendo = await medir(pagina, lado);
    ok(volviendo.cambioLado.cambio === "antes" || volviendo.cambioLado.lado === "tienda", "cambio-lado: al volver a él desde el paso siguiente, la pantalla se ve completa");
    await irAlPaso(pagina, seguimiento);
    await pagina.waitForTimeout(1600);
    const antes = (await medir(pagina, seguimiento)).iconoApp;
    ok(rosaAntes === "rosa" && en === "verde" && antes === "rosa", `el icono de la app pasa a verde en «cambio» y, al retroceder, vuelve al rosado (${rosaAntes} → ${en} → ${antes})`);
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
  ok((await pagina.getByRole("link", { name: "Escríbenos" }).getAttribute("href")) === ENLACE_QUIERO_VENDER, "«Escríbenos» abre el Instagram de Deslizapp");
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
  ok(cierre.enlaces && cierre.otraVez === "#arriba" && cierre.sinSubtitulo, "el cierre lleva «Escríbenos», «Ver un catálogo de ejemplo», «Entrar» y «Ver la demo otra vez», sin el subtítulo de antes");
  ok(cierre.fondo === "rgb(23, 75, 58)" && cierre.tema?.replace(/\s/g, "") === cierre.fondo.replace(/\s/g, ""), `el cierre va en verde Bosque, con el theme-color igual (${cierre.tema})`);
  const cta = await pagina.getByRole("link", { name: "Escríbenos" }).boundingBox();
  ok(cta && cta.x >= 0 && cta.x + cta.width <= ancho, "los CTA caben en la pantalla");
  ok(errores.length === 0, `sin errores de la página${errores.length ? ": " + errores.join(" | ") : ""}`);
  // «Entrar» (en el cierre): la página principal, con su «Iniciar sesión».
  await pagina.locator('[data-cta="entrar"]').click();
  await pagina.waitForURL((u) => new URL(u).pathname === "/");
  await pagina.getByRole("button", { name: "Iniciar sesión", exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
  ok(await pagina.getByRole("button", { name: "Iniciar sesión", exact: true }).isVisible(), "«Entrar» lleva a la página principal, con «Iniciar sesión»");
  ok(await pagina.getByRole("button", { name: "Probar la app con datos de prueba" }).isVisible(), "y el enlace a la demo («Probar la app con datos de prueba»)");
  await contexto.close();
}

console.log("\nAl cargar directamente en un paso, se ve completo al instante");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
  for (const id of ["dolor-dm", "dolor-chats", "bienvenida", "antes", "solucion"]) {
    const pagina = await contexto.newPage();
    await pagina.goto(`${base}/conoce#paso-${id}`, { waitUntil: "domcontentloaded" });
    await pagina.waitForTimeout(450);
    const r = await pagina.evaluate((id) => {
      const e = document.querySelector(".lt-escenario");
      const op = (x) => Number(getComputedStyle(x).opacity);
      const piezas = [...e.querySelectorAll(id === "dolor-dm" || id === "dolor-chats" ? `[data-escena="${id}"] :is(.esc-msg, .esc-chat, .esc-nota)` : `[data-separador="${id}"] :is(.sp-sube, .sp-pop)`)];
      return { paso: e.dataset.paso, anima: e.dataset.anima, piezas: piezas.length, ocultas: piezas.filter((x) => op(x) < 0.95).length };
    }, id);
    ok(r.paso === id && r.piezas > 0 && r.ocultas === 0, `abrir /conoce#paso-${id}: se ve completo a los 450 ms, sin esperar a la animación (${r.ocultas} de ${r.piezas} piezas ocultas, anima ${r.anima})`);
    await pagina.close();
  }
  await contexto.close();
}

console.log("\nMovimiento reducido");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1200);
  {
    const primera = await medir(pagina, 0);
    ok(primera.burbujaVisible && primera.separadores.find(([id]) => id === "bienvenida")?.[1] > 0.99, "con movimiento reducido, la primera pantalla se ve completa desde el principio");
  }
  // (un salto largo, desde el principio, hasta el primer paso del catálogo)
  const iHola = PASOS.findIndex((p) => p.id === "hola");
  await irAlPaso(pagina, iHola);
  await pagina.waitForTimeout(400);
  const m = await medir(pagina, iHola);
  ok(m.burbujaVisible && m.nitida, "cada paso muestra su estado final al instante (burbuja completa sin animación)");
  ok(m.checks?.length === 2 && m.checks.every((c) => c.offset === 0 && c.color === "rgb(83, 189, 235)"), "con movimiento reducido, el doble check ya está completo y azul");
  // Sin ♥: llega al «aaah» del termo en su estado final, sin toques.
  for (let i = iHola + 1; i <= PASOS.findIndex((p) => p.id === "aaah-termo"); i++) {
    await irAlPaso(pagina, i);
    await pagina.waitForTimeout(500);
  }
  await pagina.waitForTimeout(1500);
  const dr = await datos(pagina);
  ok(dr.toques === "0" && dr.viajes === "0" && !(await medir(pagina, Number(dr.indice))).hiloVisible && dr.bolsa === "1", `con movimiento reducido no hay ♥ y el paso queda en su estado final (${dr.paso}, bolsa ${dr.bolsa}, toques ${dr.toques})`);
  // El cambio de lado, sin animación: se ve el estado final (verde, «Así lo ve Tu Tienda.») nada más llegar.
  await irAlPaso(pagina, 0);
  await pagina.waitForTimeout(500);
  const lado = PASOS.findIndex((p) => p.id === "cambio-lado");
  await irAlPaso(pagina, lado);
  await pagina.waitForTimeout(300);
  const cl = await medir(pagina, lado);
  ok(cl.cambioLado.cambio === null && cl.cambioLado.lado === "tienda" && /Así lo ve Tu Tienda\./.test(cl.cambioLado.titulo) && cl.fondoTienda > 0.95 && cl.cambioLado.verde > cl.cambioLado.rosa * 1.3, "con movimiento reducido, el cambio de lado se ve en su estado final, sin animación");
  await contexto.close();
}

console.log("\nSin JavaScript");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce");
  ok(await pagina.getByRole("heading", { name: "Un pedido, de principio a fin" }).isVisible(), "se entiende la propuesta (pasos con capturas)");
  ok((await pagina.locator(".landing-pasos [data-paso]").count()) === PASOS.length, "un paso por cada uno de la demo");
  {
    const texto = await pagina.locator(".landing-pasos").innerText();
    ok(/hola, esto es/.test(texto) && /Seguro esto te suena/.test(texto) && /Así lo resolvemos/.test(texto), "y presenta cada tema (bienvenida, «Seguro esto te suena» y «Así lo resolvemos»)");
    ok(/Te escriben por Instagram/.test(texto) && /Tu cliente toca el enlace de tu perfil/.test(texto) && /Así lo ve Tu Tienda\./.test(texto), "y cuenta el dolor, el enlace del perfil y el cambio de lado con texto");
    ok((await pagina.locator('.landing-pasos [data-paso="perfil"] .pt-enlace').innerText()).includes("deslizapp.com/tutienda"), "el perfil lleva el enlace deslizapp.com/tutienda");
  }
  ok(await pagina.getByRole("link", { name: "Escríbenos" }).isVisible(), "y se llega a los CTA");
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
  // Las fuentes de «Mi marca» (Google Fonts) las pide la hoja real de despacho para el comprobante: no son datos. Tampoco el script
  // de depuración de Vercel Analytics (va.vercel-scripts.com), que en modo dev carga el componente de medición: sus eventos de
  // la demo los descarta `beforeSend` (components/medicion/analitica.tsx), así que no sale nada de la demo.
  pagina.on("request", (r) => r.url().startsWith("http") && !r.url().startsWith(base) && !/fonts\.(googleapis|gstatic)\.com|va\.vercel-scripts\.com/.test(r.url()) && red.push(r.url()));
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

console.log("\nEl teléfono de la tienda no muestra las novedades de la app");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
  // Quien ya usó la app en este navegador: versión vista vieja y claves de sesión/demo.
  await contexto.addInitScript(() => {
    localStorage.setItem("deslizapp-version-vista", "0.1.0");
    localStorage.setItem("deslizapp-demo-prueba", "{}");
  });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/demo-landing/tienda", { waitUntil: "networkidle" });
  const iPedidos = PASOS.findIndex((p) => p.id === "pedidos");
  for (let i = PASOS.findIndex((p) => p.telefono === "tienda"); i <= iPedidos; i++) {
    await pagina.evaluate((i) => window.postMessage({ tipo: "dz-landing-paso", paso: i, animar: true }, location.origin), i);
    await pagina.waitForTimeout(PASOS[i].duracion + 1200);
  }
  const cuerpo = await pagina.evaluate(() => document.body.innerText);
  ok(!/lo nuevo|VERSIÓN \d/i.test(cuerpo), "sin la pantalla de novedades en el teléfono de la tienda");
  ok(/Pedidos/.test(cuerpo), "y llega al paso de Pedidos");
  ok((await pagina.evaluate(() => localStorage.getItem("deslizapp-version-vista"))) === "0.1.0", "sin tocar deslizapp-version-vista");
  await contexto.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
