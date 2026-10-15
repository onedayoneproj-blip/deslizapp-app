import "./cargar-ts.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { construirDemoPublica, ID_DEMO_PUBLICA, SLUG_DEMO_PUBLICA } = await import("../lib/data/demo-publica.ts");
const { crearAlmacenDemo } = await import("../lib/data/demo.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { esLewisDemo } = await import("../lib/demo/identidad.ts");
const { enlaceCatalogo } = await import("../lib/enlace-catalogo.ts");
const { enlaceProductoHistoria } = await import("../lib/historia.ts");
const memoria = new Map();
globalThis.localStorage = { getItem: k => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v), removeItem: k => memoria.delete(k) };
const fixture = () => crearAlmacenDemo({ clave: "publica-test", construir: construirDemoPublica, publica: true });

test("snapshot público: una tienda, nueve productos e identidades propias; relaciones y dinero coherentes", () => {
  const db = construirDemoPublica();
  assert.equal(db.tiendas.length, 1); assert.equal(db.tiendas[0].id, ID_DEMO_PUBLICA); assert.equal(db.productos.length, 9);
  const real = "95d185a6-61bb-4a97-852c-33ab437be9e4";
  for (const k of ["tiendas", "usuarios", "productos", "clientes", "pedidos", "abonos", "variantes", "pedidoItems", "eventosAaah"]) {
    for (const fila of db[k]) { assert.notEqual(fila.id, real); if (fila.tiendaId) assert.equal(fila.tiendaId, ID_DEMO_PUBLICA); }
  }
  for (const pedido of db.pedidos) {
    const items = db.pedidoItems.filter(i => i.pedidoId === pedido.id);
    assert.equal(pedido.total, items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0));
    assert.ok(db.clientes.some(c => c.id === pedido.clienteId));
    assert.ok(db.abonos.filter(a => a.pedidoId === pedido.id).reduce((s, a) => s + a.monto, 0) <= pedido.total);
  }
  assert.deepEqual(new Set(db.pedidos.map(p => p.estado)), new Set(["nuevo", "por_despachar", "despachado"]));
  for (const p of db.productos.filter(p => p.opciones.length)) assert.equal(p.stock, db.variantes.filter(v => v.productoId === p.id).reduce((s, v) => s + v.stock, 0));
  assert.ok(db.productos.every(p => p.medios.every(m => m.url.startsWith("/demo/deslizapp/"))));
});

test("persistencia anterior y selección interna no se leen ni se borran al entrar o reiniciar la pública", async () => {
  memoria.clear();
  const viejo = JSON.stringify(construirDesdeSeed());
  memoria.set("deslizapp-demo-v5", viejo); memoria.set("deslizapp-sesion-v1", "lino"); memoria.set("auth-fixture", "sesion-google");
  const a = fixture();
  assert.equal(a.leerDemo().tiendaActivaId, ID_DEMO_PUBLICA);
  a.cambiarTiendaActivaDemo("lino"); assert.equal(a.leerDemo().tiendaActivaId, ID_DEMO_PUBLICA);
  await a.fuenteDemo.actualizarProducto(ID_DEMO_PUBLICA, a.leerDemo().db.productos[0].id, { precio: 888 });
  const b = fixture(); assert.equal(b.leerDemo().db.productos[0].precio, 888);
  await b.fuenteDemo.reiniciarDemo(); assert.equal(b.leerDemo().db.productos[0].precio, 250);
  assert.equal(memoria.get("deslizapp-demo-v5"), viejo); assert.equal(memoria.get("deslizapp-sesion-v1"), "lino"); assert.equal(memoria.get("auth-fixture"), "sesion-google");
});

test("comprador local: solicitud identificada DEMO, recarga, registro, despacho y stock sin servicios reales", async () => {
  memoria.clear(); const a = fixture(); const f = a.fuenteDemo;
  const p = a.leerDemo().db.productos.find(p => !p.opciones.length);
  const s = await f.crearSolicitudPedido(SLUG_DEMO_PUBLICA, [{ productoId: p.id, varianteId: null, cantidad: 1 }], null, "dispositivo-demo");
  assert.match(s.codigo, /^DEMO-/);
  const b = fixture(); assert.equal((await b.fuenteDemo.verSolicitud(s.codigo)).total, p.precio);
  const catalogo = await b.fuenteDemo.catalogoPublico(SLUG_DEMO_PUBLICA);
  assert.equal(catalogo.tienda.slug, SLUG_DEMO_PUBLICA);
  const datos = { clienteId: b.leerDemo().db.clientes[0].id, items: [{ productoId: p.id, varianteId: null, cantidad: 1 }], pagoModo: "contado", pagoFechaAcordada: null };
  const pedido = await b.fuenteDemo.crearPedidoManual(ID_DEMO_PUBLICA, datos);
  await b.fuenteDemo.despacharPedido(ID_DEMO_PUBLICA, pedido.pedido.id);
  assert.equal((await b.fuenteDemo.getProducto(ID_DEMO_PUBLICA, p.id)).stock, p.stock - 1);
  await assert.rejects(() => b.fuenteDemo.catalogoPublico("deslizapp"));
});

test("landing en memoria, público e interno conservan almacenes independientes", async () => {
  memoria.clear(); const a = fixture(); const interna = crearAlmacenDemo({ clave: "interno-test", construir: construirDesdeSeed });
  const memoriaDemo = fixture(); const db = construirDesdeSeed(); memoriaDemo.usarDemoEnMemoria(db, db.tiendas[0].id);
  const antes = [...memoria]; await memoriaDemo.fuenteDemo.reiniciarDemo(); assert.deepEqual([...memoria], antes);
  assert.equal(a.leerDemo().db.tiendas.length, 1); assert.equal(interna.leerDemo().db.tiendas.length, 3);
});

test("solo ID de Google verificado y configurado autoriza; metadata, admins o flags no lo sustituyen", () => {
  const google = { id: "lewis-fixture", identities: [{ provider: "google" }] };
  assert.equal(esLewisDemo(google, "lewis-fixture"), true);
  for (const u of [null, { ...google, id: "otra-cuenta" }, { id: google.id, identities: [{ provider: "email" }] }, { id: google.id, user_metadata: { provider: "google", admin: true } }]) assert.equal(esLewisDemo(u, "lewis-fixture"), false);
  assert.equal(esLewisDemo(google, undefined), false);
});

test("los enlaces de catálogo y producto conservan su copia demo", () => {
  const t = construirDemoPublica().tiendas[0];
  assert.match(enlaceCatalogo(t.urlCatalogo).href, /\/tienda\/deslizapp-ejemplo\?demo/);
  assert.match(enlaceProductoHistoria(t.urlCatalogo, "lo-hoddie"), /demo=.*#p\/lo-hoddie/);
});
