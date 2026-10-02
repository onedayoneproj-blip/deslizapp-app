import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ajustarStockEnDB, validarAjusteInventario } from '../lib/data/inventario.ts';

const producto = (id='p', tiendaId='t', stock=2) => ({
  id, tiendaId, nombre:id, precio:100, fotos:[], fotoRetocada:false, categoria:null, activo:true,
  destacado:false, stock, likes:0, creadoEn:'2026-10-01T00:00:00Z', actualizadoEn:'2026-10-01T00:00:00Z',
});
const db = (productos=[producto()]) => ({
  tiendas:[], usuarios:[], productos, pedidos:[{id:'pedido', estado:'por_despachar'}], pedidoItems:[], abonos:[],
  ajustesInventario:[], clientes:[], promos:[], eventosAaah:[],
});

test('un aumento y una disminución guardan variación, antes/después, motivo y actor; no tocan pedidos', () => {
  const inicial=db();
  const uno=ajustarStockEnDB(inicial,'t','p',1,'reposicion',null,'duena','a1','2026-10-02T12:00:00Z');
  assert.equal(uno.producto.stock,3);
  assert.deepEqual(uno.ajuste,{id:'a1',tiendaId:'t',productoId:'p',variacion:1,stockAnterior:2,stockNuevo:3,motivo:'reposicion',nota:null,actorId:'duena',creadoEn:'2026-10-02T12:00:00Z'});
  const dos=ajustarStockEnDB(uno.db,'t','p',-1,'perdida',null,'duena','a2','2026-10-02T12:01:00Z');
  assert.equal(dos.producto.stock,2);
  assert.deepEqual(dos.db.ajustesInventario.map(a=>[a.variacion,a.motivo]),[[1,'reposicion'],[-1,'perdida']]);
  assert.deepEqual(dos.db.pedidos,inicial.pedidos);
  assert.equal(dos.db.ajustesInventario.length,2);
});

test('motivos, stock sin control, cero y negativos se validan sin mutar la base original', () => {
  const inicial=db();
  assert.throws(()=>ajustarStockEnDB(inicial,'t','p',-3,'dano',null,'duena','a1','ahora'),/negativo/);
  assert.throws(()=>ajustarStockEnDB(inicial,'t','p',-1,'reposicion',null,'duena','a1','ahora'),/motivo/);
  assert.throws(()=>ajustarStockEnDB(inicial,'t','p',1,'otro',null,'duena','a1','ahora'),/reposici/);
  assert.throws(()=>ajustarStockEnDB(inicial,'t','p',-1,'otro','   ','duena','a1','ahora'),/motivo/);
  assert.throws(()=>ajustarStockEnDB(inicial,'otra','p',1,'reposicion',null,'duena','a1','ahora'),/no existe/);
  assert.throws(()=>validarAjusteInventario(null,1,'reposicion'),/no lleva control/);
  assert.throws(()=>validarAjusteInventario(0,-1,'dano'),/negativo/);
  assert.equal(inicial.productos[0].stock,2);
  assert.equal(inicial.ajustesInventario.length,0);
  assert.equal(validarAjusteInventario(2,-1,'correccion_inventario').stockNuevo,1);
  assert.equal(validarAjusteInventario(0,1,'reposicion').stockNuevo,1);
});

test('dos ajustes sucesivos parten del último stock y la operación no cruza tiendas', () => {
  const inicial=db([producto('p','t',1),producto('p','otra',8)]);
  const a=ajustarStockEnDB(inicial,'t','p',-1,'dano',null,'duena','a1','ahora');
  const b=ajustarStockEnDB(a.db,'t','p',1,'reposicion',null,'duena','a2','despues');
  assert.equal(b.producto.stock,1);
  assert.equal(b.db.productos.find(p=>p.tiendaId==='otra').stock,8);
  assert.deepEqual(b.db.ajustesInventario.map(x=>[x.stockAnterior,x.stockNuevo]),[[1,0],[0,1]]);
});

test('guardar ficha y propuesta final crea un ajuste; sin diferencia no crea ninguno', async () => {
  const {guardarProductoEnDB}=await import('../lib/data/inventario.ts');
  const inicial=db();
  const a=guardarProductoEnDB(inicial,'t','p',{nombre:'Nuevo'}, {id:'final',stockBase:2,stockPropuesto:5,motivo:'reposicion',nota:null},'duena','ahora');
  assert.equal(a.producto.nombre,'Nuevo');assert.equal(a.producto.stock,5);assert.equal(a.db.ajustesInventario.length,1);assert.equal(a.db.ajustesInventario[0].variacion,3);
  assert.deepEqual(a.db.pedidos,inicial.pedidos);assert.equal(inicial.productos[0].stock,2);
  const b=guardarProductoEnDB(a.db,'t','p',{precio:150},null,'duena','despues');
  assert.equal(b.producto.precio,150);assert.equal(b.db.ajustesInventario.length,1);
  const c=guardarProductoEnDB(b.db,'t','p',{}, {id:'igual',stockBase:5,stockPropuesto:5,motivo:'reposicion',nota:null},'duena','despues');
  assert.equal(c.db.ajustesInventario.length,1);
});

test('conflicto, motivo o ficha inválidos no dejan un guardado parcial',async()=>{
  const {guardarProductoEnDB}=await import('../lib/data/inventario.ts');const inicial=db();
  for(const propuesta of [
    {id:'a',stockBase:1,stockPropuesto:3,motivo:'reposicion',nota:null},
    {id:'b',stockBase:2,stockPropuesto:1,motivo:'otro',nota:'  '},
    {id:'c',stockBase:2,stockPropuesto:-1,motivo:'dano',nota:null},
  ])assert.throws(()=>guardarProductoEnDB(inicial,'t','p',{nombre:'No guardar'},propuesta,'duena','ahora'));
  assert.throws(()=>guardarProductoEnDB(inicial,'t','p',{nombre:''},{id:'a',stockBase:2,stockPropuesto:3,motivo:'reposicion',nota:null},'duena','ahora'));
  assert.equal(inicial.productos[0].nombre,'p');assert.equal(inicial.productos[0].stock,2);assert.equal(inicial.ajustesInventario.length,0);
});

test('base compartida: solo el primero se guarda; repetir su identidad no duplica el ajuste',async()=>{
  const {guardarProductoEnDB}=await import('../lib/data/inventario.ts');const propuesta={id:'a',stockBase:2,stockPropuesto:4,motivo:'reposicion',nota:null};
  const a=guardarProductoEnDB(db(),'t','p',{},propuesta,'duena','ahora');
  assert.throws(()=>guardarProductoEnDB(a.db,'t','p',{nombre:'Segundo'},{...propuesta,id:'b'},'duena','ahora'),/stock cambió/);
  const repetido=guardarProductoEnDB(a.db,'t','p',{},propuesta,'duena','ahora');
  assert.equal(repetido.db.ajustesInventario.length,1);assert.equal(repetido.producto.stock,4);
  assert.throws(()=>guardarProductoEnDB(a.db,'t','p',{}, {...propuesta,stockPropuesto:6},'duena','ahora'),/otro guardado/);
  assert.throws(()=>guardarProductoEnDB(a.db,'otra','p',{},propuesta,'duena','ahora'));
});
