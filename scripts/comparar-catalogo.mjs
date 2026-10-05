// Comparación reproducible: datos iguales, animaciones congeladas, mismo viewport y capturas lado a lado.
import "../tests/cargar-ts.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { crearSolicitudEnDB } = await import("../lib/data/catalogo.ts");
import { navegador, URL } from "./navegador-catalogo.mjs";
import sharp from "sharp";
import { mkdirSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const carpeta = process.env.CAPTURAS ?? "docs/capturas/catalogo-react/comparar";
mkdirSync(carpeta, { recursive: true });
const base = construirDesdeSeed();
base.promos = [];
base.pedidos = base.pedidos.filter(
  (p) => p.tiendaId !== "a1000000-0000-4000-8000-000000000001",
);
const tienda = base.tiendas.find((t) => t.slug === "esencias-michel");
tienda.personalizacion.secciones = {
  chat: true,
  busqueda: true,
  opiniones: true,
  colecciones: true,
  como_funciona: true,
};
tienda.personalizacion.mensajes = {};
tienda.creadoEn = "2026-08-01T00:00:00-04:00";
const ids = ["mayar", "majestic"];
for (const p of base.productos)
  if (p.tiendaId === tienda.id && ids.includes(p.slug)) p.stock = 1;
const solicitud = crearSolicitudEnDB(
  base,
  tienda.slug,
  ids.map((slug) => ({
    productoId: base.productos.find(
      (p) => p.tiendaId === tienda.id && p.slug === slug,
    ).id,
    varianteId: null,
    cantidad: 1,
  })),
  null,
  "comparar-catalogo",
  randomUUID,
  new Date(),
);
const db = solicitud.db,
  codigo = solicitud.creada.codigo;
const estados = process.env.ESTADOS ? process.env.ESTADOS.split(",") : [
  "primer-reel",
  "mas",
  "colecciones",
  "busqueda",
  "perfil",
  "opiniones",
  "carrito",
  "pedido",
  "historia-pedido",
  "agotado",
  "coach",
  "como-funciona",
  "planes",
  "final",
];
const resultados = [];
const b = await navegador();
async function preparar(p, react, estado) {
  await p.bringToFront();
  await p.goto(
    URL +
      (react
        ? "/tienda/esencias-michel?demo"
        : "/catalogos/esencias-michel.html"),
  );
  await p.waitForSelector(".reel");
  await p.waitForTimeout(800);
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  if (estado === "mas")
    await p.locator(".reel").first().locator("[data-more]").click();
  if (estado === "colecciones") await p.locator("#colTab").click();
  if (estado === "busqueda") {
    await p.locator("#searchBtn").click();
    await p.locator("input[type=search]").fill("dulce");
  }
  if (estado === "perfil") await p.locator("#logo").click();
  if (estado === "opiniones") {
    await p.evaluate(() => {
      document.getElementById("r-mayar").scrollIntoView({ block: "start" });
    });
    await p.waitForTimeout(250);
    await p.locator("#r-mayar [data-comments]").click();
  }
  if (["carrito", "pedido", "historia-pedido"].includes(estado)) {
    for (const slug of ids) {
      await p.evaluate(
        (slug) =>
          document
            .getElementById("r-" + slug)
            .scrollIntoView({ block: "start" }),
        slug,
      );
      await p.waitForTimeout(120);
      await p.locator(`#r-${slug}  .acts [data-like]`).click();
    }
    if (estado === "pedido") await p.locator("#bagDock button").click();
    if (estado === "historia-pedido") {
      if (react) {
        await p.goto(URL + "/pedido/" + codigo + "?demo");
        await p.waitForSelector(".pvslide");
        await p.addStyleTag({
          content:
            "*,*::before,*::after{animation:none!important;transition:none!important}",
        });
      } else
        await p.evaluate(() =>
          openOrderView(new URL(orderLink(items())).hash.slice(1)),
        );
    }
  }
  if (estado === "agotado")
    await p.evaluate(() =>
      document.getElementById("r-oxana").scrollIntoView({ block: "start" }),
    );
  if (estado === "coach") await p.locator("#helpBtn").click();
  if (estado === "como-funciona" || estado === "planes") {
    await p.goto(
      URL +
        (react
          ? "/tienda/esencias-michel?demo"
          : "/catalogos/esencias-michel.html") +
        (estado === "planes" ? "#planes" : "#como-funciona"),
    );
    await p.waitForSelector(estado === "planes" ? "#plBg" : "#story");
    await p.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;transition:none!important}",
    });
  }
  if (estado === "final")
    await p.evaluate(() =>
      document.getElementById("r-deslizapp").scrollIntoView({ block: "start" }),
    );
  await p.waitForTimeout(1800);
}
try {
  for (const ancho of [360, 390, 430]) {
    const ctx = await b.newContext({
      viewport: { width: ancho, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    await ctx.addInitScript(
      ({ db }) => {
        localStorage.setItem("deslizapp-demo-v5", JSON.stringify(db));
        localStorage.setItem("dz-coach-esencias-michel", "1");
        localStorage.setItem("michel-coach", "1");
        localStorage.removeItem("michel-cart");
        localStorage.removeItem("dz-carrito-esencias-michel");
        localStorage.setItem("deslizapp-version-vista", "9.9.9");
      },
      { db },
    );
    const old = await ctx.newPage(),
      nuevo = await ctx.newPage();
    old.setDefaultNavigationTimeout(30000);
    nuevo.setDefaultNavigationTimeout(30000);
    old.setDefaultTimeout(20000);
    nuevo.setDefaultTimeout(20000);
    for (const estado of estados) {
      const par = [];
      let fallo = null;
      for (const [p, react, nombre] of [
        [old, false, "html"],
        [nuevo, true, "react"],
      ]) {
        try {
          await preparar(p, react, estado);
          const file = `${carpeta}/${ancho}-${estado}-${nombre}.png`;
          await p.screenshot({ path: file });
          par.push(file);
        } catch (e) {
          fallo = String(e);
          console.error(ancho, estado, nombre, fallo);
          await p.screenshot({
            path: `${carpeta}/${ancho}-${estado}-${nombre}-error.png`,
          });
        }
      }
      if (par.length === 2) {
        const a = await sharp(par[0]).ensureAlpha().raw().toBuffer(),
          c = await sharp(par[1]).ensureAlpha().raw().toBuffer();
        let diferentes = 0;
        for (let i = 0; i < a.length; i += 4)
          if (
            Math.max(
              Math.abs(a[i] - c[i]),
              Math.abs(a[i + 1] - c[i + 1]),
              Math.abs(a[i + 2] - c[i + 2]),
            ) > 24
          )
            diferentes++;
        const porcentaje = (100 * diferentes) / (a.length / 4);
        await sharp({
          create: {
            width: ancho * 2,
            height: 844,
            channels: 4,
            background: "#fff",
          },
        })
          .composite([
            { input: par[0], left: 0, top: 0 },
            { input: par[1], left: ancho, top: 0 },
          ])
          .webp({quality:92})
          .toFile(`${carpeta}/${ancho}-${estado}-par.webp`);
        par.forEach(unlinkSync);
        resultados.push({
          ancho,
          estado,
          porcentaje: +porcentaje.toFixed(2),
          fallo,
        });
        console.log(ancho, estado, porcentaje.toFixed(2) + "%");
      } else resultados.push({ ancho, estado, fallo });
    }
    await ctx.close();
  }
} finally {
  await b.close();
  writeFileSync(
    `${carpeta}/resultados.json`,
    JSON.stringify(process.env.ESTADOS ? [...JSON.parse(readFileSync(`${carpeta}/resultados.json`)).filter(r=>!resultados.some(n=>n.ancho===r.ancho&&n.estado===r.estado)),...resultados].sort((a,b)=>a.ancho-b.ancho) : resultados, null, 2) + "\n",
  );
}
if (resultados.some((r) => r.fallo)) process.exitCode = 1;
