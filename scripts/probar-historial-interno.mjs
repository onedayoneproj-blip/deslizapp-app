// Navegación interna e inventario compacto: solo Demo, nunca escribe en Supabase.
import {createRequire} from 'node:module';import {execSync} from 'node:child_process';import {join} from 'node:path';
const require=createRequire(import.meta.url);let pw;try{pw=require('playwright');}catch{pw=require(join(execSync('npm root -g').toString().trim(),'playwright'));}
const URL=process.env.URL??'http://localhost:3000';const ok=(x,m)=>{console.log((x?'✅ ':'❌ ')+m);if(!x)throw Error(m);};
const browser=await pw.chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try{for(const [ancho,reducido] of [[360,false],[390,false],[430,false],[390,true]]){
 const ctx=await browser.newContext({viewport:{width:ancho,height:844},hasTouch:true,isMobile:true,reducedMotion:reducido?'reduce':'no-preference'});const page=await ctx.newPage();const errores=[];page.on('pageerror',e=>errores.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('deslizapp-modo-v1','demo');localStorage.setItem('deslizapp-version-vista','9.9.9');});
 await page.goto(URL+'/catalogo');await page.locator('main ul li a').first().waitFor();
 const href=await page.locator('main ul li a').evaluateAll(es=>es.find(a=>/^\/catalogo\/[^/]+$/.test(a.getAttribute('href')??'')&&/\b[1-9][0-9]* en stock\b/.test(a.getAttribute('aria-label')??''))?.getAttribute('href'));
 await page.goto(URL+href);const stock=page.locator('[data-stock-plegable]');await stock.waitFor();await page.waitForTimeout(500);
 const pie=page.locator('[data-pie-vista]');const cab=()=>page.locator('[data-hoja-cabecera]').last();
 ok(await stock.getAttribute('data-abierto')===null,`${ancho}: el stock empieza cerrado`);
 await stock.locator('button[aria-expanded]').click();
 ok(await pie.getByRole('button',{name:'Guardar cambios',exact:true}).count()===0&&await pie.getByRole('button',{name:'Descartar',exact:true}).count()===0,`${ancho}: acciones pendientes ausentes sin cambio`);
 await stock.locator('button[aria-label^="Aumentar stock"]').click();
 ok(await pie.getByText('Añadirás 1 unidad',{exact:true}).count()===1,`${ancho}: delta singular sin texto redundante`);
 ok(await pie.getByRole('button',{name:'Crear pedido',exact:true}).count()===0,`${ancho}: con stock pendiente, «Guardar cambios» es el único principal`);
 const sinCambios=await page.evaluate(()=>localStorage.getItem('deslizapp-demo-v5'));
 await page.getByRole('button',{name:/^Historial de ajustes/}).click();await page.waitForTimeout(300);
 ok(await cab().getByRole('heading').innerText()==='Historial de ajustes'&&await page.locator('[role="dialog"]').count()===1&&await page.getByRole('alertdialog').count()===0,`${ancho}: historial interno sin apilar ni avisar de salida`);
 ok(await cab().getByRole('button',{name:'Volver',exact:true}).evaluate(e=>document.activeElement===e),`${ancho}: el foco va a «‹»`);
 await page.getByText('Todavía no hay ajustes.',{exact:true}).waitFor();ok(await page.evaluate(()=>localStorage.getItem('deslizapp-demo-v5'))===sinCambios,`${ancho}: historial no muestra ni guarda propuesta`);
 ok(!(await pie.isVisible()),`${ancho}: en el historial no se ve el pie`);
 await cab().getByRole('button',{name:'Volver',exact:true}).click();await page.waitForTimeout(200);
 ok(await pie.getByText('Añadirás 1 unidad',{exact:true}).count()===1,`${ancho}: «‹» vuelve con la propuesta intacta`);
 await page.getByRole('button',{name:/^Historial de ajustes/}).click();await page.goBack();await stock.waitFor();await page.waitForTimeout(200);
 ok(await page.getByRole('alertdialog').count()===0&&await pie.getByText('Añadirás 1 unidad',{exact:true}).count()===1,`${ancho}: Atrás del teléfono vuelve sin descartar ni preguntar`);
 await pie.getByRole('button',{name:'Descartar',exact:true}).click();
 await stock.locator('button[aria-label^="Disminuir stock"]').click();ok(await pie.getByText('Retirarás 1 unidad',{exact:true}).count()===1,`${ancho}: disminución singular`);
 await pie.getByRole('button',{name:'Descartar',exact:true}).click();
 await page.locator('button[data-boton-editar]').click();await page.waitForURL('**/editar');await page.locator('[data-editar-producto]').waitFor();await page.waitForTimeout(500);
 const filaEd=t=>page.locator('[data-editar-producto] li button').filter({hasText:new RegExp('^'+t)}).first();
 await filaEd('Nombre').click();await page.waitForTimeout(400);await page.locator('[data-hoja-panel]').last().getByRole('textbox').fill('Nombre pendiente');await page.locator('[data-pie-paso]').getByRole('button',{name:'Listo'}).click();await page.waitForTimeout(500);
 await filaEd('Stock').click();await page.waitForTimeout(400);await page.locator('[data-hoja-panel]').last().locator('button[aria-label^="Aumentar stock"]').click();await page.locator('[data-pie-paso]').getByRole('button',{name:'Listo'}).click();await page.waitForTimeout(500);
 ok(await page.getByRole('button',{name:'Guardar cambios',exact:true}).count()===1,`${ancho}: edición tiene un único Guardar conjunto`);
 const scroll=page.locator('[data-hoja-contenido]').last();await scroll.evaluate(el=>{el.scrollTop=1000;});await page.waitForTimeout(150);const posEdicion=await scroll.evaluate(el=>el.scrollTop);
 await filaEd('Historial de ajustes').click();await page.getByText('Todavía no hay ajustes.',{exact:true}).waitFor();
 await cab().getByRole('button',{name:'Volver',exact:true}).click();await page.waitForTimeout(150);
 ok(Math.abs(await scroll.evaluate(el=>el.scrollTop)-posEdicion)<=1,`${ancho}: volver conserva el desplazamiento de editar`);
 ok((await filaEd('Nombre').innerText()).includes('Nombre pendiente'),`${ancho}: el borrador sigue`);
 await filaEd('Historial de ajustes').click();await page.keyboard.press('Escape');await page.getByRole('alertdialog').waitFor();await page.getByRole('alertdialog').getByRole('button',{name:'Quedarme',exact:true}).click();
 ok(await cab().getByRole('heading').innerText()==='Historial de ajustes',`${ancho}: Escape protege cambios reales y permite seguir en historial`);
 await cab().getByRole('button',{name:'Volver',exact:true}).click();
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${ancho}: sin overflow${reducido?' · movimiento reducido':''}`);
 ok(errores.length===0,`${ancho}: sin errores de página`);await ctx.close();
}}finally{await browser.close();}
