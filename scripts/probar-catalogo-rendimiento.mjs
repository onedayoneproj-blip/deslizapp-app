// Solo catálogo público y lecturas; nunca abre solicitudes ni escribe RPC.
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { navegador, URL } from './navegador-catalogo.mjs';
const salida=process.env.CAPTURAS??'/tmp/catalogo-perf/visual';mkdirSync(salida,{recursive:true});
const b=await navegador(), resultados=[];
try {
 for(const ancho of [360,390,430]){
  const ctx=await b.newContext({viewport:{width:ancho,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.addInitScript(()=>{if(location.protocol.startsWith('http'))localStorage.setItem('dz-coach-esencias-michel','1');});
  const p=await ctx.newPage(), errores=[], escrituras=[];
  p.on('pageerror',e=>errores.push(e.message));
  await p.route('**/rest/v1/rpc/**',r=>{if(r.request().method()==='POST'&&!r.request().url().endsWith('/catalogo_publico')){escrituras.push(r.request().url());return r.abort();}return r.continue();});
  for(const hash of ['', '#p/mayar']){
   await p.goto('about:blank');
   await p.goto(URL+'/tienda/esencias-michel'+hash);
   await p.waitForFunction(()=>{const r=document.querySelector('.reel.on'), i=r?.querySelector('.medio img');return i?.complete&&i.naturalWidth>1&&Object.keys(r.querySelector('.mas')??{}).some(k=>k.startsWith('__reactProps$'));});
   await p.locator('.reel.on .medio img').first().evaluate(i=>i.decode());await p.waitForTimeout(650);
   const dato=await p.evaluate(()=>({id:document.querySelector('.reel.on').id,src:document.querySelector('.reel.on .medio img').currentSrc,natural:document.querySelector('.reel.on .medio img').naturalWidth,overflow:document.documentElement.scrollWidth>innerWidth,tinte:getComputedStyle(document.querySelector('.catalogo-publico')).getPropertyValue('--tint'),videos:[...document.querySelectorAll('video')].filter(v=>v.currentSrc).length}));
   assert.equal(dato.overflow,false);assert.ok(dato.src.includes('/_next/image?'));assert.ok(Number(new globalThis.URL(dato.src).searchParams.get("w"))>=ancho*3);assert.equal(dato.videos,0);
   if(hash)assert.equal(dato.id,'r-mayar');
   assert.deepEqual(errores,[]);assert.deepEqual(escrituras,[]);
   await p.screenshot({path:salida+'/'+ancho+(hash?'-mayar':'-primero')+'.png'});
   resultados.push({ancho,dpr:3,hash,...dato,errores,escrituras});console.log('✓',ancho,hash||'inicio',dato.id,dato.natural,dato.tinte);
  }
  await ctx.close();
 }
} finally {writeFileSync(salida+'/resultados.json',JSON.stringify(resultados,null,2)+'\n');await b.close();}
