// La página principal de deslizapp.com (`/` sin sesión, components/inicio-publico) y la landing en /conoce
// (docs/prompts/pagina-principal-y-conoce.md). Uso: con la app corriendo (npm run dev), `node scripts/probar-inicio.mjs [url]`.
// Con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (las públicas de .env.example), o con FOTOS_TIENDA (un JSON con
// las URL), comprueba también que las fotos del feed son las de la tienda `deslizapp`; contra la vista previa de Vercel, la URL va
// como argumento. CAPTURAS=1 guarda docs/capturas/inicio/.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const playwright = require("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const capturas = process.env.CAPTURAS === "1";
const nav = await playwright.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {});
let fallos = 0;
const ok = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    fallos++;
    console.log("  ✗", msg);
  }
};

// Las fotos que debería mostrar: la primera de cada producto activo de la tienda `deslizapp` (lo mismo que lee el catálogo público).
let esperadas = null;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const LLAVE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (SUPABASE_URL && LLAVE) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/catalogo_publico`, {
    method: "POST",
    headers: { apikey: LLAVE, Authorization: `Bearer ${LLAVE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: "deslizapp" }),
  }).catch(() => null);
  const datos = r?.ok ? await r.json() : null;
  const productos = datos?.productos ?? null;
  if (productos) esperadas = productos.map((p) => (p.medios ?? []).find((m) => m.tipo === "foto")?.url).filter(Boolean);
}
// Si este equipo no llega a Supabase: la lista en un JSON (FOTOS_TIENDA=ruta), sacada con la misma consulta.
if (!esperadas && process.env.FOTOS_TIENDA) esperadas = JSON.parse((await import("node:fs")).readFileSync(process.env.FOTOS_TIENDA, "utf8"));

/** La URL original de una foto que pasó por next/image. */
const original = (src) => {
  try {
    const u = new URL(src, base);
    return u.pathname === "/_next/image" ? decodeURIComponent(u.searchParams.get("url") ?? "") : u.pathname;
  } catch {
    return src;
  }
};

const medir = (pagina) =>
  pagina.evaluate(() => {
    const ini = document.querySelector(".ini");
    const lema = document.querySelector(".ini-lema");
    const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.left >= -1; };
    return {
      visible: !!ini && getComputedStyle(ini).visibility === "visible",
      lineas: lema ? lema.getBoundingClientRect().height / parseFloat(getComputedStyle(lema).lineHeight) : 0,
      cabe: lema ? lema.scrollWidth <= lema.clientWidth : false,
      lema: lema?.textContent,
      fotos: [...document.querySelectorAll(".ini-foto img")].map((i) => i.currentSrc || i.src),
      columnas: [...document.querySelectorAll(".ini-columna")].filter((c) => getComputedStyle(c).display !== "none").length,
      botones: ["iniciar-sesion", "como-funciona", "vender"].every((k) => visible(document.querySelector(`[data-cta="${k}"]`))),
      vender: { href: document.querySelector('[data-cta="vender"]')?.getAttribute("href"), target: document.querySelector('[data-cta="vender"]')?.getAttribute("target") },
      como: document.querySelector('[data-cta="como-funciona"]')?.getAttribute("href"),
      tema: document.querySelector('meta[name="theme-color"]')?.content,
      sinScroll: document.documentElement.scrollWidth <= innerWidth,
      google: !!document.querySelector('[data-cta="iniciar-sesion"] svg path[fill="#4285F4"]'),
    };
  });
const transformes = (pagina) => pagina.evaluate(() => [...document.querySelectorAll(".ini-tira")].map((t) => getComputedStyle(t).transform));

for (const [ancho, alto] of [
  [360, 640],
  [393, 852],
  [430, 932],
  [1440, 900],
]) {
  console.log(`\n${ancho}×${alto}`);
  const contexto = await nav.newContext({ viewport: { width: ancho, height: alto } });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("pageerror", (e) => errores.push(e.message));
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await pagina.waitForTimeout(800);
  const m = await medir(pagina);
  ok(m.visible && (await pagina.locator(".lt-escenario").count()) === 0, "/ sin sesión muestra la página principal (no la landing)");
  ok(Math.abs(m.lineas - 4) < 0.05 && m.cabe && /Comprar sin\s*tanta vuelta\.\s*Vender con\s*más orden\./.test(m.lema ?? ""), `el lema en cuatro líneas, sin partirse (${m.lineas.toFixed(2)})`);
  ok(m.columnas === (ancho >= 900 ? 6 : 3), `${m.columnas} columnas de fotos`);
  const fotos = [...new Set(m.fotos.map(original))];
  if (esperadas) ok(esperadas.length >= 6 ? fotos.length === esperadas.length && fotos.every((f) => esperadas.includes(f)) : fotos.length >= 6, `las fotos son las de la tienda deslizapp (${fotos.length} de ${esperadas.length})`);
  else ok(fotos.length >= 3 && fotos.every((f) => f.startsWith("/landing/feed-")), `sin Supabase, las fotos de respaldo (${fotos.length})`);
  ok(m.botones && m.google, "«Iniciar sesión» (con la G de Google), «Cómo funciona» y «Quiero vender» a la vista");
  ok(m.vender.href === "https://instagram.com/deslizapp" && m.vender.target === "_blank" && m.como === "/conoce", "«Quiero vender» abre el Instagram y «Cómo funciona» lleva a /conoce");
  ok(m.tema === "#174b3a" || m.tema === "rgb(23, 75, 58)", `theme-color verde Bosque (${m.tema})`);
  ok(m.sinScroll, "sin scroll horizontal");
  // Lo vivo: las columnas suben, sale la burbuja y luego el corazón.
  const t0 = await transformes(pagina);
  let corazon = false;
  const burbujas = new Set();
  for (let k = 0; k < 18; k++) {
    const v = await pagina.evaluate(() => ({ c: !!document.querySelector(".ini-latido"), b: document.querySelector(".ini-burbuja")?.dataset.burbujaInicio }));
    corazon ||= v.c;
    if (v.b) burbujas.add(v.b);
    await pagina.waitForTimeout(500);
  }
  const t1 = await transformes(pagina);
  ok(t0.some((t, k) => t !== t1[k]), "las columnas suben solas");
  ok(corazon && burbujas.size >= 2, `aparecen el corazón «aaah» y las burbujas (${burbujas.size} distintas)`);
  const iconos = await pagina.evaluate(() => [...document.querySelectorAll(".ini-burbuja-icono svg")].length);
  ok(iconos === 1, "la burbuja lleva su icono de la app");
  if (capturas && (ancho === 393 || ancho === 1440)) {
    mkdirSync("docs/capturas/inicio", { recursive: true });
    await pagina.evaluate(() => document.querySelectorAll(".ini-tira").forEach((t) => (t.style.animationPlayState = "paused")));
    await pagina.screenshot({ path: `docs/capturas/inicio/inicio-${ancho}.png` });
  }
  // «Cómo funciona» lleva a la landing.
  await pagina.locator('[data-cta="como-funciona"]').click();
  await pagina.waitForURL("**/conoce");
  await pagina.locator(".lt-escenario").waitFor();
  ok(true, "«Cómo funciona» abre /conoce con la landing");
  ok(errores.length === 0, `sin errores de la página${errores.length ? ": " + errores.join(" | ") : ""}`);
  await contexto.close();
}

console.log("\n«Iniciar sesión» hace lo mismo que «Entrar con Google» de /entrar");
{
  const flujo = async (ruta, boton) => {
    const contexto = await nav.newContext({ viewport: { width: 393, height: 852 } });
    const pagina = await contexto.newPage();
    let destino = null;
    // No se sale a Google: se mira a dónde iba.
    await pagina.route(/\/auth\/v1\/authorize/, (r) => {
      destino = r.request().url();
      return r.fulfill({ contentType: "text/html", body: "Google" });
    });
    await pagina.goto(base + ruta, { waitUntil: "networkidle" });
    await pagina.getByRole("button", { name: boton, exact: true }).click();
    await pagina.waitForTimeout(2500);
    const aviso = await pagina.locator('[role="alert"]').first().textContent().catch(() => null);
    const modo = await pagina.evaluate(() => localStorage.getItem("deslizapp-modo-v1")).catch(() => null);
    await contexto.close();
    const u = destino ? new URL(destino) : null;
    return { proveedor: u?.searchParams.get("provider") ?? null, vuelta: u ? new URL(u.searchParams.get("redirect_to") ?? "x:").pathname : null, aviso, modo };
  };
  const inicio = await flujo("/", "Iniciar sesión");
  const entrar = await flujo("/entrar", "Entrar con Google");
  ok(JSON.stringify(inicio) === JSON.stringify(entrar), `el mismo flujo (${JSON.stringify(inicio)})`);
  if (SUPABASE_URL) ok(inicio.proveedor === "google" && inicio.vuelta === "/auth/callback", "sale a Google y vuelve por /auth/callback");
}

console.log("\nMovimiento reducido: nada se mueve");
{
  const contexto = await nav.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: "reduce" });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  await pagina.waitForTimeout(600);
  const t0 = await transformes(pagina);
  let corazon = false;
  const burbujas = new Set();
  for (let k = 0; k < 10; k++) {
    const v = await pagina.evaluate(() => ({ c: !!document.querySelector(".ini-latido"), b: document.querySelector(".ini-burbuja")?.dataset.burbujaInicio, n: document.querySelectorAll(".ini-burbuja").length }));
    corazon ||= v.c;
    if (v.b) burbujas.add(`${v.b}/${v.n}`);
    await pagina.waitForTimeout(500);
  }
  const t1 = await transformes(pagina);
  const opacidad = await pagina.evaluate(() => Number(getComputedStyle(document.querySelector(".ini-burbuja")).opacity));
  ok(t0.every((t, k) => t === t1[k]), "las columnas quietas");
  ok(!corazon && burbujas.size === 1 && opacidad === 1, "sin corazones y una sola burbuja fija");
  if (capturas) await pagina.screenshot({ path: "docs/capturas/inicio/movimiento-reducido-393.png" });
  await contexto.close();
}

console.log("\nCon sesión (la demo elegida) y enlaces viejos");
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 } });
  await contexto.addInitScript(() => localStorage.setItem("deslizapp-modo-v1", "demo"));
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/", { waitUntil: "networkidle" });
  await pagina.getByRole("navigation", { name: "Secciones" }).waitFor({ timeout: 15000 }).catch(() => {});
  ok(await pagina.getByRole("navigation", { name: "Secciones" }).isVisible(), "/ con sesión abre el panel");
  ok(!(await pagina.locator(".ini").isVisible()), "y no la página principal");
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  ok(await pagina.locator(".lt-escenario").isVisible(), "/conoce muestra la landing también con sesión");
  ok(!(await pagina.getByRole("navigation", { name: "Secciones" }).isVisible()), "y no redirige al panel");
  await contexto.close();
}
{
  const contexto = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const pagina = await contexto.newPage();
  await pagina.goto(base + "/#paso-hola", { waitUntil: "networkidle" });
  await pagina.waitForURL("**/conoce#paso-hola").catch(() => {});
  ok(new URL(pagina.url()).pathname === "/conoce" && new URL(pagina.url()).hash === "#paso-hola", `un enlace viejo a un paso (/#paso-hola) llega a /conoce#paso-hola (${pagina.url()})`);
  // Con sesión (la demo), igual.
  await pagina.evaluate(() => localStorage.setItem("deslizapp-modo-v1", "demo"));
  await pagina.goto(base + "/#cierre", { waitUntil: "networkidle" });
  await pagina.waitForURL("**/conoce#cierre").catch(() => {});
  ok(new URL(pagina.url()).pathname === "/conoce", `con sesión, un enlace viejo (/#cierre) también llega a /conoce (${pagina.url()})`);
  await pagina.evaluate(() => localStorage.removeItem("deslizapp-modo-v1"));
  await pagina.goto(base + "/conoce", { waitUntil: "networkidle" });
  await pagina.locator('[data-cta="entrar"]').evaluate((a) => a.click());
  await pagina.waitForURL("**/entrar");
  ok(await pagina.getByRole("button", { name: /Entrar con Google/ }).isVisible(), "«Entrar» de /conoce lleva a /entrar");
  await contexto.close();
}

await nav.close();
console.log(fallos ? `\n${fallos} fallo${fallos === 1 ? "" : "s"}` : "\nTodo bien");
process.exit(fallos ? 1 : 0);
