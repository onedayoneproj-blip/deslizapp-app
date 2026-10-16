// Los planes de /planes (lib/planes/planes.ts): todo sale de las filas de la tabla `planes`.
import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";


const { planDesdeFila, pesos, precioDe, limitesDe, planesMostrables } = await import("../lib/planes/planes.ts");

const fila = (o) => ({ id: "x", nombre: "X", precio_mensual: 999, precio_anual: 9990, limite_productos: 150, limite_tiendas: 3, limite_personas: 5, destacado: false, ideal_para: null, ...o });

test("pesos pone la coma de miles", () => {
  assert.equal(pesos(499), "RD$499");
  assert.equal(pesos(14990), "RD$14,990");
});

test("el precio sale de la fila: si cambia en la base, cambia en la página", () => {
  assert.equal(precioDe(planDesdeFila(fila({})), false).precio, "RD$999");
  assert.equal(precioDe(planDesdeFila(fila({ precio_mensual: 1099 })), false).precio, "RD$1,099");
  const anual = precioDe(planDesdeFila(fila({ precio_anual: 9990 })), true);
  assert.deepEqual(anual, { precio: "RD$9,990", periodo: "/año", nota: "Sale a RD$833 al mes" });
  assert.equal(precioDe(planDesdeFila(fila({ precio_anual: 12000 })), true).nota, "Sale a RD$1,000 al mes");
});

test("los límites: null es sin límite", () => {
  const textos = (p) => limitesDe(p).map((l) => l.texto);
  assert.deepEqual(limitesDe(planDesdeFila(fila({}))).map((l) => l.clave), ["productos", "tiendas", "personas"]);
  assert.deepEqual(textos(planDesdeFila(fila({}))), ["150 productos publicados", "Hasta 3 tiendas", "Hasta 5 personas en tu equipo"]);
  assert.deepEqual(textos(planDesdeFila(fila({ limite_productos: 30, limite_tiendas: 1, limite_personas: 1 }))), ["30 productos publicados", "1 tienda", "1 persona"]);
  const pro = textos(planDesdeFila(fila({ limite_productos: null, limite_tiendas: null, limite_personas: null })));
  assert.deepEqual(pro, ["Productos publicados sin límite", "Todas las tiendas que quieras", "Equipo sin límite"]);
});

test("un plan sin precio no se muestra", () => {
  const ps = [planDesdeFila(fila({ id: "a" })), planDesdeFila(fila({ id: "b", precio_anual: null })), planDesdeFila(fila({ id: "c", precio_mensual: null }))];
  assert.deepEqual(planesMostrables(ps).map((p) => p.id), ["a"]);
});
