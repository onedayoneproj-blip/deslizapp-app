import "./cargar-ts.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
const { validarSvgCabecera, cabeceraSegura } = await import("../lib/tienda/svg-cabecera.ts");
const { temaDeTienda } = await import("../lib/tienda/tema.ts");

const michel = JSON.parse(readFileSync(new URL("../lib/data/seed/catalogo-michel.json", import.meta.url), "utf8")).tema.cabecera;
const X = 'xmlns="http://www.w3.org/2000/svg"';
const envolver = (dentro, raiz = "") => `<svg ${X} viewBox="0 0 10 10"${raiz}>${dentro}</svg>`;

test("acepta la cabecera real de Michel (paths, class, aria-hidden, style con var(--logoN))", () => {
  assert.deepEqual(validarSvgCabecera(michel), { ok: true });
  assert.equal(cabeceraSegura(michel), michel);
});

test("acepta dibujo, texto y degradados del mismo SVG", () => {
  const svg = envolver(
    '<defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" style="stop-color:rgb(10, 20, 30)"/></linearGradient></defs>' +
      '<g transform="translate(1 2) scale(0.5)"><rect width="10" height="10" fill="url(#g1)"/><text x="1" y="8" font-family="Cormorant Garamond" style="fill:var(--logo2);font-style:italic">Esencias &amp; Michel</text></g>',
  );
  assert.deepEqual(validarSvgCabecera(svg), { ok: true });
});

const ataques = {
  script: envolver("<script>alert(1)</script>"),
  "script en mayúsculas": envolver("<SCRIPT>alert(1)</SCRIPT>"),
  "script con espacio": envolver("< script>alert(1)</script>"),
  onload: `<svg ${X} onload="alert(1)"></svg>`,
  "OnClick mayúsculas": envolver('<rect OnClick="alert(1)"/>'),
  "evento pegado con barra": `<svg/onload=alert(1) ${X}></svg>`,
  "comillas simples": `<svg ${X} onload='alert(1)'></svg>`,
  "atributo sin comillas": `<svg ${X} onload=alert(1)></svg>`,
  "href javascript": envolver('<a href="javascript:alert(1)"><rect/></a>'),
  "xlink:href": envolver('<use xlink:href="#x"/>'),
  use: envolver('<use href="https://evil.example/s.svg#a"/>'),
  image: envolver('<image href="https://evil.example/x.png"/>'),
  foreignObject: envolver("<foreignObject><div>hola</div></foreignObject>"),
  "style elemento": envolver("<style>@import url(https://evil.example/x.css)</style>"),
  "url externa en fill": envolver('<rect fill="url(https://evil.example/x)"/>'),
  "url data en style": envolver('<rect style="fill:url(data:image/png;base64,AA)"/>'),
  "expression css": envolver('<rect style="width:expression(alert(1))"/>'),
  "propiedad css rara": envolver('<rect style="background-image:url(#a)"/>'),
  "entidad numérica": envolver('<rect fill="&#106;avascript:alert(1)"/>'),
  "escape css": envolver('<rect style="fill:\\75 rl(x)"/>'),
  doctype: `<!DOCTYPE svg [<!ENTITY x "y">]>${envolver("<rect/>")}`,
  comentario: envolver("<!-- <script>alert(1)</script> --><rect/>"),
  cdata: envolver("<text><![CDATA[<script>]]></text>"),
  "instrucción xml": `<?xml-stylesheet href="https://evil.example/x.css"?>${envolver("<rect/>")}`,
  animate: envolver('<rect><animate attributeName="href" to="javascript:alert(1)"/></rect>'),
  set: envolver('<set attributeName="onmouseover" to="alert(1)"/>'),
  "texto suelto": envolver("hola"),
  "dos raíces": `${envolver("<rect/>")}${envolver("<rect/>")}`,
  "algo después": `${envolver("<rect/>")}<img src=x onerror=alert(1)>`,
  "sin cerrar": `<svg ${X}><g><rect/></svg>`,
  "xmlns raro": '<svg xmlns="http://www.w3.org/1999/xhtml"><rect/></svg>',
  "xmlns:xlink": `<svg ${X} xmlns:xlink="http://www.w3.org/1999/xlink"><rect/></svg>`,
  "sin xmlns": '<svg viewBox="0 0 1 1"><rect/></svg>',
  "no empieza con svg": "<g><rect/></g>",
  "var raro": envolver('<rect style="fill:var(x)"/>'),
  "paréntesis anidados": envolver('<rect fill="rgb(1,2,var(--a))"/>'),
  "protocolo relativo": envolver('<rect fill="url(//evil.example/x)"/>'),
  "no es texto": 42,
  vacía: "   ",
  enorme: envolver(`<path d="${"M0 0".repeat(16_000)}"/>`),
};
for (const [nombre, svg] of Object.entries(ataques)) {
  test(`rechaza: ${nombre}`, () => {
    const r = validarSvgCabecera(svg);
    assert.equal(r.ok, false, `debió rechazar ${nombre}`);
    assert.equal(typeof r.motivo, "string");
    assert.equal(cabeceraSegura(svg), undefined);
  });
}

test("el catálogo público ignora una cabecera insegura (pinta el nombre) y conserva una segura", () => {
  const tienda = (cabecera) => ({
    marcaColorPrincipal: "#5B2333",
    marcaColorAcento: "#C9A24B",
    marcaEstilo: "elegante",
    personalizacion: { tema: { cabecera } },
  });
  assert.equal(temaDeTienda(tienda(ataques.onload)).cabecera, undefined);
  assert.equal(temaDeTienda(tienda(ataques.script)).cabecera, undefined);
  assert.equal(temaDeTienda(tienda(michel)).cabecera, michel);
});
