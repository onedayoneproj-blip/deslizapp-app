// Ejecutar desde probar-admin-replay.sh: jamás conecta a Supabase ni a una base real.
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const { asuntosAdmin, estadoCobro } = await import("../lib/admin/reglas.ts");
const { personalizacionValida, opinionesValidas } =
  await import("../lib/admin/personalizacion.ts");
const contenedor = process.env.ADMIN_REPLAY_CONTAINER;
assert.match(
  contenedor ?? "",
  /^deslizapp-admin-replay-\d+$/,
  "Solo contenedor desechable del admin",
);
const casos = JSON.parse(
  readFileSync(
    new URL("../tests/fixtures/admin-casos.json", import.meta.url),
    "utf8",
  ),
);
const q = (v) =>
  v === null ? "null" : "'" + String(v).replaceAll("'", "''") + "'";
const sql = (s) => {
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
    { input: s, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout
    .trim()
    .split("\n")
    .filter((l) => l.startsWith("[") || l.startsWith("{"))
    .map((l) => JSON.parse(l));
};
const normalizar = (v) =>
  Array.isArray(v)
    ? v.map(normalizar)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v).map(([k, val]) => [k, normalizar(val)]),
        )
      : typeof v === "string" && /^\d{4}-\d\d-\d\d[T ]/.test(v)
        ? new Date(v).toISOString()
        : v;
let consultas =
  "begin;\ndo $$ begin if current_database()<>'replay_provisional' then raise exception 'solo replay'; end if; end $$;\n";
for (const t of casos.tiendas) {
  consultas += `insert into public.tiendas(id,nombre,slug,estado,creado_en,pagado_hasta,prueba_hasta,dias_gracia,catalogo_estado,catalogo_paso,catalogo_publicado_en,ultima_actividad_en,eliminada_en) values(${[t.id, t.nombre, "fixture-" + t.id, t.estado, t.creadoEn, t.pagadoHasta, t.pruebaHasta, t.diasGracia, t.catalogoEstado, t.catalogoPaso, t.catalogoPublicadoEn, t.ultimaActividadEn, t.estado === "eliminada" ? casos.ahora : null].map(q).join(",")});\n`;
  consultas += `update public.tiendas set catalogo_paso_en=${q(t.catalogoPasoEn)},catalogo_notas_cambios=${q(t.catalogoNotasCambios)} where id=${q(t.id)};\n`;
  for (let i = 0; i < t.productos; i++)
    consultas += `insert into public.productos(tienda_id,nombre,precio) values(${q(t.id)},'fixture',100);\n`;
  for (const s of t.solicitudes)
    consultas += `insert into public.solicitudes_pedido(tienda_id,codigo,items,total,dispositivo,creada_en,vence_en,registrada_en,descartada_en) values(${q(t.id)},${q("CASE" + t.id.slice(-6).replaceAll("0", "A").replaceAll("1", "B"))},'[]',0,'fixture',${q(s.creadaEn)},${q(s.venceEn)},${q(s.registradaEn)},${q(s.descartadaEn)});\n`;
  for (const fecha of t.pedidosEn)
    consultas += `insert into public.pedidos(tienda_id,creado_en,total) values(${q(t.id)},${q(fecha)},0);\n`;
}
const ids = casos.tiendas.map((t) => q(t.id)).join(",");
for (const uso of casos.usos) {
  const u = {
    almacenamiento_bytes: uso.almacenamientoBytes,
    base_bytes: uso.baseBytes,
  };
  consultas += `select coalesce(jsonb_agg(to_jsonb(a) order by a.prioridad,a.desde,a.clave),'[]') from public.asuntos_admin(${q(casos.ahora)},${q(JSON.stringify(u))}::jsonb) a where tienda_id in (${ids}) or tienda_id is null;\n`;
}
const personalizaciones = [
  {},
  { tema: { colores: { ink: "#123456" } } },
  { tema: { colores: { ink: "red" } } },
  { mensajes: { saludo: [] } },
  { mensajes: { saludo: ["Hola"] } },
  { tema: { fuentes: { display: "Fredoka" } } },
  { secciones: { opiniones: true } },
  { secciones: { opiniones: 1 } },
];
consultas += `select jsonb_agg(public.personalizacion_valida(v)) from jsonb_array_elements(${q(JSON.stringify(personalizaciones))}::jsonb) v;\n`;
const opiniones = [
  [],
  [{}],
  [
    {
      usuario: "A",
      fuente: "F",
      url: "https://example.invalid/a",
      texto: "Bien",
      estrellas: 5,
      traducida: false,
    },
  ],
];
consultas += `select jsonb_agg(public.opiniones_validas(v)) from jsonb_array_elements(${q(JSON.stringify(opiniones))}::jsonb) v;\n`;
consultas += `select jsonb_agg(public.estado_cobro(t.estado,t.prueba_hasta,t.pagado_hasta,t.dias_gracia,${q(casos.ahora.slice(0, 10))}::date) order by t.id) from public.tiendas t where id in (${ids});\nrollback;`;
const resultados = sql(consultas);
const quitarNombre = (a) => {
  const resto = { ...a };
  delete resto.tiendaNombre;
  return resto;
};
for (let i = 0; i < casos.usos.length; i++) {
  const esperado = asuntosAdmin(
    casos.tiendas,
    [],
    casos.usos[i],
    Date.parse(casos.ahora),
  ).map(quitarNombre);
  const real = resultados[i].map((a) => ({
    clave: a.clave,
    regla: a.regla,
    categoria: a.categoria,
    prioridad: a.prioridad,
    tiendaId: a.tienda_id,
    datos: a.datos,
    accion: a.accion,
    desde: a.desde,
  }));
  assert.deepEqual(
    normalizar(real),
    normalizar(esperado),
    `Hoy completo, uso ${i}`,
  );
}
assert.deepEqual(
  resultados.at(-3),
  personalizaciones.map(personalizacionValida),
);
assert.deepEqual(resultados.at(-2), opiniones.map(opinionesValidas));
assert.deepEqual(
  resultados.at(-1),
  casos.tiendas
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .map((t) =>
      estadoCobro(
        t.estado,
        t.pruebaHasta,
        t.pagadoHasta,
        t.diasGracia,
        casos.ahora.slice(0, 10),
      ),
    ),
);
// Quitar las condiciones: todas las reglas por tienda deben desaparecer.
// Los fixtures anteriores se revirtieron; para resolver en el MISMO ensayo se rehace el bloque de creación.
const consultaResuelta =
  consultas.slice(
    0,
    consultas.indexOf("select coalesce(jsonb_agg(to_jsonb(a)"),
  ) +
  `
update public.tiendas set pagado_hasta='2026-11-01', estado=case when estado='en_prueba' then 'activa' else estado end,
 catalogo_estado='sin',catalogo_paso=null,ultima_actividad_en=${q(casos.ahora)},creado_en=${q(casos.ahora)} where id in (${ids});
update public.solicitudes_pedido set descartada_en=${q(casos.ahora)} where tienda_id in (${ids});
select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.asuntos_admin(${q(casos.ahora)},'{"almacenamiento_bytes":0,"base_bytes":0}'::jsonb) a where tienda_id in (${ids});
rollback;`;
assert.deepEqual(sql(consultaResuelta)[0], []);
const hashes =
  sql(`select jsonb_agg(to_jsonb(f) order by nombre,argumentos) from (
 select p.proname as nombre,pg_get_function_identity_arguments(p.oid) as argumentos,md5(pg_get_functiondef(p.oid)) as md5,p.prosecdef as definer,p.proconfig as configuracion,has_function_privilege('anon',p.oid,'EXECUTE') as anon,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated
 from pg_proc p where p.pronamespace='public'::regnamespace and (p.proname ~ '^admin_' or p.proname in ('soy_admin','tiendas_que_miro','reglas_admin','regla_admin','estado_cobro','asuntos_admin','salud_tiendas','pedir_retoque','gastar_creditos','marcar_actividad'))
) f;`)[0];
assert.deepEqual(
  hashes,
  JSON.parse(
    readFileSync(
      new URL(
        "../tests/fixtures/admin-funciones-produccion.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
  "Cuerpos y permisos del replay coinciden con producción",
);
console.log(
  `Paridad TS/Postgres: ${casos.tiendas.length} escenarios × ${casos.usos.length} usos; claves, datos, prioridades, acciones, fechas, cobro y personalización OK; condiciones resueltas sin asuntos; ${hashes.length} funciones coinciden con producción`,
);
