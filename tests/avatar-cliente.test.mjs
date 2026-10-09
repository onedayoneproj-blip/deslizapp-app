// Avatar de un cliente (emoji + color): limpieza y guardado en la demo.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const { limpiarAvatar, insertarCliente, modificarCliente } = await import("../lib/data/clientes.ts");
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { COLORES_AVATAR, tonoPastelDePixeles, tonoDeEmoji, TONO_RESPALDO } = await import("../lib/avatar-cliente.ts");

const TIENDA = "a1000000-0000-4000-8000-000000000001";

test("limpiarAvatar: color elegido, «Automático» (emoji sin color), crema sin emoji (se conserva) y sin nada", () => {
  assert.deepEqual(limpiarAvatar("💅🏽", "rosa"), { avatarEmoji: "💅🏽", avatarColor: "rosa" });
  assert.deepEqual(limpiarAvatar("🌸", null), { avatarEmoji: "🌸", avatarColor: null }, "Automático = color nulo con emoji");
  assert.deepEqual(limpiarAvatar(null, "crema"), { avatarEmoji: null, avatarColor: "crema" }, "iniciales con crema: crema se conserva");
  assert.deepEqual(limpiarAvatar(null, "menta"), { avatarEmoji: null, avatarColor: "menta" });
  assert.deepEqual(limpiarAvatar(null, null), { avatarEmoji: null, avatarColor: null }, "iniciales con el rosa de siempre");
  assert.deepEqual(limpiarAvatar("  ", null), { avatarEmoji: null, avatarColor: null });
});

test("limpiarAvatar rechaza con mensaje claro un color inventado o un emoji demasiado largo", () => {
  assert.throws(() => limpiarAvatar("🌸", "fucsia"), /color de avatar no existe/);
  assert.throws(() => limpiarAvatar("x".repeat(17), "rosa"), /emoji no cabe/);
});

test("los emojis con modificadores (tono de piel, ZWJ) caben en el límite de 16", () => {
  for (const e of ["👩🏽‍🦱", "👱🏽‍♀️", "👩🏾‍🦱", "🧔🏽", "👵🏽", "💅🏽", "🛍️"]) assert.deepEqual(limpiarAvatar(e, "menta"), { avatarEmoji: e, avatarColor: "menta" });
});

test("hay 5 colores de la marca", () => {
  assert.deepEqual(COLORES_AVATAR.map((c) => c.id), ["crema", "rosa", "dorado", "menta", "durazno"]);
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

// ---- Color automático ----
const relleno = (rgba, n = 400) => Uint8ClampedArray.from(Array.from({ length: n }, () => rgba).flat());
const canales = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const claridad = (hex) => { const [r, g, b] = canales(hex); return (Math.max(r, g, b) + Math.min(r, g, b)) / 510; };

test("tonoPastelDePixeles: rojo, azul, verde y amarillo dan su pastel (claro, con el canal del tono arriba)", () => {
  const rojo = tonoPastelDePixeles(relleno([220, 30, 40, 255]));
  const azul = tonoPastelDePixeles(relleno([30, 80, 220, 255]));
  const verde = tonoPastelDePixeles(relleno([40, 170, 70, 255]));
  const amarillo = tonoPastelDePixeles(relleno([250, 205, 30, 255]));
  const [rr, rg, rb] = canales(rojo); assert.ok(rr > rg && rr > rb);
  const [ar, ag, ab] = canales(azul); assert.ok(ab > ar && ab > ag);
  const [vr, vg, vb] = canales(verde); assert.ok(vg > vr && vg > vb);
  const [yr, yg, yb] = canales(amarillo); assert.ok(yr > yb && yg > yb);
  for (const t of [rojo, azul, verde, amarillo]) {
    assert.match(t, /^#[0-9A-F]{6}$/);
    assert.ok(claridad(t) >= 0.85 && claridad(t) <= 0.92, `pastel: ${t}`);
  }
});

test("tonoPastelDePixeles: estable, ignora transparente y casi blanco/negro, y gana el color predominante", () => {
  const mezcla = Uint8ClampedArray.from([
    ...relleno([40, 170, 70, 255], 300), // verde (predominante)
    ...relleno([220, 30, 40, 255], 100), // rojo
    ...relleno([255, 255, 255, 255], 500), // blanco: se ignora
    ...relleno([0, 0, 0, 255], 500), // negro: se ignora
    ...relleno([200, 20, 20, 0], 800), // transparente: se ignora
  ]);
  const t = tonoPastelDePixeles(mezcla);
  assert.equal(t, tonoPastelDePixeles(mezcla), "mismo emoji → mismo tono");
  const [r, g, b] = canales(t);
  assert.ok(g > r && g > b, "ganó el verde");
});

test("tonoPastelDePixeles: sin píxeles útiles da null; un gris da un pastel casi neutro; tonoDeEmoji cae al respaldo sin navegador", () => {
  assert.equal(tonoPastelDePixeles(relleno([0, 0, 0, 0])), null);
  assert.equal(tonoPastelDePixeles(relleno([255, 255, 255, 255])), null);
  assert.equal(tonoPastelDePixeles([]), null);
  const gris = canales(tonoPastelDePixeles(relleno([120, 120, 125, 255])));
  assert.ok(Math.max(...gris) - Math.min(...gris) < 40, "casi neutro");
  assert.equal(tonoDeEmoji("🌸"), TONO_RESPALDO, "en servidor (sin document) → crema");
});
