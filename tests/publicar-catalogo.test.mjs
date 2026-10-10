// Publicar mi catálogo: sin mínimo, la confirmación suave, los textos y que la app y la base digan lo mismo (lib/publicar-catalogo.ts).
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

test("sin mínimo: con menos de 5 se pregunta con suavidad; con 5 o más, directo", () => {
  assert.equal(C.PRODUCTOS_SUGERIDOS_PARA_PUBLICAR, 5);
  assert.equal("PRODUCTOS_MINIMOS_PARA_PUBLICAR" in C, false, "ya no hay mínimo");
  assert.equal(P.productosQueCuentan([prod(), prod({ medios: [] }), prod({ activo: false })]), 1);
  assert.equal(P.pideConfirmarPublicar(0), true);
  assert.equal(P.pideConfirmarPublicar(4), true);
  assert.equal(P.pideConfirmarPublicar(5), false);
  assert.equal(P.pideConfirmarPublicar(9), false);
});

test("título de la confirmación: vacío, singular y plural", () => {
  assert.equal(P.tituloConfirmarPublicar(0), "Tu catálogo está vacío");
  assert.equal(P.tituloConfirmarPublicar(1), "Tu catálogo tiene 1 producto");
  assert.equal(P.tituloConfirmarPublicar(3), "Tu catálogo tiene 3 productos");
  assert.equal(P.textoCatalogoPronto("Esencias Michel"), "Pronto, aquí van los productos de Esencias Michel.");
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

test("la app y la base dicen lo mismo: sin mínimo y la misma dirección base", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  // La última migración que define publicar_mi_catalogo.
  const archivo = readdirSync(dir).filter((f) => f.endsWith(".sql") && readFileSync(new URL(f, dir), "utf8").includes("function public.publicar_mi_catalogo")).sort().at(-1);
  assert.ok(archivo, "falta la migración de publicar_mi_catalogo");
  const sql = readFileSync(new URL(archivo, dir), "utf8");
  assert.ok(!sql.includes("catalogo_incompleto"), `${archivo} todavía exige un mínimo`);
  assert.ok(sql.includes(`v_base constant text := '${C.URL_BASE_CATALOGO}';`));
});

// La demo hace lo mismo que la base (lib/data/tiendas.ts).
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const T = await import("../lib/data/tiendas.ts");
const LINO = "a1000000-0000-4000-8000-000000000003";
const AHORA = "2026-10-08T12:00:00.000Z";
// Lino & Algodón con n productos que cuentan (la demo trae menos que el mínimo: se repiten con otro id).
const conProductos = (n) => {
  const d = construirDesdeSeed();
  const base = d.productos.filter((p) => p.tiendaId === LINO && cuentaOk(p));
  const suyos = Array.from({ length: n }, (_, i) => ({ ...base[i % base.length], id: `${base[i % base.length].id}-${i}` }));
  return { ...d, productos: [...d.productos.filter((p) => p.tiendaId !== LINO), ...suyos] };
};
const cuentaOk = (p) => P.cuentaParaPublicar(p);

test("demo: publica aunque esté vacío, con el enlace estándar", () => {
  assert.equal(T.publicarMiCatalogoEnDB(conProductos(0), LINO, AHORA).tienda.catalogoEstado, "publicado", "vacío también");
  const r = T.publicarMiCatalogoEnDB(conProductos(5), LINO, AHORA);
  assert.equal(r.tienda.catalogoEstado, "publicado");
  assert.equal(r.tienda.urlCatalogo, "https://deslizapp-app.vercel.app/tienda/lino-y-algodon");
  assert.equal(r.tienda.catalogoPublicadoEn, AHORA);
  // Otra vez: no cambia nada.
  assert.equal(T.publicarMiCatalogoEnDB(r.db, LINO, "2026-10-09T00:00:00.000Z").tienda.catalogoPublicadoEn, AHORA);
});

test("demo: dejar de mostrar conserva el enlace y el primer momento; volver a publicar no los pierde", () => {
  const a = T.publicarMiCatalogoEnDB(conProductos(5), LINO, AHORA);
  const b = T.despublicarMiCatalogoEnDB(a.db, LINO);
  assert.equal(b.tienda.catalogoEstado, "sin");
  assert.equal(b.tienda.urlCatalogo, a.tienda.urlCatalogo);
  assert.equal(b.tienda.catalogoPublicadoEn, AHORA);
  assert.equal(T.despublicarMiCatalogoEnDB(b.db, LINO).tienda.catalogoEstado, "sin", "otra vez no es un error");
  const c = T.publicarMiCatalogoEnDB(b.db, LINO, "2026-10-10T00:00:00.000Z");
  assert.equal(c.tienda.catalogoPublicadoEn, AHORA);
});

test("demo: no pisa un flujo manual en curso ni publica una tienda pausada", () => {
  const d = conProductos(5);
  const enCurso = { ...d, tiendas: d.tiendas.map((t) => (t.id === LINO ? { ...t, catalogoEstado: "solicitado" } : t)) };
  assert.throws(() => T.publicarMiCatalogoEnDB(enCurso, LINO, AHORA), /en camino/);
  assert.throws(() => T.despublicarMiCatalogoEnDB(enCurso, LINO), /cambió de estado/);
  const pausada = { ...d, tiendas: d.tiendas.map((t) => (t.id === LINO ? { ...t, estado: "pausada" } : t)) };
  assert.throws(() => T.publicarMiCatalogoEnDB(pausada, LINO, AHORA), /en pausa/);
});

test("demo: «Simular avance» arranca el flujo del equipo desde «sin»", () => {
  const r = T.avanzarCatalogoDemo(conProductos(0), LINO);
  assert.equal(r.tienda.catalogoEstado, "solicitado");
});
