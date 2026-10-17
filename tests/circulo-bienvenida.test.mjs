// La bienvenida del Círculo (lib/circulo-bienvenida.ts, components/panel/bienvenida-circulo.*): una vez por titular, nunca a una
// colaboradora, quieta con movimiento reducido, y la entrada del aro del encabezado no se repite al recargar.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./cargar-ts.mjs";

const { claveBienvenidaCirculo, bienvenidaVista, marcarBienvenidaVista, debeMostrarBienvenida } = await import("../lib/circulo-bienvenida.ts");
const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

const almacenFalso = () => {
  const datos = new Map();
  return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => void datos.set(k, v), datos };
};
const titular = (almacen, extra = {}) => ({ usuarioId: "u1", soloMirar: false, esTitularDelCirculo: true, almacen, ...extra });

test("la titular la ve una sola vez: al cerrarla queda marcada, también con varias tiendas (la marca es de la cuenta)", () => {
  const a = almacenFalso();
  assert.equal(debeMostrarBienvenida(titular(a)), true);
  marcarBienvenidaVista(a, "u1");
  assert.equal(debeMostrarBienvenida(titular(a)), false);
  assert.equal(a.datos.size, 1);
  assert.equal(claveBienvenidaCirculo("u1"), "deslizapp:circulo-bienvenida:u1");
  // Otra cuenta en el mismo dispositivo sí la ve.
  assert.equal(debeMostrarBienvenida(titular(a, { usuarioId: "u2" })), true);
});

test("una colaboradora (o quien mira como otra persona) nunca la ve", () => {
  const a = almacenFalso();
  assert.equal(debeMostrarBienvenida(titular(a, { esTitularDelCirculo: false })), false);
  assert.equal(debeMostrarBienvenida(titular(a, { soloMirar: true })), false);
  assert.equal(debeMostrarBienvenida(titular(a, { usuarioId: null })), false);
  assert.equal(a.datos.size, 0);
});

test("si localStorage falla, mejor no mostrarla que mostrarla cada vez", () => {
  const roto = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(bienvenidaVista(roto, "u1"), true);
  assert.equal(bienvenidaVista(null, "u1"), true);
  assert.equal(debeMostrarBienvenida(titular(roto)), false);
  assert.equal(debeMostrarBienvenida(titular(null)), false);
  assert.doesNotThrow(() => marcarBienvenidaVista(roto, "u1"));
  assert.doesNotThrow(() => marcarBienvenidaVista(null, "u1"));
});

test("el componente decide por el rol de dueña de cada tienda del Círculo y marca al cerrar", () => {
  const tsx = leer("components/panel/bienvenida-circulo.tsx");
  assert.match(tsx, /\.filter\(\(t\) => t\.circulo\)/);
  assert.match(tsx, /permisos\[i\]\?\.rol === "dueno"/);
  assert.match(tsx, /if \(soloMirar \|\| delCirculo\.length === 0\)/);
  assert.match(tsx, /marcarBienvenidaVista\(almacenDelNavegador\(\), usuarioId\)/);
  // Una sola pantalla por cuenta: una sola, con la primera tienda de la que es dueña.
  assert.match(tsx, /propias\?\.\[0\]/);
});

test("contenido: aro de 120 con ondas, cupón con el 30 % de la constante y los cuatro beneficios", () => {
  const tsx = leer("components/panel/bienvenida-circulo.tsx");
  assert.match(tsx, /tamano=\{120\} animacion="ondas"/);
  assert.match(tsx, /porcentaje: String\(DESCUENTO_CIRCULO\)/);
  for (const t of ["Eres del Círculo", "Llegaste primero.", "Te toca más.", "Como los Close Friends de Instagram, pero con beneficios.", "Entrar", "En tu plan anual", "Tu primer año", "Al pagar el año", "Habla directo con Lewis"]) assert.ok(tsx.includes(t), t);
  assert.equal([...tsx.matchAll(/\{ icono: </g)].length, 4);
  // Nunca un precio escrito a mano.
  assert.doesNotMatch(tsx, /RD\$|\d,\d{3}/);
});

test("con movimiento reducido la bienvenida no se anima (ni el aro: aro-circulo.css lo deja terminado)", () => {
  const css = leer("components/panel/bienvenida-circulo.css");
  const reducido = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducido, /\.bienvenida-c \{\s*animation: none;/);
  const bloque = css.match(/@keyframes bienvenida-c-entra \{([\s\S]*?)\n\}/)[1];
  assert.deepEqual([...new Set([...bloque.matchAll(/^\s{4}([\w-]+):/gm)].map((m) => m[1]))].sort(), ["opacity", "transform"]);
  const aro = leer("components/panel/aro-circulo.css");
  assert.match(aro.slice(aro.indexOf("@media (prefers-reduced-motion: reduce)")), /\.aro-c\[data-animacion\] \.aro-c-anillo,\s*\.aro-c\[data-animacion\] \.aro-c-sello \{\s*animation: none;/);
});

test("al cerrar, el aro del encabezado hace la entrada A solo en memoria: no se guarda y al recargar no se repite", () => {
  const enc = leer("components/panel/encabezado.tsx");
  assert.match(enc, /animacion=\{aroEntra \? "entrada" : "ninguna"\}/);
  assert.match(enc, /<BienvenidaCirculo alCerrar=\{alCerrarBienvenida\} \/>/);
  assert.match(enc, /const \[aroEntra, setAroEntra\] = useState\(false\)/);
  assert.doesNotMatch(enc, /localStorage|sessionStorage/);
  // Lo único que se guarda es que la bienvenida ya se vio (antes de pedir la entrada): sin esa marca no hay bienvenida ni entrada.
  const tsx = leer("components/panel/bienvenida-circulo.tsx");
  assert.ok(tsx.indexOf("marcarBienvenidaVista(almacenDelNavegador(), usuarioId)") < tsx.indexOf("alCerrar();"));
});

test("la tarjeta verde del menú lleva las ondas en bucle y el texto del descuento", () => {
  const tsx = leer("components/panel/tarjeta-circulo.tsx");
  assert.match(tsx, /<LogoTienda tienda=\{tienda\} tamano=\{68\} animacion="ondas" \/>/);
  const lib = leer("lib/circulo.ts");
  assert.match(lib, /menos en tu primer año anual/);
});
