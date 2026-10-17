// Uso: con la app corriendo (npm run dev), `node scripts/generar-catalogo-bio.mjs [url]`.
// Genera public/landing/catalogo/{gorra,termo,tote-sin-like,tote-con-like}.webp: el catálogo de la demo (app/demo-landing/compradora,
// componentes reales) parado en cada uno de los tres productos, y el tercero ya con su «aaah». Son los cuadros de «Tu catálogo en el link
// de tu bio» (components/landing/perfil-a-catalogo.tsx, en /planes y en el paso `enlace` de /conoce). La barra del pedido, su mensaje y
// el número de la bolsa se esconden en los tres primeros: en la animación todavía no hay pedido. En el último se ve la bolsa con el «1»
// del like del tote (y la barra con el mensaje de la tienda, que va arriba en la demo).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const sharp = require("sharp");
const { PASOS } = await import("../lib/landing/pasos.ts");

const base = process.argv[2] ?? "http://localhost:3000";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
mkdirSync("public/landing/catalogo", { recursive: true });
const pagina = await nav.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
await pagina.goto(`${base}/demo-landing/compradora`, { waitUntil: "networkidle" });
await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
const guardar = async (nombre) => sharp(await pagina.screenshot()).webp({ quality: 72 }).toFile(`public/landing/catalogo/${nombre}.webp`);
const ir = async (paso, animar) => {
  await pagina.evaluate(({ paso, animar }) => window.postMessage({ tipo: "dz-landing-paso", paso, animar }, location.origin), { paso, animar });
  await pagina.waitForTimeout(animar ? 1800 : 900);
};
const hola = PASOS.findIndex((p) => p.id === "hola");
const aaah = PASOS.findIndex((p) => p.id === "aaah");
const sinPedido = "#cartbar,.cartbar,#bagDock .cnt{display:none!important}";
// La gorra: el catálogo recién abierto.
await ir(hola - 1, false);
const estilo = await pagina.addStyleTag({ content: sinPedido });
await ir(hola - 1, false);
await guardar("gorra");
// El termo: el paso `hola` sin animar termina en él.
await ir(hola, false);
await guardar("termo");
// El tote, sin like y con él.
await estilo.evaluate((e) => e.remove());
await ir(aaah, false);
await pagina.evaluate(() => document.querySelector("#r-tote [data-like]").click());
await pagina.waitForTimeout(900);
const sin = await pagina.addStyleTag({ content: sinPedido });
await guardar("tote-sin-like");
await sin.evaluate((e) => e.remove());
await pagina.evaluate(() => document.querySelector("#r-tote [data-like]").click());
await pagina.waitForTimeout(1500);
await guardar("tote-con-like");
await nav.close();
console.log("gorra, termo, tote-sin-like, tote-con-like");
