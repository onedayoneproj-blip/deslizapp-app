// Pestañas del feed según colecciones y catálogos, hoja «Catálogos», estado vacío de Colecciones y cabecera del perfil con
// desenfoque progresivo. Solo fixtures Demo locales (Lino & Algodón modificada): no usa Supabase ni datos reales.
// Con la app corriendo: URL=http://localhost:3220 node scripts/probar-catalogo-cabecera.mjs
import '../tests/cargar-ts.mjs';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {navegador, URL} from './navegador-catalogo.mjs';
const {construirDesdeSeed}=await import('../lib/data/db.ts');
const OUT=process.env.CAPTURAS??'docs/capturas/catalogo-cabecera';mkdirSync(OUT,{recursive:true});
const browser=await navegador();let checks=0;
const ok=(value,label)=>{assert(value,label);checks++;console.log('OK',label)};
const espera=(page,ms)=>page.waitForTimeout(ms);

/** Lino & Algodón (ropa + accesorios, colecciones por categoría) con el cambio que pide cada caso. */
const CASOS={
  'varias-colecciones':()=>{},
  'una-coleccion':(t,ps)=>{t.rubros=['ropa'];ps.forEach(p=>{p.rubro=null;p.categoria='Camisas'})},
  'sin-pestanas':(t,ps)=>{t.rubros=['ropa'];ps.forEach(p=>{p.rubro=null;p.categoria=null})},
  'catalogos':(t,ps)=>{ps.forEach(p=>{p.categoria=null})},
  'colecciones-en-otro':(t,ps)=>{ps.filter(p=>p.rubro==='accesorios').forEach(p=>{p.categoria=null})},
};
async function abrir(width,caso){
  const db=construirDesdeSeed();const t=db.tiendas.find(t=>t.slug==='lino-y-algodon');const ps=db.productos.filter(p=>p.tiendaId===t.id);
  CASOS[caso](t,ps);
  const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  await ctx.addInitScript(({db})=>{localStorage.setItem('deslizapp-demo-v5',JSON.stringify(db));for(const s of ['lino-y-algodon','esencias-michel'])localStorage.setItem('dz-coach-'+s,'1');localStorage.setItem('deslizapp-version-vista','9.9.9');},{db});
  const page=await ctx.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL+'/tienda/lino-y-algodon?demo');await page.locator('#reels .reel.on').waitFor();await espera(page,400);
  return {ctx,page,errors};
}
const centrado=(page,sel)=>page.locator(sel).evaluate(e=>{const r=e.getBoundingClientRect();const n=e.closest('.htabs').getBoundingClientRect();return {centro:r.left+r.width/2,nav:n.left+n.width/2}});

try{
  for(const width of [360,390,430]){
    // Varias colecciones: «Novedades · Colecciones» con el abanico de tres.
    {
      const {ctx,page,errors}=await abrir(width,'varias-colecciones');
      ok(await page.locator('.htabs .htab').count()===2&&await page.locator('#colTab[data-tab="col"]').count()===1,`${width}: con colecciones, «Novedades · Colecciones»`);
      ok(await page.locator('#colTab .hcov').getAttribute('data-n')==='3',`${width}: abanico de tres carátulas`);
      await page.screenshot({path:`${OUT}/${width}-colecciones.png`});
      ok(errors.length===0,`${width}: sin errores (colecciones)`);await ctx.close();
    }
    // Una colección: el abanico mide una carta, sin hueco.
    {
      const {ctx,page,errors}=await abrir(width,'una-coleccion');
      const hcov=page.locator('#colTab .hcov');
      ok(await hcov.getAttribute('data-n')==='1'&&Math.round((await hcov.boundingBox()).width)===26,`${width}: una colección, abanico de una carta (26 px)`);
      const img=await hcov.locator('img').boundingBox(),caja=await hcov.boundingBox();
      ok(img.x>=caja.x-1&&img.x+img.width<=caja.x+caja.width+1,`${width}: la carta queda dentro del abanico`);
      ok(errors.length===0,`${width}: sin errores (una colección)`);await ctx.close();
    }
    // Un solo catálogo y sin colecciones: sin pestañas.
    {
      const {ctx,page,errors}=await abrir(width,'sin-pestanas');
      ok(await page.locator('.htabs').count()===0&&await page.locator('#colTab').count()===0,`${width}: un catálogo sin colecciones, sin pestañas`);
      ok(await page.locator('#reels .reel.on').count()===1,`${width}: el feed funciona sin pestañas`);
      await page.screenshot({path:`${OUT}/${width}-sin-pestanas.png`});
      ok(errors.length===0,`${width}: sin errores (sin pestañas)`);await ctx.close();
    }
    // Varios catálogos sin colecciones: «Novedades · Catálogos» y su hoja.
    {
      const {ctx,page,errors}=await abrir(width,'catalogos');
      const tab=page.locator('#colTab[data-tab="cat"]');
      ok(await tab.count()===1&&(await tab.innerText()).trim()==='Catálogos',`${width}: varios catálogos sin colecciones, «Novedades · Catálogos»`);
      const c=await centrado(page,'.htabs');ok(Math.abs(c.centro-c.nav)<2,`${width}: pestañas centradas`);
      const idx0=await page.evaluate(()=>navigation.currentEntry.index);
      await tab.click();const hoja=page.getByRole('dialog',{name:'Catálogos'});await hoja.waitFor();await espera(page,400);
      const items=hoja.locator('.coitem');
      ok(await items.count()===3,`${width}: la hoja lista «Todo» y los dos catálogos`);
      const nombres=(await hoja.locator('.coitem b').allInnerTexts()).map(x=>x.trim());console.log('   ',nombres.join(' · '));ok(nombres[0]==='Todo'&&nombres.length===3&&nombres.every(Boolean),`${width}: con sus nombres`);
      ok(await items.first().getAttribute('aria-pressed')==='true',`${width}: marca el catálogo activo`);
      ok(await items.evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)),`${width}: filas fáciles de tocar`);
      await page.screenshot({path:`${OUT}/${width}-hoja-catalogos.png`});
      // «Atrás» cierra la hoja sin cambiar nada.
      await page.goBack({waitUntil:'commit'}).catch(()=>{});await hoja.waitFor({state:'detached'});
      ok(await page.evaluate(()=>navigation.currentEntry.index)===idx0&&(await tab.innerText()).trim()==='Catálogos',`${width}: «atrás» cierra la hoja de catálogos`);
      // Elegir un catálogo lo cambia y cierra la hoja (consume su entrada).
      await tab.click();await hoja.waitFor();await espera(page,300);
      await hoja.locator('.coitem').nth(2).click();await hoja.waitFor({state:'detached'});await espera(page,500);
      const nombre=(await tab.innerText()).trim();
      ok(nombre!=='Catálogos'&&await tab.getAttribute('aria-pressed')==='true',`${width}: elegir un catálogo lo cambia («${nombre}»)`);
      ok(await page.evaluate(()=>navigation.currentEntry.index)===idx0,`${width}: elegir consume la entrada de la hoja`);
      ok(await page.locator('#reels .reel[data-id]:not(.fin)').count()<(await page.evaluate(()=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')).productos.filter(p=>p.slug).length)),`${width}: el feed muestra solo ese catálogo`);
      // «Novedades» vuelve a «Todo».
      await page.locator('.htab[data-tab="new"]').click();await espera(page,400);
      ok((await tab.innerText()).trim()==='Catálogos'&&await page.locator('.htab[data-tab="new"]').getAttribute('aria-pressed')==='true',`${width}: «Novedades» vuelve a todo`);
      ok(errors.length===0,`${width}: sin errores (catálogos)`);await ctx.close();
    }
    // Colecciones solo en otro catálogo: estado vacío en la hoja y abanico sin hueco.
    {
      const {ctx,page,errors}=await abrir(width,'colecciones-en-otro');
      await page.locator('#colTab').click();const hoja=page.getByRole('dialog',{name:'Colecciones'});await hoja.waitFor();await espera(page,300);
      ok(await hoja.locator('.co-vacio').count()===0,`${width}: con colecciones en el catálogo activo no hay estado vacío`);
      await hoja.locator('.mc-fila').click();await page.getByRole('menuitemradio',{name:'Accesorios'}).click();await espera(page,400);
      ok((await hoja.locator('.co-vacio').innerText()).includes('todavía no tiene colecciones')&&await hoja.locator('.coitem').count()===0,`${width}: catálogo sin colecciones, estado vacío claro`);
      await page.screenshot({path:`${OUT}/${width}-colecciones-vacio.png`});
      await page.keyboard.press('Escape');await hoja.waitFor({state:'detached'});
      ok(await page.locator('#colTab .hcov').count()===0,`${width}: sin colecciones en el activo, el abanico no reserva espacio`);
      ok(errors.length===0,`${width}: sin errores (vacío)`);await ctx.close();
    }
    // Perfil: cabecera con desenfoque progresivo (4 capas) y velo del fondo de la tienda.
    {
      const {ctx,page,errors}=await abrir(width,'varias-colecciones');
      await page.locator('.reel.on .who').click();await page.locator('.catalogo-publico.view-grid').waitFor();
      await page.evaluate(()=>window.scrollTo(0,400));await espera(page,300);
      const capas=await page.locator('.hdr-borde').evaluate(e=>[getComputedStyle(e).display,...[...e.children].map(c=>getComputedStyle(c).backdropFilter||getComputedStyle(c).webkitBackdropFilter)]);
      ok(capas[0]==='block'&&capas.slice(1,5).join(',')==='blur(1px),blur(2px),blur(4px),blur(8px)',`${width}: perfil con desenfoque de 1, 2, 4 y 8 px`);
      const velo=await page.locator('.hdr-borde-color').evaluate(e=>getComputedStyle(e).backgroundImage);
      ok(/gradient/.test(velo),`${width}: velo del fondo de la tienda`);
      ok(await page.locator('.hdr-borde').evaluate(e=>getComputedStyle(e).pointerEvents==='none'),`${width}: el desenfoque no tapa toques`);
      await page.screenshot({path:`${OUT}/${width}-perfil.png`});
      ok(errors.length===0,`${width}: sin errores (perfil)`);await ctx.close();
    }
  }
}finally{await browser.close();}
console.log(`${checks} comprobaciones aprobadas`);
