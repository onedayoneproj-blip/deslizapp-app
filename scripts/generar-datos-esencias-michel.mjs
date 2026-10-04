// Genera supabase/migrations/20261004040000_datos_esencias_michel.sql desde el arreglo PRODUCTS de
// public/catalogos/esencias-michel.html (docs/prompts/catalogo-base.md §4). Uso: node scripts/generar-datos-esencias-michel.mjs
// Solo escribe slug y detalles; no toca precios, stock, fotos ni visibilidad. Revisa cada detalle con lib/rubros.ts.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { detallesValidos } from "../lib/rubros.ts";

const html = readFileSync(new URL("../public/catalogos/esencias-michel.html", import.meta.url), "utf8");
// PRODUCTS = [...]; y PRODUCTS.push(...[...]); — se evalúan tal cual en un contexto aislado
const inicio = html.indexOf("const PRODUCTS = ");
const fin = html.indexOf("PRODUCTS.sort(", inicio);
if (inicio < 0 || fin < 0) throw new Error("No encontré PRODUCTS en el HTML");
const contexto = {};
vm.runInNewContext(html.slice(inicio, fin).replace("const PRODUCTS", "globalThis.PRODUCTS") , contexto);
const PRODUCTS = contexto.PRODUCTS;

/** id del HTML → nombre del producto en la base */
const EMPAREJAR = {
  mayar: "Mayar Natural Intense",
  zakat: "Zakat",
  majestic: "Majestic",
  parade: "Parade",
  urbantoy: "Urban Toy Bubble Gum",
  she: "Shé",
  oxana: "Oxana Black",
  wildflower: "Wild Flower Gold",
  kiara: "Kiara Pink",
  "asad-bourbon": "Lattafa Asad Bourbon",
  "pistache-absolu": "Orientica Pistache Absolu",
  "yara-rosa": "Lattafa Yara rosa",
  delilah: "Maison Alhambra Delilah",
};
const PARA = { Mujer: "ella", Hombre: "el", Unisex: "unisex" };
const CONCENTRACION = { edp: "edp", edt: "edt", parfum: "parfum", extrait: "extrait", colonia: "colonia", edc: "colonia" };

const lleno = (v) => v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "") && !(Array.isArray(v) && v.length === 0);
const notas = (texto) => (lleno(texto) ? texto.split(/,\s*|\s+y\s+/).map((s) => s.trim()).filter(Boolean) : null);

const filas = [];
for (const [id, nombre] of Object.entries(EMPAREJAR)) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`No está en el HTML: ${id}`);
  const d = {};
  if (lleno(p.line)) d.marca = p.line.trim();
  if (lleno(p.gender)) {
    if (!PARA[p.gender]) throw new Error(`gender desconocido: ${p.gender}`);
    d.para = PARA[p.gender];
  }
  if (lleno(p.size)) {
    const ml = /(\d+)\s*ml/i.exec(p.size);
    if (ml) d.tamano_ml = Number(ml[1]);
    const conc = /^\s*([a-zA-Z]+)/.exec(p.size);
    if (conc && CONCENTRACION[conc[1].toLowerCase()]) d.concentracion = CONCENTRACION[conc[1].toLowerCase()];
  }
  if (lleno(p.family)) d.familia = p.family.trim();
  if (lleno(p.occasions)) d.ocasiones = p.occasions;
  const n = p.notes ?? {};
  for (const [de, a] of [["top", "notas_salida"], ["heart", "notas_corazon"], ["base", "notas_fondo"]]) {
    const lista = notas(n[de]);
    if (lista) d[a] = lista;
  }
  if (lleno(p.desc)) d.descripcion = p.desc.trim();
  if (!detallesValidos("perfumes", d)) throw new Error(`Detalles inválidos para ${id}: ${JSON.stringify(d)}`);
  filas.push({ id, nombre, detalles: d });
}

const sql = (s) => `'${String(s).replaceAll("'", "''")}'`;
const lineas = [
  "-- Catálogo conectado, migración 4 de 4 (docs/prompts/catalogo-base.md §4). GENERADA por scripts/generar-datos-esencias-michel.mjs",
  "-- desde el arreglo PRODUCTS de public/catalogos/esencias-michel.html: no la edites a mano.",
  "-- Solo Esencias Michel: slug (los mismos del HTML, así los enlaces ya compartidos siguen sirviendo) y detalles.",
  "-- No toca precios, stock, fotos ni visibilidad. Mirsaal valentine y Zakat Z36 no están en el HTML: conservan su slug.",
  "do $$",
  "declare",
  "  t uuid;",
  "  n integer;",
  "begin",
  "  select id into t from public.tiendas where slug = 'esencias-michel';",
  "  if t is null then",
  "    return; -- otra base (por ejemplo, una local): no hay nada que llenar",
  "  end if;",
];
for (const f of filas) {
  lineas.push(
    `  update public.productos set slug = ${sql(f.id)}, detalles = ${sql(JSON.stringify(f.detalles))}::jsonb`,
    `  where tienda_id = t and nombre = ${sql(f.nombre)};`,
    "  get diagnostics n = row_count;",
    `  if n <> 1 then raise exception 'esencias_michel: % productos se llaman %', n, ${sql(f.nombre)}; end if;`,
  );
}
lineas.push("end", "$$;", "");
writeFileSync(new URL("../supabase/migrations/20261004040000_datos_esencias_michel.sql", import.meta.url), lineas.join("\n"));
console.log(`OK: ${filas.length} productos`);
