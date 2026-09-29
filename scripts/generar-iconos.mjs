// Uso: node scripts/generar-iconos.mjs
// Genera public/icons/*.png a partir del isotipo (public/icons/isotipo.svg).
// Necesita Playwright con Chromium (npx playwright install chromium, si no lo tienes).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}

const BOSQUE = "#174B3A";
const ROSA = "#F5C9D6";
const trazo = readFileSync(join(ROOT, "public/icons/isotipo.svg"), "utf8").match(/ d="([^"]+)"/)[1];

/**
 * @param lado tamaño final en px
 * @param isotipo fracción del lado que ocupa la "d"
 * @param radio radio de las esquinas (fracción del lado); 0 = cuadrado a sangre
 */
const svg = (lado, isotipo, radio) => {
  const d = lado * isotipo;
  const o = (lado - d) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
  <rect width="${lado}" height="${lado}" rx="${lado * radio}" fill="${BOSQUE}"/>
  <svg x="${o}" y="${o}" width="${d}" height="${d}" viewBox="0 0 2048 2048"><path fill="${ROSA}" d="${trazo}"/></svg>
</svg>`;
};

const ICONOS = [
  // purpose "any": cuadro redondeado, la "d" grande
  { archivo: "icon-192.png", lado: 192, isotipo: 0.7, radio: 0.22 },
  { archivo: "icon-512.png", lado: 512, isotipo: 0.7, radio: 0.22 },
  // purpose "maskable": a sangre, la "d" dentro de la zona segura (círculo del 80 %)
  { archivo: "icon-maskable-512.png", lado: 512, isotipo: 0.5, radio: 0 },
  // iOS pone sus propias esquinas
  { archivo: "apple-touch-icon.png", lado: 180, isotipo: 0.64, radio: 0 },
];

const navegador = await playwright.chromium.launch();
const pagina = await navegador.newPage();
for (const { archivo, lado, isotipo, radio } of ICONOS) {
  await pagina.setViewportSize({ width: lado, height: lado });
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg(lado, isotipo, radio)}</body></html>`);
  await pagina.screenshot({ path: join(ROOT, "public/icons", archivo), omitBackground: true });
  console.log("✓", archivo);
}
await navegador.close();
