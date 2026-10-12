// Pestañas del feed según colecciones y catálogos, hoja «Catálogos», estado vacío de Colecciones y cabecera flotante del perfil. Solo fixtures Demo locales (Lino & Algodón modificada): no usa Supabase ni datos reales.
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
      // Desde el final del feed, elegir un catálogo lleva a su primer producto.
      await page.locator('#reels .reel.fin').evaluate(e=>e.scrollIntoView({block:'start'}));await page.locator('#reels .reel.fin.on').waitFor();await espera(page,300);
      await tab.click();await hoja.waitFor();await espera(page,300);
      await hoja.locator('.coitem').nth(1).click();await hoja.waitFor({state:'detached'});await espera(page,700);
      ok(await page.locator('#reels .reel.fin.on').count()===0&&await page.locator('#reels .reel.on[data-id]').count()===1,`${width}: desde el final, elegir un catálogo lleva a su primer producto`);
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
    // Perfil: la cabecera con el nombre se va con el scroll; «atrás» e Instagram son botones flotantes que no tocan el borde.
    {
      const {ctx,page,errors}=await abrir(width,'varias-colecciones');
      
      await page.locator('.reel.on .who').click();await page.locator('.catalogo-publico.view-grid').waitFor();await espera(page,500);
      await page.screenshot({path:`${OUT}/${width}-perfil.png`});
      const caja=sel=>page.locator(sel).evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,w:r.width,h:r.height}});
      const back0=await caja('#backBtn');
      const logo0=await caja('.hdr .logo');
      ok(logo0.w>0&&logo0.top>=20,`${width}: el nombre de la tienda sigue en la cabecera, separado del borde (${Math.round(logo0.top)} px)`);
      ok(await page.getByRole('heading',{level:1}).count()===1&&(await page.getByRole('heading',{level:1}).innerText()).trim()==='Lino & Algodón',`${width}: un solo h1; sin Instagram muestra el nombre`);
      ok(await page.locator('.profile').evaluate(e=>e.getBoundingClientRect().top)<1&&await page.locator('.profile .bigav').evaluate(e=>e.getBoundingClientRect().top)>=back0.top+back0.h,`${width}: el avatar queda debajo de la cabecera y de los botones, sin hueco raro`);
      ok(await page.locator('.hdr').evaluate(e=>getComputedStyle(e).position==='absolute'),`${width}: la cabecera del perfil no es fija`);
      ok(back0.w>=44&&back0.h>=44,`${width}: «atrás» mide al menos 44 px`);
      ok(await page.locator('#backBtn').evaluate(e=>{const c=getComputedStyle(e);return c.backgroundColor==='rgb(255, 255, 255)'&&(c.backdropFilter||'none')==='none'&&c.boxShadow!=='none'&&c.borderRadius==='50%'}),`${width}: «atrás» es un círculo claro sólido, sin cristal y con sombra`);
      ok(await page.locator('.profile').evaluate((e,t)=>Math.abs(parseFloat(getComputedStyle(e).paddingTop)-(t+66))<1,back0.top),`${width}: el contenido del perfil empieza 66 px bajo los botones (sigue su separación, también con zona segura)`);
      await page.evaluate(()=>window.scrollTo(0,400));await espera(page,300);
      await page.screenshot({path:`${OUT}/${width}-perfil-deslizado.png`});
      const back1=await caja('#backBtn');
      ok((await caja('.hdr .logo')).top+(await caja('.hdr .logo')).h<0,`${width}: el nombre de la cabecera se va con el scroll`);
      ok(await page.locator('.pname').evaluate(e=>e.getBoundingClientRect().bottom<0),`${width}: el título del perfil se va con el scroll`);
      ok(Math.abs(back1.top-back0.top)<1,`${width}: «atrás» queda fijo`);
      // Nada fijo con fondo, desenfoque o contenido empieza en y=0 (Safari iOS 26 tiñe la barra de estado).
      const fijos=await page.evaluate(()=>[...document.querySelectorAll('.catalogo-publico *')].filter(e=>{const c=getComputedStyle(e);if(c.position!=='fixed'||c.display==='none'||c.visibility==='hidden'||e.hidden)return false;const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;return c.backgroundColor!=='rgba(0, 0, 0, 0)'||c.backgroundImage!=='none'||(c.backdropFilter&&c.backdropFilter!=='none')||e.children.length>0||e.textContent.trim()!==''}).map(e=>({s:e.id||e.className,t:e.getBoundingClientRect().top})));
      console.log('   fijos:',JSON.stringify(fijos));
      ok(fijos.every(f=>f.t>0.5),`${width}: ningún elemento fijo toca el borde de arriba`);
      ok(back1.top>=8,`${width}: «atrás» separado del borde (${back1.top}px)`);
      // Las pestañas «Todo · Ropa…» no pasan bajo los botones flotantes: su primera y última pestaña quedan entre ellos.
      const pest=await page.evaluate(()=>{const t=[...document.querySelectorAll('.gt-tab > span')];if(!t.length)return null;const a=t[0].getBoundingClientRect(),z=t[t.length-1].getBoundingClientRect(),b=document.querySelector('#backBtn').getBoundingClientRect();return {izq:a.left,der:z.right,backDer:b.right,ancho:innerWidth}});
      if(pest){ok(pest.izq>=pest.backDer+8,`${width}: la primera pestaña queda a la derecha de «atrás» (${Math.round(pest.izq)} ≥ ${Math.round(pest.backDer)+8})`);ok(pest.der<=pest.ancho-68||await page.locator('.gridtabs-tabs').evaluate(e=>e.scrollWidth>e.clientWidth),`${width}: la última pestaña no queda bajo el botón de la derecha o se desliza`);}
      const ig=page.locator('#igBtn');
      if(await ig.count()){const i=await caja('#igBtn');ok(i.w>=44&&i.h>=44&&i.top>0.5&&Math.abs(i.top-back1.top)<1,`${width}: Instagram flotante, 44 px, a la altura de «atrás»`);}
      await page.screenshot({path:`${OUT}/${width}-perfil-deslizado.png`});
      // Volver a los reels: sin cabecera fija con fondo, la barra de estado queda transparente.
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.locator('#backBtn').click();await page.locator('.catalogo-publico.view-reels').waitFor();await espera(page,600);
      await page.screenshot({path:`${OUT}/${width}-reels-tras-volver.png`});
      const fijosReels=await page.evaluate(()=>[...document.querySelectorAll('.catalogo-publico *')].filter(e=>{const c=getComputedStyle(e);if(c.position!=='fixed'||c.display==='none'||c.visibility==='hidden'||e.hidden)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<0.5&&(c.backgroundColor!=='rgba(0, 0, 0, 0)'||c.backgroundImage!=='none'||(c.backdropFilter&&c.backdropFilter!=='none'))}).map(e=>e.id||e.className));
      ok(fijosReels.length===0,`${width}: tras volver a los reels no hay capas fijas en y=0 (${fijosReels.join(',')})`);
      ok(await page.locator('.hdr').evaluate(e=>{const c=getComputedStyle(e);return c.position==='fixed'&&parseFloat(c.top)>0}),`${width}: la cabecera de los reels sigue fija y separada del borde`);
      ok(errors.length===0,`${width}: sin errores (perfil)`);await ctx.close();
    }
    // Esencias Michel (con Instagram): el h1 del perfil es el usuario, igual que junto al avatar del reel, sin «@»; el nombre queda en la cabecera.
    {
      const db=construirDesdeSeed();
      const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
      await ctx.addInitScript(({db})=>{localStorage.setItem('deslizapp-demo-v5',JSON.stringify(db));localStorage.setItem('dz-coach-esencias-michel','1');localStorage.setItem('deslizapp-version-vista','9.9.9');},{db});
      const page=await ctx.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(URL+'/tienda/esencias-michel?demo');await page.locator('#reels .reel.on').waitFor();await espera(page,400);
      const usuario=(await page.locator('.reel.on .who').innerText()).trim();
      await page.locator('.reel.on .who').click();await page.locator('.catalogo-publico.view-grid').waitFor();await espera(page,500);
      const h1=(await page.getByRole('heading',{level:1}).innerText()).trim();
      ok(usuario.length>0&&!usuario.startsWith('@')&&h1===usuario,`${width}: Michel, el título del perfil es el usuario del reel («${h1}»)`);
      ok(await page.locator('.hdr .logo').evaluate(e=>e.getBoundingClientRect().width>0)&&(await page.locator('.hdr .logo').innerText()+await page.locator('.hdr .logo img').count())!=='',`${width}: Michel, el nombre sigue arriba en la cabecera`);
      await page.screenshot({path:`${OUT}/${width}-perfil-michel.png`});
      ok(errors.length===0,`${width}: sin errores (perfil Michel)`);await ctx.close();
    }
  }
}finally{await browser.close();}
console.log(`${checks} comprobaciones aprobadas`);
