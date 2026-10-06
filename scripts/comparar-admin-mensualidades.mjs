// Solo PostgreSQL desechable. Las modificaciones de reloj/defaults se revierten.
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  casosMensualidad,
  esperado,
} from "../tests/fixtures/admin-mensualidades.mjs";
const { crearEstadoAdminDemo } = await import("../lib/data/admin/seed.ts");
const { crearFuenteAdminDemo } = await import("../lib/data/admin/demo.ts");
const contenedor = process.env.ADMIN_REPLAY_CONTAINER;
assert.match(contenedor ?? "", /^deslizapp-admin-replay-\d+$/);
const admin = "ad000000-0000-4000-8000-000000000001",
  tienda = "ad000000-0000-4000-8000-000000000002";
const literal = (v) =>
  v === null ? "null" : "'" + String(v).replaceAll("'", "''") + "'";
let sql = "";
const esperados = [];
for (const caso of casosMensualidad) {
  const e = crearEstadoAdminDemo(Date.parse(caso.reloj)),
    t = e.panel.tiendas[0];
  t.pagadoHasta = caso.previa;
  let reloj = Date.parse(caso.reloj);
  const f = crearFuenteAdminDemo(e, () => reloj),
    ids = [],
    vigentes = new Set(),
    salidas = [];
  sql += `begin;
do $$ begin if current_database()<>'replay_provisional' then raise exception 'solo replay';end if;end $$;
select set_config('admin_test.reloj',${literal(caso.reloj)},true);
create or replace function public.hoy_rd() returns date language sql stable set search_path='' as $$ select (current_setting('admin_test.reloj')::timestamptz at time zone 'America/Santo_Domingo')::date $$;
alter table public.pagos alter column creado_en set default current_setting('admin_test.reloj')::timestamptz;
insert into auth.users(id,email) values('${admin}','paridad@prueba.invalid');
insert into public.admins(usuario_id,email) values('${admin}','paridad@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado,pagado_hasta) values('${tienda}','Paridad fixture','paridad-fixture','activa',${literal(caso.previa)});
select set_config('request.jwt.claim.sub','${admin}',true);
set local role authenticated;
do $caso$
declare ids uuid[]; v jsonb; resultados jsonb='[]'; begin
`;
  for (const paso of caso.acciones) {
    const instante =
      paso > 0
        ? (caso.fechasPorPago?.[paso] ?? caso.reloj)
        : (caso.anulacionEn ?? caso.reloj);
    reloj = Date.parse(instante);
    sql += `perform set_config('admin_test.reloj',${literal(instante)},true);\n`;
    let r;
    if (paso > 0) {
      r = await f.registrarPago({
        tiendaId: t.id,
        concepto: "mensualidad",
        monto: 1000,
        metodo: "efectivo",
        meses: caso.meses[paso - 1],
      });
      ids[paso] = r.pago.id;
      vigentes.add(paso);
      sql += `v:=public.admin_registrar_pago('${tienda}','mensualidad',1000,'efectivo',p_meses=>${caso.meses[paso - 1]}); ids[${paso}]:=(v->'pago'->>'id')::uuid;\n`;
    } else {
      r = await f.anularPago(ids[-paso], "fixture");
      vigentes.delete(-paso);
      sql += `v:=public.admin_anular_pago(ids[${-paso}],'fixture');\n`;
    }
    assert.equal(r.pagadoHasta, esperado(caso, vigentes));
    salidas.push(r.pagadoHasta);
    sql += `resultados:=resultados||jsonb_build_array(v->'pagado_hasta');\n`;
  }
  esperados.push(salidas);
  sql += `perform set_config('admin_test.resultado',resultados::text,true);end $caso$;
select current_setting('admin_test.resultado');rollback;\n`;
}
const r = spawnSync(
  "docker",
  [
    "exec",
    "-i",
    contenedor,
    "psql",
    "-U",
    "postgres",
    "-d",
    "replay_provisional",
    "-v",
    "ON_ERROR_STOP=1",
    "-qAt",
  ],
  { input: sql, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
assert.equal(r.status, 0, r.stderr);
const actual = r.stdout
  .split("\n")
  .filter((l) => l.startsWith("["))
  .map((l) => JSON.parse(l));
assert.deepEqual(actual, esperados);
console.log(
  `Mensualidades: ${actual.length} secuencias completas SQL = demo = calendario independiente.`,
);
