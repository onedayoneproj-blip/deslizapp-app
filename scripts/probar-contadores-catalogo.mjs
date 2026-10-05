// Demo aislada: likes y trabajo pendiente. No usa ni modifica solicitudes reales.
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { navegador, URL } from "./navegador-catalogo.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const base=construirDesdeSeed(),t=base.tiendas.find(t=>t.slug==="esencias-michel"),p=base.productos.find(p=>p.tiendaId===t.id&&p.slug==="mayar"),c=base.clientes.find(c=>c.tiendaId===t.id&&c.telefono);
base.pedidos=[];base.pedidoItems=[];base.abonos=[];base.promos=[];base.solicitudes=[];p.stock=10;p.likes=1;p.activo=true;
const solicitud=(codigo,extra={})=>({id:"fixture-"+codigo,tiendaId:t.id,codigo,items:[{productoId:p.id,varianteId:null,nombre:p.nombre,varianteTexto:null,foto:p.fotos[0]??null,precioUnitario:p.precio,cantidad:1,porEncargo:false}],total:p.precio,descuento:0,codigoPromo:null,creadaEn:new Date().toISOString(),venceEn:new Date(Date.now()+86400000).toISOString(),pedidoId:null,descartadaEn:null,dispositivo:"contador-fixture",...extra});
base.solicitudes=[solicitud("PRUEBAAA23"),solicitud("PRUEBAB234"),solicitud("OTRAPAAA23",{tiendaId:base.tiendas.find(x=>x.id!==t.id).id})];
const out=process.env.CAPTURAS??"/tmp/correcciones-evidencia";mkdirSync(out,{recursive:true});const resultados=[],browser=await navegador();
const btn=(p,n)=>p.getByRole("button",{name:n,exact:true});
async function cuentas(page,nuevos,solicitudes,total){
 const name=`Nuevos, ${nuevos} ${nuevos===1?"pedido registrado nuevo":"pedidos registrados nuevos"} y ${solicitudes} ${solicitudes===1?"solicitud del catálogo por registrar":"solicitudes del catálogo por registrar"}`;
 await btn(page,name).waitFor({state:"attached"});const texto=(await btn(page,name).innerText()).replace(/\s/g,"");assert.equal(texto,`Nuevos${total||""}`);
 const nav=page.getByRole("link",{name:name.replace("Nuevos,","Pedidos,"),exact:true,includeHidden:true});await nav.waitFor({state:"attached"});assert.equal(await nav.locator("[data-n]").count(),total ? 1 : 0);
 if(total) assert.equal(await nav.locator("[data-n]").getAttribute("data-n"),String(total));
}
try {for(const width of [360,390,430]){
 const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:"block"}),page=await ctx.newPage();page.setDefaultTimeout(15000);
 const errores=[];page.on("pageerror",e=>errores.push(e.message));await ctx.route("**/*.supabase.co/**",r=>r.abort());
 await ctx.addInitScript(({d,t})=>{if(!localStorage.getItem("deslizapp-demo-v5"))localStorage.setItem("deslizapp-demo-v5",JSON.stringify(d));localStorage.setItem("deslizapp-modo-v1","demo");localStorage.setItem("deslizapp-sesion-v1",t);localStorage.setItem("deslizapp-version-vista","9.9.9");localStorage.setItem("dz-coach-esencias-michel","1");},{d:base,t:t.id});
 await page.goto(`${URL}/tienda/${t.slug}?demo#p/mayar`);const reel=page.locator("#r-mayar"),like=reel.locator(".acts .like");
 for(const likes of [1,2,12,1234567890,0]){
  await page.evaluate(({id,n})=>{const d=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));d.productos.find(p=>p.id===id).likes=n;localStorage.setItem("deslizapp-demo-v5",JSON.stringify(d));},{id:p.id,n:likes});await page.reload();await reel.waitFor();await reel.evaluate(el=>el.scrollIntoView());await page.waitForTimeout(450);
  const frase=likes===1?"1 lo quiere":`${likes} lo quieren`;
  if(likes){assert.equal(await like.locator(".likes-count").innerText(),String(likes));assert.equal(await like.locator(".likes-phrase").innerText(),likes===1?"Lo quiere":"Lo quieren");assert((await like.getAttribute("aria-label")).includes(frase));const pos=await like.evaluate(el=>{const i=el.querySelector("svg").getBoundingClientRect(),s=el.querySelector(".likes-count").getBoundingClientRect(),b=el.getBoundingClientRect();return {i:i.toJSON(),s:s.toJSON(),b:b.toJSON()};});assert(pos.i.bottom<=pos.s.top);const frasePos=await like.locator(".likes-phrase").boundingBox();assert(pos.s.bottom<=frasePos.y);assert(Math.abs((pos.i.x+pos.i.width/2)-(pos.s.x+pos.s.width/2))<1);assert(pos.b.width>=44&&pos.b.height>=44);assert.equal(await like.locator(".cnt").count(),0);if(likes!==2)await page.screenshot({path:`${out}/likes-${likes}-${width}.png`});}
  else {assert.equal(await like.innerText(),"Lo quiero");assert.equal(await like.locator(".likes-count").count(),0);}
  await like.click();assert.equal(await like.getAttribute("aria-pressed"),"true");assert((await like.getAttribute("aria-label")).startsWith("Quitar del carrito:"));await reel.locator(".burst.go").waitFor();assert.equal(await page.locator("#bagDock .cnt").innerText(),"1");await like.click();assert.equal(await like.getAttribute("aria-pressed"),"false");
 }
 await page.evaluate(id=>{const d=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));Object.assign(d.productos.find(p=>p.id===id),{stock:0,porEncargo:false,likes:10});localStorage.setItem("deslizapp-demo-v5",JSON.stringify(d));},p.id);await page.reload();await reel.waitFor();await reel.evaluate(el=>el.scrollIntoView());await btn(page,"Avísame: "+p.nombre).waitFor();assert.equal(await reel.locator(".likes-count").count(),0);
 await page.evaluate(id=>{const d=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));d.productos.find(p=>p.id===id).stock=10;localStorage.setItem("deslizapp-demo-v5",JSON.stringify(d));},p.id);
 await page.goto(`${URL}/pedidos`);await cuentas(page,0,2,2);await page.getByRole("link",{name:"2 pedidos del catálogo por registrar",exact:true}).waitFor();await page.screenshot({path:`${out}/pendientes-${width}.png`});
 // Registra la segunda de dos solicitudes: pasa a Nuevo sin cambiar el total.
 await page.getByRole("link",{name:"2 pedidos del catálogo por registrar",exact:true}).click();const lista=page.getByRole("dialog",{name:"Por registrar",exact:true});await lista.getByRole("button",{name:new RegExp("PRUEBAB234")}).click();const hoja=page.getByRole("dialog",{name:"Pedido del catálogo",exact:true});await hoja.getByText(/#PRUEBAB234/).waitFor();assert.equal(await hoja.getByText(/#PRUEBAAA23/).count(),0);
 await btn(page,"Elegir quién te escribió").click();await page.getByRole("searchbox",{name:"Buscar cliente"}).fill(c.telefono);await hoja.getByRole("button",{name:new RegExp(c.nombre)}).click();await btn(page,"Registrar pedido").click();await hoja.getByText("Registrado.",{exact:true}).waitFor();
 await btn(page,"Ver pedido").click();await page.waitForURL(/\/pedidos\//);await cuentas(page,1,1,2);await btn(page,"Confirmar pedido").click();await cuentas(page,0,1,1);
 await page.goto(`${URL}/pedidos`);await btn(page,/^Nuevos,/).click();await page.getByRole("link",{name:"1 pedido del catálogo por registrar",exact:true}).click();await page.getByRole("dialog",{name:"Por registrar",exact:true}).getByRole("button",{name:/PRUEBAAA23/}).click();await btn(page,"No es un pedido").click();await page.getByRole("alertdialog").getByRole("button",{name:"No es un pedido",exact:true}).click();await hoja.getByText("Listo, no era un pedido.",{exact:true}).waitFor();await cuentas(page,0,0,0);
 const d=await page.evaluate(()=>JSON.parse(localStorage.getItem("deslizapp-demo-v5")));assert.equal(d.pedidos.length,1);assert.equal(d.pedidos[0].estado,"por_despachar");assert.equal(d.solicitudes.find(s=>s.codigo==="OTRAPAAA23").pedidoId,null);
 if(width===360){
  await page.goto(`${URL}/pedidos`);
  await page.clock.install({time:new Date()});
  await page.evaluate(({a,b})=>{const d=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));d.solicitudes=[a,b];d.pedidos=[];d.pedidoItems=[];localStorage.setItem("deslizapp-demo-v5",JSON.stringify(d));},{a:solicitud("PRUEBAAA23"),b:solicitud("PRUEBAB234",{venceEn:new Date(Date.now()+12000).toISOString()})});
  await page.reload();await cuentas(page,0,2,2);await page.clock.fastForward(12000);await cuentas(page,0,1,1);
 }
 assert.deepEqual(errores,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));resultados.push({width,passed:true,likes:[1,2,12,1234567890,0],selected:true,aaah:true,bag:true,soldOut:true,initial:{new:0,requests:2,total:2},registered:{new:1,requests:1,total:2},confirmed:{new:0,requests:1,total:1},discarded:{new:0,requests:0,total:0},otherStoreUnaffected:true});await ctx.close();console.log("✓",width);
}}finally{await browser.close();writeFileSync(`${out}/contadores-resultados.json`,JSON.stringify(resultados,null,2));}
