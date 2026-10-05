import "./cargar-ts.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { resumenEspera, textoEspera } = await import("../lib/avisos.ts");

const aviso = (id, productoId, telefono, extra = {}) => ({ id, tiendaId: "tienda", productoId, telefono, nombre: "Prueba", varianteId: null, creadoEn: "2026-10-05T10:00:00Z", avisadoEn: null, ...extra });
test("espera: cero y singular/plural", () => {
  assert.equal(resumenEspera([], "tienda").personas, 0);
  assert.equal(textoEspera(1), "1 persona espera");
  assert.equal(textoEspera(2), "2 personas esperan");
});
test("espera: teléfonos normalizados, productos distintos y variantes sin perder filas", () => {
  const filas = [aviso("a", "p1", "8095550142", {varianteId:"v1"}), aviso("b", "p1", "+1 (809) 555-0142", {varianteId:"v2"}), aviso("c", "p2", "18095550142"), aviso("d", "p1", "8295550177")];
  const r = resumenEspera(filas, "tienda");
  assert.equal(r.personas, 2); assert.equal(r.productos, 2);
  assert.equal(r.personasPorProducto.get("p1"), 2); assert.equal(r.personasPorProducto.get("p2"), 1);
  assert.deepEqual(r.porProducto.get("p1").map(a=>a.varianteId), ["v1", "v2", null]);
  assert.equal(filas.length, 4);
});
test("espera: marcado parcial, último resuelto y aislamiento", () => {
  const a = aviso("a", "p1", "8095550142"), b = aviso("b", "p2", "8095550142");
  const otra = aviso("c", "p3", "8495550142", {tiendaId:"otra"});
  const marcada = {...a,avisadoEn:"2026-10-05T11:00:00Z"};
  const r = resumenEspera([marcada,b,otra], "tienda");
  assert.equal(r.personas,1);assert.equal(r.productos,1);assert.equal(r.porProducto.has("p3"),false);
  assert.equal(resumenEspera([marcada,{...b,avisadoEn:marcada.avisadoEn}],"tienda").personas,0);
});

test("Avísame persiste sin mensajes; reponer no resuelve avisos y marcar no crea ventas", async () => {
  const {construirDesdeSeed} = await import("../lib/data/db.ts");
  const {pedirAvisoEnDB, marcarAvisadoEnDB} = await import("../lib/data/catalogo.ts");
  const base=construirDesdeSeed(),t=base.tiendas[0],p=base.productos.find(p=>p.tiendaId===t.id);
  p.stock=0;p.activo=true;p.porEncargo=false;base.avisos=[];
  const creada=pedirAvisoEnDB(base,t.slug,p.slug,null,"8095550142","Fixture","dispositivo-fixture",()=>"aviso-fixture",new Date());
  assert.equal(creada.avisos.length,1);assert.equal(creada.avisos[0].avisadoEn,null);
  const repuesta={...creada,productos:creada.productos.map(x=>x.id===p.id?{...x,stock:3}:x)};
  assert.equal(resumenEspera(repuesta.avisos,t.id).personas,1);
  assert.equal(marcarAvisadoEnDB(repuesta,base.tiendas[1].id,["aviso-fixture"],new Date().toISOString()).n,0);
  const marcada=marcarAvisadoEnDB(repuesta,t.id,["aviso-fixture"],new Date().toISOString());
  assert.equal(marcada.n,1);assert.equal(resumenEspera(marcada.db.avisos,t.id).personas,0);
  assert.deepEqual(marcada.db.pedidos,base.pedidos);assert.deepEqual(marcada.db.pedidoItems,base.pedidoItems);
  assert.equal(marcada.db.productos.find(x=>x.id===p.id).stock,3);
});
