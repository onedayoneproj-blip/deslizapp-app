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
const numeroStock = async (page) => Number((await page.locator('section[aria-label="Inventario"] [aria-live="polite"]').innerText()).match(/^\d+/)?.[0]);
const persistido = page => page.evaluate(() => localStorage.getItem("deslizapp-demo-v4"));
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
  await page.waitForSelector('[role="dialog"] section[aria-label="Inventario"]');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Vista previa sin overflow horizontal");
  const inicial = await numeroStock(page);
  const nombre = producto.nombre;
  const revisarHistorial=async texto=>{
    await page.getByRole("button",{name:"Historial",exact:true}).click();
    await page.getByRole("region",{name:"Ajustes de inventario"}).getByText(texto,{exact:true}).waitFor();
    ok(await page.locator('[role="dialog"]').count()===1,"Historial se abre en la misma hoja");
    await page.getByRole("button",{name:/^Volver a/}).click();
  };


  const mas=()=>page.getByRole("button", { name: "Aumentar stock de " + nombre });
  const menos=()=>page.getByRole("button", { name: "Disminuir stock de " + nombre });
  const antes=await persistido(page);
  await mas().click();await mas().click();await mas().click();
  ok(await numeroStock(page)===inicial+3 && await persistido(page)===antes,"Tres toques solo cambian la propuesta, sin persistir");
  await menos().click();await menos().click();await menos().click();
  ok(await numeroStock(page)===inicial && await persistido(page)===antes && await page.getByRole("button",{name:"Guardar cambios",exact:true}).count()===0,"Volver al stock original no crea ajustes");
  await mas().click();await mas().click();await mas().click();
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("deslizapp-demo-v4")??"{}").ajustesInventario?.length===1);
  ok((await registros(page))[0].variacion===3,"Guardar varios toques crea una única reposición final");
  await revisarHistorial("+3");
  const pedidoAntes=JSON.parse(await persistido(page)).pedidos.length;
  await menos().click();await menos().click();
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.getByRole("button",{name:"Cancelar",exact:true}).click();
  await page.waitForTimeout(400);
  ok(await numeroStock(page)===inicial+1 && (await registros(page)).length===1,"Cancelar la confirmación conserva propuesta sin guardar");
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.getByRole("radio",{name:"Otro",exact:true}).click();
  ok(await page.getByRole("button",{name:"Guardar ajuste",exact:true}).isDisabled(),"Otro exige nota");
  await page.getByRole("textbox",{name:"Cuéntanos el motivo"}).fill("Recuento de prueba demo");
  await page.getByRole("button",{name:"Guardar ajuste",exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("deslizapp-demo-v4")).ajustesInventario.length===2);
  await revisarHistorial("Recuento de prueba demo");
  ok((await registros(page))[1].variacion===-2 && JSON.parse(await persistido(page)).pedidos.length===pedidoAntes,"Una disminución final con nota actualiza historial sin pedidos");
  await mas().click();
  ok(await page.getByRole("button",{name:"Editar",exact:true}).count()===0 && await page.getByRole("button",{name:"Crear pedido",exact:true}).count()===0,"Con cambios sin guardar se ocultan Editar y Crear pedido");
  const guardarY=(await page.getByRole("button",{name:"Guardar cambios",exact:true}).boundingBox()).y, tarjetaY=(await page.locator('section[aria-label="Inventario"] ul').boundingBox()).y;
  ok(guardarY<tarjetaY,"Guardar cambios y Descartar aparecen encima de la tarjeta de stock");
  await page.getByRole("button",{name:"Descartar",exact:true}).click();
  ok(await numeroStock(page)===inicial+1 && await page.getByRole("button",{name:"Editar",exact:true}).count()===1,"Descartar recupera el stock y devuelve Editar / Crear pedido");
  await page.getByRole("button",{name:"Editar",exact:true}).click();
  await page.waitForURL("**/editar");await page.locator('section[aria-label="Inventario"]').waitFor();
  ok(await numeroStock(page)===inicial+1 && (await registros(page)).length===2,"Descartar y editar recupera el stock guardado");
  const nombreInput=page.getByRole("textbox",{name:"Nombre",exact:true});
  await nombreInput.fill(nombre+" edición");
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await page.waitForURL(URL+producto.href);await page.locator('section[aria-label="Inventario"]').waitFor();
  ok((await registros(page)).length===2,"Guardar solo nombre no crea ajuste");
  await page.getByRole("button",{name:"Editar",exact:true}).click();await page.waitForURL("**/editar");
  const nuevoNombre=nombre+" ficha y stock";
  await page.getByRole("textbox",{name:"Nombre",exact:true}).fill(nuevoNombre);
  await page.locator('button[aria-label^="Aumentar stock"]').click();await page.locator('button[aria-label^="Aumentar stock"]').click();
  ok((await registros(page)).length===2,"Editar tampoco escribe al tocar cantidades");
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await page.waitForURL(URL+producto.href);
  await revisarHistorial("+2");
  ok((await registros(page)).length===3 && JSON.parse(await persistido(page)).productos.find(p=>p.id===producto.href.split('/').at(-1)).nombre===nuevoNombre,"Guardar edición confirma ficha y ajuste; historial actualizado");
  await page.getByRole("button",{name:"Editar",exact:true}).click();await page.waitForURL("**/editar");
  await page.locator('button[aria-label^="Disminuir stock"]').click();await page.locator('button[aria-label^="Disminuir stock"]').click();
  await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await page.getByRole("radio",{name:"Daño",exact:true}).click();
  await page.getByRole("button",{name:"Guardar ajuste",exact:true}).click();await page.waitForURL(URL+producto.href);
  await revisarHistorial("Daño");
  ok((await registros(page)).length===4 && (await registros(page))[3].variacion===-2,"Disminuir desde edición confirma motivo y un único delta final");
  await page.locator('button[aria-label^="Aumentar stock"]').click();
  await page.goBack();await page.getByRole("alertdialog").waitFor();
  await page.getByRole("alertdialog").getByRole("button",{name:"Seguir aquí",exact:true}).click();
  ok(await page.locator('section[aria-label="Inventario"]').count()===1,"Atrás del navegador respeta cambios pendientes");
  await page.getByRole("button",{name:"Descartar",exact:true}).click();
  await page.getByRole("button",{name:"Crear pedido",exact:true}).click();await page.waitForURL("**/pedidos/nuevo?producto=*");
  ok(new globalThis.URL(page.url()).searchParams.get("producto")===producto.href.split("/").at(-1),"Crear pedido abre el formulario preseleccionado sin guardarlo");
  ok(JSON.parse(await persistido(page)).pedidos.length===pedidoAntes,"Abrir pedido no crea una venta ni cambia stock");

  const id=producto.href.split('/').at(-1);
  const ponerStock=async stock=>{
    await page.goto(URL+"/catalogo");
    await page.evaluate(({id,stock})=>{
      const db=JSON.parse(localStorage.getItem("deslizapp-demo-v4"));
      const p=db.productos.find(p=>p.id===id);p.stock=stock;
      p.nombre="Producto con un nombre muy largo para comprobar que la miniatura compacta conserva la lectura en pantallas pequeñas";
      localStorage.setItem("deslizapp-demo-v4",JSON.stringify(db));
    },{id,stock});
    await page.reload();await page.goto(URL+"/catalogo/"+id);
    await page.locator('section[aria-label="Inventario"]').waitFor();
  };

  await ponerStock(0);
  ok(await page.locator('button[aria-label^="Disminuir stock"]').isDisabled(), "Con stock cero no se puede disminuir");
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"Nombre largo y stock cero sin overflow");
  if(process.env.CAPTURAS){await page.screenshot({path:process.env.CAPTURAS+"/producto-"+(process.env.ANCHO??390)+".png"});}
  await ponerStock(null);
  ok((await page.locator('section[aria-label="Inventario"]').getByText("Sin control de stock", { exact: true }).count()) === 1, "Stock null muestra Sin control de stock");
  ok((await page.locator('[role="dialog"] button[aria-label^="Aumentar stock"], [role="dialog"] button[aria-label^="Disminuir stock"]').count()) === 0, "Stock null no muestra controles de cantidad");
  await page.evaluate(id=>{const db=JSON.parse(localStorage.getItem("deslizapp-demo-v4"));db.productos.find(p=>p.id===id).fotos=[];localStorage.setItem("deslizapp-demo-v4",JSON.stringify(db));},id);
  await page.reload();await page.locator('section[aria-label="Inventario"]').waitFor();
  ok(await page.locator('[role="dialog"] .size-30').getByText("P",{exact:true}).count()===1 && await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"Miniatura sin foto conserva la forma y no desborda");
  if(process.env.CAPTURAS)await page.screenshot({path:process.env.CAPTURAS+"/sin-foto-"+(process.env.ANCHO??390)+".png"});
  ok(errores.length === 0, "Sin errores de página: " + JSON.stringify(errores));
} finally {
  await ctx.close();
  await navegador.close();
}
