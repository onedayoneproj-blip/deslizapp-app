// El pedido del catálogo en el panel (lib/pedido-catalogo.ts y la demo de lib/data/catalogo.ts): estados del comprador,
// disponibilidad por variante, total después de quitar, la excepción del teléfono completo, vencimiento y registro.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";

const { estadoComprador, cantidadConSustantivo, disponibilidadDeLinea, totalDelBorrador, clienteDelTelefono, llaveDeLinea } = await import(
  "../lib/pedido-catalogo.ts"
);
const { verSolicitudDeDB, registrarSolicitudEnDB, solicitudesPendientesDeDB, solicitudPorCodigoDeDB, descartarSolicitudEnDB } = await import(
  "../lib/data/catalogo.ts"
);
const { construirDesdeSeed } = await import("../lib/data/db.ts");

const tienda = { nombre: "Esencias Michel", slug: "esencias-michel", logoUrl: null, fotoPerfilUrl: null, whatsapp: null, nombreVendedora: "Michel", rubro: "perfumes" };
const item = (o = {}) => ({ productoId: "p1", varianteId: null, nombre: "Kiara", varianteTexto: null, foto: null, precioUnitario: 1000, cantidad: 1, porEncargo: false, ...o });

test("estado del comprador: título, línea, paso y sustantivo del rubro", () => {
  const ahora = new Date("2026-10-04T20:00:00Z");
  const items = [item({ cantidad: 2 }), item({ productoId: "p2" })];
  const e = (estado, extra = {}) => estadoComprador({ estado, items, despachadoEn: null, tienda, ...extra }, ahora);
  assert.deepEqual(e("enviado"), { estado: "enviado", titulo: "Le llegó a Michel", linea: "3 perfumes · te responde por WhatsApp", paso: 1 });
  assert.equal(e("confirmado").titulo, "Michel lo confirmó");
  assert.equal(e("confirmado").paso, 2);
  assert.equal(e("despachado").linea, "3 perfumes · ya salió");
  assert.equal(e("despachado", { despachadoEn: "2026-10-04T19:20:00Z" }).linea, "3 perfumes · salió hoy a las 3:20 p. m.");
  assert.equal(e("cancelado").paso, 0);
  assert.equal(e("cancelado").linea, "Si fue un error, escríbele a Michel.");
  assert.equal(e("vencido").titulo, "Este pedido venció");
  // Sin nombre de vendedora: el de la tienda. Ropa: prendas; singular.
  assert.equal(estadoComprador({ estado: "enviado", items: [item()], despachadoEn: null, tienda: { ...tienda, nombreVendedora: null, rubro: "ropa" } }).linea, "1 prenda · te responde por WhatsApp");
  assert.equal(estadoComprador({ estado: "enviado", items: [item()], despachadoEn: null, tienda: { ...tienda, nombreVendedora: null } }).titulo, "Le llegó a Esencias Michel");
  assert.equal(cantidadConSustantivo([item({ cantidad: 1 })], null), "1 producto");
});

test("disponibilidad: por variante (no por el producto), menos de lo pedido, encargo, borrado y oculto", () => {
  const producto = {
    id: "p1",
    activo: true,
    stock: 7,
    variantes: [
      { id: "v1", productoId: "p1", valores: { Talla: "S" }, stock: 0, precio: null, activa: true, orden: 0 },
      { id: "v2", productoId: "p1", valores: { Talla: "M" }, stock: 7, precio: null, activa: true, orden: 1 },
      { id: "v3", productoId: "p1", valores: { Talla: "L" }, stock: 5, precio: null, activa: false, orden: 2 },
    ],
  };
  const sinControl = { id: "p2", activo: true, stock: null, variantes: [] };
  assert.deepEqual(disponibilidadDeLinea(item({ varianteId: "v1" }), [producto]), { tipo: "agotado" });
  assert.deepEqual(disponibilidadDeLinea(item({ varianteId: "v2", cantidad: 3 }), [producto]), { tipo: "ok" });
  assert.deepEqual(disponibilidadDeLinea(item({ varianteId: "v2", cantidad: 9 }), [producto]), { tipo: "menos", quedan: 7 });
  assert.deepEqual(disponibilidadDeLinea(item({ varianteId: "v1", porEncargo: true }), [producto]), { tipo: "ok" });
  assert.deepEqual(disponibilidadDeLinea(item({ varianteId: "v3" }), [producto]), { tipo: "no_esta", motivo: "oculto" });
  assert.deepEqual(disponibilidadDeLinea(item({ varianteId: "vX" }), [producto]), { tipo: "no_esta", motivo: "borrado" });
  assert.deepEqual(disponibilidadDeLinea(item({ productoId: "pX" }), [producto]), { tipo: "no_esta", motivo: "borrado" });
  assert.deepEqual(disponibilidadDeLinea(item({ productoId: "p2", cantidad: 50 }), [sinControl]), { tipo: "ok" });
  assert.deepEqual(disponibilidadDeLinea(item({ productoId: "p2" }), [{ ...sinControl, activo: false }]), { tipo: "no_esta", motivo: "oculto" });
});

test("total del borrador: quitar una variante no quita la otra; el descuento se reparte como en la RPC", () => {
  const s = {
    descuento: 300,
    items: [item({ varianteId: "v1", precioUnitario: 1000 }), item({ varianteId: "v2", precioUnitario: 1500, cantidad: 2 }), item({ productoId: "p2", precioUnitario: 500 })],
  };
  const sin = totalDelBorrador(s, { quitar: [], encargo: [] });
  assert.equal(sin.subtotal, 4500);
  assert.equal(sin.total, 4200);
  const r = totalDelBorrador(s, { quitar: ["v1"], encargo: ["v2"] });
  assert.equal(r.quedan.length, 2);
  assert.deepEqual(r.quedan.map((i) => [llaveDeLinea(i), i.porEncargo]), [["v2", true], ["p2", false]]);
  assert.equal(r.subtotal, 3500);
  assert.equal(r.descuento, Math.round((300 * 3500) / 4500));
  assert.equal(r.total, 3500 - 233);
  assert.equal(totalDelBorrador(s, { quitar: ["v1", "v2", "p2"], encargo: [] }).quedan.length, 0);
});

test("selector: solo un WhatsApp completo y válido que ya existe es la excepción; dos Ana no se confunden", () => {
  const clientes = [
    { id: "a1", nombre: "Ana", telefono: "+18095550142" },
    { id: "a2", nombre: "Ana", telefono: "+18295550198" },
    { id: "b", nombre: "Luis", telefono: null },
  ];
  assert.equal(clienteDelTelefono(clientes, "809 555")?.id, undefined);
  assert.equal(clienteDelTelefono(clientes, "Ana"), null);
  assert.equal(clienteDelTelefono(clientes, "809-555-0142")?.id, "a1");
  assert.equal(clienteDelTelefono(clientes, "1 (829) 555 0198")?.id, "a2");
  assert.equal(clienteDelTelefono(clientes, "849-555-0000"), null);
});

test("demo: registrar une líneas finales al estado público, nota del cliente nuevo y nunca dos pedidos", () => {
  let db = construirDesdeSeed(new Date("2026-10-04T12:00:00Z").getTime());
  const t = db.tiendas[0];
  const p = db.productos.find((x) => x.tiendaId === t.id && x.activo);
  const ahora = "2026-10-04T12:00:00.000Z";
  const base = { id: "s1", tiendaId: t.id, codigo: "ABCDEFGH23", codigoPromo: null, descuento: 0, creadaEn: ahora, venceEn: "2026-10-11T12:00:00.000Z", pedidoId: null, descartadaEn: null, dispositivo: "d" };
  db = { ...db, solicitudes: [...db.solicitudes, { ...base, items: [item({ productoId: p.id, nombre: p.nombre, precioUnitario: 1000, cantidad: 2 }), item({ productoId: "fantasma", nombre: "Fantasma", precioUnitario: 500 })], total: 2500 }] };
  let n = 0;
  const id = () => `id-${++n}`;
  // Un producto que ya no existe no se registra; quitado, sí.
  assert.throws(() => registrarSolicitudEnDB(db, t.id, "s1", { clienteNuevo: { nombre: "Paola", telefono: null } }, id, ahora), /ya no está en tu catálogo/);
  assert.throws(() => registrarSolicitudEnDB(db, t.id, "s1", { clienteNuevo: { nombre: "Paola", telefono: null, nota: "x".repeat(61) }, quitar: ["fantasma"] }, id, ahora), /Revisa/);
  const r = registrarSolicitudEnDB(db, t.id, "s1", { clienteNuevo: { nombre: "Paola", telefono: "809-555-0177", nota: "Le gusta lo dulce" }, quitar: ["fantasma"] }, id, ahora);
  assert.equal(r.cliente.nota, "Le gusta lo dulce");
  assert.equal(r.cliente.origen, "catalogo");
  assert.equal(r.pedido.estado, "nuevo");
  assert.equal(r.pedido.origen, "catalogo");
  db = r.db;
  const v = verSolicitudDeDB(db, "abcdefgh23", "otra", Date.parse(ahora));
  assert.equal(v.estado, "confirmado");
  assert.equal(v.id, null);
  assert.equal(v.total, 2000);
  assert.equal(v.items.length, 1);
  assert.equal(v.tienda.nombreVendedora, t.nombreVendedora ?? null);
  // Un segundo registro no crea otro pedido; tampoco se puede descartar.
  assert.throws(() => registrarSolicitudEnDB(db, t.id, "s1", { clienteNuevo: { nombre: "Otra", telefono: null } }, id, ahora), /ya se registró/);
  assert.throws(() => descartarSolicitudEnDB(db, t.id, "s1", ahora), /ya se registró/);
  assert.equal(db.pedidos.filter((x) => x.origen === "catalogo" && x.clienteId === r.cliente.id).length, 1);
  // Registrada no vence a los 7 días; sale de pendientes; la tienda la sigue leyendo por código.
  assert.equal(verSolicitudDeDB(db, "ABCDEFGH23", t.id, Date.parse("2026-10-20T00:00:00Z")).estado, "confirmado");
  assert.equal(solicitudesPendientesDeDB(db, t.id, Date.parse(ahora)).some((s) => s.id === "s1"), false);
  assert.equal(solicitudPorCodigoDeDB(db, "ABCDEFGH23", t.id).pedidoId, r.pedido.id);
  assert.equal(solicitudPorCodigoDeDB(db, "ABCDEFGH23", "otra-tienda"), null);
  // Despachado con fecha; cancelado.
  db = { ...db, pedidos: db.pedidos.map((x) => (x.id === r.pedido.id ? { ...x, estado: "despachado", despachadoEn: "2026-10-05T15:00:00Z" } : x)) };
  assert.equal(verSolicitudDeDB(db, "ABCDEFGH23", t.id, Date.parse(ahora)).despachadoEn, "2026-10-05T15:00:00Z");
});

test("demo: sin registrar vence a los 7 días; descartada se ve vencida", () => {
  let db = construirDesdeSeed(Date.now());
  const t = db.tiendas[0];
  const s = { id: "s2", tiendaId: t.id, codigo: "ZZZZZZZZ22", items: [item()], codigoPromo: null, descuento: 0, total: 1000, creadaEn: "2026-10-01T00:00:00Z", venceEn: "2026-10-08T00:00:00Z", pedidoId: null, descartadaEn: null, dispositivo: "d" };
  db = { ...db, solicitudes: [...db.solicitudes, s] };
  assert.equal(verSolicitudDeDB(db, s.codigo, t.id, Date.parse("2026-10-07T00:00:00Z")).estado, "enviado");
  assert.equal(verSolicitudDeDB(db, s.codigo, t.id, Date.parse("2026-10-09T00:00:00Z")).estado, "vencido");
  const d = descartarSolicitudEnDB(db, t.id, "s2", "2026-10-02T00:00:00Z");
  assert.equal(verSolicitudDeDB(d, s.codigo, t.id, Date.parse("2026-10-02T01:00:00Z")).estado, "vencido");
  assert.equal(verSolicitudDeDB(db, "NOEXISTE22", t.id, Date.now()), null);
});
