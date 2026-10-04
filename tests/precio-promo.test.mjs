// precioConPromo (lib/promos.ts) y public.precio_con_promo (migración 3) con los mismos casos: tests/casos-precio-promo.json.
// Aquí corren contra TypeScript; supabase/tests/catalogo_conectado.sql (caso 7) corre los mismos contra la base, y esta prueba
// revisa que el script SQL tenga exactamente los mismos casos.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { precioConPromo } from "../lib/promos.ts";

const casos = JSON.parse(readFileSync(new URL("./casos-precio-promo.json", import.meta.url), "utf8"));
const ahora = new Date("2026-10-04T15:00:00Z");
const dias = (n) => new Date(ahora.getTime() + n * 86_400_000).toISOString();

for (const c of casos) {
  test(`precio con promo: ${c.caso}`, () => {
    const producto = { id: "p1", tiendaId: "t1", precio: c.precio, categoria: c.categoria };
    const promos = c.promos.map((p, i) => ({
      id: `pr${i}`, tiendaId: "t1", tipo: p.tipo, nombre: `Promo ${i}`, valorPorcentaje: p.porcentaje,
      codigo: p.codigo ?? null, coleccion: p.coleccion ?? null, productoId: p.tipo === "producto" ? (p.otroProducto ? "p2" : "p1") : null,
      fechaInicio: dias(p.inicioDias), fechaFin: p.finDias === null ? null : dias(p.finDias), estado: p.estado ?? "activa",
      limiteUsos: null, pausada: p.pausada ?? false, clienteId: null,
    }));
    assert.equal(precioConPromo(producto, promos, ahora).precio, c.esperado);
  });
}

test("el script SQL corre los mismos casos", () => {
  const sql = readFileSync(new URL("../supabase/tests/catalogo_conectado.sql", import.meta.url), "utf8");
  const bloque = sql.slice(sql.indexOf("-- CASOS_PRECIO_INICIO"), sql.indexOf("-- CASOS_PRECIO_FIN"));
  const json = bloque.slice(bloque.indexOf("$casos$") + "$casos$".length, bloque.lastIndexOf("$casos$"));
  assert.deepEqual(JSON.parse(json), casos);
});
