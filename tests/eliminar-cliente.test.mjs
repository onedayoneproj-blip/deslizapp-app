import assert from "node:assert/strict";
import { test } from "node:test";
import { eliminarClienteDeDB } from "../lib/data/eliminar-cliente.ts";

test("borrar un contacto conserva sus pedidos y los desvincula solo dentro de su tienda", () => {
  const db = {
    clientes: [
      { id: "c1", tiendaId: "t1", nombre: "Ana" },
      { id: "c2", tiendaId: "t2", nombre: "Otra tienda" },
    ],
    pedidos: [
      { id: "p1", tiendaId: "t1", clienteId: "c1", estado: "despachado", total: 1200 },
      { id: "p2", tiendaId: "t1", clienteId: null, estado: "por_despachar", total: 500 },
      { id: "p3", tiendaId: "t2", clienteId: "c1", estado: "despachado", total: 800 },
    ],
    pedidoItems: [{ id: "i1", pedidoId: "p1" }, { id: "i2", pedidoId: "p3" }],
    abonos: [{ id: "a1", pedidoId: "p1" }, { id: "a2", pedidoId: "p3" }],
  };

  const siguiente = eliminarClienteDeDB(db, "t1", "c1");
  assert.deepEqual(siguiente.clientes.map((c) => c.id), ["c2"]);
  assert.equal(siguiente.pedidos.length, 3);
  assert.equal(siguiente.pedidos[0].clienteId, null);
  assert.equal(siguiente.pedidos[1].clienteId, null);
  assert.equal(siguiente.pedidos[2].clienteId, "c1");
  assert.equal(db.clientes.length, 2); // la operación no muta el estado anterior
  assert.equal(db.pedidos[0].clienteId, "c1");
});

test("borrar también el historial elimina pedidos asociados, renglones y abonos sin tocar otra tienda", () => {
  const db = {
    clientes: [{ id: "c1", tiendaId: "t1", nombre: "Ana" }],
    pedidos: [
      { id: "p1", tiendaId: "t1", clienteId: "c1", estado: "despachado" },
      { id: "p2", tiendaId: "t1", clienteId: "c1", estado: "cancelado" },
      { id: "p3", tiendaId: "t2", clienteId: "c1", estado: "despachado" },
    ],
    pedidoItems: [{ id: "i1", pedidoId: "p1" }, { id: "i2", pedidoId: "p3" }],
    abonos: [{ id: "a1", pedidoId: "p1" }, { id: "a2", pedidoId: "p3" }],
  };
  const siguiente = eliminarClienteDeDB(db, "t1", "c1", true);
  assert.deepEqual(siguiente.pedidos.map((p) => p.id), ["p3"]);
  assert.deepEqual(siguiente.pedidoItems.map((i) => i.id), ["i2"]);
  assert.deepEqual(siguiente.abonos.map((a) => a.id), ["a2"]);
});
