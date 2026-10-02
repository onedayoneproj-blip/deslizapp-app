// URL=http://127.0.0.1:3104 CHROMIUM_PATH=/usr/bin/chromium node scripts/probar-movimiento-jugada.mjs
// Solo demo local. Graba tiempo real; no acelera/pausa animaciones. Requiere Playwright y ffmpeg.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const base=process.env.URL??'http://127.0.0.1:3104';
const salida=process.env.VIDEOS??'/tmp/jugada-animaciones';
await mkdir(salida,{recursive:true});
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{});
const nombres=['Volver a saludar','Segundo aaah','Gracias por volver','El primer hola'];
const resultados=[];
async function contexto(ancho,reducido=false){
 const c=await browser.newContext({viewport:{width:ancho,height:844},hasTouch:true,isMobile:true,reducedMotion:reducido?'reduce':'no-preference',recordVideo:{dir:salida,size:{width:ancho,height:844}}});
 await c.addInitScript(()=>{
  localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');
  const vv=visualViewport; let teclado=false;
  Object.defineProperty(vv,'height',{get:()=>innerHeight-(teclado?336:0),configurable:true});
  window.__tecladoJugada=(v)=>{teclado=v;vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('scroll'));};
 });
 return c;
}
const resumen=async p=>{await p.goto(base+'/clientes');await p.getByRole('button',{name:/110 clientes:.*Ver detalle/}).click();await p.waitForTimeout(500);};
const principal=p=>p.getByRole('button',{name:/Tu próxima jugada.*Ver tus jugadas/});
const carta=(p,n)=>p.getByRole('button',{name:new RegExp(`^${n}:.*Ver jugada$`)});
async function pulso(p,accion){
 // Muestrea el ciclo renderizado completo: una medición a 140 ms depende de la carga del grabador.
 const muestras=p.evaluate(()=>new Promise(resolve=>{
  const estados=[];const inicio=performance.now();
  const frame=()=>{const el=[...document.querySelectorAll('.jugada-resplandor .jugada-luz-pulso')].at(-1);
   if(el) estados.push({opacidad:+getComputedStyle(el).opacity,animaciones:el.getAnimations().length});
   if(performance.now()-inicio<1000) requestAnimationFrame(frame);else resolve(estados);
  };requestAnimationFrame(frame);
 }));
 await accion();
 const estados=await muestras;
 assert.ok(estados.some(e=>e.opacidad>.2),`pulso perceptible: ${JSON.stringify(estados)}`);
 assert.ok(estados.every(e=>e.animaciones<=1),'un solo pulso');
 assert.equal(estados.at(-1).opacidad,0,'vuelve al estado habitual');
}
try {
 for(const ancho of (process.env.ANCHOS??"360,390,430").split(",").map(Number)){
  const c=await contexto(ancho);const inicioVideo=Date.now();const p=await c.newPage();const errores=[];p.on('pageerror',e=>errores.push(e.message));
  const clips=[];const ahora=()=> (Date.now()-inicioVideo)/1000;
  await resumen(p);
  async function ciclo(nombre){
   if(process.env.SOLO_RECORRIDO) return;
   const inicio=Date.now();const start=ahora();const muestras=[];
   for(let i=0;i<=8;i++){
    await p.waitForTimeout(Math.max(0,inicio+i*2000-Date.now()));
    const luz=p.locator('.jugada-luz').first();
    muestras.push(await luz.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),transform:getComputedStyle(el).transform,grano:getComputedStyle(el.querySelector('.jugada-luz-grano')).transform,colores:[...el.querySelectorAll('.jugada-luz-color')].map(e=>getComputedStyle(e).transform)})));
    await p.screenshot({path:`${salida}/${nombre}-${ancho}-${i}.png`});
   }
   for(const m of muestras){assert.equal(m.transform,'none');assert.equal(m.grano,'none');assert.equal(m.rect.top,muestras[0].rect.top);}
   assert.notDeepEqual(muestras[0].colores,muestras[2].colores,'movimiento real durante el ciclo');
   clips.push({nombre:`${nombre}-${ancho}`,start,duration:ahora()-start});
   console.log(`OK ${ancho}: dos ciclos reales de ${nombre}, recorte y grano fijos`);
  }
  await ciclo('tarjeta');
  await pulso(p,()=>principal(p).click());
  await ciclo('galeria');
  await pulso(p,()=>carta(p,nombres[0]).click());
  await ciclo('detalle');
  await p.getByRole('button',{name:'Volver a Tu próxima jugada'}).click();await p.waitForTimeout(200);
  await p.getByRole('button',{name:'Volver a Tus clientes'}).click();await p.waitForTimeout(300);
  const start=ahora();
  await pulso(p,()=>principal(p).click());
  for(const nombre of nombres){
   await pulso(p,()=>carta(p,nombre).click());
   assert.equal(await p.getByRole('heading',{name:nombre,exact:true}).count(),1);
   if(nombre===nombres[0]){
    await p.getByRole('dialog').getByRole('button',{name:'Ver más clientes',exact:true}).scrollIntoViewIfNeeded();await p.waitForTimeout(200);
    await pulso(p,()=>p.getByRole('dialog').getByRole('button',{name:'Ver más clientes',exact:true}).click());
    await p.locator('[data-hoja-contenido]').evaluate(el=>el.scrollTop=230);await p.waitForTimeout(300);
    assert.equal(await p.locator('.jugada-luz-pulso').evaluate(el=>el.getAnimations().length),0,'scroll no pulsa');
    assert.equal(await p.locator('.hoja-borde').evaluate(el=>getComputedStyle(el).zIndex),'20');
    await pulso(p,()=>p.getByRole('button',{name:/Escribir a .* por WhatsApp/}).first().click());
    const opciones=p.getByRole('group',{name:'Borradores de mensaje'}).getByRole('button');
    for(let i=0;i<3;i++) await pulso(p,()=>opciones.nth(i).click());
    // Los toques rápidos no crean una cola de pulsos ni remontan el editor.
    await opciones.nth(0).click();await opciones.nth(1).click();await opciones.nth(2).click();
    assert.equal(await p.locator('.jugada-luz-pulso').last().evaluate(el=>el.getAnimations().length),1);
    const campo=p.getByRole('textbox',{name:'Revisa y edita tu mensaje'});
    await campo.fill('Hola, revisando mi mensaje');
    await p.waitForTimeout(450);
    await campo.evaluate(el=>{window.__campoJugada=el;window.__hojaTop=el.closest('[role=dialog]').getBoundingClientRect().top;});
    for(let i=0;i<3;i++){
     await p.evaluate(()=>window.__tecladoJugada(true));await p.waitForTimeout(180);
     assert.ok(await campo.evaluate(el=>document.activeElement===el&&el===window.__campoJugada&&el.closest('[role=dialog]').getBoundingClientRect().top===window.__hojaTop));
     assert.ok(await campo.evaluate(el=>el.getBoundingClientRect().bottom<=visualViewport.height));
     await p.evaluate(()=>window.__tecladoJugada(false));await p.waitForTimeout(100);
    }
    assert.match(await p.getByRole('link',{name:'Abrir WhatsApp'}).getAttribute('href'),/Hola%2C%20revisando/);
    await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);
   }
   await p.getByRole('button',{name:'Volver a Tu próxima jugada'}).click();await p.waitForTimeout(250);
  }
  // Atrás durante el morph y Escape durante el barrido; sin esperas de producto.
  await p.getByRole('button',{name:'Volver a Tus clientes'}).click();await p.waitForTimeout(150);
  await principal(p).click();await p.waitForTimeout(100);await p.goBack();
  await p.getByRole('heading',{name:'Tus clientes',exact:true}).waitFor();
  await principal(p).click();await p.waitForTimeout(100);
  await carta(p,nombres[1]).click();await p.waitForTimeout(100);await p.keyboard.press('Escape');
  await p.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===0);
  await p.getByRole('button',{name:/110 clientes:.*Ver detalle/}).click();await p.waitForTimeout(450);
  await principal(p).click();await p.waitForTimeout(100);
  await p.getByRole('button',{name:'Volver a Tus clientes'}).click();
  await p.getByRole('heading',{name:'Tus clientes',exact:true}).waitFor();
  await principal(p).click();await p.waitForTimeout(100);
  await p.getByRole('button',{name:'Cerrar',exact:true}).click();
  await p.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  clips.push({nombre:`recorrido-${ancho}`,start,duration:ahora()-start});
  assert.deepEqual(errores,[]);
  const video=await p.video().path();await c.close();
  for(const clip of clips) execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(Math.max(0,clip.start-1)),'-i',video,'-t',String(clip.duration+1),'-an','-c:v','libx264','-crf','27','-preset','fast','-r','24','-pix_fmt','yuv420p','-movflags','+faststart',`${salida}/${clip.nombre}.mp4`]);
  resultados.push({ancho,clips,errores});
  console.log(`OK ${ancho}: pulsos, cuatro barridos, morph, atrás/Escape durante transición, teclado y toques rápidos`);
 }
 for(const ancho of [360,390,430]) {
 const c=await contexto(ancho,true);const p=await c.newPage();await resumen(p);await principal(p).click();await carta(p,nombres[0]).click();await p.getByRole('button',{name:/Escribir a .* por WhatsApp/}).first().click();await p.getByRole('button',{name:/Elegir borrador cercano/}).click();
 assert.equal(await p.locator('.jugada-velo').count(),0);
 assert.equal(await p.locator('.jugada-luz').evaluateAll(els=>els.flatMap(el=>el.getAnimations({subtree:true})).length),0);
 await p.waitForTimeout(1000);const videoReducido=await p.video().path();await c.close();execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',videoReducido,'-an','-c:v','libx264','-crf','27','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',`${salida}/reducido-${ancho}.mp4`]);console.log(`OK ${ancho} movimiento reducido: sin morph, barrido, pulso ni ciclos`);
 }
 await writeFile(`${salida}/resultados.json`,JSON.stringify(resultados,null,2));
} finally {await browser.close();}
