import test from "node:test";
import assert from "node:assert/strict";
import { etiquetaStock } from "../lib/inventario-catalogo.ts";
const p=stock=>({stock,activo:true});
test("píldoras de stock, sin cambiar visibilidad ni las cantidades",()=>{
 for(const [n,texto,tono]of [[0,"Agotado","fuerte"],[1,"1 en stock","atencion"],[2,"2 en stock","atencion"],[3,"3 en stock","exito"],[null,"Sin control de stock","neutro"]])assert.deepEqual(etiquetaStock(p(n)),{texto,tono});
 assert.deepEqual(etiquetaStock({...p(0),activo:false}),etiquetaStock(p(0)));
});
test("variantes: total actual, alerta parcial y sin control",()=>{
 const base={...p(11),opciones:[{nombre:"Talla",valores:["M","L"]}],variantes:[{activa:true,stock:1,valores:{Talla:"M"}},{activa:true,stock:10,valores:{Talla:"L"}}]};
 assert.deepEqual(etiquetaStock(base),{texto:"11 en stock · queda 1 de M",tono:"atencion"});
 assert.match(etiquetaStock({...base,variantes:[{...base.variantes[0],stock:0},base.variantes[1]]}).texto,/agotada/);
 assert.equal(etiquetaStock({...base,variantes:[{...base.variantes[0],stock:null},base.variantes[1]]}).texto,"Sin control de stock");
});
