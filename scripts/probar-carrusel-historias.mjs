// Barras tipo historia del carrusel y vista enfocada de fotos. Solo fixtures Demo locales: no usa Supabase ni datos reales.
// Con la app corriendo: URL=http://localhost:3220 node scripts/probar-carrusel-historias.mjs
import '../tests/cargar-ts.mjs';
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync} from 'node:fs';
import {navegador, URL} from './navegador-catalogo.mjs';
const {construirDesdeSeed}=await import('../lib/data/db.ts');
const {tiendaPublicaDe,productosPublicosDe}=await import('../lib/vista-previa-producto.ts');
const OUT=process.env.CAPTURAS??'docs/capturas/carrusel-historias';mkdirSync(OUT,{recursive:true});
const browser=await navegador();let checks=0;
const ok=(value,label)=>{assert(value,label);checks++;console.log('OK',label)};
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const espera=(page,ms)=>page.waitForTimeout(ms);

/** Esencias Michel con Mayar de `total` medios (con 3, el tercero es un video). */
async function abrirMichel(width,total,{reducido=false}={}){
  const db=construirDesdeSeed();const t=db.tiendas.find(t=>t.slug==='esencias-michel');const p=db.productos.find(p=>p.tiendaId===t.id&&p.slug==='mayar');
  p.medios=Array.from({length:total},(_,i)=>({tipo:'foto',url:`/tienda/michel-mayar.jpg?pagina=${i}`,retocada:false}));
  if(total===3)p.medios[2]={tipo:'video',url:'/carrusel-video-local.mp4',portada:'/tienda/michel-mayar.jpg'};
  const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block',reducedMotion:reducido?'reduce':'no-preference'});
  await ctx.addInitScript(({db,slug})=>{localStorage.setItem('deslizapp-demo-v5',JSON.stringify(db));localStorage.setItem('dz-coach-'+slug,'1');localStorage.setItem('deslizapp-version-vista','9.9.9');},{db,slug:t.slug});
  return abrirPagina(ctx,`/tienda/${t.slug}?demo#p/mayar`,'mayar');
}
/** Lino & Algodón, pantalón de algodón: 4 fotos y presentaciones con color. */
async function abrirLino(width,{reducido=false,duracion='400ms'}={}){
  const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block',reducedMotion:reducido?'reduce':'no-preference'});
  await ctx.addInitScript((d)=>{for(const s of ['lino-y-algodon','esencias-michel'])localStorage.setItem('dz-coach-'+s,'1');localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('deslizapp-modo-v1','demo');
    // Temporizador acelerado: la duración de cada foto es una variable CSS.
    document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.setProperty('--historia-duracion',d));},duracion);
  return abrirPagina(ctx,'/tienda/lino-y-algodon?demo#p/pantalon-de-algodon','pantalon-de-algodon');
}
async function abrirPagina(ctx,ruta,slug){
  const page=await ctx.newPage();page.setDefaultTimeout(15000);const errors=[];let traffic=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('supabase.co'))traffic++});
  await page.route('**/carrusel-video-local.mp4',r=>r.fulfill({contentType:'video/mp4',body:readFileSync('tests/fixtures/catalogo-video.mp4')}));
  await page.goto(URL+ruta);await page.locator(`#r-${slug}.on`).waitFor();await espera(page,400);
  const cdp=await ctx.newCDPSession(page);
  const reel=page.locator('#r-'+slug);
  return {ctx,page,errors,traffic:()=>traffic,cdp,reel,barras:reel.locator('.historias-medios'),fotos:reel.locator('.carrusel')};
}
const etiqueta=(s)=>s.barras.getAttribute('aria-label');
const indice=(s)=>s.fotos.evaluate(e=>Math.round(e.scrollLeft/e.clientWidth));
const irA=async(s,i)=>{await s.fotos.evaluate((e,i)=>e.scrollTo({left:e.clientWidth*i,behavior:'instant'}),i);await espera(s.page,120)};
const toque=async(s,x,y)=>{await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
const deslizar=async(s,x0,y0,x1,y1,pasos=8)=>{
  await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=pasos;i++){await s.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/pasos,y:y0+(y1-y0)*i/pasos}]});await espera(s.page,16)}
  await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const centroFoto=async(s)=>{const b=await s.fotos.boundingBox();return {x:b.x+b.width/2-20,y:b.y+b.height*0.35,b}};
const enfocada=(s)=>s.page.locator('[data-enfocada]');
const cerrarCtx=async(s,nombre)=>{ok(s.errors.length===0&&s.traffic()===0,`${nombre}: sin errores JS ni tráfico Supabase`);await s.ctx.close()};

try {
  // 1. Forma: barras solo con varios medios, sin pie reservado ni contador global, sin controles invisibles encima de la foto.
  for(const width of [360,390,430]) for(const total of [1,3,10]) {
    const s=await abrirMichel(width,total);const {page,reel}=s;const n=`${width}/${total}`;
    ok(!/\d+\s*\/\s*\d+/.test(await page.locator('.reels').innerText()),`${n}: sin contador global «01 / 12»`);
    ok(await page.locator('.puntos-medios,.paginas-medios,[data-carrusel-multiple]').count()===0,`${n}: sin pie reservado ni puntos`);
    ok(await page.evaluate(()=>[...document.querySelectorAll('.media')].every(m=>getComputedStyle(m).getPropertyValue('--pie-medios').trim()==='')),`${n}: sin variable de pie reservado`);
    const media=await reel.locator('.media').boundingBox(),fotos=await s.fotos.boundingBox();
    ok(Math.abs(fotos.height-media.height)<1&&Math.abs(fotos.y-media.y)<1,`${n}: la foto ocupa todo el reel`);
    ok(await s.barras.count()===(total>1?1:0),`${n}: barras solo con varios medios`);
    if(total>1){
      ok(await s.barras.locator('.historia').count()===total,`${n}: un segmento por medio`);
      ok(await etiqueta(s)==='Foto 1 de '+total,`${n}: anuncia «Foto 1 de ${total}»`);
      const b=await s.barras.boundingBox();
      ok(b.y>=media.y&&b.y<media.y+20&&b.x>=media.x&&b.x+b.width<=media.x+media.width,`${n}: barras arriba, dentro de la foto`);
      const hdr=await page.locator('.htabs').boundingBox();
      ok(b.y>=hdr.y+hdr.height,`${n}: barras por debajo de la cabecera`);
      const seg=await s.barras.locator('.historia').first().boundingBox();
      ok(seg.height>=2&&seg.height<=3&&seg.width>=6,`${n}: segmentos finos (${seg.height}px × ${Math.round(seg.width)}px)`);
      const meta=reel.locator('.topmeta');if(await meta.count())ok(!overlap(await meta.boundingBox(),b),`${n}: la etiqueta no choca con las barras`);
      ok(await s.barras.evaluate(e=>getComputedStyle(e).pointerEvents==='none'&&!e.querySelector('button,[tabindex]')),`${n}: barras no son controles`);
      if(total===3){
        await irA(s,2);await espera(page,600);
        ok(await etiqueta(s)==='Video 3 de 3',`${n}: el video anuncia su posición`);
        ok(await reel.locator('.historia i.video').evaluate(e=>e.getAnimations().length===0),`${n}: la barra del video no corre sola`);
        // El Chromium de pruebas puede no traer el códec MP4: se fija el tiempo del video y se emite su `timeupdate`.
        await reel.locator('video').evaluate(v=>{Object.defineProperty(v,'duration',{configurable:true,value:8});Object.defineProperty(v,'currentTime',{configurable:true,writable:true,value:2});v.dispatchEvent(new Event('timeupdate'))});
        ok(await reel.locator('.historia i.video').evaluate(i=>i.style.transform==='scaleX(0.25)'),`${n}: la barra del video sigue su tiempo`);
        await espera(page,1200);ok(await indice(s)===2,`${n}: el video no avanza solo`);
        await irA(s,0);
      }
    }
    await page.screenshot({path:`${OUT}/${width}-${total}-medios.png`});
    ok(await page.evaluate(w=>document.documentElement.scrollWidth<=w,width),`${n}: sin overflow horizontal`);
    await cerrarCtx(s,n);
  }

  // 2. Avance automático (temporizador acelerado): para en la última, nunca cambia de producto.
  {
    const s=await abrirLino(390);const {page}=s;
    const y0=await page.evaluate(()=>scrollY);
    await page.waitForFunction(()=>document.querySelector('#r-pantalon-de-algodon .historias-medios')?.getAttribute('aria-label')==='Foto 4 de 4',null,{timeout:6000});
    ok(true,'avance: llega sola a la última foto');
    await espera(page,1500);
    ok(await etiqueta(s)==='Foto 4 de 4'&&await indice(s)===3,'avance: se detiene en la última');
    ok(await s.barras.locator('.historia i').evaluateAll(is=>is.every(i=>new DOMMatrix(getComputedStyle(i).transform).a>0.99)),'avance: todas las barras llenas');
    ok(await page.evaluate(()=>scrollY)===y0&&await page.locator('#r-pantalon-de-algodon.on').count()===1,'avance: no hace scroll vertical ni cambia de producto');
    await page.screenshot({path:`${OUT}/avance-ultima.png`});

    // Mantener pulsado pausa; al soltar sigue.
    await irA(s,0);await espera(page,100);
    const {x,y}=await centroFoto(s);
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await espera(page,1300);
    ok(await indice(s)===0,'pausa: con el dedo apoyado no avanza');
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await espera(page,400);ok(await enfocada(s).count()===0,'pausa: mantener y soltar no abre la vista enfocada');
    await page.waitForFunction(()=>Math.round(document.querySelector('#r-pantalon-de-algodon .carrusel').scrollLeft/document.querySelector('#r-pantalon-de-algodon .carrusel').clientWidth)>=1,null,{timeout:3000});
    ok(true,'pausa: al soltar sigue avanzando');

    // Hoja abierta encima: no avanza.
    await irA(s,0);
    await s.reel.locator('.cap .pres-btn').tap();await page.locator('#presBg').waitFor();
    await espera(page,1300);ok(await indice(s)===0,'pausa: con una hoja abierta no avanza');
    // Elegir un color mueve a su foto y reinicia la barra ahí.
    await page.locator('#presBg').getByRole('radio',{name:'Talla M, color Arena'}).tap();await espera(page,700);
    ok(await indice(s)===2&&await etiqueta(s)==='Foto 3 de 4','color: va a la foto del color');
    await page.keyboard.press('Escape');await page.locator('#presBg').waitFor({state:'detached'});
    await page.evaluate(()=>document.documentElement.style.setProperty('--historia-duracion','2000ms'));
    await irA(s,0);await espera(page,1200);
    await deslizar(s,(await centroFoto(s)).b.x+300,(await centroFoto(s)).y,(await centroFoto(s)).b.x+40,(await centroFoto(s)).y);
    await espera(page,450);
    const t=await s.reel.locator('.historia i.activa').evaluate(i=>i.getAnimations()[0]?.currentTime??-1);
    ok(await indice(s)===1&&t>=0&&t<900,`deslizar: reinicia el temporizador en la foto elegida (${Math.round(t)} ms)`);
    // Pestaña oculta: pausa.
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
    await espera(page,100);
    ok(await s.reel.locator('.historia i.activa').evaluate(i=>!i.hasAttribute('data-corre')),'pausa: con la pestaña oculta');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))});
    await espera(page,100);
    ok(await s.reel.locator('.historia i.activa').evaluate(i=>i.hasAttribute('data-corre')),'pausa: sigue al volver a la pestaña');
    // Reel no activo: pausa y al volver sigue donde estaba.
    await page.keyboard.press('ArrowDown');await espera(page,900);
    const fuera=await indice(s);await espera(page,2300);
    ok(await page.locator('#r-pantalon-de-algodon.on').count()===0&&await indice(s)===fuera,'pausa: con el reel fuera de vista no avanza');
    await page.keyboard.press('ArrowUp');await page.locator('#r-pantalon-de-algodon.on').waitFor();
    ok(await indice(s)===fuera,'al volver sigue en la foto donde estaba');
    await cerrarCtx(s,'avance');
  }

  // 3. Movimiento reducido: no hay avance automático y la barra activa se marca sin animación.
  {
    const s=await abrirLino(390,{reducido:true});
    await espera(s.page,1500);
    ok(await indice(s)===0&&await etiqueta(s)==='Foto 1 de 4','reducido: no avanza solo');
    ok(await s.reel.locator('.historia i.activa').evaluate(i=>i.getAnimations().length===0&&new DOMMatrix(getComputedStyle(i).transform).a>0.99),'reducido: la activa se marca sin animación');
    // La vista enfocada abre sin animación.
    const {x,y}=await centroFoto(s);await toque(s,x,y);await enfocada(s).waitFor();
    ok(await enfocada(s).evaluate(e=>e.getAnimations().length===0),'reducido: la vista enfocada entra sin animación');
    await s.page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});
    await cerrarCtx(s,'reducido');
  }

  // 4. Doble toque sigue dando «aaah» y no abre la vista; un toque simple la abre.
  {
    const s=await abrirMichel(390,4);const {page}=s;
    const {x,y}=await centroFoto(s);
    await toque(s,x,y);await espera(page,120);await toque(s,x,y);
    await espera(page,150);
    ok(await s.reel.locator('.burst.go').count()===1,'doble toque: «aaah»');
    await espera(page,600);
    ok(await enfocada(s).count()===0,'doble toque: no abre la vista enfocada');
    // Un deslizamiento no abre nada.
    await irA(s,0);
    await deslizar(s,x+120,y,x-120,y);await espera(page,700);
    ok(await enfocada(s).count()===0,'deslizar no abre la vista');
    // Tocar los bordes (descripción) no abre nada.
    const cap=await s.reel.locator('.cap h2').boundingBox();await toque(s,cap.x+10,cap.y+cap.height/2);await espera(page,600);
    ok(await enfocada(s).count()===0,'tocar la descripción no abre la vista');

    await irA(s,1);
    const largo0=await page.evaluate(()=>history.length);
    await toque(s,x,y);await enfocada(s).waitFor();await espera(page,300);
    const dlg=page.getByRole('dialog',{name:'Fotos de Mayar'});
    ok(await dlg.count()===1,'toque simple: abre «Fotos de Mayar»');
    ok(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'))==='Cerrar','foco en la ×');
    ok((await dlg.locator('.enfocada-cuenta').innerText()).replace(/\s+/g,' ').includes('2 / 4'),'indicador «2 / 4»');
    ok(await dlg.evaluate(d=>getComputedStyle(d.querySelector('.enfocada-fondo')).backgroundColor==='rgb(0, 0, 0)'&&getComputedStyle(d.querySelector('.enfocada-zoom img')).objectFit==='contain'),'fondo negro y foto entera');
    ok(await dlg.evaluate(d=>!d.querySelector('.acts,.cap,.historias-medios,.like')&&getComputedStyle(d).touchAction==='none'),'sin UI del reel y con gestos propios');
    ok(await page.evaluate(()=>document.getElementById('reels').inert&&getComputedStyle(document.documentElement).overflow==='hidden'),'fondo bloqueado');
    ok(await page.evaluate(()=>history.state?.catalogoFoto===true)&&await page.evaluate(()=>history.length)===largo0+1,'abre una entrada de historial');
    await page.screenshot({path:`${OUT}/vista-enfocada.png`});
    // Flechas cambian de foto; Escape cierra y el reel queda en la última vista.
    await page.keyboard.press('ArrowRight');await espera(page,350);
    ok((await dlg.locator('.enfocada-cuenta').innerText()).includes('3 / 4'),'flecha derecha: siguiente foto');
    ok(await page.locator('#r-mayar.on').count()===1,'las flechas no mueven el catálogo');
    await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});
    ok(!(await page.evaluate(()=>history.state?.catalogoFoto)),'Escape: cierra y consume la entrada');
    ok(await indice(s)===2&&await etiqueta(s)==='Foto 3 de 4','al cerrar, el carrusel queda en la última foto vista');
    ok(await page.evaluate(()=>document.activeElement?.classList.contains('carrusel')),'el foco vuelve a la foto');

    // × cierra; luego un solo «atrás» cierra la siguiente apertura sin salir del catálogo.
    await espera(page,400);await toque(s,x,y);await enfocada(s).waitFor();
    await page.getByRole('button',{name:'Cerrar'}).click();await enfocada(s).waitFor({state:'detached'});
    ok(!(await page.evaluate(()=>history.state?.catalogoFoto)),'×: cierra y consume la entrada');
    await espera(page,400);await toque(s,x,y);await enfocada(s).waitFor();
    await page.goBack({waitUntil:'commit'}).catch(()=>{});await enfocada(s).waitFor({state:'detached'});
    ok(page.url().includes('/tienda/esencias-michel')&&await page.locator('#r-mayar.on').count()===1,'«atrás»: cierra con un toque y sigue en el catálogo');

    // Gestos dentro de la vista: doble toque acerca/aleja, deslizar cambia de foto, deslizar abajo cierra.
    await irA(s,0);await espera(page,400);await toque(s,x,y);await enfocada(s).waitFor();await espera(page,300);
    const zoom=()=>page.locator('.enfocada-medio:not([aria-hidden="true"]) .enfocada-zoom').evaluate(e=>Number(e.dataset.zoom??1));
    await toque(s,200,420);await espera(page,80);await toque(s,200,420);await espera(page,400);
    ok(Math.abs(await zoom()-2.5)<0.01,'doble toque en la vista: 2,5×');
    await deslizar(s,200,420,120,380);await espera(page,100);
    ok(await page.locator('.enfocada-cuenta').innerText().then(t=>t.includes('1 / 4'))&&Math.abs(await zoom()-2.5)<0.01,'con zoom, arrastrar mueve la foto sin cambiarla');
    ok(await page.locator('.enfocada-medio:not([aria-hidden="true"]) .enfocada-zoom').evaluate(e=>{const r=e.getBoundingClientRect(),v=innerWidth;return r.left<=1&&r.right>=v-1}),'con zoom, la foto no se sale de sus bordes');
    await toque(s,200,420);await espera(page,80);await toque(s,200,420);await espera(page,400);
    ok(await zoom()===1,'doble toque otra vez: vuelve a 1×');
    // Pellizco con dos dedos (eventos táctiles del navegador).
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:420,id:1},{x:220,y:420,id:2}]});
    for(let i=1;i<=8;i++){await s.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:170-i*12,y:420,id:1},{x:220+i*12,y:420,id:2}]});await espera(page,16)}
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await espera(page,200);
    const z=await zoom();ok(z>1.5&&z<=4,`pellizco: acerca (${z}×), con límite de 4×`);
    await toque(s,200,420);await espera(page,80);await toque(s,200,420);await espera(page,400);
    await deslizar(s,330,420,60,420);await espera(page,400);
    ok((await page.locator('.enfocada-cuenta').innerText()).includes('2 / 4'),'sin zoom, deslizar cambia de foto');
    await deslizar(s,200,300,200,560);await enfocada(s).waitFor({state:'detached'});
    ok(!(await page.evaluate(()=>history.state?.catalogoFoto))&&await indice(s)===1,'deslizar hacia abajo cierra y deja la foto vista');
    await cerrarCtx(s,'vista enfocada');
  }

  // 5. Una sola foto: sin barras, el toque abre la vista sin indicador.
  {
    const s=await abrirMichel(390,1);const {x,y}=await centroFoto(s);
    await toque(s,x,y);await enfocada(s).waitFor();
    ok(await s.page.locator('.enfocada-cuenta').count()===0,'una foto: sin indicador «1 / 1»');
    await s.page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});
    await cerrarCtx(s,'una foto');
  }

  // 6. La vista previa del panel reutiliza el mismo Reel: barras, avance y vista enfocada.
  {
    const db=construirDesdeSeed();const t=db.tiendas.find(t=>t.slug==='esencias-michel');const p=db.productos.find(p=>p.tiendaId===t.id&&p.slug==='mayar');
    p.medios=Array.from({length:3},(_,i)=>({tipo:'foto',url:`/tienda/michel-mayar.jpg?pagina=${i}`,retocada:false}));
    const datos={tienda:tiendaPublicaDe(t),productos:productosPublicosDe([p],t.rubro)};
    const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
    await ctx.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.setProperty('--historia-duracion','400ms')));
    const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(URL+'/vista-previa-catalogo');await page.waitForLoadState('networkidle');
    await page.evaluate(d=>postMessage({tipo:'deslizapp-vista-previa',datos:d},location.origin),datos);
    const reel=page.locator('[data-vista-previa-reel] .reel.on');await reel.waitFor();
    const s={page,cdp:await ctx.newCDPSession(page),reel,barras:reel.locator('.historias-medios'),fotos:reel.locator('.carrusel')};
    ok(await s.barras.locator('.historia').count()===3,'vista previa: barras tipo historia');
    ok(!/\d+\s*\/\s*\d+/.test(await page.locator('.reels').innerText()),'vista previa: sin contador global');
    await page.waitForFunction(()=>document.querySelector('.reel.on .historias-medios')?.getAttribute('aria-label')==='Foto 3 de 3',null,{timeout:5000});
    ok(true,'vista previa: avanza sola hasta la última');
    const {x,y}=await centroFoto(s);await toque(s,x,y);await page.locator('[data-enfocada]').waitFor();
    ok(await page.getByRole('dialog',{name:'Fotos de '+p.nombre}).count()===1,'vista previa: abre la vista enfocada');
    await page.keyboard.press('Escape');await page.locator('[data-enfocada]').waitFor({state:'detached'});
    ok(errors.length===0,'vista previa: sin errores JS');
    await ctx.close();
  }
}finally{await browser.close();}
console.log(`${checks} comprobaciones aprobadas`);
