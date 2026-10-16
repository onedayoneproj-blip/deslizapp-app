// Círculo Deslizapp (lib/circulo.ts): el 30 % mientras la fecha sea futura; el aro y la tarjeta no dependen del descuento.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const { descuentoVigente, textoDesde, textoDescuento, conDescuentoCirculo } = await import("../lib/circulo.ts");
const c = { desde: "2026-10-16", descuentoHasta: "2027-10-16" };

test("el descuento está vigente hasta su fecha (inclusive) y no más", () => {
  assert.equal(descuentoVigente(c, "2027-10-16"), true);
  assert.equal(descuentoVigente(c, "2027-10-17"), false);
  assert.equal(descuentoVigente({ desde: "2026-10-16", descuentoHasta: null }, "2026-11-01"), false);
  assert.equal(descuentoVigente(null, "2026-11-01"), false);
});

test("los textos de la tarjeta", () => {
  assert.equal(textoDesde(c), "Fundadora desde octubre 2026");
  assert.equal(textoDescuento(c, "2026-10-20"), "menos en tu plan hasta el 16 oct 2027");
  assert.match(textoDescuento(c, "2028-01-01"), /terminó el 16 oct 2027\. El aro sigue siendo tuyo/);
});

test("el 30 % se aplica al precio del plan", () => {
  assert.equal(conDescuentoCirculo(999), 699);
  assert.equal(conDescuentoCirculo(499), 349);
});
