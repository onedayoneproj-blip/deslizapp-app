// Proveedor/contexto real en Chromium, con Auth, API y transporte Supabase SIMULADOS.
// No Google real ni RLS real: esos permisos se comprueban en el replay desechable.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { navegador, URL as base } from "./navegador-catalogo.mjs";
import "../tests/cargar-ts.mjs";
const { crearFuenteAdminDemo } = await import("../lib/data/admin/demo.ts");
const { crearEstadoAdminDemo } = await import("../lib/data/admin/seed.ts");
const seed = crearEstadoAdminDemo();
const fuenteFixture = crearFuenteAdminDemo(seed);
const fichaFixture = await fuenteFixture.tienda(seed.panel.tiendas[0].id);
fichaFixture.tienda.id = "vista";

assert(/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base), "Solo servidor local de desarrollo");
const dir = "app/catalogos/fixture-ver-como";
assert(!existsSync(dir), "No sobrescribir rutas existentes");
const metodos = [...readFileSync("lib/data/fuente.ts", "utf8").split("export type FuenteDatos = {")[1].matchAll(/^  (\w+)\(/gm)].map(m => m[1]);
const lecturas = ["getTiendas", "solicitudPorCodigo", "getTienda", "getDueno", "getProductos", "getProducto", "revisarEliminacionProducto", "getAjustesInventario", "revisarGuardadoInventario", "getPedidos", "getPedido", "getCuentasPorCobrar", "getCuentaCliente", "getClientes", "getCliente", "getPromos", "enviosJugada", "getEventosAaah", "solicitudesPendientes", "avisosPendientes", "avisosDeProducto", "trabajosRetoque", "getMarcaRetoque"];
mkdirSync(dir, { recursive: true });
writeFileSync(dir + "/page.tsx", `"use client";
import {useEffect,useState,useSyncExternalStore} from "react";
import {ProveedorSoloMirar,ProveedorReal,useData} from "@/lib/data/provider";
import {FichaTienda} from "@/components/admin/ficha-tienda";
import {ProveedorAdmin} from "@/lib/data/admin/provider";
const sub=()=>()=>{};
function Consumidor({nombre}:{nombre:string}){
 const datos=useData();const [tienda,setTienda]=useState("");
 useEffect(()=>{(window as any).__contextos??={};(window as any).__contextos[nombre]=datos;
 void datos.getTienda(datos.tiendaActivaId).then(t=>setTienda(t?.nombre??"sin tienda")).catch(e=>setTienda(e.name));
 },[datos,nombre]);
 return <section><h2>{nombre}: {tienda}</h2><button onClick={()=>void datos.actualizarProducto(datos.tiendaActivaId,"p",{})}>Guardar fixture</button></section>;
}
export default function Fixture(){
 const listo=useSyncExternalStore(sub,()=>true,()=>false);const [n,setN]=useState(0);
 useEffect(()=>{(window as any).__cambiarSesion=()=>setN(v=>v+1)},[]);
 if(!listo)return null;
 if(location.search.includes("ficha"))return <ProveedorAdmin><FichaTienda tiendaId="vista"/></ProveedorAdmin>;
 return <><ProveedorReal usuario={{id:"actor",tiendaId:location.search.includes("dueno")?"vista":"propia"} as any}><Consumidor nombre="normal"/></ProveedorReal>
 <ProveedorSoloMirar sesion={{id:"s-"+n,tiendaId:n?"segunda":"vista",tiendaNombre:"Tienda fixture",venceEn:new Date(Date.now()+1800000).toISOString()}}><Consumidor nombre="vista"/></ProveedorSoloMirar></>;
}`);
const b = await navegador();
let pasaron = 0;
const actor = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "fixture@example.invalid", app_metadata: { provider: "google" }, user_metadata: {}, created_at: new Date().toISOString() };
const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: actor.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now()/1000)+86400 })).toString("base64url"), "firma_ficticia"].join(".");
const cookie = "base64-" + Buffer.from(JSON.stringify({ access_token: jwt, refresh_token: "fixture", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+86400, expires_in: 86400, user: actor })).toString("base64url");

async function caso(nombre, probar, { dueno = false, ficha = false } = {}) {
 const ctx = await b.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
 const page = await ctx.newPage();page.setDefaultTimeout(20000);
 await page.clock.install();
 const e = { solicitudes: [], api: [], estado: "vigente", despues: false, revision: "original", dueno, salidas: [], errores: [] };
 page.on("pageerror", err => e.errores.push(err.message));
 await ctx.addInitScript(valor => {document.cookie="sb-euihaeyfdlpvmbtfzvnt-auth-token="+valor+"; path=/; SameSite=Lax";localStorage.setItem("deslizapp-version-vista","9.9.9");}, cookie);
 await ctx.route("**/*.supabase.co/**", async route => {
  const req = route.request(), url = new globalThis.URL(req.url());
  e.solicitudes.push({ path: url.pathname, metodo: req.method(), tienda: url.searchParams.get("id") });
  const ok = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  if(url.pathname === "/auth/v1/user") return ok(actor);
  if(url.pathname === "/auth/v1/logout") return ok({});
  assert.equal(req.headers().authorization, "Bearer " + jwt, "Transporte autenticado simulado");
  if(url.pathname.endsWith("/rpc/admin_tienda")) return ok(fichaFixture);
  assert.equal(req.method(), "GET", "Ninguna escritura llega a Supabase");
  if(url.pathname.endsWith("/tiendas")) {
   const id = url.searchParams.get("id")?.slice(3);
   if(e.despues && id === "vista") e.estado = "error";
   return ok({id,nombre:id+" "+e.revision,funciones:{},dias_gracia:7,creado_en:new Date().toISOString()});
  }
  return ok([]);
 });
 await ctx.route("**/api/admin/ver-como", async route => {
  const d = route.request().postDataJSON();e.api.push(d);
  if(d.accion === "validar") {
   assert.equal(d.sesionId, "s-0");
   if(e.estado === "error") return route.fulfill({status:403,body:'{"error":"retirado"}'});
   if(e.estado !== "vigente") return route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({motivo:e.estado})});
  }
  if(d.accion === "terminar" && e.estado === "fallo-cierre") return route.fulfill({status:503,body:"{}"});
  if(d.accion === "iniciar") assert.equal(d.tiendaId,"vista");
  return route.fulfill({status:200,contentType:"application/json",body:'{"ok":true,"activa":false}'});
 });
 // Interceptar únicamente el documento de destino: no ejecutar layouts autenticados ni llamar al servidor Supabase.
 await ctx.route(base+"/**", async route => {
  const u = new globalThis.URL(route.request().url());
  if(route.request().isNavigationRequest() && !u.pathname.startsWith("/catalogos/fixture-ver-como")) {
   e.salidas.push(u.pathname);return route.fulfill({status:200,contentType:"text/html",body:"<p>Destino fixture</p>"});
  }
  return route.fallback();
 });
 try {
  await page.goto(base+"/catalogos/fixture-ver-como"+(ficha?"?ficha":dueno?"?dueno":""));
  if(!ficha) await page.getByRole("heading", {name:"vista: vista original",exact:true}).waitFor();
  await probar(page,e);
  assert.deepEqual(e.errores,[]);
  console.log("✓",nombre);pasaron++;
 } finally { await ctx.close(); }
}
const leer = p => p.evaluate(async()=>{try{return await window.__contextos.vista.getTienda("vista")}catch(e){return e.name}});
try {
 for(const dueno of [false,true]) await caso("useData completo y bloqueo de escrituras: "+(dueno?"admin/dueño":"admin no miembro"), async(p,e)=>{
  assert.deepEqual(await p.evaluate(ms=>ms.filter(m=>typeof window.__contextos.vista[m]!=="function"),metodos),[]);
  assert(e.api.filter(d=>d.accion==="validar").length>=2,"Antes y después de leer");
  const antes=e.solicitudes.length;
  const errores=await p.evaluate(async ms=>{const d=window.__contextos.vista;const errores=[];for(const m of ms){try{await d[m]("vista");errores.push("sin bloqueo: "+m)}catch(e){errores.push(e.name)}}return errores},metodos.filter(m=>!lecturas.includes(m)&&m!=="marcarActividad").concat("escrituraFutura","olvidar"));
  assert(errores.every(n=>n==="SoloMirar"),JSON.stringify(errores));assert.equal(e.solicitudes.length,antes);
  await p.getByRole("button",{name:"Guardar fixture"}).last().click();await p.getByText("Aquí solo se mira.",{exact:false}).waitFor();
  assert.equal(e.solicitudes.length,antes);
  assert.equal(await p.evaluate(()=>window.__contextos.vista.marcarActividad("vista")),false);
  assert.equal(await p.evaluate(async()=>{try{await window.__contextos.vista.getTienda("propia")}catch(e){return e.name}}),"SoloMirar");
 },{dueno});
 await caso("fuente/caché aisladas y sesión distinta remonta",async(p,e)=>{
  assert.equal(await p.evaluate(()=>window.__contextos.normal===window.__contextos.vista),false);
  e.revision="actualizada";
  await p.evaluate(()=>window.__contextos.normal.refrescar());await p.getByRole("heading",{name:"normal: propia actualizada",exact:true}).waitFor();
  assert.equal((await leer(p)).nombre,"vista original","Refrescar normal no invalida la caché vista");
  await p.evaluate(()=>window.__contextos.vista.refrescar());await p.getByRole("heading",{name:"vista: vista actualizada",exact:true}).waitFor();
  // Validar la nueva sesión y tienda con el mismo transporte simulado.
  await p.route("**/api/admin/ver-como",r=>r.fulfill({status:200,contentType:"application/json",body:'{"ok":true}'}));
  await p.evaluate(()=>window.__cambiarSesion());await p.getByRole("heading",{name:"vista: segunda actualizada",exact:true}).waitFor();
 });
 for(const [estado,destino] of [["terminada","/admin/tiendas/vista"],["reemplazada","/catalogos/fixture-ver-como"],["error","/ver-como/recuperar"]]) await caso("validación previa: "+estado,async(p,e)=>{
  e.estado=estado;const antes=e.solicitudes.length;
  assert.equal(await leer(p),"VerComoVencido");assert.equal(e.solicitudes.length,antes);
  if(estado==="reemplazada") {e.estado="vigente"; await p.waitForURL(base+destino);} else await p.waitForURL(base+destino);
 });
 await caso("validación posterior descarta el resultado y bloquea el panel",async(p,e)=>{
  e.despues=true;e.revision="no debe verse";
  await p.evaluate(()=>window.__contextos.vista.refrescar());await p.waitForURL(base+"/ver-como/recuperar");
  assert(!await p.getByText("vista no debe verse",{exact:false}).count());
  assert(e.api.filter(d=>d.accion==="validar").length>=4);
 });
 await caso("otra pestaña cerró: foco invalida incluso la caché",async(p,e)=>{
  e.estado="terminada";await p.evaluate(()=>window.dispatchEvent(new Event("focus")));await p.waitForURL(base+"/admin/tiendas/vista");
 });
 await caso("Salir cierra y vuelve a la ficha",async(p,e)=>{
  await p.getByRole("button",{name:"Salir",exact:true}).click();await p.waitForURL(base+"/admin/tiendas/vista");assert(e.api.some(d=>d.accion==="terminar"));
 });
 await caso("cierre fallido retira la vista y lleva a recuperación",async(p,e)=>{
  e.estado="fallo-cierre";await p.getByRole("button",{name:"Salir",exact:true}).click();await p.waitForURL(base+"/ver-como/recuperar");
 });
 await caso("vencimiento cierra sin otra lectura",async(p,e)=>{
  const antes=e.solicitudes.length;await p.clock.fastForward(1800001);await p.waitForURL(base+"/admin/tiendas/vista");assert.equal(e.solicitudes.length,antes);assert(e.api.some(d=>d.accion==="terminar"));
 });
 await caso("ficha inicia mediante el endpoint existente",async(p,e)=>{
  await p.getByRole("button",{name:"Ver como ella",exact:true}).click();await p.waitForURL(base+"/");assert(e.api.some(d=>d.accion==="iniciar"));
 },{ficha:true});
 console.log(pasaron+" recorridos del proveedor/contexto con transporte autenticado SIMULADO; cero escrituras reales");
} finally {await b.close();rmSync(dir,{recursive:true,force:true});}
