// Con la app compilada y corriendo: URL=http://localhost:3104 node scripts/probar-proxima-jugada.mjs
// Solo modo demo. Inspecciona href de WhatsApp; nunca abre ni envía el mensaje.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const require=createRequire(import.meta.url);
let playwright;
try { playwright=require('playwright'); } catch { playwright=require(join(execSync('npm root -g').toString().trim(),'playwright')); }
const { chromium }=playwright;
const base=(process.env.URL ?? 'http://localhost:3104').replace(/\/$/,'');
const capturas=process.env.CAPTURAS;
if(capturas) await mkdir(capturas,{recursive:true});
const esperarImagenes=page=>page.locator('[role="dialog"] img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
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
    const invitacion=page.getByRole('button',{name:/Tu próxima jugada.*Ver tus jugadas/});
    assert.match(await invitacion.innerText(),/Ver tus jugadas/);
    const separadas=await invitacion.evaluate(el=>{
      const texto=el.querySelector('[data-jugada-texto]').getBoundingClientRect();
      const baraja=el.querySelector('[data-jugada-baraja]').getBoundingClientRect();
      return texto.right<=baraja.left && texto.bottom<=el.getBoundingClientRect().bottom;
    });
    assert.ok(separadas,`texto y baraja separados a ${ancho}px`);
    await invitacion.scrollIntoViewIfNeeded();
    await esperarImagenes(page);
    if(capturas) await page.screenshot({path:`${capturas}/resumen-${ancho}.png`});
    await invitacion.click();
    await page.getByRole('heading',{name:'Tu próxima jugada'}).waitFor();
    assert.equal(await page.locator('[role="dialog"]').count(),1);
    const nombres=['Volver a saludar','Segundo aaah','Gracias por volver','El primer hola'];
    assert.equal(await page.locator('.jugada-tarjeta-degradado').count(),4);
    assert.equal(await page.locator('.jugada-tarjeta-degradado').first().evaluate(el=>getComputedStyle(el).backgroundImage.includes('linear-gradient')),true);
    assert.equal(await page.locator('[role="dialog"] button svg[aria-hidden="true"]').count()>=4,true);
    await esperarImagenes(page);
    if(capturas) await page.screenshot({path:`${capturas}/galeria-${ancho}.png`});
    for (const nombre of nombres) {
      const boton=page.getByRole('button',{name:new RegExp(`^${nombre}:.*Ver jugada$`)});
      assert.equal(await boton.count(),1,`tarjeta ${nombre} visible a ${ancho}px`);
      assert.equal(await boton.locator('svg[aria-hidden="true"]').count(),1,`chevron decorativo de ${nombre}`);
      await boton.click();
      await page.getByRole('heading',{name:nombre}).waitFor();
      const brillo=await page.locator('.jugada-resplandor').evaluate(el=>{
        const r=el.getBoundingClientRect();
        return {visible:r.top<innerHeight&&r.bottom>innerHeight-40,detenido:getComputedStyle(el).pointerEvents==='none'};
      });
      assert.ok(brillo.visible&&brillo.detenido,`brillo visible y sin capturar toques al abrir ${nombre} a ${ancho}px`);
      assert.equal(await page.locator('[role="dialog"]').count(),1);
      if(nombre===nombres[0]) { await esperarImagenes(page); if(capturas) await page.screenshot({path:`${capturas}/detalle-${ancho}.png`}); }
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
    const animacion=await page.locator('.jugada-resplandor-color').evaluate(el=>getComputedStyle(el).animationName);
    assert.equal(animacion,ancho===430?'none':'jugada-aurora');
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
  // Aísla un cambio de datos en un contexto demo nuevo; ninguna tienda real participa.
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');});
  const page=await ctx.newPage();
  const id='a4000000-0000-4000-8000-000000000105'; // Ángel Lantigua: sin compra, visible en el primer tramo
  await page.goto(`${base}/clientes/${id}`);
  await page.getByRole('button',{name:'Editar datos'}).click();
  await page.getByRole('textbox',{name:/WhatsApp/}).fill('');
  await page.getByRole('button',{name:'Guardar cambios'}).click();
  await page.getByText('Sin WhatsApp · Del catálogo').waitFor();
  await page.goto(`${base}/clientes`);
  await page.getByRole('button',{name:/110 clientes:.*Ver detalle/}).click();
  await page.getByRole('button',{name:/Tu próxima jugada.*Ver tus jugadas/}).click();
  await page.getByRole('button',{name:/^El primer hola:.*Ver jugada$/}).click();
  const sinTelefono=page.locator('[role="dialog"] li').filter({hasText:'Ángel Lantigua'});
  assert.equal(await sinTelefono.count(),1);
  if(capturas) await page.screenshot({path:`${capturas}/sin-whatsapp-390.png`});
  await sinTelefono.getByRole('button',{name:/Sin WhatsApp.*Ver datos/}).click();
  await page.waitForURL(`${base}/clientes/${id}`);
  await page.getByRole('heading',{name:'Ángel Lantigua'}).waitFor();
  assert.equal(await page.locator('[role="dialog"]').count(),1);
  if(capturas) await page.screenshot({path:`${capturas}/sin-whatsapp-datos-390.png`});
  console.log('OK Sin WhatsApp: cuenta incluida, botón visible y ficha correcta en demo aislada');
  await ctx.close();
} finally { await browser.close(); }
