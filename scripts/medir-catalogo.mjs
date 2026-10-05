// Lecturas únicamente. El histórico rendimiento.json permanece intacto.
import { navegador, URL } from './navegador-catalogo.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const salida=process.env.SALIDA??'docs/capturas/catalogo-react/rendimiento-lab', etiqueta=process.env.ETIQUETA??'actual';
const veces=Number(process.env.VECES??5), ventana=12000;
const b=await navegador(),resultados=[];mkdirSync(salida,{recursive:true});
function observar(){
 localStorage.setItem('dz-coach-esencias-michel','1');
 const m=window.__catalogoLab={foto:null,utilizable:null,lcp:0,cls:0,decodificacionMs:null};
 new PerformanceObserver(l=>{for(const e of l.getEntries())m.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)m.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
 let src='';const revisar=async()=>{
  const reel=document.querySelector('.reel.on'),im=reel?.querySelector('.medio img'),rect=im?.getBoundingClientRect();
  if(im&&im.complete&&im.naturalWidth>1&&rect?.height>100&&rect.bottom>100&&rect.top<innerHeight&&im.currentSrc!==src){
   src=im.currentSrc;const antes=performance.now();await im.decode().catch(()=>{});m.decodificacionMs=performance.now()-antes;m.foto??=performance.now();m.imagen={url:im.currentSrc,natural:[im.naturalWidth,im.naturalHeight],caja:[rect.width,rect.height],dpr:devicePixelRatio};
  }
  const boton=reel?.querySelector('.mas'),props=boton&&Object.keys(boton).find(k=>k.startsWith('__reactProps$'));
  if(m.foto&&reel?.querySelector('h2')?.textContent&&reel?.querySelector('strong')?.textContent&&props&&boton[props]?.onClick&&!boton.disabled&&!document.querySelector('[role=dialog]'))m.utilizable??=performance.now();
  if(!m.utilizable)requestAnimationFrame(revisar);
 };requestAnimationFrame(revisar);
}
async function medir(ctx,n,tipo){
 const p=await ctx.newPage();await p.bringToFront();const cd=await ctx.newCDPSession(p);
 await cd.send('Network.enable');await cd.send('Network.setBlockedURLs',{urls:['*/rest/v1/rpc/crear_solicitud_pedido','*/rest/v1/rpc/registrar_aaah','*/rest/v1/rpc/pedir_aviso']});
 await cd.send('Network.setCacheDisabled',{cacheDisabled:tipo==='fria'});
 await cd.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8,connectionType:'cellular4g'});
 await cd.send('Emulation.setCPUThrottlingRate',{rate:1});
 const recursos=new Map();let inicio;const elapsed=()=>Date.now()-inicio;
 cd.on('Network.requestWillBeSent',e=>recursos.set(e.requestId,{url:e.request.url,tipo:e.type,inicio:elapsed(),prioridad:e.request.initialPriority,iniciador:e.initiator.type}));
 cd.on('Network.responseReceived',e=>Object.assign(recursos.get(e.requestId)??{},{respuesta:elapsed(),status:e.response.status,mime:e.response.mimeType,compresion:e.response.headers['content-encoding']??e.response.headers['Content-Encoding']??null,cache:e.response.fromDiskCache,sw:e.response.fromServiceWorker}));
 cd.on('Network.loadingFinished',e=>Object.assign(recursos.get(e.requestId)??{},{fin:elapsed(),bytes:e.encodedDataLength}));
 const errores=[];p.on('pageerror',e=>errores.push(e.message));
 await cd.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,loading',transferMode:'ReturnAsStream'});
 inicio=Date.now();await p.goto(URL+'/tienda/esencias-michel'+(process.env.HASH??''),{waitUntil:'commit'});
 await p.waitForFunction(()=>window.__catalogoLab?.utilizable,{timeout:45000});
 const tiempo=await p.evaluate(()=>window.__catalogoLab);
 const transferenciaPrimerReel=[...recursos.values()].filter(r=>r.fin!==undefined&&r.fin<=tiempo.utilizable).reduce((n,r)=>n+(r.bytes??0),0);
 // Prueba una interacción sin escribir ni abrir otras vistas en la ventana inicial.
 await p.locator('.reel.on .mas').click();await p.waitForFunction(()=>document.querySelector('.reel.on.open'));const respuestaControl=elapsed();await p.locator('.reel.on .menos').click();
 await p.waitForTimeout(Math.max(0,ventana-elapsed()));
 const metricas=await p.evaluate(()=>({...window.__catalogoLab,nav:performance.getEntriesByType('navigation')[0]?.toJSON(),recursos:performance.getEntriesByType('resource').map(r=>({url:r.name,inicio:r.startTime,duracion:r.duration,bytes:r.transferSize,encoded:r.encodedBodySize})),sw:!!navigator.serviceWorker?.controller}));
 const red=[...recursos.values()].map(r=>({...r}));await p.screenshot({path:salida+'/'+etiqueta+'-'+tipo+'-'+n+'.png'});
 const inicioSiguiente=elapsed();await p.evaluate(()=>document.querySelector('.reel.on')?.nextElementSibling?.scrollIntoView({block:'start'}));
 await p.waitForFunction(()=>{const im=document.querySelector('.reel.on .medio img');return im?.complete&&im.naturalWidth>1;},{},{timeout:15000});const siguienteMs=elapsed()-inicioSiguiente;
 const inicioCarrito=elapsed();await p.locator('#bagDock').click();await p.waitForSelector('#orBg',{state:'visible'});const carritoMs=elapsed()-inicioCarrito;
 let terminar;const traza=new Promise(resolve=>terminar=resolve);cd.once('Tracing.tracingComplete',terminar);await cd.send('Tracing.end');const {stream}=await traza;let texto='';for(;;){const r=await cd.send('IO.read',{handle:stream});texto+=r.data;if(r.eof)break;}await cd.send('IO.close',{handle:stream});writeFileSync(salida+'/'+etiqueta+'-'+tipo+'-'+n+'-trace.json',texto);
 const datos={etiqueta,tipo,n,tiempo,transferenciaPrimerReel,transferenciaVentana:red.reduce((n,r)=>n+(r.bytes??0),0),solicitudesVentana:red.length,respuestaControl,metricas,red,errores,siguienteMs,carritoMs};resultados.push(datos);
 console.log(JSON.stringify({tipo,n,foto:tiempo.foto,utilizable:tiempo.utilizable,lcp:metricas.lcp,cls:metricas.cls,bytes:datos.transferenciaVentana,siguienteMs,carritoMs,errores}));await p.close();
}
try{
 for(let n=1;n<=veces;n++){const ctx=await b.newContext({storageState:process.env.AUTH_STATE_FILE??undefined,viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});await ctx.addInitScript(observar);await medir(ctx,n,'fria');await ctx.close();}
 const ctx=await b.newContext({storageState:process.env.AUTH_STATE_FILE??undefined,viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'allow'});await ctx.addInitScript(observar);await medir(ctx,1,'normal-inicial');await medir(ctx,2,'repetida');await ctx.close();
}finally{
 writeFileSync(salida+'/'+etiqueta+'.json',JSON.stringify({etiqueta,origen:URL,fecha:new Date().toISOString(),navegador:await b.version(),perfil:{ancho:390,alto:844,dpr:1,red:'1.6 Mbps / 150 ms',cpu:1,ventanaMs:ventana},resultados,nota:'Contextos fríos, SW bloqueado; repetida SW normal. CDN/optimizador servidor no se purga. CDP mide tamaños externos; Resource Timing 0 sin TAO no es ahorro. No es Safari físico.'},null,2)+'\n');await b.close();
}
