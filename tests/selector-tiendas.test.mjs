import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";
const memoria = new Map();
globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v), removeItem: (k) => memoria.delete(k) };
const C = await import("../lib/cuenta.ts");
const { fuenteDemo, cambiarTiendaActivaDemo, leerDemo } = await import("../lib/data/demo.ts");
const { crearFuenteSupabase } = await import("../lib/data/supabase.ts");

test("las tiendas se ordenan con la activa primero y después por nombre, sin importar tildes ni mayúsculas", () => {
  const t = [{ id: "c", nombre: "Zapatos Ñandú" }, { id: "a", nombre: "árbol" }, { id: "b", nombre: "Bisutería" }, { id: "d", nombre: "casa verde" }];
  assert.deepEqual(C.ordenarTiendas(t, "d").map((x) => x.id), ["d", "a", "b", "c"]);
  assert.deepEqual(C.ordenarTiendas(t, "c").map((x) => x.id), ["c", "a", "b", "d"]);
  assert.deepEqual(C.ordenarTiendas(t, "no-existe").map((x) => x.id), ["a", "b", "d", "c"], "sin activa solo por nombre");
  assert.deepEqual(t.map((x) => x.id), ["c", "a", "b", "d"], "no cambia la lista original");
});

test("el título del menú y la etiqueta del encabezado dependen de cuántas tiendas hay", () => {
  assert.equal(C.tituloMenu(1), "Tu tienda");
  assert.equal(C.tituloMenu(0), "Tu tienda");
  assert.equal(C.tituloMenu(3), "Tus tiendas");
  assert.equal(C.accionEncabezado(1), "Menú de la tienda");
  assert.equal(C.accionEncabezado(2), "Menú de tus tiendas");
  assert.equal(C.etiquetaTienda("Mora Shoes", "Pro", true), "Mora Shoes, Pro, tienda activa");
  assert.equal(C.etiquetaTienda("Luna", "Tienda", false), "Luna, Tienda");
});

test("la cuenta sale de los datos de Google de la sesión: nombre, correo y foto https; sin foto, iniciales", () => {
  const c = C.cuentaDeClaims({ email: "marcela@ejemplo.invalid", user_metadata: { full_name: "Marcela Pérez", avatar_url: "https://lh3.googleusercontent.com/a/x" } });
  assert.deepEqual(c, { nombre: "Marcela Pérez", email: "marcela@ejemplo.invalid", fotoUrl: "https://lh3.googleusercontent.com/a/x" });
  assert.equal(C.cuentaDeClaims({ email: "m@ejemplo.invalid", user_metadata: { name: "Ana", picture: "http://inseguro/x.png" } }).fotoUrl, null, "solo https");
  assert.deepEqual(C.cuentaDeClaims({ email: "sol@ejemplo.invalid" }), { nombre: "sol", email: "sol@ejemplo.invalid", fotoUrl: null }, "sin nombre usa lo de antes de la @");
  assert.equal(C.cuentaDeClaims(null), null);
  assert.equal(C.cuentaDeClaims({}), null);
  assert.equal(C.cuentaDeClaims({ user_metadata: { avatar_url: 5, full_name: 7 } }), null, "tipos raros se ignoran");
  assert.equal(C.inicialesDeCuenta({ nombre: "Marcela Pérez", email: "" }), "MP");
  assert.equal(C.inicialesDeCuenta({ nombre: "Sol", email: "" }), "SO");
  assert.equal(C.inicialesDeCuenta({ nombre: "", email: "" }), "?");
  assert.deepEqual(C.CUENTA_DEMO, { nombre: "Cuenta de demo", email: "", fotoUrl: null });
});

test("el aviso al cambiar de tienda y el de error no piden disculpas largas", () => {
  assert.equal(C.avisoAhoraEstas("Luna Bisutería"), "Ahora estás en Luna Bisutería.");
  assert.equal(C.AVISO_SIN_CAMBIO, "No pudimos cambiar de tienda. Sigues en la de antes.");
  for (const t of [C.avisoAhoraEstas("X"), C.AVISO_SIN_CAMBIO, C.DETALLE_MI_MARCA, C.tituloMenu(2)]) assert.ok(!t.includes("!"));
});

test("demo: al cambiar de tienda no queda ningún dato de la anterior", async () => {
  const demo = leerDemo();
  const [a, b, c] = demo.db.tiendas;
  assert.ok(a && b && c, "la demo trae 3 tiendas");
  for (const origen of [a, b, c]) {
    cambiarTiendaActivaDemo(origen.id);
    assert.equal(leerDemo().tiendaActivaId, origen.id);
    for (const otra of [a, b, c].filter((t) => t.id !== origen.id)) {
      const productos = await fuenteDemo.getProductos(origen.id);
      assert.ok(productos.length > 0 && productos.every((p) => p.tiendaId === origen.id), "solo productos de la activa");
      assert.ok(!productos.some((p) => p.tiendaId === otra.id));
      const pedidos = await fuenteDemo.getPedidos(origen.id);
      assert.ok(pedidos.every((p) => p.tiendaId === origen.id));
      const clientes = await fuenteDemo.getClientes(origen.id);
      assert.ok(clientes.every((x) => x.tiendaId === origen.id));
    }
  }
  const antes = leerDemo().tiendaActivaId;
  cambiarTiendaActivaDemo("no-existe");
  assert.equal(leerDemo().tiendaActivaId, antes, "una tienda que no existe no cambia nada");
});

test("real: getTiendas pide solo las tiendas de la cuenta (mis_tiendas) y descarta las eliminadas", async () => {
  const llamadas = [];
  const fila = (id, nombre, estado = "activa") => ({ id, slug: nombre, nombre, estado, plan: "p60", limite_productos: 60, creditos_retoque: 10, creditos_retoque_mensuales: 100, creado_en: new Date().toISOString(), logo_url: null });
  const cliente = {
    rpc: (nombre) => {
      llamadas.push(["rpc", nombre]);
      return Promise.resolve({ data: ["t1", "t2"], error: null });
    },
    from: (n) => {
      assert.equal(n, "tiendas");
      const q = {
        select: () => q,
        in: (k, v) => { llamadas.push(["in", k, v]); return q; },
        order: () => Promise.resolve({ data: [fila("t1", "Esencias"), fila("t2", "Ensayo", "eliminada")], error: null }),
      };
      return q;
    },
  };
  const fuente = crearFuenteSupabase(cliente, () => {});
  const tiendas = await fuente.getTiendas();
  assert.deepEqual(llamadas, [["rpc", "mis_tiendas"], ["in", "id", ["t1", "t2"]]]);
  assert.deepEqual(tiendas.map((t) => t.id), ["t1"], "la eliminada no sale");
  // Sin tiendas no consulta nada más.
  const vacio = crearFuenteSupabase({ rpc: () => Promise.resolve({ data: [], error: null }), from: () => assert.fail("no debería consultar") }, () => {});
  assert.deepEqual(await vacio.getTiendas(), []);
});
