// Pruebas de la capa de datos (node --test; Node 22 lee TypeScript sin compilar).
// Sin base real: solo la conversión de nombres, la traducción de errores de Supabase y la elección de modo.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ClienteDuplicado,
  CreditosInsuficientes,
  DatosInvalidos,
  ErrorClaro,
  ErrorDeRed,
  PedidoNoDespachable,
  PedidoNoEncontrado,
  PromoInvalida,
  SesionVencida,
  SinPermiso,
  StockInsuficiente,
  TelefonoDuplicado,
  esErrorDeRed,
  mensajeDeError,
  traducirErrorSupabase,
} from "../lib/data/errores.ts";
import {
  aCliente,
  aPedidoConItems,
  aProducto,
  aPromo,
  aTienda,
  filaCambiosProducto,
  filaMarca,
  filaPedidoNuevo,
  filaProductoNuevo,
  filaPromo,
} from "../lib/data/filas.ts";
import { KEY_MODO, elegirModo, supabaseConfigurado } from "../lib/data/modo.ts";

// ---------------------------------------------------------------------------
// snake_case ↔ camelCase
// ---------------------------------------------------------------------------

const filaTienda = {
  id: "t1",
  slug: "esencias-michel",
  nombre: "Esencias Michel",
  logo_url: null,
  plan: "p60",
  limite_productos: 60,
  creditos_retoque: 35,
  creditos_retoque_mensuales: 100,
  creado_en: "2026-01-01T00:00:00Z",
  marca_color_principal: "#2E2A27",
  marca_color_acento: "#E2B77A",
  marca_estilo: "elegante",
  url_catalogo: "https://ejemplo.com",
};

test("tienda: de fila a la app", () => {
  assert.deepEqual(aTienda(filaTienda), {
    id: "t1",
    slug: "esencias-michel",
    nombre: "Esencias Michel",
    logoUrl: null,
    plan: "p60",
    limiteProductos: 60,
    creditosRetoque: 35,
    creditosRetoqueMensuales: 100,
    creadoEn: "2026-01-01T00:00:00Z",
    marcaColorPrincipal: "#2E2A27",
    marcaColorAcento: "#E2B77A",
    marcaEstilo: "elegante",
    urlCatalogo: "https://ejemplo.com",
  });
});

test("tienda: el ajuste de fecha se aplica (la demo desplaza el seed)", () => {
  assert.equal(aTienda(filaTienda, () => "AJUSTADA").creadoEn, "AJUSTADA");
});

test("marca: solo las columnas que la tienda puede editar, colores en mayúsculas", () => {
  const fila = filaMarca({ logoUrl: "data:x", principal: "#abcdef", acento: "#123abc", estilo: "moderna", urlCatalogo: null });
  assert.deepEqual(fila, {
    logo_url: "data:x",
    marca_color_principal: "#ABCDEF",
    marca_color_acento: "#123ABC",
    marca_estilo: "moderna",
    url_catalogo: null,
  });
  for (const prohibida of ["plan", "creditos_retoque", "limite_productos", "slug", "id"]) assert.ok(!(prohibida in fila));
});

test("producto: ida y vuelta; nunca se envían likes ni fechas", () => {
  const nuevo = { nombre: "Kiara", precio: 1100, fotos: ["a"], fotoRetocada: false, categoria: "Perfumes", activo: true, destacado: false, stock: 3, likes: 99 };
  const fila = filaProductoNuevo("t1", nuevo);
  assert.equal(fila.tienda_id, "t1");
  assert.equal(fila.foto_retocada, false);
  assert.ok(!("likes" in fila));
  assert.ok(!("creado_en" in fila) && !("actualizado_en" in fila));

  const leido = aProducto({ ...fila, id: "p1", likes: 7, creado_en: "c", actualizado_en: "a" });
  assert.equal(leido.fotoRetocada, false);
  assert.equal(leido.likes, 7);
  assert.equal(leido.tiendaId, "t1");
});

test("producto: el update parcial solo lleva lo que cambió", () => {
  assert.deepEqual(filaCambiosProducto({ stock: 0, activo: false }), { stock: 0, activo: false });
  assert.deepEqual(filaCambiosProducto({ fotoRetocada: true, likes: 5 }), { foto_retocada: true });
  assert.deepEqual(filaCambiosProducto({ categoria: null }), { categoria: null });
});

test("pedido nuevo: sin número (lo asigna la base) y con sus ítems al leerlo", () => {
  const fila = filaPedidoNuevo("t1", { clienteId: "c1", origen: "manual", estado: "por_despachar", total: 1377, codigoPromo: "AAAH10" });
  assert.ok(!("numero" in fila));
  assert.equal(fila.codigo_promo, "AAAH10");

  const leido = aPedidoConItems({
    ...fila,
    id: "pe1",
    numero: 1043,
    creado_en: "2026-09-29T10:00:00Z",
    despachado_en: null,
    pedido_items: [{ id: "i1", pedido_id: "pe1", producto_id: "p1", nombre_producto: "Kiara", cantidad: 2, precio_unitario: 935 }],
  });
  assert.equal(leido.numero, 1043);
  assert.equal(leido.clienteId, "c1");
  assert.equal(leido.despachadoEn, null);
  assert.deepEqual(leido.items[0], { id: "i1", pedidoId: "pe1", productoId: "p1", nombreProducto: "Kiara", cantidad: 2, precioUnitario: 935 });
  assert.deepEqual(aPedidoConItems({ ...leido, tienda_id: "t1", cliente_id: null, codigo_promo: null, creado_en: "x", despachado_en: null }).items, []);
});

test("cliente: pedidos_count no pasa a la app como campo propio", () => {
  const c = aCliente({ id: "c1", tienda_id: "t1", nombre: "Ana", telefono: "+18095550142", origen: "manual", primer_pedido_en: "x", pedidos_count: 3, nota: null });
  assert.deepEqual(Object.keys(c).sort(), ["id", "nombre", "nota", "origen", "primerPedidoEn", "telefono", "tiendaId"]);
});

test("promo: código en MAYÚSCULAS, porcentaje numérico y solo el campo de su tipo", () => {
  const base = { nombre: "Otoño", valorPorcentaje: 10, codigo: " aaah10 ", coleccion: "Perfumes", productoId: "p1", fechaInicio: "i", fechaFin: null, estado: "activa" };
  assert.deepEqual(filaPromo("t1", { ...base, tipo: "codigo" }), {
    tienda_id: "t1",
    tipo: "codigo",
    nombre: "Otoño",
    valor_porcentaje: 10,
    codigo: "AAAH10",
    coleccion: null,
    producto_id: null,
    fecha_inicio: "i",
    fecha_fin: null,
    estado: "activa",
  });
  const col = filaPromo("t1", { ...base, tipo: "coleccion" });
  assert.equal(col.codigo, null);
  assert.equal(col.coleccion, "Perfumes");
  assert.equal(col.producto_id, null);
  const pro = filaPromo("t1", { ...base, tipo: "producto", valorPorcentaje: "15" });
  assert.equal(pro.producto_id, "p1");
  assert.equal(pro.valor_porcentaje, 15);

  const leida = aPromo({ ...col, id: "pr1" });
  assert.equal(leida.tiendaId, "t1");
  assert.equal(leida.valorPorcentaje, 10);
});

// ---------------------------------------------------------------------------
// Errores de Supabase → mensajes claros
// ---------------------------------------------------------------------------

test("despachar_pedido: stock insuficiente con el nombre del producto", () => {
  const e = traducirErrorSupabase({ code: "P0001", message: "stock_insuficiente: Kiara Pink 100 ml" });
  assert.ok(e instanceof StockInsuficiente);
  assert.equal(e.producto, "Kiara Pink 100 ml");
  assert.equal(e.message, "No hay stock suficiente de Kiara Pink 100 ml.");
  assert.equal(mensajeDeError(e), "No hay stock suficiente de Kiara Pink 100 ml.");
});

test("despachar_pedido: no encontrado y no despachable", () => {
  assert.ok(traducirErrorSupabase({ code: "P0002", message: "pedido_no_encontrado" }) instanceof PedidoNoEncontrado);
  assert.ok(traducirErrorSupabase({ code: "P0001", message: "pedido_no_despachable" }) instanceof PedidoNoDespachable);
});

test("gastar_creditos: créditos insuficientes y cantidad inválida", () => {
  const e = traducirErrorSupabase({ code: "P0001", message: "creditos_insuficientes" });
  assert.ok(e instanceof CreditosInsuficientes);
  assert.equal(e.disponibles, null);
  assert.ok(traducirErrorSupabase({ code: "22023", message: "cantidad_invalida" }) instanceof DatosInvalidos);
  assert.match(new CreditosInsuficientes(3, 5).message, /tienes 3 y necesitas 5/);
});

test("códigos de promo repetidos entre promos vigentes", () => {
  const e = traducirErrorSupabase({
    code: "23505",
    message: 'duplicate key value violates unique constraint "promos_codigo_vigente"',
    details: "Key (tienda_id, codigo)=(…, AAAH10) already exists.",
  });
  assert.ok(e instanceof PromoInvalida);
  assert.match(e.errores.codigo, /Ya tienes ese código/);
  assert.equal(e.message, e.errores.codigo);
});

test("teléfono de cliente repetido en la tienda", () => {
  const e = traducirErrorSupabase({ code: "23505", message: 'duplicate key value violates unique constraint "clientes_telefono_unico"' });
  assert.ok(e instanceof TelefonoDuplicado);
  const existente = { id: "c1", tiendaId: "t1", nombre: "Ana", telefono: "+18095550142", origen: "manual", primerPedidoEn: "x", nota: null };
  assert.equal(new ClienteDuplicado(existente).message, "Ana ya está en tus clientes con ese WhatsApp.");
});

test("reglas de la tabla, permisos y sesión", () => {
  const url = traducirErrorSupabase({ code: "23514", message: 'new row for relation "tiendas" violates check constraint "tiendas_url_catalogo_check"' });
  assert.ok(url instanceof DatosInvalidos);
  assert.match(url.message, /https:\/\//);
  assert.ok(traducirErrorSupabase({ code: "42501", message: "permission denied for table tiendas" }) instanceof SinPermiso);
  assert.ok(traducirErrorSupabase({ code: "PGRST301", message: "JWT expired" }) instanceof SesionVencida);
});

test("errores de red (Chrome, Safari, Firefox)", () => {
  for (const message of ["TypeError: Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource."]) {
    assert.ok(esErrorDeRed({ message }), message);
    assert.ok(traducirErrorSupabase({ message, code: "" }) instanceof ErrorDeRed, message);
  }
  assert.ok(!esErrorDeRed({ message: "pedido_no_despachable" }));
});

test("un error desconocido no se muestra crudo al dueño", () => {
  const e = traducirErrorSupabase({ code: "XX000", message: "internal error" });
  assert.ok(!(e instanceof ErrorClaro));
  assert.equal(mensajeDeError(e, "No se pudo guardar."), "No se pudo guardar.");
  assert.equal(mensajeDeError(new Error("algo técnico")), "No se pudo. Inténtalo otra vez.");
  // Un error ya traducido pasa tal cual.
  const claro = new PedidoNoEncontrado();
  assert.equal(traducirErrorSupabase(claro), claro);
});

// ---------------------------------------------------------------------------
// Modo
// ---------------------------------------------------------------------------

test("modo: se recuerda el elegido; sin elección, pantalla de entrada", () => {
  assert.equal(KEY_MODO, "deslizapp-modo-v1");
  assert.equal(elegirModo("demo", false), "demo");
  assert.equal(elegirModo("demo", true), "demo");
  assert.equal(elegirModo("real", true), "real");
  assert.equal(elegirModo(null, true), null);
  assert.equal(elegirModo("otro", true), null);
});

test("modo: 'real' sin Supabase configurado vuelve a la entrada", () => {
  assert.equal(elegirModo("real", false), null);
});

test("configuración: URL https y nunca una llave secreta", () => {
  assert.equal(supabaseConfigurado("https://x.supabase.co", "sb_publishable_abc"), true);
  assert.equal(supabaseConfigurado("", "sb_publishable_abc"), false);
  assert.equal(supabaseConfigurado("https://x.supabase.co", undefined), false);
  assert.equal(supabaseConfigurado("http://x.supabase.co", "sb_publishable_abc"), false);
  assert.equal(supabaseConfigurado("https://x.supabase.co", "sb_secret_abc"), false);
});
