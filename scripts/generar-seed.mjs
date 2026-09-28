// Uso: node scripts/generar-seed.mjs
// Genera lib/data/seed/*.json y public/seed/**/*.svg de forma determinista.
// Nombres y cifras de Esencias Michel tomados de referencias/prototipo-interactivo/.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "lib/data/seed");
const PUB = join(ROOT, "public/seed");
mkdirSync(SEED, { recursive: true });
mkdirSync(join(PUB, "productos"), { recursive: true });
mkdirSync(join(PUB, "tiendas"), { recursive: true });

const REF = Date.parse("2026-09-28T16:00:00Z"); // "ahora" del seed: lunes 12:00 en Santo Domingo
const MIN = 60e3;
const H = 3600e3;
const D = 24 * H;
const iso = (ms) => new Date(ms).toISOString();
/** Hora local de Santo Domingo (UTC-4) `dias` días atrás. */
const local = (dias, hora, minuto = 0) => {
  const d = new Date(REF - 4 * H - dias * D);
  d.setUTCHours(hora, minuto, 0, 0);
  return d.getTime() + 4 * H;
};

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260928);

const uid = (prefijo, n) => `${prefijo}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------- tiendas ----------
const T_MICHEL = uid("a1000000", 1);
const T_LUNA = uid("a1000000", 2);
const tiendas = [
  {
    id: T_MICHEL, slug: "esencias-michel", nombre: "Esencias Michel",
    logo_url: "/seed/tiendas/esencias-michel.svg", plan: "p20", limite_productos: 20,
    creditos_retoque: 35, creditos_retoque_mensuales: 100, creado_en: iso(REF - 210 * D),
  },
  {
    id: T_LUNA, slug: "luna-bisuteria", nombre: "Luna Bisutería",
    logo_url: "/seed/tiendas/luna-bisuteria.svg", plan: "p60", limite_productos: 60,
    creditos_retoque: 100, creditos_retoque_mensuales: 100, creado_en: iso(REF - 95 * D),
  },
];

const usuarios = [
  { id: uid("a2000000", 1), tienda_id: T_MICHEL, email: "michel@example.com", nombre: "Michel", rol: "dueno" },
  { id: uid("a2000000", 2), tienda_id: T_LUNA, email: "marisol@example.com", nombre: "Marisol", rol: "dueno" },
];

// ---------- productos ----------
// [nombre, precio, categoria, stock, likes, activo, destacado, retocada, colores]
const defMichel = [
  ["Kiara Pink", 1100, "Dulces", 1, 57, true, true, true, ["#F5C9D6", "#E88FAE"]],
  ["Mayar Natural Intense", 3200, "Frescos", 3, 48, true, true, false, ["#DCEBE2", "#5E9C75"]],
  ["Urban Toy Bubble Gum", 1500, "Dulces", 0, 44, true, false, false, ["#FBD9E8", "#D65A93"]],
  ["Intense Vanille", 1800, "Dulces", 5, 39, true, false, true, ["#FFF1D6", "#E3C07A"]],
  ["Shé", 1200, "Para ella", 6, 35, true, false, false, ["#EADCF5", "#A987C9"]],
  ["Zakat Z6", 3000, "Unisex", 2, 31, true, false, false, ["#D9D2C5", "#3B2F2A"]],
  ["Wild Flower Gold", 1100, "Frescos", 4, 29, true, false, false, ["#FFF3B8", "#E0A526"]],
  ["Parade", 1800, "Para ella", 2, 27, true, false, false, ["#FAD4D0", "#D9776C"]],
  ["Majestic Kurt", 2500, "Unisex", 4, 22, false, false, false, ["#E6ECF5", "#2E3F66"]],
  ["Oxana Black", 1300, "Unisex", 3, 18, true, false, false, ["#E4E0DA", "#1F1A17"]],
];
const defLuna = [
  ["Aretes Luna Llena", 850, "Aretes", 5, 21, true, true, false, ["#E6ECF5", "#8A9BB8"]],
  ["Collar Marea", 1450, "Collares", 2, 17, true, true, true, ["#D8EEF0", "#3E8C95"]],
  ["Pulsera Coral", 650, "Pulseras", 9, 11, true, false, false, ["#FFE0D6", "#FF834F"]],
  ["Choker Perla", 1200, "Collares", 1, 9, true, false, false, ["#F4F0EA", "#BFB3A2"]],
  ["Anillo Brisa", 500, "Anillos", null, 5, true, false, false, ["#E2F0E6", "#5E9C75"]],
  ["Tobillera Arena", 450, "Pulseras", 4, 2, true, false, false, ["#F6E9D2", "#C9A46A"]],
];

let nProd = 0;
const productos = [];
function crearProductos(tiendaId, defs, tipo) {
  // Se crean del menos al más suspirado, para que "más nuevo primero" deje arriba a los favoritos.
  return [...defs].reverse().map(([nombre, precio, categoria, stock, likes, activo, destacado, retocada, colores], i) => {
    const slug = slugify(nombre);
    writeFileSync(join(PUB, "productos", `${slug}.svg`), tipo === "perfume" ? svgPerfume(colores, i) : svgJoya(colores, i));
    const creado = REF - (150 - i * 9) * D;
    const p = {
      id: uid("a3000000", ++nProd), tienda_id: tiendaId, nombre, precio,
      fotos: [`/seed/productos/${slug}.svg`], foto_retocada: retocada, categoria, activo, destacado,
      stock, likes, creado_en: iso(creado), actualizado_en: iso(creado + 20 * D),
    };
    productos.push(p);
    return p;
  });
}
crearProductos(T_MICHEL, defMichel, "perfume");
crearProductos(T_LUNA, defLuna, "joya");
const porNombre = Object.fromEntries(productos.map((p) => [p.nombre, p]));

// ---------- eventos_aaah (likes repartidos en los últimos 14 días) ----------
const eventos_aaah = [];
let nEv = 0;
for (const p of productos) {
  for (let k = 0; k < p.likes; k++) {
    // ~58% en los últimos 7 días para que la variación salga positiva
    const dia = rand() < 0.58 ? Math.floor(rand() * 7) : 7 + Math.floor(rand() * 7);
    let ms = local(dia, 9 + Math.floor(rand() * 14), Math.floor(rand() * 60));
    if (ms > REF) ms -= D;
    eventos_aaah.push({ id: uid("a8000000", ++nEv), tienda_id: p.tienda_id, producto_id: p.id, creado_en: iso(ms) });
  }
}
eventos_aaah.sort((a, b) => a.creado_en.localeCompare(b.creado_en));

// ---------- clientes ----------
let nCli = 0;
const clientes = [];
function cliente(tiendaId, nombre, telefono, origen, altaMs) {
  const c = { id: uid("a4000000", ++nCli), tienda_id: tiendaId, nombre, telefono, origen, primer_pedido_en: iso(altaMs), pedidos_count: 0 };
  c._primero = null;
  clientes.push(c);
  return c;
}
const carolina = cliente(T_MICHEL, "Carolina Peña", "+18095550142", "catalogo", REF - 30 * D);
const luis = cliente(T_MICHEL, "Luis Marte", "+18295550178", "catalogo", REF - 30 * D);
const yeimy = cliente(T_MICHEL, "Yeimy Rosario", "+18495550115", "manual", REF - 30 * D);
const anyelo = cliente(T_MICHEL, "Anyelo Brito", "+18095550190", "catalogo", REF - 30 * D);
cliente(T_MICHEL, "Paola Jiménez", "+18295550163", "manual", REF - 6 * D); // todavía no pide
const anaLucia = cliente(T_LUNA, "Ana Lucía Ferreira", "+18095557730", "catalogo", REF - 30 * D);
const marcos = cliente(T_LUNA, "Marcos Peralta", "+18295556014", "catalogo", REF - 30 * D);
const wendy = cliente(T_LUNA, "Wendy Sosa", "+18495552185", "manual", REF - 30 * D);

// ---------- promos ----------
let nPromo = 0;
const promos = [];
function promo(tiendaId, datos) {
  promos.push({
    id: uid("a6000000", ++nPromo), tienda_id: tiendaId, tipo: datos.tipo, nombre: datos.nombre,
    valor_porcentaje: datos.valor ?? null, codigo: datos.codigo ?? null, coleccion: datos.coleccion ?? null,
    producto_id: datos.productoId ?? null, fecha_inicio: iso(datos.inicio), fecha_fin: datos.fin == null ? null : iso(datos.fin),
    estado: datos.estado,
  });
}
const inicioDia = (dias) => local(-dias, 0, 0);
const finDia = (dias) => local(-dias, 23, 59);
promo(T_MICHEL, { tipo: "coleccion", nombre: "Semana del aaah", valor: 15, coleccion: "Dulces", inicio: inicioDia(-3), fin: finDia(4), estado: "activa" });
promo(T_MICHEL, { tipo: "codigo", nombre: "AAAH10", valor: 10, codigo: "AAAH10", inicio: inicioDia(-27), fin: finDia(33), estado: "activa" });
promo(T_MICHEL, { tipo: "producto", nombre: "Mayar en su momento", valor: 10, productoId: porNombre["Mayar Natural Intense"].id, inicio: inicioDia(3), fin: finDia(9), estado: "programada" });
promo(T_MICHEL, { tipo: "coleccion", nombre: "Día de las Madres", valor: 20, coleccion: "Para ella", inicio: inicioDia(-131), fin: finDia(-120), estado: "terminada" });
promo(T_LUNA, { tipo: "codigo", nombre: "LUNA20", valor: 20, codigo: "LUNA20", inicio: inicioDia(-7), fin: finDia(14), estado: "activa" });
promo(T_LUNA, { tipo: "coleccion", nombre: "Aretes de temporada", valor: 10, coleccion: "Aretes", inicio: inicioDia(-30), fin: finDia(-16), estado: "terminada" });

// ---------- pedidos ----------
let nPed = 0;
let nItem = 0;
const pedidos = [];
const pedido_items = [];
/** items: [nombre, cantidad, precioUnitario?] — el precio unitario es el snapshot (ya con promo de colección/producto). */
function pedido(tiendaId, { numero, cli, origen, estado, creado, items, codigo = null, porcentaje = 0, despachadoTrasHoras = 3 }) {
  const id = uid("a5000000", ++nPed);
  let subtotal = 0;
  for (const [nombre, cantidad, unitario] of items) {
    const prod = porNombre[nombre];
    const precio = unitario ?? prod.precio;
    subtotal += precio * cantidad;
    pedido_items.push({ id: uid("a7000000", ++nItem), pedido_id: id, producto_id: prod.id, nombre_producto: prod.nombre, cantidad, precio_unitario: precio });
  }
  const total = subtotal - Math.round((subtotal * porcentaje) / 100);
  pedidos.push({
    id, tienda_id: tiendaId, numero, cliente_id: cli ? cli.id : null, origen, estado, total, codigo_promo: codigo,
    creado_en: iso(creado), despachado_en: estado === "despachado" ? iso(creado + despachadoTrasHoras * H) : null,
  });
  if (cli && estado !== "cancelado") {
    cli.pedidos_count += 1;
    if (!cli._primero || creado < cli._primero) cli._primero = creado;
  }
}
// Esencias Michel (los mismos pedidos del prototipo)
pedido(T_MICHEL, { numero: 1038, cli: anyelo, origen: "catalogo", estado: "despachado", creado: local(4, 16, 5), items: [["Oxana Black", 1]] });
pedido(T_MICHEL, { numero: 1039, cli: carolina, origen: "catalogo", estado: "despachado", creado: local(1, 11, 30), items: [["Parade", 1]] });
pedido(T_MICHEL, { numero: 1040, cli: yeimy, origen: "manual", estado: "por_despachar", creado: local(1, 18, 12), items: [["Mayar Natural Intense", 1], ["Wild Flower Gold", 2]] });
pedido(T_MICHEL, { numero: 1041, cli: luis, origen: "catalogo", estado: "nuevo", creado: REF - 40 * MIN, items: [["Zakat Z6", 1]] });
pedido(T_MICHEL, { numero: 1042, cli: carolina, origen: "catalogo", estado: "nuevo", creado: REF - 8 * MIN, items: [["Kiara Pink", 1, 935], ["Shé", 1]], codigo: "AAAH10", porcentaje: 10 });
// Luna Bisutería (Choker Perla tiene stock 1 y está en dos pedidos: sirve para probar el aviso de falta de stock)
pedido(T_LUNA, { numero: 1001, cli: anaLucia, origen: "catalogo", estado: "despachado", creado: local(8, 15, 20), items: [["Aretes Luna Llena", 1]] });
pedido(T_LUNA, { numero: 1002, cli: marcos, origen: "catalogo", estado: "despachado", creado: local(4, 10, 45), items: [["Pulsera Coral", 2]] });
pedido(T_LUNA, { numero: 1003, cli: wendy, origen: "manual", estado: "por_despachar", creado: local(1, 17, 0), items: [["Anillo Brisa", 1], ["Choker Perla", 1]] });
pedido(T_LUNA, { numero: 1004, cli: anaLucia, origen: "catalogo", estado: "nuevo", creado: REF - 5 * H, items: [["Collar Marea", 1], ["Choker Perla", 1]], codigo: "LUNA20", porcentaje: 20 });

for (const c of clientes) {
  if (c._primero) c.primer_pedido_en = iso(c._primero);
  delete c._primero;
}

// ---------- escribir ----------
const escribir = (nombre, datos) => writeFileSync(join(SEED, `${nombre}.json`), JSON.stringify(datos, null, 2) + "\n");
escribir("meta", { fecha_referencia: iso(REF), nota: "Todas las fechas del seed se desplazan para que esta fecha coincida con el momento en que se carga la demo." });
escribir("tiendas", tiendas);
escribir("usuarios", usuarios);
escribir("productos", productos);
escribir("pedidos", pedidos);
escribir("pedido_items", pedido_items);
escribir("clientes", clientes);
escribir("promos", promos);
escribir("eventos_aaah", eventos_aaah);

writeFileSync(join(PUB, "tiendas", "esencias-michel.svg"), svgLogo("#174B3A", "#F5C9D6", "EM"));
writeFileSync(join(PUB, "tiendas", "luna-bisuteria.svg"), svgLogo("#2E3F66", "#FFF9EE", "LB"));

console.log({ productos: productos.length, eventos: eventos_aaah.length, pedidos: pedidos.length, clientes: clientes.length, promos: promos.length });
console.log(pedidos.map((p) => `${p.numero} ${p.total}`).join(", "));

// ---------- ilustraciones ----------
function svgPerfume([fondo, frasco], i) {
  const blobX = 40 + (i % 3) * 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect width="400" height="500" fill="${fondo}"/>
  <path d="M${blobX} 330c-40-60 10-150 90-140s120 80 150 60 110 30 80 120-140 110-220 80-60-60-100-120z" fill="#ffffff" opacity="0.45"/>
  <rect x="172" y="120" width="56" height="44" rx="8" fill="#174B3A"/>
  <rect x="186" y="160" width="28" height="26" fill="${frasco}" opacity="0.9"/>
  <rect x="120" y="182" width="160" height="210" rx="${28 + (i % 3) * 14}" fill="${frasco}"/>
  <rect x="138" y="200" width="30" height="160" rx="15" fill="#ffffff" opacity="0.35"/>
  <rect x="160" y="262" width="80" height="44" rx="10" fill="#FFF9EE" opacity="0.9"/>
  <ellipse cx="200" cy="420" rx="110" ry="14" fill="#174B3A" opacity="0.12"/>
</svg>
`;
}
function svgJoya([fondo, joya], i) {
  const r = 70 + (i % 3) * 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect width="400" height="500" fill="${fondo}"/>
  <path d="M60 300c-30-80 40-170 130-150s150 60 160 150-90 150-170 130S80 360 60 300z" fill="#ffffff" opacity="0.5"/>
  <circle cx="200" cy="250" r="${r}" fill="none" stroke="${joya}" stroke-width="18"/>
  <circle cx="200" cy="${250 - r}" r="22" fill="${joya}"/>
  <circle cx="193" cy="${243 - r}" r="7" fill="#ffffff" opacity="0.7"/>
  <ellipse cx="200" cy="420" rx="100" ry="12" fill="#174B3A" opacity="0.12"/>
</svg>
`;
}
function svgLogo(fondo, texto, iniciales) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="30" fill="${fondo}"/>
  <text x="60" y="74" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-style="italic" fill="${texto}">${iniciales}</text>
</svg>
`;
}
