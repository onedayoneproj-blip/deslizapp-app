// Pruebas de las reglas de promos (lib/promos.ts): pausa, límite de usos y la regla central de códigos.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buscarCodigoPromo, estadoVisible, pedidosConCodigo, precioConPromo, razonNoUsable, textoUso, validarPromo } from "../lib/promos.ts";

const ahora = new Date("2026-09-30T15:00:00Z");
const T = "t1";
const promo = (o = {}) => ({
  id: "p1", tiendaId: T, tipo: "codigo", nombre: "Luna", valorPorcentaje: 20, codigo: "LUNA20", coleccion: null, productoId: null,
  fechaInicio: "2026-09-01T04:00:00Z", fechaFin: null, estado: "activa", limiteUsos: null, pausada: false, ...o,
});
const pedido = (id, codigo, estado = "por_despachar") => ({ id, tiendaId: T, estado, codigoPromo: codigo, creadoEn: "2026-09-20T12:00:00Z" });
const ctx = (pedidos = [], pedidoActual = null) => ({ pedidos, pedido: pedidoActual });

test("sin límite ni pausa: se puede usar (mayúsculas o minúsculas)", () => {
  assert.equal(razonNoUsable(promo(), ctx(), ahora), null);
  assert.equal(buscarCodigoPromo([promo()], T, " luna20 ", ctx(), ahora)?.id, "p1");
});

test("pausada: nunca se aplica, y se muestra Pausada", () => {
  const p = promo({ pausada: true });
  assert.equal(razonNoUsable(p, ctx(), ahora)?.texto, "Pausado");
  assert.equal(buscarCodigoPromo([p], T, "LUNA20", ctx(), ahora), null);
  assert.equal(estadoVisible(p, 0, ahora), "pausada");
});

test("límite de usos: los cancelados no cuentan; al llegar al límite queda Agotada", () => {
  const p = promo({ limiteUsos: 2 });
  const pedidos = [pedido("a", "LUNA20"), pedido("b", "luna20"), pedido("c", "LUNA20", "cancelado")];
  assert.equal(pedidosConCodigo(pedidos, p), 2);
  assert.equal(estadoVisible(p, 2, ahora), "agotada");
  assert.equal(estadoVisible(p, 1, ahora), "activa");
  assert.equal(buscarCodigoPromo([p], T, "LUNA20", ctx(pedidos), ahora), null);
  assert.equal(razonNoUsable(p, ctx(pedidos), ahora)?.texto, "Agotado: 2 de 2");
  // con un cupo libre sí
  assert.equal(buscarCodigoPromo([p], T, "LUNA20", ctx(pedidos.slice(0, 1)), ahora)?.id, "p1");
});

test("un pedido que ya usa el código lo conserva aunque el cupo se llenara; otro pedido no puede elegirlo", () => {
  const p = promo({ limiteUsos: 1 });
  const pedidos = [pedido("a", "LUNA20")];
  assert.equal(buscarCodigoPromo([p], T, "LUNA20", ctx(pedidos, { id: "a", codigoPromo: "LUNA20" }), ahora)?.id, "p1");
  assert.equal(buscarCodigoPromo([p], T, "LUNA20", ctx(pedidos, { id: "z", codigoPromo: null }), ahora), null);
  assert.equal(buscarCodigoPromo([p], T, "LUNA20", ctx(pedidos), ahora), null);
});

test("conservar el código no salta la pausa ni el vencimiento", () => {
  const conserva = { id: "a", codigoPromo: "LUNA20" };
  assert.equal(razonNoUsable(promo({ pausada: true, limiteUsos: 1 }), ctx([pedido("a", "LUNA20")], conserva), ahora)?.razon, "pausada");
  assert.equal(razonNoUsable(promo({ fechaFin: "2026-09-10T00:00:00Z" }), ctx([], conserva), ahora)?.texto, "Vencido");
  assert.equal(razonNoUsable(promo({ estado: "terminada" }), ctx(), ahora)?.texto, "Terminado");
  assert.equal(razonNoUsable(promo({ fechaInicio: "2026-10-10T04:00:00Z" }), ctx(), ahora)?.texto, "Programado");
});

test("terminada gana sobre la pausa; el orden de la razón: terminada, pausada, programada, agotada", () => {
  assert.equal(estadoVisible(promo({ pausada: true, fechaFin: "2026-09-10T00:00:00Z" }), 0, ahora), "terminada");
  assert.equal(razonNoUsable(promo({ pausada: true, fechaInicio: "2026-10-10T04:00:00Z" }), ctx(), ahora)?.razon, "pausada");
});

test("una promo de colección pausada no aplica al precio", () => {
  const producto = { id: "x", tiendaId: T, precio: 1000, categoria: "Perfumes" };
  const col = promo({ tipo: "coleccion", codigo: null, coleccion: "Perfumes", valorPorcentaje: 10 });
  assert.equal(precioConPromo(producto, [col], ahora).precio, 900);
  assert.equal(precioConPromo(producto, [{ ...col, pausada: true }], ahora).precio, 1000);
});

test("texto de uso y validación del límite", () => {
  assert.equal(textoUso(3, 10), "usada 3 de 10");
  assert.equal(textoUso(3, null), "usada 3 veces");
  assert.equal(textoUso(1, null), "usada 1 vez");
  const base = { tipo: "codigo", nombre: "L", porcentaje: "10", codigo: "LUNA10", coleccion: null, productoId: null, inicio: "2026-10-01", fin: "", limite: "", pausada: false };
  assert.equal(validarPromo(base, [], T).limite, undefined);
  assert.equal(validarPromo({ ...base, limite: "5" }, [], T).limite, undefined);
  assert.ok(validarPromo({ ...base, limite: "0" }, [], T).limite);
  assert.ok(validarPromo({ ...base, limite: "2.5" }, [], T).limite);
  assert.equal(validarPromo({ ...base, tipo: "coleccion", coleccion: "P", codigo: "", limite: "0" }, [], T).limite, undefined);
});

test("copia para otro tipo: conserva solo detalles compatibles, no identidad ni historial", async () => {
  const { datosFormularioPromo } = await import("../lib/promos.ts");
  for (const origen of ["codigo", "producto", "coleccion"]) {
    for (const destino of ["codigo", "producto", "coleccion"]) {
      if (origen === destino) continue;
      const original = promo({ tipo: origen, codigo: "LUNA20", productoId: "producto-1", coleccion: "Dulces", limiteUsos: 10, pausada: true });
      const antes = structuredClone(original);
      const datos = datosFormularioPromo(original, false, destino);
      assert.equal(datos.tipo, destino);
      assert.equal(datos.nombre, original.nombre);
      assert.equal(datos.porcentaje, "20");
      assert.equal(datos.codigo, "");
      assert.equal(datos.productoId, null);
      assert.equal(datos.coleccion, null);
      assert.equal(datos.limite, "");
      assert.equal(datos.fin, "");
      assert.equal(datos.pausada, false);
      assert.equal("id" in datos, false);
      assert.equal("estado" in datos, false);
      assert.deepEqual(original, antes);
      const errores = validarPromo(datos, [original], T);
      assert.ok(errores[destino === "codigo" ? "codigo" : destino === "producto" ? "productoId" : "coleccion"]);
      assert.ok(validarPromo({ ...datos, inicio: "2026-10-02", fin: "2026-10-01" }, [original], T).fin);
    }
  }
});

test("duplicación existente y edición conservan sus valores compatibles", async () => {
  const { datosFormularioPromo, isoADia, hoyLocal } = await import("../lib/promos.ts");
  const original = promo({ fechaFin: "2026-10-20T03:59:59Z", limiteUsos: 8, pausada: true });
  const editando = datosFormularioPromo(original, true);
  assert.equal(editando.inicio, isoADia(original.fechaInicio));
  assert.equal(editando.fin, isoADia(original.fechaFin));
  assert.equal(editando.pausada, true);
  const copia = datosFormularioPromo(original);
  assert.equal(copia.codigo, "LUNA20");
  assert.equal(copia.limite, "8");
  assert.equal(copia.inicio, hoyLocal());
  assert.equal(copia.fin, "");
  assert.equal(copia.pausada, false);
});
