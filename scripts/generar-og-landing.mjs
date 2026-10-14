// Uso: con la app corriendo (npm run dev), `node scripts/generar-og-landing.mjs [url]`.
// Genera public/landing/og.png (1200×630), la imagen para compartir deslizapp.com: la landing en escritorio, en la escena «explorar».
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const playwright = require("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
const pagina = await nav.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await pagina.goto(base + "/", { waitUntil: "networkidle" });
// La escena «explorar» con el corazón ya tocado: 0.2 del recorrido.
await pagina.evaluate(() => {
  const s = document.getElementById("demo");
  const e = s.querySelector(".lt-escenario");
  const tope = parseFloat(getComputedStyle(e).top) || 0;
  scrollTo(0, s.getBoundingClientRect().top + scrollY - tope + (s.offsetHeight - e.offsetHeight) * 0.205);
});
await pagina.waitForTimeout(600);
await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
await pagina.screenshot({ path: "public/landing/og.png" });
await nav.close();
console.log("public/landing/og.png listo");
