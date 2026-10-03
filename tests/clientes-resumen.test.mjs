import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analizarClientes, ordenarClientes, mensajeDormido, lecturaClientes, cumpleFiltroCliente, pastillasClientes } from '../lib/clientes-resumen.ts';
const ahora = Date.parse('2026-10-01T15:00:00Z');
const cliente = (id, origen = 'manual', tiendaId = 't') => ({ id, tiendaId, nombre: id, origen, pedidos: 99, repite: true, totalGastado: 0 });
const pedido = (clienteId, fecha, total = 100, estado = 'despachado', tiendaId = 't') => ({ clienteId, tiendaId, estado, total, despachadoEn: fecha, creadoEn: fecha });
test('segmentos solo por compras, fechas locales, ventas sin cliente y aislamiento', () => {
  const r = analizarClientes([cliente('r'), cliente('u','catalogo'), cliente('s'), cliente('otro','manual','otra')], [
    pedido('r','2026-07-01T16:00:00Z'), pedido('r','2026-08-02T16:00:00Z'),
    pedido('u','2026-09-02T04:00:00Z'), pedido('s','2026-09-20T16:00:00Z',100,'nuevo'),
    pedido('s','2026-09-20T16:00:00Z',100,'cancelado'), pedido('r','2026-09-30T16:00:00Z',100,'despachado','otra'),
    pedido(null,'2026-09-30T16:00:00Z'), pedido('s','2026-10-02T16:00:00Z'),
  ], 't', ahora);
  assert.deepEqual(r.cuentas, {todos:3,repiten:1,una:1,sin:1,nuevos:1,dormidos:1,catalogo:1,manual:2});
  assert.equal(r.totalVendido,400); assert.equal(r.porcentajeRepiten,50);
  assert.equal(r.lista.find(c=>c.id==='s').repite,false);
});
test('límites de 30 y 60 días usan días civiles de Santo Domingo', () => {
  const r=analizarClientes(['a','b','c','d'].map(x=>cliente(x)), [
    pedido('a','2026-09-02T03:59:59Z'), pedido('b','2026-09-02T04:00:00Z'),
    pedido('c','2026-08-03T03:59:59Z'), pedido('d','2026-08-03T04:00:00Z'),
  ],'t',ahora);
  assert.equal(r.lista[0].nuevo,false); assert.equal(r.lista[1].nuevo,true);
  assert.equal(r.lista[2].dormido,true); assert.equal(r.lista[3].dormido,false);
});
test('sin ventas no hay NaN y las compras se ordenan según el filtro',()=>{
  const vacio=analizarClientes([],[],'t',ahora); assert.equal(vacio.porcentajeRepiten,0);
  const a={nombre:'a',compras:2,primeraVenta:1,ultimaVenta:1},b={nombre:'b',compras:3,primeraVenta:2,ultimaVenta:2};
  assert.ok(ordenarClientes(a,b,'dormidos')<0); assert.ok(ordenarClientes(a,b,'nuevos')>0); assert.ok(ordenarClientes(a,b,'repiten')>0);
  assert.ok(!mensajeDormido('Ana','','Tienda','javascript:alert(1)').includes('javascript:'));
  assert.ok(mensajeDormido('Ana','Michel','Tienda','https://ejemplo.com').endsWith('https://ejemplo.com'));
});
test('lectura de la dona de clientes: título y línea', () => {
  assert.deepEqual(lecturaClientes({ cuentas: { todos: 10, repiten: 0 }, totalVendido: 0, porcentajeRepiten: 0 }), { titulo: 'Nadie repite todavía.', linea: null });
  assert.deepEqual(lecturaClientes({ cuentas: { todos: 110, repiten: 59 }, totalVendido: 500, porcentajeRepiten: 80 }), { titulo: '1 de cada 2 vuelve a comprar.', linea: 'Los que repiten dejan el 80 % de tus ventas.' });
  assert.equal(lecturaClientes({ cuentas: { todos: 4, repiten: 0 }, totalVendido: 100, porcentajeRepiten: 0 }).linea, 'Los que repiten dejan el 0 % de tus ventas.');
});
test('filtros "catalogo" y "manual" por origen', () => {
  const lista = [cliente('a', 'catalogo'), cliente('b', 'manual'), cliente('c', 'catalogo')];
  assert.deepEqual(lista.filter((c) => cumpleFiltroCliente(c, 'catalogo')).map((c) => c.id), ['a', 'c']);
  assert.deepEqual(lista.filter((c) => cumpleFiltroCliente(c, 'manual')).map((c) => c.id), ['b']);
});
test('la pastilla temporal solo aparece mientras es el filtro elegido, al final', () => {
  const base = ['todos', 'deben', 'repiten', 'nuevos', 'dormidos'];
  assert.deepEqual(pastillasClientes('todos'), base);
  assert.deepEqual(pastillasClientes('dormidos'), base);
  assert.deepEqual(pastillasClientes('catalogo'), [...base, 'catalogo']);
  assert.deepEqual(pastillasClientes('manual'), [...base, 'manual']);
});
