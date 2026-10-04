// Lecturas reales; TODAS las escrituras RPC se interceptan. WhatsApp también se intercepta, nunca se envía.
import { navegador, URL } from './navegador-catalogo.mjs';
import {writeFileSync}from'node:fs';
const b=await navegador();const resultados=[];
try{for(const caso of ['sin-red','limite']){
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await ctx.addInitScript(()=>localStorage.setItem('dz-coach-esencias-michel','1'));
 const p=await ctx.newPage();const abiertas=[];let intentos=0;
 await p.route('**/rest/v1/rpc/**',async r=>{
  const nombre=new globalThis.URL(r.request().url()).pathname.split('/').at(-1);
  if(['catalogo_publico','ver_solicitud'].includes(nombre))return r.continue();
  if(nombre==='crear_solicitud_pedido'){intentos++;return caso==='sin-red'?r.abort('failed'):r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({code:'54000',message:'demasiadas_solicitudes'})});}
  return r.fulfill({contentType:'application/json',body:'null'});
 });
 await p.route('https://wa.me/**',r=>{abiertas.push(r.request().url());return r.fulfill({contentType:'text/html',body:'WhatsApp preparado sin enviar'});});
 await p.goto(URL+'/tienda/esencias-michel#p/delilah');await p.waitForSelector('#r-delilah');
 await p.locator('#r-delilah .acts [data-like]').click();await p.locator('#bagDock button').click();await p.locator('#sheetSend').click();
 if(caso==='sin-red'){await p.waitForURL('https://wa.me/**');const mensaje=new globalThis.URL(abiertas[0]).searchParams.get('text');if(mensaje.includes('/pedido/')||!mensaje.includes('Total:'))throw new Error('Fallback incorrecto');}
 else{await p.waitForSelector('#dzToast');if(abiertas.length)throw new Error('El límite abrió WhatsApp');if(!(await p.locator('#dzToast').innerText()).trim())throw new Error('Falta mensaje');}
 if(intentos!==1)throw new Error('Se duplicó la solicitud');console.log('✓',caso,'sin escrituras reales y sin doble envío');resultados.push({caso,paso:true});await ctx.close();
}}finally{await b.close();writeFileSync('docs/capturas/catalogo-react/errores.json',JSON.stringify(resultados,null,2)+'\n');}
