import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { pedirRetoqueEnDB, creditosReservados, trabajosDeTienda, estadoFotoEnTaller, fotoGuardada } = await import("../lib/data/retoques.ts");
const { crearFuenteAdminDemoCompartida } = await import("../lib/data/admin/demo-compartida.ts");
const { CreditosInsuficientes, DatosInvalidos } = await import("../lib/data/errores.ts");

const ahora = Date.parse("2026-10-06T12:00:00Z");
const RETOCADA = "data:image/jpeg;base64,QUJD";

/** La demo del panel en memoria (en el navegador es localStorage): leer y guardar como lib/data/demo.ts. */
function panel() {
  let db = construirDesdeSeed(ahora);
  const tienda = db.tiendas.find((t) => db.productos.some((p) => p.tiendaId === t.id && p.medios.some((m) => m.tipo === "foto")));
  tienda.creditosRetoque = 12;
  const producto = db.productos.find((p) => p.tiendaId === tienda.id && !p.eliminadoEn && p.medios.some((m) => m.tipo === "foto"));
  producto.medios = producto.medios.map((m) => (m.tipo === "foto" ? { ...m, retocada: false } : m));
  const fotos = producto.medios.filter((m) => m.tipo === "foto").map((m) => m.url);
  let escrituras = 0;
  return {
    get db() {
      return db;
    },
    set db(v) {
      db = v;
    },
    tienda,
    producto,
    fotos,
    get escrituras() {
      return escrituras;
    },
    leer: () => structuredClone(db),
    guardar: (cambio) => {
      escrituras++;
      db = cambio(structuredClone(db));
    },
    pedir(url, id = crypto.randomUUID()) {
      const r = pedirRetoqueEnDB(db, tienda.id, producto.id, url, new Date(ahora).toISOString(), id, null);
      db = r.db;
      return r.trabajo;
    },
  };
}
const tiendaDe = (p) => p.db.tiendas.find((t) => t.id === p.tienda.id);
const productoDe = (p) => p.db.productos.find((x) => x.id === p.producto.id);

test("pedir retoque en la demo del panel: reserva sin cobrar, sin duplicados y con saldo libre", () => {
  const p = panel();
  const t = p.pedir(p.fotos[0]);
  assert.equal(t.estado, "pendiente");
  assert.equal(tiendaDe(p).creditosRetoque, 12, "pedir no cobra");
  assert.equal(creditosReservados(p.db.trabajosRetoque, p.tienda.id), 5);
  assert.throws(() => p.pedir(p.fotos[0]), DatosInvalidos, "la misma foto no entra dos veces");
  assert.throws(() => p.pedir("https://example.invalid/no-esta.jpg"), DatosInvalidos);
  if (p.fotos[1]) {
    p.pedir(p.fotos[1]);
    assert.equal(creditosReservados(p.db.trabajosRetoque, p.tienda.id), 10);
    // Solo quedan 2 libres (12 − 10): la tercera no cabe.
    if (p.fotos[2]) assert.throws(() => p.pedir(p.fotos[2]), CreditosInsuficientes);
  }
  assert.equal(fotoGuardada("blob:https://x/1"), false);
  assert.equal(fotoGuardada("data:text/html;base64,AA"), false);
  assert.equal(fotoGuardada("data:image/jpeg;base64,AA"), true);
});

test("ciclo compartido: la tienda pide, el admin demo entrega una vez y la tienda ve la foto y el cobro", async () => {
  const p = panel();
  const original = p.fotos[0];
  const pedido = p.pedir(original);
  const f = crearFuenteAdminDemoCompartida(p.leer, p.guardar, () => ahora);
  const cola = await f.trabajosRetoque("pendiente");
  const mio = cola.find((t) => t.id === pedido.id);
  assert.ok(mio, "el admin ve la foto que pidió la tienda");
  assert.equal(mio.productoNombre, p.producto.nombre);
  // El admin ya no ve el trabajo de ejemplo del seed sobre esa tienda: manda el panel.
  assert.equal(cola.filter((t) => t.tiendaId === p.tienda.id).length, 1);

  const url = await f.subirRetocada(mio, RETOCADA);
  const entregado = await f.entregarRetoque(mio.id, url);
  assert.equal(entregado.estado, "entregado");
  const prod = productoDe(p);
  assert.ok(prod.medios.some((m) => m.tipo === "foto" && m.url === RETOCADA && m.retocada), "la foto nueva está en el producto");
  assert.ok(!prod.medios.some((m) => m.url === original), "la original salió del producto");
  assert.equal(prod.fotos[0], prod.medios.find((m) => m.tipo === "foto").url);
  const tr = p.db.trabajosRetoque.find((t) => t.id === mio.id);
  assert.equal(tr.medioUrlOriginal, original, "la original queda en el historial del trabajo");
  assert.equal(tr.medioUrlRetocado, RETOCADA);
  assert.equal(tr.productoNombre, undefined, "no se guardan campos de lectura del admin");
  assert.equal(tiendaDe(p).creditosRetoque, 7, "cobra 5 al entregar");
  assert.equal(creditosReservados(p.db.trabajosRetoque, p.tienda.id), 0);
  assert.equal(estadoFotoEnTaller(p.db.trabajosRetoque, p.producto.id, RETOCADA)?.estado, "entregado");

  // Doble envío / respuesta repetida: no cobra otra vez.
  await assert.rejects(f.entregarRetoque(mio.id, RETOCADA), { codigo: "trabajo_no_pendiente" });
  await assert.rejects(f.devolverRetoque(mio.id, "otra"), { codigo: "trabajo_no_pendiente" });
  assert.equal(tiendaDe(p).creditosRetoque, 7);
});

test("devolver: guarda la razón, no cobra y libera la reserva", async () => {
  const p = panel();
  const pedido = p.pedir(p.fotos[0]);
  const f = crearFuenteAdminDemoCompartida(p.leer, p.guardar, () => ahora);
  await assert.rejects(f.devolverRetoque(pedido.id, "   "), { codigo: "motivo_invalido" });
  const d = await f.devolverRetoque(pedido.id, "Está muy oscura, súbela con más luz");
  assert.equal(d.estado, "devuelto");
  const tr = p.db.trabajosRetoque.find((t) => t.id === pedido.id);
  assert.equal(tr.motivoDevolucion, "Está muy oscura, súbela con más luz");
  assert.equal(tiendaDe(p).creditosRetoque, 12, "no cobra");
  assert.equal(creditosReservados(p.db.trabajosRetoque, p.tienda.id), 0, "libera la reserva");
  assert.deepEqual(productoDe(p).medios.find((m) => m.tipo === "foto").url, p.fotos[0], "la foto sigue igual");
  assert.equal(estadoFotoEnTaller(p.db.trabajosRetoque, p.producto.id, p.fotos[0])?.estado, "devuelto");
  assert.equal(trabajosDeTienda(p.db.trabajosRetoque, p.tienda.id, ahora).length, 1);
  assert.equal(trabajosDeTienda(p.db.trabajosRetoque, p.tienda.id, ahora + 31 * 86_400_000).length, 0);
});

test("si la tienda cambió la foto mientras esperaba, el admin no la sustituye ni cobra", async () => {
  const p = panel();
  const pedido = p.pedir(p.fotos[0]);
  const f = crearFuenteAdminDemoCompartida(p.leer, p.guardar, () => ahora);
  await f.trabajosRetoque("pendiente");
  // La tienda reemplaza esa foto en su panel (otra pestaña o antes de que el admin entregue).
  const nueva = "data:image/jpeg;base64,TlVFVkE=";
  p.db = {
    ...p.db,
    productos: p.db.productos.map((x) =>
      x.id === p.producto.id ? { ...x, medios: x.medios.map((m) => (m.url === p.fotos[0] ? { tipo: "foto", url: nueva, retocada: false } : m)) } : x,
    ),
  };
  const antes = structuredClone(p.db);
  await assert.rejects(f.entregarRetoque(pedido.id, RETOCADA), { codigo: "foto_no_encontrada" });
  assert.deepEqual(p.db, antes, "nada cambió en el panel");
  assert.equal(tiendaDe(p).creditosRetoque, 12);
});

test("si la tienda retiró el producto, no se entrega; un cambio de la tienda entre medias no se pisa", async () => {
  const p = panel();
  const pedido = p.pedir(p.fotos[0]);
  const f = crearFuenteAdminDemoCompartida(p.leer, p.guardar, () => ahora);
  // La tienda cambia el nombre y el precio: el admin no los toca al devolver lo suyo.
  p.db = { ...p.db, productos: p.db.productos.map((x) => (x.id === p.producto.id ? { ...x, nombre: "Nombre nuevo", precio: 999 } : x)) };
  await f.entregarRetoque(pedido.id, RETOCADA);
  assert.equal(productoDe(p).nombre, "Nombre nuevo");
  assert.equal(productoDe(p).precio, 999);

  const otra = p.fotos[1];
  if (!otra) return;
  const segundo = p.pedir(otra);
  p.db = { ...p.db, productos: p.db.productos.map((x) => (x.id === p.producto.id ? { ...x, eliminadoEn: new Date(ahora).toISOString() } : x)) };
  const antes = structuredClone(p.db);
  await assert.rejects(f.entregarRetoque(segundo.id, RETOCADA), { codigo: "producto_no_encontrado" });
  assert.deepEqual(p.db, antes);
});

test("las operaciones van en fila y una lectura no escribe en el panel", async () => {
  const p = panel();
  const a = p.pedir(p.fotos[0]);
  const f = crearFuenteAdminDemoCompartida(p.leer, p.guardar, () => ahora);
  await Promise.all([f.hoy(), f.tiendas(), f.productosTienda(p.tienda.id), f.personalizacionTienda(p.tienda.id)]);
  assert.equal(p.escrituras, 0, "leer no guarda");
  // Doble toque en Entregar: una sola entrega y un solo cobro.
  const r = await Promise.allSettled([f.entregarRetoque(a.id, RETOCADA), f.entregarRetoque(a.id, RETOCADA)]);
  assert.deepEqual(r.map((x) => x.status).sort(), ["fulfilled", "rejected"]);
  assert.equal(tiendaDe(p).creditosRetoque, 7);
});

test("productosTienda y personalización del admin demo; guardar personalización vuelve al panel", async () => {
  const p = panel();
  const f = crearFuenteAdminDemoCompartida(p.leer, p.guardar, () => ahora);
  const productos = await f.productosTienda(p.tienda.id);
  assert.ok(productos.length > 0);
  assert.ok(productos.every((x) => !("tiendaId" in x)));
  const per = await f.personalizacionTienda(p.tienda.id);
  assert.equal(per.slug, p.tienda.slug);
  await f.guardarPersonalizacion(p.tienda.id, {
    mensajes: { boton_comprar: "Lo quiero" },
    secciones: { opiniones: false },
    productos: [{ id: productos[0].id, orden: 1 }],
  });
  assert.equal(tiendaDe(p).personalizacion.mensajes.boton_comprar, "Lo quiero");
  assert.equal(tiendaDe(p).personalizacion.secciones.opiniones, false);
  assert.equal(productoDe({ db: p.db, producto: productos[0] }).orden, 1);
  await assert.rejects(f.guardarPersonalizacion(p.tienda.id, { secciones: { opiniones: "pronto" } }), { codigo: "personalizacion_invalida" });
  await assert.rejects(f.subirRetocada({ id: "x", tiendaId: p.tienda.id }, "data:image/svg+xml;base64,AA"), { codigo: "formato_no_permitido" });
});
