import type { CatalogoPublico } from '../types';
export type TemaCatalogo = { colores: Record<string,string>; fuentes: {display:string;body:string}; cabecera?:string; tintes: Record<string,{c:string;dark:boolean}> };
export function luminancia(color:string):number { const canales = /^#[a-f0-9]{6}$/i.test(color) ? [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4) : [0,0,0];return canales[0]*.2126+canales[1]*.7152+canales[2]*.0722; }
export function contraste(a:string,b:string):number {const x=luminancia(a),y=luminancia(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const fuentes = {elegante:{display:'Cormorant Garamond',body:'Manrope'},moderna:{display:'Figtree',body:'Figtree'},divertida:{display:'Fredoka',body:'Figtree'},clasica:{display:'Georgia',body:'Manrope'}};
export function temaDeTienda(t:CatalogoPublico['tienda']):TemaCatalogo {
 const propio=t.personalizacion.tema as Partial<TemaCatalogo>|undefined;
 const principal=/^#[a-f0-9]{6}$/i.test(t.marcaColorPrincipal)?t.marcaColorPrincipal:'#174B3A';
 const acento=/^#[a-f0-9]{6}$/i.test(t.marcaColorAcento)?t.marcaColorAcento:'#FF834F';
 const accion=contraste(principal,'#FFFFFF')>=4.5?principal:'#174B3A';
 return {colores:{bg:'#FFF9EE',surface:'#FFFFFF',sunk:'#EFE9DC',ink:'#10362A',ink2:'#304F43',muted:'#52665C',line:'#DED5C3',accent:accion,'accent-hover':accion,'accent-soft':'#F5E7D9',heart:acento,gold:'#79603A',...propio?.colores},fuentes:propio?.fuentes??fuentes[t.marcaEstilo]??fuentes.moderna,cabecera:propio?.cabecera,tintes:propio?.tintes??{}};
}
