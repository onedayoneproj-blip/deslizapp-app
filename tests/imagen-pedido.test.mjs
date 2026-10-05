import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import sharp from "sharp";
import "./cargar-ts.mjs";
import { codigoPedidoValido, portadasPedido, fotoPublicaPermitida, urlImagenPedido } from "../lib/tienda/imagen-pedido.ts";
const { descargarFotoPedido } = await import("../lib/tienda/foto-pedido-servidor.ts");
const require=createRequire(import.meta.url),root=new URL("../",import.meta.url), moduleURL=s=>`data:text/javascript;base64,${Buffer.from(s).toString("base64")}`;
function cargarRender() {
 let s=readFileSync(new URL("lib/tienda/render-imagen-pedido.tsx",root),"utf8");
 for(const [spec,file] of [["next/og",require.resolve("next/og")],["../marca",new URL("lib/marca.ts",root).pathname],["./carrito",new URL("lib/tienda/carrito.ts",root).pathname],["./imagen-pedido",new URL("lib/tienda/imagen-pedido.ts",root).pathname]])s=s.replace(JSON.stringify(spec),JSON.stringify(new URL(file,"file:").href));
 s=ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText.replace('"react/jsx-runtime"',JSON.stringify(new URL(require.resolve("react/jsx-runtime"),"file:").href));
 return import(moduleURL(s));
}
const proyecto="https://euihaeyfdlpvmbtfzvnt.supabase.co",url=proyecto+"/storage/v1/object/public/productos/a1000000-0000-4000-8000-000000000001/foto.webp";
test("códigos válidos, URL absoluta y descarga limitada al Storage público",()=>{
 assert(codigoPedidoValido("PRUEBAAA23"));for(const c of ["../foto","4DCQ2PZ28F?url=http://localhost", "AAAA", "ABCDEFGHIJ"])assert(!codigoPedidoValido(c));
 assert.equal(urlImagenPedido("PRUEBAAA23","https://preview.vercel.app"),"https://preview.vercel.app/pedido/PRUEBAAA23/imagen");
 assert.equal(urlImagenPedido("../no","https://preview.vercel.app"),null);assert.equal(fotoPublicaPermitida(url,proyecto),url);
 for(const u of ["http://localhost/foto",url+"?url=otro",url+"#otro",url.replace(".supabase.co",".supabase.co.evil.com"),url.replace("/public/","/authenticated/"),url.replace("/foto.webp","/../secret.webp"),url.replace("/foto.webp","/%2f.webp"),"data:image/png;base64,a", "https://evil.com/a.png"])assert.equal(fotoPublicaPermitida(u,proyecto),null);
});
test("portadas son líneas ordenadas, cantidades no repiten y variantes se conservan",()=>{
 const items=Array.from({length:5},(_,i)=>({foto:i===2?null:`foto-${i}`,varianteTexto:`talla-${i}`,cantidad:i===0?20:1}));
 assert.deepEqual(portadasPedido(items),{portadas:items.slice(0,4).map(i=>({foto:i.foto,variante:i.varianteTexto})),adicionales:1});assert.equal(portadasPedido([]).adicionales,0);
});
test("descarga: foto válida, ausente, fallos, redirección, exceso y contenido inválido",async()=>{
 const png=await sharp({create:{width:800,height:600,channels:3,background:"#338844"}}).png().toBuffer();
 let llamadas=0;
 const ok=async(u,opts)=>{llamadas++;assert.equal(u,url);assert.equal(opts.redirect,"error");assert.equal(opts.cache,"no-store");return new Response(png,{headers:{"content-type":"image/png"}})};
 const data=await descargarFotoPedido(url,proyecto,ok);const info=await sharp(Buffer.from(data.split(",")[1],"base64")).metadata();assert(info.width<=600&&info.height<=480);assert.equal(llamadas,1);
 assert.equal(await descargarFotoPedido(null,proyecto,ok),null);assert.equal(await descargarFotoPedido("https://evil.com/x",proyecto,ok),null);assert.equal(llamadas,1);
 for(const transport of [async()=>{throw new TypeError("offline")},async()=>new Response("",{status:404}),async()=>new Response("",{status:302,headers:{Location:"http://localhost/private"}}),async()=>new Response(png,{headers:{"content-type":"image/svg+xml"}}),async()=>new Response("no es imagen",{headers:{"content-type":"image/png"}}),async()=>new Response(png,{headers:{"content-type":"image/png","content-length":"99999999"}}),async()=>new Response(new Uint8Array(5*1024*1024+1),{headers:{"content-type":"image/png"}})])assert.equal(await descargarFotoPedido(url,proyecto,transport),null);
});
test("imágenes reales PNG con 1/2/3/4/5 líneas y recortes cuadrados, sin información privada",async()=>{
 const {renderImagenPedido}=await cargarRender();const colores=["#d44134","#25774b","#326ec2","#be8729"];
 const fotos=await Promise.all(colores.map(async color=>`data:image/png;base64,${(await sharp({create:{width:600,height:480,channels:3,background:color}}).png().toBuffer()).toString("base64")}`));
 const out=process.env.OG_CAPTURAS??"/tmp/catalogo-pulido-og";mkdirSync(out,{recursive:true});
 for(const n of [1,2,3,4,5]){
  const items=Array.from({length:n},(_,i)=>({foto:i<4?url:null,varianteTexto:i===2?"Talla L · Arena":null,cantidad:i===0?12:1}));
  const r=await renderImagenPedido({items,total:12500,tienda:{nombre:"Tienda de prueba"}},fotos.slice(0,Math.min(4,n)));
  assert.equal(r.headers.get("content-type"),"image/png");assert.match(r.headers.get("cache-control"),/s-maxage=300/);
  const b=Buffer.from(await r.arrayBuffer()),m=await sharp(b).metadata();assert.equal(m.width,1200);assert.equal(m.height,630);
  writeFileSync(`${out}/${n}-lineas.png`,b);await sharp(b).extract({left:285,top:0,width:630,height:630}).png().toFile(`${out}/${n}-cuadrado.png`);
  const {data,info}=await sharp(b).raw().toBuffer({resolveWithObject:true});
  const puntos=n<=2?[[n===1?600:450,150],...(n===2?[[750,150]]:[])]:[[450,100],[750,100],[n===3?600:450,300],...(n>=4?[[750,300]]:[])];
  puntos.forEach(([x,y],i)=>{const rgb=colores[i].slice(1).match(/../g).map(x=>parseInt(x,16));assert.deepEqual([...data.subarray((y*info.width+x)*info.channels,(y*info.width+x)*info.channels+3)],rgb);});
 }
 const reales=await Promise.all(["michel-mayar.jpg","michel-kiara.jpg","michel-oxana.jpg","michel-she.jpg"].map(async name=>`data:image/png;base64,${(await sharp(new URL(`../public/tienda/${name}`,import.meta.url).pathname).resize(600,480,{fit:"inside"}).png().toBuffer()).toString("base64")}`));
 for(const n of [1,2,3,4,5]) {
  const items=Array.from({length:n},(_,i)=>({foto:url,varianteTexto:i===2?"100 ml":null,cantidad:i===0?3:1}));
  const image=await renderImagenPedido({items,total:12500,tienda:{nombre:"Tienda de prueba"}},reales.slice(0,Math.min(4,n)));
  const bytes=Buffer.from(await image.arrayBuffer());writeFileSync(`${out}/${n}-fotos.png`,bytes);
  await sharp(bytes).extract({left:285,top:0,width:630,height:630}).png().toFile(`${out}/${n}-fotos-cuadrado.png`);
 }
 const r=await renderImagenPedido({items:[{foto:null,varianteTexto:null}],total:1200,tienda:{nombre:"Sin fotos"}},[null]);writeFileSync(`${out}/sin-fotos.png`,Buffer.from(await r.arrayBuffer()));
});
