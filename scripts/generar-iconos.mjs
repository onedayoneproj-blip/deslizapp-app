// Uso: npm run iconos   (node scripts/generar-iconos.mjs)
// Genera los íconos de la app de vendedores (public/icons/*.png y app/icon.png) desde public/icons/isotipo-app.svg:
// isotipo Verde Bosque con borde Menta, sobre fondo Menta OPACO (iOS rellena con negro lo transparente). En modo oscuro de iOS
// el fondo pasa a negro y el borde menta dibuja el contorno del isotipo (docs/10-marca-ilustracion-y-fondos.md).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONDO = "#dcebe2";
const svg = readFileSync(join(ROOT, "public/icons/isotipo-app.svg"), "utf8");

// Caja del isotipo (sin borde) en el viewBox de 2048, y su centro
const CAJA = { x0: 330, x1: 1811, y0: 181, y1: 1966 };
const ALTO = CAJA.y1 - CAJA.y0;
const CX = (CAJA.x0 + CAJA.x1) / 2;
const CY = (CAJA.y0 + CAJA.y1) / 2;

/** @param alto fracción del lado que ocupa el isotipo (sin borde) */
async function icono(archivo, lado, alto) {
  const unidades = (ALTO / alto); // unidades del viewBox que caben en el lado
  const vb = `${CX - unidades / 2} ${CY - unidades / 2} ${unidades} ${unidades}`;
  const centrado = svg.replace(/viewBox="[^"]+"/, `viewBox="${vb}"`);
  const png = await sharp(Buffer.from(centrado), { density: 72 * Math.max(1, (lado / unidades) * 4) })
    .resize(lado, lado)
    .flatten({ background: FONDO })
    .png()
    .toBuffer();
  await sharp(png).toFile(join(ROOT, archivo));
  console.log("✓", archivo);
}

// "any": el isotipo mide lo mismo que en el ícono anterior (68 % del lado de alto)
await icono("public/icons/apple-touch-icon.png", 180, 0.68);
await icono("public/icons/icon-192.png", 192, 0.68);
await icono("public/icons/icon-512.png", 512, 0.68);
await icono("app/icon.png", 512, 0.68);
// "maskable": Android recorta en círculo; isotipo + borde dentro de la zona segura del 80 % (ocupa ~50 % del lado)
await icono("public/icons/icon-maskable-512.png", 512, 0.5);
