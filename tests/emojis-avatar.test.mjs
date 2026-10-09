// Selector de emojis del avatar: validador de «un solo emoji», tonos de piel, recientes y datos curados.
import assert from "node:assert/strict";
import { test } from "node:test";
import "./cargar-ts.mjs";
const { validarEmoji, conTono, conReciente, TONOS_PIEL, CATEGORIAS_EMOJI } = await import("../lib/emojis-avatar.ts");

test("validarEmoji acepta un solo emoji: simple, con tono, ZWJ, bandera, corazón con variante y tecla", () => {
  for (const e of ["🌸", "👍🏽", "👩🏽‍🦱", "👱‍♀️", "🇩🇴", "❤️", "❤️‍🔥", "🏳️‍🌈", "1️⃣", "⭐", " 🔥 "]) {
    const r = validarEmoji(e);
    assert.equal(r.ok, true, e);
  }
  assert.equal(validarEmoji(" 🔥 ").emoji, "🔥", "recorta espacios");
});

test("validarEmoji rechaza texto normal, varios emojis, vacío, números y demasiado largo, con mensaje claro", () => {
  const casos = { "": /Escribe o pega/, "hola": /no es un emoji|solo emoji/, "a": /no es un emoji/, "1": /no es un emoji/, "🌸🌸": /solo emoji/, "A🌸": /solo emoji/, "🌸 hola": /solo emoji/, ["x".repeat(17)]: /muy largo/ };
  for (const [texto, mensaje] of Object.entries(casos)) {
    const r = validarEmoji(texto);
    assert.equal(r.ok, false, JSON.stringify(texto));
    assert.match(r.error, mensaje, JSON.stringify(texto));
  }
});

test("conTono pone el modificador tras el primer carácter y conserva ZWJ y variante", () => {
  assert.equal(conTono("👩", "🏽"), "👩🏽");
  assert.equal(conTono("👱‍♀️", "🏽"), "👱🏽‍♀️");
  assert.equal(conTono("👩‍🦱", "🏾"), "👩🏾‍🦱");
  assert.equal(conTono("✌️", "🏻"), "✌🏻", "la variante de texto sobra con el modificador");
  assert.equal(conTono("👋", ""), "👋", "sin tono no cambia nada");
});

test("todos los emojis curados (y con cada tono) caben en el límite y pasan el validador; hay entre 250 y 400, sin repetir dentro de una categoría", () => {
  let total = 0;
  for (const c of CATEGORIAS_EMOJI) {
    assert.equal(new Set(c.emojis.map((x) => x.e)).size, c.emojis.length, `repetidos en ${c.id}`);
    for (const x of c.emojis) {
      total++;
      assert.ok(x.n.length > 0, `nombre de ${x.e}`);
      const tonos = c.conTono ? TONOS_PIEL.map((t) => t.id) : [""];
      for (const t of tonos) {
        const e = conTono(x.e, t);
        assert.equal(validarEmoji(e).ok, true, `${e} (${c.id})`);
        assert.ok(e.length <= 16, `${e} ≤ 16`);
      }
    }
  }
  assert.ok(total >= 250 && total <= 400, `total ${total}`);
  assert.ok(CATEGORIAS_EMOJI.some((c) => c.emojis.some((x) => x.e === "🇩🇴")), "incluye 🇩🇴");
});

test("conReciente: el nuevo va primero, sin repetir, hasta 12", () => {
  assert.deepEqual(conReciente(["a", "b", "c"], "b"), ["b", "a", "c"]);
  const largo = Array.from({ length: 12 }, (_, i) => `e${i}`);
  const r = conReciente(largo, "nuevo");
  assert.equal(r.length, 12);
  assert.equal(r[0], "nuevo");
  assert.ok(!r.includes("e11"));
});
