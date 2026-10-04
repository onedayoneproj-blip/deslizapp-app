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
 await page.goto(URL+href);const inventario=page.getByRole('region',{name:'Inventario'});await inventario.waitFor();
 const sinCambios=await page.evaluate(()=>localStorage.getItem('deslizapp-demo-v5'));
 const unidad=inventario.locator('[aria-live="polite"]');const inicial=Number((await unidad.innerText()).match(/\d+/)[0]);
 ok(Number.isInteger(inicial)&&inicial>0,`${ancho}: la fila En stock muestra la cantidad (${inicial})`);
 ok(await inventario.getByRole('button',{name:'Guardar cambios',exact:true}).count()===0&&await inventario.getByRole('button',{name:'Descartar',exact:true}).count()===0,`${ancho}: acciones pendientes ausentes sin cambio`);
 await inventario.locator('button[aria-label^="Aumentar stock"]').click();
 ok(await inventario.getByText('Añadirás 1 unidad',{exact:true}).count()===1,`${ancho}: delta singular sin texto redundante`);
 const guardar=inventario.getByRole('button',{name:'Guardar cambios',exact:true});const descartar=inventario.getByRole('button',{name:'Descartar',exact:true});
 if(process.env.CAPTURAS&&!reducido)await page.screenshot({path:`${process.env.CAPTURAS}/inventario-${ancho}.png`});
 const g=await guardar.boundingBox(),d=await descartar.boundingBox();ok(g.height>=44&&d.height>=44&&Math.abs(g.y-d.y)<2&&Math.abs(g.width-d.width)<1,`${ancho}: Guardar/Descartar dentro del contenedor, juntos y del mismo ancho`);
 const scroll=page.locator('[data-hoja-contenido]');await scroll.evaluate(el=>{el.scrollTop=1000;});await page.waitForTimeout(150);const posicion=await scroll.evaluate(el=>el.scrollTop);
 await inventario.getByRole('button',{name:'Historial',exact:true}).click();await page.getByRole('heading',{name:'Historial de ajustes',exact:true}).waitFor();
 ok(await page.locator('[role="dialog"]').count()===1&&await page.getByRole('alertdialog').count()===0,`${ancho}: historial interno sin apilar ni avisar de salida`);
 if(process.env.CAPTURAS&&!reducido)await page.screenshot({path:`${process.env.CAPTURAS}/historial-${ancho}.png`});
 await page.getByText('Todavía no hay ajustes.',{exact:true}).waitFor();ok(await page.evaluate(()=>localStorage.getItem('deslizapp-demo-v5'))===sinCambios,`${ancho}: historial no muestra ni guarda propuesta`);
 await page.getByRole('button',{name:/^Volver a/}).click();await page.waitForTimeout(150);
 ok((await unidad.innerText()).startsWith(String(inicial+1))&&Math.abs(await scroll.evaluate(el=>el.scrollTop)-posicion)<=2,`${ancho}: volver conserva cantidad y scroll (${posicion})`);
 ok(await page.evaluate(()=>document.activeElement?.textContent==='Historial'),`${ancho}: foco vuelve al botón del historial`);
 await inventario.getByRole('button',{name:'Historial',exact:true}).click();await page.goBack();await inventario.waitFor();
 ok(await page.getByRole('alertdialog').count()===0&&(await unidad.innerText()).startsWith(String(inicial+1)),`${ancho}: Atrás del teléfono vuelve sin descartar ni preguntar`);
 await inventario.getByRole('button',{name:'Descartar',exact:true}).click();
 await inventario.locator('button[aria-label^="Disminuir stock"]').click();ok(await inventario.getByText('Retirarás 1 unidad',{exact:true}).count()===1,`${ancho}: disminución singular`);
 await inventario.getByRole('button',{name:'Descartar',exact:true}).click();await page.getByRole('button',{name:'Editar',exact:true}).click();await page.waitForURL('**/editar');await inventario.waitFor();
 const campo=page.getByRole('textbox',{name:'Nombre',exact:true});await campo.fill('Nombre pendiente');await campo.evaluate(el=>{el.dataset.pruebaNodo='mismo';});
 await inventario.locator('button[aria-label^="Aumentar stock"]').click();ok(await page.getByRole('button',{name:'Guardar cambios',exact:true}).count()===1,`${ancho}: edición tiene un único Guardar conjunto`);
 await scroll.evaluate(el=>{el.scrollTop=1000;});await page.waitForTimeout(150);const posEdicion=await scroll.evaluate(el=>el.scrollTop);
 await inventario.getByRole('button',{name:'Ver historial',exact:true}).click();await page.getByText('Todavía no hay ajustes.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Volver a Editar producto',exact:true}).click();await page.waitForTimeout(150);
 ok(await campo.inputValue()==='Nombre pendiente'&&await campo.getAttribute('data-prueba-nodo')==='mismo'&&Math.abs(await scroll.evaluate(el=>el.scrollTop)-posEdicion)<=2,`${ancho}: edición conserva campos, nodo y scroll (${posEdicion})`);
 await inventario.getByRole('button',{name:'Descartar',exact:true}).click();ok(await campo.inputValue()==='Nombre pendiente'&&await page.getByRole('button',{name:'Guardar cambios',exact:true}).count()===1,`${ancho}: descartar cantidad conserva ficha y Guardar general`);
 await inventario.getByRole('button',{name:'Ver historial',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('alertdialog').waitFor();await page.getByRole('alertdialog').getByRole('button',{name:'Seguir aquí',exact:true}).click();
 ok(await page.getByRole('heading',{name:'Historial de ajustes',exact:true}).count()===1,`${ancho}: Escape protege cambios reales y permite seguir en historial`);
 await page.getByRole('button',{name:'Volver a Editar producto',exact:true}).click();
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${ancho}: sin overflow${reducido?' · movimiento reducido':''}`);
 ok(errores.length===0,`${ancho}: sin errores de página`);await ctx.close();
}}finally{await browser.close();}
