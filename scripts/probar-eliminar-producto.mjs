// Fixtures únicamente demo: no conecta ni escribe Supabase.
import '../tests/cargar-ts.mjs';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { navegador, URL } from './navegador-catalogo.mjs';
const { construirDesdeSeed } = await import('../lib/data/db.ts');
const base=construirDesdeSeed(), t=base.tiendas[0], original=base.productos.find(p=>p.tiendaId===t.id), actor=base.usuarios.find(u=>u.tiendaId===t.id);
const libre={...original,id:'ff300000-0000-4000-8000-000000000001',nombre:'Fixture sin historial',slug:'fixture-sin-historial',opciones:[],stock:3,activo:true};
const historico={...libre,id:'ff300000-0000-4000-8000-000000000002',nombre:'Fixture con historial',slug:'fixture-historial'};
const pendiente={...libre,id:'ff300000-0000-4000-8000-000000000003',nombre:'Fixture pendiente',slug:'fixture-pendiente'};
base.productos.push(libre,historico,pendiente);
const molde=base.pedidos.find(p=>p.tiendaId===t.id&&p.estado==='despachado');assert(molde);
base.pedidos.push({...molde,id:'fixture-venta',numero:999,estado:'despachado',total:1200},{...molde,id:'fixture-pendiente',numero:998,estado:'nuevo',total:1200});
base.pedidoItems.push({id:'fixture-item',pedidoId:'fixture-venta',productoId:historico.id,nombreProducto:'Nombre de la venta',cantidad:1,precioUnitario:1200,porEncargo:false,varianteId:null,varianteTexto:null},{id:'fixture-item-pendiente',pedidoId:'fixture-pendiente',productoId:pendiente.id,nombreProducto:pendiente.nombre,cantidad:1,precioUnitario:1200,porEncargo:false,varianteId:null,varianteTexto:null});
base.ajustesInventario.push({id:'fixture-ajuste',tiendaId:t.id,productoId:historico.id,variacion:3,stockAnterior:0,stockNuevo:3,motivo:'reposicion',nota:null,actorId:actor.id,creadoEn:new Date().toISOString()});
const browser=await navegador(), out=process.env.CAPTURAS??'docs/capturas/eliminar-producto';mkdirSync(out,{recursive:true});
try{for(const width of (process.env.ANCHOS??'360,390,430').split(',').map(Number))for(const theme of ['claro','oscuro']){
 console.log(`Comienza ${width}/${theme}`);
 const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:width===430?'reduce':'no-preference'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*.supabase.co/**',r=>r.abort());
 await page.addInitScript(({base,t})=>{if(!localStorage.getItem('deslizapp-demo-v5'))localStorage.setItem('deslizapp-demo-v5',JSON.stringify(base));localStorage.setItem('deslizapp-modo-v1','demo');localStorage.setItem('deslizapp-sesion-v1',t);localStorage.setItem('deslizapp-version-vista','9.9.9');},{base,t:t.id});
 page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(12000);
 const db=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')));
 const open=async p=>{await page.goto(`${URL}/catalogo/${p.id}/editar`);await page.getByRole('textbox',{name:'Nombre',exact:true}).waitFor();if(theme==='oscuro')await page.evaluate(()=>document.documentElement.dataset.theme='dark');};
 const confirm=async()=>{await page.getByRole('button',{name:'Eliminar producto',exact:true}).click();const h=page.getByRole('dialog').last();await h.getByText('Conservamos pedidos',{exact:false}).count();await h.getByRole('button',{name:/Sí, eliminar|Eliminar y conservar|Ocultar producto/}).waitFor();return h;};
 await open(libre);await page.getByRole('textbox',{name:'Nombre',exact:true}).fill('Borrador conservado');let h=await confirm();await h.getByRole('button',{name:'Cancelar',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);assert.equal(await page.getByRole('textbox',{name:'Nombre',exact:true}).inputValue(),'Borrador conservado');assert(!(await db()).productos.find(p=>p.id===libre.id).eliminadoEn);
 for(const salida of ['Escape','Atras','X']){h=await confirm();if(salida==='Escape')await page.keyboard.press('Escape');else if(salida==='Atras')await page.goBack();else await h.getByRole('button',{name:'Cerrar',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);assert.equal(await page.getByRole('textbox',{name:'Nombre',exact:true}).inputValue(),'Borrador conservado');}
 h=await confirm();await page.waitForTimeout(400);await page.screenshot({path:`${out}/confirmacion-${width}-${theme}.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Confirmar sin historial');await h.getByRole('button',{name:'Sí, eliminar producto',exact:true}).evaluate(el=>{el.click();el.click();});await page.waitForURL(`${URL}/catalogo`);await page.waitForFunction(id=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')).productos.find(p=>p.id===id).eliminadoEn,libre.id);assert.equal((await db()).productos.find(p=>p.id===libre.id).stock,3);
 await open(historico);h=await confirm();await h.getByText('Este producto tiene historial.',{exact:false}).waitFor();await h.getByRole('button',{name:'Eliminar y conservar historial',exact:true}).click();await page.waitForURL(`${URL}/catalogo`);
 const after=await db();for(const k of ['pedidos','pedidoItems','abonos','ajustesInventario','variantes','avisos'])assert.deepEqual(after[k],base[k],k);
 await page.goto(`${URL}/catalogo/${historico.id}`);await page.getByText('Producto eliminado. Su historial se conserva.',{exact:true}).waitFor();
 await open(pendiente);await page.getByRole('textbox',{name:'Nombre',exact:true}).fill('Otro borrador');h=await confirm();await h.getByText('1 pedido en curso.',{exact:true}).waitFor();assert.equal(await h.getByRole('button',{name:'Sí, eliminar producto',exact:true}).count(),0);
 await h.getByRole('button',{name:'Ocultar producto',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[role=dialog]').length===1);assert.equal(await page.getByRole('textbox',{name:'Nombre',exact:true}).inputValue(),'Otro borrador');const estado=(await db()).productos.find(p=>p.id===pendiente.id);assert.equal(estado.activo,false);assert(!estado.eliminadoEn);
 assert.equal(errors.length,0,errors.join('\n'));console.log(`Pasó ${width}/${theme}: cancelar conserva borrador, eliminar sin/con historial, doble toque, bloqueo y Ocultar conserva campos, enlace retirado, sin overflow.`);await ctx.close();
}}finally{await browser.close();}
