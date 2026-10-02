import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularJugadas, diasDesde, mensajeJugada } from '../lib/proxima-jugada.ts';

const ahora = Date.parse('2026-10-01T04:00:01Z'); // 00:00:01 en Santo Domingo
const cliente = (id, tiendaId='t') => ({id, tiendaId, nombre:id, telefono:null, origen:'manual', pedidos:0, repite:false, totalGastado:0});
const pedido = (clienteId, fecha, estado='despachado', tiendaId='t') => ({clienteId, tiendaId, estado, total:100, creadoEn:fecha, despachadoEn:fecha});
const grupo = (r,id) => r.jugadas.find(j=>j.id===id);

test('cero, una y varias compras; grupos superpuestos y porcentaje sin dividir por cero', () => {
  assert.deepEqual(calcularJugadas([],[],'t',ahora), {jugadas:[], destacada:null, total:0});
  const r=calcularJugadas([cliente('cero'),cliente('una'),cliente('dos')],[
    pedido('una','2026-07-01T04:00:00Z'),
    pedido('dos','2026-07-01T04:00:00Z'), pedido('dos','2026-07-02T04:00:00Z')
  ],'t',ahora);
  assert.equal(r.total,3);
  assert.deepEqual(r.jugadas.map(j=>[j.id,j.cantidad,j.porcentaje]), [['volver',2,67],['segundo',1,33],['gracias',1,33],['primer',1,33]]);
  assert.equal(r.destacada.id,'volver');
  assert.deepEqual(grupo(r,'volver').clientes.map(c=>c.id),['una','dos']);
});

test('60 días civiles en Santo Domingo, con prioridad en empate', () => {
  const r=calcularJugadas([cliente('59'),cliente('60'),cliente('sin')],[
    pedido('59','2026-08-03T04:00:00Z'), pedido('60','2026-08-02T04:00:00Z')
  ],'t',ahora);
  assert.deepEqual(grupo(r,'volver').clientes.map(c=>c.id),['60']);
  assert.equal(r.destacada.id,'segundo'); // dos compras únicas frente a un dormido
  assert.equal(diasDesde(Date.parse('2026-08-02T04:00:00Z'),ahora),60);
});

test('pendientes excluidos en todas las jugadas; cancelados no cuentan ni excluyen', () => {
  const r=calcularJugadas(['a','b','c'].map(x=>cliente(x)),[
    pedido('a','2026-06-01T04:00:00Z'), pedido('a','2026-09-30T04:00:00Z','nuevo'),
    pedido('b','2026-09-30T04:00:00Z','por_despachar'),
    pedido('c','2026-06-01T04:00:00Z','cancelado'),
  ],'t',ahora);
  assert.deepEqual(r.jugadas.map(j=>[j.id,j.cantidad]),[['primer',1]]);
  assert.equal(grupo(r,'primer').clientes[0].id,'c');
  assert.equal(grupo(r,'primer').porcentaje,33);
});

test('fechas inválidas y futuras, fecha de creación alternativa, otras tiendas', () => {
  const clientes=['invalido','futuro','alterno','ajeno'].map(id=>cliente(id,id==='ajeno'?'otra':'t'));
  const r=calcularJugadas(clientes,[
    pedido('invalido','nada'), pedido('futuro','2026-10-02T04:00:00Z'),
    {...pedido('alterno','2026-07-01T04:00:00Z'),despachadoEn:null},
    pedido('invalido','2026-07-01T04:00:00Z','despachado','otra'),
    pedido('ajeno','2026-07-01T04:00:00Z','despachado','otra'),
  ],'t',ahora);
  assert.equal(r.total,3);
  assert.deepEqual(grupo(r,'primer').clientes.map(c=>c.id),['futuro','invalido']);
  assert.deepEqual(grupo(r,'volver').clientes.map(c=>c.id),['alterno']);
  assert.equal(r.destacada.id,'primer');
});

test('orden útil y prioridad completa entre grupos empatados', () => {
  const r=calcularJugadas(['a','b','c','d'].map(x=>cliente(x)),[
    pedido('a','2026-09-01T04:00:00Z'),pedido('b','2026-09-02T04:00:00Z'),
    pedido('c','2026-09-01T04:00:00Z'),pedido('c','2026-09-03T04:00:00Z'),
    pedido('d','2026-09-01T04:00:00Z'),pedido('d','2026-09-04T04:00:00Z'),
  ],'t',ahora);
  assert.equal(r.destacada.id,'segundo'); // 2 segundos y 2 gracias; segundo gana
  assert.deepEqual(grupo(r,'segundo').clientes.map(c=>c.id),['b','a']);
  assert.equal(grupo(r,'gracias').cantidad,2);
  const primero=calcularJugadas([cliente('sin'),cliente('una')],[pedido('una','2026-09-20T04:00:00Z')],'t',ahora);
  assert.equal(primero.destacada.id,'primer'); // empata con segundo
  const volver=calcularJugadas([cliente('sin'),cliente('viejo')],[pedido('viejo','2026-07-01T04:00:00Z')],'t',ahora);
  assert.equal(volver.destacada.id,'volver'); // empata con primer y segundo
});

test('mensajes editables sin promesas ni enlaces inseguros', () => {
  const m=mensajeJugada('gracias','Ana','Michel','Esencias','https://ejemplo.com/catalogo');
  assert.match(m,/Ana/); assert.match(m,/Michel/); assert.match(m,/Esencias/); assert.match(m,/https:\/\/ejemplo.com\/catalogo/);
  assert.doesNotMatch(m,/descuento|premio|producto favorito/i);
  assert.doesNotMatch(mensajeJugada('primer','Ana','','T','javascript:alert(1)'),/javascript:/);
});

test('tres borradores distintos por jugada, con enlace HTTPS solo cuando es válido', async () => {
  const { borradoresJugada } = await import('../lib/proxima-jugada.ts');
  for (const id of ['volver', 'segundo', 'gracias', 'primer']) {
    const conEnlace = borradoresJugada(id, 'Ana', 'Michel', 'Esencias', 'https://ejemplo.com/catalogo');
    assert.deepEqual(conEnlace.map((b) => b.tono), ['Cercano', 'Directo', 'Mirar el catálogo']);
    assert.equal(new Set(conEnlace.map((b) => b.texto)).size, 3);
    for (const b of conEnlace) {
      assert.match(b.texto, /Ana/); assert.match(b.texto, /Michel/); assert.match(b.texto, /Esencias/);
      assert.doesNotMatch(b.texto, /descuento|premio|producto favorito|novedad/i);
    }
    assert.doesNotMatch(conEnlace[0].texto + conEnlace[1].texto, /https:\/\//);
    assert.match(conEnlace[2].texto, /https:\/\/ejemplo.com\/catalogo/);
    const sinEnlace = borradoresJugada(id, 'Ana', '', 'Esencias', 'javascript:alert(1)');
    assert.equal(sinEnlace.length, 3);
    assert.equal(sinEnlace[2].tono, 'Conocer la tienda');
    assert.doesNotMatch(sinEnlace.map((b) => b.texto).join(' '), /javascript:|https:\/\//);
  }
});
