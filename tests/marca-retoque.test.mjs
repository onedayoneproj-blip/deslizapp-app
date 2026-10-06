import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const M = await import("../lib/marca-retoque.ts");

const refs = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, url: `u${i}`, orden: i }));

test("marca lista: 3 palabras y al menos 3 fotos de referencia", () => {
  const lista = (palabras, n) => M.marcaLista({ palabras, referencias: refs(n) });
  assert.equal(lista(["a", "b", "c"], 3), true);
  assert.equal(lista(["a", "b", "c"], 6), true);
  assert.equal(lista(["a", "b", "c"], 2), false, "2 fotos no alcanzan");
  assert.equal(lista(["a", "b", "c"], 0), false);
  assert.equal(lista(["a", "b"], 3), false, "2 palabras no alcanzan");
  assert.equal(lista(["a", "b", "  "], 3), false, "una palabra en blanco no cuenta");
  assert.equal(lista([], 0), false);
  assert.equal(M.marcaLista(null), false);
  assert.equal(M.marcaLista(undefined), false);
});

test("textoFalta dice qué falta, en singular y plural", () => {
  const f = (palabras, n) => M.textoFalta({ palabras, referencias: refs(n) });
  assert.equal(f([], 0), "Faltan 3 palabras y 3 fotos de referencia");
  assert.equal(f(["a", "b", "c"], 0), "Faltan 3 fotos de referencia");
  assert.equal(f(["a", "b", "c"], 2), "Falta 1 foto de referencia");
  assert.equal(f(["a", "b"], 3), "Falta 1 palabra");
  assert.equal(f(["a"], 3), "Faltan 2 palabras");
  assert.equal(f(["a", "b"], 2), "Faltan 1 palabra y 1 foto de referencia");
  assert.equal(f(["a", "b", "c"], 3), null);
});

test("el tope de referencias es 6 y el mínimo 3", () => {
  assert.equal(M.REFERENCIAS_MAX, 6);
  assert.equal(M.REFERENCIAS_MIN, 3);
  assert.equal(M.PALABRAS_MARCA, 3);
});

test("palabrasLimpias recorta, quita vacías y deja 3", () => {
  assert.deepEqual(M.palabrasLimpias(["  elegante ", "", "cálida", "muy   femenina", "extra"]), ["elegante", "cálida", "muy femenina"]);
});

test("instagram: sin @ ni enlace, y se rechaza lo que la base rechazaría", () => {
  assert.deepEqual(M.instagramLimpio("@esenciasmichel"), { valor: "esenciasmichel", valido: true });
  assert.deepEqual(M.instagramLimpio("https://www.instagram.com/esencias.michel/?hl=es"), { valor: "esencias.michel", valido: true });
  assert.deepEqual(M.instagramLimpio("  "), { valor: null, valido: true });
  assert.equal(M.instagramLimpio("hola mundo").valido, false);
  assert.equal(M.instagramLimpio("a".repeat(31)).valido, false);
});

test("Copiar instrucciones: el formato del prompt, sin las líneas que no tienen dato", () => {
  assert.equal(
    M.instruccionesDeRetoque("Esencias Michel", { palabras: ["elegante", "cálida", "femenina"], evita: "fondo blanco, brillos exagerados" }),
    "Retoca esta foto para Esencias Michel. Marca: elegante, cálida, femenina. Estilo: como las fotos de referencia. Evita: fondo blanco, brillos exagerados. No cambies el producto.",
  );
  assert.equal(
    M.instruccionesDeRetoque("Luna", { palabras: [], evita: null }),
    "Retoca esta foto para Luna. Estilo: como las fotos de referencia. No cambies el producto.",
  );
  assert.equal(
    M.instruccionesDeRetoque("Luna", { palabras: ["a", "b", "c"], evita: "  nada de brillos. " }),
    "Retoca esta foto para Luna. Marca: a, b, c. Estilo: como las fotos de referencia. Evita: nada de brillos. No cambies el producto.",
  );
});

test("la bienvenida se recuerda por tienda y sin almacenamiento sale cada vez", async () => {
  const B = await import("../lib/bienvenida-retoque.ts");
  const memoria = new Map();
  const almacen = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v) };
  assert.equal(B.bienvenidaVista("tienda-a", almacen), false, "la primera vez no la ha visto");
  B.marcarBienvenidaVista("tienda-a", almacen);
  assert.equal(B.bienvenidaVista("tienda-a", almacen), true);
  assert.equal(B.bienvenidaVista("tienda-b", almacen), false, "otra tienda del mismo dispositivo la ve aparte");
  B.marcarBienvenidaVista("tienda-a", almacen);
  assert.equal(JSON.parse(memoria.values().next().value).length, 1, "no se duplica");
  // Sin almacenamiento o con uno que falla: no rompe y sale cada vez.
  assert.equal(B.bienvenidaVista("tienda-a", null), false);
  B.marcarBienvenidaVista("tienda-a", null);
  const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(B.bienvenidaVista("tienda-a", roto), false);
  B.marcarBienvenidaVista("tienda-a", roto);
  // Un guardado corrupto se ignora.
  assert.equal(B.bienvenidaVista("x", { getItem: () => "{no es json", setItem() {} }), false);
});
