// Tu próxima jugada en la demo (lib/data/jugadas.ts): mismas reglas que crear_codigo_cliente y registrar_envio_jugada
import assert from "node:assert/strict";
import { test } from "node:test";
import { crearCodigoClienteEnDB, enviosDeTienda, registrarEnvioEnDB } from "../lib/data/jugadas.ts";

const AHORA = Date.parse("2026-10-03T15:00:00Z");
const db = () => ({
  tiendas: [], usuarios: [], pedidos: [], pedidoItems: [], abonos: [], ajustesInventario: [], eventosAaah: [], jugadaEnvios: [],
  clientes: [
    { id: "lu", tiendaId: "t", nombre: "Luisanna Peña" },
    { id: "otra", tiendaId: "t2", nombre: "Otra" },
  ],
  productos: ["p1", "p2", "p3", "p4"].map((id) => ({ id, tiendaId: "t" })).concat([{ id: "px", tiendaId: "t2" }]),
  promos: [{ id: "g", tiendaId: "t", tipo: "codigo", codigo: "VERANO", estado: "activa", clienteId: null }],
});

test("crear código: propuesto, repetido, escrito, errores", () => {
  let base = db();
  const a = crearCodigoClienteEnDB(base, "t", "lu", 10, 14, null, "a", AHORA);
  assert.equal(a.promo.codigo, "LUISAN10");
  assert.equal(a.promo.clienteId, "lu");
  assert.equal(a.promo.limiteUsos, 1);
  assert.equal(a.promo.nombre, "Para Luisanna Peña");
  assert.equal(a.promo.fechaFin, "2026-10-18T03:59:59.999Z");
  base = a.db;
  assert.equal(crearCodigoClienteEnDB(base, "t", "lu", 10, 14, null, "b", AHORA).promo.codigo, "LUISAN1010");
  assert.equal(crearCodigoClienteEnDB(base, "t", "lu", 15, 7, "mi15", "c", AHORA).promo.codigo, "MI15");
  assert.throws(() => crearCodigoClienteEnDB(base, "t", "lu", 10, 14, "luisan10", "d", AHORA), { message: "Ese código ya existe. Prueba otro." });
  assert.throws(() => crearCodigoClienteEnDB(base, "t", "lu", 10, 14, "ab", "d", AHORA), { message: "Usa de 3 a 15 letras o números, sin espacios." });
  assert.throws(() => crearCodigoClienteEnDB(base, "t", "otra", 10, 14, null, "d", AHORA), /cliente/);
  assert.throws(() => crearCodigoClienteEnDB(base, "t", "lu", 95, 14, null, "d", AHORA), /90 %/);
});

test("registrar envío: valida tienda, código y productos", () => {
  const { db: d, promo } = crearCodigoClienteEnDB(db(), "t", "lu", 10, 14, null, "a", AHORA);
  const r = registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "codigo", promoId: promo.id }, "e1", AHORA);
  assert.equal(r.envio.promoId, "a");
  assert.equal(registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "codigo", promoId: "g" }, "e2", AHORA).envio.promoId, "g");
  assert.throws(() => registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "productos", productoIds: ["p1", "p2", "p3", "p4"] }, "e", AHORA), /1 a 3/);
  assert.throws(() => registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "productos", productoIds: ["p1", "px"] }, "e", AHORA), /1 a 3/);
  assert.throws(() => registrarEnvioEnDB(d, "t", { clienteId: "otra", jugada: "segundo", tipo: "saludo" }, "e", AHORA), /cliente/);
  assert.throws(() => registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "saludo", promoId: "a" }, "e", AHORA), /código/);
  assert.equal(registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "primer", tipo: "productos", productoIds: ["p1", "p2"] }, "e3", AHORA).envio.productoIds.length, 2);
});

test("envíos de los últimos 30 días, del más nuevo al más viejo", () => {
  let d = db();
  d = registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "saludo" }, "viejo", AHORA - 40 * 86_400_000).db;
  d = registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "saludo" }, "medio", AHORA - 3 * 86_400_000).db;
  d = registrarEnvioEnDB(d, "t", { clienteId: "lu", jugada: "segundo", tipo: "saludo" }, "nuevo", AHORA - 86_400_000).db;
  assert.deepEqual(enviosDeTienda(d, "t", AHORA).map((e) => e.id), ["nuevo", "medio"]);
});
