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

const { montoMensualSugerido, NOTA_ANUAL_CIRCULO, hoyCirculo } = await import("../lib/circulo.ts");

test("el 30 % se aplica solo después de la prueba y solo al mensual", () => {
  // En prueba (prueba_hasta hoy o futura): precio normal y la nota.
  const enPrueba = montoMensualSugerido(999, c, "2026-11-15", "2026-10-20");
  assert.deepEqual(enPrueba, { monto: 999, conDescuento: false, nota: "El 30 % empieza al terminar la prueba." });
  assert.equal(montoMensualSugerido(999, c, "2026-10-20", "2026-10-20").conDescuento, false, "el último día de prueba todavía es prueba");
  // Prueba terminada: 30 % menos.
  assert.deepEqual(montoMensualSugerido(999, c, "2026-11-15", "2026-11-16"), { monto: 699, conDescuento: true, nota: null });
  assert.equal(montoMensualSugerido(999, c, null, "2026-11-16").monto, 699);
  // Descuento vencido o sin Círculo: precio normal.
  assert.equal(montoMensualSugerido(999, c, null, "2027-10-17").monto, 999);
  assert.equal(montoMensualSugerido(999, null, null, "2026-11-16").monto, 999);
  assert.match(NOTA_ANUAL_CIRCULO, /no se combina con el anual/);
});

test("el día es el de Santo Domingo, el mismo para el panel y el admin", () => {
  // 02:00 UTC del 17 oct = 22:00 del 16 oct en RD (UTC-4).
  assert.equal(hoyCirculo(new Date("2026-10-17T02:00:00Z")), "2026-10-16");
  assert.equal(hoyCirculo(new Date("2026-10-17T05:00:00Z")), "2026-10-17");
});
