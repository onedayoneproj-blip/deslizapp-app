// Círculo Deslizapp (lib/circulo.ts): el 30 % mientras la fecha sea futura; el aro y la tarjeta no dependen del descuento.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const { descuentoVigente, textoDesde, textoDescuento, montoAnualCirculo, montoSugeridoCobro, hoyCirculo } = await import("../lib/circulo.ts");
const c = { desde: "2026-10-16", descuentoHasta: "2027-10-16" };

test("el descuento está vigente hasta su fecha (inclusive) y no más", () => {
  assert.equal(descuentoVigente(c, "2027-10-16"), true);
  assert.equal(descuentoVigente(c, "2027-10-17"), false);
  assert.equal(descuentoVigente({ desde: "2026-10-16", descuentoHasta: null }, "2026-11-01"), false);
  assert.equal(descuentoVigente(null, "2026-11-01"), false);
});

test("los textos de la tarjeta", () => {
  assert.equal(textoDesde(c), "Fundadora desde octubre 2026");
  assert.equal(textoDescuento(c, "2026-10-20"), "menos en tu primer año anual, hasta el 16 oct 2027");
  assert.match(textoDescuento(c, "2028-01-01"), /terminó el 16 oct 2027\. El aro sigue siendo tuyo/);
});

test("el 30 % es solo pagando anual: round(12 × precio mensual × 0,7)", () => {
  assert.equal(montoAnualCirculo(499), 4192);
  assert.equal(montoAnualCirculo(999), 8392);
  assert.equal(montoAnualCirculo(1499), 12592);
  // Siempre del precio mensual que se le pase (viene de la base): si cambia, cambia el monto.
  assert.equal(montoAnualCirculo(1099), Math.round(12 * 1099 * 0.7));
});

test("Cobros: el Círculo vigente aplica el 30 % solo al cobro anual; el mensual va a precio normal", () => {
  assert.equal(montoSugeridoCobro(999, 12, c, "2026-11-16"), 8392);
  assert.equal(montoSugeridoCobro(999, 1, c, "2026-11-16"), 999, "mensual: sin descuento");
  assert.equal(montoSugeridoCobro(999, 3, c, "2026-11-16"), 2997, "varios meses: sin descuento");
  // Descuento vencido o sin Círculo: en anual no hay monto del Círculo (va el precio anual normal del plan).
  assert.equal(montoSugeridoCobro(999, 12, c, "2027-10-17"), null);
  assert.equal(montoSugeridoCobro(999, 12, null, "2026-11-16"), null);
  assert.equal(montoSugeridoCobro(999, 1, null, "2026-11-16"), 999);
});

test("el día es el de Santo Domingo, el mismo para el panel y el admin", () => {
  // 02:00 UTC del 17 oct = 22:00 del 16 oct en RD (UTC-4).
  assert.equal(hoyCirculo(new Date("2026-10-17T02:00:00Z")), "2026-10-16");
  assert.equal(hoyCirculo(new Date("2026-10-17T05:00:00Z")), "2026-10-17");
});
