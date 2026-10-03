// Salud del inventario, orden de "Por reponer", mensaje y candidatos de "Hacer espacio" (lib/inventario-catalogo.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { etiquetaSalud, saludDelInventario, textoSalud } from "../lib/inventario-catalogo.ts";

const p = (stock, activo = true) => ({ activo, stock });

test("salud: con stock (3+ o sin control), queda 1 o 2 y agotados; solo visibles", () => {
  const s = saludDelInventario([p(10), p(3), p(null), p(2), p(1), p(0), p(0), p(5, false), p(0, false), p(1, false)]);
  assert.deepEqual(s, { conStock: 3, quedan: 2, agotados: 2, disponibles: 5, total: 7 });
});

test("salud: textos de la dona", () => {
  assert.equal(textoSalud({ disponibles: 9, agotados: 6 }), "9 disponibles · 6 agotados");
  assert.equal(textoSalud({ disponibles: 9, agotados: 0 }), "9 disponibles");
  assert.equal(textoSalud({ disponibles: 1, agotados: 1 }), "1 disponible · 1 agotado");
  assert.equal(
    etiquetaSalud({ conStock: 0, quedan: 9, agotados: 6, disponibles: 9, total: 15 }),
    "9 productos disponibles: 9 por agotarse, 6 agotados. Ver tu inventario",
  );
  assert.equal(etiquetaSalud({ conStock: 4, quedan: 0, agotados: 0, disponibles: 4, total: 4 }), "4 productos disponibles. Ver tu inventario");
});
