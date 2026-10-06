import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const { soloMirar, SoloMirar, VerComoVencido, LECTURAS_SOLO_MIRAR } =
  await import("../lib/data/solo-mirar.ts");
const { crearFuenteSupabase } = await import("../lib/data/supabase.ts");
const interfaz = readFileSync(
  new URL("../lib/data/fuente.ts", import.meta.url),
  "utf8",
).split("export type FuenteDatos = {")[1];
const metodos = [...interfaz.matchAll(/^  (\w+)\(/gm)].map((m) => m[1]);
const lecturas = new Set([
  ...LECTURAS_SOLO_MIRAR,
  "getTiendas",
  "solicitudPorCodigo",
]);
test("cada escritura del contrato actual y futuras están bloqueadas sin tocar la fuente, con admin ajeno o dueño", async () => {
  for (const cuenta of ["admin sin membresía", "Lewis admin y dueño"]) {
    let llamadas = 0;
    const real = Object.fromEntries(
      metodos.map((m) => [
        m,
        async () => {
          llamadas++;
          return null;
        },
      ]),
    );
    const fuente = soloMirar(
      real,
      { id: "s", tiendaId: "michel", venceEn: "2026-10-06T12:30:00Z" },
      () => Date.parse("2026-10-06T12:00:00Z"),
    );
    for (const m of metodos.filter((m) => !lecturas.has(m)))
      await assert.rejects(fuente[m]("michel"), SoloMirar, cuenta + ": " + m);
    await assert.rejects(fuente.escrituraFutura("michel"), SoloMirar);
    assert.equal(llamadas, 0);
  }
});
test("lecturas pasan a la fuente con el mismo alcance, getTiendas filtra y correo fuera de Equipo se omite", async () => {
  const llamadas = [];
  const real = {
    ...Object.fromEntries(
      LECTURAS_SOLO_MIRAR.map((m) => [
        m,
        async (...args) => {
          llamadas.push([m, ...args]);
          return [];
        },
      ]),
    ),
    getTiendas: async () => {
      throw Error("no listar todas");
    },
    getTienda: async (id) => ({ id }),
    getDueno: async () => ({
      id: "u",
      nombre: "V",
      email: "privado@example.invalid",
    }),
    solicitudPorCodigo: async (codigo) => ({ tiendaId: codigo }),
  };
  const f = soloMirar(
    real,
    { id: "s", tiendaId: "t", venceEn: "2026-10-06T12:30:00Z" },
    () => Date.parse("2026-10-06T12:00:00Z"),
  );
  assert.deepEqual(await f.getTiendas(), [{ id: "t" }]);
  assert.equal((await f.getDueno("t")).email, "");
  assert.equal(await f.solicitudPorCodigo("ajena"), null);
  for (const m of LECTURAS_SOLO_MIRAR) {
    await f[m]("t", "p");
    await assert.rejects(f[m]("otra", "p"), SoloMirar);
  }
  assert.ok(
    llamadas.some(
      (c) => c[0] === "getProductos" && c[1] === "t" && c[2] === "p",
    ),
  );
});
test("cierre y vencimiento no revelan permisos del dueño ni llaman lecturas", async () => {
  let ahora = Date.parse("2026-10-06T12:00:00Z"),
    llamadas = 0;
  const f = soloMirar(
    {
      getTienda: async () => {
        llamadas++;
        return { id: "t" };
      },
    },
    { id: "s", tiendaId: "t", venceEn: "2026-10-06T12:30:00Z" },
    () => ahora,
  );
  ahora += 30 * 60000;
  await assert.rejects(f.getTiendas(), VerComoVencido);
  await assert.rejects(f.actualizarProducto("t"), SoloMirar);
  assert.equal(llamadas, 0);
  const g = soloMirar(
    {},
    { id: "s", tiendaId: "t", venceEn: "2026-10-06T12:30:00Z" },
    () => 0,
  );
  g.cerrar();
  await assert.rejects(g.getTiendas(), VerComoVencido);
});
test("envoltura de la fuente Supabase real no invoca rpc, consultas, compresión ni storage al escribir", async () => {
  const cliente = new Proxy(
    {},
    {
      get() {
        throw Error("Accedió Supabase antes del guard");
      },
    },
  );
  const f = soloMirar(
    crearFuenteSupabase(cliente, () => {
      throw Error("notificó cambio");
    }),
    { id: "s", tiendaId: "t", venceEn: "2099-01-01" },
  );
  for (const m of metodos.filter((m) => !lecturas.has(m)))
    await assert.rejects(f[m]("t"), SoloMirar, m);
});
