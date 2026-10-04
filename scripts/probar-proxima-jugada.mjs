// Con Tu próxima jugada ENCENDIDA (lib/funciones.ts: proximaJugada: true), la app compilada y corriendo:
//   URL=http://localhost:3000 node scripts/probar-proxima-jugada.mjs
// Apagada, la prueba es scripts/probar-proximamente.mjs.
// Solo modo demo (localStorage del navegador de prueba). Intercepta wa.me: nunca abre ni envía un mensaje.
// Recorre Tu próxima jugada a 360, 390 y 430 (430 con reducir movimiento): la tarjeta arriba de Tus clientes, la entrada a la
// galería, el barrido al elegir una jugada, "Escribirle a…" con saludo, código y productos, el envío (código personal + registro)
// y la lista con "Le escribiste hoy" al final.
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
const sinDesborde=(page)=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
/** Animaciones que no son infinitas y siguen corriendo (las de la entrada y el barrido). */
const finitas=(page)=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity).length);
const infinitas=(page)=>page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).length);

try {
  for (const ancho of [360,390,430]) {
    const reducido=ancho===430;
    const ctx=await browser.newContext({viewport:{width:ancho,height:844},isMobile:true,hasTouch:true,reducedMotion:reducido?'reduce':'no-preference'});
    await ctx.addInitScript(()=>{localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');});
    const page=await ctx.newPage();
    const errores=[]; page.on('pageerror',e=>errores.push(e.message));
    await page.goto(base+'/clientes');
    await page.getByRole('button',{name:/clientes:.*Ver detalle/}).click();
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    if(await page.getByRole('button',{name:/^Próximamente/}).count()) throw new Error('Tu próxima jugada está apagada (lib/funciones.ts). Enciéndela y compila, o usa scripts/probar-proximamente.mjs.');

    // La tarjeta va arriba, antes de la dona
    const tarjeta=page.getByRole('button',{name:/^Tu próxima jugada/});
    await tarjeta.waitFor();
    const arriba=await tarjeta.evaluate(el=>{const dona=document.querySelector('[role=dialog] svg circle');return !dona||el.getBoundingClientRect().top<dona.getBoundingClientRect().top;});
    assert.ok(arriba,`tarjeta arriba de la dona a ${ancho}px`);
    assert.ok(await sinDesborde(page),`sin desborde en Tus clientes a ${ancho}px`);
    if(reducido) assert.equal(await infinitas(page),0,'con reducir movimiento, la malla y el mazo quedan quietos');

    // Entrada a la galería: el vuelo termina y no deja nada encima
    await tarjeta.click();
    await page.getByRole('heading',{name:'Tu próxima jugada'}).waitFor();
    if(reducido) {
      assert.equal(await finitas(page),0,'sin entrada con reducir movimiento');
      assert.equal(await page.locator('.entrada-malla, [data-entrada-atras]').count(),0,'reducir movimiento: cambio directo, sin capas');
    }
    await page.waitForTimeout(2000);
    const cuadros=page.locator('[data-jugada-cuadro]');
    assert.equal(await cuadros.count(),4);
    assert.ok(await cuadros.first().evaluate(el=>getComputedStyle(el).opacity==='1'),'los cuadros quedan visibles tras la entrada');
    assert.equal(await finitas(page),0,'la entrada terminó');
    assert.equal(await page.locator('.entrada-malla, [data-entrada-atras], [data-cruce]').count(),0,'sin capas de la entrada al terminar');
    assert.ok(await page.locator('[data-jugada-cuadro] img').evaluateAll(i=>i.every(x=>x.complete&&x.naturalWidth>0)),'ilustraciones cargadas');
    assert.ok(await page.evaluate(()=>document.querySelectorAll('link[rel=preload][as=image][imagesrcset*="proxima-jugada"]').length>=4),'ilustraciones precargadas al abrir Tus clientes');

    // Barrido al elegir una jugada: termina sin restos
    await page.getByRole('button',{name:/^Segundo aaah:.*Ver jugada$/}).click();
    await page.getByRole('heading',{name:'Segundo aaah'}).waitFor();
    if(reducido) assert.equal(await page.locator('.barrido-franja').count(),0,'sin barrido con reducir movimiento');
    await page.waitForTimeout(2000);
    assert.equal(await page.locator('.barrido-franja').count(),0,'la franja se fue');
    assert.equal(await page.locator('[role=dialog] [inert]').count(),0,'la galería de atrás se fue');
    assert.equal(await page.locator('.barrido-nuevo, [data-cruce]').count(),0,'sin capas del barrido al terminar');
    assert.ok(await sinDesborde(page),`sin desborde en el detalle a ${ancho}px`);

    // Escribirle a…: las tres opciones
    const primera=page.getByRole('button',{name:/^Escribir a .* por WhatsApp sobre Segundo aaah/}).first();
    const quien=(await primera.getAttribute('aria-label')).match(/^Escribir a (.*) por WhatsApp/)[1];
    await primera.click();
    const hoja=page.getByRole('dialog').last();
    await hoja.getByRole('heading',{name:`Escribirle a ${quien.split(' ')[0]}`}).waitFor();
    assert.equal(await page.getByRole('dialog').count(),2);
    const modos=hoja.getByRole('radiogroup',{name:'¿Con qué te acercas?'}).getByRole('radio');
    assert.equal(await modos.count(),3);
    const alto=await modos.evaluateAll(b=>new Set(b.map(x=>Math.round(x.getBoundingClientRect().top))).size);
    assert.equal(alto,1,`las tres opciones en una fila a ${ancho}px`);
    assert.equal(await hoja.getByRole('radio',{name:'Un saludo'}).getAttribute('aria-checked'),'true');
    const vista=hoja.getByRole('figure',{name:/Vista previa del mensaje para/});
    assert.match(await vista.innerText(),/Gracias por tu primera compra/);
    // Saludo: Elige el mensaje
    await hoja.getByRole('button',{name:/Cambiar el mensaje/}).click();
    await page.getByRole('dialog').last().getByRole('radio',{name:/Directo/}).click();
    await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===2);
    assert.match(await vista.innerText(),/Si necesitas algo más/);
    // Código: propuesto, editable, y cambia con el porcentaje
    await hoja.getByRole('radio',{name:'Un código'}).click();
    const campo=hoja.getByRole('textbox',{name:'Código'});
    const propuesto=await campo.inputValue();
    assert.match(propuesto,/^[A-Z]{1,7}10(\d\d)?$/);
    await hoja.getByRole('button',{name:'Subir 5 %'}).click();
    assert.equal(await campo.inputValue(),propuesto.replace(/10(\d\d)?$/,'15'),'sin tocar el código, sigue al porcentaje');
    assert.match(await vista.innerText(),/15 % de descuento/);
    assert.match(await hoja.innerText(),/Un solo uso\. Solo vale en pedidos de/);
    // Productos: hasta 3, los demás se apagan
    await hoja.getByRole('radio',{name:'Productos'}).click();
    const casillas=hoja.getByRole('checkbox');
    for(let i=0;i<3;i++) await casillas.nth(i).click();
    assert.equal(await casillas.nth(3).getAttribute('aria-disabled'),'true');
    assert.equal((await vista.innerText()).match(/•/g)?.length,3);
    if(capturas) await page.screenshot({path:`${capturas}/escribirle-productos-${ancho}.png`});
    // Editar mensaje: se manda lo escrito
    await hoja.getByRole('button',{name:'Editar mensaje'}).click();
    await hoja.getByRole('textbox',{name:'Tu mensaje'}).fill('Hola, mensaje revisado');
    assert.match(await vista.innerText(),/Hola, mensaje revisado/);
    assert.ok(await sinDesborde(page),`sin desborde en Escribirle a… a ${ancho}px`);

    // Enviar con un código: crea el código personal, registra el envío y abre wa.me (interceptado)
    await hoja.getByRole('radio',{name:'Un código'}).click();
    let destino=null;
    await page.route('https://wa.me/**',r=>{destino=r.request().url();r.fulfill({status:200,contentType:'text/html',body:'<p>wa</p>'});});
    await hoja.getByRole('button',{name:/Enviar por WhatsApp/}).click();
    await page.waitForURL(/wa\.me/);
    const texto=new URL(destino).searchParams.get('text');
    assert.match(texto,/15 % de descuento .* con el código [A-Z0-9]{3,15}\. Vale por 14 días\./);
    // De vuelta: la persona pasa al final con "Le escribiste hoy"
    await page.goBack();
    await page.waitForURL(/\/clientes/);
    const guardado=await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>localStorage.getItem(k)?.includes('"jugadaEnvios"'));const d=JSON.parse(localStorage.getItem(k));return {envios:d.jugadaEnvios,personales:d.promos.filter(p=>p.clienteId)};});
    assert.equal(guardado.envios.length,1);
    assert.equal(guardado.envios[0].tipo,'codigo');
    assert.equal(guardado.personales.length,1);
    assert.equal(guardado.envios[0].promoId,guardado.personales[0].id);
    assert.equal(guardado.personales[0].limiteUsos,1);
    assert.match(texto,new RegExp(guardado.personales[0].codigo));

    await page.getByRole('button',{name:/clientes:.*Ver detalle/}).click();
    await page.getByRole('button',{name:/^Tu próxima jugada/}).click();
    await page.getByRole('button',{name:/^Segundo aaah:.*Ver jugada$/}).click();
    await page.getByRole('heading',{name:'Segundo aaah'}).waitFor();
    const lista=page.getByRole('list',{name:'Clientes para esta jugada'});
    assert.equal(await lista.getByText(quien,{exact:true}).count(),0,'ya no está entre los primeros 5');
    while(await lista.getByRole('button',{name:/^Ver \d+ más/}).count()) await lista.getByRole('button',{name:/^Ver \d+ más/}).click();
    const filas=await lista.locator('li').allInnerTexts();
    const ultima=filas.filter(f=>!/^Ver /.test(f)).at(-1);
    assert.match(ultima,new RegExp(`${quien}[\\s\\S]*Le escribiste hoy`),'al final, con Le escribiste hoy');

    await page.keyboard.press('Escape');
    assert.deepEqual(errores,[]);
    console.log(`OK ${ancho}px: tarjeta arriba, entrada, barrido, saludo/código/productos, envío con código y registro, orden por envío${reducido?', reducir movimiento':''}`);
    await ctx.close();
  }
  // Al volver de WhatsApp (la app queda abierta detrás): cierra la hoja y avisa. wa.me responde 204, así la página no se va.
  {
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');});
    const page=await ctx.newPage();
    await page.route('https://wa.me/**',r=>r.fulfill({status:204}));
    await page.goto(base+'/clientes');
    await page.getByRole('button',{name:/clientes:.*Ver detalle/}).click();
    await page.getByRole('button',{name:/^Tu próxima jugada/}).click();
    await page.getByRole('button',{name:/^Volver a saludar:.*Ver jugada$/}).click();
    await page.getByRole('button',{name:/^Escribir a .* por WhatsApp/}).first().click();
    const enviar=page.getByRole('dialog').last().getByRole('button',{name:/Enviar por WhatsApp/});
    await enviar.click();
    await page.waitForTimeout(800);
    assert.equal(await page.getByRole('dialog').count(),2,'mientras está en WhatsApp, la hoja sigue');
    await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
    await page.getByText('Listo. A ver qué dice.').waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);
    console.log('OK vuelta de WhatsApp: cierra la hoja y muestra el toast');
    await ctx.close();
  }
} finally { await browser.close(); }
