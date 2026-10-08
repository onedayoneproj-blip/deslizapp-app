// Publicar mi catálogo: lo mínimo, los textos y que la app y la base digan lo mismo (lib/publicar-catalogo.ts).
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
const P = await import("../lib/publicar-catalogo.ts");
const C = await import("../lib/config.ts");
const X = await import("../lib/productos-prohibidos.ts");

const foto = { tipo: "foto", url: "https://x.test/a.jpg", retocada: false };
const video = { tipo: "video", url: "https://x.test/a.mp4", portada: null, duracionS: 5 };
const prod = (o = {}) => ({ activo: true, eliminadoEn: null, medios: [foto], ...o });

test("cuenta: visible, no eliminado y con al menos una foto", () => {
  assert.equal(P.cuentaParaPublicar(prod()), true);
  assert.equal(P.cuentaParaPublicar(prod({ activo: false })), false, "oculto");
  assert.equal(P.cuentaParaPublicar(prod({ eliminadoEn: "2026-10-01" })), false, "eliminado");
  assert.equal(P.cuentaParaPublicar(prod({ medios: [] })), false, "sin foto");
  assert.equal(P.cuentaParaPublicar(prod({ medios: [video] })), false, "solo video");
  assert.equal(P.cuentaParaPublicar(prod({ medios: [video, foto] })), true, "video y foto");
  assert.equal(P.cuentaParaPublicar(prod({ medios: [{ ...foto, url: "" }] })), false, "foto sin dirección");
});

test("cuántos faltan", () => {
  assert.equal(C.PRODUCTOS_MINIMOS_PARA_PUBLICAR, 3);
  assert.equal(P.faltanParaPublicar([]), 3);
  assert.equal(P.faltanParaPublicar([prod(), prod({ medios: [] })]), 2);
  assert.equal(P.faltanParaPublicar([prod(), prod(), prod()]), 0);
  assert.equal(P.faltanParaPublicar([prod(), prod(), prod(), prod()]), 0);
  assert.equal(P.faltanParaPublicar([prod()], 5), 4);
});

test("textos de lo que falta, en singular y plural", () => {
  assert.equal(P.textoFaltan(2), "Te faltan 2 productos con foto para publicar tu catálogo");
  assert.equal(P.textoFaltan(1), "Te falta 1 producto con foto para publicar tu catálogo");
});

test("el enlace que tendrá el catálogo", () => {
  assert.equal(P.enlaceAlPublicar("tienda-de-ensayo"), "https://deslizapp-app.vercel.app/tienda/tienda-de-ensayo");
});

test("la lista de lo que no se puede vender está completa y en un solo lugar", () => {
  assert.equal(X.PRODUCTOS_PROHIBIDOS.length, 7);
  for (const t of ["Armas y municiones", "Drogas ilegales", "Contenido sexual explícito", "Productos falsificados", "Documentos falsos", "Medicamentos con receta", "Animales vivos"]) {
    assert.ok(X.PRODUCTOS_PROHIBIDOS.includes(t), t);
  }
});

test("la app y la base dicen lo mismo: el mínimo y la dirección base", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  const archivo = readdirSync(dir).filter((f) => f.endsWith("_publicar_catalogo.sql")).sort().at(-1);
  assert.ok(archivo, "falta la migración publicar_catalogo");
  const sql = readFileSync(new URL(archivo, dir), "utf8");
  assert.match(sql, new RegExp(`v_minimo constant integer := ${C.PRODUCTOS_MINIMOS_PARA_PUBLICAR};`));
  assert.ok(sql.includes(`v_base constant text := '${C.URL_BASE_CATALOGO}';`));
});
