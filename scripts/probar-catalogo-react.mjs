// Solo demo; WhatsApp se intercepta y jamás envía. Fixtures y cambios de stock quedan en ese contexto aislado.
import "../tests/cargar-ts.mjs";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { navegador, URL, playwright } from "./navegador-catalogo.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const resultados = [];
const caps = process.env.CAPTURAS ?? "docs/capturas/catalogo-react/recorridos";
const recibos = [];
mkdirSync(caps, { recursive: true });
const CLAVE = "deslizapp-demo-v5";
const base = construirDesdeSeed();
base.promos = [];
base.avisos = [];
const t = base.tiendas.find((t) => t.slug === "esencias-michel");
const mayar = base.productos.find(
  (p) => p.tiendaId === t.id && p.slug === "mayar",
);
mayar.medios = [
  mayar.medios[0],
  { tipo: "foto", url: "/tienda/michel-majestic.jpg", retocada: false },
  { tipo: "video", url: "/catalogo-prueba.mp4", portada: mayar.medios[0].url },
];
mayar.stock = 2;
const camisa = base.productos.find(
  (p) =>
    p.tiendaId === "a1000000-0000-4000-8000-000000000003" && p.opciones.length,
);
camisa.porEncargo = false;
camisa.opciones.find((o) => o.nombre === "Color").valores = ["Arena", "Negro"];
for (const v of base.variantes.filter((v) => v.productoId === camisa.id)) {
  if (v.valores.Color === "Blanco") v.valores.Color = "Negro";
  if (v.valores.Talla === "M" && v.valores.Color === "Negro") {
    v.stock = 3;
    v.precio = 1900;
  }
}
const b = await navegador();
let fallos = 0;
const aprobar = (cond, msg) => {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
};
async function caso(nombre, fn) {
  try {
    await fn();
    resultados.push({ nombre, paso: true });
  } catch (e) {
    fallos++;
    resultados.push({ nombre, paso: false, error: String(e) });
    console.error("✗", nombre, String(e));
    const p = b.contexts().at(-1)?.pages().at(-1);
    if (p) {
      await p
        .screenshot({
          path: caps + "/" + nombre.replace(/[^a-z0-9]+/gi, "-") + "-error.png",
        })
        .catch(() => {});
      console.log(
        await p
          .evaluate(() => ({
            url: location.href,
            video: [...document.querySelectorAll("video")].map((v) => ({
              ready: v.readyState,
              paused: v.paused,
              src: v.currentSrc,
              error: v.error?.message,
              muted: v.muted,
              tiempo: v.currentTime,
            })),
            reel: document.querySelector(".reel.on")?.getAttribute("data-id"),
            opciones: [
              ...document.querySelectorAll(".reel.on .opciones-fila button"),
            ].map((b) => [
              b.textContent,
              b.className,
              b.getAttribute("aria-pressed"),
            ]),
          }))
          .catch(() => {}),
      );
    }
  }
}
async function contexto(ancho, slug = "esencias-michel") {
  const ctx = await b.newContext({
    serviceWorkers: "block",
    viewport: { width: ancho, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await ctx.addInitScript(
    ({ db }) => {
      if (!localStorage.getItem("deslizapp-demo-v5"))
        localStorage.setItem("deslizapp-demo-v5", JSON.stringify(db));
      localStorage.setItem("dz-coach-esencias-michel", "1");
      localStorage.setItem("dz-coach-lino-y-algodon", "1");
      localStorage.setItem("dz-coach-lino-algodon", "1");
      localStorage.setItem("deslizapp-version-vista", "9.9.9");
      localStorage.setItem("deslizapp-modo-v1", "demo");
      localStorage.setItem(
        "deslizapp-sesion-v1",
        "a1000000-0000-4000-8000-000000000001",
      );
    },
    { db: base },
  );
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  await p.route("**/catalogo-prueba.mp4", (r) =>
    r.fulfill({
      contentType: "video/mp4",
      body: readFileSync("tests/fixtures/catalogo-video.mp4"),
    }),
  );
  await p.goto(
    URL +
      "/tienda/" +
      slug +
      "?demo#p/" +
      (slug === t.slug ? "mayar" : camisa.slug),
  );
  await p.waitForSelector(".reel.on");
  if (await p.locator("#coach").count())
    await p.locator("#coach .cskip").click();
  return { ctx, p, errores };
}
const db = async (p) =>
  JSON.parse(await p.evaluate((k) => localStorage.getItem(k), CLAVE));
try {
  for (const ancho of [360, 390]) {
    const { ctx, p } = await contexto(ancho);
    await caso("hash/carrusel/video " + ancho, async () => {
      aprobar(
        await p
          .locator("#r-mayar")
          .evaluate((el) => el.classList.contains("on")),
        "#p/mayar abre Mayar",
      );
      const carr = p.locator("#r-mayar .carrusel");
      await carr.evaluate((el) =>
        el.scrollTo({ left: el.clientWidth, behavior: "instant" }),
      );
      await p.waitForTimeout(120);
      aprobar(
        await carr.evaluate((el) => el.scrollLeft > el.clientWidth * 0.9),
        "Carrusel horizontal",
      );
      await p.locator("#r-mayar .puntos-medios button").nth(2).click();
      const video = p.locator("#r-mayar video");
      await p.evaluate(() => document.getElementById("r-mayar").scrollIntoView({block:"start"}));
      await p.waitForFunction(() => {
        const v = document.querySelector("#r-mayar video");
        return v && !v.paused && v.muted && v.currentTime > 0;
      });
      aprobar(
        await video.evaluate((v) => v.playsInline && v.loop),
        "Video en línea y en bucle",
      );
      await p.locator("#r-mayar .sonido").click();
      aprobar(await video.evaluate((v) => !v.muted), "Activar sonido");
      await p.evaluate(() =>
        document
          .getElementById("r-majestic")
          .scrollIntoView({ block: "start" }),
      );
      await p.waitForTimeout(500);
      aprobar(
        await video.evaluate((v) => v.paused),
        "Video se pausa fuera del reel",
      );
    });
    await caso("aviso " + ancho, async () => {
      await p.evaluate(() =>
        document.getElementById("r-oxana").scrollIntoView({ block: "start" }),
      );
      await p.waitForTimeout(200);
      await p.locator("#r-oxana .acts button").first().click();
      const input = p.locator("#telefonoAviso");
      await input.fill("8095550140");
      aprobar(
        await input.evaluate((el) => document.activeElement === el),
        "Campo WhatsApp conserva foco",
      );
      await p
        .locator("#avisoBg button[type=submit],#avisoBg .aviso-boton")
        .click();
      await p.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("deslizapp-demo-v5")).avisos
            .length === 1,
      );
      aprobar(
        (await db(p)).avisos[0].telefono === "18095550140",
        "Avísame persiste teléfono con 1",
      );
      await p.goto(URL + "/catalogo");
      await p.waitForSelector("main");
      await p.getByRole("button", { name: /disponible/ }).first().click();
      await p.getByRole("button", { name: /Por reponer/ }).click();
      await p.getByRole("checkbox", { name: /^Oxana Black/ }).click();
      await p.getByText("1 esperan", { exact: true }).waitFor();
      aprobar(
        (await p.getByText("1 esperan", { exact: true }).count()) > 0,
        "El panel muestra 1 espera",
      );
    });
    await ctx.close();
  }
  const lino = base.tiendas.find((x) => x.id === camisa.tiendaId);
  await caso("ropa / precios / agotada / sin tema", async () => {
    const { ctx, p, errores } = await contexto(390, lino.slug);
    const r = p.locator("#r-" + camisa.slug);
    await r.getByRole("button", { name: "M", exact: true }).first().click();
    await p.waitForTimeout(100);
    aprobar(
      await r
        .getByRole("button", { name: "M", exact: true })
        .first()
        .evaluate((el) => el.classList.contains("agotada")),
      "M · Arena tachada y tocable",
    );
    await r.getByRole("button", { name: "Negro", exact: true }).first().click();
    aprobar(
      (await r.locator(".pr strong").innerText()).includes("1,900"),
      "Precio cambia con M · Negro",
    );
    await r.locator(".acts [data-like]").click();
    await p.locator("#bagDock button").click();
    aprobar(
      (await p.locator("#lines").innerText()).includes("Talla M · Negro"),
      "Carrito muestra Talla M · Negro",
    );
    await p.screenshot({ path: caps + "/ropa-390.png" });
    aprobar(!errores.length, "Sin errores en ropa sin tema");
    await ctx.close();
  });
  await caso(
    "envío / historia / recibos / precio autoritativo",
    async () => {
      const { ctx, p, errores } = await contexto(390);
      await p.locator("#r-mayar .acts [data-like]").click();
      await p.locator("#bagDock button").click();
      const captura = [];
      await p.route("https://wa.me/**", (r) => {
        captura.push(r.request().url());
        return r.fulfill({
          contentType: "text/html",
          body: "<p>WhatsApp preparado, sin enviar</p>",
        });
      });
      await p.locator("#sheetSend").click();
      await p.waitForURL("https://wa.me/**");
      aprobar(
        captura.length === 1,
        "WhatsApp después del await usa la misma pestaña",
      );
      const msg = new globalThis.URL(captura[0]).searchParams.get("text");
      aprobar(
        msg.includes("Mi pedido #") && msg.includes("\n" + URL + "/pedido/"),
        "Mensaje lleva código y origen real",
      );
      const lectura = await ctx.newPage();
      await lectura.goto(URL + "/tienda/esencias-michel?demo");
      await lectura.waitForSelector(".reel");
      const datos = await db(lectura),
        s = datos.solicitudes.at(-1);
      aprobar(
        s.items.length === 1 && s.items[0].precioUnitario === mayar.precio,
        "Solicitud usa precio de fuente",
      );
      await lectura.goto(URL + "/pedido/" + s.codigo + "?demo");
      await lectura.waitForSelector(".pvslide");
      aprobar(
        (await lectura.locator(".pvtag").textContent()).trim() === "1 de 1",
        "Historia sin vencimiento de 24 h",
      );
      await lectura.evaluate(() => Object.defineProperty(navigator, "canShare", { value: () => false, configurable: true }));
      const inicioPdf = Date.now();
      const descarga = lectura.waitForEvent("download");
      await lectura.locator("[data-inv=pdf]").click();
      const archivo = await descarga;
      recibos.push({formato:"pdf",primeraCargaModulo:true,ms:Date.now()-inicioPdf});
      aprobar(archivo.suggestedFilename().endsWith(".pdf"), "PDF descargable");
      await archivo.saveAs(caps + "/recibo-prueba.pdf");
      const inicioPng = Date.now();
      const png = lectura.waitForEvent("download");
      await lectura.locator("[data-inv=png]").click();
      const image = await png;
      recibos.push({formato:"png",primeraCargaModulo:false,ms:Date.now()-inicioPng});
      await image.saveAs(caps + "/recibo-prueba.png");
      await lectura.screenshot({ path: caps + "/pedido-390.png" });
      const primeraImagen = await ctx.newPage();
      await primeraImagen.goto(URL + "/pedido/" + s.codigo + "?demo");
      await primeraImagen.waitForSelector(".pvslide");
      await primeraImagen.evaluate(() => Object.defineProperty(navigator, "canShare", { value: () => false, configurable: true }));
      const inicioImagenFria = Date.now(), imagenFria = primeraImagen.waitForEvent("download");
      await primeraImagen.locator("[data-inv=png]").click();
      const imagenNueva = await imagenFria;
      aprobar(imagenNueva.suggestedFilename().endsWith(".png"), "PNG funciona como primer uso del módulo diferido");
      recibos.push({formato:"png",primeraCargaModulo:true,ms:Date.now()-inicioImagenFria});
      await primeraImagen.close();
      aprobar(!errores.length, "Sin errores al pedir");
      await ctx.close();
    },
  );
  await caso("Por encargo sin stock", async()=> {
    const {ctx,p} = await contexto(390);
    await p.evaluate(({clave,id})=>{const d=JSON.parse(localStorage.getItem(clave));const producto=d.productos.find(p=>p.id===id);producto.stock=0;producto.porEncargo=true;producto.encargoTexto="Llega en 7 a 10 días";localStorage.setItem(clave,JSON.stringify(d));},{clave:CLAVE,id:mayar.id});
    await p.reload();await p.waitForSelector("#r-mayar");
    await p.locator("#r-mayar .acts [data-like]").click();await p.locator("#bagDock button").click();
    aprobar((await p.locator("#lines").innerText()).includes("Por encargo"),"Carrito permite Por encargo sin stock");
    aprobar((await db(p)).solicitudes.length===0,"Agregar no crea solicitud ni descuenta stock");
    await ctx.close();
  });
  await caso("agotado entre abrir/enviar y oculto al recargar", async () => {
    const { ctx, p } = await contexto(360);
    await p.locator("#r-mayar .acts [data-like]").click();
    await p.locator("#bagDock button").click();
    await p.evaluate(
      ({ clave, id }) => {
        const d = JSON.parse(localStorage.getItem(clave));
        d.productos.find((p) => p.id === id).stock = 0;
        localStorage.setItem(clave, JSON.stringify(d));
        window.dispatchEvent(new StorageEvent("storage", { key: clave }));
      },
      { clave: CLAVE, id: mayar.id },
    );
    const conexiones = [];
    p.on("request", (r) => {
      if (r.url().includes("wa.me/")) conexiones.push(r.url());
    });
    await p.locator("#sheetSend").click();
    await p.waitForTimeout(800);
    aprobar(
      (await p.locator("#dzToast").innerText()).includes("alguien se llevó"),
      "Agotado muestra tostada",
    );
    aprobar(!conexiones.length, "No abre WhatsApp si falta stock");
    await p.evaluate(
      ({ clave, id }) => {
        const d = JSON.parse(localStorage.getItem(clave));
        d.productos.find((p) => p.id === id).activo = false;
        localStorage.setItem(clave, JSON.stringify(d));
      },
      { clave: CLAVE, id: mayar.id },
    );
    await p.reload();
    await p.waitForSelector(".reel");
    aprobar(
      (await p.locator("#r-mayar").count()) === 0,
      "Oculto desaparece al recargar",
    );
    await ctx.close();
  });
  await caso("movimiento reducido, atrás y foco", async () => {
    const { ctx, p } = await contexto(430);
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.locator("#colTab").click();
    await p.goBack();
    aprobar(
      (await p.locator("#coBg").count()) === 0,
      "Atrás cierra colecciones",
    );
    await p.locator("#searchBtn").click();
    await p.locator("#srIn").fill("dulce");
    aprobar(
      await p.locator("#srIn").evaluate((el) => el === document.activeElement),
      "Búsqueda conserva foco",
    );
    await p.keyboard.press("Escape");
    await p.waitForTimeout(100);
    aprobar((await p.locator("#srBg").count()) === 0, "Escape cierra búsqueda");
    aprobar(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Sin overflow a 430",
    );
    await ctx.close();
  });
} catch (e) {
  fallos++;
  resultados.push({ nombre: "entorno", paso: false, error: String(e) });
} finally {
  writeFileSync(caps + "/recibos-tiempos.json", JSON.stringify(recibos, null, 2) + "\n");
  await b.close();
  writeFileSync(
    caps + "/resultados.json",
    JSON.stringify(resultados, null, 2) + "\n",
  );
}
if (fallos) process.exitCode = 1;
// WebKit requiere binario y bibliotecas del sistema; no confundir Chromium móvil con Safari.
try {
  const w = await playwright.webkit.launch();
  await w.close();
  console.log("WebKit disponible: ejecutar los casos iPhone en ese motor.");
} catch (e) {
  console.log("WebKit no disponible:", String(e).split("\n")[0]);
}
