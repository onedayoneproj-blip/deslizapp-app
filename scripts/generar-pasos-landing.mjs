// Uso: con la app corriendo (npm run dev), `node scripts/generar-pasos-landing.mjs [url]`.
// Genera public/landing/pasos/<paso>.webp: el teléfono de cada paso de la demo (app/demo-landing, componentes reales), para la
// versión de la landing sin JavaScript. Vuélvelo a correr si cambian los pasos (lib/landing/pasos.ts) o las pantallas.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import "../tests/cargar-ts.mjs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const sharp = require("sharp");
const { PASOS } = await import("../lib/landing/pasos.ts");

const base = process.argv[2] ?? "http://localhost:3000";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
mkdirSync("public/landing/pasos", { recursive: true });
for (const [telefono, indices] of [
  // Los pasos con `escena` (el dolor, el post, el perfil, el navegador y el cambio de lado) no son páginas de la app: no tienen
  // captura (la versión sin JavaScript los dibuja con components/landing/escenas.tsx).
  ["compradora", PASOS.map((p, i) => (p.telefono === "compradora" && !p.escena ? i : -1)).filter((i) => i >= 0)],
  ["tienda", PASOS.map((p, i) => (p.telefono === "tienda" && !p.escena ? i : -1)).filter((i) => i >= 0)],
]) {
  const pagina = await nav.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await pagina.goto(`${base}/demo-landing/${telefono}`, { waitUntil: "networkidle" });
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  for (const i of indices) {
    // Hasta el paso anterior sin animar y el último con su animación, para que quede igual que en la demo.
    await pagina.evaluate((i) => window.postMessage({ tipo: "dz-landing-paso", paso: i - 1, animar: false }, location.origin), i);
    await pagina.waitForTimeout(900);
    await pagina.evaluate((i) => window.postMessage({ tipo: "dz-landing-paso", paso: i, animar: true }, location.origin), i);
    await pagina.waitForTimeout(PASOS[i].duracion + 1500);
    const png = await pagina.screenshot();
    await sharp(png).webp({ quality: 72 }).toFile(`public/landing/pasos/${PASOS[i].id}.webp`);
    console.log(PASOS[i].id);
  }
  await pagina.close();
}
await nav.close();
