// Pruebas de las fechas de "Es una venta que ya hice" (lib/venta-pasada.ts) y de los errores de la RPC.
import assert from "node:assert/strict";
import { test } from "node:test";
import { diaEnPalabras, diaLocal, fechaDeVenta } from "../lib/venta-pasada.ts";
import { DatosInvalidos, traducirErrorSupabase, mensajeDeError, StockInsuficiente } from "../lib/data/errores.ts";

const ahora = new Date(2026, 8, 30, 15, 30); // 30 sep 2026, 3:30 p. m. (hora local del aparato)

test("día local y mediodía local", () => {
  assert.equal(diaLocal(ahora), "2026-09-30");
  const iso = fechaDeVenta("2026-09-12", ahora);
  const d = new Date(iso);
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 8, 12, 12, 0]);
});

test("hoy después de mediodía: mediodía; hoy antes de mediodía: ahora (nunca futura)", () => {
  assert.equal(new Date(fechaDeVenta("2026-09-30", ahora)).getHours(), 12);
  const temprano = new Date(2026, 8, 30, 9, 0);
  assert.equal(fechaDeVenta("2026-09-30", temprano), temprano.toISOString());
});

test("fechas futuras o inválidas se rechazan", () => {
  assert.equal(fechaDeVenta("2026-10-01", ahora), null);
  assert.equal(fechaDeVenta("", ahora), null);
  assert.equal(fechaDeVenta("2026-02-31", ahora), null);
  assert.equal(fechaDeVenta("30/09/2026", ahora), null);
});

test("el mensaje usa el día elegido", () => {
  assert.equal(diaEnPalabras("2026-10-03"), "3 de octubre");
});

test("errores de registrar_venta_pasada en español", () => {
  const casos = {
    fecha_invalida: /día que ya pasó/,
    sin_productos: /al menos un producto/,
    items_invalidos: /cantidad o un precio/,
    producto_no_encontrado: /producto de la venta/,
    cliente_no_encontrado: /cliente ya no existe/,
    tienda_no_encontrada: /tu tienda/,
  };
  for (const [codigo, re] of Object.entries(casos)) {
    const e = traducirErrorSupabase({ code: "P0001", message: codigo });
    assert.ok(e instanceof DatosInvalidos, codigo);
    assert.match(mensajeDeError(e), re);
  }
  assert.ok(traducirErrorSupabase({ code: "P0001", message: "stock_insuficiente: Kiara" }) instanceof StockInsuficiente);
});
