// Uso: con la app corriendo, `node scripts/generar-og-inicio.mjs [url]` (mejor contra la vista previa de Vercel, que tiene las
// fotos reales de la tienda Deslizapp). Genera public/inicio/og.png (1200×630), la imagen para compartir la página principal.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const playwright = require("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const pagina = await nav.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await pagina.goto(base + "/", { waitUntil: "networkidle" });
await pagina.addStyleTag({ content: "nextjs-portal{display:none!important} .ini-tira{animation-play-state:paused!important}" });
// Con una burbuja a la vista.
await pagina.locator(".ini-burbuja").waitFor();
await pagina.waitForTimeout(900);
mkdirSync("public/inicio", { recursive: true });
await pagina.screenshot({ path: "public/inicio/og.png" });
await nav.close();
console.log("public/inicio/og.png listo");
