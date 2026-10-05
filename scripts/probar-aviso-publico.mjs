// Confirmar Avísame guarda en DEMO sin abrir WhatsApp. Contexto de navegador separado.
import '../tests/cargar-ts.mjs';
import assert from 'node:assert/strict';
import {navegador,URL} from './navegador-catalogo.mjs';
const {construirDesdeSeed}=await import('../lib/data/db.ts');
const d=construirDesdeSeed(),t=d.tiendas[0],p=d.productos.find(p=>p.tiendaId===t.id);p.stock=0;p.activo=true;p.porEncargo=false;d.avisos=[];
const browser=await navegador(),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await ctx.newPage();
try{
 await ctx.route('**/*.supabase.co/**',r=>r.abort());await ctx.addInitScript(({d,t})=>{if(!localStorage.getItem('deslizapp-demo-v5'))localStorage.setItem('deslizapp-demo-v5',JSON.stringify(d));localStorage.setItem('deslizapp-modo-v1','demo');localStorage.setItem('deslizapp-sesion-v1',t.id);localStorage.setItem('deslizapp-version-vista','9.9.9');localStorage.setItem('dz-coach-'+t.slug,'1');window.__abiertos=[];window.open=url=>{window.__abiertos.push(url);return {opener:null}};},{d,t});
 await page.goto(`${URL}/tienda/${t.slug}?demo#p/${p.slug}`);await page.getByRole('button',{name:'Avísame: '+p.nombre,exact:true}).click();await page.locator('#telefonoAviso').fill('8095550199');assert(await page.locator('#telefonoAviso').evaluate(e=>document.activeElement===e));await page.locator('.aviso-boton').click();await page.getByText('Listo. Te aviso cuando llegue.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__abiertos.length),0);const avisos=await page.evaluate(()=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')).avisos);assert.equal(avisos.length,1);assert.equal(avisos[0].avisadoEn,null);assert.equal(avisos[0].productoId,p.id);await page.goto(`${URL}/`);await page.locator('[data-tarjeta-espera]').getByText('1 persona espera una reposición',{exact:true}).waitFor();console.log('✓ Avísame guarda sin WhatsApp y aparece en Inicio (390 px demo)');
}finally{await ctx.close();await browser.close();}
