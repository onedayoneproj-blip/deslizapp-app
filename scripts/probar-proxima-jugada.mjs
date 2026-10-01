// Con la app compilada y corriendo: URL=http://localhost:3104 node scripts/probar-proxima-jugada.mjs
// Solo modo demo. Inspecciona href de WhatsApp; nunca abre ni envía el mensaje.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const require=createRequire(import.meta.url);
let playwright;
try { playwright=require('playwright'); } catch { playwright=require(join(execSync('npm root -g').toString().trim(),'playwright')); }
const { chromium }=playwright;
const base=(process.env.URL ?? 'http://localhost:3104').replace(/\/$/,'');
const browser=await chromium.launch();
try {
  for (const ancho of [360,390,430]) {
    const ctx=await browser.newContext({viewport:{width:ancho,height:844},isMobile:true,hasTouch:true, reducedMotion:ancho===430?'reduce':'no-preference'});
    await ctx.addInitScript(()=>{localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');});
    const page=await ctx.newPage();
    const errores=[]; page.on('pageerror',e=>errores.push(e.message));
    await page.goto(base+'/clientes');
    await page.getByRole('button',{name:/110 clientes:.*Ver detalle/}).waitFor();
    await page.getByRole('button',{name:/110 clientes:.*Ver detalle/}).click();
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    assert.match(await page.getByRole('button',{name:/Tu próxima jugada.*Ver tus jugadas/}).innerText(),/Ver tus jugadas/);
    await page.getByRole('button',{name:/Tu próxima jugada.*Ver tus jugadas/}).click();
    await page.getByRole('heading',{name:'Tu próxima jugada'}).waitFor();
    assert.equal(await page.locator('[role="dialog"]').count(),1);
    const nombres=['Volver a saludar','Segundo aaah','Gracias por volver','El primer hola'];
    for (const nombre of nombres) {
      const boton=page.getByRole('button',{name:new RegExp(`^${nombre}:.*Ver jugada$`)});
      assert.equal(await boton.count(),1,`tarjeta ${nombre} visible a ${ancho}px`);
      await boton.click();
      await page.getByRole('heading',{name:nombre}).waitFor();
      assert.equal(await page.locator('[role="dialog"]').count(),1);
      const imagen=page.locator('[role="dialog"] img[alt=""]');
      assert.ok(await imagen.count()>=1);
      const whats=page.locator('[role="dialog"] a[href^="https://wa.me/"]');
      if (await whats.count()) {
        const href=await whats.first().getAttribute('href');
        assert.match(href,/^https:\/\/wa\.me\/\d+\?text=/);
        assert.ok(decodeURIComponent(href).includes('Esencias Michel'));
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`sin overflow ${nombre} ${ancho}px`);
      await page.getByRole('button',{name:'Volver a Tu próxima jugada'}).click();
      await page.getByRole('heading',{name:'Tu próxima jugada'}).waitFor();
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`sin overflow galería ${ancho}px`);
    if (ancho===430) assert.equal(await page.locator('.jugada-resplandor-color').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.getByRole('button',{name:/^Volver a saludar:.*Ver jugada$/}).click();
    await page.goBack();
    await page.getByRole('heading',{name:'Tu próxima jugada'}).waitFor();
    await page.goBack();
    await page.getByRole('heading',{name:'Tus clientes'}).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"]').waitFor({state:'detached'});
    assert.equal(await page.locator('[role="dialog"]').count(),0);
    assert.deepEqual(errores,[]);
    console.log(`OK ${ancho}px: resumen, cuatro detalles, WhatsApp sin enviar, atrás, cierre, overflow${ancho===430?', movimiento reducido':''}`);
    await ctx.close();
  }
} finally { await browser.close(); }
