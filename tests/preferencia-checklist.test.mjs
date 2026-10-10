import './cargar-ts.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const P = await import('../lib/preferencia-checklist.ts');
test('preferencia aislada por usuario, modo y tienda; valor sin datos personales', () => {
 const valores = new Map();
 globalThis.localStorage = { getItem: k => valores.get(k) ?? null, setItem: (k,v) => valores.set(k,v) };
 const clave = P.clavePreferenciaChecklist('usuario-a','real','tienda-a');
 P.guardarPreferenciaChecklist(clave,{minimizada:true,capitulo:1});
 assert.deepEqual(JSON.parse(valores.get(clave)),{minimizada:true,capitulo:1});
 for(const args of [['usuario-b','real','tienda-a'],['usuario-a','demo','tienda-a'],['usuario-a','real','tienda-b']]) {
  assert.equal(P.leerPreferenciaChecklist(P.clavePreferenciaChecklist(...args)).minimizada,false);
 }
 assert.deepEqual(P.leerPreferenciaChecklist(clave),{minimizada:true,capitulo:1});
});
test('sin almacenamiento funciona en memoria y permite restaurar', () => {
 globalThis.localStorage = { getItem:()=>{throw Error('bloqueado')},setItem:()=>{throw Error('bloqueado')} };
 const clave = P.clavePreferenciaChecklist('sin-storage','demo','a');
 assert.equal(P.leerPreferenciaChecklist(clave).minimizada,false);
 P.guardarPreferenciaChecklist(clave,{minimizada:true,capitulo:2});
 assert.deepEqual(P.leerPreferenciaChecklist(clave),{minimizada:true,capitulo:2});
 P.guardarPreferenciaChecklist(clave,{minimizada:false,capitulo:2});
 assert.equal(P.leerPreferenciaChecklist(clave).minimizada,false);
});
test('datos corruptos y capítulos fuera de rango no contaminan la guía', () => {
 globalThis.localStorage = { getItem:k=>k.endsWith(':corrupta')?'no-json':'{"minimizada":true,"capitulo":99}' };
 assert.deepEqual(P.leerPreferenciaChecklist('prueba:corrupta'),{minimizada:false});
 assert.deepEqual(P.leerPreferenciaChecklist('prueba:fuera'),{minimizada:true});
});
