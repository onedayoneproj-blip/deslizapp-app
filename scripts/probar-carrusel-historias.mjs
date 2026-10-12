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
    // El reel no lleva abanico de colección (el de la cabecera basta): solo «En tu pedido» cuando toca.
    ok(await reel.locator('.reel-coleccion,.topmeta .hcov').count()===0,`${n}: el reel no lleva abanico de colección`);
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
        const eb3=await reel.getByRole('button',{name:'Ver foto en grande'}).boundingBox(),sb=await reel.locator('.sonido').boundingBox();
        ok(!overlap(eb3,sb),`${n}: el sonido del video no toca el botón de expandir`);
        if(width===360)await page.screenshot({path:`${OUT}/360-video-sonido.png`});
        ok(await reel.locator('.historia i.video').evaluate(e=>e.getAnimations().length===0),`${n}: la barra del video no corre sola`);
        // El Chromium de pruebas puede no traer el códec MP4: se fija el tiempo del video y se emite su `timeupdate`.
        await reel.locator('video').evaluate(v=>{Object.defineProperty(v,'duration',{configurable:true,value:8});Object.defineProperty(v,'currentTime',{configurable:true,writable:true,value:2});v.dispatchEvent(new Event('timeupdate'))});
        ok(await reel.locator('.historia i.video').evaluate(i=>i.style.transform==='scaleX(0.25)'),`${n}: la barra del video sigue su tiempo`);
        await espera(page,1200);ok(await indice(s)===2,`${n}: el video no avanza solo`);
        await irA(s,0);
      }
    }
    // Toda la foto recibe el toque salvo los controles reales: malla de puntos con elementFromPoint.
    const malla=await page.evaluate(({slug,franja})=>{
      const r=document.querySelector('#r-'+slug+' .carrusel').getBoundingClientRect();const malos=[];
      for(let fy=0;fy<=10;fy++)for(let fx=0;fx<=8;fx++){
        const x=r.left+4+(r.width-8)*fx/8,y=r.top+franja+(r.height-franja-4)*fy/10;
        const el=document.elementFromPoint(x,y);
        if(!el||el.closest('.carrusel')||el.closest('button,a,input,select,textarea,[role="button"]'))continue;
        malos.push(el.className||el.tagName);
      }
      return malos;
    },{slug:'mayar',franja:56});
    ok(malla.length===0,`${n}: toda la foto recibe el toque salvo los controles${malla.length?' (tapan: '+[...new Set(malla)].join(', ')+')':''}`);
    // Botón de expandir arriba a la derecha, bajo las barras, sin solaparse con la colección ni con el sonido.
    const exp=reel.getByRole('button',{name:'Ver foto en grande'});
    const eb=await exp.boundingBox();
    ok(eb.width>=44&&eb.height>=44&&eb.x+eb.width<=media.x+media.width&&eb.x+eb.width>media.x+media.width-12,`${n}: botón de expandir de 44 px en la esquina derecha`);
    if(total>1){const b=await s.barras.boundingBox();ok(eb.y+6>=b.y+b.height,`${n}: botón de expandir bajo las barras`);}
    const visible={x:eb.x+6,y:eb.y+6,width:eb.width-12,height:eb.height-12};
    const son=reel.locator('.sonido');if(await son.count())ok(!overlap(eb,await son.boundingBox()),`${n}: el sonido no toca el botón de expandir`);
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
    ok(await page.evaluate(()=>typeof history.state?.catalogoFoto==='string')&&await page.evaluate(()=>history.length)===largo0+1,'abre una entrada de historial');
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

  // 4b. Toque en toda la foto, botón de expandir y pellizco (contexto limpio: sin la burbuja del «aaah» encima).
  {
    const s=await abrirMichel(390,4);const {page}=s;
    const {x,y}=await centroFoto(s);
    // El nombre y el precio no son controles: tocarlos abre la vista (antes no llegaba el toque).
    const cap=await s.reel.locator('.cap h2').boundingBox();await toque(s,cap.x+10,cap.y+cap.height/2);await enfocada(s).waitFor();
    ok(true,'tocar el nombre del producto abre la vista');
    await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});await espera(page,400);
    // Los controles reales siguen recibiendo su toque: «…» abre la descripción, no la vista; y con ella abierta, tocarla no abre nada.
    const mas=await s.reel.locator('[data-more]').boundingBox();await toque(s,mas.x+mas.width/2,mas.y+mas.height/2);await espera(page,600);
    ok(await enfocada(s).count()===0&&await s.reel.evaluate(r=>r.classList.contains('open')),'«…» abre la descripción, no la vista');
    const panel=await s.reel.locator('.panel .pin').boundingBox();await toque(s,panel.x+40,panel.y+20);await espera(page,600);
    ok(await enfocada(s).count()===0,'con la descripción abierta, tocarla no abre la vista');
    ok(await s.reel.locator('.expandir').evaluate(b=>getComputedStyle(b).opacity==='0'&&getComputedStyle(b).pointerEvents==='none'),'con la descripción abierta, el botón de expandir se oculta');
    await s.reel.locator('[data-less]').click();await espera(page,300);
    // Botón de expandir: misma vista, misma entrada de historial y el foco vuelve a la foto.
    const largoB=await page.evaluate(()=>navigation.currentEntry.index);
    await s.reel.getByRole('button',{name:'Ver foto en grande'}).click();await enfocada(s).waitFor();
    ok(await page.evaluate(()=>typeof history.state?.catalogoFoto==='string')&&await page.evaluate(()=>navigation.currentEntry.index)===largoB+1,'botón de expandir: abre la vista con una entrada de historial');
    await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});
    ok(!(await page.evaluate(()=>history.state?.catalogoFoto))&&await page.evaluate(()=>document.activeElement?.classList.contains('carrusel')),'botón de expandir: Escape cierra y el foco vuelve a la foto');
    await espera(page,400);

    // Pellizco sobre la foto: abre la vista una sola vez, a 1×, y el mismo gesto sigue acercando.
    const pell=async(cx,cy,abre=12,pasos=8)=>{
      await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-20,y:cy,id:1},{x:cx+20,y:cy,id:2}]});
      for(let i=1;i<=pasos;i++){await s.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-20-i*abre,y:cy,id:1},{x:cx+20+i*abre,y:cy,id:2}]});await espera(page,16)}
      await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    const largoP=await page.evaluate(()=>navigation.currentEntry.index);
    await pell(x,y);await enfocada(s).waitFor();await espera(page,200);
    ok(await page.evaluate(()=>navigation.currentEntry.index)===largoP+1&&await page.locator('[data-enfocada]').count()===1,'pellizco: abre la vista una sola vez');
    const zoomP=await page.locator('.enfocada-medio:not([aria-hidden="true"]) .enfocada-zoom').evaluate(e=>Number(e.dataset.zoom??1));
    console.log(`   (pellizco continuo dentro de la vista en Chromium: ${zoomP}×)`);
    ok(await page.evaluate(()=>visualViewport.scale)===1,'pellizco: sin zoom de página');
    await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});await espera(page,400);
    ok(await page.evaluate(()=>!history.state?.catalogoFoto),'pellizco: cerrar consume su entrada');
    // Dos dedos quietos o que se juntan no abren nada; tampoco con una hoja abierta.
    await pell(x,y,-1,6);await espera(page,600);
    ok(await enfocada(s).count()===0,'juntar los dedos no abre la vista');
    await s.reel.locator('[data-comments]').click();await page.locator('#cmBg,[role="dialog"]').first().waitFor();await espera(page,300);
    await pell(x,y);await espera(page,600);
    ok(await enfocada(s).count()===0,'pellizco con una hoja abierta: no abre la vista');
    await page.keyboard.press('Escape');await espera(page,500);
    // Con un dedo en un control (la columna de botones) no cuenta como pellizco sobre la foto.
    const act=await s.reel.locator('.acts .act').first().boundingBox();
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:act.x+act.width/2,y:act.y+10,id:1},{x:x,y:y,id:2}]});
    for(let i=1;i<=6;i++){await s.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:act.x+act.width/2,y:act.y+10,id:1},{x:x-i*15,y:y+i*15,id:2}]});await espera(page,16)}
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await espera(page,600);
    ok(await enfocada(s).count()===0,'pellizco con un dedo en un control: no abre la vista');

    await cerrarCtx(s,'toque, botón y pellizco');
  }

  // 5. Una sola foto: sin barras, el toque abre la vista sin indicador.
  {
    const s=await abrirMichel(390,1);const {x,y}=await centroFoto(s);
    await toque(s,x,y);await enfocada(s).waitFor();
    ok(await s.page.locator('.enfocada-cuenta').count()===0,'una foto: sin indicador «1 / 1»');
    await s.page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});
    await cerrarCtx(s,'una foto');
  }

  // 6. La vista previa del panel reutiliza el mismo Reel con sus barras, pero sin vista enfocada (su historial es de la hoja).
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
    const {x,y}=await centroFoto(s);
    const largoV=await page.evaluate(()=>navigation.currentEntry.index);
    ok(await reel.locator('.expandir').count()===0,'vista previa: sin botón de expandir');
    await toque(s,x,y);await espera(page,700);
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-20,y,id:1},{x:x+20,y,id:2}]});
    for(let i=1;i<=8;i++){await s.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-20-i*12,y,id:1},{x:x+20+i*12,y,id:2}]});await espera(page,16)}
    await s.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await espera(page,500);
    await s.fotos.focus();await page.keyboard.press('Enter');await espera(page,400);
    ok(await page.locator('[data-enfocada]').count()===0&&await page.evaluate(()=>navigation.currentEntry.index)===largoV,'vista previa: ni toque, ni pellizco, ni Enter abren la vista ni tocan el historial');
    ok(errors.length===0,'vista previa: sin errores JS');
    await ctx.close();
  }

  // 7. Defectos de la revisión de #102: historial, toque pendiente, hojas, teclado, videos y doble cierre.
  {
    const s=await abrirMichel(390,4);const {page}=s;const {x,y}=await centroFoto(s);
    const idx=()=>page.evaluate(()=>navigation.currentEntry.index);
    // Una marca vieja de la vista (como tras recargar) se limpia al montar el catálogo.
    await page.evaluate(()=>history.replaceState({...history.state,catalogoFoto:'viejo'},'',location.href));
    await page.reload();await page.locator('#r-mayar.on').waitFor();await espera(page,400);
    ok(!(await page.evaluate(()=>history.state?.catalogoFoto)),'historial: la marca vieja se limpia al recargar');
    // Sin recargar, una marca vieja en la entrada actual tampoco confunde el cierre: un solo «atrás» y la × cierran.
    await page.evaluate(()=>history.replaceState({...history.state,catalogoFoto:'viejo'},'',location.href));
    const base=await idx();
    await toque(s,x,y);await enfocada(s).waitFor();
    await page.goBack({waitUntil:'commit'}).catch(()=>{});await enfocada(s).waitFor({state:'detached',timeout:3000});
    ok(await idx()===base,'historial: con una marca vieja, un solo «atrás» cierra la vista');
    await espera(page,400);await toque(s,x,y);await enfocada(s).waitFor();
    await page.getByRole('button',{name:'Cerrar'}).click();await enfocada(s).waitFor({state:'detached',timeout:3000});
    ok(await idx()===base,'historial: con una marca vieja, la × cierra con un solo toque');
    // Escape dos veces seguidas no retrocede dos entradas.
    await espera(page,400);await toque(s,x,y);await enfocada(s).waitFor();
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});await espera(page,300);
    ok(await idx()===base&&await page.locator('#r-mayar.on').count()===1,'Escape doble: un solo retroceso');
    // Tocar y enseguida deslizar no abre la vista.
    await espera(page,400);await toque(s,x,y);await espera(page,60);
    await deslizar(s,x+100,y,x-100,y,5);await espera(page,700);
    ok(await enfocada(s).count()===0,'tocar y deslizar enseguida no abre la vista');
    // Tocar y enseguida abrir una hoja (opiniones) no abre la vista encima.
    await espera(page,400);await toque(s,x,y);await espera(page,60);
    await s.reel.locator('[data-comments]').click();await espera(page,700);
    ok(await enfocada(s).count()===0,'tocar y abrir una hoja enseguida: la vista no se abre encima');
    await page.keyboard.press('Escape');await espera(page,600);
    // Teclado: el carrusel se enfoca, ←/→ cambian de foto, Enter abre la vista.
    await irA(s,0);await s.fotos.focus();
    ok(await s.fotos.evaluate(e=>e.tabIndex===0&&e.getAttribute('aria-label').startsWith('Fotos de Mayar')),'teclado: el carrusel se puede enfocar');
    await page.keyboard.press('ArrowRight');await espera(page,700);
    ok(await indice(s)===1&&await etiqueta(s)==='Foto 2 de 4','teclado: → pasa a la foto siguiente');
    await page.keyboard.press('ArrowLeft');await espera(page,700);
    ok(await indice(s)===0,'teclado: ← vuelve');
    ok(await page.locator('#r-mayar.on').count()===1,'teclado: las flechas no cambian de producto');
    await page.keyboard.press('Enter');await enfocada(s).waitFor();
    ok(true,'teclado: Enter abre la vista');
    await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});
    await cerrarCtx(s,'defectos de la revisión');
  }
  // 7b. Con la vista abierta, el video del carrusel deja de estar visible (no suena detrás).
  {
    const s=await abrirMichel(390,3);const {page}=s;
    await irA(s,2);await espera(page,400);
    ok(await s.reel.locator('.sonido').count()===1,'video: con el reel a la vista se muestra su sonido');
    await s.reel.getByRole('button',{name:'Ver foto en grande'}).click();await enfocada(s).waitFor();
    ok(await s.reel.locator('.sonido').count()===0&&await s.reel.locator('.carrusel video').evaluate(v=>v.paused),'video: con la vista abierta, el del carrusel se pausa');
    await page.keyboard.press('Escape');await enfocada(s).waitFor({state:'detached'});await espera(page,400);
    // El botón de sonido está dentro del carrusel: su toque no abre la vista ni, repetido, da el «aaah».
    const son=await s.reel.locator('.sonido').boundingBox();const sx=son.x+son.width/2,sy=son.y+son.height/2;
    const etiquetaSon=()=>s.reel.locator('.sonido').getAttribute('aria-label');
    const antes=await etiquetaSon();
    await toque(s,sx,sy);await espera(page,700);
    ok(await enfocada(s).count()===0&&await etiquetaSon()!==antes,'sonido: un toque cambia el sonido y no abre la vista');
    await toque(s,sx,sy);await espera(page,120);await toque(s,sx,sy);await espera(page,700);
    ok(await enfocada(s).count()===0&&await s.reel.locator('.burst.go').count()===0,'sonido: dos toques rápidos no dan el «aaah» ni abren la vista');
    // Enter sobre el botón de sonido es su clic, no abre la vista.
    const antesEnter=await etiquetaSon();
    await s.reel.locator('.sonido').focus();await page.keyboard.press('Enter');await espera(page,500);
    ok(await enfocada(s).count()===0&&await etiquetaSon()!==antesEnter,'teclado: Enter en el sonido no abre la vista');
    // Con modificadores o con la tecla mantenida, el carrusel no actúa (Alt+← sigue siendo «atrás» del navegador).
    await irA(s,1);await s.fotos.focus();
    const prev=await s.fotos.evaluate(e=>{let p=null;e.addEventListener('keydown',ev=>{p=ev.defaultPrevented},{once:true});e.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true,cancelable:true}));return p});
    await espera(page,400);
    ok(prev===false&&await indice(s)===1,'teclado: Alt+← no se bloquea ni cambia de foto');
    await page.keyboard.press('Shift+Enter');await espera(page,400);
    ok(await enfocada(s).count()===0,'teclado: Mayús+Enter no abre la vista');
    await s.fotos.evaluate(e=>e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true})));await espera(page,400);
    ok(await enfocada(s).count()===0,'teclado: Enter mantenido (repetido) no abre la vista');
    // Solo el reel activo es parada de Tab.
    ok(await page.evaluate(()=>[...document.querySelectorAll('#reels .reel:not(.on) .carrusel, #reels .reel:not(.on) .expandir')].every(e=>e.tabIndex===-1)),'teclado: los reels no activos no son paradas de Tab');
    await cerrarCtx(s,'videos');
  }
}finally{await browser.close();}
console.log(`${checks} comprobaciones aprobadas`);
