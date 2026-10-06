// La cabecera SVG del catálogo (personalizacion.tema.cabecera). La escribe un admin, pero la base solo comprueba que sea texto
// y el dueño puede cambiar su personalización: por eso se valida al guardar en el admin Y al pintar el catálogo público (si no
// pasa, el catálogo muestra el nombre en texto). Lista blanca: solo dibujo (formas, texto, degradados), nada que se ejecute,
// cargue algo de afuera o declare entidades. Sin dependencias: se prueba con node (tests/svg-cabecera.test.mjs).

export const MAX_SVG_CABECERA = 60_000;

const ELEMENTOS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
]);
/** Elementos que pueden llevar texto adentro. */
const CON_TEXTO = new Set(["text", "tspan", "title", "desc"]);

const ATRIBUTOS = new Set([
  "xmlns",
  "viewbox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fx",
  "fy",
  "d",
  "points",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "fill-rule",
  "clip-rule",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "class",
  "id",
  "aria-hidden",
  "aria-label",
  "role",
  "style",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradienttransform",
  "clip-path",
  "clippathunits",
  "preserveaspectratio",
  "vector-effect",
  "paint-order",
]);
/** Propiedades CSS que puede llevar `style`. */
const PROPIEDADES = new Set([
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "stop-color",
  "stop-opacity",
]);

const ETIQUETA = /<(\/?)([A-Za-z][A-Za-z0-9:_-]*)((?:\s+[^\s=<>"'/]+\s*=\s*"[^"<>]*")*)\s*(\/?)>/y;
const ATRIBUTO = /\s+([^\s=<>"'/]+)\s*=\s*"([^"<>]*)"/g;
/** Las únicas funciones permitidas en un valor: var(--x), colores y url(#id) dentro del mismo SVG. */
const FUNCION = /([a-z-]+)\(([^()]*)\)/gi;
const FUNCIONES_OK = /^(var|rgb|rgba|hsl|hsla|url|translate|scale|rotate|matrix|skewx|skewy)$/i;

export type ResultadoSvg = { ok: true } | { ok: false; motivo: string };
const no = (motivo: string): ResultadoSvg => ({ ok: false, motivo });

/** ¿Un valor de atributo o de CSS seguro? Sin esquemas (javascript:, data:), sin url() externas, sin escapes ni entidades. */
function valorSeguro(valor: string): string | null {
  const v = valor.toLowerCase();
  if (/[\\`]|&(?!(amp|lt|gt|quot|apos);)|&#/.test(v)) return "lleva caracteres escapados";
  if (/(javascript|vbscript|data|blob|file|https?)\s*:/.test(v) || v.includes("//")) return "apunta a algo de afuera";
  if (/expression|@import|behavior|-moz-binding/.test(v)) return "lleva CSS que se ejecuta";
  for (const [, nombre, dentro] of v.matchAll(FUNCION)) {
    if (!FUNCIONES_OK.test(nombre!)) return `usa ${nombre}()`;
    if (nombre === "url" && !/^\s*#[a-z][\w-]*\s*$/.test(dentro!)) return "usa url() que no es del mismo dibujo";
    if (nombre === "var" && !/^\s*--[a-z0-9-]+\s*$/.test(dentro!)) return "usa var() raro";
  }
  // Paréntesis anidados o sueltos: no se dejan (no hay forma legítima en un valor de dibujo).
  if (v.replace(FUNCION, "").includes("(") || v.replace(FUNCION, "").includes(")")) return "tiene paréntesis raros";
  return null;
}

function estiloSeguro(estilo: string): string | null {
  for (const declaracion of estilo.split(";")) {
    if (!declaracion.trim()) continue;
    const i = declaracion.indexOf(":");
    if (i < 0) return "tiene un style mal escrito";
    const prop = declaracion.slice(0, i).trim().toLowerCase();
    if (!PROPIEDADES.has(prop)) return `usa la propiedad ${prop || "vacía"} en style`;
    const problema = valorSeguro(declaracion.slice(i + 1));
    if (problema) return problema;
  }
  return null;
}

/**
 * Valida una cabecera SVG. Acepta solo: un <svg> raíz con xmlns de SVG, elementos de dibujo de la lista, atributos de la
 * lista (nada que empiece con "on", ningún href), CSS en línea de la lista y texto solo dentro de <text>/<tspan>/<title>.
 * Rechaza comentarios, CDATA, DOCTYPE/ENTITY, instrucciones <?…?>, <style>, <script>, <foreignObject>, <use>, <image>, <a>,
 * animaciones y cualquier referencia externa.
 */
export function validarSvgCabecera(svg: unknown): ResultadoSvg {
  if (typeof svg !== "string") return no("No es texto.");
  const s = svg.trim();
  if (!s) return no("Está vacía.");
  if (s.length > MAX_SVG_CABECERA) return no(`Pesa demasiado (máximo ${MAX_SVG_CABECERA.toLocaleString("es-DO")} caracteres).`);
  if (/<[!?]/.test(s)) return no("Trae comentarios, DOCTYPE, CDATA o instrucciones: quítalos.");
  if (!/^<svg[\s>]/i.test(s)) return no("Tiene que empezar con <svg>.");
  const pila: string[] = [];
  let i = 0;
  let raices = 0;
  while (i < s.length) {
    const menor = s.indexOf("<", i);
    const texto = s.slice(i, menor < 0 ? s.length : menor);
    if (texto.trim()) {
      if (!CON_TEXTO.has(pila.at(-1) ?? "")) return no("Tiene texto suelto fuera de <text>.");
      if (/[>]|&(?!(amp|lt|gt|quot|apos);)/.test(texto)) return no("Tiene caracteres escapados en el texto.");
    }
    if (menor < 0) break;
    ETIQUETA.lastIndex = menor;
    const m = ETIQUETA.exec(s);
    if (!m) return no("Tiene una etiqueta mal escrita o con comillas simples.");
    const [entera, cierre, nombreOriginal, atributos, autoCierre] = m;
    const nombre = nombreOriginal!.toLowerCase();
    if (!ELEMENTOS.has(nombre)) return no(`Usa <${nombreOriginal}>, que no se permite.`);
    if (cierre) {
      if (atributos || autoCierre) return no("Tiene un cierre mal escrito.");
      if (pila.pop() !== nombre) return no(`Cierra </${nombreOriginal}> sin abrirla.`);
    } else {
      if (nombre === "svg" && pila.length === 0) raices++;
      if (pila.length === 0 && nombre !== "svg") return no("Todo tiene que ir dentro de un solo <svg>.");
      if (raices > 1) return no("Tiene más de un <svg> raíz.");
      for (const [, atributoOriginal, valor] of atributos!.matchAll(ATRIBUTO)) {
        const atributo = atributoOriginal!.toLowerCase();
        if (atributo.startsWith("on")) return no(`Tiene ${atributoOriginal}, que ejecuta código.`);
        if (atributo.includes("href")) return no("Tiene enlaces (href), que no se permiten.");
        if (!ATRIBUTOS.has(atributo)) return no(`Usa el atributo ${atributoOriginal}, que no se permite.`);
        if (atributo === "xmlns" && valor !== "http://www.w3.org/2000/svg") return no("El xmlns no es el de SVG.");
        if (atributo === "xmlns") continue;
        const problema = atributo === "style" ? estiloSeguro(valor!) : valorSeguro(valor!);
        if (problema) return no(`El atributo ${atributoOriginal} ${problema}.`);
      }
      if (!autoCierre) pila.push(nombre);
    }
    i = menor + entera.length;
    if (pila.length === 0 && s.slice(i).trim()) return no("Tiene algo después de cerrar el </svg>.");
  }
  if (pila.length) return no("Le falta cerrar alguna etiqueta.");
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(s.slice(0, s.indexOf(">") + 1))) return no('Al <svg> le falta xmlns="http://www.w3.org/2000/svg".');
  return { ok: true };
}

/** La cabecera si es segura; si no, undefined (el catálogo pinta el nombre en texto). */
export function cabeceraSegura(svg: unknown): string | undefined {
  return typeof svg === "string" && validarSvgCabecera(svg).ok ? svg : undefined;
}
