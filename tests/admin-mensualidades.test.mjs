import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { casosMensualidad, esperado } from "./fixtures/admin-mensualidades.mjs";
const { crearEstadoAdminDemo } = await import("../lib/data/admin/seed.ts");
const { crearFuenteAdminDemo } = await import("../lib/data/admin/demo.ts");
const { recalcularMensualidades } = await import("../lib/admin/pagos.ts");

test("demo: reservas y créditos usados bloquean reversión; liberar permite anular", async () => {
  const e = crearEstadoAdminDemo(),
    t = e.panel.tiendas[0];
  e.usuarioId = e.panel.usuarios.find(
    (u) => u.tiendaId === t.id && u.rol === "dueno",
  ).id;
  e.admins[0].usuarioId = e.usuarioId;
  e.trabajos = [];
  e.movimientos = e.movimientos.filter((m) => m.tiendaId !== t.id);
  t.creditosRetoque = 0;
  const f = crearFuenteAdminDemo(e);
  const p = (
    await f.registrarPago({
      tiendaId: t.id,
      concepto: "creditos",
      monto: 500,
      metodo: "efectivo",
      creditos: 10,
    })
  ).pago;
  const foto = e.panel.productos.find(
    (p) => p.tiendaId === t.id && p.medios.some((m) => m.tipo === "foto"),
  );
  const tr = await f.pedirRetoque(
    foto.id,
    foto.medios.find((m) => m.tipo === "foto").url,
  );
  let antes = structuredClone(e);
  await assert.rejects(f.anularPago(p.id, "reserva"), /creditos_ya_usados/);
  assert.deepEqual(e, antes);
  await f.devolverRetoque(tr.id, "fixture");
  await f.ajustarCreditos(t.id, -1, "consumido");
  antes = structuredClone(e);
  await assert.rejects(f.anularPago(p.id, "usados"), /creditos_ya_usados/);
  assert.deepEqual(e, antes);
  await f.ajustarCreditos(t.id, 1, "restaurar");
  assert.equal((await f.anularPago(p.id, "liberado")).creditos, 0);
});
test("demo: fallo durante auditoría revierte pago, fecha y registro", async () => {
  const e = crearEstadoAdminDemo(),
    id = e.panel.tiendas[0].id;
  e.panel.tiendas[0].pagadoHasta = null;
  const f = crearFuenteAdminDemo(e);
  const p = (
    await f.registrarPago({
      tiendaId: id,
      concepto: "mensualidad",
      monto: 1000,
      metodo: "efectivo",
    })
  ).pago;
  const antes = structuredClone(e),
    push = Array.prototype.push;
  try {
    // Inyección solo en el proceso de prueba, sin añadir hooks de fallo a la app.
    Array.prototype.push = function (...items) {
      if (items.some((x) => x?.accion === "anular_pago"))
        throw new Error("fallo_auditoria_fixture");
      return push.apply(this, items);
    };
    await assert.rejects(
      f.anularPago(p.id, "fixture"),
      /fallo_auditoria_fixture/,
    );
  } finally {
    Array.prototype.push = push;
  }
  assert.deepEqual(e, antes);
});

export async function probarDemo(caso) {
  const e = crearEstadoAdminDemo(Date.parse(caso.reloj)),
    t = e.panel.tiendas[0];
  t.pagadoHasta = caso.previa;
  let reloj = Date.parse(caso.reloj);
  const f = crearFuenteAdminDemo(e, () => reloj);
  const ids = new Map(),
    vigentes = new Set(),
    resultados = [];
  const originales = [];
  for (const paso of caso.acciones) {
    reloj = Date.parse(
      paso > 0
        ? (caso.fechasPorPago?.[paso] ?? caso.reloj)
        : (caso.anulacionEn ?? caso.reloj),
    );
    let r;
    if (paso > 0) {
      r = await f.registrarPago({
        tiendaId: t.id,
        concepto: "mensualidad",
        monto: 1000,
        metodo: "efectivo",
        meses: caso.meses[paso - 1],
        comprobanteUrl: t.id + "/fixture.pdf",
      });
      ids.set(paso, r.pago.id);
      originales.push(structuredClone(r.pago));
      vigentes.add(paso);
    } else {
      r = await f.anularPago(ids.get(-paso), "corrección fixture");
      vigentes.delete(-paso);
    }
    assert.equal(r.pagadoHasta, esperado(caso, vigentes), JSON.stringify(caso));
    assert.equal(recalcularMensualidades(e.pagos, t.id), r.pagadoHasta);
    resultados.push(r.pagadoHasta);
  }
  for (const original of originales)
    assert.deepEqual(
      e.pagos.find((p) => p.id === original.id),
      original,
    );
  assert.equal(e.registro.length, caso.acciones.length);
  return resultados;
}
test("392 secuencias: A/B, tres pagos, todos los órdenes, cobertura previa, meses, febrero/bisiesto y RD", async () => {
  for (const caso of casosMensualidad) await probarDemo(caso);
});
test("calendario independiente confirma fin de mes y fecha RD", async () => {
  assert.deepEqual(
    await probarDemo({
      reloj: "2024-01-31T12:00:00Z",
      previa: null,
      meses: [1],
      acciones: [1, -1],
    }),
    ["2024-02-29", null],
  );
  assert.deepEqual(
    await probarDemo({
      reloj: "2025-01-31T12:00:00Z",
      previa: null,
      meses: [1],
      acciones: [1, -1],
    }),
    ["2025-02-28", null],
  );
  assert.deepEqual(
    await probarDemo({
      reloj: "2026-10-01T03:59:59Z",
      previa: null,
      meses: [1],
      acciones: [1, -1],
    }),
    ["2026-10-30", null],
  );
});
test("doble anulación, anular anulación, baja de admin y cobertura externa son atómicos; tienda ajena intacta", async () => {
  const e = crearEstadoAdminDemo(),
    t = e.panel.tiendas[0],
    otra = structuredClone(e.panel.tiendas[1]);
  t.pagadoHasta = null;
  const f = crearFuenteAdminDemo(e);
  const p = (
    await f.registrarPago({
      tiendaId: t.id,
      concepto: "mensualidad",
      monto: 1000,
      metodo: "efectivo",
    })
  ).pago;
  e.panel.tiendas[0].pagadoHasta = "2029-12-31";
  let antes = structuredClone(e);
  await assert.rejects(
    f.anularPago(p.id, "externa"),
    /cobertura_no_conciliada/,
  );
  assert.deepEqual(e, antes);
  e.panel.tiendas[0].pagadoHasta = p.cubreHasta;
  const a = await f.anularPago(p.id, "anular");
  antes = structuredClone(e);
  await assert.rejects(f.anularPago(p.id, "otra vez"), /pago_ya_anulado/);
  await assert.rejects(
    f.anularPago(a.anulacion.id, "otra vez"),
    /pago_ya_anulado/,
  );
  assert.deepEqual(e, antes);
  assert.deepEqual(e.panel.tiendas[1], otra);
  e.admins[0].quitadoEn = new Date().toISOString();
  await assert.rejects(f.anularPago(p.id, "retirado"), /no_admin/);
});
test("demo serializa operaciones concurrentes; solo una doble anulación tiene éxito", async () => {
  const e = crearEstadoAdminDemo(),
    id = e.panel.tiendas[0].id;
  e.panel.tiendas[0].pagadoHasta = null;
  const f = crearFuenteAdminDemo(e);
  const a = (
    await f.registrarPago({
      tiendaId: id,
      concepto: "mensualidad",
      monto: 1000,
      metodo: "efectivo",
    })
  ).pago;
  const [b] = await Promise.all([
    f.registrarPago({
      tiendaId: id,
      concepto: "mensualidad",
      monto: 1000,
      metodo: "efectivo",
    }),
    f.anularPago(a.id, "concurrente"),
  ]);
  const r = await Promise.allSettled([
    f.anularPago(b.pago.id, "uno"),
    f.anularPago(b.pago.id, "dos"),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.match(
    r.find((x) => x.status === "rejected").reason.message,
    /pago_ya_anulado/,
  );
  assert.equal(e.panel.tiendas[0].pagadoHasta, null);
  assert.equal(e.registro.filter((r) => r.accion === "anular_pago").length, 2);
});
