import './cargar-ts.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const C = await import('../lib/onboarding-checklist.ts');
const tienda = { id: 'a', estado: 'en_prueba', logoUrl: null, catalogoEstado: 'sin', descripcion: '', onboarding: {} };
const equipo = { miembros: [{ usuarioId: 'yo' }], invitaciones: [] };
const producto = { tiendaId: 'a', activo: true, fotos: ['foto'], medios: [] };
test('sin datos listos: cero de siete y publicar sigue disponible', () => {
 assert.deepEqual(C.pasosChecklist(tienda, [], equipo, false), Array(7).fill(false));
 assert.equal(C.puedeVerChecklist(tienda, true, false), true);
});
test('capítulos: vacío, parcial fuera de orden y completo, sin huecos ni falsos completos', () => {
 const vacios = C.avanceCapitulos(Array(7).fill(false));
 assert.deepEqual(vacios.map(c => [c.numero,c.hechos,c.total,c.estado,c.completo]), [[2,0,3,"Sin iniciar",false],[3,0,2,"Sin iniciar",false],[4,0,2,"Sin iniciar",false]]);
 const parciales = C.avanceCapitulos([false,true,false,true,true,false,true]);
 assert.deepEqual(parciales.map(c => [c.hechos,c.estado,c.completo]), [[2,"En curso",false],[1,"En curso",false],[1,"En curso",false]]);
 assert(C.avanceCapitulos(Array(7).fill(true)).every(c => c.completo && c.estado === "Completo"));
 assert.equal(C.avanceCapitulos([true,true,false,false,true,false,false])[0].completo,true);
 assert(C.avanceCapitulos([]).every(c => !c.completo && c.hechos === 0));
});
test('cada condición completa solo su paso; logo vacío y descripción en blanco no cuentan', () => {
 const casos = [{ logoUrl:'foto' }, { onboarding:{ colores_elegidos_en:'fecha' } }, null, {catalogoEstado:'publicado'}, {descripcion:'Hola'}, {onboarding:{pantalla_inicio_en:'fecha'}}, {onboarding:{equipo_omitido_en:'fecha'}}];
 casos.forEach((c,i) => { const pasos=C.pasosChecklist({...tienda,...c},i===2?Array(5).fill(producto):[],equipo,false); assert.equal(pasos.filter(Boolean).length,1);assert.equal(pasos[i],true); });
 assert.equal(C.pasosChecklist({...tienda,descripcion:'  '},[],equipo,false)[4],false);
});
test('cinco visibles CON FOTO; ocultos, retirados, video solo y otras tiendas no cuentan', () => {
 const invalidos=[{...producto,activo:false},{...producto,eliminadoEn:'fecha'},{...producto,tiendaId:'b'},{...producto,fotos:[],medios:[{tipo:'video',url:'video'}]},{...producto,fotos:[''],medios:[]}];
 assert.equal(C.productosParaChecklist([...Array(4).fill(producto),...invalidos],'a'),4);
 assert.equal(C.pasosChecklist(tienda,[...Array(4).fill(producto),...invalidos],equipo,false)[2],false);
 assert.equal(C.productosParaChecklist([{...producto,fotos:[],medios:[{tipo:'foto',url:'foto'}]}],'a'),1);
});
test('instalada completa el paso sin necesitar marca manual',()=>assert.equal(C.pasosChecklist(tienda,[],equipo,true)[5],true));
test('otro miembro o invitación pendiente completan equipo; un enlace sin reclamar no',()=>{
 assert.equal(C.pasosChecklist(tienda,[],{...equipo,miembros:[{},{}]},false)[6],true);
 assert.equal(C.pasosChecklist(tienda,[],{...equipo,invitaciones:[{}]},false)[6],true);
 assert.equal(C.pasosChecklist(tienda,[],{...equipo,enlaces:[{}]},false)[6],false);
});
test('dueña solamente, nunca soloMirar, cerrada, pausada o eliminada',()=>{
 assert.equal(C.puedeVerChecklist(tienda,false,false),false);
 assert.equal(C.puedeVerChecklist(tienda,true,true),false);
 for(const estado of ['pausada','eliminada']) assert.equal(C.puedeVerChecklist({...tienda,estado},true,false),false);
 assert.equal(C.puedeVerChecklist({...tienda,onboarding:{checklist_cerrado_en:'fecha'}},true,false),false);
 assert.equal(C.puedeVerChecklist(null,true,false),false);
});
test('perfil limita descripción e Instagram y no convierte enlaces a usuarios',()=>{
 assert.deepEqual(C.perfilCatalogoValido(' Hola ',' @mi.tienda '),{descripcion:'Hola',instagram:'mi.tienda'});
 assert.deepEqual(C.perfilCatalogoValido('',''),{descripcion:null,instagram:null});
 for(const ig of ['https://instagram.com/a','dos palabras','a'.repeat(31)]) assert.throws(()=>C.perfilCatalogoValido('Hola',ig));
 assert.throws(()=>C.perfilCatalogoValido('a'.repeat(161),''));
});
