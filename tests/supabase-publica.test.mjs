import './cargar-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {crearOperacionesPublicas} from '../lib/data/supabase-publica.ts';
import {CatalogoNoDisponible, ErrorDeRed} from '../lib/data/errores.ts';
const mock=(data,error=null)=>{const llamadas=[];return {llamadas,fuente:crearOperacionesPublicas({rpc:(nombre,args)=>{llamadas.push({nombre,args});return Promise.resolve({data,error});}})};};
test('la fuente pública compartida solo expone las cinco operaciones del contrato',()=>{
 assert.deepEqual(Object.keys(mock(null).fuente).sort(),['catalogoPublico','crearSolicitudPedido','pedirAviso','registrarAaah','verSolicitud'].sort());
});
test('catálogo inexistente conserva el error y el slug de la RPC',async()=>{
 const m=mock(null);await assert.rejects(m.fuente.catalogoPublico('otra-tienda'),CatalogoNoDisponible);assert.deepEqual(m.llamadas,[{nombre:'catalogo_publico',args:{p_slug:'otra-tienda'}}]);
});
test('solicitud conserva precio canónico, variante, cantidad, código y dispositivo',async()=>{
 const m=mock({codigo:'ABCDEFGHJK',subtotal:200,descuento:20,total:180,codigo_promo:'HOLA',items:[],vence_en:'2026-10-05T00:00:00Z'});
 const r=await m.fuente.crearSolicitudPedido('tienda',[{productoId:'producto',varianteId:'variante',cantidad:2}],' HOLA ','dispositivo');
 assert.equal(r.total,180);assert.equal(r.codigoPromo,'HOLA');assert.deepEqual(m.llamadas,[{nombre:'crear_solicitud_pedido',args:{p_slug:'tienda',p_items:[{producto_id:'producto',variante_id:'variante',cantidad:2}],p_codigo_promo:'HOLA',p_dispositivo:'dispositivo'}}]);
});
test('consulta de comprador inexistente conserva null',async()=>{const m=mock(null);assert.equal(await m.fuente.verSolicitud('CODIGO'),null);assert.deepEqual(m.llamadas,[{nombre:'ver_solicitud',args:{p_codigo:'CODIGO'}}]);});
test('aaah conserva tienda, producto, dispositivo y valor confirmado',async()=>{const m=mock(7);assert.equal(await m.fuente.registrarAaah('tienda','producto','dispositivo',true),7);assert.deepEqual(m.llamadas,[{nombre:'registrar_aaah',args:{p_slug:'tienda',p_producto_slug:'producto',p_dispositivo:'dispositivo',p_on:true}}]);});
test('aviso conserva variante y teléfono, sin normalizar de forma nueva',async()=>{const m=mock(null);await m.fuente.pedirAviso('tienda','producto','variante','18095550123',' Ana ','dispositivo');assert.deepEqual(m.llamadas,[{nombre:'pedir_aviso',args:{p_slug:'tienda',p_producto_slug:'producto',p_variante_id:'variante',p_telefono:'18095550123',p_nombre:'Ana',p_dispositivo:'dispositivo'}}]);});
test('fallo de transporte conserva el error común a panel y catálogo',async()=>{const f=crearOperacionesPublicas({rpc:()=>Promise.reject(new TypeError('Failed to fetch'))});await assert.rejects(f.verSolicitud('CODIGO'),ErrorDeRed);});
