import '../tests/cargar-ts.mjs';
import assert from 'node:assert/strict';

import { navegador, URL } from './navegador-catalogo.mjs';
const { construirDesdeSeed } = await import('../lib/data/db.ts');
const db = construirDesdeSeed(), tienda = db.tiendas[0], items = db.productos.filter(p => p.tiendaId === tienda.id).slice(0, 2), [muchos, vacio] = items;
db.ajustesInventario = [];
const actor = db.usuarios.find(u => u.tiendaId === tienda.id); assert(actor);
db.ajustesInventario = Array.from({length:12}, (_, i) => ({ id:`fixture-ajuste-${i}`, tiendaId:tienda.id, productoId:muchos.id, variacion:i+1, stockAnterior:i, stockNuevo:i*2+1, motivo:i%2 ? 'reposicion' : 'correccion_inventario', nota:`Nota de prueba larga ${i}: ${'detalle de inventario '.repeat(7)}`.slice(0,200), actorId:actor.id, creadoEn:new Date(Date.UTC(2026,9,1,12,i)).toISOString() }));
const browser=await navegador();
try {
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();await page.route('**/*.supabase.co/**',r=>r.abort());
 await page.addInitScript(({db,t})=>{localStorage.setItem('deslizapp-demo-v5',JSON.stringify(db));localStorage.setItem('deslizapp-modo-v1','demo');localStorage.setItem('deslizapp-sesion-v1',t);localStorage.setItem('deslizapp-version-vista','9.9.9');},{db, t:tienda.id});
 await page.goto(`${URL}/catalogo/${muchos.id}`);const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Historial',exact:true}).click();const region=page.getByRole('region',{name:'Historial de ajustes'});await region.getByText('Solo ajustes manuales.',{exact:true}).waitFor();
 assert.equal(await dialog.getByText('Historial de ajustes',{exact:true}).count(),1,'un solo título, provisto por la cabecera de Hoja');
 const lista=region.getByRole('list',{name:'Ajustes manuales de inventario'});await lista.waitFor();assert.equal(await lista.locator(':scope > li').count(),11,'diez ajustes y la fila Ver más');
 await region.getByText('+12 unidades',{exact:true}).waitFor();await region.getByText('11 → 23',{exact:true}).waitFor();await region.getByText(/Corrección de inventario/i).first().waitFor();
 await region.getByText(/Nota de prueba larga 11/).waitFor();await region.getByText(new RegExp(actor.nombre),{exact:false}).first().waitFor();
 await region.getByRole('button',{name:'Ver más ajustes',exact:true}).click();await region.getByText('+1 unidad',{exact:true}).waitFor();assert.equal(await lista.locator(':scope > li').count(),12);
 await page.getByRole('button',{name:/Volver a/}).click();await page.goto(`${URL}/catalogo/${vacio.id}`);await page.getByRole('dialog').getByRole('button',{name:'Historial',exact:true}).click();await page.getByRole('region',{name:'Historial de ajustes'}).getByText('Todavía no hay ajustes.',{exact:true}).waitFor();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')).pedidos),db.pedidos,'el fixture de historial no agrega ventas');
 if(process.env.CAPTURAS){await page.goto(`${URL}/catalogo/${muchos.id}`);await page.getByRole('dialog').getByRole('button',{name:'Historial',exact:true}).click();await page.getByRole('region',{name:'Historial de ajustes'}).waitFor();await page.screenshot({path:`${process.env.CAPTURAS}/historial-lista-390.png`});}
 console.log('✓ historial vacío, primera página, nota larga, actor, orden reciente y Ver más');await ctx.close();
}finally{await browser.close();}
