import test from "node:test";
import assert from "node:assert/strict";
import "./cargar-ts.mjs";
const memoria=new Map();globalThis.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v),removeItem:k=>memoria.delete(k)};
const {construirDesdeSeed}=await import("../lib/data/db.ts");
const {fuenteDemo}=await import("../lib/data/demo.ts");
const {crearFuenteSupabase}=await import("../lib/data/supabase.ts");
const {filaCambiosProducto}=await import("../lib/data/filas.ts");
test("ocultar/mostrar conserva cantidades, likes e historiales en demo y separa tiendas",async()=>{
 const db=construirDesdeSeed(),t=db.tiendas[0],p=db.productos.find(p=>p.tiendaId===t.id);memoria.set("deslizapp-demo-v5",JSON.stringify(db));
 const antes=await fuenteDemo.getProducto(t.id,p.id);await fuenteDemo.actualizarProducto(t.id,p.id,{activo:false});const oculto=await fuenteDemo.getProducto(t.id,p.id);assert.equal(oculto.activo,false);assert.equal(oculto.stock,antes.stock);assert.equal(oculto.likes,antes.likes);assert.deepEqual(oculto.fotos,antes.fotos);
 let despues=JSON.parse(memoria.get("deslizapp-demo-v5"));for(const k of ["pedidos","pedidoItems","abonos","ajustesInventario","eventosAaah"])assert.deepEqual(despues[k],db[k]);
 assert.deepEqual(despues.productos.filter(p=>p.tiendaId!==t.id),db.productos.filter(p=>p.tiendaId!==t.id));
 await assert.rejects(()=>fuenteDemo.actualizarProducto(db.tiendas[1].id,p.id,{activo:true}),/esta tienda/);
 await fuenteDemo.actualizarProducto(t.id,p.id,{activo:true});assert.equal((await fuenteDemo.getProducto(t.id,p.id)).activo,true);assert.equal((await fuenteDemo.getProducto(t.id,p.id)).stock,antes.stock);
});
test("adaptador real actualiza solo activo y filtra producto/tienda: transporte simulado",async()=>{
 const llamadas=[];const row={id:"p",tienda_id:"t",nombre:"Nombre de otra sesión",precio:1200,activo:false,stock:7,likes:12,fotos:[],foto_retocada:false,categoria:null,destacado:false,creado_en:new Date().toISOString(),actualizado_en:new Date().toISOString()};
 const q={update:c=>{llamadas.push(["update",c]);return q},eq:(k,v)=>{llamadas.push(["eq",k,v]);return q},select:()=>q,maybeSingle:async()=>({data:row,error:null})};let cambios=0;
 const fuente=crearFuenteSupabase({from:n=>{assert.equal(n,"productos");return q}},()=>cambios++);
 const result=await fuente.actualizarProducto("t","p",{activo:false});assert.deepEqual(llamadas,[["update",{activo:false}],["eq","tienda_id","t"],["eq","id","p"]]);assert.equal(result.nombre,row.nombre);assert.equal(result.stock,7);assert.equal(result.likes,12);assert.equal(cambios,1);assert.deepEqual(filaCambiosProducto({activo:true}),{activo:true});
});
