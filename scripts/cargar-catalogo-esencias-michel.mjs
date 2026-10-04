// Datos de una tienda: fuera de las migraciones. No cambia stock/precios/fotos/visibilidad reales.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const raiz = new URL('../', import.meta.url);
const html = readFileSync(new URL('public/catalogos/esencias-michel.html', raiz),'utf8');
const contexto = {};
const inicio = html.indexOf('const IMG = '), fin = html.indexOf('const PHONE',inicio);
vm.runInNewContext(html.slice(inicio,fin) + '\nglobalThis.datos = {IMG,PRODUCTS,REVIEWS,TINT};',contexto,{timeout:1000});
export const { IMG, PRODUCTS, REVIEWS, TINT } = contexto.datos;
const variables = html.match(/:root\{([\s\S]*?)\}/)[1];
const colores = Object.fromEntries([...variables.matchAll(/--([a-z-]+):\s*(#[a-fA-F0-9]+)\s*;/g)].map(m=>[m[1],m[2]]));
const cabecera = html.match(/class="logo"[^>]*>(<svg[\s\S]*?<\/svg>)/)[1];
export const tema = {colores,fuentes:{display:'Cormorant Garamond',body:'Manrope'},cabecera,tintes:TINT};
const descripcion = html.match(/property="og:description" content="([^"]+)"/)[1];
const sql = s => "'"+String(s).replaceAll("'","''")+"'";
export const opiniones = id => (REVIEWS[id]??[]).map(r=>({usuario:r.user,fuente:r.src,url:r.url,texto:r.text,estrellas:r.stars??null,traducida:!!r.tr}));
const lineas = ['-- GENERADO: node scripts/cargar-catalogo-esencias-michel.mjs','-- Idempotente; solo orden/opiniones/tema/descripción vacía de Esencias Michel.', 'begin;',
  "update public.productos p set orden = null where p.tienda_id = (select id from public.tiendas where slug = 'esencias-michel') and p.slug not in ("+PRODUCTS.map(p=>sql(p.id)).join(',')+");"];
PRODUCTS.forEach((p,i)=>lineas.push(`update public.productos set orden = ${i}, opiniones = ${sql(JSON.stringify(opiniones(p.id)))}::jsonb where tienda_id = (select id from public.tiendas where slug = 'esencias-michel') and slug = ${sql(p.id)};`));
lineas.push(`update public.tiendas set personalizacion = coalesce(personalizacion,'{}'::jsonb) || jsonb_build_object('tema',${sql(JSON.stringify(tema))}::jsonb), descripcion = case when nullif(btrim(descripcion),'') is null then ${sql(descripcion)} else descripcion end where slug = 'esencias-michel';`,'commit;','');
writeFileSync(new URL('scripts/sql/esencias-michel-catalogo-react.sql',raiz),lineas.join('\n'));
for (const [id,url] of Object.entries(IMG)) {
 if (url.startsWith('data:')) { const [,mime,b64] = /^data:([^;]+);base64,(.*)$/.exec(url); const extension = mime.includes('png') ? 'png' : 'jpg'; const destino = `public/tienda/michel-${id}.${extension}`; writeFileSync(new URL(destino,raiz),Buffer.from(b64,'base64')); IMG[id] = `/tienda/michel-${id}.${extension}`; }
}
// La fixture de comparación también procede del original; no es una constante del catálogo real.
writeFileSync(new URL('lib/data/seed/catalogo-michel.json',raiz),JSON.stringify({productos:PRODUCTS.map((p,i)=>({...p,orden:i,opiniones:opiniones(p.id),foto:IMG[p.id]})),tema,descripcion},null,2)+'\n');
console.log(`SQL generado: ${PRODUCTS.length} productos; conserva los demás datos reales.`);

// Actualización de la demo: no escribe nunca en Supabase.
import fs from 'node:fs';
const fixture=JSON.parse(fs.readFileSync('lib/data/seed/catalogo-michel.json'));const productos=JSON.parse(fs.readFileSync('lib/data/seed/productos.json'));const tiendas=JSON.parse(fs.readFileSync('lib/data/seed/tiendas.json'));const t=tiendas.find(t=>t.slug==='esencias-michel');const old=productos.filter(p=>p.tienda_id===t.id);const para={Mujer:'ella',Hombre:'el',Unisex:'unisex'};
for(const [i,p] of fixture.productos.entries()) {
 let fila=old.find(x=>x.nombre===p.name||x.slug===p.id);if(!fila){fila={id:`a3000000-0000-4000-8000-${String(100+i).padStart(12,'0')}`,tienda_id:t.id,foto_retocada:false,activo:true,destacado:false,likes:0,creado_en:'2026-09-28T00:00:00.000Z',actualizado_en:'2026-09-28T00:00:00.000Z',opciones:[],por_encargo:false,encargo_texto:null};productos.push(fila);}
 Object.assign(fila,{nombre:p.name,slug:p.id,orden:p.orden,opiniones:p.opiniones,precio:p.sug,fotos:[p.foto],medios:[{tipo:'foto',url:p.foto,retocada:true}],stock:p.agotado?0:1,categoria:p.family,detalles:{...fila.detalles,marca:p.line,descripcion:p.desc,familia:p.family,ocasiones:p.occasions,...(para[p.gender]?{para:para[p.gender]}:{}),...(p.size?{concentracion:p.size.split(' ')[0].toLowerCase(),tamano_ml:100}:{}),...(p.notes?Object.fromEntries(Object.entries(p.notes).map(([k,v])=>[{top:'notas_salida',heart:'notas_corazon',base:'notas_fondo'}[k],v.split(/,\s*|\s+y\s+/)])):{})}});
}
Object.assign(t,{personalizacion:{...t.personalizacion,tema:fixture.tema},whatsapp:'18496503269',instagram:'https://www.instagram.com/esenciasmichel8/',descripcion:fixture.descripcion,nombre_vendedora:'Michel',foto_perfil_url:'/tienda/original-0.jpg'});
fs.writeFileSync('lib/data/seed/productos.json',JSON.stringify(productos,null,2)+'\n');fs.writeFileSync('lib/data/seed/tiendas.json',JSON.stringify(tiendas,null,2)+'\n');
