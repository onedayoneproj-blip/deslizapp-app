import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
const E = await import("../lib/equipo.ts");
const C = await import("../lib/auth/canje.ts");
const R = await import("../lib/retoque-al-subir.ts");
const { traducirErrorSupabase, SinPermiso } = await import("../lib/data/errores.ts");
const D = await import("../lib/data/equipo-demo.ts");
const U = await import("../lib/data/unirse.ts");

const NIVELES = ["ayudante", "editor", "administrador"];
const GRUPOS = ["ventas", "catalogo", "creditos", "marca", "compras", "equipo"];

test("el mapa nivel → grupo de la app es el mismo de la base (nivel_tiene_grupo)", () => {
  const archivo = readdirSync(new URL("../supabase/migrations/", import.meta.url)).find((f) => f.endsWith("_permisos_niveles.sql"));
  assert.ok(archivo, "falta la migración de permisos");
  const sql = readFileSync(new URL(`../supabase/migrations/${archivo}`, import.meta.url), "utf8");
  const cuerpo = sql.slice(sql.indexOf("create function public.nivel_tiene_grupo"), sql.indexOf("comment on function public.nivel_tiene_grupo"));
  // De cada `when 'grupo' then ...` se saca qué niveles tienen ese grupo.
  const enSql = {};
  for (const m of cuerpo.matchAll(/when '(\w+)'\s+then (.+)/g)) enSql[m[1]] = NIVELES.filter((n) => m[2].includes(`'${n}'`));
  for (const g of GRUPOS) {
    const enApp = NIVELES.filter((n) => E.nivelTieneGrupo(n, g));
    assert.deepEqual(enApp, enSql[g] ?? [], `grupo ${g}`);
  }
  assert.deepEqual(enSql.equipo, undefined, "equipo nunca es de un colaborador");
});

test("niveles: lo que cada uno puede y no puede (tabla del prompt)", () => {
  const p = (nivel) => ({ rol: "staff", nivel });
  assert.equal(E.puede(p("ayudante"), "ventas"), true);
  assert.equal(E.puede(p("ayudante"), "catalogo"), false);
  assert.equal(E.puede(p("editor"), "catalogo"), true);
  assert.equal(E.puede(p("editor"), "creditos"), false);
  assert.equal(E.puede(p("editor"), "marca"), false);
  assert.equal(E.puede(p("administrador"), "creditos"), true);
  assert.equal(E.puede(p("administrador"), "marca"), true);
  assert.equal(E.puede(p("administrador"), "equipo"), false, "ni el Administrador maneja el equipo");
  for (const g of GRUPOS) assert.equal(E.puede(E.PERMISO_DUENO, g), true, `la dueña: ${g}`);
  assert.equal(E.puede(null, "creditos"), true, "sin saber todavía no se apaga: decide la base");
});

test("enlace y mensaje: solo /unirse lleva el código; voz sin signos de exclamación", () => {
  assert.equal(E.urlUnirse("https://deslizapp.app/", "abc_DEF-123"), "https://deslizapp.app/unirse/abc_DEF-123");
  const m = E.mensajeInvitacion("Esencias Michel", "https://x/unirse/c");
  assert.match(m, /Esencias Michel/);
  assert.match(m, /https:\/\/x\/unirse\/c$/);
  assert.doesNotMatch(m, /[!¡]/);
  assert.equal(E.textoVence(new Date(Date.now() + 3 * 86400000 - 1000).toISOString()), "vence en 3 días");
  assert.equal(E.textoVence(new Date(Date.now() - 1000).toISOString()), "vence hoy");
  assert.equal(E.correoValido("ana@gmail.com"), true);
  assert.equal(E.correoValido("ana@"), false);
  assert.equal(E.inicialesPersona("Ana María Rosario", ""), "AR");
  assert.equal(E.inicialesPersona("", "pedro@x.com"), "P");
});

test("vuelta de Google: /unirse sí, sin código; lo demás igual que antes", () => {
  assert.equal(C.vueltaPermitida("/unirse"), "/unirse");
  assert.equal(C.vueltaPermitida(encodeURIComponent("/unirse")), "/unirse");
  for (const malo of ["/unirse/abc", "/unirse?c=1", "//unirse", "https://x/unirse", "/unirse/../admin"]) assert.equal(C.vueltaPermitida(malo), null, malo);
  assert.equal(C.destinoGoogle("/unirse", false), "/unirse");
  assert.equal(C.destinoGoogle("/unirse", true), "/unirse?error_login=1");
  assert.equal(new URL(C.callbackGoogle("https://x", "/unirse")).searchParams.get("volver"), "/unirse");
});

test("el código del enlace: formato base64url de 30 a 60", () => {
  assert.equal(U.CODIGO_VALIDO.test("a".repeat(43)), true);
  assert.equal(U.CODIGO_VALIDO.test("abc-_DEF".repeat(5)), true);
  assert.equal(U.CODIGO_VALIDO.test("corto"), false);
  assert.equal(U.CODIGO_VALIDO.test("con espacio ".repeat(4)), false);
  assert.equal(U.CODIGO_VALIDO.test("a/b".repeat(15)), false);
});

test("la base dice sin_permiso: la app lo explica igual que la pantalla", () => {
  const e = traducirErrorSupabase({ code: "42501", message: "sin_permiso", hint: "Esto lo hace quien administra la tienda." });
  assert.ok(e instanceof SinPermiso);
  assert.equal(e.message, E.TEXTO_SIN_PERMISO);
  const rls = traducirErrorSupabase({ code: "42501", message: 'new row violates row-level security policy "permiso_catalogo_productos_insert" for table "productos"' });
  assert.ok(rls instanceof SinPermiso);
  assert.match(rls.message, /quien administra la tienda/);
});

test("retoque: sin el grupo créditos el interruptor se apaga con su porqué", () => {
  const r = R.estadoInterruptor({ soloMirar: false, sinPermiso: true, libres: 100, marcadas: 0, estaMarcada: false, marcaLista: true });
  assert.deepEqual(r, { deshabilitado: true, motivo: E.TEXTO_SIN_PERMISO });
  const ok = R.estadoInterruptor({ soloMirar: false, sinPermiso: false, libres: 100, marcadas: 0, estaMarcada: false, marcaLista: true });
  assert.equal(ok.deshabilitado, false);
});

test("demo: equipo de ejemplo y operaciones; mirando como colaborador, nada del equipo", () => {
  const db = { tiendas: [{ id: "t1" }, { id: "t2" }], usuarios: [{ id: "u1", tiendaId: "t1", rol: "dueno", nombre: "Michel", email: "m@x.com" }], equipos: {}, nivelDemo: "dueno" };
  const eq = D.equipoEnDB(db, "t1");
  assert.equal(eq.miembros.filter((m) => m.rol === "staff").length, 2, "dos colaboradores de ejemplo");
  assert.deepEqual(eq.miembros.filter((m) => m.rol === "staff").map((m) => m.nivel).sort(), ["ayudante", "editor"]);
  assert.equal(eq.solicitudes.length, 1, "la primera tienda trae una solicitud esperando");
  assert.equal(D.equipoEnDB(db, "t2").solicitudes.length, 0);
  let paso = D.aprobarEnDB(db, "t1", eq.solicitudes[0].id, "editor", Date.now());
  assert.equal(D.equipoEnDB(paso, "t1").miembros.length, 4);
  assert.equal(D.equipoEnDB(paso, "t1").solicitudes.length, 0);
  const r = D.crearEnlaceEnDB(paso, "t1", "administrador", "Para Ana", "id-1", Date.now());
  assert.match(r.codigo, /^demo-/);
  assert.equal(D.equipoEnDB(r.db, "t1").enlaces.length, 1);
  paso = D.cancelarEnlaceEnDB(r.db, "t1", "id-1");
  assert.equal(D.equipoEnDB(paso, "t1").enlaces.length, 0);
  const carla = D.equipoEnDB(paso, "t1").miembros.find((m) => m.nombre === "Carla Méndez");
  paso = D.cambiarNivelEnDB(paso, "t1", carla.usuarioId, "administrador");
  assert.equal(D.equipoEnDB(paso, "t1").miembros.find((m) => m.usuarioId === carla.usuarioId).nivel, "administrador");
  assert.throws(() => D.quitarEnDB(paso, "t1", "u1"), /dueña/);
  paso = D.quitarEnDB(paso, "t1", carla.usuarioId);
  assert.equal(D.equipoEnDB(paso, "t1").miembros.some((m) => m.usuarioId === carla.usuarioId), false);
  // Mirando como Editor: no maneja el equipo.
  const comoEditor = { ...paso, nivelDemo: "editor" };
  assert.deepEqual(D.permisoDemo(comoEditor), { rol: "staff", nivel: "editor" });
  assert.throws(() => D.crearEnlaceEnDB(comoEditor, "t1", "ayudante", null, "id-2", Date.now()), /quien administra/);
  assert.throws(() => D.invitarCorreoEnDB(paso, "t1", "no-es-correo", "ayudante", Date.now()), /correo/);
});

test("demo: mirando como Ayudante, las operaciones de catálogo, créditos y marca no corren ni cambian nada", async () => {
  let llamadas = 0;
  const base = Object.fromEntries(Object.keys(D.GRUPO_DE_OPERACION).map((n) => [n, async () => { llamadas++; return "hecho"; }]));
  base.getProductos = async () => "lectura";
  base.crearPedidoManual = async () => { llamadas++; return "pedido"; };
  const db = (nivelDemo) => ({ nivelDemo });
  const comoAyudante = D.conPermisosDeLaDemo(base, () => db("ayudante"));
  for (const n of Object.keys(D.GRUPO_DE_OPERACION)) await assert.rejects(() => comoAyudante[n](), /quien administra/, n);
  assert.equal(llamadas, 0, "ninguna operación escribió");
  assert.equal(await comoAyudante.getProductos(), "lectura", "las lecturas pasan");
  assert.equal(await comoAyudante.crearPedidoManual(), "pedido", "ventas sí (Ayudante)");
  // Editor: catálogo sí, créditos y marca no. Administrador: todo.
  const comoEditor = D.conPermisosDeLaDemo(base, () => db("editor"));
  assert.equal(await comoEditor.ajustarStock(), "hecho");
  await assert.rejects(() => comoEditor.pedirRetoque(), /quien administra/);
  await assert.rejects(() => comoEditor.guardarMarcaRetoque(), /quien administra/);
  const comoAdmin = D.conPermisosDeLaDemo(base, () => db("administrador"));
  for (const n of Object.keys(D.GRUPO_DE_OPERACION)) assert.equal(await comoAdmin[n](), "hecho", n);
  const comoDuena = D.conPermisosDeLaDemo(base, () => db("dueno"));
  assert.equal(await comoDuena.eliminarProducto(), "hecho");
});
