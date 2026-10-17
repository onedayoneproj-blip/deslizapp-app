// Uso: con la app corriendo (npm run dev), `node scripts/generar-og-landing.mjs [url]`.
// Genera public/landing/og.png (1200×630), la imagen para compartir deslizapp.com: la landing en escritorio, en el paso del tote.
import { createRequire } from "node:module";
import "../tests/cargar-ts.mjs";
const require = createRequire(import.meta.url);
const playwright = require("playwright");
const { indicePaso, PASOS } = await import("../lib/landing/pasos.ts");

const base = process.argv[2] ?? "http://localhost:3000";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const pagina = await nav.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await pagina.waitForTimeout(1500);
// Paso a paso hasta «Uno más» (el ♥ en la bolsa con su «2»).
for (let i = 1; i <= indicePaso("aaah"); i++) {
  await pagina.evaluate((i) => document.querySelector(`[data-paso-seccion="${i}"]`).scrollIntoView({ behavior: "instant" }), i);
  await pagina.waitForTimeout(PASOS[i].duracion + 1400);
}
await pagina.screenshot({ path: "public/landing/og.png" });
await nav.close();
console.log("public/landing/og.png listo");
