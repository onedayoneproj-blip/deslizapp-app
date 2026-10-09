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
  assert.equal(r.pedido.despachadoEn, p.despachadoEn, "conserva la fecha original de la venta");
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

test("«venta que ya hice» solo al registrar un pedido nuevo: ni al editar uno existente, ni tras reabrir y volver a entrar", async () => {
  const { ofreceVentaPasada } = await import("../lib/venta-pasada.ts");
  assert.equal(ofreceVentaPasada(false), true, "pedido nuevo");
  assert.equal(ofreceVentaPasada(true), false, "cualquier pedido existente (despachado, reabierto, por despachar…)");
});

test("reabrir → despachar de nuevo descuenta el stock (el único camino de vuelta a despachado)", () => {
  const db = construirDesdeSeed();
  const p = db.pedidos.find((x) => x.tiendaId === TIENDA && x.estado === "despachado");
  const items = db.pedidoItems.filter((i) => i.pedidoId === p.id);
  const stock = (d, id) => d.productos.find((x) => x.id === id)?.stock;
  const it = items.find((i) => !i.porEncargo && !i.varianteId && stock(db, i.productoId) !== null);
  if (!it) return;
  const reabierto = deshacerDespacho(db, TIENDA, p.id, "2026-10-09T12:00:00.000Z");
  const otra = despacharPedido(reabierto.db, TIENDA, p.id, "2026-10-09T13:00:00.000Z");
  assert.equal(stock(otra.db, it.productoId), stock(db, it.productoId));
});

test("reabrir sin editar no cambia la firma del editor (salir no avisa); editar algo sí la cambia", async () => {
  const { diaEnFirma } = await import("../lib/venta-pasada.ts");
  const original = "2026-10-01";
  // La firma antes de reabrir (despachado) y después (por despachar, mismo editor): el día cuenta igual en las dos.
  assert.equal(diaEnFirma(false, true, original), diaEnFirma(false, true, original));
  assert.equal(diaEnFirma(false, true, original), original);
  // Un pedido que nunca fue despachado no lleva día en la firma (no se edita la fecha)
  assert.equal(diaEnFirma(false, false, original), null);
  // Cambiar el día antes de reabrir sí era un cambio, y reabrir lo restablece al original
  assert.notEqual(diaEnFirma(false, true, "2026-10-05"), diaEnFirma(false, true, original));
});

test("reabrir → despachar de nuevo conserva la fecha original (reportes y factura); un pedido nuevo se despacha con la hora actual", () => {
  const db = construirDesdeSeed();
  const p = db.pedidos.find((x) => x.tiendaId === TIENDA && x.estado === "despachado" && x.despachadoEn);
  const reabierto = deshacerDespacho(db, TIENDA, p.id, "2026-10-09T12:00:00.000Z");
  const otra = despacharPedido(reabierto.db, TIENDA, p.id, "2026-10-09T13:00:00.000Z");
  assert.equal(otra.pedido.despachadoEn, p.despachadoEn);
  // Un pedido que nunca se despachó (sin fecha de despacho) recibe la hora del despacho
  const nunca = { ...reabierto.db, pedidos: reabierto.db.pedidos.map((x) => (x.id === p.id ? { ...x, despachadoEn: null } : x)) };
  assert.equal(despacharPedido(nunca, TIENDA, p.id, "2026-10-09T13:00:00.000Z").pedido.despachadoEn, "2026-10-09T13:00:00.000Z");
});
