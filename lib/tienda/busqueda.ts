import type {CatalogoPublico,ProductoPublico} from '../types';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=(s:string)=>norm(s).replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
const STOP=new Set('de del la las el los un una unos unas y o con sin para por que me mi mis quiero busco buscando tienes tiene tienen hay algo alguno alguna uno perfume perfumes fragancia fragancias olor aroma huela huele oler en a al lo le se su sus tu tus muy mas bien bueno buena como cual cuales'.split(' '));
const SYN:Record<string,string[]> = {
  ella: ["mujer"], dama: ["mujer"], damas: ["mujer"], mujeres: ["mujer"], femenino: ["mujer"], chica: ["mujer"], novia: ["mujer"], mama: ["mujer"], esposa: ["mujer"],
  hombre: ["unisex"], hombres: ["unisex"], caballero: ["unisex"], caballeros: ["unisex"], masculino: ["unisex"], novio: ["unisex"], papa: ["unisex"], esposo: ["unisex"], ambos: ["unisex"], pareja: ["unisex"],
  dulce: ["gourmand", "vainilla", "caramelo", "dulce", "chicle"], dulces: ["gourmand", "vainilla", "caramelo", "dulce", "chicle"], empalagoso: ["gourmand", "dulce"],
  fresco: ["fresca", "mandarina", "limon", "bergamota", "citrico", "coco"], fresca: ["fresca", "mandarina", "limon", "bergamota", "citrico"], fresquito: ["fresca"], limpio: ["fresca", "limpio"], ligero: ["fresca"], suave: ["fresca", "floral"],
  flor: ["floral"], flores: ["floral"], florar: ["floral"], fruta: ["frutal"], frutas: ["frutal"], frutado: ["frutal"],
  madera: ["amaderada", "sandalo", "cedro"], maderas: ["amaderada", "sandalo", "cedro"], amaderado: ["amaderada"],
  intenso: ["oriental", "ambar", "intense"], fuerte: ["oriental", "ambar", "intense"], elegante: ["oriental", "chipre", "ambar"], sexy: ["citas", "oriental"], seductor: ["citas", "oriental"],
  cita: ["citas"], romantico: ["citas"], romantica: ["citas"], intensa: ["oriental", "ambar", "intense"], elegantes: ["oriental", "chipre", "ambar"], trabajo: ["oficina"], diario: ["dia", "oficina"], manana: ["dia"], tarde: ["dia"],
  fiesta: ["fiestas"], discoteca: ["fiestas"], salir: ["salidas", "fiestas"], playa: ["verano"], calor: ["verano"], invierno: ["temporada"], frio: ["temporada"],
  regalar: ["regalo"], regalos: ["regalo"], cumpleanos: ["regalo"], universidad: ["universidad"], escuela: ["universidad"], cafe: ["cafe"], vainilla: ["vainilla"]
};
export const CHIPS_PERFUME=['Para ella','Para él','Dulce','Fresco','Noche','Para regalar','Menos de RD$2,000'];
function distancia(a:string,b:string,max:number):number{if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[b.length];}
export function buscarCatalogo(c:CatalogoPublico,q:string):ProductoPublico[]{
 let n=' '+norm(q)+' ';let max:number|null=null,min:number|null=null,cheap=false;
 n=n.replace(/\bpara el\b/g,' hombre ').replace(/\brd\$?|\$|pesos?\b/g,' ').replace(/\b(menos de|hasta|maximo|max|debajo de|por debajo de|menor a|menor de|no mas de)\s*(\d[\d.,]*)/g,(_,__,v)=>{max=+v.replace(/[.,]/g,'');return ' ';}).replace(/\b(mas de|desde|minimo|arriba de|mayor a|mayor de)\s*(\d[\d.,]*)/g,(_,__,v)=>{min=+v.replace(/[.,]/g,'');return ' ';}).replace(/\b(barato|baratos|economico|economicos)\b/g,()=>{cheap=true;return ' ';});
 const terms=words(n).filter(w=>!STOP.has(w));if(!terms.length&&max===null&&min===null&&!cheap)return c.productos;
 const perfume=c.tienda.rubro==='perfumes';
 const rows=c.productos.map(p=>{const fields:[number,string][]=[[5,p.nombre],[4,String(p.detalles.marca??'')],[3,p.categoria??''],[3,perfume?String(p.detalles.familia??''):''],[3,p.detalles.para==='ella'?'mujer ella':p.detalles.para==='el'?'hombre el':p.detalles.para==='unisex'?'unisex hombre mujer ambos':''],[2,Object.values(p.detalles).flat().join(' ')]];let hit=0,score=0;for(const term of terms){const bases=[term,...(term.length>3&&term.endsWith('s')?[term.slice(0,-1)]:[])];const syns=perfume?bases.flatMap(b=>SYN[b]??[]):[];let best=0;for(const [weight,text] of fields)for(const d of words(text))for(const t of [...bases,...syns]){const s=d===t?1:t.length>=3&&d.startsWith(t)?.85:t.length>=4&&d.length>=4&&distancia(t,d,t.length>=7?2:1)<=(t.length>=7?2:1)?.6:0;best=Math.max(best,s*weight*(syns.includes(t)?.7:1));}if(best>0){hit++;score+=best;}}return {p,hit,score,precio:p.precioPromo??p.precio};}).filter(r=>(max===null||r.precio<=max)&&(min===null||r.precio>=min));
 let full=rows.filter(r=>r.hit===terms.length);if(terms.length&&full.length){const top=Math.max(...full.map(r=>r.score));full=full.filter(r=>r.score>=top*.7);}if(!full.length)full=rows.filter(r=>r.hit>0);return full.sort((a,b)=>cheap?a.precio-b.precio||b.score-a.score:b.score-a.score||a.precio-b.precio).map(r=>r.p);
}
