// Detalles por rubro: lib/rubros.ts y la base (public.campos_de_rubro en la migración 1) tienen la misma lista.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { camposComoEnLaBase, detallesValidos } from "../lib/rubros.ts";

const migracion = readFileSync(new URL("../supabase/migrations/20261004010000_productos_slug_tipo_medios_detalles.sql", import.meta.url), "utf8");

test("la lista de lib/rubros.ts es la misma que la de campos_de_rubro", () => {
  const bloque = migracion.slice(migracion.indexOf("-- CAMPOS_RUBRO_INICIO"), migracion.indexOf("-- CAMPOS_RUBRO_FIN"));
  const json = bloque.slice(bloque.indexOf("select ('") + "select ('".length, bloque.indexOf("'::jsonb)"));
  assert.deepEqual(JSON.parse(json), camposComoEnLaBase());
});

test("detalles válidos e inválidos (la misma regla que detalles_validos)", () => {
  assert.equal(detallesValidos("perfumes", { marca: "Lattafa", para: "ella", tamano_ml: 100, concentracion: "edp", ocasiones: ["Día", "Noche"], descripcion: "Rico" }), true);
  assert.equal(detallesValidos("perfumes", { corte: "Recto" }), false, "llave de otro rubro");
  assert.equal(detallesValidos("perfumes", { tamano_ml: "100" }), false, "tipo malo");
  assert.equal(detallesValidos("perfumes", { tamano_ml: 0 }), false, "número no positivo");
  assert.equal(detallesValidos("perfumes", { para: "hombre" }), false, "valor no permitido");
  assert.equal(detallesValidos("perfumes", { ocasiones: ["Playa"] }), false, "ocasión no permitida");
  assert.equal(detallesValidos("perfumes", { notas_salida: [] }), false, "lista vacía");
  assert.equal(detallesValidos("ropa", { para: "ninos", material: "Lino" }), true);
  assert.equal(detallesValidos("general", { descripcion: "x".repeat(601) }), false, "descripción larga");
  assert.equal(detallesValidos("general", { duracion_min: 45 }), false, "duracion_min solo en servicios");
  assert.equal(detallesValidos("general", { duracion_min: 45 }, true), true);
});
