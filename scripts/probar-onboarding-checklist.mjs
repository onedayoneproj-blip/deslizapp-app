import "../tests/cargar-ts.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url), {chromium}=require('playwright');
const { construirDesdeSeed } = await import('../lib/data/db.ts');
const URL=(process.env.URL??'http://localhost:3410').replace(/\/$/,'');
const OUT=process.argv[2]??'docs/capturas/onboarding-2/capitulos';mkdirSync(OUT,{recursive:true});
const ID='a1000000-0000-4000-8000-000000000003';
const nav=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
let checks=0;
const ok=(v,text)=>{assert(v,text);checks++;console.log('OK',text)};
async function abrir(ancho,opciones={}) {
 const ctx=await nav.newContext({viewport:{width:ancho,height:844},hasTouch:true,isMobile:true,reducedMotion:opciones.reducido?'reduce':'no-preference'});const page=await ctx.newPage();
 const d=construirDesdeSeed();const t=d.tiendas.find(t=>t.id===ID);Object.assign(t,{onboarding:{},logoUrl:null,descripcion:null,catalogoEstado:'sin'});
 d.productos=d.productos.filter(p=>p.tiendaId!==ID);d.equipos={...d.equipos,[ID]:{miembros:[{usuarioId:'yo',soyYo:true,rol:'dueno',nivel:'administrador',nombre:'Tú',email:'demo@ejemplo.com',desde:new Date().toISOString(),foto:null}],invitaciones:[],solicitudes:[],enlaces:[]}};
 if(opciones.tres)Object.assign(t,{logoUrl:'/tienda/michel-kiara.jpg',descripcion:'Una tienda de prueba.',onboarding:{colores_elegidos_en:'fecha'}});
 if(opciones.casi||opciones.siete){Object.assign(t,{logoUrl:'/tienda/michel-kiara.jpg',descripcion:'Tienda',catalogoEstado:'publicado',onboarding:{colores_elegidos_en:'fecha',pantalla_inicio_en:'fecha',...(opciones.siete?{equipo_omitido_en:'fecha'}:{})}});const p=construirDesdeSeed().productos.find(p=>p.tiendaId===ID&&p.activo&&p.fotos.length);d.productos=Array.from({length:5},(_,i)=>({...p,id:'producto-'+i,slug:'producto-'+i}));}
 if(opciones.cerrado)t.onboarding={checklist_cerrado_en:'fecha'};
 if(opciones.colaborador)d.nivelDemo='editor';
 await page.addInitScript(({d,id})=>{if(!localStorage.getItem('deslizapp-demo-v5'))localStorage.setItem('deslizapp-demo-v5',JSON.stringify(d));localStorage.setItem('deslizapp-sesion-v1',id);localStorage.setItem('deslizapp-modo-v1','demo');localStorage.setItem('deslizapp-version-vista','0.57.0');},{d,id:ID});
 let trafico=0;page.on('request',r=>{if(r.url().includes('supabase.co'))trafico++});
 await page.goto(URL);await page.getByRole('heading',{name:/Buenos|Buenas/}).waitFor();return {ctx,page,trafico:()=>trafico};
}
const elegir=(page,n)=>page.getByRole('group',{name:'Capítulos de preparación'}).getByRole('button',{name:new RegExp(`Capítulo ${n} ·`)}).click();
const fila=(page,nombre)=>page.locator('[data-checklist]').getByRole('button',{name:new RegExp(`^${nombre} ·`)});
const contador=(page,n)=>page.locator('[data-checklist]').getByText(`${n} de 7`,{exact:true}).waitFor();
for(const ancho of [360,390,430]){
 let {ctx,page,trafico}=await abrir(ancho);const c=page.locator('[data-checklist]');await c.waitFor();await contador(page,0);
 ok(await c.getByRole('group').getByRole('button').count()===3,'tres capítulos, no siete tareas');
 ok(await c.getByRole('heading',{name:'Tu tienda tiene personalidad'}).count()===1,'primer incompleto seleccionado');
 ok(await c.locator('details').count()===0,'sin recuadro Hecho');
 const controles=c.getByRole('group').getByRole('button');
 ok(await controles.evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.width>=44})),'toque 44px');
 await controles.first().focus();await page.keyboard.press('ArrowRight');ok(await controles.nth(1).getAttribute('aria-pressed')==='true','flechas seleccionan capítulo y foco');
 ok(await controles.nth(1).evaluate(e=>document.activeElement===e),'foco permanece en selector');await page.keyboard.press('Home');ok(await controles.first().getAttribute('aria-pressed')==='true','Home vuelve al primero');await page.keyboard.press('End');ok(await controles.last().getAttribute('aria-pressed')==='true','End llega al último');
 await elegir(page,2);await page.screenshot({path:`${OUT}/01-personalidad-${ancho}.png`});
 await fila(page,'Sube tu logo').click();await page.getByRole('heading',{name:'Mi marca',exact:true}).waitFor();await page.keyboard.press('Escape');ok(await controles.first().getAttribute('aria-pressed')==='true','volver de logo conserva capítulo');
 await fila(page,'Elige tus colores').click();await page.getByRole('button',{name:'Guardar mi marca'}).click();await contador(page,1);ok(await controles.first().getAttribute('aria-pressed')==='true','actualización de colores no navega');
 await fila(page,'Cuéntales quién eres').click();await page.getByRole('textbox',{name:'Tu tienda en una línea'}).fill('Perfumes para cada día');await page.getByRole('textbox',{name:'Instagram'}).fill('https://instagram.com/a');await page.getByRole('button',{name:'Guardar',exact:true}).click();await page.getByText('Escribe tu usuario de Instagram, sin enlaces ni espacios.').waitFor();ok(await page.getByRole('textbox',{name:'Tu tienda en una línea'}).inputValue()==='Perfumes para cada día','error conserva borrador');await page.getByRole('textbox',{name:'Instagram'}).fill('@perfumes.demo');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Seguir aquí'}).click();ok(await page.getByRole('textbox',{name:'Tu tienda en una línea'}).inputValue()==='Perfumes para cada día','cerrar y Seguir aquí conserva borrador');await page.getByRole('button',{name:'Guardar',exact:true}).click();await contador(page,2);
 await elegir(page,3);await page.screenshot({path:`${OUT}/02-productos-${ancho}.png`});
 await fila(page,'Agrega 5 productos').click();await page.waitForURL('**/catalogo/nuevo');await page.keyboard.press('Escape');await page.getByRole('link',{name:'Inicio',exact:true}).click();await c.waitFor();ok(await controles.nth(1).getAttribute('aria-pressed')==='true','volver desde producto conserva selección');
 await fila(page,'Publica tu catálogo').click();await page.getByRole('heading',{name:'Tu catálogo está vacío'}).waitFor();ok(true,'publicar sin cinco, logo ni marca completa');await page.keyboard.press('Escape');
 await c.getByRole('button',{name:'Ver cómo queda'}).click();await page.locator('[data-como-se-ve] iframe').waitFor();ok(true,'vista previa vacía disponible');await page.keyboard.press('Escape');
 await fila(page,'Publica tu catálogo').click();await page.getByRole('button',{name:'Publicar igual'}).click();await contador(page,3);ok(await controles.nth(1).getAttribute('aria-pressed')==='true','publicación conserva capítulo');ok(await fila(page,'Publica tu catálogo').innerText().then(t=>t.includes('Hecho')),'publicación hecha consultable');
 await elegir(page,4);await page.screenshot({path:`${OUT}/03-a-mano-${ancho}.png`});await fila(page,'Pantalla de inicio').click();await page.getByRole('button',{name:'Ya lo hice'}).click();await contador(page,4);await c.getByRole('button',{name:'Lo hago sola'}).click();await contador(page,5);await c.getByText('Capítulo listo. Tu tienda sigue tomando forma.').waitFor();ok(await controles.last().getAttribute('aria-pressed')==='true','completar no cambia selección');
 await page.screenshot({path:`${OUT}/04-completo-${ancho}.png`});await c.getByRole('button',{name:'Continuar al capítulo 2'}).click();ok(await controles.first().getAttribute('aria-pressed')==='true','continuar va al pendiente por toque');
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'sin overflow horizontal');ok(await c.locator('span.truncate').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)),'títulos sin cortes');ok(trafico()===0,'Demo sin Supabase');
 await c.getByRole('button',{name:'Ocultar guía',exact:true}).click();await page.getByRole('heading',{name:'¿Ocultar la guía?'}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();ok(await c.count()===1,'cancelar ocultación conserva guía');await c.getByRole('button',{name:'Ocultar guía',exact:true}).click();await page.getByRole('dialog',{name:'¿Ocultar la guía?'}).getByRole('button',{name:'Ocultar guía',exact:true}).click();await c.waitFor({state:'detached'});await page.reload();ok(await c.count()===0,'cierre explícito no vuelve');await ctx.close();
 ({ctx,page}=await abrir(ancho,{tres:true,reducido:true}));await contador(page,3);ok(await page.getByRole('group',{name:'Capítulos de preparación'}).getByRole('button').nth(1).getAttribute('aria-pressed')==='true','inicial selecciona primer capítulo incompleto');await elegir(page,2);ok(await fila(page,'Sube tu logo').count()===1,'capítulo completo consultable');ok(await page.locator('.checklist-relleno').first().evaluate(e=>getComputedStyle(e).transitionDuration==='0s'),'movimiento reducido sin escala animada');await ctx.close();
 for(const opciones of [{colaborador:true},{cerrado:true},{siete:true}]){({ctx,page}=await abrir(ancho,opciones));await page.waitForTimeout(600);ok(await page.locator('[data-checklist]').count()===0,JSON.stringify(opciones)+' no muestra guía');if(opciones.siete)ok(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('deslizapp-demo-v5')).tiendas.find(t=>t.id===id).onboarding.checklist_cerrado_en,ID),'cierre siete confirmado');await ctx.close();}
}
// Entrada normal: navegador limpio, sin addInitScript ni datos de fixture.
const ctx=await nav.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();await page.goto(URL);await page.getByRole('button',{name:'Ver demo',exact:true}).click();await page.getByRole('heading',{name:/Buenos|Buenas/}).waitFor();await page.locator('[data-checklist]').waitFor();ok(true,'entrada normal Ver demo muestra guía en Inicio');await page.screenshot({path:`${OUT}/05-demo-normal-390.png`});await ctx.close();
await nav.close();console.log(`${checks} comprobaciones aprobadas`);
