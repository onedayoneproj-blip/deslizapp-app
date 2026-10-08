// Formato del precio mientras se escribe: comas de miles, límites y dónde queda el cursor.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const F = await import("../lib/formato-precio.ts");

/** Escribe `tecla` con el cursor en `cursor` del texto `previo` (como lo deja el teclado) y devuelve el resultado. */
const escribir = (previo, cursor, tecla) => F.editarPrecio(previo, previo.slice(0, cursor) + tecla + previo.slice(cursor), cursor + tecla.length);
/** Borra hacia atrás desde `cursor`. */
const borrar = (previo, cursor) => F.editarPrecio(previo, previo.slice(0, cursor - 1) + previo.slice(cursor), cursor - 1);

test("pone la coma de miles", () => {
  assert.equal(F.formatearPrecio(""), "");
  assert.equal(F.formatearPrecio("950"), "950");
  assert.equal(F.formatearPrecio("1850"), "1,850");
  assert.equal(F.formatearPrecio("12500"), "12,500");
  assert.equal(F.formatearPrecio("1250000"), "1,250,000");
});

test("escribir dígito a dígito al final", () => {
  let t = "";
  const vistos = [];
  for (const d of "12500") {
    const r = escribir(t, t.length, d);
    vistos.push(r.texto);
    assert.equal(r.cursor, r.texto.length);
    t = r.texto;
  }
  assert.deepEqual(vistos, ["1", "12", "125", "1,250", "12,500"]);
});

test("escribir en el medio mantiene el cursor junto al dígito", () => {
  const r = escribir("1,850", 1, "2"); // 1|,850 → 12|,850 → 12,850 → cursor tras el 2
  assert.equal(r.digitos, "12850");
  assert.equal(r.texto, "12,850");
  assert.equal(r.cursor, 2);
});

test("borrar al final y en el medio", () => {
  let r = borrar("12,500", 6);
  assert.deepEqual([r.digitos, r.texto, r.cursor], ["1250", "1,250", 5]);
  r = borrar("12,500", 2); // 12|,500 → borra el 2
  assert.deepEqual([r.digitos, r.texto, r.cursor], ["1500", "1,500", 1]);
  r = borrar("1", 1);
  assert.deepEqual([r.digitos, r.texto, r.cursor], ["", "", 0]);
});

test("borrar justo después de una coma borra el dígito de antes", () => {
  const r = borrar("1,850", 2); // 1,|850 → quitaría la coma
  assert.equal(r.digitos, "850");
  assert.equal(r.texto, "850");
  assert.equal(r.cursor, 0);
});

test("pegar limpia lo que no es dígito y respeta el límite", () => {
  let r = F.editarPrecio("", "RD$ 12,500", 10);
  assert.deepEqual([r.digitos, r.texto], ["12500", "12,500"]);
  r = F.editarPrecio("", "123456789", 9);
  assert.deepEqual([r.digitos, r.texto, r.cursor], ["1234567", "1,234,567", 9]);
  r = F.editarPrecio("1,234,567", "1,234,5678", 10); // ya está lleno
  assert.equal(r.digitos, "1234567");
  r = F.editarPrecio("", "12.50", 5);
  assert.equal(r.digitos, "1250");
});

test("letras y ceros a la izquierda", () => {
  let r = escribir("1,850", 5, "a");
  assert.deepEqual([r.digitos, r.texto, r.cursor], ["1850", "1,850", 5]);
  r = escribir("", 0, "0");
  assert.deepEqual([r.digitos, r.cursor], ["0", 1]);
  r = escribir("0", 1, "7");
  assert.deepEqual([r.digitos, r.texto, r.cursor], ["7", "7", 1]);
  assert.equal(F.limpiarPrecio("007"), "7");
  assert.equal(F.limpiarPrecio("0"), "0");
});

test("el límite se puede cambiar", () => {
  assert.equal(F.editarPrecio("", "123456789", 9, 8).digitos, "12345678");
});
