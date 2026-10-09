// "Cambiar a crédito" desde el detalle del pedido: elegir la fecha guarda al momento y un fallo no deja nada a medias.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const { debeGuardarFecha, sumarDias } = await import("../lib/credito.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { cambiarPagoDePedido, cambiarEstadoPedido } = await import("../lib/data/pedidos.ts");

const TIENDA = "a1000000-0000-4000-8000-000000000001";
const nuevoId = () => "x";
const ahora = "2026-10-09T12:00:00.000Z";

function dbConPedido(estado) {
  const db = construirDesdeSeed();
  const base = db.pedidos.find((p) => p.tiendaId === TIENDA && p.estado === "despachado" && p.pagoModo !== "credito");
  const pedido = { ...base, estado, pagoModo: "contado", pagoFechaAcordada: null };
  return { db: { ...db, pedidos: db.pedidos.map((p) => (p.id === base.id ? pedido : p)), abonos: db.abonos.filter((a) => a.pedidoId !== base.id) }, id: base.id };
}

for (const estado of ["por_despachar", "despachado"]) {
  test(`elegir fecha guarda a crédito con la fecha (${estado}) sin tocar el estado`, () => {
    const { db, id } = dbConPedido(estado);
    const dia = sumarDias("2026-10-09", 7);
    const r = cambiarPagoDePedido(db, TIENDA, id, { pagoModo: "credito", pagoFechaAcordada: dia }, nuevoId, ahora);
    assert.equal(r.pedido.pagoModo, "credito");
    assert.equal(r.pedido.pagoFechaAcordada, dia);
    assert.equal(r.pedido.estado, estado);
    assert.equal(r.pedido.saldo, r.pedido.total);
  });
}

test("«Sin fecha» también guarda a crédito, sin fecha", () => {
  const { db, id } = dbConPedido("por_despachar");
  const r = cambiarPagoDePedido(db, TIENDA, id, { pagoModo: "credito", pagoFechaAcordada: null }, nuevoId, ahora);
  assert.equal(r.pedido.pagoModo, "credito");
  assert.equal(r.pedido.pagoFechaAcordada, null);
});

test("si falla (pedido cancelado) lanza y la base queda igual: nada a medias", () => {
  const { db, id } = dbConPedido("por_despachar");
  const cancelado = cambiarEstadoPedido(db, TIENDA, id, "cancelado").db;
  const antes = JSON.stringify(cancelado);
  assert.throws(() => cambiarPagoDePedido(cancelado, TIENDA, id, { pagoModo: "credito", pagoFechaAcordada: null }, nuevoId, ahora));
  assert.equal(JSON.stringify(cancelado), antes);
});

test("debeGuardarFecha: las pastillas guardan; «Elegir fecha» espera el día confirmado", () => {
  assert.equal(debeGuardarFecha(null, { opcion: "semana", dia: "2026-10-16" }), true);
  assert.equal(debeGuardarFecha(null, { opcion: "mes", dia: "2026-10-31" }), true);
  assert.equal(debeGuardarFecha(null, { opcion: "sin", dia: null }), true);
  assert.equal(debeGuardarFecha(null, { opcion: "otra", dia: "2026-10-23" }), false);
  assert.equal(debeGuardarFecha({ opcion: "otra" }, { opcion: "otra", dia: null }), false);
  assert.equal(debeGuardarFecha({ opcion: "otra" }, { opcion: "otra", dia: "2026-10-25" }), true);
});
