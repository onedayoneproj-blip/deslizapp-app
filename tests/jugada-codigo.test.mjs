// Código personal de Tu próxima jugada (lib/jugada-codigo.ts): la misma regla que crear_codigo_cliente
import assert from "node:assert/strict";
import { test } from "node:test";
import { baseCodigo, codigoPropuesto, finDelDiaEn, limpiarCodigo, PATRON_CODIGO } from "../lib/jugada-codigo.ts";

test("base: primera palabra sin tildes, mayúsculas, hasta 6 letras", () => {
  assert.equal(baseCodigo("Luisanna Peña"), "LUISAN");
  assert.equal(baseCodigo("  Ángel Paulino"), "ANGEL");
  assert.equal(baseCodigo("Ñoño"), "NONO");
  assert.equal(baseCodigo("Mª-José"), "MJOSE"); // como la base: lo que no es A–Z se quita
  assert.equal(baseCodigo(""), "CLIENTE");
  assert.equal(baseCodigo("123 !!"), "CLIENTE");
});

test("propuesto: nombre + porcentaje; si choca, 2 dígitos más", () => {
  assert.equal(codigoPropuesto("Luisanna Peña", 10, []), "LUISAN10");
  assert.equal(codigoPropuesto("Luisanna", 15, ["LUISAN10"]), "LUISAN15");
  assert.equal(codigoPropuesto("Luisanna", 10, ["luisan10"]), "LUISAN1010");
  assert.equal(codigoPropuesto("Luisanna", 10, ["LUISAN10", "LUISAN1010"]), "LUISAN1011");
  assert.equal(codigoPropuesto("", 20, []), "CLIENTE20");
  assert.ok(PATRON_CODIGO.test(codigoPropuesto("Luisanna", 50, ["LUISAN50"])));
});

test("limpiar mientras se escribe", () => {
  assert.equal(limpiarCodigo("verano 15!"), "VERANO15");
  assert.equal(limpiarCodigo("ñame"), "NAME");
  assert.equal(limpiarCodigo("A".repeat(20)).length, 15);
  assert.equal(PATRON_CODIGO.test("AB"), false);
  assert.equal(PATRON_CODIGO.test("ABC"), true);
});

test("vence al final del día en Santo Domingo", () => {
  // 3 oct 2026, 11 p. m. en Santo Domingo = 4 oct 03:00 UTC → con 14 días vence el 17 oct a las 23:59:59.999 (SD)
  assert.equal(finDelDiaEn(Date.parse("2026-10-04T03:00:00Z"), 14), "2026-10-18T03:59:59.999Z");
  assert.equal(finDelDiaEn(Date.parse("2026-10-03T15:00:00Z"), 7), "2026-10-11T03:59:59.999Z");
});
