// Uso: con la app corriendo (npm run dev), `node scripts/generar-catalogo-bio.mjs [url]`.
// Genera public/landing/catalogo/tote-sin-like.webp: el catálogo de la demo (app/demo-landing/compradora, componentes reales) parado en
// el tercer producto, sin su «aaah» todavía. Es el cuadro que le falta a la animación de «Tu catálogo en el link de tu bio» de /planes
// (components/landing/perfil-a-catalogo.tsx): los otros dos productos (hola, pasa) y el del like (aaah-tote) ya son capturas de los pasos.
// Se llega al paso «aaah-tote» como en generar-pasos-landing.mjs y se quita el like del tote (el mismo toque del catálogo); la barra del
// pedido y el número de la bolsa se esconden: en el bucle todavía no hay pedido.
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
const i = PASOS.findIndex((p) => p.id === "aaah-tote");
await pagina.evaluate((i) => window.postMessage({ tipo: "dz-landing-paso", paso: i - 1, animar: false }, location.origin), i);
await pagina.waitForTimeout(900);
await pagina.evaluate((i) => window.postMessage({ tipo: "dz-landing-paso", paso: i, animar: true }, location.origin), i);
await pagina.waitForTimeout(PASOS[i].duracion + 1500);
await pagina.evaluate(() => document.querySelector("#r-tote [data-like]").click());
await pagina.waitForTimeout(1200);
await pagina.addStyleTag({ content: "#cartbar,.cartbar,#bagDock .cnt{display:none!important}" });
await pagina.waitForTimeout(300);
await sharp(await pagina.screenshot()).webp({ quality: 72 }).toFile("public/landing/catalogo/tote-sin-like.webp");
await nav.close();
console.log("tote-sin-like");
