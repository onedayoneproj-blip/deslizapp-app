// Despachar con un cambio de pago pendiente (lib/data/despacho-con-pago.ts): se aplica junto al despacho y no queda a medias.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { despacharConPago, pagoOriginal } = await import("../lib/data/despacho-con-pago.ts");

const contado = { id: "p1", pagoModo: "contado", pagoFechaAcordada: null };
const credito = { pagoModo: "credito", pagoFechaAcordada: "2026-10-31" };

function datosFalsos({ falla = null } = {}) {
  const llamadas = [];
  return {
    llamadas,
    cambiarPagoPedido: async (_t, id, d) => {
      llamadas.push(["pago", id, d]);
      if (falla === "pago") throw new Error("no pago");
      return {};
    },
    despacharPedido: async (_t, id) => {
      llamadas.push(["despachar", id]);
      if (falla === "despacho") throw new Error("sin stock");
      return { pedido: {}, agotados: [] };
    },
  };
}

test("sin pago pendiente solo despacha", async () => {
  const d = datosFalsos();
  await despacharConPago(d, "t", contado, null);
  assert.deepEqual(d.llamadas, [["despachar", "p1"]]);
});

test("con pago pendiente: primero el pago, luego el despacho", async () => {
  const d = datosFalsos();
  await despacharConPago(d, "t", contado, credito);
  assert.deepEqual(d.llamadas, [["pago", "p1", credito], ["despachar", "p1"]]);
});

test("si despachar falla, el pago vuelve a contado y el error sale", async () => {
  const d = datosFalsos({ falla: "despacho" });
  await assert.rejects(despacharConPago(d, "t", contado, credito), /sin stock/);
  assert.deepEqual(d.llamadas, [["pago", "p1", credito], ["despachar", "p1"], ["pago", "p1", { pagoModo: "contado" }]]);
});

test("si el pago falla, no se despacha", async () => {
  const d = datosFalsos({ falla: "pago" });
  await assert.rejects(despacharConPago(d, "t", contado, credito), /no pago/);
  assert.deepEqual(d.llamadas, [["pago", "p1", credito]]);
});

test("el pago de antes de un crédito conserva su fecha", () => {
  assert.deepEqual(pagoOriginal({ pagoModo: "credito", pagoFechaAcordada: "2026-10-20" }), { pagoModo: "credito", pagoFechaAcordada: "2026-10-20" });
});
