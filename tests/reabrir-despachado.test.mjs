// «Reabrir pedido» de un despachado = deshacerDespacho: vuelve a Por despachar, devuelve el stock y conserva pago y abonos.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { deshacerDespacho, despacharPedido } = await import("../lib/data/pedidos.ts");

const TIENDA = "a1000000-0000-4000-8000-000000000001";

test("reabrir un despachado a crédito con abonos: estado y stock cambian, el pago y los abonos se conservan", () => {
  const db = construirDesdeSeed();
  const p = db.pedidos.find((x) => x.tiendaId === TIENDA && x.estado === "despachado" && x.pagoModo === "credito" && db.abonos.some((a) => a.pedidoId === x.id));
  assert.ok(p, "el seed trae un pedido despachado a crédito con abonos");
  const items = db.pedidoItems.filter((i) => i.pedidoId === p.id);
  const stockAntes = (d, productoId) => d.productos.find((x) => x.id === productoId).stock;
  const conStock = items.find((i) => !i.porEncargo && !i.varianteId && stockAntes(db, i.productoId) !== null);
  const r = deshacerDespacho(db, TIENDA, p.id, "2026-10-09T12:00:00.000Z");
  assert.equal(r.pedido.estado, "por_despachar");
  assert.equal(r.pedido.despachadoEn, null);
  assert.equal(r.pedido.pagoModo, "credito");
  assert.equal(r.pedido.pagoFechaAcordada, p.pagoFechaAcordada);
  assert.deepEqual(r.db.abonos.filter((a) => a.pedidoId === p.id), db.abonos.filter((a) => a.pedidoId === p.id));
  if (conStock) assert.equal(stockAntes(r.db, conStock.productoId), stockAntes(db, conStock.productoId) + conStock.cantidad);
});

test("tras reabrir se puede despachar otra vez (mismo número) y el stock vuelve a bajar", () => {
  const db = construirDesdeSeed();
  const p = db.pedidos.find((x) => x.tiendaId === TIENDA && x.estado === "despachado");
  const reabierto = deshacerDespacho(db, TIENDA, p.id, "2026-10-09T12:00:00.000Z");
  const otra = despacharPedido(reabierto.db, TIENDA, p.id, "2026-10-09T13:00:00.000Z");
  assert.equal(otra.pedido.estado, "despachado");
  assert.equal(otra.pedido.numero, p.numero);
});
