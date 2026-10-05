import './cargar-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {crearFuenteSupabase}=await import('../lib/data/supabase.ts');
test('avisos reales: una lectura por tienda, pendiente null, caché e invalidación; transporte simulado',async()=>{
 const calls=[];let lecturas=0,version=0,fallo=false;
 const row={id:'a',tienda_id:'t',producto_id:'p',variante_id:'v',telefono:'18095550142',nombre:'Fixture',creado_en:'2026-10-05T10:00:00Z',avisado_en:null};
 const q={select:()=>q,eq:(k,v)=>{calls.push(['eq',k,v]);return q;},is:(k,v)=>{calls.push(['is',k,v]);return q;},order:()=>q,then:resolve=>resolve({data:[row],error:null})};
 const real=crearFuenteSupabase({from:table=>{assert.equal(table,'avisos_llegada');lecturas++;return q;},rpc:async(name,args)=>{assert.equal(name,'marcar_avisado');assert.deepEqual(args,{p_aviso_ids:['a']});return fallo?{data:null,error:{message:'Sin red',code:'XX000'}}:{data:1,error:null};}},()=>version++);
 const [a,b]=await Promise.all([real.avisosPendientes('t'),real.avisosPendientes('t')]);
 assert.equal(lecturas,1);assert.deepEqual(a,b);assert.deepEqual(calls,[['eq','tienda_id','t'],['is','avisado_en',null]]);assert.equal(a[0].varianteId,'v');
 fallo=true;await assert.rejects(()=>real.marcarAvisado('t',['a']));assert.equal(version,0);
 fallo=false;assert.equal(await real.marcarAvisado('t',['a']),1);assert.equal(version,1);
 await real.avisosPendientes('t');assert.equal(lecturas,2);await real.avisosPendientes('otra');assert.equal(lecturas,3);assert.deepEqual(calls.at(-2),['eq','tienda_id','otra']);
});
