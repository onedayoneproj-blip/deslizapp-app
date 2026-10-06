import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const { crearEstadoAdminDemo } = await import("../lib/data/admin/seed.ts");
const { crearFuenteAdminDemo } = await import("../lib/data/admin/demo.ts");
const { crearFuenteAdminSupabase, desdeFilaAdmin } =
  await import("../lib/data/admin/supabase.ts");
const ahora = Date.parse("2026-10-06T12:00:00Z");
const fixture = () => {
  const estado = crearEstadoAdminDemo(ahora);
  return { estado, f: crearFuenteAdminDemo(estado, () => ahora) };
};
test("seed aislado cubre las 12 reglas, posponer oculta y vuelve tras 24h; condiciones resueltas desaparecen", async () => {
  let reloj = ahora;
  const estado = crearEstadoAdminDemo(ahora),
    f = crearFuenteAdminDemo(estado, () => reloj);
  const hoy = await f.hoy();
  assert.deepEqual(
    new Set(hoy.map((a) => a.regla)),
    new Set([
      "pago_vencido",
      "prueba_termina",
      "vence_pronto",
      "solicitudes",
      "catalogo_solicitado",
      "catalogo_cambios",
      "prueba_sin_productos",
      "sin_entrar",
      "sin_pedidos",
      "fotos",
      "catalogo_generando",
      "plataforma",
    ]),
  );
  const vencido = hoy.find((a) => a.regla === "pago_vencido");
  await f.posponer(vencido.clave);
  assert.ok(!(await f.hoy()).some((a) => a.clave === vencido.clave));
  reloj += 24 * 3600000;
  assert.ok((await f.hoy()).some((a) => a.clave === vencido.clave));
  estado.panel.tiendas.find((t) => t.id === vencido.tiendaId).pagadoHasta =
    "2026-12-01";
  assert.ok(
    !(await f.hoy()).some(
      (a) => a.regla === "pago_vencido" && a.tiendaId === vencido.tiendaId,
    ),
  );
});
test("pago/anulación encadenada, créditos reservados, idempotencia y rollback demo", async () => {
  const { estado, f } = fixture(),
    id = estado.panel.tiendas[0].id;
  estado.panel.tiendas[0].pagadoHasta = null;
  const p = await f.registrarPago({
    tiendaId: id,
    concepto: "mensualidad",
    monto: 1000,
    metodo: "efectivo",
  });
  assert.equal(p.pagadoHasta, "2026-11-06");
  const q = await f.registrarPago({
    tiendaId: id,
    concepto: "mensualidad",
    monto: 1000,
    metodo: "efectivo",
  });
  assert.equal(q.pagadoHasta, "2026-12-06");
  assert.equal(
    (await f.anularPago(p.pago.id, "error")).pagadoHasta,
    "2026-11-06",
  );
  const n = await f.recargaMensual(id);
  assert.equal(n, 1);
  assert.equal(await f.recargaMensual(id), 0);
  const antes = structuredClone(estado);
  await assert.rejects(
    f.ajustarCreditos(id, -99999, "error"),
    /creditos_insuficientes/,
  );
  assert.deepEqual(estado, antes);
  for (const t of estado.panel.tiendas)
    assert.equal(
      t.creditosRetoque,
      estado.movimientos
        .filter((m) => m.tiendaId === t.id)
        .reduce((n, m) => n + m.cantidad, 0),
    );
});
test("retoque: reserva, no doble pedido, devolución no cobra, entrega cobra y conserva otras fotos", async () => {
  const { estado, f } = fixture(),
    tr = estado.trabajos[0],
    id = tr.tiendaId,
    saldo = estado.panel.tiendas.find((t) => t.id === id).creditosRetoque;
  await f.devolverRetoque(tr.id, "muy borrosa");
  assert.equal(
    estado.panel.tiendas.find((t) => t.id === id).creditosRetoque,
    saldo,
  );
  const admin = estado.usuarioId;
  estado.usuarioId = estado.panel.usuarios.find((u) => u.tiendaId === id).id;
  const nuevo = await f.pedirRetoque(tr.productoId, tr.medioUrlOriginal);
  await assert.rejects(
    f.pedirRetoque(tr.productoId, tr.medioUrlOriginal),
    /retoque_pendiente/,
  );
  estado.usuarioId = admin;
  await f.entregarRetoque(nuevo.id, "https://example.invalid/retocada.jpg");
  assert.equal(
    estado.panel.tiendas.find((t) => t.id === id).creditosRetoque,
    saldo - 5,
  );
  assert.ok(
    estado.panel.productos
      .find((p) => p.id === tr.productoId)
      .medios.some(
        (m) => m.retocada && m.url === "https://example.invalid/retocada.jpg",
      ),
  );
});
test("admins: quitar no borra fila, retirado pierde funciones y no se puede quitar al último", async () => {
  const { estado, f } = fixture(),
    primero = estado.usuarioId,
    u = estado.panel.usuarios[0];
  await assert.rejects(f.quitarAdmin(primero), /ultimo_admin/);
  await f.agregarAdmin(u.email);
  await f.iniciarVerComo(estado.panel.tiendas[0].id);
  await f.quitarAdmin(primero);
  assert.ok(estado.admins.find((a) => a.usuarioId === primero).quitadoEn);
  assert.equal(await f.soyAdmin(), false);
  await assert.rejects(f.hoy(), /no_admin/);
  estado.usuarioId = u.id;
  await assert.rejects(f.quitarAdmin(u.id), /ultimo_admin/);
});
test("planes nuevos, menor límite no oculta; personalización valida toda la transacción", async () => {
  const { estado, f } = fixture(),
    id = estado.panel.tiendas[0].id;
  await f.guardarPlan({
    id: "nuevo",
    nombre: "Nuevo",
    precioMensual: 500,
    limiteProductos: 1,
    creditosMensuales: 25,
    seOfrece: true,
    orden: 5,
    destacado: false,
  });
  const antes = estado.panel.productos.filter(
    (p) => p.tiendaId === id && p.activo,
  ).length;
  const cambio = await f.cambiarPlan(id, "nuevo");
  assert.equal(cambio.sobran, Math.max(0, antes - 1));
  assert.equal(
    estado.panel.productos.filter((p) => p.tiendaId === id && p.activo).length,
    antes,
  );
  const snapshot = structuredClone(estado);
  await assert.rejects(
    f.guardarPersonalizacion(id, {
      mensajes: { saludo: "hola" },
      productos: [{ id: "00000000-0000-4000-8000-000000000000", orden: 2 }],
    }),
    /producto_no_encontrado/,
  );
  assert.deepEqual(estado, snapshot);
  await assert.rejects(
    f.avanzarCatalogo(id, "a_revisar"),
    /catalogo_estado_invalido/,
  );
});
test("adaptador real conserva datos/detalle/JSON y manda los parámetros reales, sin inventar precios", async () => {
  assert.deepEqual(
    desdeFilaAdmin({
      tienda_id: "t",
      datos: { mas_vieja: "x" },
      conteos: { en_prueba: 2 },
      funciones: { proximaJugada: true },
    }),
    {
      tiendaId: "t",
      datos: { mas_vieja: "x" },
      conteos: { en_prueba: 2 },
      funciones: { proximaJugada: true },
    },
  );
  const llamadas = [],
    f = crearFuenteAdminSupabase({
      rpc: async (nombre, args) => {
        llamadas.push({ nombre, args });
        return {
          data: {
            tema: { colores: { "accent-soft": "#123456" } },
            mensajes: { boton_comprar: "Sí" },
          },
          error: null,
        };
      },
    });
  assert.deepEqual(
    await f.guardarPersonalizacion("t", { mensajes: { boton_comprar: "Sí" } }),
    {
      tema: { colores: { "accent-soft": "#123456" } },
      mensajes: { boton_comprar: "Sí" },
    },
  );
  await f.registrarPago({
    tiendaId: "t",
    concepto: "mensualidad",
    monto: 0,
    metodo: "efectivo",
  });
  assert.equal(llamadas[1].args.p_monto, 0);
  assert.equal(llamadas[1].args.p_creditos, null);
  const fallida = crearFuenteAdminSupabase({
    rpc: async () => ({ data: null, error: { message: "no_admin" } }),
  });
  await assert.rejects(fallida.hoy(), /no_admin/);
});
