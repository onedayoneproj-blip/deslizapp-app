// Solo fixtures Demo locales. No usa Supabase ni datos reales.
import '../tests/cargar-ts.mjs';
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync} from 'node:fs';
import {navegador, URL} from './navegador-catalogo.mjs';
const {construirDesdeSeed}=await import('../lib/data/db.ts');
const OUT=process.env.CAPTURAS??'docs/capturas/carrusel-imagenes';mkdirSync(OUT,{recursive:true});
const browser=await navegador();let checks=0;
const ok=(value,label)=>{assert(value,label);checks++;console.log('OK',label)};
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
try {
 for(const width of [360,390,430,1280]) for(const total of [1,3,10]) {
  const db=construirDesdeSeed();const t=db.tiendas.find(t=>t.slug==='esencias-michel');const p=db.productos.find(p=>p.tiendaId===t.id&&p.slug==='mayar');
  p.medios=Array.from({length:total},(_,i)=>({tipo:'foto',url:`/tienda/michel-mayar.jpg?pagina=${i}`,retocada:false}));
  if(total===3)p.medios[2]={tipo:'video',url:'/carrusel-video-local.mp4',portada:'/tienda/michel-mayar.jpg'};
  const ctx=await browser.newContext({viewport:{width,height:width>=900?900:844},hasTouch:true,isMobile:width<900,serviceWorkers:'block',reducedMotion:total===10?'reduce':'no-preference'});
  await ctx.addInitScript(({db,slug})=>{localStorage.setItem('deslizapp-demo-v5',JSON.stringify(db));localStorage.setItem('dz-coach-'+slug,'1');localStorage.setItem('deslizapp-version-vista','9.9.9');},{db,slug:t.slug});
  const page=await ctx.newPage();const errors=[];let traffic=0;page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('supabase.co'))traffic++});
  await page.route('**/carrusel-video-local.mp4',r=>r.fulfill({contentType:'video/mp4',body:readFileSync('tests/fixtures/catalogo-video.mp4')}));
  await page.goto(`${URL}/tienda/${t.slug}?demo#p/${p.slug}`);const reel=page.locator('#r-'+p.slug);await page.locator('#r-'+p.slug+'.on').waitFor();await page.waitForTimeout(350);
  const media=reel.locator('.media'),photos=reel.locator('.carrusel'),group=reel.locator('.puntos-medios'),buttons=group.getByRole('button');
  ok(!/\d+\s*\/\s*\d+/.test(await page.locator('.reels').innerText()),`${width}/${total}: no progreso global entre productos`);
  ok(await group.count()===(total>1?1:0),`${width}/${total}: indicador solo con varios medios`);
  if(total>1){
   ok(await buttons.count()===total,`${width}/${total}: una página por medio`);
   ok(await buttons.first().getAttribute('aria-pressed')==='true',`${width}/${total}: primera página activa`);
   const geometry=async()=>{
    const image=await photos.boundingBox(),footer=await group.boundingBox(),caption=await reel.locator('.cap').boundingBox();
    ok(footer.y>=image.y+image.height-1,`${width}/${total}: puntos fuera del área de foto`);
    ok(caption.y+caption.height<=footer.y+1,`${width}/${total}: descripción separada del indicador`);
    const selected=group.locator('button[aria-pressed="true"]');const rect=await selected.boundingBox();
    const a={left:rect.x,right:rect.x+rect.width,top:rect.y,bottom:rect.y+rect.height};
    const controls=await page.locator('#bagDock button, .hdr button, #r-'+p.slug+' .acts button, #r-'+p.slug+' .cap button, #r-'+p.slug+' .sonido').evaluateAll(es=>es.filter(e=>getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}));
    ok(controls.every(r=>!overlap(a,r)),`${width}/${total}: punto activo no cruza controles`);
    ok(await selected.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e}),`${width}/${total}: punto activo visible y tocable`);
   };
   await geometry();
   // Gesto horizontal real mediante eventos táctiles del navegador.
   const session=await ctx.newCDPSession(page);const box=await photos.boundingBox();const y=box.y+Math.min(100,box.height/3);const start=box.x+box.width-40,end=box.x+40;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
   for(let i=1;i<=8;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/8,y}]});await page.waitForTimeout(20);}
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(450);
   ok(await buttons.nth(1).getAttribute('aria-pressed')==='true',`${width}/${total}: deslizar actualiza página activa`);
   // El último punto puede quedar fuera del visor en un carrusel largo: el scroll del carrusel lo trae al centro.
   if(total===10){await photos.evaluate(e=>e.scrollTo({left:e.clientWidth*9,behavior:'instant'}));await page.waitForTimeout(100);}
   else {await buttons.last().click();await page.waitForTimeout(450);}
   ok(await buttons.last().getAttribute('aria-pressed')==='true'&&await photos.evaluate(e=>Math.round(e.scrollLeft/e.clientWidth))===total-1,`${width}/${total}: último medio y punto coinciden`);
   await geometry();
   await page.keyboard.press("Tab");await buttons.last().focus();ok(await buttons.last().evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),`${width}/${total}: foco visible`);
   if(total===3){ok(await reel.locator('video').evaluate(v=>v.muted&&v.playsInline),`${width}/${total}: video conserva reproducción en línea`);}
   if(width===360&&total===3){await media.evaluate(e=>e.style.setProperty('--pie-medios','78px'));await group.evaluate(e=>e.style.paddingBottom='34px');await geometry();ok(await group.evaluate(e=>e.getBoundingClientRect().height===78), 'área segura inferior de 34 px simulada');}
   await page.evaluate(()=>document.activeElement?.blur());
  }else {ok(Math.abs((await photos.boundingBox()).height-(await media.boundingBox()).height)<1,`${width}: foto única sin franja vacía`);}
  await page.screenshot({path:`${OUT}/${width}-${total}-medios.png`});
  ok(await page.evaluate(w=>document.documentElement.scrollWidth<=w,width),`${width}/${total}: sin overflow horizontal`);
  ok(errors.length===0&&traffic===0,`${width}/${total}: sin errores JS ni tráfico Supabase`);
  await ctx.close();
 }
}finally{await browser.close();}
console.log(`${checks} comprobaciones aprobadas`);
