// Prueba de la vista previa y ajustes de stock en demo. Nunca toca Supabase.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(join(execSync("npm root -g").toString().trim(), "playwright"));
}

const URL = (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
const ok = (cond, msg) => {
  console.log((cond ? "✅ " : "❌ ") + msg);
  if (!cond) throw new Error(msg);
};
/** «Ver producto»: el stock plegable (se abre si está cerrado) y su número. */
const abrirStock = async (page) => {
  const s = page.locator("[data-stock-plegable]");
  await s.waitFor();
  if ((await s.getAttribute("data-abierto")) === null) await s.locator("button[aria-expanded]").click();
};
const numeroStock = async (page) => Number((await page.locator("[data-stock-plegable] [data-filas-stock] li").first().innerText()).match(/(\d+)\s*$/)?.[1]);
/** Editar: la fila Stock («N en total»). */
const totalEditar = async (page) => Number((await page.locator("[data-editar-producto] li button").filter({ hasText: /^Stock/ }).first().innerText()).match(/(\d+) en total/)?.[1]);
const persistido = page => page.evaluate(() => localStorage.getItem("deslizapp-demo-v5"));
const registros = async page => JSON.parse(await persistido(page) ?? "{}").ajustesInventario ?? [];

const navegador = await playwright.chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] } : {},
);
const ctx = await navegador.newContext({ viewport: { width: Number(process.env.ANCHO ?? 390), height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: process.env.REDUCIDO ? "reduce" : "no-preference" });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.addInitScript(() => {
  localStorage.setItem("deslizapp-version-vista", "9.9.9");
  localStorage.setItem("deslizapp-modo-v1", "demo");
});


try {
  await page.goto(URL + "/catalogo");
  await page.waitForSelector("main ul li a");
  const producto = await page.locator("main ul li a").evaluateAll((enlaces) => {
    const a = enlaces.find((e) => /^\/catalogo\/[^/]+$/.test(e.getAttribute("href") ?? "") && /\b[1-9][0-9]* en stock\b/.test(e.getAttribute("aria-label") ?? ""));
    return a ? { href: a.getAttribute("href"), nombre: a.getAttribute("aria-label")?.split(",")[0] } : null;
  });
  ok(Boolean(producto), "Catálogo demo: hay producto con stock controlado");
  await page.goto(URL + producto.href);
  await page.goto(URL + producto.href);
  await page.waitForSelector('[role="dialog"] [data-stock-plegable]');
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Vista previa sin overflow horizontal");
  ok((await page.locator("[data-stock-plegable]").getAttribute("data-abierto")) === null, "El stock empieza cerrado");
  await abrirStock(page);
  const inicial = await numeroStock(page);
  const nombre = producto.nombre;
  const pie = page.locator("[data-pie-vista]");
  const cab = () => page.locator("[data-hoja-cabecera]").last();
  const revisarHistorial=async texto=>{
    await page.getByRole("button",{name:/^Historial de ajustes/}).click();
    await page.getByRole("region",{name:"Historial de ajustes"}).getByText(texto,{exact:false}).waitFor();
    ok(await page.locator('[role="dialog"]').count()===1,"Historial se abre en la misma hoja");
    await cab().getByRole("button",{name:"Volver",exact:true}).click();
    await page.waitForTimeout(200);
  };
  const mas=()=>page.getByRole("button", { name: "Aumentar stock de " + nombre });
  const menos=()=>page.getByRole("button", { name: "Disminuir stock de " + nombre });
  const antes=await persistido(page);
  await mas().click();await mas().click();await mas().click();
  ok(await numeroStock(page)===inicial+3 && await persistido(page)===antes,"Tres toques solo cambian la propuesta, sin persistir");
  await menos().click();await menos().click();await menos().click();
  ok(await numeroStock(page)===inicial && await persistido(page)===antes && await pie.getByRole("button",{name:"Guardar cambios",exact:true}).count()===0,"Volver al stock original no crea ajustes");
  await mas().click();await mas().click();await mas().click();
  await pie.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("deslizapp-demo-v5")??"{}").ajustesInventario?.length===1);
  ok((await registros(page))[0].variacion===3,"Guardar varios toques crea una única reposición final");
  await revisarHistorial("+3 unidades");
  const pedidoAntes=JSON.parse(await persistido(page)).pedidos.length;
  await menos().click();await menos().click();
  await pie.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.getByRole("button",{name:"Cancelar",exact:true}).click();
  await page.waitForTimeout(400);
  ok(await numeroStock(page)===inicial+1 && (await registros(page)).length===1,"Cancelar la confirmación conserva propuesta sin guardar");
  await pie.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.getByRole("radio",{name:"Otro",exact:true}).click();
  ok(await page.getByRole("button",{name:"Guardar ajuste",exact:true}).isDisabled(),"Otro exige nota");
  await page.getByRole("textbox",{name:"Cuéntanos el motivo"}).fill("Recuento de prueba demo");
  await page.getByRole("button",{name:"Guardar ajuste",exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("deslizapp-demo-v5")).ajustesInventario.length===2);
  await revisarHistorial("Recuento de prueba demo");
  ok((await registros(page))[1].variacion===-2 && JSON.parse(await persistido(page)).pedidos.length===pedidoAntes,"Una disminución final con nota actualiza historial sin pedidos");
  await mas().click();
  ok(await pie.getByRole("button",{name:"Crear pedido",exact:true}).count()===0 && await pie.getByRole("button",{name:"Guardar cambios",exact:true}).count()===1,"Con cambios sin guardar, «Guardar cambios» es el único principal (sin «Crear pedido»)");
  await pie.getByRole("button",{name:"Descartar",exact:true}).click();
  ok(await numeroStock(page)===inicial+1 && await pie.getByRole("button",{name:"Crear pedido",exact:true}).count()===1,"Descartar recupera el stock y devuelve «A tu historia» / «Crear pedido»");
  const filaEd=t=>page.locator('[data-editar-producto] li button').filter({hasText:new RegExp('^'+t)}).first();
  const irEditar=async()=>{await page.locator("button[data-boton-editar]").click();await page.waitForURL("**/editar");await page.locator("[data-editar-producto] li").first().waitFor();await page.waitForTimeout(400);};
  const paso=async(t,f)=>{await filaEd(t).click();await page.waitForTimeout(400);await f(page.locator("[data-hoja-panel]").last());await page.locator("[data-pie-paso]").getByRole("button",{name:"Listo",exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);};
  const volverVista=async()=>{await page.waitForURL(URL+producto.href);await page.locator("[data-stock-plegable]").waitFor();await page.waitForTimeout(300);};
  await irEditar();
  ok(await totalEditar(page)===inicial+1 && (await registros(page)).length===2,"Descartar y editar recupera el stock guardado");
  await paso("Nombre",h=>h.getByRole("textbox").fill(nombre+" edición"));
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await volverVista();
  ok((await registros(page)).length===2,"Guardar solo nombre no crea ajuste");
  await irEditar();
  const nuevoNombre=nombre+" ficha y stock";
  await paso("Nombre",h=>h.getByRole("textbox").fill(nuevoNombre));
  await paso("Stock",async h=>{await h.locator('button[aria-label^="Aumentar stock"]').click();await h.locator('button[aria-label^="Aumentar stock"]').click();});
  ok((await registros(page)).length===2,"Editar tampoco escribe al tocar cantidades");
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await volverVista();
  await revisarHistorial("+2");
  ok((await registros(page)).length===3 && JSON.parse(await persistido(page)).productos.find(p=>p.id===producto.href.split('/').at(-1)).nombre===nuevoNombre,"Guardar edición confirma ficha y ajuste; historial actualizado");
  await irEditar();
  await paso("Stock",async h=>{await h.locator('button[aria-label^="Disminuir stock"]').click();await h.locator('button[aria-label^="Disminuir stock"]').click();await h.getByRole("radio",{name:"Daño",exact:true}).click();});
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await volverVista();
  await revisarHistorial("Daño");
  ok((await registros(page)).length===4 && (await registros(page))[3].variacion===-2,"Disminuir desde edición pide el motivo en el Stock y guarda un único delta final");
  await abrirStock(page);
  await page.locator('[data-stock-plegable] button[aria-label^="Aumentar stock"]').click();
  await page.goBack();await page.getByRole("alertdialog").waitFor();
  await page.getByRole("alertdialog").getByRole("button",{name:"Quedarme",exact:true}).click();
  ok(await page.locator("[data-stock-plegable]").count()===1,"Atrás del navegador respeta cambios pendientes");
  await pie.getByRole("button",{name:"Descartar",exact:true}).click();
  await pie.getByRole("button",{name:"Crear pedido",exact:true}).click();await page.waitForURL("**/pedidos/nuevo?producto=*");
  ok(new globalThis.URL(page.url()).searchParams.get("producto")===producto.href.split("/").at(-1),"Crear pedido abre el formulario preseleccionado sin guardarlo");
  ok(JSON.parse(await persistido(page)).pedidos.length===pedidoAntes,"Abrir pedido no crea una venta ni cambia stock");

  const id=producto.href.split('/').at(-1);
  const ponerStock=async stock=>{
    await page.goto(URL+"/catalogo");
    await page.evaluate(({id,stock})=>{
      const db=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));
      const p=db.productos.find(p=>p.id===id);p.stock=stock;
      p.nombre="Producto con un nombre muy largo para comprobar que la miniatura compacta conserva la lectura en pantallas pequeñas";
      localStorage.setItem("deslizapp-demo-v5",JSON.stringify(db));
    },{id,stock});
    await page.reload();await page.goto(URL+"/catalogo/"+id);
    await page.locator("[data-stock-plegable]").waitFor();await page.waitForTimeout(300);
    await abrirStock(page);
  };

  await ponerStock(0);
  ok(await page.locator('[data-stock-plegable] button[aria-label^="Disminuir stock"]').isDisabled(), "Con stock cero no se puede disminuir");
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"Nombre largo y stock cero sin overflow");
  if(process.env.CAPTURAS){await page.screenshot({path:process.env.CAPTURAS+"/producto-"+(process.env.ANCHO??390)+".png"});}
  await ponerStock(null);
  ok((await page.locator('[data-stock-plegable] [data-sin-cantidad]').count()) === 1, "Stock null se ve como 0 con aviso");
  ok((await page.locator('[role="dialog"] button[aria-label^="Aumentar stock"], [role="dialog"] button[aria-label^="Disminuir stock"]').count()) === 0, "Stock null no muestra controles de cantidad");
  await page.evaluate(id=>{const db=JSON.parse(localStorage.getItem("deslizapp-demo-v5"));const p=db.productos.find(p=>p.id===id);p.fotos=[];p.medios=[];localStorage.setItem("deslizapp-demo-v5",JSON.stringify(db));},id);
  await page.reload();await page.locator("[data-stock-plegable]").waitFor();
  ok(await page.locator('[data-vista-previa-producto]').getByText("P",{exact:true}).count()===1 && await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"Sin foto, la vista previa muestra la inicial y no desborda");
  if(process.env.CAPTURAS)await page.screenshot({path:process.env.CAPTURAS+"/sin-foto-"+(process.env.ANCHO??390)+".png"});
  ok(errores.length === 0, "Sin errores de página: " + JSON.stringify(errores));
} finally {
  await ctx.close();
  await navegador.close();
}
