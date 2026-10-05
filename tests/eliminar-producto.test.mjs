import './cargar-ts.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const { eliminarProductoDeDB, revisarEliminacionProducto } = await import('../lib/data/eliminar-producto.ts');
const { productosDeTienda, productoDeTienda, modificarProducto } = await import('../lib/data/productos.ts');
const { ajustarStockEnDB } = await import('../lib/data/inventario.ts');
const { deshacerDespacho, despacharPedido } = await import('../lib/data/pedidos.ts');
const ahora='2026-10-05T12:00:00Z';
const db=()=>({productos:[{id:'p',tiendaId:'t',nombre:'Antes',activo:true,stock:8,fotos:['foto'],medios:[{tipo:'foto',url:'foto'}],likes:12,opciones:[],creadoEn:ahora},{id:'otro',tiendaId:'t',nombre:'Otro',stock:null,opciones:[],creadoEn:ahora},{id:'ajeno',tiendaId:'otra',creadoEn:ahora}],pedidos:[],pedidoItems:[],abonos:[],ajustesInventario:[],variantes:[],solicitudes:[],avisos:[],promos:[],eventosAaah:[],clientes:[],usuarios:[],tiendas:[]});
test('eliminar es lógico e idempotente; no toca medios, stock, likes ni otra tienda',()=>{
 const antes=db(), despues=eliminarProductoDeDB(antes,'t','p',ahora);
 assert.equal(despues.productos[0].eliminadoEn,ahora);assert.equal(despues.productos[0].activo,false);
 for(const k of ['stock','fotos','medios','likes'])assert.deepEqual(despues.productos[0][k],antes.productos[0][k]);
 assert.equal(antes.productos[0].activo,true);assert.equal(eliminarProductoDeDB(despues,'t','p',ahora),despues);
 assert.deepEqual(productosDeTienda(despues,'t').map(p=>p.id),['otro']);assert.equal(productosDeTienda(despues,'t',true).length,2);
 assert.equal(productoDeTienda(despues,'t','p').eliminadoEn,ahora);assert.equal(productoDeTienda(despues,'otra','p'),null);
 assert.throws(()=>eliminarProductoDeDB(antes,'otra','p',ahora),/no_encontrado/);
 assert.throws(()=>modificarProducto(despues,'t','p',{activo:true},ahora),/eliminado/);
 assert.throws(()=>ajustarStockEnDB(despues,'t','p',1,'reposicion',null,'actor','a',ahora),/disponible/);
});
test('bloquea pedidos en curso, solicitudes vigentes y avisos; descartar/vencer/marcar sí los resuelve',()=>{
 for(const estado of ['nuevo','por_despachar']){const d=db();d.pedidos=[{id:'o',tiendaId:'t',estado}];d.pedidoItems=[{pedidoId:'o',productoId:'p'}];assert.throws(()=>eliminarProductoDeDB(d,'t','p',ahora),/pendientes/);}
 const d=db();d.solicitudes=[{tiendaId:'t',items:[{productoId:'p',varianteId:'v'}],venceEn:'2026-10-06',pedidoId:null,descartadaEn:null}];assert.throws(()=>eliminarProductoDeDB(d,'t','p',ahora),/pendientes/);
 d.solicitudes[0].venceEn='2026-10-04';d.avisos=[{tiendaId:'t',productoId:'p',avisadoEn:null}];assert.throws(()=>eliminarProductoDeDB(d,'t','p',ahora),/pendientes/);
 d.avisos[0].avisadoEn=ahora;assert.equal(eliminarProductoDeDB(d,'t','p',ahora).avisos[0],d.avisos[0]);
});
test('historial multíproducto, pagos, ajustes y variantes permanecen; devolución y redespacho funcionan',()=>{
 const d=db();d.pedidos=[{id:'o',tiendaId:'t',estado:'despachado',total:500,pagoModo:'credito'}];d.pedidoItems=[{pedidoId:'o',productoId:'p',cantidad:2,nombreProducto:'Nombre histórico',precioUnitario:100,varianteTexto:'S'},{pedidoId:'o',productoId:'otro',cantidad:1,precioUnitario:300}];d.abonos=[{pedidoId:'o',monto:80}];d.ajustesInventario=[{tiendaId:'t',productoId:'p',variacion:3}];
 assert.equal(revisarEliminacionProducto(d,'t','p',ahora).conHistorial,true);
 const r=eliminarProductoDeDB(d,'t','p',ahora);for(const k of ['pedidos','pedidoItems','abonos','ajustesInventario','variantes'])assert.equal(r[k],d[k]);
 const dev=deshacerDespacho(r,'t','o',ahora);assert.equal(dev.db.productos[0].stock,10);
 const sale=despacharPedido(dev.db,'t','o',ahora);assert.equal(sale.db.productos[0].stock,8);assert.equal(sale.db.productos[0].eliminadoEn,ahora);
});
const { crearFuenteSupabase }=await import('../lib/data/supabase.ts');
test('adaptador real usa RPC con tienda/producto; falla sin anunciar cambio y contrato faltante informa el límite',async()=>{
 let cambios=0;const llamadas=[];
 const rpc=async(nombre,args)=>{llamadas.push({nombre,args});return {data: nombre==='revisar_eliminacion_producto'?{pedidosPendientes:1,solicitudesPendientes:0,avisosPendientes:0,conHistorial:true}:null,error:null};};
 const fuente=crearFuenteSupabase({rpc},()=>cambios++);
 assert.equal((await fuente.revisarEliminacionProducto('t','p')).pedidosPendientes,1);await fuente.eliminarProducto('t','p');assert.equal(cambios,1);
 assert.deepEqual(llamadas.map(c=>c.args),[{p_tienda_id:'t',p_producto_id:'p'},{p_tienda_id:'t',p_producto_id:'p'}]);
 const fallo=crearFuenteSupabase({rpc:async()=>({data:null,error:{code:'PGRST202',message:'missing'}})},()=>cambios++);
 await assert.rejects(()=>fallo.revisarEliminacionProducto('t','p'),/todavía no está disponible/);
 await assert.rejects(()=>fallo.eliminarProducto('t','p'));assert.equal(cambios,1);
});
