// Uso: npm run revisar-estilos
// Revisión INFORMATIVA de estilos escritos a mano (no falla nunca): mide cuánto falta para migrar al sistema de diseño
// (docs/09-sistema-de-diseno.md). Recorre components/ y app/ (menos components/ui y app/diseno, que ya son del sistema) y cuenta:
//   - hex: colores hexadecimales escritos a mano (#174b3a, bg-[#fff9ee]…)
//   - bg-white
//   - texto: text-[Npx] / text-[Nrem] fuera de la escala (36, 32, 24, 22, 20, 17, 16, 14, 12, 11 px)
//   - radio: rounded-[Npx] fuera de los radios del sistema (10, 16, 22, 28 px)
//   - sombra: shadow-[...]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXCLUIR = ["components/ui", "app/diseno"];
const ESCALA_TEXTO = new Set([36, 32, 24, 22, 20, 17, 16, 14, 12, 11]);
const RADIOS = new Set([10, 16, 22, 28]);

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const rel = relative(ROOT, ruta);
    if (EXCLUIR.some((e) => rel === e || rel.startsWith(e + "/"))) continue;
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(tsx?|jsx?)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const aPx = (valor, unidad) => (unidad === "rem" ? Number(valor) * 16 : Number(valor));

function contar(texto) {
  const r = { hex: 0, blanco: 0, texto: 0, radio: 0, sombra: 0 };
  // Hex: 6 u 8 cifras siempre; 3 o 4 solo si tienen alguna letra (así "#1042", un número de pedido, no cuenta)
  for (const m of texto.matchAll(/(?<![&\w])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z])/g)) {
    if (m[1].length >= 6 || /[a-fA-F]/.test(m[1])) r.hex++;
  }
  r.blanco = (texto.match(/(?<![\w-])bg-white(?![\w-])/g) ?? []).length;
  for (const m of texto.matchAll(/(?<![\w-])text-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) if (!ESCALA_TEXTO.has(aPx(m[1], m[2]))) r.texto++;
  for (const m of texto.matchAll(/(?<![\w-])rounded(?:-[a-z]{1,2})?-\[(\d+(?:\.\d+)?)(px|rem)\]/g)) if (!RADIOS.has(aPx(m[1], m[2]))) r.radio++;
  r.sombra = (texto.match(/(?<![\w-])shadow-\[/g) ?? []).length;
  return r;
}

const filas = [];
const total = { hex: 0, blanco: 0, texto: 0, radio: 0, sombra: 0 };
for (const ruta of [...archivos(join(ROOT, "components")), ...archivos(join(ROOT, "app"))]) {
  const r = contar(readFileSync(ruta, "utf8"));
  const suma = Object.values(r).reduce((a, b) => a + b, 0);
  if (suma === 0) continue;
  for (const k of Object.keys(total)) total[k] += r[k];
  filas.push({ archivo: relative(ROOT, ruta), ...r, suma });
}
filas.sort((a, b) => b.suma - a.suma || a.archivo.localeCompare(b.archivo));

const ancho = Math.max(7, ...filas.map((f) => f.archivo.length));
const col = (v) => String(v).padStart(7);
console.log(`${"archivo".padEnd(ancho)}${col("hex")}${col("white")}${col("texto")}${col("radio")}${col("sombra")}${col("total")}`);
for (const f of filas) console.log(`${f.archivo.padEnd(ancho)}${col(f.hex)}${col(f.blanco)}${col(f.texto)}${col(f.radio)}${col(f.sombra)}${col(f.suma)}`);
const suma = Object.values(total).reduce((a, b) => a + b, 0);
console.log(`${"TOTAL".padEnd(ancho)}${col(total.hex)}${col(total.blanco)}${col(total.texto)}${col(total.radio)}${col(total.sombra)}${col(suma)}`);
console.log(`\n${filas.length} archivos con estilos a mano. Solo informa: no falla el build.`);
