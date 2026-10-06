import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const { REGLAS_ADMIN, estadoCobro, asuntosAdmin, saludTienda, sumarMeses } =
  await import("../lib/admin/reglas.ts");
const { personalizacionValida, mezclarJson, opinionesValidas } =
  await import("../lib/admin/personalizacion.ts");
const sql = readFileSync(
  new URL(
    "../supabase/migrations/20261006012533_admin_creditos_pagos_retoque.sql",
    import.meta.url,
  ),
  "utf8",
);
test("umbrales idénticos a los statements aplicados", () => {
  const bloque = sql.slice(
    sql.indexOf("-- REGLAS_ADMIN_INICIO"),
    sql.indexOf("-- REGLAS_ADMIN_FIN"),
  );
  assert.deepEqual(
    REGLAS_ADMIN,
    JSON.parse(
      bloque.slice(
        bloque.indexOf("select ('") + 9,
        bloque.indexOf("')::jsonb"),
      ),
    ),
  );
});
test("cobro: límites civiles, gracia, prueba con/sin fecha, precio null y mes recortado", () => {
  const hoy = "2026-10-06";
  for (const [fecha, esperado] of [
    ["2026-10-10", "al_dia"],
    ["2026-10-09", "vence_pronto"],
    [hoy, "vence_pronto"],
    ["2026-10-05", "en_gracia"],
    ["2026-10-01", "en_gracia"],
    ["2026-09-30", "vencida"],
    [null, "sin_plan"],
  ])
    assert.equal(estadoCobro("activa", null, fecha, 5, hoy), esperado);
  assert.equal(estadoCobro("en_prueba", null, null, 5, hoy), "en_prueba");
  assert.equal(estadoCobro("en_prueba", hoy, null, 5, hoy), "en_prueba");
  assert.equal(
    estadoCobro("en_prueba", "2026-10-05", null, 5, hoy),
    "sin_plan",
  );
  assert.equal(sumarMeses("2026-01-31", 1), "2026-02-28");
  assert.equal(sumarMeses("2028-01-31", 1), "2028-02-29");
});
test("personalización: merge conserva claves, null elimina y validación equivalente", () => {
  assert.deepEqual(
    mezclarJson(
      {
        tema: { colores: { ink: "#000000", bg: "#ffffff" } },
        mensajes: { saludo: "hola" },
      },
      { tema: { colores: { ink: null } } },
    ),
    { tema: { colores: { bg: "#ffffff" } }, mensajes: { saludo: "hola" } },
  );
  for (const v of [
    {},
    { tema: { colores: { "accent-soft": "#abC123" } } },
    { mensajes: { saludo: ["Hola", "Bienvenida"] } },
    { secciones: { opiniones: false } },
  ])
    assert.equal(personalizacionValida(v), true);
  for (const v of [
    null,
    { tema: { colores: { ink: "red" } } },
    { tema: { fuentes: { display: "Fredoka" } } },
    { mensajes: { saludo: "" } },
    { secciones: { opiniones: "sí" } },
  ])
    assert.equal(personalizacionValida(v), false);
  assert.equal(opinionesValidas([]), true);
  assert.equal(
    opinionesValidas([
      {
        usuario: "A",
        fuente: "F",
        url: "https://example.invalid",
        texto: "Bueno",
        estrellas: 5,
        traducida: false,
      },
    ]),
    true,
  );
  assert.equal(opinionesValidas([{ usuario: "A" }]), false);
});
test("salud respeta prioridad; quieta es el fallback real del SQL", () => {
  const ahora = Date.parse("2026-10-06T12:00:00Z"),
    t = {
      id: "t",
      nombre: "T",
      estado: "activa",
      creadoEn: "2026-10-01",
      pagadoHasta: null,
      pruebaHasta: null,
      diasGracia: 5,
      catalogoEstado: "solicitado",
      catalogoPaso: null,
      catalogoPasoEn: "2026-10-01",
      catalogoNotasCambios: null,
      catalogoPublicadoEn: null,
      ultimaActividadEn: "2026-10-06",
      productos: 0,
      solicitudes: [],
      pedidosEn: [],
      aaahsEn: [],
    };
  const a = asuntosAdmin(
    [t],
    [],
    { almacenamientoBytes: 0, baseBytes: 0 },
    ahora,
  );
  assert.equal(saludTienda(t, a, [], ahora), "te_necesita");
  assert.equal(saludTienda(t, [], [], ahora), "esperando_equipo");
  assert.equal(
    saludTienda({ ...t, catalogoEstado: "sin" }, [], [], ahora),
    "quieta",
  );
  assert.equal(
    saludTienda(
      { ...t, catalogoEstado: "sin", pedidosEn: ["2026-10-06"] },
      [],
      [],
      ahora,
    ),
    "viva",
  );
});
