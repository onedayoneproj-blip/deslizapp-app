// Pruebas del estado visible del catálogo en línea (lib/catalogo-estado.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { esRecienPublicado, pasoActual, vistaCatalogo } from "../lib/catalogo-estado.ts";

const ahora = new Date("2026-09-30T15:00:00Z");
const base = { tiendaEstado: "activa", catalogoEstado: "sin", publicadoEn: null, enlaceValido: false, visto: false, ahora };

test("cada estado de la base se muestra como es", () => {
  for (const e of ["sin", "solicitado", "generando", "revisar", "cambios"]) assert.equal(vistaCatalogo({ ...base, catalogoEstado: e }), e);
});

test("tienda pausada manda sobre todo lo demás", () => {
  for (const e of ["sin", "generando", "revisar", "publicado"]) assert.equal(vistaCatalogo({ ...base, tiendaEstado: "pausada", catalogoEstado: e, enlaceValido: true, publicadoEn: ahora.toISOString() }), "pausado");
});

test("publicado: 'recién' solo si hace menos de 3 días y no lo ha visto; después, 'en línea'", () => {
  const p = { ...base, catalogoEstado: "publicado", enlaceValido: true };
  assert.equal(vistaCatalogo({ ...p, publicadoEn: "2026-09-29T15:00:00Z" }), "recien");
  assert.equal(vistaCatalogo({ ...p, publicadoEn: "2026-09-29T15:00:00Z", visto: true }), "publicado");
  assert.equal(vistaCatalogo({ ...p, publicadoEn: "2026-09-26T14:00:00Z" }), "publicado"); // hace más de 3 días
  assert.equal(vistaCatalogo({ ...p, publicadoEn: null }), "publicado");
  assert.equal(esRecienPublicado("2026-09-27T15:00:01Z", ahora), true);
  assert.equal(esRecienPublicado("2026-09-27T15:00:00Z", ahora), false);
  assert.equal(esRecienPublicado("basura", ahora), false);
});

test("publicado sin enlace https válido: 'Sin catálogo' con Conectar mi catálogo", () => {
  assert.equal(vistaCatalogo({ ...base, catalogoEstado: "publicado", enlaceValido: false, publicadoEn: ahora.toISOString() }), "conectar");
});

test("el paso por defecto es 1", () => {
  assert.equal(pasoActual(null), 1);
  assert.equal(pasoActual(undefined), 1);
  assert.equal(pasoActual(2), 2);
  assert.equal(pasoActual(3), 3);
  assert.equal(pasoActual(9), 1);
});
