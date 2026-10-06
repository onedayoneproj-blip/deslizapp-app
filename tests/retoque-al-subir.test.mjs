import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
const R = await import("../lib/retoque-al-subir.ts");
const T = await import("../lib/retoque-textos.ts");

test("el interruptor cuenta TODAS las fotos marcadas, no una a una", () => {
  const e = (libres, marcadas, estaMarcada = false) => R.estadoInterruptor({ soloMirar: false, libres, marcadas, estaMarcada });
  assert.deepEqual(e(12, 0), { deshabilitado: false, motivo: null }, "con 12 caben dos");
  assert.deepEqual(e(12, 1), { deshabilitado: false, motivo: null }, "la segunda cabe");
  assert.deepEqual(e(12, 2), { deshabilitado: true, motivo: "Te faltan créditos para esta." }, "la tercera ya no (15 > 12)");
  assert.deepEqual(e(4, 0), { deshabilitado: true, motivo: "Te faltan créditos para esta." }, "sin saldo para una");
  assert.deepEqual(e(0, 0).deshabilitado, true);
  assert.deepEqual(e(5, 0).deshabilitado, false, "justo para una");
  // Una foto ya encendida siempre se puede apagar, aunque el saldo haya bajado.
  assert.deepEqual(e(0, 2, true), { deshabilitado: false, motivo: null });
});

test("solo mirar: el interruptor sale deshabilitado con su motivo, aunque sobren créditos", () => {
  const r = R.estadoInterruptor({ soloMirar: true, libres: 100, marcadas: 0, estaMarcada: false });
  assert.deepEqual(r, { deshabilitado: true, motivo: "Solo mirar: aquí no se manda nada al taller." });
  assert.equal(R.estadoInterruptor({ soloMirar: true, libres: 100, marcadas: 1, estaMarcada: true }).deshabilitado, true);
});

test("emparejar por posición: la foto nueva cambia de URL al guardarse y solo se piden las marcadas", () => {
  const guardadas = ["https://s/a.webp", "https://s/b.webp", "https://s/c.webp"];
  assert.deepEqual(R.urlsGuardadasMarcadas([false, true, false], guardadas), ["https://s/b.webp"]);
  assert.deepEqual(R.urlsGuardadasMarcadas([true, true, true], guardadas), guardadas);
  assert.deepEqual(R.urlsGuardadasMarcadas([false, false, false], guardadas), []);
  assert.equal(R.urlsGuardadasMarcadas([true, false], guardadas), null, "si no cuadra la cuenta, no se manda ninguna");
});

test("mandarMarcadas no lanza, cuenta fallas y sigue con las demás", async () => {
  const pedidas = [];
  const pedir = async (u) => {
    pedidas.push(u);
    if (u === "malo") throw new Error("sin red");
    return u !== "rechazado";
  };
  assert.deepEqual(await R.mandarMarcadas(["a", "malo", "rechazado", "b"], 4, pedir), { marcadas: 4, enviadas: 2 });
  assert.deepEqual(pedidas, ["a", "malo", "rechazado", "b"], "todas se intentan, en orden");
  assert.deepEqual(await R.mandarMarcadas(null, 2, pedir), { marcadas: 2, enviadas: 0 }, "sin emparejar: ninguna");
  const antes = pedidas.length;
  assert.deepEqual(await R.mandarMarcadas([], 0, pedir), { marcadas: 0, enviadas: 0 });
  assert.equal(pedidas.length, antes, "sin marcadas no se llama a nada");
});

test("la tostada: lo de siempre, y el taller solo si hubo fotos marcadas", () => {
  const base = "Guardado. El catálogo ya se enteró.";
  assert.equal(T.avisoGuardadoConRetoques(base, 0, 0), base, "sin marcadas no cambia nada");
  assert.equal(T.avisoGuardadoConRetoques(base, 1, 1), `${base} Tu foto está en el taller: reservamos 5 créditos.`);
  assert.equal(T.avisoGuardadoConRetoques(base, 2, 2), `${base} Tus 2 fotos están en el taller: reservamos 10 créditos.`);
  assert.equal(T.avisoGuardadoConRetoques(base, 1, 0), `${base} No pudimos mandar la foto al taller. Toca la foto y «Retocar».`);
  assert.equal(T.avisoGuardadoConRetoques(base, 3, 0), `${base} No pudimos mandar las fotos al taller. Toca cada una y «Retocar».`);
  assert.equal(T.avisoGuardadoConRetoques(base, 3, 2), `${base} 2 de 3 fotos están en el taller. Para el resto, toca la foto y «Retocar».`);
  for (const t of [T.TITULO_RETOCAR_ESTA, T.TEXTO_SE_MANDA_AL_GUARDAR, T.avisoFotosEnElTaller(2), T.avisoFotosSinTaller(1, 2)])
    assert.doesNotMatch(t, /[!¡]|IA\b|solución|plataforma|optimiz/i, t);
});
