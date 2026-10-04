// Compara supabase/migrations/ con el historial de migraciones de Supabase: cada archivo tiene que llevar la versión que
// Supabase guardó, y cada versión de Supabase tiene que tener su archivo. Solo lee; nunca escribe en la base.
//
// Uso:
//   node scripts/revisar-migraciones.mjs lista.json
//       lista.json = lo que devuelve `list_migrations` del MCP de Supabase ({"migrations":[{version,name}]}) o un arreglo.
//   SUPABASE_ACCESS_TOKEN=… node scripts/revisar-migraciones.mjs
//       la pide a la API de administración (proyecto SUPABASE_PROJECT_REF, por defecto euihaeyfdlpvmbtfzvnt).
//
// Sale con código 1 si hay diferencias de versión. Un nombre distinto con la misma versión solo se avisa.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CARPETA = join(import.meta.dirname, "..", "supabase", "migrations");
const PROYECTO = process.env.SUPABASE_PROJECT_REF ?? "euihaeyfdlpvmbtfzvnt";

async function listaDeSupabase() {
  const archivo = process.argv[2];
  if (archivo) {
    const datos = JSON.parse(readFileSync(archivo, "utf8"));
    return Array.isArray(datos) ? datos : datos.migrations;
  }
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error("Pasa un JSON de list_migrations o define SUPABASE_ACCESS_TOKEN.");
    process.exit(2);
  }
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROYECTO}/database/migrations`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    console.error(`La API de Supabase respondió ${r.status}.`);
    process.exit(2);
  }
  const datos = await r.json();
  return Array.isArray(datos) ? datos : datos.migrations;
}

const repo = new Map();
const malos = [];
for (const archivo of readdirSync(CARPETA).filter((f) => f.endsWith(".sql")).sort()) {
  const m = /^(\d{14})_(.+)\.sql$/.exec(archivo);
  if (!m) malos.push(archivo);
  else if (repo.has(m[1])) malos.push(`${archivo} (versión repetida con ${repo.get(m[1]).archivo})`);
  else repo.set(m[1], { nombre: m[2], archivo });
}

const supabase = new Map((await listaDeSupabase()).map((m) => [String(m.version), m.name ?? ""]));

const soloRepo = [...repo.keys()].filter((v) => !supabase.has(v));
const soloSupabase = [...supabase.keys()].filter((v) => !repo.has(v));
const nombres = [...repo.entries()].filter(([v, r]) => supabase.has(v) && supabase.get(v) !== r.nombre);

console.log(`Repo: ${repo.size} migraciones · Supabase: ${supabase.size}`);
for (const f of malos) console.log(`✗ nombre de archivo que no sirve: ${f}`);
for (const v of soloRepo) console.log(`✗ en el repo y no en Supabase: ${repo.get(v).archivo}`);
for (const v of soloSupabase) console.log(`✗ en Supabase y no en el repo: ${v}_${supabase.get(v)}`);
for (const [v, r] of nombres) console.log(`· misma versión, otro nombre (solo aviso): ${r.archivo} ↔ ${supabase.get(v)}`);

const diferencias = malos.length + soloRepo.length + soloSupabase.length;
console.log(diferencias === 0 ? "✅ Cero diferencias de versión." : `❌ ${diferencias} diferencia(s).`);
process.exit(diferencias === 0 ? 0 : 1);
