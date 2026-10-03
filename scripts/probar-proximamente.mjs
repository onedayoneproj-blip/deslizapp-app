// Con Tu próxima jugada APAGADA (lib/funciones.ts: proximaJugada: false, como va a producción), la app compilada y corriendo:
//   URL=http://localhost:3000 node scripts/probar-proximamente.mjs
// Solo modo demo. A 360, 390 y 430 (430 con reducir movimiento), en claro y en oscuro:
// (a) en Tus clientes, arriba de la dona, va la tarjeta Próximamente (sin mazo ni nada de la jugada);
// (b) se abre su hoja y "Listo, a esperar" la cierra;
// (c) nada de la jugada se pide ni se monta (ni galería, ni ilustraciones de las cartas, ni envíos, ni códigos);
// (d) la dona, la leyenda y los cuadros funcionan igual.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const require=createRequire(import.meta.url);
let playwright;
try { playwright=require('playwright'); } catch { playwright=require(join(execSync('npm root -g').toString().trim(),'playwright')); }
const { chromium }=playwright;
const base=(process.env.URL ?? 'http://localhost:3000').replace(/\/$/,'');
const capturas=process.env.CAPTURAS;
if(capturas) await mkdir(capturas,{recursive:true});
const browser=await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']} : {});
// Lo que no se debe pedir con la función apagada: la base (jugadas) y las ilustraciones de las cartas que solo usa la galería.
const PROHIBIDO=/jugada_envios|crear_codigo_cliente|registrar_envio_jugada|segundo-aaah|gracias-por-volver|primer-hola/;
try {
  for (const ancho of [360,390,430]) for (const tema of ['claro','oscuro']) {
    const reducido=ancho===430;
    const ctx=await browser.newContext({viewport:{width:ancho,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:reducido?'reduce':'no-preference'});
    await ctx.addInitScript((oscuro)=>{
      localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');
      if(oscuro) document.addEventListener('DOMContentLoaded',()=>document.documentElement.setAttribute('data-theme','dark'));
    },tema==='oscuro');
    const page=await ctx.newPage();
    const errores=[]; page.on('pageerror',e=>errores.push(e.message));
    const pedidos=[]; page.on('request',r=>{ if(PROHIBIDO.test(r.url())) pedidos.push(r.url()); });
    await page.goto(base+'/clientes');
    await page.getByRole('button',{name:/clientes:.*Ver detalle/}).click();
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    await page.waitForTimeout(400); // que la hoja termine de subir antes de medir

    // (a) La tarjeta Próximamente, arriba de la dona, sin nada de la jugada
    const tarjeta=page.getByRole('button',{name:/^Próximamente: Tu próxima jugada/});
    await tarjeta.waitFor();
    const texto=await tarjeta.innerText();
    for (const t of ['Próximamente','Tu próxima jugada','Algo se está cocinando','Pronto te diré a quién escribirle hoy.']) assert.ok(texto.includes(t),`la tarjeta dice "${t}"`);
    assert.equal(await page.getByRole('button',{name:/Ver tus jugadas/}).count(),0,'sin la tarjeta viva');
    assert.equal(await page.locator('[data-carta], .mazo, [data-jugada-cuadro]').count(),0,'sin mazo ni galería');
    const caja=await tarjeta.boundingBox();
    assert.ok(caja.height>=184,'mismo alto mínimo que la tarjeta viva');
    const arriba=await tarjeta.evaluate(el=>{const dona=document.querySelector('[role=dialog] svg circle');return !dona||el.getBoundingClientRect().bottom<=dona.getBoundingClientRect().top;});
    assert.ok(arriba,'arriba de la dona');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`sin desborde a ${ancho}px`);
    const corriendo=await tarjeta.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
    if(reducido) assert.equal(corriendo,0,'con reducir movimiento la malla queda quieta');
    else {
      assert.ok(corriendo>0,'la malla se mueve');
      const lenta=await tarjeta.locator('.malla-mancha-rosa').evaluate(el=>getComputedStyle(el).animationDuration);
      assert.equal(lenta,'15s','la malla va más lenta');
    }
    if(capturas) await page.screenshot({path:`${capturas}/tarjeta-${tema}-${ancho}.png`});

    // (b) La hoja se abre y "Listo, a esperar" la cierra
    await tarjeta.click();
    const hoja=page.getByRole('dialog',{name:'Tu próxima jugada'});
    await hoja.waitFor();
    const enHoja=await hoja.innerText();
    for (const t of ['Muy pronto','Tu próxima jugada','Estamos afinando algo que te va a encantar. Cada día te va a decir a quién escribirle y qué decirle para que esa venta no se enfríe. Ya casi, ya casi.','Mientras tanto, sigue vendiendo. Aquí te aviso cuando esté lista.']) assert.ok(enHoja.includes(t),`la hoja dice "${t}"`);
    assert.equal(await hoja.getByRole('button').filter({hasNotText:/^$/}).count()>=1,true);
    assert.equal(await hoja.locator('input, textarea').count(),0,'no pide datos');
    await page.waitForTimeout(500);
    if(capturas) await page.screenshot({path:`${capturas}/hoja-${tema}-${ancho}.png`});
    await hoja.getByRole('button',{name:'Listo, a esperar'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();

    // (d) La dona, la leyenda y los cuadros siguen igual
    await page.getByRole('dialog').getByRole('button',{name:/^Repiten/}).click();
    await page.getByRole('heading',{name:/^Repiten/}).waitFor();
    await page.getByRole('button',{name:'Volver a Tus clientes'}).click();
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    await page.getByRole('dialog').getByRole('button',{name:/^Dormidos/}).click();
    await page.locator('[role=dialog]').waitFor({state:'detached'});
    assert.match(page.url(),/\/clientes/);

    // (c) Nada de la jugada se pidió ni quedó en el historial
    assert.deepEqual(pedidos,[],'ninguna llamada de jugadas');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('link[rel=preload][imagesrcset*="proxima-jugada"]').length),0,'sin precarga de ilustraciones');
    assert.deepEqual(errores,[]);
    console.log(`OK ${ancho}px ${tema}: tarjeta Próximamente arriba, hoja abre y cierra, sin llamadas de jugadas, dona y cuadros${reducido?', reducir movimiento':''}`);
    await ctx.close();
  }
  // Ninguna puerta trasera: el historial no lleva a la galería aunque alguien empuje el estado a mano
  {
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');});
    const page=await ctx.newPage();
    await page.goto(base+'/clientes');
    await page.getByRole('button',{name:/clientes:.*Ver detalle/}).click();
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    await page.evaluate(()=>{history.pushState({...history.state,deslizappJugada:'galeria'},'');history.pushState({...history.state,deslizappJugada:'segundo'},'');history.back();});
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-jugada-cuadro]').count(),0,'el historial no abre la galería');
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    console.log('OK sin puertas traseras por el historial');
    await ctx.close();
  }
} finally { await browser.close(); }
