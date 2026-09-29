// Uso: node scripts/generar-iconos.mjs
// Genera los íconos de la app de vendedores (public/icons/*.png y app/icon.png)
// a partir del ícono oficial: referencias/iconos/icono-vendedores.png
// (la "d" verde sobre crema). El ícono rosado (icono-marketplace.png) es de la
// futura app "marketplace" y NO se usa aquí.
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

const FONDO = "#FEF9EF"; // el crema exacto del ícono, para que no se note costura al reducir la "d"
const origen = "data:image/png;base64," + readFileSync(join(ROOT, "referencias/iconos/icono-vendedores.png")).toString("base64");

/** @param escala fracción del lado que ocupa el ícono original (1 = a sangre) */
const html = (lado, escala) => {
  const t = lado * escala;
  return `<html><body style="margin:0;background:${FONDO}"><div style="width:${lado}px;height:${lado}px;background:${FONDO};position:relative;overflow:hidden"><img src="${origen}" style="position:absolute;left:${(lado - t) / 2}px;top:${(lado - t) / 2}px;width:${t}px;height:${t}px"></div></body></html>`;
};

const ICONOS = [
  { archivo: "public/icons/icon-192.png", lado: 192, escala: 1 },
  { archivo: "public/icons/icon-512.png", lado: 512, escala: 1 },
  // "maskable": Android recorta en círculo; la "d" debe quedar dentro de la zona segura (80 %)
  { archivo: "public/icons/icon-maskable-512.png", lado: 512, escala: 0.86 },
  // iOS pone sus propias esquinas
  { archivo: "public/icons/apple-touch-icon.png", lado: 180, escala: 1 },
  // favicon (Next.js lo toma de app/icon.png)
  { archivo: "app/icon.png", lado: 512, escala: 1 },
];

const navegador = await playwright.chromium.launch();
const pagina = await navegador.newPage();
for (const { archivo, lado, escala } of ICONOS) {
  await pagina.setViewportSize({ width: lado, height: lado });
  await pagina.setContent(html(lado, escala));
  await pagina.screenshot({ path: join(ROOT, archivo) });
  console.log("✓", archivo);
}
await navegador.close();
