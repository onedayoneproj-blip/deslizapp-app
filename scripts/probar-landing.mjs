// Uso: con la app corriendo (npm run dev o npm start), `node scripts/probar-landing.mjs [url]`.
// La landing de deslizapp.com por pasos (referencias/landing/ajustes-lewis-2.md y -3.md, docs/prompts/conoce-portada-narrativa.md) a
// 360×640, 393×852, 430×932 y 1440×900: avanzar paso a paso (el dolor de quien vende, el post, el perfil al catálogo en Instagram
// antes del catálogo, y el cambio de lado entre quien compra y la tienda; burbuja completa y sin desenfoque, que no tapa la pantalla;
// estado del teléfono: bolsa, total y código; el mockup entero y la página llenando su pantalla; el reel y la bolsa como en la app;
// el ♥ como dedo: en cada toque y en el viaje, oculto en los demás; la barra de historias de arriba y «Desliza ↑»; el fondo de cada persona), la barra lleva a cada
// capítulo, retroceder un paso, un deslizamiento fuerte no se salta pasos, «Saltar», los CTA y «Entrar»,
// movimiento reducido, sin JavaScript y que el modo demo sigue abriendo el panel. Con CAPTURAS=1 guarda una captura de cada paso
// (360×640 y 393×852, más 1440×900) en docs/capturas/conoce-recorte/ (docs/prompts/conoce-recorte-y-arreglos.md).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { PASOS, CAPITULOS, CAPITULOS_NOMBRES, estadoPaso, primerPasoDe, lineaDelCapitulo } = await import("../lib/landing/pasos.ts");
const { ENLACE_QUIERO_VENDER, ENLACE_CATALOGO_EJEMPLO } = await import("../lib/landing/enlaces.ts");

// Las pantallas sin teléfono (los separadores y el cambio de lado) y las que se dibujan dentro del de la compradora.
const SIN_TELEFONO = ["bienvenida", "antes", "solucion", "enlace", "cambio-lado"];
const verde = (p) => p.lado === "tienda" || p.lado === "inicio";
const base = process.argv[2] ?? "http://localhost:3000";
const capturas = process.env.CAPTURAS === "1";
const CARPETA_CAPTURAS = "docs/capturas/conoce-recorte";
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

// Como un enlace a un paso (#paso-…): activa ese paso exacto, sin la regla de «un deslizamiento por capítulo».
const irAlPaso = (pagina, i) => pagina.evaluate((id) => { const a = document.createElement("a"); a.href = `#paso-${id}`; document.body.append(a); a.click(); a.remove(); }, PASOS[i].id);
// Estos recorridos miden cada paso por separado: sin el avance solo (window.__dzSinAuto lo apaga). El avance por capítulos tiene su propia sección.
const sinAvance = (contexto) => contexto.addInitScript(() => { window.__dzSinAuto = true; });
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
      // El teléfono que se ve en el paso: el de la demo o, en `enlace`, el del perfil al catálogo.
      const telEl = paso.id === "enlace" ? e.querySelector(".lt-enlace") : telefono;
      const tel = telEl.getBoundingClientRect();
      const mockup = telefono.querySelector(".lt-mockup");
      const hueco = telefono.querySelector(".lt-hueco").getBoundingClientRect();
      const pagina = telefono.querySelector("iframe").getBoundingClientRect();
      const b = burbuja?.getBoundingClientRect() ?? new DOMRect();
      const segs = [...e.querySelectorAll("[data-seg]")];
      const barraEl = e.querySelector(".lt-barra");
      const barra = barraEl.getBoundingClientRect();
      const capituloEl = e.querySelector("[data-capitulo-nombre]");
      const capituloR = capituloEl.getBoundingClientRect();
      const barraTodo = { left: barra.left, right: barra.right, top: barra.top, bottom: barra.bottom };
      const saltarR = e.querySelector(".lt-saltar").getBoundingClientRect();
      const iconoR = e.querySelector(".lt-icono").getBoundingClientRect();
      const desliza = e.querySelector(".lt-desliza");
      const desR = desliza.getBoundingClientRect();
      const cruza = (a, c) => a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1;
      // Las burbujas a la vista (la del paso y las de antes que caben) y su escala (la del paso termina en 1).
      const vistas = [...e.querySelectorAll("[data-burbuja]")].filter((x) => Number(getComputedStyle(x).opacity) > 0.05);
      const escala = burbuja ? new DOMMatrix(getComputedStyle(burbuja).transform).a : 1;
      const corazon = getComputedStyle(e.querySelector(".lt-hilo-corazon path")).fill;
      return {
        burbujasCruzan: telEl && Number(getComputedStyle(telEl).opacity) > 0.99 && vistas.some((x) => cruza(x.getBoundingClientRect(), tel)),
        escalaBurbuja: escala,
        // La burbuja entera (con su hora y sus checks) cabe en su zona: ni el borde de abajo se corta (el recorte es el de .lt-burbujas).
        burbujaEntera: burbuja ? b.bottom <= e.querySelector(".lt-burbujas").getBoundingClientRect().bottom + 1 && burbuja.querySelector(".bc-hora").getBoundingClientRect().bottom <= e.querySelector(".lt-burbujas").getBoundingClientRect().bottom && b.bottom <= innerHeight : true,
        corazon,
        nitida,
        burbujaVisible: !burbuja || Number(getComputedStyle(burbuja).opacity) > 0.99,
        proporcion: tel.width / tel.height,
        proporcionMockup: mockup.naturalWidth / mockup.naturalHeight,
        llena: Math.abs(pagina.width - hueco.width) < 1.5 && Math.abs(pagina.height - hueco.height) < 1.5,
        telefonoVisible: Number(getComputedStyle(telefono).opacity) > 0.99,
        icono: Number(getComputedStyle(e.querySelector(".lt-icono")).opacity) > 0.99,
        iconoCaja: (() => { const r = e.querySelector(".lt-icono").getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, bottom: r.bottom }; })(),
        segAlto: segs.every((x) => { const h = x.getBoundingClientRect().height; return h >= 2.99 && h <= 4.01; }),
        fredoka: !burbuja || /fredoka/i.test(getComputedStyle(burbuja).fontFamily),
        resaltes: burbuja ? burbuja.querySelectorAll(".lt-resalte").length : 0,
        telefonoEncima: Number(getComputedStyle(e.querySelector(".lt-zona")).zIndex) > Number(getComputedStyle(e.querySelector(".lt-burbujas")).zIndex),
        // Lo que se monta bajo el teléfono es el borde de la burbuja, nunca sus letras.
        letrasBajoTelefono: Number(getComputedStyle(telEl).opacity) > 0.99 && vistas.some((x) => { const t = x.querySelector(".bc-texto").getBoundingClientRect(); return t.top < tel.bottom - 1 && t.right > tel.left && t.left < tel.right; }),
        // El aire de la burbuja (ajustes-lewis-11.md §1): arriba, el que se ve (del borde del teléfono, o del de la burbuja si va al
        // lado, al texto); abajo, de lo último (la última línea o la hora, si bajó a su propia línea) al borde de la burbuja.
        aire: burbuja ? (() => {
          const rango = document.createRange();
          rango.selectNodeContents(burbuja.querySelector(".bc-texto"));
          const lineas = [...rango.getClientRects()].filter((x) => x.width > 1 && x.height > 1);
          const hora = burbuja.querySelector(".bc-hora").getBoundingClientRect();
          const borde = b.top > tel.top + tel.height / 2 && b.top < tel.bottom && Number(getComputedStyle(telEl).opacity) > 0.99 ? tel.bottom : b.top;
          return { arriba: Math.min(...lineas.map((x) => x.top)) - borde, abajo: b.bottom - Math.max(hora.bottom, ...lineas.map((x) => x.bottom)) };
        })() : null,
        // El doble check: los dos trazos completos (stroke-dashoffset 0) y azules #53bdeb.
        checks: burbuja ? [...burbuja.querySelectorAll(".bc-check")].map((c) => ({ largo: c.getTotalLength(), offset: parseFloat(getComputedStyle(c).strokeDashoffset), color: getComputedStyle(c).stroke })) : null,
        // El icono de la app de arriba a la izquierda: rosado o verde (ajustes-lewis-12.md §1), y los iconos de la burbuja (§2).
        iconoApp: Number(getComputedStyle(e.querySelector(".lt-icono-verde")).opacity) > 0.99 ? "verde" : Number(getComputedStyle(e.querySelector(".lt-icono-rosa")).opacity) > 0.99 ? "rosa" : "a medias",
        iconosBurbuja: burbuja ? [...burbuja.querySelectorAll(".lt-icono-burbuja")].map((x) => ({ icono: x.dataset.iconoBurbuja, oculto: x.getAttribute("aria-hidden") === "true" && x.querySelector("svg")?.getAttribute("aria-hidden") === "true", ancho: x.getBoundingClientRect().width })) : [],
        // Cuánto se monta el borde de abajo del teléfono sobre la burbuja actual (px), cuando la burbuja va debajo (en el escritorio va al lado).
        montaje: burbuja && Number(getComputedStyle(telEl).opacity) > 0.99 && b.top > tel.top + tel.height / 2 ? tel.bottom - b.top : null,
        tema: document.querySelector('meta[name="theme-color"]')?.content,
        rosa: getComputedStyle(e).getPropertyValue("--marca-rosa-fija").trim(),
        bosque: getComputedStyle(e).getPropertyValue("--marca-bosque").trim(),
        arena: getComputedStyle(e).getPropertyValue("--color-arena").trim(),
        iconoOculto: Number(getComputedStyle(e.querySelector(".lt-icono")).opacity) < 0.05,
        fondoArena: Number(getComputedStyle(e.querySelector(".lt-fondo-arena")).opacity),
        separadores: [...e.querySelectorAll("[data-separador]")].map((x) => [x.dataset.separador, Number(getComputedStyle(x).opacity), x.textContent]),
        escenas: [...e.querySelectorAll("[data-escena]")].map((x) => [x.dataset.escena, Number(getComputedStyle(x).opacity)]),
        cambioLado: (() => {
          const c = e.querySelector("[data-cambio-lado]");
          const carta = c.querySelector(".cl-carta");
          const ola = c.querySelector(".cl-ola");
          const textos = c.querySelector(".cl-textos").getBoundingClientRect();
          const cr = carta.getBoundingClientRect();
          const visible = (x) => Number(getComputedStyle(x).opacity) > 0.99;
          const dicho = (sel) => [...c.querySelectorAll(sel)].filter(visible).map((x) => x.textContent).join("");
          return {
            visible: Number(getComputedStyle(c).opacity) > 0.99,
            mano: dicho(".cl-antes .cl-frase"),
            titulo: dicho(".cl-titulo .cl-frase"),
            texto: dicho(".cl-texto .cl-frase"),
            // el giro del teléfono (m11 de la matriz: 1 = de frente, 0 = de canto, −1 = vuelto) y la ola verde (su desplazamiento vertical)
            giro: new DOMMatrix(getComputedStyle(carta).transform).m11,
            olaY: new DOMMatrix(getComputedStyle(ola).transform).m42,
            olaAlto: ola.getBoundingClientRect().height,
            caras: { frente: getComputedStyle(c.querySelector(".cl-frente")).backfaceVisibility, dorso: getComputedStyle(c.querySelector(".cl-dorso")).backfaceVisibility, preserve: getComputedStyle(carta).transformStyle },
            panel: /Nuevo · Ana/.test(c.querySelector(".cl-dorso").textContent) && /RD\$1,500/.test(c.querySelector(".cl-dorso").textContent),
            // nada se recorta: el teléfono y el texto caben en la pantalla y no se pisan
            cabe: cr.top >= -1 && cr.bottom <= innerHeight + 1 && cr.left >= -1 && cr.right <= innerWidth + 1 && textos.bottom <= innerHeight + 1 && textos.left >= -1 && textos.right <= innerWidth + 1,
            sinPisar: cr.bottom <= textos.top + 6,
            fases: [...c.querySelectorAll(".cl-frase")].length,
            cambio: e.dataset.cambio ?? null,
            lado: e.dataset.lado,
          };
        })(),
        // La burbuja no tapa la pantalla del teléfono (2 px de margen por el redondeo).
        tapaPantalla: !!burbuja && !(b.bottom <= hueco.top + 2 || b.top >= hueco.bottom - 2 || b.right <= hueco.left + 2 || b.left >= hueco.right - 2),
        // La barra (segmentos y rótulo) no toca «Saltar», el icono, el teléfono ni las burbujas a la vista, y cabe en el ancho.
        barraChoca: { saltar: cruza(barraTodo, saltarR), icono: cruza(barraTodo, iconoR), telefono: Number(getComputedStyle(telEl).opacity) > 0.5 && cruza(barraTodo, tel), burbuja: vistas.some((x) => cruza(barraTodo, x.getBoundingClientRect())), enlace: Number(getComputedStyle(e.querySelector(".lt-enlace")).opacity) > 0.5 && cruza(barraTodo, e.querySelector(".lt-enlace .tm").getBoundingClientRect()) },
        barraDentro: barra.left >= -0.5 && barra.right <= innerWidth + 0.5 && capituloR.right <= innerWidth + 0.5,
        huecoSeg: segs.length > 1 ? segs[1].getBoundingClientRect().left - segs[0].getBoundingClientRect().right : 0,
        // El nombre del capítulo: junto al icono (misma línea, a su derecha o, donde el icono no sale, en su sitio), sin tocar «Saltar».
        capitulo: { texto: capituloEl.textContent.trim(), centroY: capituloR.top + capituloR.height / 2, izq: capituloR.left, der: capituloR.right, iconoVisible: Number(getComputedStyle(e.querySelector(".lt-icono")).opacity) > 0.5, iconoCentroY: iconoR.top + iconoR.height / 2, iconoDer: iconoR.right, bajoLaBarra: capituloR.top >= barra.bottom, tocaSaltar: cruza({ left: capituloR.left, right: capituloEl.scrollWidth + capituloR.left, top: capituloR.top, bottom: capituloR.bottom }, saltarR) },
        colorBarra: getComputedStyle(barraEl).color,
        // «Desliza ↑»: a la vista, dentro de la pantalla, sin tapar el teléfono ni las burbujas.
        desliza: { alto: desR.height, fuente: parseFloat(getComputedStyle(desliza).fontSize), centroY: desR.top + desR.height / 2, sombra: getComputedStyle(desliza).boxShadow !== "none", visible: Number(getComputedStyle(desliza).opacity) > 0.99, atributo: e.dataset.deslizaOk, dentro: desR.left >= 0 && desR.right <= innerWidth && desR.bottom <= innerHeight, choca: Number(getComputedStyle(desliza).opacity) > 0.5 && (vistas.some((x) => cruza(desR, x.getBoundingClientRect())) || (Number(getComputedStyle(telEl).opacity) > 0.5 && cruza(desR, tel)) || (Number(getComputedStyle(e.querySelector(".lt-enlace")).opacity) > 0.5 && cruza(desR, e.querySelector(".lt-enlace .tm").getBoundingClientRect()))), burbujaCentroY: burbuja ? b.top + b.height / 2 : null, rebote: desliza.querySelector("svg").getAnimations().filter((a) => a.playState === "running").length },
        // La solución: «¿precio?» y «¿cuál era?» no quedan detrás del icono.
        solucion: (() => { const s = e.querySelector(".sp-solucion"); const ic = s.querySelector(".sp-icono").getBoundingClientRect(); return [...s.querySelectorAll(".sp-tachada")].map((n) => cruza(n.getBoundingClientRect(), ic)); })(),
        barraVisible: barra.width > 100 && Number(getComputedStyle(barraEl).opacity) > 0.5,
        segEstados: segs.map((g) => [Number(g.dataset.seg), g.dataset.estado]),
        llenado: segs.map((g) => new DOMMatrix(getComputedStyle(g.querySelector("i")).transform).a),
        etiquetas: segs.every((g) => g.getAttribute("aria-label")),
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
  await sinAvance(contexto);
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
    ok(bienvenida && bienvenida[1] > 0.99 && /deslizapp/.test(bienvenida[2]) && primera.barraVisible && primera.fondoTienda > 0.95 && primera.iconoOculto && !primera.telefonoVisible, "la primera pantalla ya está completa al abrir, sin hacer scroll: la bienvenida con «deslizapp» sobre Bosque y el índice (sin el icono pequeño)");
    ok(!(await pagina.evaluate(() => !!document.querySelector("video, [data-portada], [data-desliza], [data-bloqueo]"))), "ya no hay video de portada, «Desliza y mira» ni teléfono bloqueado");
  }

  // Hacia delante, paso a paso.
  const textos = [];
  for (let i = 0; i < PASOS.length; i++) {
    const paso = PASOS[i];
    const antes = await datos(pagina);
    const linea = lineaDelCapitulo(paso.capitulo);
    const k = linea.pasos.indexOf(i);
    const ultimoDelCapitulo = k === linea.pasos.length - 1;
    if (i > 0) await irAlPaso(pagina, i);
    // Mientras dura el paso: ¿se ve el ♥ en algún momento?
    let vioHilo = false;
    let dosCorazones = false;
    let tarde = false;
    let primeraMuestra = null;
    let noAlLlegar = false;
    let antesDeTiempo = false;
    const t0 = Date.now();
    for (const fin = Date.now() + paso.duracion + 1400; Date.now() < fin; ) {
      const v = await pagina.evaluate(({ cap }) => {
        const hilo = Number(getComputedStyle(document.querySelector(".lt-hilo-dentro")).opacity) > 0.05;
        const burst = document.querySelector('iframe[data-telefono="compradora"]').contentDocument.querySelector(".burst.go");
        const llenado = new DOMMatrix(getComputedStyle(document.querySelector(`[data-seg="${cap}"] i`)).transform).a;
        return { llenado, desliza: document.querySelector(".lt-escenario").dataset.deslizaOk, hilo: document.querySelector("[data-hilo]").dataset.visible === "si", dos: hilo && !!burst && burst.getAnimations({ subtree: true }).some((a) => a.playState === "running") };
      }, { i, cap: paso.capitulo - 1 });
      primeraMuestra ??= v;
      const t = Date.now() - t0;
      if (t < 500) noAlLlegar ||= v.desliza === "no";
      if (t > 500 && t < paso.duracion - 400 && v.desliza === "si") antesDeTiempo = true;
      if (t > 500) tarde ||= v.desliza === "si";
      vioHilo ||= v.hilo;
      dosCorazones ||= v.dos;
      await pagina.waitForTimeout(60);
    }
    const d = await datos(pagina);
    const esperado = estadoPaso(i);
    ok(d.paso === paso.id && Number(d.bolsa) === esperado.bolsa && Number(d.total) === esperado.total && (d.codigo === "si") === esperado.codigoVisible, `${paso.id}: bolsa ${d.bolsa}, total ${d.total}, código ${d.codigo}`);
    const m = await medir(pagina, i);
    ok(m.burbujaVisible && m.nitida && !(m.telefonoVisible && m.tapaPantalla && !m.telefonoEncima), `${paso.id}: la burbuja está completa, sin desenfoque y sin tapar la pantalla (lo que se monta queda debajo del teléfono)`);
    // La barra de historias: un segmento por capítulo; los de antes, llenos; los de después, vacíos; el del capítulo se llena a lo largo de sus
    // pasos (al llegar al paso, por donde le toca; al terminar su animación, al menos hasta ahí).
    const aqui = (linea.inicios[k] + paso.duracion) / linea.total;
    const alLlegar = linea.inicios[k] / linea.total;
    ok(
      m.segEstados.length === CAPITULOS && m.etiquetas && m.segEstados.every(([j, g]) => g === (j === paso.capitulo - 1 ? "llenando" : j < paso.capitulo - 1 ? "lleno" : "vacio")) && m.llenado.every((f, j) => (j < paso.capitulo - 1 ? f > 0.99 : j > paso.capitulo - 1 ? f < 0.01 : f >= aqui - 0.08)),
      `${paso.id}: la barra (${m.segEstados.length} segmentos, uno por capítulo) tiene llenos los de antes, vacíos los de después y el de «${CAPITULOS_NOMBRES[paso.capitulo - 1]}» lleno al menos hasta ${Math.round(aqui * 100)} %`,
    );
    if (primeraMuestra) ok(primeraMuestra.llenado <= alLlegar + 0.1, `${paso.id}: al llegar, el segmento del capítulo va por ${Math.round(alLlegar * 100)} % (${primeraMuestra.llenado.toFixed(2)})`);
    // El nombre del capítulo, junto al icono de la app: en la misma línea, a su derecha (donde el icono no sale, en su sitio), no bajo la barra.
    {
      const c = m.capitulo;
      ok(c.texto === CAPITULOS_NOMBRES[paso.capitulo - 1] && Math.abs(c.centroY - c.iconoCentroY) < 3 && (!c.iconoVisible || c.izq >= c.iconoDer) && !c.tocaSaltar, `${paso.id}: el capítulo («${c.texto}») va en la línea del icono, a su lado, sin tocar «Saltar»`);
    }
    // «Desliza ↑»: solo al terminar el último paso de un capítulo (y no en el último de todos); al llegar no está.
    if (i > 0) ok(noAlLlegar, `${paso.id}: «Desliza» se va al llegar`);
    if (ultimoDelCapitulo && i !== PASOS.length - 1) {
      ok(!antesDeTiempo && m.desliza.visible && m.desliza.dentro, `${paso.id}: último paso del capítulo: al terminar su animación sale «Desliza ↑», dentro de la pantalla`);
      ok(m.desliza.alto === 48 && m.desliza.fuente === 17 && m.desliza.sombra, `${paso.id}: «Desliza ↑» mide 48 px de alto, letra de 17 px, con sombra`);
      if (ancho < 900 && m.desliza.burbujaCentroY !== null) ok(Math.abs(m.desliza.centroY - m.desliza.burbujaCentroY) <= 24, `${paso.id}: «Desliza ↑» va a media altura de la burbuja (${Math.round(m.desliza.centroY)} y ${Math.round(m.desliza.burbujaCentroY)})`);
    } else ok(!tarde && !m.desliza.visible, `${paso.id}: ${i === PASOS.length - 1 ? "el último paso no lleva «Desliza»" : "en medio de un capítulo no sale «Desliza» (el paso siguiente entra solo)"}`);
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
    ok(!m.letrasBajoTelefono && m.telefonoEncima, `${paso.id}: el teléfono va por encima de las burbujas y no tapa sus letras`);
    ok(m.segAlto && Math.abs(m.huecoSeg - 3) < 0.6, `${paso.id}: los segmentos miden 3–4 px de alto, con huecos de 3 px (${m.huecoSeg.toFixed(1)})`);
    ok(!m.barraChoca.saltar && !m.barraChoca.icono && !m.barraChoca.telefono && !m.barraChoca.burbuja && !m.barraChoca.enlace && m.barraDentro, `${paso.id}: la barra y su rótulo no tocan «Saltar», el icono, el teléfono ni las burbujas, y caben en el ancho (${JSON.stringify(m.barraChoca)})`);
    { const [r, g] = m.colorBarra.match(/\d+/g).map(Number); ok(verde(paso) ? r > 200 : r < 80 && g < 120, `${paso.id}: el color de la barra se adapta al fondo (${m.colorBarra})`); }
    if (paso.id === "solucion") ok(m.solucion.length === 2 && m.solucion.every((c) => !c), "solucion: «¿precio?» y «¿cuál era?» no quedan detrás del icono");
    if (paso.burbuja) ok(m.fredoka && m.resaltes === (paso.burbuja.resalta?.length ?? 0), `${paso.id}: la burbuja va en Fredoka con ${m.resaltes} palabra(s) en color de marca`);
    const temaEsperado = verde(paso) ? m.bosque : paso.lado === "antes" ? m.arena : m.rosa;
    ok(m.tema && m.tema.toLowerCase() === temaEsperado.toLowerCase(), `${paso.id}: theme-color del capítulo (${m.tema})`);
    ok(Math.abs(m.escalaBurbuja - 1) < 0.01, `${paso.id}: la burbuja del paso termina a escala 1`);
    ok(m.corazon === "rgb(255, 131, 79)", `${paso.id}: el ♥ es mandarina #ff834f (${m.corazon})`);
      ok(m.iconoCaja.left < 40 && m.iconoCaja.top < 80 && m.iconoCaja.w >= 36 && m.iconoCaja.w <= 44, `${paso.id}: el icono, arriba a la izquierda (${Math.round(m.iconoCaja.w)} px)`);
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
        const TEXTOS = { bienvenida: ["hola, esto es", "deslizapp", "En un minuto te enseñamos cómo vender sin tanta vuelta."], antes: ["antes de empezar…", "Seguro esto", "te suena.", "Así se vende hoy por Instagram y WhatsApp.", "¿precio?", "¿lo tienes en negro?", "📷 foto", "¿y el envío?", "¿cuál era? 😅"], solucion: ["ahora, con Deslizapp…", "Así lo", "resolvemos.", "Tu catálogo enseña fotos, precios y lo que te queda en stock. A ti te llega el pedido listo.", "¿precio?", "¿cuál era?"] };
        const mio = m.separadores.find(([id]) => id === paso.id);
        ok(m.separadores.every(([id, op]) => (id === paso.id ? op > 0.99 : op < 0.05)) && !m.telefonoVisible, `${paso.id}: se ve su separador, solo, sin teléfono`);
        ok(TEXTOS[paso.id].every((t) => mio[2].replace(/\s+/g, " ").includes(t.replace(/\s+/g, " ")) || mio[2].includes(t)), `${paso.id}: lleva sus textos tal cual`);
      }
      if (paso.id === "cambio-lado") {
        const c = m.cambioLado;
        ok(!m.telefonoVisible && c.visible, "cambio-lado: pantalla propia, sin el teléfono de la demo");
        ok(c.cambio === "despues" && c.lado === "tienda" && /Así lo ve Tu Tienda\./.test(c.titulo) && /El pedido te llega completo: qué quiere, cuánto y a quién se lo mandas\./.test(c.texto) && /y del otro lado/.test(c.mano), `cambio-lado: al terminar, «${c.titulo}» y su texto (${c.cambio}, lado ${c.lado})`);
        ok(c.giro < -0.99 && Math.abs(c.olaY) < 1 && c.panel, `cambio-lado: al terminar, el teléfono dio la vuelta (el panel de Tu Tienda con «Nuevo · Ana» a la vista) y la ola verde cubre el fondo (giro ${c.giro.toFixed(2)})`);
        ok(c.caras.frente === "hidden" && c.caras.dorso === "hidden" && c.caras.preserve === "preserve-3d", "cambio-lado: las dos caras con backface-visibility hidden y el teléfono en 3D");
        ok(c.cabe && c.sinPisar, `cambio-lado: el teléfono y el texto caben en la pantalla sin recortarse ni pisarse`);
      }
      if (paso.escena === "dolor-dm") ok(/precio de este/.test(await pagina.evaluate(() => document.querySelector('[data-escena="dolor-dm"]').textContent)) && /Escríbeme al WhatsApp/.test(await pagina.evaluate(() => document.querySelector('[data-escena="dolor-dm"]').textContent)), "dolor-dm: el mensaje directo trae «¿precio?» y la tienda contestando «escríbeme al WhatsApp»");
      if (paso.id === "enlace") {
        // Del perfil al catálogo: su propio teléfono, una sola pasada, y se queda en el catálogo abierto (con el «aaah» ya dado).
        const n = await pagina.evaluate(() => {
          const e = document.querySelector(".lt-escenario");
          const pc = e.querySelector(".lt-enlace .pc");
          const anims = pc.getAnimations({ subtree: true });
          return {
            visible: Number(getComputedStyle(e.querySelector(".lt-enlace")).opacity) > 0.99,
            enBucle: anims.some((a) => a.effect.getComputedTiming().iterations !== 1),
            corriendo: anims.filter((a) => a.playState === "running").length,
            final: Number(getComputedStyle(pc.querySelector(".pc-final")).opacity),
            telefono: Number(getComputedStyle(pc).opacity),
            sinZoom: getComputedStyle(pc).transform === "none" || new DOMMatrix(getComputedStyle(pc).transform).a === 1,
            enlace: pc.querySelector(".pt-enlace")?.textContent ?? "",
          };
        });
        ok(n.visible && n.telefono > 0.99 && n.final > 0.99 && n.sinZoom, "enlace: al terminar se queda en el catálogo abierto (con su like), el teléfono entero y a la vista");
        ok(!n.enBucle && n.corriendo === 0, `enlace: corre una sola vez (sin bucle, ${n.corriendo} animaciones en marcha al terminar)`);
        ok(n.enlace.includes("deslizapp.com/tutienda"), "enlace: el perfil lleva el enlace deslizapp.com/tutienda");
      }
    // El ♥ es el dedo: aparece en cada toque y en el viaje, y en los demás pasos no se ve. Al terminar el paso ya se fue.
    const toques = Number(d.toques) - Number(antes.toques);
    const viajes = Number(d.viajes) - Number(antes.viajes);
    if (paso.dedo === "no" || i === 0) ok(!vioHilo && toques === 0 && viajes === 0, `${paso.id}: sin toque ni viaje, el ♥ no se ve`);
    else if (paso.dedo === "toque") ok(vioHilo && toques === paso.fases, `${paso.id}: el ♥ marca ${toques} toque(s), uno por toque previsto (${paso.fases})`);
    else ok(vioHilo && viajes === 1, `${paso.id}: el ♥ cruza al otro teléfono y se va`);
    ok(!m.hiloVisible, `${paso.id}: al terminar, el ♥ ya no está`);
    if (paso.id === "aaah") {
      // Los dos likes reales, como en la app (ajustes-lewis-5.md): burst, «EN TU PEDIDO», el globito de la bolsa, el mensaje de la tienda
      // y la barra «Enviar». Y nunca dos corazones a la vez (el del dedo ya se fue cuando sale el del burst).
      const like = await pagina.evaluate(() => {
        const doc = document.querySelector('iframe[data-telefono="compradora"]').contentDocument;
        const de = (slug) => {
          const r = doc.querySelector(`#r-${slug}`);
          return { lleno: r.querySelector("[data-like]")?.getAttribute("aria-pressed") === "true", sello: /en tu pedido/i.test(r.querySelector(".inbadge")?.textContent ?? "") };
        };
        return {
          termo: de("termo"),
          tote: de("tote"),
          burst: !!doc.querySelector("#r-tote .burst.go"),
          globito: doc.querySelector("#bagDock .cnt")?.textContent?.trim(),
          barra: !!doc.querySelector("#cartbar") && /Enviar/.test(doc.querySelector("#cartbar").textContent),
          mensaje: /buena elección|se ve precioso/i.test(doc.querySelector("#cartbar")?.textContent ?? ""),
        };
      });
      ok(like.termo.lleno && like.termo.sello && like.tote.lleno && like.tote.sello && like.burst && like.globito === String(estadoPaso(i).bolsa) && like.barra && like.mensaje, `aaah: los dos likes reales — ♥ relleno y «EN TU PEDIDO» en el termo y el tote, burst, globito ${like.globito}, mensaje de la tienda y barra «Enviar»`);
      ok(!dosCorazones, "aaah: no se ven dos corazones a la vez");
      // El mensaje de la tienda va arriba: no tapa el nombre, el precio ni la descripción del producto.
      const aviso = await pagina.evaluate(() => {
        const doc = document.querySelector('iframe[data-telefono="compradora"]').contentDocument;
        const chat = doc.querySelector("#cartbar .chat")?.getBoundingClientRect();
        const cap = doc.querySelector(".reel.on .cap").getBoundingClientRect();
        return chat ? { choca: chat.left < cap.right && chat.right > cap.left && chat.top < cap.bottom && chat.bottom > cap.top } : null;
      });
      ok(aviso && !aviso.choca, "aaah: el mensaje de la tienda no tapa el nombre del producto ni su descripción");
    }
    if (paso.id === "hola") {
      // Se abre en la gorra y, un momento después, la pasa: llega al termo. El reel mide y queda como en el catálogo real; la bolsa, junto
      // a «Compartir» (ajustes-lewis-3.md §1).
      const r = await pagina.evaluate(() => {
        const doc = document.querySelector('iframe[data-telefono="compradora"]').contentDocument;
        const caja = (el) => el.getBoundingClientRect();
        const reel = caja(doc.querySelector(".reel.on"));
        const compartir = caja([...doc.querySelectorAll(".reel.on button")].find((b) => /Compartir/.test(b.textContent)));
        const bolsa = caja(doc.querySelector("#bagDock button"));
        const ancho = doc.documentElement.clientWidth;
        return { actual: doc.querySelector(".reel.on").id, alto: reel.height, ancho, arriba: reel.top, margen: parseFloat(doc.documentElement.style.scrollPaddingTop), hueco: bolsa.top - compartir.bottom, abajo: reel.bottom - bolsa.bottom };
      });
      ok(r.actual === "r-termo", `hola: la gorra pasa y el catálogo llega al termo (${r.actual})`);
      ok(Math.abs(r.alto - Math.min(r.ancho * 1.25, 760)) < 1.5 && Math.abs(r.arriba - r.margen) < 1.5, `hola: la tarjeta del reel mide como en la app (${Math.round(r.alto)} px) y queda bajo la cabecera`);
      ok(r.hueco >= 0 && r.hueco <= 24 && r.abajo >= 0 && r.abajo <= 20, `hola: la bolsa queda junto a «Compartir» (a ${Math.round(r.hueco)} px), al pie de la tarjeta`);
    }
    textos.push(await pagina.evaluate(() => [document, ...[...document.querySelectorAll("iframe")].map((f) => f.contentDocument)].map((d) => d?.body?.innerText ?? "").join("\n")));
    ok(verde(paso) ? m.fondoTienda > 0.95 : m.fondoTienda < 0.05, `${paso.id}: fondo ${verde(paso) ? "Bosque (verde)" : paso.lado === "antes" ? "arena" : "rosa"}`);
    if (paso.lado === "antes") ok(m.fondoArena > 0.95, `${paso.id}: el fondo arena, sin color de marca`);
    if (capturas && [360, 393].includes(ancho)) {
      mkdirSync(CARPETA_CAPTURAS, { recursive: true });
      await pagina.screenshot({ path: `${CARPETA_CAPTURAS}/${String(i + 1).padStart(2, "0")}-${paso.id}-${ancho}x${alto}.png` });
    }
  }
  {
    const todo = textos.join("\n");
    ok(!/La Vuelta|la-vuelta|Brisa|Vuelta Store/.test(todo) && /Tu Tienda/.test(todo), "la tienda de la demo es «Tu Tienda»: ni «La Vuelta», ni «Brisa», ni «Vuelta Store» en la landing ni en los teléfonos");
  }
  // La barra: tocar un segmento lleva a su paso.
  for (const j of [CAPITULOS - 2, CAPITULOS - 4]) {
    await pagina.locator(`[data-seg="${j}"]`).click();
    await pagina.waitForTimeout(1600);
    const dc = await datos(pagina);
    ok(dc.paso === PASOS[primerPasoDe(j + 1)].id, `la barra: el segmento de «${CAPITULOS_NOMBRES[j]}» lleva a su primer paso («${dc.paso}»)`);
  }
  // El cambio de lado (docs/prompts/conoce-portada-narrativa.md): al llegar, rosa y «Pidió en segundos.»; un momento después, los iconos se
  // intercambian y todo pasa a verde. Al retroceder, el icono de la app vuelve al rosado.
  {
    const lado = PASOS.findIndex((p) => p.id === "cambio-lado");
    const siguiente = PASOS.findIndex((p) => p.id === "aviso");
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
    ok(llega.cambio === "antes" && llega.lado === "compras" && /Pidió en segundos\./.test(llega.titulo) && /así lo vio quien compra/.test(llega.mano) && /le dio aaah y te mandó el pedido por WhatsApp/.test(llega.texto) && fondoLlega < 0.5, `cambio-lado: al llegar, rosa y «${llega.titulo}»`);
    ok(llega.giro > 0.99 && llega.olaY > llega.olaAlto * 0.9 && llega.panel, `cambio-lado: al llegar, el teléfono de frente (catálogo de quien compra) y la ola verde todavía abajo (giro ${llega.giro.toFixed(2)})`);
    // A la mitad del giro (~1,6 s después de llegar): el teléfono de canto y la ola a medio subir.
    await pagina.waitForTimeout(1000);
    const mitad = (await medir(pagina, lado)).cambioLado;
    ok(Math.abs(mitad.giro) < 0.85 && mitad.olaY > 0 && mitad.olaY < mitad.olaAlto * 0.95, `cambio-lado: a la mitad, el teléfono gira (${mitad.giro.toFixed(2)}) y la ola sube (${Math.round(mitad.olaY)} de ${Math.round(mitad.olaAlto)} px)`);
    await pagina.waitForTimeout(2900);
    const fin = await medir(pagina, lado);
    ok(fin.cambioLado.cambio === "despues" && /Así lo ve Tu Tienda\./.test(fin.cambioLado.titulo) && fin.cambioLado.giro < -0.99 && Math.abs(fin.cambioLado.olaY) < 1 && fin.fondoTienda > 0.95 && fin.tema?.toLowerCase() === fin.bosque.toLowerCase(), `cambio-lado: después, el teléfono dio la vuelta, la ola cubre el fondo y todo pasa a verde (${fin.cambioLado.titulo})`);
    await irAlPaso(pagina, siguiente);
    await pagina.waitForTimeout(1600);
    const en = (await medir(pagina, siguiente)).iconoApp;
    await irAlPaso(pagina, lado);
    await pagina.waitForTimeout(650);
    const vuelve = (await medir(pagina, lado)).cambioLado;
    ok(vuelve.cambio === "antes" && vuelve.giro > 0.99 && vuelve.olaY > vuelve.olaAlto * 0.9 && /Pidió en segundos\./.test(vuelve.titulo), "cambio-lado: al volver a él desde el paso siguiente se repite limpio (el teléfono de frente y la ola abajo, otra vez)");
    await pagina.waitForTimeout(4200);
    const vuelto = (await medir(pagina, lado)).cambioLado;
    ok(vuelto.giro < -0.99 && Math.abs(vuelto.olaY) < 1 && /Así lo ve Tu Tienda\./.test(vuelto.titulo), "cambio-lado: y termina completo, sin quedarse a medias");
    await irAlPaso(pagina, seguimiento);
    await pagina.waitForTimeout(1600);
    const antes = (await medir(pagina, seguimiento)).iconoApp;
    ok(rosaAntes === "rosa" && en === "verde" && antes === "rosa", `el icono de la app pasa a verde en «aviso» y, al retroceder, vuelve al rosado (${rosaAntes} → ${en} → ${antes})`);
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
  ok(ma.segEstados[CAPITULOS - 1][1] === "llenando" && ma.llenado.slice(0, CAPITULOS - 1).every((f) => f > 0.99), "al volver atrás, los segmentos de los capítulos de antes siguen llenos y el del capítulo, llenándose");
  ok(atras.paso === PASOS[PASOS.length - 2].id && ma.burbujaVisible && quitada, `al subir, vuelve a «${atras.paso}» con su burbuja completa y la del paso de después se quita`);

  // Volver de `aaah` a `hola` deshace los dos likes y el catálogo vuelve al termo, sin saltos.
  {
    const iAaah = PASOS.findIndex((p) => p.id === "aaah");
    await irAlPaso(pagina, 0);
    await pagina.waitForTimeout(1500);
    for (let j = 1; j <= iAaah; j++) {
      await irAlPaso(pagina, j);
      await pagina.waitForTimeout(j >= iAaah - 1 ? PASOS[j].duracion + 600 : 500);
    }
    await irAlPaso(pagina, iAaah - 1);
    await pagina.waitForTimeout(3200);
    const v = await pagina.evaluate(() => {
      const doc = document.querySelector('iframe[data-telefono="compradora"]').contentDocument;
      const lleno = (s) => doc.querySelector(`#r-${s} [data-like]`)?.getAttribute("aria-pressed") === "true";
      return { paso: document.querySelector(".lt-escenario").dataset.paso, termo: lleno("termo"), tote: lleno("tote"), actual: doc.querySelector(".reel.on")?.id, globito: doc.querySelector("#bagDock .cnt")?.textContent?.trim() ?? "", barra: !!doc.querySelector("#cartbar") };
    });
    ok(v.paso === "hola" && !v.termo && !v.tote && v.actual === "r-termo" && !v.barra && (v.globito === "" || v.globito === "0"), `al volver de aaah a hola se deshacen los likes y el catálogo vuelve al termo (${JSON.stringify(v)})`);
  }

  // Un deslizamiento fuerte no se salta pasos (scroll-snap-stop: always).
  await irAlPaso(pagina, 0);
  await pagina.waitForTimeout(1500);
  await pagina.mouse.move(ancho / 2, alto / 2);
  await pagina.mouse.wheel(0, alto * 3);
  await pagina.waitForTimeout(1600);
  const fuerte = await datos(pagina);
  ok(fuerte.indice === String(primerPasoDe(2)), `un deslizamiento fuerte avanza un solo capítulo, al primer paso del siguiente (llegó a ${fuerte.paso})`);

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

console.log("\nAvance por capítulos (docs de Planning del 17 oct: un segmento y un deslizamiento por capítulo)");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 }, hasTouch: false });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pagina.waitForTimeout(800);
  const estado = () => pagina.evaluate(() => { const e = document.querySelector(".lt-escenario"); return { paso: e.dataset.paso, pausa: e.dataset.pausa, desliza: e.dataset.deslizaOk }; });
  const cap1 = lineaDelCapitulo(1);
  // 1. Dentro del capítulo, los pasos avanzan solos: al acabar la animación y el tiempo de leer, entra el siguiente (con los mismos tiempos de lineaDelCapitulo).
  const t0 = Date.now();
  ok((await estado()).paso === "bienvenida", "al abrir, el primer paso del primer capítulo");
  // (el avance empezó al cargar, un poco antes de t0: los márgenes lo cubren)
  await pagina.waitForTimeout(Math.max(0, t0 + cap1.inicios[1] - 3000 - Date.now()));
  ok((await estado()).paso === "bienvenida", `«bienvenida» sigue a los ${Math.round((cap1.inicios[1] - 3000) / 100) / 10} s (se deja leer)`);
  await pagina.waitForTimeout(Math.max(0, t0 + cap1.inicios[1] + 900 - Date.now()));
  ok((await estado()).paso === "antes", "después de su animación y su lectura, entra «antes» solo");
  // 2. Tocar la pantalla pausa el avance; volver a tocar lo reanuda.
  await pagina.mouse.click(196, 400);
  const pausado = await estado();
  const sombra = await pagina.evaluate(() => document.querySelector('[data-seg="0"] i').getAnimations().map((a) => a.playState));
  ok(pausado.pausa === "si" && sombra.every((x) => x === "paused"), "tocar la pantalla pausa el avance y el llenado de la barra");
  await pagina.waitForTimeout(cap1.inicios[2] - cap1.inicios[1] + 1500);
  ok((await estado()).paso === "antes", "en pausa no avanza (pasó más de lo que dura el paso)");
  await pagina.mouse.click(196, 400);
  ok((await estado()).pausa === "no", "tocar otra vez lo reanuda");
  await pagina.waitForTimeout(2500);
  // 3. Un deslizamiento hacia delante salta al primer paso del capítulo siguiente, aunque falten pasos del actual.
  await pagina.mouse.move(196, 400);
  await pagina.mouse.wheel(0, 852);
  await pagina.waitForTimeout(1500);
  ok((await estado()).paso === PASOS[primerPasoDe(2)].id, `deslizar salta al primer paso del capítulo siguiente («${(await estado()).paso}»)`);
  // 4. Hacia atrás: con el capítulo apenas empezado, al inicio del anterior; si ya lleva un rato, reinicia el actual.
  await pagina.waitForTimeout(2800);
  await pagina.mouse.wheel(0, -852);
  await pagina.waitForTimeout(900);
  const reinicia = await pagina.evaluate(() => ({ paso: document.querySelector(".lt-escenario").dataset.paso, vacio: new DOMMatrix(getComputedStyle(document.querySelector('[data-seg="1"] i')).transform).a < 0.2 }));
  ok(reinicia.paso === PASOS[primerPasoDe(2)].id && reinicia.vacio, "hacia atrás, con un rato en el capítulo, vuelve al inicio del actual y su segmento empieza de nuevo");
  await pagina.mouse.wheel(0, -852);
  await pagina.waitForTimeout(1200);
  ok((await estado()).paso === PASOS[primerPasoDe(1)].id, `hacia atrás otra vez, recién vuelto, al inicio del capítulo anterior («${(await estado()).paso}»)`);
  // 5. «Desliza ↑»: en el último paso del capítulo, al terminar; y se va en cuanto se desliza. (Capítulo «Sigue»: un solo paso.)
  await irAlPaso(pagina, primerPasoDe(5));
  await pagina.waitForTimeout(800);
  ok((await estado()).desliza === "no", "al llegar al último paso del capítulo, «Desliza» todavía no está");
  await pagina.waitForTimeout(lineaDelCapitulo(5).total + 600);
  ok((await estado()).desliza === "si", "al terminar su animación, sale «Desliza ↑»");
  await pagina.mouse.wheel(0, 852);
  await pagina.waitForTimeout(500);
  const despues = await estado();
  ok(despues.desliza === "no" && despues.paso === PASOS[primerPasoDe(6)].id, `se va en cuanto se desliza y entra el capítulo siguiente («${despues.paso}»)`);
  // 6. En el último capítulo, deslizar lleva al cierre.
  await irAlPaso(pagina, primerPasoDe(CAPITULOS));
  await pagina.waitForTimeout(1800);
  await pagina.mouse.wheel(0, 852);
  await pagina.waitForTimeout(1200);
  ok(await pagina.locator("#cierre").evaluate((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }), "en el último capítulo, deslizar lleva al cierre");
  // 7. El ancla de un paso (también a mitad de un capítulo) lo muestra, y el avance sigue desde ahí.
  await pagina.goto(base + "/conoce#paso-aviso", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(800);
  ok((await estado()).paso === "aviso", "la URL de un paso a mitad de capítulo (#paso-aviso) muestra ese paso");
  const seguiria = lineaDelCapitulo(6).inicios[2] - lineaDelCapitulo(6).inicios[1] + 800;
  await pagina.waitForTimeout(seguiria);
  ok((await estado()).paso === "chat-tienda", "y desde ahí el avance sigue al paso siguiente del capítulo");
  await contexto.close();
}
{
  // Con movimiento reducido no hay avance solo: cada paso pide su deslizamiento.
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: "reduce" });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(800);
  await pagina.waitForTimeout(lineaDelCapitulo(1).inicios[1] + 2500);
  ok((await datos(pagina)).paso === "bienvenida", "con movimiento reducido, el paso no avanza solo");
  await pagina.mouse.move(196, 400);
  await pagina.mouse.wheel(0, 852);
  await pagina.waitForTimeout(1200);
  ok((await datos(pagina)).paso === "antes", "y cada deslizamiento avanza un paso, como antes");
  await contexto.close();
}

console.log("\nAl cargar directamente en un paso, se ve completo al instante");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
  for (const id of ["dolor-dm", "dolor-chats", "bienvenida", "antes", "solucion", "enlace"]) {
    const pagina = await contexto.newPage();
    await pagina.goto(`${base}/conoce#paso-${id}`, { waitUntil: "domcontentloaded" });
    await pagina.waitForTimeout(id === "enlace" ? 1200 : 450);
    if (id === "enlace") {
      // Al entrar directo, el perfil al catálogo se ve en su final (catálogo abierto, con su like) y no empieza la línea de 11 s.
      const r = await pagina.evaluate(() => {
        const e = document.querySelector(".lt-escenario");
        const pc = e.querySelector(".lt-enlace .pc");
        return { paso: e.dataset.paso, anima: e.dataset.anima, final: Number(getComputedStyle(pc.querySelector(".pc-final")).opacity), corriendo: pc.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length };
      });
      ok(r.paso === "enlace" && r.anima !== "si" && r.final > 0.99 && r.corriendo === 0, `abrir /conoce#paso-enlace: se ve el catálogo abierto al instante, sin animación (anima ${r.anima}, ${r.corriendo} animaciones)`);
      await pagina.close();
      continue;
    }
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
  await pagina.waitForTimeout(500);
  {
    const r = await medir(pagina, iHola);
    ok(r.segEstados[PASOS[iHola].capitulo - 1][1] === "parcial" && r.desliza.visible && r.desliza.rebote === 0, "con movimiento reducido, la barra no se anima (el capítulo va lleno a la medida de sus pasos), y «Desliza ↑» sale enseguida y sin rebote");
  }
  // Sin ♥: llega al «aaah» en su estado final, sin toques.
  for (let i = iHola + 1; i <= PASOS.findIndex((p) => p.id === "aaah"); i++) {
    await irAlPaso(pagina, i);
    await pagina.waitForTimeout(500);
  }
  await pagina.waitForTimeout(1500);
  const dr = await datos(pagina);
  ok(dr.toques === "0" && dr.viajes === "0" && !(await medir(pagina, Number(dr.indice))).hiloVisible && dr.bolsa === "2", `con movimiento reducido no hay ♥ y el paso queda en su estado final (${dr.paso}, bolsa ${dr.bolsa}, toques ${dr.toques})`);
  // El cambio de lado, sin animación: se ve el estado final (verde, «Así lo ve Tu Tienda.») nada más llegar.
  await irAlPaso(pagina, 0);
  await pagina.waitForTimeout(500);
  const lado = PASOS.findIndex((p) => p.id === "cambio-lado");
  await irAlPaso(pagina, lado);
  await pagina.waitForTimeout(300);
  const cl = await medir(pagina, lado);
  ok(cl.cambioLado.cambio === null && cl.cambioLado.lado === "tienda" && /Así lo ve Tu Tienda\./.test(cl.cambioLado.titulo) && cl.fondoTienda > 0.95 && cl.cambioLado.giro < -0.99 && Math.abs(cl.cambioLado.olaY) < 1 && cl.cambioLado.panel, "con movimiento reducido, el cambio de lado se ve en su estado final (fondo verde, panel de la tienda y texto nuevo), sin giro ni ola");
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
    ok(/Te escriben por Instagram/.test(texto) && /Tu cliente toca el link de tu bio/.test(texto) && /Así lo ve Tu Tienda\./.test(texto), "y cuenta el dolor, el enlace del perfil y el cambio de lado con texto");
    ok((await pagina.locator('.landing-pasos [data-paso="enlace"] .pt-enlace').innerText()).includes("deslizapp.com/tutienda"), "el perfil lleva el enlace deslizapp.com/tutienda");
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
