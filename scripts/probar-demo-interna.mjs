// Ejecuta suites históricas en una COPIA TEMPORAL sin credenciales ni conexiones reales.
// Auth.getUser se sustituye allí por Lewis ficticio; el guard de identidad de producción se conserva.
// No agrega flags ni rutas de autorización de pruebas a la app desplegable.
import { cpSync, mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { spawn } from "node:child_process";
const origen = process.cwd(), copia = mkdtempSync(join(tmpdir(), "deslizapp-interna-"));
const suites = process.argv.slice(2);
if (!suites.length) throw new Error("Indica suites internas: probar-selector-tiendas.mjs probar-equipo.mjs …");
const puerto = Number(process.env.PUERTO_INTERNO ?? 3301), url = `http://localhost:${puerto}`;
const cambiar = (p, f) => { const ruta = join(copia, p); writeFileSync(ruta, f(readFileSync(ruta, "utf8"))); };
const ejecutar = (cmd, args, env) => new Promise((resolve, reject) => { const p = spawn(cmd, args, { cwd: copia, env, stdio: "inherit" }); p.on("error", reject); p.on("exit", code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")}: ${code}`))); });
let servidor;
try {
 cpSync(origen, copia, { recursive: true, filter: p => p === origen || ![".git", ".next", "node_modules", "referencias", "docs"].includes(basename(p)) && !basename(p).startsWith(".env") });
 symlinkSync(join(origen, "node_modules"), join(copia, "node_modules"), "dir");
 mkdirSync(join(copia, "lib/demo"), { recursive: true });
 writeFileSync(join(copia, "lib/demo/auth-fixture-local.ts"), 'export async function createClient(){return {auth:{getUser:async()=>({data:{user:{id:"lewis-auth-fixture",identities:[{provider:"google"}]}},error:null})}}}\n');
 cambiar("lib/demo/acceso-servidor.ts", s => s.replace('"../supabase/server"', '"./auth-fixture-local"').replace('import { HAY_SUPABASE } from "../supabase/config";', 'const HAY_SUPABASE = true;'));
 cambiar("lib/data/provider.tsx", s => s.replace('if (sesion.tipo === "demo") return <ProveedorDemo ', 'if (sesion.tipo === "demo") return <ProveedorDemo interna '));
 cambiar("lib/data/publica.ts", s => s.replace('if (demo && interna)', 'if (demo)').replace('interna ? (await import("./demo-interna")).demoInterna : await import("./demo")', '(await import("./demo-interna")).demoInterna'));
 cambiar("components/pedido-catalogo/tienda-en-pedido.tsx", s => s.replace('interna = false', 'interna = true'));
 for (const ruta of ["app/tienda/[slug]/page.tsx", "app/pedido/[codigo]/page.tsx"]) cambiar(ruta, s => s.replaceAll('consulta.demo === "interna"', '"demo" in consulta'));
 // Fixtures de otras suites importan explícitamente el almacén interno.
 cambiar("lib/data/demo-interna.ts", s => s + '\nexport const { fuenteDemo, leerDemo, suscribirDemo, cambiarTiendaActivaDemo, tiendaDeSolicitudDemo } = demoInterna;\n');
 for (const ruta of ["tests/fixtures/espera-page.txt", "tests/fixtures/visibilidad-page.txt"]) cambiar(ruta, s => s.replaceAll('@/lib/data/demo"', '@/lib/data/demo-interna"'));
 const env = { ...process.env, DEMO_INTERNAL_AUTH_USER_ID: "lewis-auth-fixture", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", URL: url, BASE_URL: url };
 for (const key of Object.keys(env)) if (/TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key)) delete env[key];
 servidor = spawn(process.execPath, [join(copia, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", String(puerto)], { cwd: copia, env, stdio: ["ignore", "pipe", "pipe"] });
 const log = [];
 servidor.stdout.on("data", b => log.push(String(b))); servidor.stderr.on("data", b => log.push(String(b)));
 for (let i = 0; ; i++) { if (servidor.exitCode !== null) throw new Error("Servidor de fixtures terminó: " + log.join("")); if (i > 120) throw new Error("Servidor de fixtures no listo\n" + log.slice(-5).join("")); try { if ((await fetch(url + "/entrar")).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }
 for (const suite of suites) { console.log(`\nSuite interna con Auth fixture: ${suite}`); await ejecutar(process.execPath, [join("scripts", suite)], env); }
 console.log("✓ Suites internas, sin cuentas ni servicios reales.");
} finally {
 if (servidor && servidor.exitCode === null) { const fin = new Promise(r => servidor.once("exit", r)); servidor.kill("SIGTERM"); await fin; }
 rmSync(copia, { recursive: true, force: true });
}
