// Texto de la fila "Ver N más" (lib/ver-mas.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { PASO_LISTA, siguientes, textoVerMas } from "../lib/ver-mas.ts";

test('"Ver N más": N es el tramo siguiente o lo que quede', () => {
  assert.equal(PASO_LISTA, 30);
  assert.equal(textoVerMas(69, 30), "Ver 30 más");
  assert.equal(textoVerMas(39), "Ver 30 más");
  assert.equal(textoVerMas(12), "Ver 12 más");
  assert.equal(textoVerMas(64, 5), "Ver 5 más");
  assert.equal(textoVerMas(3, 5), "Ver 3 más");
  assert.equal(siguientes(0, 5), 0);
  assert.equal(siguientes(-4, 5), 0);
});
