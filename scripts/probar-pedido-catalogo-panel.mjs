// Fixtures DEMO aislados. Nunca modifica solicitudes reales ni envía WhatsApp.
// URL=http://localhost:3300 ANCHOS=360,390,430 TEMAS=claro,oscuro REDUCIDO=1 node scripts/probar-pedido-catalogo-panel.mjs
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { navegador, URL } from "./navegador-catalogo.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { registrarSolicitudEnDB } = await import("../lib/data/catalogo.ts");
const { cambiarEstadoPedido, despacharPedido, deshacerDespacho } = await import("../lib/data/pedidos.ts");
const b = await navegador(), resultados = [], clave = "deslizapp-demo-v5";
const caps = process.env.CAPTURAS ?? "docs/capturas/pedido-catalogo-panel";
mkdirSync(caps, { recursive: true });
const codigo = "PRUEBAAA23", codigoVariante = "PRUEBAB234";
const base = construirDesdeSeed();
base.promos = []; base.pedidos = []; base.pedidoItems = []; base.abonos = []; base.solicitudes = [];
const michel = base.tiendas.find(t => t.slug === "esencias-michel"), lino = base.tiendas.find(t => t.rubro === "ropa");
const mayar = base.productos.find(p => p.tiendaId === michel.id && p.slug === "mayar");
const majestic = base.productos.find(p => p.tiendaId === michel.id && p.slug === "majestic");
for (const p of [mayar, majestic]) { p.stock = 5; p.activo = true; }
const camisa = base.productos.find(p => p.tiendaId === lino.id && p.opciones.length);
camisa.activo = true; camisa.porEncargo = false;
const vs = base.variantes.filter(v => v.productoId === camisa.id && v.activa);
const agotada = vs[0], disponible = vs[1]; agotada.stock = 0; disponible.stock = 4;
camisa.stock = vs.reduce((n,v) => n + (v.stock ?? 0), 0);
base.avisos = [{ id:"aviso-prueba-panel", tiendaId:lino.id, productoId:camisa.id, varianteId:agotada.id, telefono:"18095550177", nombre:"Carolina Prueba", creadoEn:new Date().toISOString(), avisadoEn:null }, { id:"aviso-otra-variante", tiendaId:lino.id, productoId:camisa.id, varianteId:disponible.id, telefono:"18295550188", nombre:"Otra variante", creadoEn:new Date().toISOString(), avisadoEn:null }];
const ana = { ...base.clientes.find(c => c.tiendaId === michel.id), id: "prueba-ana-1", nombre: "Ana", telefono: "+18095550142", nota: null };
const ana2 = { ...ana, id: "prueba-ana-2", telefono: "+18295550198" };
base.clientes.push(ana, ana2);
const linea = (p, v = null, cantidad = 1) => ({ productoId:p.id, varianteId:v?.id ?? null, nombre:p.nombre, varianteTexto:v ? Object.values(v.valores).join(" · ") : null, foto:p.fotos[0] ?? null, precioUnitario:p.precio, cantidad, porEncargo:false });
const solicitud = (t,c,items,descuento = 0) => ({ id: "prueba-"+c, tiendaId:t.id, codigo:c, items, codigoPromo:null, descuento, total:items.reduce((n,i)=>n+i.precioUnitario*i.cantidad,0)-descuento, creadaEn:new Date().toISOString(), venceEn:new Date(Date.now()+7*86400000).toISOString(), pedidoId:null, descartadaEn:null, dispositivo:"prueba-panel" });
base.solicitudes.push(solicitud(michel,codigo,[linea(mayar),linea(majestic)]),solicitud(lino,codigoVariante,[linea(camisa,agotada),linea(camisa,disponible,2)],300));
const datos = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)),clave);
const guardarFixture = async (p,d) => { await p.evaluate(({k,d}) => {localStorage.setItem(k,JSON.stringify(d));window.dispatchEvent(new StorageEvent("storage",{key:k}));},{k:clave,d}); };
const hoja = p => p.getByRole("dialog",{name:"Pedido del catálogo",exact:true});
const boton = (p,name) => p.getByRole("button",{name,exact:true});
const foto = async (p,n,c) => {if(c.ancho===390 && c.tema==="claro" && !c.reducido) await p.screenshot({path:`${caps}/${n}.png`});};
async function pagina(c, d = base, tienda = michel.id) {
 const ctx=await b.newContext({viewport:{width:c.ancho,height:844},isMobile:true,hasTouch:true,reducedMotion:c.reducido?"reduce":"no-preference",serviceWorkers:"block"}), p=await ctx.newPage();
 p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(60000); const errores=[];p.on("pageerror",e=>errores.push(e.message));
 await ctx.route("**/rest/v1/**",r=>r.abort()); // Ninguna escritura/lectura remota accidental en esta suite demo.
 await ctx.route("https://wa.me/**",r=>r.fulfill({contentType:"text/html",body:"<p>WhatsApp preparado; no enviado.</p>"}));
 await ctx.addInitScript(({d,tienda})=>{
  if(!localStorage.getItem("deslizapp-demo-v5"))localStorage.setItem("deslizapp-demo-v5",JSON.stringify(d));
  localStorage.setItem("deslizapp-modo-v1","demo");localStorage.setItem("deslizapp-sesion-v1",tienda);localStorage.setItem("deslizapp-version-vista","9.9.9");
  for(const t of d.tiendas)localStorage.setItem("dz-coach-"+t.slug,"1");
  window.__abiertos=[];window.open=url=>{window.__abiertos.push(String(url));return {opener:null};};
  let teclado=false;Object.defineProperty(visualViewport,"height",{get:()=>innerHeight-(teclado?336:0),configurable:true});
  window.__teclado=a=>{teclado=a;visualViewport.dispatchEvent(new Event("resize"));visualViewport.dispatchEvent(new Event("scroll"));};
 },{d,tienda});
 if(c.tema==="oscuro") {const ir=p.goto.bind(p);p.goto=async(...args)=>{const r=await ir(...args);await p.waitForSelector("main");await p.evaluate(()=>{document.documentElement.dataset.theme="dark";new MutationObserver(()=>{if(document.documentElement.dataset.theme!=="dark")document.documentElement.dataset.theme="dark";}).observe(document.documentElement,{attributes:true});});return r;};}
 return {ctx,p,errores};
}
async function tienda(p,cod=codigo){await p.goto(`${URL}/pedido/${cod}?demo`);await boton(p,"Entra para registrarlo").click();await boton(p,"Ver como la tienda (demo)").click();await hoja(p).waitFor();}
async function elegirAna(p){await boton(p,"Elegir quién te escribió").click();await p.getByRole("searchbox",{name:"Buscar cliente"}).fill(ana.telefono);await hoja(p).getByRole("button",{name:/^Ana/}).click();}
async function registrar(p){await elegirAna(p);await boton(p,"Registrar pedido").click();await hoja(p).getByText("Registrado.",{exact:true}).waitFor();return (await datos(p)).solicitudes.find(s=>s.codigo===codigo).pedidoId;}
const escenarios = [
 ["01 solicitud desde catálogo",async(p,c)=>{
  await p.goto(`${URL}/tienda/${michel.slug}?demo`);await p.locator("#r-mayar .acts [data-like]").click();await p.locator("#bagDock button").click();const antes=await datos(p);await p.locator("#sheetSend").click();await p.waitForURL("https://wa.me/**");
  await p.goto(`${URL}/tienda/${michel.slug}?demo`);await p.locator("#r-mayar").waitFor();const d=await datos(p),s=d.solicitudes.at(-1);assert.equal(d.pedidos.length,antes.pedidos.length);assert.equal(d.clientes.length,antes.clientes.length);assert.deepEqual(d.productos.map(p=>[p.id,p.stock]),antes.productos.map(p=>[p.id,p.stock]));await p.goto(`${URL}/pedido/${s.codigo}?demo`);await p.getByText("Le llegó a Michel",{exact:true}).waitFor();assert.equal(await p.locator(".pvest-pasos li").count(),3);await foto(p,"comprador-enviado",c);
 }],
 ["02 comprador y tienda demo",async(p,c)=>{
  await p.goto(`${URL}/pedido/${codigo}?demo`);await boton(p,"Entra para registrarlo").waitFor();assert.equal(await hoja(p).count(),0);await boton(p,"Entra para registrarlo").click();await foto(p,"eres-la-tienda",c);await boton(p,"Ver como la tienda (demo)").click();await boton(p,"Elegir quién te escribió").waitFor();await foto(p,"registrar",c);
 }],
 ["03 selector compartido",async(p,c)=>{
  await tienda(p);await boton(p,"Elegir quién te escribió").click();const input=p.getByRole("searchbox",{name:"Buscar cliente"});await input.fill("Ana");assert.equal(await hoja(p).getByRole("button",{name:/^Ana/}).count(),2);await hoja(p).getByRole("button",{name:/Crear «Ana»/}).waitFor();await input.fill("809 555");await hoja(p).getByRole("button",{name:/Crear «809 555»/}).waitFor();await foto(p,"selector-busqueda",c);await input.fill("809-555-0142");assert.equal(await hoja(p).getByRole("button",{name:/Crear/}).count(),0);assert.equal(await hoja(p).getByRole("button",{name:/^Ana/}).count(),1);
 }],
 ["04 variantes quitar deshacer encargo",async(p,c)=>{
  await tienda(p,codigoVariante);const filas=hoja(p).getByRole("list",{name:"Lo que pidió"}).getByRole("listitem");await foto(p,"registrar-agotado",c);await filas.nth(0).getByRole("button",{name:/Quitar/}).click();assert.equal(await filas.nth(1).getByRole("button",{name:/Quitar/}).count(),1);await boton(p,"Deshacer").click();await filas.nth(0).getByRole("button",{name:"Por encargo",exact:true}).click();await foto(p,"registrar-resuelto",c);await filas.nth(0).getByRole("button",{name:/Quitar/}).click();await filas.nth(1).getByRole("button",{name:/Quitar/}).click();assert(await boton(p,"Registrar pedido").isDisabled());assert.equal((await datos(p)).pedidos.length,0);
 }],
 ["05 cliente provisional nota y cancelar",async(p,c)=>{
  await tienda(p);await boton(p,"Elegir quién te escribió").click();await hoja(p).getByRole("button",{name:/Nuevo cliente/}).click();await p.getByRole("textbox",{name:"Nombre del cliente"}).fill("Paola Prueba");await p.getByRole("textbox",{name:"WhatsApp del cliente"}).fill("8495550199");await p.getByRole("textbox",{name:/Nota/}).fill("Nota provisional");assert.equal((await datos(p)).clientes.some(c=>c.nombre==="Paola Prueba"),false);
  await hoja(p).getByRole("button",{name:"Cerrar"}).click();await p.getByRole("alertdialog").waitFor();await boton(p,"Seguir aquí").click();assert.equal(await p.getByRole("textbox",{name:"Nombre del cliente"}).inputValue(),"Paola Prueba");await boton(p,"Usar este cliente").click();await boton(p,"Registrar pedido").click();await hoja(p).getByText("Registrado.",{exact:true}).waitFor();const d=await datos(p);assert.equal(d.clientes.filter(c=>c.nombre==="Paola Prueba").length,1);assert.equal(d.clientes.find(c=>c.nombre==="Paola Prueba").nota,"Nota provisional");await foto(p,"registrado",c);
 }],
 ["06 registrar estados y ver pedido",async(p,c)=>{
  await tienda(p);const id=await registrar(p),d=await datos(p);assert.equal(d.pedidos.length,1);assert.equal(d.pedidos[0].estado,"nuevo");await boton(p,"Ver pedido").click();await p.waitForURL(`${URL}/pedidos/${id}`);await boton(p,"Confirmar pedido").click();await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).pedidos[0].estado==="por_despachar",clave);await p.goto(`${URL}/pedido/${codigo}?demo`);await p.getByText("Michel lo confirmó",{exact:true}).waitFor();await foto(p,"comprador-confirmado",c);
  await p.goto(`${URL}/pedidos/${id}`);await boton(p,"Despachar pedido").click();await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).pedidos[0].estado==="despachado",clave);await p.goto(`${URL}/pedido/${codigo}?demo`);await p.getByText("Va en camino",{exact:true}).waitFor();await foto(p,"comprador-despachado",c);
  const despues=await datos(p);await guardarFixture(p,{...despues,pedidos:despues.pedidos.map(x=>x.id===id?{...x,estado:"cancelado"}:x)});await p.reload();await p.getByText("Se canceló",{exact:true}).waitFor();await foto(p,"comprador-cancelado",c);
 }],
 ["07 despacho y devolución por variante",async(p)=>{
  await tienda(p,codigoVariante);await boton(p,"Por encargo").click();await boton(p,"Elegir quién te escribió").click();await hoja(p).getByRole("button",{name:/Nuevo cliente/}).click();await p.getByRole("textbox",{name:"Nombre del cliente"}).fill("Lino Prueba");await p.getByRole("textbox",{name:"WhatsApp del cliente"}).fill("8095550176");await boton(p,"Usar este cliente").click();await boton(p,"Registrar pedido").click();await hoja(p).getByText("Registrado.",{exact:true}).waitFor();let d=await datos(p);const id=d.solicitudes.find(s=>s.codigo===codigoVariante).pedidoId;assert.equal(d.variantes.find(v=>v.id===disponible.id).stock,4);
  d=cambiarEstadoPedido(d,lino.id,id,"por_despachar").db;d=despacharPedido(d,lino.id,id,new Date().toISOString()).db;assert.equal(d.variantes.find(v=>v.id===agotada.id).stock,0);assert.equal(d.variantes.find(v=>v.id===disponible.id).stock,2);d=deshacerDespacho(d,lino.id,id,new Date().toISOString()).db;assert.equal(d.variantes.find(v=>v.id===disponible.id).stock,4);assert.equal(d.productos.find(x=>x.id===camisa.id).porEncargo,false);
 }],
 ["08 doble toque y registrada al recargar",async(p)=>{
  await tienda(p);await elegirAna(p);await boton(p,"Registrar pedido").evaluate(el=>{el.click();el.click();});await hoja(p).getByText("Registrado.",{exact:true}).waitFor();assert.equal((await datos(p)).pedidos.length,1);await tienda(p);await hoja(p).getByText("Este pedido ya está registrado.",{exact:true}).waitFor();await boton(p,"Ver pedido existente").waitFor();assert.equal((await datos(p)).pedidos.length,1);
 }],
 ["09 respaldo lista descarte y retorno",async(p,c)=>{
  await p.goto(`${URL}/pedidos`);await p.getByRole("link",{name:/1 pedido del catálogo por registrar/}).waitFor();await foto(p,"respaldo",c);await p.getByRole("link",{name:/1 pedido del catálogo por registrar/}).click();const lista=p.getByRole("dialog",{name:"Por registrar",exact:true});await lista.getByRole("button",{name:new RegExp(codigo)}).waitFor();await foto(p,"por-registrar",c);await lista.getByRole("button",{name:new RegExp(codigo)}).click();await hoja(p).getByRole("button",{name:"No es un pedido",exact:true}).click();await p.getByRole("alertdialog").getByRole("button",{name:"No es un pedido",exact:true}).click();await hoja(p).getByText("Listo, no era un pedido.",{exact:true}).waitFor();await hoja(p).getByRole("button",{name:"Cerrar",exact:true}).last().click();await lista.getByText("Nada por registrar.",{exact:true}).waitFor();assert.equal((await datos(p)).pedidos.length,0);
 }],
 ["10 vencida inexistente y registrada antigua",async(p,c)=>{
  let d=structuredClone(base);d.solicitudes[0].venceEn=new Date(Date.now()-86400000).toISOString();await p.goto(`${URL}/pedido/${codigo}?demo`);await guardarFixture(p,d);await p.reload();await p.getByText("Este pedido venció",{exact:true}).waitFor();await foto(p,"comprador-vencido",c);await p.goto(`${URL}/pedido/ZZZZZZZZ22?demo`);await p.getByText("Este pedido no está disponible",{exact:true}).waitFor();
  d=structuredClone(base);const r=registrarSolicitudEnDB(d,michel.id,d.solicitudes[0].id,{clienteId:ana.id},()=>crypto.randomUUID(),new Date().toISOString());r.db.solicitudes[0].venceEn=new Date(Date.now()-8*86400000).toISOString();await guardarFixture(p,r.db);await p.goto(`${URL}/pedido/${codigo}?demo`);await p.getByText("Michel lo confirmó",{exact:true}).waitFor();
 }],
 ["11 teclado atrás borrador y cierres",async(p,c)=>{
  await tienda(p);await boton(p,"Elegir quién te escribió").click();const buscar=p.getByRole("searchbox",{name:"Buscar cliente"});await buscar.fill("809 555");assert(await buscar.evaluate(el=>document.activeElement===el));await p.evaluate(()=>window.__teclado(true));await p.evaluate(()=>history.back());await boton(p,"Elegir quién te escribió").waitFor();await boton(p,"Elegir quién te escribió").click();assert.equal(await buscar.inputValue(),"809 555");await hoja(p).getByRole("button",{name:/Crear/}).click();const nombre=p.getByRole("textbox",{name:"Nombre del cliente"});await nombre.fill("Borrador persistente");await p.evaluate(()=>window.__teclado(false));
  for(const [etiqueta,texto] of [["Nombre del cliente","Borrador persistente"],["WhatsApp del cliente","8495550198"],["Nota","Nota para revisar"]]){
    const campo=p.getByRole("textbox",{name:etiqueta,exact:true});await campo.fill(texto);await campo.evaluate(el=>el.dataset.nodoPrueba="estable");
    for(const abierto of [true,false,true]){await p.evaluate(a=>window.__teclado(a),abierto);await p.waitForTimeout(80);assert(await campo.evaluate(el=>el.dataset.nodoPrueba==="estable"&&document.activeElement===el));}
  }
  await p.evaluate(()=>window.__teclado(false));await p.evaluate(()=>history.back());await boton(p,"Elegir quién te escribió").click();assert.equal(await nombre.inputValue(),"Borrador persistente");await p.keyboard.press("Escape");await p.getByRole("alertdialog").waitFor();await boton(p,"Seguir aquí").click();await foto(p,"cliente-provisional",c);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal((await datos(p)).clientes.some(c=>c.nombre==="Borrador persistente"),false);
  await p.evaluate(()=>history.back());await boton(p,"Elegir quién te escribió").waitFor();
  for(const cierre of ["equis","fondo","escape","atras","deslizar"]){
    if(cierre==="equis")await hoja(p).getByRole("button",{name:"Cerrar",exact:true}).click();
    if(cierre==="fondo")await p.mouse.click(c.ancho/2,5);
    if(cierre==="escape")await p.keyboard.press("Escape");
    if(cierre==="atras")await p.evaluate(()=>history.back());
    if(cierre==="deslizar"){const top=(await hoja(p).boundingBox()).y,cdp=await p.context().newCDPSession(p);await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:c.ancho/2,y:top+14}]});for(let i=1;i<=12;i++){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:c.ancho/2,y:top+14+i*40}]});await p.waitForTimeout(16);}await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await cdp.detach();}
    await p.getByRole("alertdialog").waitFor();await boton(p,"Seguir aquí").click();await hoja(p).waitFor();
  }
  await boton(p,"Elegir quién te escribió").click();assert.equal(await nombre.inputValue(),"Borrador persistente");

 }],
 ["12 avisos de variante repuesta",async(p,c)=>{
  await p.goto(`${URL}/catalogo`);await p.evaluate(id=>{localStorage.setItem("deslizapp-sesion-v1",id);window.dispatchEvent(new StorageEvent("storage",{key:"deslizapp-sesion-v1"}));},lino.id);
  await p.getByRole("button",{name:/Ver tu inventario/}).click();await p.getByRole("button",{name:/Por reponer/}).first().click();const lista=p.getByRole("list",{name:"Productos por reponer"});await lista.waitFor();for(const cb of await lista.getByRole("checkbox",{checked:true}).all())await cb.click();
  await lista.getByRole("checkbox",{name:new RegExp(camisa.nombre+".*"+Object.values(agotada.valores).join(" · "))}).click();await p.getByRole("radio",{name:"¡Ya la tengo!"}).click();await p.getByRole("button",{name:/^Sumar 1 al stock/}).click();await p.getByText("Ya llegó",{exact:true}).waitFor();await boton(p,"Avisar").waitFor();const antes=await datos(p);assert.equal(antes.variantes.find(v=>v.id===agotada.id).stock,1);assert.equal(antes.avisos.find(a=>a.id==="aviso-prueba-panel").avisadoEn,null);await foto(p,"ya-llego",c);
  await boton(p,"Avisar").click();assert.equal(await p.evaluate(()=>window.__abiertos.length),1);assert.equal((await datos(p)).avisos.find(a=>a.id==="aviso-prueba-panel").avisadoEn,null);await p.evaluate(()=>window.dispatchEvent(new Event("focus")));await p.getByText("Avisado",{exact:true}).waitFor();const despues=await datos(p);assert(despues.avisos.find(a=>a.id==="aviso-prueba-panel").avisadoEn);assert.equal(despues.avisos.find(a=>a.id==="aviso-otra-variante").avisadoEn,null);assert.equal(despues.pedidos.length,0);
 }],
 ["13 aislamiento al cambiar tienda",async(p)=>{
  await tienda(p);await p.evaluate(id=>{localStorage.setItem("deslizapp-sesion-v1",id);window.dispatchEvent(new StorageEvent("storage",{key:"deslizapp-sesion-v1"}));},lino.id);await p.getByText("Esta cuenta no es de esa tienda.",{exact:true}).waitFor();assert.equal(await boton(p,"Registrar pedido").count(),0);assert.equal((await datos(p)).pedidos.length,0);
 }],
];
const configuraciones=[];for(const ancho of (process.env.ANCHOS??"360,390,430").split(",").map(Number))for(const tema of (process.env.TEMAS??"claro,oscuro").split(","))configuraciones.push({ancho,tema,reducido:process.env.REDUCIDO==="solo"});
if(process.env.REDUCIDO==="1")configuraciones.push({ancho:390,tema:"claro",reducido:true});
for(const c of configuraciones)for(const [nombre,correr] of escenarios){if(process.env.SOLO&&!process.env.SOLO.split(",").includes(nombre.slice(0,2)))continue;const {ctx,p,errores}=await pagina(c);try{await correr(p,c);assert.equal(errores.length,0,errores.join("; "));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));resultados.push({nombre,...c,paso:true});console.log("✓",nombre,c.ancho,c.tema,c.reducido?"reducido":"");}catch(e){resultados.push({nombre,...c,paso:false,error:String(e)});console.error("✗",nombre,c.ancho,c.tema,String(e));await p.screenshot({path:`${caps}/fallo-${nombre.slice(0,2)}-${c.ancho}-${c.tema}.png`}).catch(()=>{});}finally{await ctx.close();}}
await b.close();writeFileSync(`${caps}/resultados.json`,JSON.stringify(resultados,null,2));const fallas=resultados.filter(r=>!r.paso);console.log(`${resultados.length-fallas.length}/${resultados.length} casos pasaron. Red real/resultado incierto/concurrencia: requieren suite de transporte/SQL; Demo no los simula.`);process.exitCode=fallas.length?1:0;
