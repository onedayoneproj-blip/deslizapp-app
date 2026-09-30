// Pruebas de las reglas de Storage (lib/data/almacen.ts) y de sus errores.
import assert from "node:assert/strict";
import { test } from "node:test";
import { esDataUrl, esUrlHttp, problemaDeArchivo, rutaDesdeUrlPublica, rutaFoto, rutaLogo, rutasParaBorrar, tipoDeDataUrl } from "../lib/data/almacen.ts";
import { ArchivoMuyGrande, FormatoNoPermitido, traducirErrorSupabase, esErrorDeRed } from "../lib/data/errores.ts";

const T = "11111111-2222-3333-4444-555555555555";
const base = "https://euihaeyfdlpvmbtfzvnt.supabase.co/storage/v1/object/public/productos/";

test("rutas: <tienda_id>/<uuid>.webp y <tienda_id>/logo/<uuid>.webp", () => {
  assert.equal(rutaFoto(T, "abc"), `${T}/abc.webp`);
  assert.equal(rutaLogo(T, "abc"), `${T}/logo/abc.webp`);
  // Safari no crea WebP: se usa JPEG
  assert.equal(rutaFoto(T, "abc", "image/jpeg"), `${T}/abc.jpg`);
  assert.equal(rutaLogo(T, "abc", "image/jpeg"), `${T}/logo/abc.jpg`);
});

test("ya es URL → no se sube; solo las data URL se suben", () => {
  assert.equal(esDataUrl("data:image/jpeg;base64,AAAA"), true);
  for (const u of [`${base}${T}/a.webp`, "https://x.com/a.jpg", "http://x.com/a.jpg"]) {
    assert.equal(esUrlHttp(u), true);
    assert.equal(esDataUrl(u), false);
  }
  assert.equal(esDataUrl("/seed/kiara.svg"), false); // foto del seed
});

test("de la URL pública a la ruta del bucket", () => {
  assert.equal(rutaDesdeUrlPublica(`${base}${T}/a.webp`), `${T}/a.webp`);
  assert.equal(rutaDesdeUrlPublica(`${base}${T}/logo/b.jpg?t=1`), `${T}/logo/b.jpg`);
  assert.equal(rutaDesdeUrlPublica("https://x.com/a.jpg"), null);
  assert.equal(rutaDesdeUrlPublica("data:image/png;base64,AAAA"), null);
});

test("al quitar una foto solo se borra lo de la carpeta de la tienda que dejó de usarse", () => {
  const a = `${base}${T}/a.webp`;
  const b = `${base}${T}/b.webp`;
  const ajena = `${base}OTRA-TIENDA/c.webp`;
  assert.deepEqual(rutasParaBorrar(T, [a, b], [a]), [`${T}/b.webp`]);
  assert.deepEqual(rutasParaBorrar(T, [a, b], [a, b]), []);
  assert.deepEqual(rutasParaBorrar(T, [a, ajena, "/seed/x.svg", "https://x.com/y.jpg", null], []), [`${T}/a.webp`]);
  assert.deepEqual(rutasParaBorrar(T, [`${base}${T}/logo/l.webp`], [null]), [`${T}/logo/l.webp`]);
  assert.deepEqual(rutasParaBorrar(T, [a], [a]), []);
});

test("formato y tamaño permitidos por el bucket", () => {
  assert.equal(tipoDeDataUrl("data:image/webp;base64,AA"), "image/webp");
  assert.equal(problemaDeArchivo("image/webp", 100), null);
  assert.equal(problemaDeArchivo("image/gif", 100), "formato");
  assert.equal(problemaDeArchivo(null, 100), "formato");
  assert.equal(problemaDeArchivo("image/jpeg", 5 * 1024 * 1024 + 1), "grande");
});

test("errores claros de Storage", () => {
  const grande = traducirErrorSupabase({ message: "The object exceeded the maximum allowed size", status: 413 });
  assert.ok(grande instanceof ArchivoMuyGrande);
  assert.match(grande.message, /5 MB/);
  assert.ok(traducirErrorSupabase({ message: "mime type image/gif is not supported", status: 415 }) instanceof FormatoNoPermitido);
  assert.ok(esErrorDeRed({ message: "Failed to fetch" }));
});
