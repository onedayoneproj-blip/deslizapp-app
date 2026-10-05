// Route Handler y metadatos reales, con la fuente anónima sustituida por fixtures; no lecturas/escrituras de pedidos reales.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import "./cargar-ts.mjs";
const require=createRequire(import.meta.url),root=new URL("../",import.meta.url),url=s=>`data:text/javascript;base64,${Buffer.from(s).toString("base64")}`;
const mock=url(`export function fuentePublicaReal(){return {verSolicitud:async c=>{globalThis.__ogLecturas.push(c);if(globalThis.__ogError)throw Error("offline");return globalThis.__ogPedido},catalogoPublico:async()=>null}}`);
const cfg=url(`export const SUPABASE_URL="https://fixture.supabase.co"`);
const renderer=url(`export async function renderImagenPedido(p,fotos){return new Response(JSON.stringify({tienda:p.tienda.nombre,items:p.items.length,fotos}),{headers:{"Content-Type":"application/json"}})}`);
const down=url(`export async function descargarFotoPedido(){return null}`);
async function cargar(file,replacements){let code=readFileSync(new URL(file,root),"utf8");for(const [a,b]of replacements)code=code.replace(JSON.stringify(a),JSON.stringify(b));code=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace('"react/jsx-runtime"',JSON.stringify(new URL(require.resolve("react/jsx-runtime"),"file:").href));return import(url(code));}
const shared=[["@/lib/data/publica",mock],["@/lib/tienda/imagen-pedido",new URL("lib/tienda/imagen-pedido.ts",root).href]];
const {GET}=await cargar("app/pedido/[codigo]/imagen/route.ts",[...shared,["@/lib/supabase/config",cfg],["@/lib/tienda/render-imagen-pedido",renderer],["@/lib/tienda/foto-pedido-servidor",down]]);
const {generateMetadata}=await cargar("app/pedido/[codigo]/page.tsx",[...shared,["next/headers",url('export async function headers(){return new Headers({host:"localhost:3340"})}')],["next",url('')],["react",new URL(require.resolve("react"),"file:").href],["@/components/tienda/pedido-comprador",url('export function PedidoComprador(){return null}')],["@/lib/tienda/carrito",new URL("lib/tienda/carrito.ts",root).href],["../../tienda/catalogo.css",url('')]]);
const p={codigo:"PRUEBAAA23",items:[{foto:null,cantidad:5},{foto:null,cantidad:1}],total:12500,tienda:{nombre:"Tienda Fixture",whatsapp:"dato-publico-no-renderizado"},cliente:"NO PUBLICAR",telefono:"NO PUBLICAR",nota:"NO PUBLICAR"};
test("imagen solo acepta código, sin sesión ni descargador por query, y distingue 404/503",async()=>{
 globalThis.__ogPedido=p;globalThis.__ogError=false;globalThis.__ogLecturas=[];
 const call=c=>GET(new Request(`https://preview.vercel.app/pedido/${c}/imagen?url=http://localhost/private`),{params:Promise.resolve({codigo:c})});
 assert.equal((await call("../mal")).status,404);assert.equal(globalThis.__ogLecturas.length,0);
 const body=await(await call(p.codigo)).text();assert.deepEqual(JSON.parse(body),{tienda:p.tienda.nombre,items:2,fotos:[null,null]});assert(!body.includes("NO PUBLICAR"));
 globalThis.__ogPedido=null;assert.equal((await call(p.codigo)).status,404);globalThis.__ogError=true;assert.equal((await call(p.codigo)).status,503);
});
test("metadatos absolutos PNG, título/total y demo sin preview de navegador",async()=>{
 globalThis.__ogPedido=p;globalThis.__ogError=false;globalThis.__ogLecturas=[];
 const saved=process.env.VERCEL_URL,savedEnv=process.env.VERCEL_ENV,savedDomain=process.env.VERCEL_PROJECT_PRODUCTION_URL;delete process.env.VERCEL_ENV;process.env.VERCEL_URL="fixture-preview.vercel.app";
 try{
 const m=await generateMetadata({params:Promise.resolve({codigo:p.codigo}),searchParams:Promise.resolve({})});assert.equal(m.title,"Tu pedido con Tienda Fixture");assert.equal(m.openGraph.description,"2 productos · RD$12,500");assert.deepEqual(m.openGraph.images,[{url:"https://fixture-preview.vercel.app/pedido/PRUEBAAA23/imagen",width:1200,height:630,type:"image/png",alt:"Productos de tu pedido con Tienda Fixture"}]);assert(!JSON.stringify(m).includes("NO PUBLICAR"));
 process.env.VERCEL_ENV="production";process.env.VERCEL_PROJECT_PRODUCTION_URL="deslizapp-app.vercel.app";
 const produccion=await generateMetadata({params:Promise.resolve({codigo:p.codigo}),searchParams:Promise.resolve({})});assert.equal(produccion.openGraph.images[0].url,"https://deslizapp-app.vercel.app/pedido/PRUEBAAA23/imagen");
 globalThis.__ogLecturas=[];const demo=await generateMetadata({params:Promise.resolve({codigo:p.codigo}),searchParams:Promise.resolve({demo:""})});assert.equal(demo.openGraph,undefined);assert.deepEqual(globalThis.__ogLecturas,[]);
 const invalido=await generateMetadata({params:Promise.resolve({codigo:"../mal"}),searchParams:Promise.resolve({})});assert.equal(invalido.openGraph,undefined);assert.deepEqual(globalThis.__ogLecturas,[]);
 }finally{if(saved===undefined)delete process.env.VERCEL_URL;else process.env.VERCEL_URL=saved;for(const [k,v]of [["VERCEL_ENV",savedEnv],["VERCEL_PROJECT_PRODUCTION_URL",savedDomain]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
