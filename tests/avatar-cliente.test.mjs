// Avatar de un cliente (emoji + color): limpieza y guardado en la demo.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const { limpiarAvatar, insertarCliente, modificarCliente } = await import("../lib/data/clientes.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { COLORES_AVATAR, EMOJIS_AVATAR } = await import("../lib/avatar-cliente.ts");

const TIENDA = "a1000000-0000-4000-8000-000000000001";

test("limpiarAvatar: emoji con color, emoji sin color (crema), color solo y sin nada", () => {
  assert.deepEqual(limpiarAvatar("💅🏽", "rosa"), { avatarEmoji: "💅🏽", avatarColor: "rosa" });
  assert.deepEqual(limpiarAvatar("🌸", null), { avatarEmoji: "🌸", avatarColor: "crema" });
  assert.deepEqual(limpiarAvatar(null, "menta"), { avatarEmoji: null, avatarColor: "menta" });
  assert.deepEqual(limpiarAvatar(null, null), { avatarEmoji: null, avatarColor: null });
  assert.deepEqual(limpiarAvatar("  ", "fucsia"), { avatarEmoji: null, avatarColor: null });
  assert.deepEqual(limpiarAvatar("x".repeat(40), "rosa"), { avatarEmoji: null, avatarColor: "rosa" });
});

test("hay 5 colores de la marca y emojis sin repetir", () => {
  assert.deepEqual(COLORES_AVATAR.map((c) => c.id), ["crema", "rosa", "dorado", "menta", "durazno"]);
  assert.equal(new Set(EMOJIS_AVATAR).size, EMOJIS_AVATAR.length);
});

test("crear un cliente con avatar y nota lo guarda; sin avatar queda en iniciales", () => {
  const db = construirDesdeSeed();
  const a = insertarCliente(db, TIENDA, { nombre: "Paola", telefono: "809-555-0999", nota: "Talla M", avatarEmoji: "💅🏽", avatarColor: "rosa" }, "n1", "2026-10-09T00:00:00Z");
  assert.equal(a.cliente.avatarEmoji, "💅🏽");
  assert.equal(a.cliente.avatarColor, "rosa");
  assert.equal(a.cliente.nota, "Talla M");
  const b = insertarCliente(a.db, TIENDA, { nombre: "Rosa", telefono: "809-555-0998" }, "n2", "2026-10-09T00:00:00Z");
  assert.equal(b.cliente.avatarEmoji, null);
  assert.equal(b.cliente.avatarColor, null);
});

test("editar: sin campos de avatar no se toca; con ellos cambia; null vuelve a las iniciales", () => {
  const db0 = construirDesdeSeed();
  const c = db0.clientes.find((x) => x.tiendaId === TIENDA);
  const conAvatar = modificarCliente(db0, TIENDA, c.id, { nombre: c.nombre, telefono: c.telefono, avatarEmoji: "🌸", avatarColor: "menta" });
  assert.equal(conAvatar.cliente.avatarEmoji, "🌸");
  const sinTocar = modificarCliente(conAvatar.db, TIENDA, c.id, { nombre: "Otro nombre", telefono: c.telefono });
  assert.equal(sinTocar.cliente.avatarEmoji, "🌸");
  assert.equal(sinTocar.cliente.avatarColor, "menta");
  const reset = modificarCliente(sinTocar.db, TIENDA, c.id, { nombre: "Otro nombre", telefono: c.telefono, avatarEmoji: null, avatarColor: null });
  assert.equal(reset.cliente.avatarEmoji, null);
  assert.equal(reset.cliente.avatarColor, null);
});
