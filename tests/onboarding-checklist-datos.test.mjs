import './cargar-ts.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const memoria=new Map();globalThis.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v),removeItem:k=>memoria.delete(k)};
const {construirDesdeSeed}=await import('../lib/data/db.ts');
const {conPermisosDeLaDemo}=await import('../lib/data/equipo-demo.ts');
const {fuenteDemo}=await import('../lib/data/demo.ts');
const {crearFuenteSupabase}=await import('../lib/data/supabase.ts');
const {soloMirar, SoloMirar}=await import('../lib/data/solo-mirar.ts');
test('demo persiste marca una sola vez y solo modifica la tienda elegida',async()=>{
 const db=construirDesdeSeed();memoria.set('deslizapp-demo-v5',JSON.stringify(db));const id=db.tiendas[0].id;
 await fuenteDemo.marcarOnboarding(id,'pantalla_inicio_en');const primero=await fuenteDemo.getTienda(id);
 await fuenteDemo.marcarOnboarding(id,'pantalla_inicio_en');assert.equal((await fuenteDemo.getTienda(id)).onboarding.pantalla_inicio_en,primero.onboarding.pantalla_inicio_en);
 const result=JSON.parse(memoria.get('deslizapp-demo-v5'));assert.deepEqual(result.tiendas.slice(1),db.tiendas.slice(1));
 for(const k of ['productos','pedidos','abonos','eventosAaah'])assert.deepEqual(result[k],db[k]);
 await assert.rejects(()=>fuenteDemo.marcarOnboarding('otra','pantalla_inicio_en'),/tienda/);
});
test('colaboradora no puede marcar onboarding y Ver como bloquea ambos métodos nuevos',async()=>{
 let llamadas=0;const source={marcarOnboarding:async()=>{llamadas++},guardarPerfilCatalogo:async()=>{llamadas++}};
 const staff=conPermisosDeLaDemo(source,()=>({nivelDemo:'administrador'}));await assert.rejects(()=>staff.marcarOnboarding('id','equipo_omitido_en'),/administra/);assert.equal(llamadas,0);
 const mirando=soloMirar(source,{id:'s',tiendaId:'id',venceEn:new Date(Date.now()+60000).toISOString()});
 await assert.rejects(()=>mirando.marcarOnboarding('id','equipo_omitido_en'),SoloMirar);await assert.rejects(()=>mirando.guardarPerfilCatalogo('id','Hola',''),SoloMirar);assert.equal(llamadas,0);
});
test('RPC existente: argumentos exactos, invalidación solo al confirmar; error no aparenta guardado',async()=>{
 let version=0;let fallo=true;const calls=[];
 const fuente=crearFuenteSupabase({rpc:async(n,a)=>{calls.push([n,a]);return fallo?{data:null,error:{message:'sin_sesion',code:'42501'}}:{data:{pantalla_inicio_en:'fecha'},error:null}}},()=>version++);
 await assert.rejects(()=>fuente.marcarOnboarding('t','pantalla_inicio_en'));assert.equal(version,0);
 fallo=false;await fuente.marcarOnboarding('t','pantalla_inicio_en');assert.equal(version,1);assert.deepEqual(calls[1],['marcar_onboarding',{p_tienda_id:'t',p_clave:'pantalla_inicio_en'}]);
});
