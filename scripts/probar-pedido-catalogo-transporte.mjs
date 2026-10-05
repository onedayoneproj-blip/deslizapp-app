// Transporte Supabase SIMULADO en Chromium, no una prueba de tienda real ni OAuth.
// La página fixture temporal solo monta los componentes existentes; se elimina al terminar y jamás se publica.
import "../tests/cargar-ts.mjs";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { navegador, URL } from "./navegador-catalogo.mjs";
const { construirDesdeSeed } = await import("../lib/data/db.ts");
const { verSolicitudDeDB, registrarSolicitudEnDB } = await import("../lib/data/catalogo.ts");
const base = construirDesdeSeed();base.pedidos=[];base.pedidoItems=[];base.abonos=[];base.promos=[];
const t=base.tiendas[0], actor=base.usuarios.find(u=>u.tiendaId===t.id), p=base.productos.find(p=>p.tiendaId===t.id);
p.stock=5;p.activo=true;
const codigo="PRUEBAR234", s={id:"50000000-0000-4000-8000-000000000010",tiendaId:t.id,codigo,items:[{productoId:p.id,varianteId:null,nombre:p.nombre,varianteTexto:null,foto:p.fotos[0]??null,precioUnitario:p.precio,cantidad:1,porEncargo:false}],total:p.precio,descuento:0,codigoPromo:null,creadaEn:new Date().toISOString(),venceEn:new Date(Date.now()+86400000).toISOString(),pedidoId:null,descartadaEn:null,dispositivo:"transporte-fixture"};const segundoCodigo="PRUEBAT234", segunda={...s,id:"50000000-0000-4000-8000-000000000011",codigo:segundoCodigo};base.solicitudes=[s,segunda];
const aviso={id:"aviso-red-fixture",tiendaId:t.id,productoId:p.id,varianteId:null,telefono:"18095550177",nombre:"Ana Transporte",creadoEn:new Date().toISOString(),avisadoEn:null};base.avisos=[aviso];
const dir="app/prueba-pedido-catalogo",archivo=dir+"/page.tsx";
assert(!existsSync(dir),"No sobrescribir una ruta existente");mkdirSync(dir);
const datos=JSON.stringify({usuario:actor,producto:p,aviso,inicial:verSolicitudDeDB(base,codigo,"",Date.now()),segunda:verSolicitudDeDB(base,segundoCodigo,"",Date.now()),codigo,segundoCodigo});
writeFileSync(archivo,`"use client";\nimport {useSyncExternalStore} from "react";\nimport {PedidoComprador} from "@/components/tienda/pedido-comprador";\nimport {TarjetaYaLlego} from "@/components/catalogo/tarjeta-ya-llego";\nimport {ProveedorReal} from "@/lib/data/provider";\nimport {ToastProvider} from "@/components/toast";\nimport {ProveedorToast} from "@/components/ui";\nimport {Hoja} from "@/components/hoja";\nimport {NavInferior} from "@/components/panel/nav-inferior";\nimport {VistaPedidos} from "@/components/pedidos/vista-pedidos";\nimport {useData} from "@/lib/data/provider";\nimport type {Usuario,Producto,AvisoLlegada,VistaSolicitud} from "@/lib/types";\nimport "../tienda/catalogo.css";\nconst d=${datos};\nconst suscribir=()=>()=>{};\nfunction Recargar(){const {refrescar}=useData();return <button onClick={refrescar}>Actualizar fixture</button>;}\nexport default function Fixture(){const listo=useSyncExternalStore(suscribir,()=>true,()=>false);if(!listo)return null;return new URLSearchParams(location.search).has("panel")?<ToastProvider><ProveedorToast><ProveedorReal usuario={d.usuario as Usuario}><VistaPedidos><Recargar/></VistaPedidos><NavInferior/></ProveedorReal></ProveedorToast></ToastProvider>:new URLSearchParams(location.search).has("avisos")?<ToastProvider><ProveedorToast><ProveedorReal usuario={d.usuario as Usuario}><Hoja abierta alCerrar={()=>{}} titulo="Avisos fixture"><TarjetaYaLlego producto={d.producto as Producto} avisos={[d.aviso as AvisoLlegada]}/></Hoja></ProveedorReal></ProveedorToast></ToastProvider>:<PedidoComprador codigo={new URLSearchParams(location.search).get("codigo")===d.segundoCodigo?d.segundoCodigo:d.codigo} demo={false} inicial={(new URLSearchParams(location.search).get("codigo")===d.segundoCodigo?d.segunda:d.inicial) as VistaSolicitud}/>;}`);
const snake=o=>Array.isArray(o)?o.map(snake):o&&typeof o==="object"?Object.fromEntries(Object.entries(o).map(([k,v])=>[k.replace(/[A-Z]/g,l=>"_"+l.toLowerCase()),["detalles","valores","personalizacion"].includes(k)?v:snake(v)])):o;
const b=await navegador(), resultados=[];
const fixtureUser={id:actor.id,aud:"authenticated",role:"authenticated",email:"fixture@prueba.invalid",app_metadata:{provider:"google"},user_metadata:{},created_at:new Date().toISOString()};
const jwt=[Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"),Buffer.from(JSON.stringify({sub:actor.id,aud:"authenticated",role:"authenticated",exp:Math.floor(Date.now()/1000)+86400})).toString("base64url"),Buffer.from("firma-fixture-no-valida-en-produccion").toString("base64url")].join(".");
const session={access_token:jwt,refresh_token:"fixture",token_type:"bearer",expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user:fixtureUser};
async function caso(nombre,fn,{anon=false,otra=false,seleccion=undefined,query="",lecturaRota=false}={}){
 if(process.env.CASOS && !new RegExp(process.env.CASOS).test(nombre)) return;
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:"block"}),page=await ctx.newPage();page.setDefaultTimeout(15000);
 const estado={autenticado:!anon,oauthRedirect:null,db:structuredClone(base),escrituras:0,marcados:0,lecturaRota,perderRespuesta:false,escrituraRota:false,marcadoRoto:false,aperturaRota:false};
 await ctx.addInitScript(({valor,anon})=>{if(!anon)document.cookie="sb-euihaeyfdlpvmbtfzvnt-auth-token="+valor+"; path=/; SameSite=Lax";localStorage.setItem("deslizapp-version-vista","9.9.9");window.__abiertos=[];window.open=url=>{window.__abiertos.push(String(url));return window.__noAbrir?null:{opener:null};};},{valor:"base64-"+Buffer.from(JSON.stringify(session)).toString("base64url"),anon});
 const errores=[];page.on("pageerror",e=>errores.push(e.message));
 await ctx.route("**/*.supabase.co/**",async r=>{
  const req=r.request(),u=new globalThis.URL(req.url()),camino=u.pathname;
  const responder=body=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
  if(camino==="/auth/v1/settings")return responder({external:{google:true}});
  if(camino==="/auth/v1/authorize"){
   estado.oauthRedirect=u.searchParams.get("redirect_to");
   const retorno=new globalThis.URL(estado.oauthRedirect); const volver=retorno.searchParams.get("volver");
   assert.equal(retorno.origin,new globalThis.URL(URL).origin);assert.equal(retorno.pathname,"/auth/callback");
   assert.equal(volver,`/pedido/${seleccion??codigo}`);
   estado.autenticado=true;
   await ctx.addCookies([{name:"sb-euihaeyfdlpvmbtfzvnt-auth-token",value:"base64-"+Buffer.from(JSON.stringify(session)).toString("base64url"),url:URL}]);
   // Transporte simulado: el Route Handler real se prueba aparte en tests/auth-callback.test.mjs.
   return r.fulfill({status:302,headers:{location:`${URL}/prueba-pedido-catalogo?codigo=${seleccion??codigo}&registrar=1`},body:""});
  }
  if(camino==="/auth/v1/user")return estado.autenticado?responder(fixtureUser):r.fulfill({status:401,contentType:"application/json",body:'{"message":"sin sesión"}'});
  if(camino.startsWith("/auth/"))return r.abort();
  if(camino.includes("/rpc/registrar_solicitud")){
   estado.escrituras++;if(estado.escrituraRota)return r.abort();
   const d=req.postDataJSON();try {const res=registrarSolicitudEnDB(estado.db,t.id,s.id,{clienteId:d.p_cliente_id??undefined,clienteNuevo:d.p_cliente_nuevo??undefined,quitar:d.p_quitar,encargo:d.p_encargo},()=>crypto.randomUUID(),new Date().toISOString());estado.db=res.db;if(estado.perderRespuesta)return r.abort();return responder(snake(res.pedido));}catch(e){return r.fulfill({status:400,contentType:"application/json",body:JSON.stringify({code:"P0001",message:String(e)})});}
  }
  if(camino.includes("/rpc/marcar_avisado")){estado.marcados++;if(estado.marcadoRoto)return r.abort();estado.db.avisos[0].avisadoEn=new Date().toISOString();return responder(1);}
  if(camino.includes("/rpc/ver_solicitud"))return responder(snake(verSolicitudDeDB(estado.db,codigo,"",Date.now())));
  const tabla=camino.split("/").at(-1);let filas=[];
  if(tabla==="usuarios")filas=[snake({...actor,tiendaId:base.tiendas[1].id})]; // default distinto: la tienda objetivo debe venir de RLS.
  if(tabla==="solicitudes_pedido"){if(estado.lecturaRota)return r.abort();filas=otra?[]:estado.db.solicitudes.map(s=>({...snake(s),registrada_en:s.pedidoId?new Date().toISOString():null}));}
  if(tabla==="tiendas")filas=estado.db.tiendas.map(snake);
  if(tabla==="productos")filas=estado.db.productos.map(p=>({...snake(p),producto_variantes:estado.db.variantes.filter(v=>v.productoId===p.id).map(snake)}));
  if(tabla==="clientes")filas=estado.db.clientes.map(snake);
  if(tabla==="pedidos")filas=estado.db.pedidos.map(p=>({...snake(p),pedido_items:estado.db.pedidoItems.filter(i=>i.pedidoId===p.id).map(snake),abonos:[]}));
  if(tabla==="avisos_llegada")filas=estado.db.avisos.map(snake);
  if(req.method()!=="GET")return r.abort(); // Nunca se reenvía una escritura desconocida.
  for(const [key,value] of u.searchParams){if(value.startsWith("eq."))filas=filas.filter(f=>String(f[key])===value.slice(3));if(value==="is.null")filas=filas.filter(f=>f[key]===null);if(value.startsWith("gt."))filas=filas.filter(f=>String(f[key])>value.slice(3));}
  return responder(req.headers().accept?.includes("vnd.pgrst.object")?(filas[0]??null):filas);
 });
 try{await page.goto(`${URL}/prueba-pedido-catalogo?${nombre.startsWith("aviso")?"avisos&":""}${seleccion?"codigo="+seleccion+"&":""}${query}`);await fn(page,estado);assert.equal(errores.length,0,errores.join(";"));resultados.push({nombre,paso:true});console.log("✓",nombre);}catch(e){resultados.push({nombre,paso:false,error:String(e)});console.error("✗",nombre,String(e));await page.screenshot({path:"/tmp/panel-red-"+nombre+".png"});console.log((await page.locator("body").innerText()).slice(-1800));}finally{await ctx.close();}
}
const btn=(p,n)=>p.getByRole("button",{name:n,exact:true});
async function preparar(p){const hoja=p.getByRole("dialog",{name:"Pedido del catálogo",exact:true});await hoja.waitFor();await btn(p,"Elegir quién te escribió").click();await p.getByRole("searchbox",{name:"Buscar cliente"}).fill(base.clientes.find(c=>c.tiendaId===t.id&&c.telefono).telefono);await hoja.getByRole("button",{name:/Carolina/}).click();}
try{
 await caso("sin-sesion",async(p,e)=>{await btn(p,"Entra para registrarlo").click();await btn(p,"Entrar con Google").waitFor();assert.equal(e.escrituras,0);},{anon:true});
 await caso("otra-tienda",async(p,e)=>{await btn(p,"Entra para registrarlo").click();await p.getByText("Esta cuenta no es de esa tienda.",{exact:true}).waitFor();assert.equal(await btn(p,"Registrar pedido").count(),0);assert.equal(e.escrituras,0);},{otra:true});
 await caso("respuesta-perdida",async(p,e)=>{await preparar(p);e.perderRespuesta=true;e.lecturaRota=true;await btn(p,"Registrar pedido").click();await btn(p,"Comprobar registro").waitFor();assert.equal(e.escrituras,1);assert.equal(e.db.pedidos.length,1);e.lecturaRota=false;await btn(p,"Comprobar registro").click();await btn(p,"Ver pedido existente").waitFor();assert.equal(e.escrituras,1);assert.equal(e.db.pedidos.length,1);});
 await caso("red-caida-y-recuperada",async(p,e)=>{await preparar(p);e.escrituraRota=true;e.lecturaRota=true;await btn(p,"Registrar pedido").click();await btn(p,"Comprobar registro").waitFor();assert.equal(e.escrituras,1);assert.equal(e.db.pedidos.length,0);e.escrituraRota=false;e.lecturaRota=false;await btn(p,"Comprobar registro").click();await p.getByText("Sigue sin registrar. Revisa el borrador antes de registrarlo.",{exact:true}).waitFor();assert.equal(e.escrituras,1);await btn(p,"Registrar pedido").click();await p.getByText("Registrado.",{exact:true}).waitFor();assert.equal(e.escrituras,2);assert.equal(e.db.pedidos.length,1);});
 await caso("lectura-rota-con-reintento",async(p,e)=>{e.lecturaRota=true;await btn(p,"Entra para registrarlo").click();await btn(p,"Reintentar").waitFor();e.lecturaRota=false;await btn(p,"Reintentar").click();await btn(p,"Elegir quién te escribió").waitFor();assert.equal(e.escrituras,0);});
 for(const elegido of [codigo,segundoCodigo]) {
  await caso("google-retorno-"+elegido,async(p,e)=>{
   await btn(p,"Entra para registrarlo").click();await btn(p,"Entrar con Google").click();
   const hoja=p.getByRole("dialog",{name:"Pedido del catálogo",exact:true});await hoja.getByText(new RegExp("#"+elegido)).waitFor();
   assert.equal(await hoja.getByText(new RegExp("#"+(elegido===codigo?segundoCodigo:codigo))).count(),0);assert(e.oauthRedirect.includes("volver="));assert.equal(e.escrituras,0);
  },{anon:true,seleccion:elegido});
  await caso("sesion-valida-"+elegido,async(p,e)=>{await p.getByRole("dialog",{name:"Pedido del catálogo",exact:true}).getByText(new RegExp("#"+elegido)).waitFor();assert.equal(e.escrituras,0);},{seleccion:elegido});
 }
 await caso("error-login-especifico",async(p,e)=>{await p.getByText("No se pudo entrar con Google. Tu pedido sigue aquí: inténtalo otra vez.",{exact:true}).waitFor();await btn(p,"Entrar con Google").waitFor();assert.equal(e.escrituras,0);},{anon:true,seleccion:segundoCodigo,query:"registrar=1&error_login=1"});
 await caso("retorno-otra-tienda",async(p,e)=>{await p.getByText("Esta cuenta no es de esa tienda.",{exact:true}).waitFor();assert.equal(await btn(p,"Registrar pedido").count(),0);assert.equal(e.escrituras,0);},{otra:true,seleccion:segundoCodigo,query:"registrar=1"});
 for(const [estado,texto] of [["registrada","Este pedido ya está registrado."],["vencida","Este pedido venció."],["descartada","Lo marcaste como «No es un pedido»."]]) {
  await caso("retorno-"+estado,async(p,e)=>{
   const target=e.db.solicitudes.find(s=>s.codigo===segundoCodigo);
   if(estado==="registrada")target.pedidoId="50000000-0000-4000-8000-000000000099";
   if(estado==="vencida")target.venceEn=new Date(Date.now()-60000).toISOString();
   if(estado==="descartada")target.descartadaEn=new Date().toISOString();
   await p.reload();await p.getByRole("dialog",{name:"Pedido del catálogo",exact:true}).getByText(texto,{exact:true}).waitFor();
   assert.equal(await btn(p,"Registrar pedido").count(),0);if(estado==="registrada")await btn(p,"Ver pedido existente").waitFor();assert.equal(e.escrituras,0);
  },{seleccion:segundoCodigo,query:"registrar=1"});
 }
 await caso("contador-lectura-fallida",async(p,e)=>{
  await p.getByText("No pudimos ver si te llegaron pedidos del catálogo.",{exact:true}).waitFor();
  await p.getByRole("link",{name:"Pedidos, Pendientes por comprobar. No pudimos actualizar los pendientes",exact:true}).waitFor();
  assert.equal(await p.getByRole("button",{name:/^Nuevos,/}).innerText(),"Nuevos");
  e.lecturaRota=false;await btn(p,"Reintentar").click();await p.getByRole("button",{name:"Nuevos, 0 pedidos registrados nuevos y 2 solicitudes del catálogo por registrar",exact:true}).waitFor();
  e.lecturaRota=true;await btn(p,"Actualizar fixture").click();await p.getByText("No pudimos ver si te llegaron pedidos del catálogo.",{exact:true}).waitFor();
  const aviso=p.getByRole("button",{name:"Nuevos, 0 pedidos registrados nuevos y 2 solicitudes del catálogo por registrar. No pudimos actualizar los pendientes",exact:true});await aviso.waitFor();assert.equal((await aviso.innerText()).replace(/\s/g,""),"Nuevos2");assert.equal(e.escrituras,0);
 },{query:"panel",lecturaRota:true});
 await caso("aviso-fallo-marcado",async(p,e)=>{await btn(p,"Avisar").waitFor();e.marcadoRoto=true;await btn(p,"Avisar").click();assert.equal(e.marcados,0);await p.evaluate(()=>window.dispatchEvent(new Event("focus")));await p.getByRole("button",{name:/Reintentar marcar/}).waitFor();assert.equal(e.marcados,1);e.marcadoRoto=false;await p.getByRole("button",{name:/Reintentar marcar/}).click();await p.getByText("Avisado",{exact:true}).waitFor();assert.equal(e.marcados,2);assert.equal(await p.evaluate(()=>window.__abiertos.length),1);});
 await caso("aviso-apertura-fallida",async(p,e)=>{await btn(p,"Avisar").waitFor();await p.evaluate(()=>window.__noAbrir=true);await btn(p,"Avisar").click();await p.getByText("No se pudo abrir WhatsApp. Inténtalo otra vez.",{exact:true}).waitFor();await p.evaluate(()=>window.dispatchEvent(new Event("focus")));assert.equal(e.marcados,0);assert.equal(e.db.avisos[0].avisadoEn,null);});
}finally{await b.close();unlinkSync(archivo);rmdirSync(dir);}
const evidencia=process.env.CAPTURAS??"docs/capturas/pedido-catalogo-panel";mkdirSync(evidencia,{recursive:true});writeFileSync(evidencia+"/transporte-resultados.json",JSON.stringify(resultados,null,2));console.log(`${resultados.filter(r=>r.paso).length}/${resultados.length} casos de transporte SIMULADO. No se usó una sesión/tienda real.`);process.exitCode=resultados.some(r=>!r.paso)?1:0;
