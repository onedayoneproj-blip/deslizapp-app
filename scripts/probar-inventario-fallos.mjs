// Doble de la capa useData SOLO en la demo local: no hace peticiones a Supabase.
// Se inyecta desde el navegador de pruebas; la app no contiene puertas de prueba.
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
let pw;try{pw=require('playwright');}catch{pw=require(join(execSync('npm root -g').toString().trim(),'playwright'));}
const URL=process.env.URL??'http://localhost:3000';
const ok=(x,m)=>{console.log((x?'✅ ':'❌ ')+m);if(!x)throw Error(m);};
const browser=await pw.chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();
await page.addInitScript(()=>{localStorage.setItem('deslizapp-modo-v1','demo');localStorage.setItem('deslizapp-version-vista','9.9.9');});
// «Ver producto»: el stock plegable (se abre si está cerrado) y su número.
const abrirStock=async()=>{const s=page.locator('[data-stock-plegable]');await s.waitFor();if(await s.getAttribute('data-abierto')===null)await s.locator('button[aria-expanded]').click();};
const cantidad=async()=>Number((await page.locator('[data-filas-stock] li').first().innerText()).match(/(\d+)\s*$/)[1]);
const auditar=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')??'{}').ajustesInventario??[]);
const simular=async modo=>page.evaluate(modo=>{
 const el=document.querySelector('[data-hoja-panel]');
 let fiber=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];
 while(fiber&&!fiber.memoizedProps?.value?.guardarProductoConInventario)fiber=fiber.return;
 const datos=fiber?.memoizedProps?.value;if(!datos||datos.modo!=='demo')throw Error('Solo demo');
 const original=datos.guardarProductoConInventario.__original??datos.guardarProductoConInventario;
 window.__intentos=0;
 datos.guardarProductoConInventario=async(...args)=>{
  window.__intentos++;
  if(modo==='red')throw Error('Respuesta de red perdida (doble de prueba)');
  if(modo==='confirmado'){await original(...args);throw Error('Respuesta perdida después de confirmar (doble de prueba)');}
  if(modo==='concurrente'){
   await original(args[0],args[1],{}, {...args[3],id:crypto.randomUUID(),stockPropuesto:args[3].stockBase+2,motivo:'reposicion',nota:null},false);
   return original(...args);
  }
  if(modo==='validacion')return original(args[0],args[1],args[2],{...args[3],motivo:'otro',nota:null},false);
  await new Promise(r=>setTimeout(r,250));return original(...args);
 };
 datos.guardarProductoConInventario.__original=original;
},modo);
try{
 await page.goto(URL+'/catalogo');await page.locator('main ul li a').first().waitFor();
 const href=await page.locator('main ul li a').evaluateAll(es=>es.find(a=>/^\/catalogo\/[^/]+$/.test(a.getAttribute('href')??'')&&/\b[1-9][0-9]* en stock\b/.test(a.getAttribute('aria-label')??''))?.getAttribute('href'));
 const abrir=async()=>{await page.goto(URL+href);await page.locator('[data-stock-plegable]').waitFor();await page.waitForTimeout(300);await abrirStock();};
 await abrir();const inicial=await cantidad();
 await simular('red');await page.locator('button[aria-label^="Aumentar stock"]').click();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByRole('button',{name:'Revisar producto e historial'}).waitFor();
 ok((await auditar()).length===0&&await cantidad()===inicial+1,'Respuesta incierta sin escritura conserva propuesta');
 await page.waitForTimeout(400);ok(await page.evaluate(()=>window.__intentos)===1,'Sin reintento automático');
 await page.getByRole('button',{name:'Revisar producto e historial'}).click();
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).waitFor({state:'visible'});
 await page.getByRole('button',{name:'Descartar',exact:true}).click();
 await simular('lento');await page.locator('button[aria-label^="Aumentar stock"]').click();
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).evaluate(b=>{b.click();b.click();});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')??'{}').ajustesInventario?.length===1);
 ok(await page.evaluate(()=>window.__intentos)===1,'Dos pulsaciones rápidas envían una operación');
 await abrir();await simular('confirmado');await page.locator('button[aria-label^="Aumentar stock"]').click();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByRole('button',{name:'Revisar producto e historial'}).waitFor();await page.getByRole('button',{name:'Revisar producto e historial'}).click();
 await page.getByText('Confirmamos el ajuste en el historial.',{exact:true}).waitFor();
 ok((await auditar()).length===2&&await page.getByRole('button',{name:'Guardar cambios',exact:true}).count()===0,'Respuesta perdida tras confirmar se resuelve leyendo, sin duplicar');
 await abrir();const base=await cantidad();await simular('concurrente');await page.locator('button[aria-label^="Aumentar stock"]').click();await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByText(/El stock cambió mientras ajustabas/).waitFor();
 ok(await cantidad()===base+1&&(await auditar()).length===3,'Conflicto conserva propuesta y solo registra la escritura concurrente');
 await page.getByRole('button',{name:'Descartar',exact:true}).click();await page.waitForFunction(n=>Number(document.querySelector('[data-filas-stock] li').textContent.match(/(\d+)\s*$/)[1])===n,base+2);ok(await cantidad()===base+2,'Descartar recupera el nuevo stock confirmado');
 // Error de ajuste en edición: nombre, stock y nota deben conservarse en el borrador.
 await page.locator('button[data-boton-editar]').click();await page.waitForURL('**/editar');await page.locator('[data-editar-producto] li').first().waitFor();await page.waitForTimeout(400);
 const antes=await page.evaluate(()=>localStorage.getItem('deslizapp-demo-v5'));
 const filaEd=t=>page.locator('[data-editar-producto] li button').filter({hasText:new RegExp('^'+t)}).first();
 const listoPaso=async()=>{await page.locator('[data-pie-paso]').getByRole('button',{name:'Listo',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);};
 await simular('validacion');
 await filaEd('Nombre').click();await page.waitForTimeout(400);await page.locator('[data-hoja-panel]').last().getByRole('textbox').fill('No guardar parcialmente');await listoPaso();
 await filaEd('Stock').click();await page.waitForTimeout(400);await page.locator('[data-hoja-panel]').last().locator('button[aria-label^="Disminuir stock"]').click();
 await page.getByRole('radio',{name:'Otro',exact:true}).click();await page.getByRole('textbox',{name:'Cuéntanos el motivo'}).fill('Nota conservada');await listoPaso();
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.locator('[data-editar-producto] [role="alert"]').waitFor();
 await filaEd('Stock').click();await page.waitForTimeout(400);
 ok(await page.getByRole('textbox',{name:'Cuéntanos el motivo'}).inputValue()==='Nota conservada'&&(await filaEd('Nombre').innerText()).includes('No guardar parcialmente')&&await page.evaluate(()=>localStorage.getItem('deslizapp-demo-v5'))===antes,'Error de validación conserva nombre, stock y motivo, y no guarda ficha ni stock');
 await listoPaso();await page.keyboard.press('Escape');await page.getByRole('alertdialog').getByRole('button',{name:'Descartar y salir',exact:true}).click();await page.waitForURL(URL+href);
 ok((await auditar()).length===3,'Cancelar edición fallida no altera el historial');
 await page.locator('[data-stock-plegable]').waitFor();
 await page.evaluate(async()=>{
  const el=document.querySelector('[data-hoja-panel]');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f&&!f.memoizedProps?.value?.guardarProductoConInventario)f=f.return;
  const d=f.memoizedProps.value,id=location.pathname.split('/').at(-1);
  d.guardarProductoConInventario=d.guardarProductoConInventario.__original??d.guardarProductoConInventario;
  for(let n=0;n<9;n++){const p=await d.getProducto(d.tiendaActivaId,id);await d.guardarProductoConInventario(d.tiendaActivaId,id,{}, {id:crypto.randomUUID(),stockBase:p.stock,stockPropuesto:p.stock+1,motivo:'reposicion',nota:null},false);}
  const ajenos=await d.getAjustesInventario('otra-tienda',id);if(ajenos.ajustes.length)throw Error('Historial cruzó tiendas');
 });
 await page.getByRole('button',{name:/^Historial de ajustes/}).click();
 const historial=page.getByRole('region',{name:'Historial de ajustes'});
 await historial.getByRole('button',{name:'Ver más ajustes'}).waitFor();ok(await historial.locator('li').filter({hasText:'· Michel'}).count()===10,'Historial carga inicialmente diez filas e identifica al actor');
 await page.evaluate(()=>{
  const el=document.querySelector('section[aria-label="Historial de ajustes"]');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f&&!f.memoizedProps?.value?.getAjustesInventario)f=f.return;
  window.__datosHistorial=f.memoizedProps.value;window.__leerHistorial=window.__datosHistorial.getAjustesInventario;
  window.__datosHistorial.getAjustesInventario=async()=>{throw Error('Lectura de historial fallida (doble)');};
 });
 await historial.getByRole('button',{name:'Ver más ajustes'}).click();await historial.getByRole('button',{name:'Reintentar historial'}).waitFor();
 ok(await historial.getByRole('alert').count()===1,'Historial muestra error y reintento tras fallar la lectura');
 await page.evaluate(()=>{window.__datosHistorial.getAjustesInventario=window.__leerHistorial;});
 await historial.getByRole('button',{name:'Reintentar historial'}).click();await page.waitForFunction(()=>document.querySelectorAll('section[aria-label="Historial de ajustes"] li').length===12);
 ok(await historial.locator('li').count()===12,'Ver más/reintentar recupera todas las filas; otra tienda no las ve');

 // Ver producto con presentaciones (Majestic Oud, 3 tamaños): si el segundo ajuste falla después de que el primero entró,
 // reintentar no repite el primero (revisión de Codex en #125).
 await page.goto(URL+'/catalogo/a3000000-0000-4000-8000-000000000019');await page.locator('[data-stock-plegable]').waitFor();await page.waitForTimeout(400);await abrirStock();
 const filasOud=page.locator('[data-fila-stock]');const ajustesOud=async()=>(await auditar()).filter(a=>a.productoId==='a3000000-0000-4000-8000-000000000019');const antesOud=(await ajustesOud()).length;
 await page.evaluate(()=>{const el=document.querySelector('[data-hoja-panel]');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f&&!f.memoizedProps?.value?.ajustarStock)f=f.return;const d=f.memoizedProps.value;const orig=d.ajustarStock;let n=0;d.ajustarStock=async(...a)=>{if(++n===2){d.ajustarStock=orig;throw Error('Falla el segundo ajuste (doble de prueba)');}return orig(...a);};});
 await filasOud.nth(0).locator('button[aria-label^="Aumentar stock"]').click();await filasOud.nth(1).locator('button[aria-label^="Aumentar stock"]').click();
 await page.locator('[data-pie-vista]').getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByRole('alert').filter({hasText:/No pudimos|doble de prueba/}).first().waitFor();
 ok((await ajustesOud()).length===antesOud+1,'Si falla el segundo ajuste, el primero ya quedó (uno solo)');
 // En la demo el producto se relee al instante; con Supabase la relectura tarda y el reintento podía salir con la base vieja.
 await page.locator('[data-pie-vista]').getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('deslizapp-demo-v5')).ajustesInventario.filter(a=>a.productoId==='a3000000-0000-4000-8000-000000000019').length===n,antesOud+2);await page.waitForTimeout(500);
 const nuevos=(await ajustesOud()).slice(antesOud);
 ok(nuevos.length===2&&new Set(nuevos.map(a=>a.varianteId)).size===2&&nuevos.every(a=>a.variacion===1),'Reintentar aplica solo el que faltaba: un +1 por presentación, sin repetir');
}finally{await browser.close();}
