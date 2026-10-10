// Onboarding de una tienda nueva (docs/17-onboarding.md, lib/onboarding.ts): validar, el borrador local y la base.
import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
const O = await import("../lib/onboarding.ts");

test("«Hola, {nombre}» con el primer nombre de Google; sin nombre, «Hola.»", () => {
  assert.equal(O.primerNombre("María José Peña"), "María");
  assert.equal(O.primerNombre("  Michel  "), "Michel");
  assert.equal(O.primerNombre(""), null);
  assert.equal(O.primerNombre(null), null);
  assert.equal(O.saludoOnboarding("Michel"), "Hola, Michel.");
  assert.equal(O.saludoOnboarding(null), "Hola.");
});

test("nombre de la tienda y de la vendedora: 1 a 80 y 1 a 40, sin contar los espacios de los lados", () => {
  assert.equal(O.errorNombreTienda("Esencias Michel"), null);
  assert.ok(O.errorNombreTienda("   "));
  assert.equal(O.errorNombreTienda(` ${"a".repeat(80)} `), null);
  assert.ok(O.errorNombreTienda("a".repeat(81)));
  assert.equal(O.errorVendedora("Michel"), null);
  assert.ok(O.errorVendedora(""));
  assert.ok(O.errorVendedora("a".repeat(41)));
});

test("WhatsApp: dominicano como en Clientes; se guarda en dígitos con el 1 (lo que pide la base)", () => {
  for (const t of ["849 650 3269", "849-650-3269", "(849) 650-3269", "+1 849 650 3269", "18496503269"]) {
    assert.equal(O.whatsappParaGuardar(t), "18496503269", t);
  }
  assert.match(O.whatsappParaGuardar("8096503269"), /^[0-9]{10,15}$/);
  for (const t of ["", "849650", "305 650 3269", "849 650 32691"]) assert.equal(O.whatsappParaGuardar(t), null, t);
  assert.equal(O.whatsappEscrito("8496503269"), "849 650 3269");
  assert.equal(O.whatsappEscrito("+1 849-650"), "849 650");
  assert.equal(O.whatsappEscrito("849650326999"), "849 650 3269");
  assert.equal(O.whatsappVisible("18496503269"), "+1 849 650 3269");
});

test("lo que vendes: el primero que se marca es el principal; quitar no cambia el orden de los demás", () => {
  let l = O.alternarRubro([], "ropa");
  l = O.alternarRubro(l, "perfumes");
  assert.deepEqual(l, ["ropa", "perfumes"]);
  assert.deepEqual(O.alternarRubro(l, "ropa"), ["perfumes"]);
  assert.equal(O.rubrosEnTexto(["perfumes", "ropa"]), "perfumes y ropa");
  assert.equal(O.rubrosEnTexto(["perfumes", "ropa", "general"]), "perfumes, ropa y otras cosas");
  assert.equal(O.NOMBRE_RUBRO_ONBOARDING.general, "Otra cosa");
});

test("iniciales de la tienda para el avatar", () => {
  assert.equal(O.inicialesTienda("Esencias Michel"), "EM");
  assert.equal(O.inicialesTienda("lino & algodón"), "LA");
  assert.equal(O.inicialesTienda(""), "?");
});

test("borrador: se recupera el del mismo enlace y se limpia lo que no encaja", () => {
  const b = { ...O.borradorNuevo("e1"), capitulo: 3, nombre: "Esencias Michel", rubros: ["perfumes", "ropa"], whatsapp: "849 650", vendedora: null };
  const leido = O.leerBorrador(JSON.stringify(b), "e1");
  assert.deepEqual(leido, b);
  assert.equal(O.leerBorrador(JSON.stringify(b), "otro"), null, "de otro enlace no se usa");
  assert.equal(O.leerBorrador("{roto", "e1"), null);
  assert.equal(O.leerBorrador(null, "e1"), null);
  const raro = O.leerBorrador(JSON.stringify({ enlaceId: "e1", capitulo: 9, nombre: 5, rubros: ["ropa", "zapatos", "ropa"], vendedora: "Ana" }), "e1");
  assert.deepEqual(raro, { enlaceId: "e1", capitulo: 1, nombre: "", rubros: ["ropa"], whatsapp: "", vendedora: "Ana" });
});

test("cada capítulo pide lo suyo; al cerrar el 4 los datos van listos para la base", () => {
  const b = O.borradorNuevo("e1");
  assert.equal(O.capituloListo(b, "Michel"), false);
  assert.equal(O.capituloListo({ ...b, nombre: "Esencias" }, null), true);
  assert.equal(O.capituloListo({ ...b, capitulo: 2 }, null), false);
  assert.equal(O.capituloListo({ ...b, capitulo: 2, rubros: ["ropa"] }, null), true);
  assert.equal(O.capituloListo({ ...b, capitulo: 3, whatsapp: "849 650" }, null), false);
  assert.equal(O.capituloListo({ ...b, capitulo: 3, whatsapp: "849 650 3269" }, null), true);
  // Capítulo 4: si no lo tocó, vale el nombre de Google; si lo borró, no.
  assert.equal(O.capituloListo({ ...b, capitulo: 4 }, "Michel"), true);
  assert.equal(O.capituloListo({ ...b, capitulo: 4 }, null), false);
  assert.equal(O.capituloListo({ ...b, capitulo: 4, vendedora: "" }, "Michel"), false);
  const lleno = { ...b, capitulo: 4, nombre: " Esencias Michel ", rubros: ["perfumes", "ropa"], whatsapp: "849 650 3269", vendedora: null };
  assert.deepEqual(O.datosParaCrear(lleno, "Michel"), { nombre: "Esencias Michel", rubros: ["perfumes", "ropa"], whatsapp: "18496503269", vendedora: "Michel" });
  assert.equal(O.datosParaCrear({ ...lleno, rubros: [] }, "Michel"), null);
});

test("demo: el slug como el de la base, con -2 si ya existe", () => {
  const ocupados = ["esencias-michel", "lino-y-algodon"];
  assert.equal(O.slugDemo("Esencias Michel", ocupados), "esencias-michel-2");
  assert.equal(O.slugDemo("Ñandú Árabe  & Co.", ocupados), "nandu-arabe-co");
  assert.equal(O.slugDemo("!!!", ocupados), "tienda");
  assert.equal(O.slugDemo("  ", ocupados), null);
  assert.ok(!O.slugDemo("abcd ".repeat(16), ocupados).endsWith("-"));
});

test("las claves del onboarding son las mismas en la app y en la base", () => {
  const dir = new URL("../supabase/migrations/", import.meta.url);
  const archivo = readdirSync(dir).filter((f) => f.endsWith(".sql") && readFileSync(new URL(f, dir), "utf8").includes("function public.marcar_onboarding")).sort().at(-1);
  assert.ok(archivo, "falta la migración del onboarding");
  const sql = readFileSync(new URL(archivo, dir), "utf8");
  for (const k of O.CLAVES_ONBOARDING) assert.ok(sql.includes(`'${k}'`), k);
  assert.ok(sql.includes("where slug not in ('tienda-de-ensayo', 'soft-era')"), "relleno: menos la de ensayo y Soft Era");
  assert.ok(!/drop function/i.test(sql), "nunca drop function");
});

test("«Pon tu logo»: solo imágenes y hasta 20 MB, con mensajes claros", () => {
  assert.equal(O.errorArchivoLogo({ type: "image/jpeg", size: 3_000_000 }), null);
  assert.equal(O.errorArchivoLogo({ type: "image/heic", size: O.LOGO_MAX_BYTES }), null);
  assert.match(O.errorArchivoLogo({ type: "application/pdf", size: 1000 }), /no es una imagen/);
  assert.match(O.errorArchivoLogo({ type: "", size: 1000 }), /no es una imagen/);
  assert.match(O.errorArchivoLogo({ type: "image/png", size: O.LOGO_MAX_BYTES + 1 }), /pesa mucho/);
});
